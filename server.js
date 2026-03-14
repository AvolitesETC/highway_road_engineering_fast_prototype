/**
 * 导入所需的Node.js模块和自定义模块
 * 这些模块用于构建Web服务器、处理文件上传、路径操作和数据库连接
 */
const express = require('express'); // Express框架，用于创建Web服务器
const cors = require('cors'); // CORS中间件，用于处理跨域请求
const multer = require('multer'); // Multer中间件，用于处理multipart/form-data，主要用于文件上传
const path = require('path'); // Node.js路径模块，用于处理文件路径
const fs = require('fs'); // Node.js文件系统模块，用于文件操作
require('dotenv').config(); // 加载.env文件中的环境变量
const db = require('./db/db_utils'); // 自定义数据库工具模块，用于数据库操作

const sharp = require('sharp'); // 图像处理库，用于处理图片文件
const fileUtils = require('./utils/file_utils'); // 自定义文件处理工具模块，包含时间戳命名和水印添加功能

// 创建Express应用程序实例
const app = express();
// 设置端口号，优先使用环境变量中指定的PORT，如果没有则使用默认值3001
const PORT = process.env.PORT || 3001;

// 配置跨域资源共享中间件，允许所有来源的请求
app.use(cors());
// 配置解析JSON格式的请求体中间件，使应用能够处理JSON数据
app.use(express.json());
// 配置解析URL编码的请求体中间件，extended: true表示使用qs库解析URL编码数据
app.use(express.urlencoded({ extended: true }));
// 配置静态文件服务中间件，将public目录设置为静态文件根目录
app.use(express.static('public'));
// 配置uploads目录的静态文件服务，使得可以通过/uploads路径访问uploads目录下的文件
app.use('/uploads', express.static('uploads'));

// 辅助函数：更精准的文件类型判断
function getFileType(file) {
    const mime = file.mimetype;
    // 优先判断图片
    if (mime.startsWith('image/')) return 'image';
    // 其次判断视频
    if (mime.startsWith('video/')) return 'video';
    // 如果无法识别，根据扩展名兜底
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext)) return 'image';
    if (['.mp4', '.webm', '.ogg', '.mov', '.avi', '.flv'].includes(ext)) return 'video';
    
    return 'image'; // 默认为图片，防止误判为视频导致播放器加载失败
}

/**
 * 配置multer的磁盘存储引擎
 * destination: 设置文件存储的目录
 * filename: 设置文件存储的名称
 */
const storage = multer.diskStorage({
    // 设置文件存储的目标目录
    // 如果uploads目录不存在，则创建该目录
    destination: (req, file, cb) => {
        const tempDir = path.join(__dirname, 'uploads/temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        cb(null, tempDir);
    },
    // 设置文件存储的名称
    // 使用时间戳和随机数生成唯一文件名，保留原始文件扩展名
    filename: (req, file, cb) => {
        // 暂存时用简单随机名，防止覆盖
        cb(null, `temp_${Date.now()}_${file.originalname}`);
    }
});
const upload = multer({ storage: storage, limits: { fileSize: 50 * 1024 * 1024 } });

// === API ===

// 获取列表（含关联图片）
/**
 * 获取所有项目列表的API接口
 * 按创建时间降序排列，并包含每个项目的媒体文件信息
 */
app.get('/api/projects', async (req, res) => {
    try {
        // 从数据库查询所有项目，并按创建时间降序排列
        const projects = await db.all("SELECT * FROM projects ORDER BY created_at DESC");
        // 对每个项目进行异步处理，获取其关联的媒体文件
        const result = await Promise.all(projects.map(async (p) => {
            // 获取所有媒体文件信息（含ID，方便前端删除）
            p.media_files = await db.all("SELECT id, file_path, file_type FROM project_media WHERE project_id = ?", [p.id]);
            return p;
        }));
        res.json({ code: 200, data: result });
    } catch (err) {
        res.status(500).json({ code: 500, error: err.message });
    }
});

// 获取详情
app.get('/api/projects/:id', async (req, res) => {
    try {
        const p = await db.get("SELECT * FROM projects WHERE id = ?", [req.params.id]);
        if(!p) return res.status(404).json({error: "Not Found"});
        p.media_files = await db.all("SELECT id, file_path FROM project_media WHERE project_id = ?", [p.id]);
        res.json({ code: 200, data: p });
    } catch (err) {
        res.status(500).json({ code: 500, error: err.message });
    }
});

// 新增
/**
 * 处理项目创建的POST请求
 * 接收项目基本信息和多个文件上传
 * 支持事务处理，确保数据一致性
 */
app.post('/api/projects', upload.array('files', 10), async (req, res) => {
    // 从请求体中解构出项目基本信息
    const { name, type, stake_number, latitude, longitude, applicant, status, description, approval_date, completion_date } = req.body;
    // 开启数据库事务
    await db.beginTransaction();
    try {
        // 将项目基本信息插入到projects表中
        const resSql = await db.run(
            `INSERT INTO projects (name, type, stake_number, latitude, longitude, applicant, status, description, approval_date, completion_date) 
            VALUES (?,?,?,?,?,?,?,?,?,?)`,
            [name, type, stake_number, latitude, longitude, applicant, status, description, approval_date, completion_date]
        );
        // 如果存在上传的文件，则逐个处理文件信息
        if (req.files) {
            for (const file of req.files) {
                // 修改：使用 getFileType 函数
                const fileType = getFileType(file);
                
                // 1. 生成正式的时间戳文件名
                const finalFileName = fileUtils.generateTimestampName(file.originalname);
                const finalPath = path.join(__dirname, 'uploads', finalFileName);
                
                // 2. 处理文件：如果是图片，加水印；如果是视频，直接移动
                if (fileType === 'image') {
                    // 调用工具加水印，源文件是 temp 里的，目标是 uploads 里的
                    await fileUtils.addWatermark(file.path, finalPath, name);
                } else {
                    // 视频直接移动
                    fs.renameSync(file.path, finalPath);
                }

                // 3. 写入数据库 (存相对路径)
                await db.run(`INSERT INTO project_media (project_id, file_path, file_type) VALUES (?,?,?)`, 
                    [resSql.id, `/uploads/${finalFileName}`, fileType]);
                
                // 4. 清理临时文件 (如果是图片，刚才addWatermark是读取，现在要删源文件)
                if (fileType === 'image' && fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            }
        }
        await db.commitTransaction();
        res.json({ code: 200, message: "Created" });
    } catch (err) {
        await db.rollbackTransaction();
        // 出错也要清理临时文件
        if(req.files) req.files.forEach(f => { if(fs.existsSync(f.path)) fs.unlinkSync(f.path); });
        res.status(500).json({ error: err.message });
    }
});

// 修改 (核心增强)，增加日期字段处理,上传文件加水印
app.put('/api/projects/:id', upload.array('files', 10), async (req, res) => {
    const id = req.params.id;
    /**
     * 关键修复：
     * - 编辑项目时用户可能重新选点位（经纬度变化）
     * - 如果后端不更新 latitude/longitude，会造成“保存成功但位置不变”的假故障
     */
    const { 
        name, type, stake_number, 
        latitude, longitude, // ✅ 允许更新坐标
        applicant, status, description, 
        deleted_media_ids, approval_date, completion_date 
    } = req.body;
    
    await db.beginTransaction();
    try {
        // 1. 更新主表（补齐经纬度）
        await db.run(
            `UPDATE projects 
            SET name=?, type=?, stake_number=?, latitude=?, longitude=?, applicant=?, status=?, description=?, approval_date=?, completion_date=? 
            WHERE id=?`,
            [name, type, stake_number, latitude, longitude, applicant, status, description, approval_date, completion_date, id]
        );

        // 2. 处理删除旧图片
        if (deleted_media_ids) {
            const idsToDelete = deleted_media_ids.split(','); 
            for (const mediaId of idsToDelete) {
                // 先查路径，用于后续物理删除
                const media = await db.get("SELECT file_path FROM project_media WHERE id = ?", [mediaId]);
                if (media) {
                    await db.run("DELETE FROM project_media WHERE id = ?", [mediaId]);
                    // 标记物理删除（异步，不阻塞事务）
                    /**
                     * 重要修复：
                     * - media.file_path 存的是 "/uploads/xxx"
                     * - path.join(__dirname, "/uploads/xxx") 会忽略 __dirname
                     * - 去掉开头 "/"，确保删的是项目目录内的 uploads
                     */
                    const safeRelPath = String(media.file_path || '').replace(/^\/+/, '');
                    const fullPath = path.join(__dirname, safeRelPath);

                    fs.unlink(fullPath, (err) => { 
                        if (err) console.log("File delete warn:", err.message);
                    });
                }
            }
        }

        // 3. 处理新增图片
        if (req.files) {
            for (const file of req.files) {
                const fileType = getFileType(file);
                // 1. 生成新名
                const finalFileName = fileUtils.generateTimestampName(file.originalname);
                const finalPath = path.join(__dirname, 'uploads', finalFileName);
                
                // 2. 加水印或移动
                if (fileType === 'image') {
                    await fileUtils.addWatermark(file.path, finalPath, name); // 使用新的项目名做水印
                } else {
                    fs.renameSync(file.path, finalPath);
                }

                // 3. 入库
                await db.run(`INSERT INTO project_media (project_id, file_path, file_type) VALUES (?,?,?)`, 
                    [id, `/uploads/${finalFileName}`, fileType]);

                // 4. 清理临时
                if (fileType === 'image' && fs.existsSync(file.path)) fs.unlinkSync(file.path);
            }
        }

        await db.commitTransaction();
        res.json({ code: 200, message: "Updated" });
    } catch (err) {
        await db.rollbackTransaction();
        if(req.files) req.files.forEach(f => { if(fs.existsSync(f.path)) fs.unlinkSync(f.path); });
        res.status(500).json({ error: err.message });
    }
});

// 删除
app.delete('/api/projects/:id', async (req, res) => {
    const id = req.params.id;
    await db.beginTransaction();
    try {
        // 1. 查出所有关联文件
        const mediaFiles = await db.all("SELECT file_path FROM project_media WHERE project_id = ?", [id]);
        
        // 2. 删除数据库记录 (级联删除会删 media 表记录，需要手动删文件)
        await db.run("DELETE FROM projects WHERE id = ?", [id]);
        
        // 3. 提交事务
        await db.commitTransaction();

        // 4. 清理物理文件
        mediaFiles.forEach(m => {
            const safeRelPath = String(m.file_path || '').replace(/^\/+/, '');
            const fullPath = path.join(__dirname, safeRelPath);
            fs.unlink(fullPath, (err) => {});
        });

        res.json({ code: 200, message: "Deleted" });
    } catch (err) {
        await db.rollbackTransaction();
        res.status(500).json({ error: err.message });
    }
});

// 统计接口增强
app.get('/api/stats', async (req, res) => {
    try {
        // 1. 类型统计
        const typeStats = await db.all("SELECT type, count(*) as count FROM projects GROUP BY type");
        
        // 2. 状态统计
        const statusStats = await db.all("SELECT status, count(*) as count FROM projects GROUP BY status");
        
        // 3. [新增] 趋势统计
        const trendStats = await db.all(`
            SELECT substr(created_at, 1, 7) as month, count(*) as count 
            FROM projects 
            WHERE created_at IS NOT NULL
            GROUP BY month 
            ORDER BY month ASC 
            LIMIT 12
        `);

        // 4. [新增] 关键指标卡片数据
        const total = await db.get("SELECT count(*) as count FROM projects");
        const working = await db.get("SELECT count(*) as count FROM projects WHERE status='construction'");
        
        // 本月新增
        const currentMonth = new Date().toISOString().slice(0, 7); // "2025-12"
        const newThisMonth = await db.get(
            "SELECT count(*) as count FROM projects WHERE strftime('%Y-%m', created_at) = ?", 
            [currentMonth]
        );

        res.json({ 
            code: 200, 
            data: { 
                byType: typeStats, 
                byStatus: statusStats, 
                byTrend: trendStats,
                summary: {
                    total: total.count,
                    working: working.count,
                    newMonth: newThisMonth.count
                }
            } 
        });
    } catch (err) {
        res.status(500).json({ code: 500, error: err.message });
    }
});

app.listen(PORT, () => console.log(`✅️ Server v2.0 running on ➡️  http://localhost:${PORT}`));