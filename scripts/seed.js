/**
 * scripts/seed.js
 * 数据播种脚本 - v2.2 (支持自定义时间与纯文本恢复)
 */
const fs = require('fs');
const path = require('path');
const dbUtils = require('../db/db_utils');
const fileUtils = require('../utils/file_utils');

// 路径配置
const UPLOADS_DIR = path.join(__dirname, '../uploads');
// const ASSETS_DIR = path.join(__dirname, '../assets/sample_images'); // 示例图片目录 本次未创建
// const DEMO_IMAGE = path.join(ASSETS_DIR, 'demo.jpg');  // 示例图片路径 本次未创建

// ==========================================
// 🔴 替换模拟数据
// ==========================================
const SEED_DATA = [
    // 示例格式：
    {
        "name": "日照市主城区供排水管网更新改造项目穿越沈海高速（傅疃河东侧）涉路工程",
        "type": "pipe",
        "stake_number": "K713+200",
        "latitude": 35.476409,
        "longitude": 119.468229,
        "status": "construction",
        "applicant": "星期五建设有限公司",
        "description": "",
        "approval_date": "2025-12-16",
        "completion_date": "",
        "created_at": "2025-12-16 10:13:59",
        "hasImage": false
    },
    {
        "name": "移动通讯光缆迁改",
        "type": "pipe",
        "stake_number": "K007+000，日照港方向",
        "latitude": 35.357392,
        "longitude": 119.44341,
        "status": "completed",
        "applicant": "移动公司",
        "description": "",
        "approval_date": "2025-10-01",
        "completion_date": "2025-10-08",
        "created_at": "2025-12-16 12:18:38",
        "hasImage": false
    },
    {
        "name": "电信部门通讯光缆拆除",
        "type": "pipe",
        "stake_number": "K21+200",
        "latitude": 35.491866,
        "longitude": 119.268101,
        "status": "construction",
        "applicant": "电信公司",
        "description": "",
        "approval_date": "2025-12-01",
        "completion_date": "",
        "created_at": "2025-12-16 12:20:20",
        "hasImage": false
    },
    {
        "name": "服务区设立广告牌",
        "type": "advertisement",
        "stake_number": "K732+000",
        "latitude": 35.350774,
        "longitude": 119.37233,
        "status": "planning",
        "applicant": "服务区公司",
        "description": "",
        "approval_date": "2025-12-09",
        "completion_date": "",
        "created_at": "2025-12-16 12:21:41",
        "hasImage": false
    },
    {
        "name": "新能源光伏项目",
        "type": "pipe",
        "stake_number": "K16+600",
        "latitude": 35.471854,
        "longitude": 119.324122,
        "status": "planning",
        "applicant": "高速能源集团",
        "description": "",
        "approval_date": "2025-12-12",
        "completion_date": "",
        "created_at": "2025-12-16 12:22:27",
        "hasImage": false
    },
    {
        "name": "沈海高速改扩建道路标线重新划设",
        "type": "advertisement",
        "stake_number": "K736+000",
        "latitude": 35.328637,
        "longitude": 119.364167,
        "status": "construction",
        "applicant": "沈海一标项目部",
        "description": "",
        "approval_date": "2025-12-13",
        "completion_date": "",
        "created_at": "2025-12-16 12:23:12",
        "hasImage": false
    },
    {
        "name": "新能源光伏项目2",
        "type": "pipe",
        "stake_number": "K41+600",
        "latitude": 35.491313,
        "longitude": 119.021638,
        "status": "construction",
        "applicant": "高速能源集团",
        "description": "",
        "approval_date": "2025-12-15",
        "completion_date": "",
        "created_at": "2025-12-16 12:26:35",
        "hasImage": false
    }
];

async function seed() {
    console.log('🌱 开始播种真实数据...');

    // 1. 清空 uploads 文件夹 (如果你希望保留之前的图片，请注释掉下面这几行)
    // 为保持“播种”的纯净性，建议清空
    if (fs.existsSync(UPLOADS_DIR)) {
        fs.rmSync(UPLOADS_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(UPLOADS_DIR);
    fs.mkdirSync(path.join(UPLOADS_DIR, 'temp'));

    // 2. 重置数据库
    const dbPath = path.join(__dirname, '../data/highway.db');
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    
    // 建表 (保持与 init_db.js 一致)
    await dbUtils.run(`CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, type TEXT NOT NULL, stake_number TEXT NOT NULL,
        latitude REAL NOT NULL, longitude REAL NOT NULL, applicant TEXT,
        status TEXT DEFAULT 'planning', approval_date TEXT, completion_date TEXT,
        description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    await dbUtils.run(`CREATE TABLE IF NOT EXISTS project_media (
        id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL,
        file_path TEXT NOT NULL, file_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`);

    console.log('🧹 数据库已重置，开始注入...');

    // 3. 循环插入数据
    for (const item of SEED_DATA) {
        // 修改：SQL 语句中显式插入 created_at、approval_date 等所有字段
        const res = await dbUtils.run(
            `INSERT INTO projects (
                name, type, stake_number, latitude, longitude, 
                applicant, status, description, approval_date, completion_date, created_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            [
                item.name, item.type, item.stake_number, item.latitude, item.longitude, 
                item.applicant, item.status, item.description, item.approval_date, item.completion_date, item.created_at
            ]
        );
        const projectId = res.id;

        // 处理图片 (仅当 hasImage 为 true 且 demo.jpg 存在时)
        if (item.hasImage && fs.existsSync(DEMO_IMAGE)) {
            const newName = fileUtils.generateTimestampName('demo.jpg');
            const destPath = path.join(UPLOADS_DIR, newName);

            // 复制并加水印
            await fileUtils.addWatermark(DEMO_IMAGE, destPath, item.name);

            await dbUtils.run(
                `INSERT INTO project_media (project_id, file_path, file_type) VALUES (?,?,?)`,
                [projectId, `/uploads/${newName}`, 'image']
            );
            console.log(`✅ 已恢复: ${item.name} (含图片)`);
        } else {
            console.log(`✅ 已恢复: ${item.name} (无图片)`);
        }
    }

    console.log('🎉 播种完成！数据已恢复。');
}

seed();