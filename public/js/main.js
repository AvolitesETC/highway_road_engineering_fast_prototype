/**
 * public/js/main.js
 * 应用主入口：负责组装 Controller，处理全局事件，暴露 API
 * v3.7 业务逻辑增强 - 修复详情页与画廊预览的按钮显示逻辑
 */
import { Config } from './config.js';
import { DataService } from './dataService.js';
import { MapController } from './mapController.js';
import { ChartController } from './chartController.js';

// 当前操作状态
const state = {
    currentProject: null,
    deletedMediaIds: [],
    isEditing: false // [新增] 区分“新增/编辑”进入录入页的模式
};

// === 全局 App 对象 (暴露给 HTML onclick 使用) ===
window.app = {
    // === 1. 视图切换 (核心路由逻辑) ===
    switchView(viewId) {
        // 1. 隐藏所有视图
        document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');

        // [新增] 从导航进入数据录入：默认是“新增”，自动清空表单，避免残留 id 导致误编辑
        if (viewId === 'entry') {
            /**
             * 关键修复：
             * - “是否编辑态”的最终判定以 edit-id 为准（它决定 handleSubmit 走 POST 还是 PUT）
             * - 防止某些时序下 state.isEditing 被提前重置导致误清空表单
             */
            const editId = (document.getElementById('edit-id')?.value || '').trim();
            const isEditingById = !!editId;

            if (!state.isEditing && !isEditingById) {
                // 确认是新增入口才清空，避免编辑跳转误被清空
                this.resetForm();
            }
        }
        
        // 2. 显示目标视图
        const targetView = document.getElementById(`view-${viewId}`);
        if (targetView) targetView.style.display = 'block';

        // 3. 更新侧边栏导航高亮
        document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
        // 使用 data-view 属性进行精准匹配
        const activeLink = document.querySelector(`.nav-link[data-view="${viewId}"]`);
        if (activeLink) activeLink.classList.add('active');

        // 4. 触发各模块刷新
        if (viewId === 'map') {
            setTimeout(() => MapController.resize(), 100);
        }
        if (viewId === 'stats') {
            loadStatsData();
        }
    },

    // === 2. 路由与主题初始化 ===
    
    // 初始化路由监听
    initRouter() {
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1) || 'map';
            this.switchView(hash);
        });
        const hash = window.location.hash.slice(1) || 'map';
        this.switchView(hash);
    },

    // 初始化深色模式
    initTheme() {
        const toggle = document.getElementById('themeToggle');
        const savedTheme = localStorage.getItem('theme') || 'light';
        
        document.documentElement.setAttribute('data-theme', savedTheme);
        if (toggle) toggle.checked = savedTheme === 'dark';
        this.applyTheme(savedTheme);

        if (toggle) {
            toggle.addEventListener('change', (e) => {
                const theme = e.target.checked ? 'dark' : 'light';
                localStorage.setItem('theme', theme);
                document.documentElement.setAttribute('data-theme', theme);
                this.applyTheme(theme);
            });
        }
    },

    applyTheme(theme) {
        MapController.setMapStyle(theme);
        if (ChartController.updateTheme) {
            ChartController.updateTheme(theme === 'dark');
        }
    },

    // === 3. 业务操作代理 ===

    // 导出 Excel
    exportToExcel() {
        ChartController.exportToExcel();
    },

    // 查看详情 (由 MapController 的 Marker 点击触发)
    async showDetail(id) {
        try {
            const res = await DataService.fetchProjectById(id);
            state.currentProject = res.data;
            // [修改] 传入 'default' 模式：显示编辑按钮，隐藏删除按钮
            renderDetailModal(res.data, 'default');
        } catch (err) {
            console.error(err);
            alert("获取详情失败");
        }
    },

    // 进入编辑模式
    editProject() {
        // 进入编辑态：后续切换到 entry 视图时不自动清空表单
        state.isEditing = true;

        // 关闭详情框
        bootstrap.Modal.getInstance(document.getElementById('detailModal')).hide();
        // 修改 URL Hash 跳转到录入页
        window.location.hash = 'entry';
        // 填充表单
        fillForm(state.currentProject);
    },

    // 删除项目
    async deleteProject() {
        if (!confirm(`❗️ 确定要彻底删除该项目及其所有文件吗？`)) return;
        try {
            const res = await DataService.deleteProject(state.currentProject.id);
            bootstrap.Modal.getInstance(document.getElementById('detailModal')).hide();
            alert('已删除');
            initData(); // 刷新数据
            window.location.hash = 'map'; // 跳回地图
        } catch (e) { 
            console.error(e);
            alert('删除失败'); 
        }
    },

    // 表单提交 (新增/修改)
    async handleSubmit(e) {
        e.preventDefault();
        if(!confirm('确认提交吗？')) return;

        const formData = new FormData(e.target);

        /**
         * 关键修复：
         * - 地图选点更新的是 input-lat / input-lng 的 value（基于 id）
         * - 但表单字段 name 可能不是 latitude/longitude
         * - 这里强制写入后端需要的键名，保证新增/编辑时坐标一定能落库
         */
        const latVal = (document.getElementById('input-lat')?.value || '').trim();
        const lngVal = (document.getElementById('input-lng')?.value || '').trim();

        if (latVal) formData.set('latitude', latVal);
        if (lngVal) formData.set('longitude', lngVal);

        const id = document.getElementById('edit-id').value;
        
        // 如果有标记删除的图片，追加到表单
        if(id) formData.append('deleted_media_ids', state.deletedMediaIds.join(','));

        try {
            const res = id 
                ? await DataService.updateProject(id, formData) 
                : await DataService.createProject(formData);
            
            if(res.code === 200) {
                alert('保存成功');
                this.resetForm();
                await initData(); // 等待数据刷新 + marker 重绘完成
                window.location.hash = 'map'; // 跳回地图
            } else {
                alert('保存失败: ' + (res.error || '未知错误'));
            }
        } catch(err) { 
            console.error("提交出错:", err);
            alert('网络错误或服务器异常'); 
        }
    },

    // [新增] 预览画廊模式 (用于编辑页点击缩略图)
    async previewGallery(projectId, initialIndex = 0) {
        try {
            const p = state.currentProject && state.currentProject.id === projectId 
                    ? state.currentProject 
                    : (await DataService.fetchProjectById(projectId)).data;
            
            // [修改] 传入 'gallery' 模式：显示删除按钮，隐藏编辑按钮
            renderDetailModal(p, 'gallery');
            
            // 延时等待模态框渲染，然后跳转轮播图
            setTimeout(() => {
                const carouselEl = document.getElementById('projectCarousel');
                if (carouselEl) {
                    const carousel = new bootstrap.Carousel(carouselEl);
                    carousel.to(initialIndex);
                }
            }, 200);
        } catch (err) {
            console.error("预览失败:", err);
        }
    },

    // 图片预览 (保留，供旧逻辑使用)
    previewImage(src) {
        const img = document.getElementById('previewImageFull');
        if(img) {
            img.src = src;
            new bootstrap.Modal(document.getElementById('imagePreviewModal')).show();
        }
    },

    // 标记删除旧图 (视觉反馈)
    markMediaDelete(id) {
        if (!state.deletedMediaIds.includes(id)) {
            state.deletedMediaIds.push(id);
        }
        const el = document.getElementById(`media-${id}`);
        if(el) {
            el.classList.add('deleted');
            const img = el.querySelector('.media-thumb');
            if(img) img.onclick = null; // 移除点击事件，防止删除后还能预览
        }
    },

    // 清除选点
    clearPicker() {
        MapController.clearPicker('input-lat', 'input-lng');
    },

    // 重置表单
    resetForm() {
        const form = document.getElementById('projectForm');
        if (form) form.reset();
        
        // 新增/重置：明确退出编辑态，避免后续误判为编辑提交
        state.isEditing = false;
        document.getElementById('edit-id').value = '';
        const oldMediaArea = document.getElementById('old-media-area');
        if(oldMediaArea) oldMediaArea.style.display = 'none';
        
        MapController.clearPicker('input-lat', 'input-lng');
        state.deletedMediaIds = [];
    }
};

// === 内部辅助函数 ===

async function initData() {
    try {
        const res = await DataService.fetchProjects();
        if (res.code === 200) {
            MapController.renderMarkers(res.data);
            MapController.updateHUD(res.data);
        }
    } catch (err) {
        console.error("初始化数据失败", err);
    }
}

async function loadStatsData() {
    try {
        const resStats = await DataService.fetchStats();
        const resList = await DataService.fetchProjects(); 

        if (resStats.code === 200 && resList.code === 200) {
            const { byType, byStatus, byTrend, summary } = resStats.data;
            ChartController.renderSummaryCards(summary, resList.data);
            ChartController.renderTable(resList.data);
            ChartController.renderCharts(byType, byStatus, byTrend);
        }
    } catch (err) {
        console.error("统计加载失败", err);
    }
}

// 填充表单数据 (编辑回显)
function fillForm(p) {
    if (!p) return;
    const form = document.getElementById('projectForm');
    
    document.getElementById('edit-id').value = p.id;
    form.name.value = p.name;
    form.type.value = p.type;
    form.status.value = p.status;
    form.stake_number.value = p.stake_number;
    form.applicant.value = p.applicant;
    form.description.value = p.description;
    form.latitude.value = p.latitude;
    form.longitude.value = p.longitude;
    form.approval_date.value = p.approval_date || '';
    form.completion_date.value = p.completion_date || '';

    state.deletedMediaIds = [];
    
    const mediaArea = document.getElementById('old-media-area');
    if (mediaArea) {
        mediaArea.style.display = 'block';
        const mediaList = document.getElementById('media-list');
        if (p.media_files && mediaList) {
            // 生成带操作按钮的缩略图结构
            mediaList.innerHTML = p.media_files.map((m, index) => `
                <div class="media-thumb-container" id="media-${m.id}">
                    ${m.file_type === 'video' 
                    ? `<div class="media-thumb bg-dark text-white d-flex align-items-center justify-content-center" 
                            onclick="window.app.previewGallery(${p.id}, ${index})">
                            <i class="ri-movie-line fs-3"></i>
                        </div>`
                    : `<img src="${m.file_path}" class="media-thumb" 
                            onclick="window.app.previewGallery(${p.id}, ${index})">`
                    }
                    <button type="button" class="btn-delete-media" onclick="window.app.markMediaDelete(${m.id})">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            `).join('');
        }
    }

    MapController.setPickerLocation(p.longitude, p.latitude);
}

// [核心修改] 渲染详情模态框
// mode: 'default' (地图详情) | 'gallery' (编辑页画廊)
function renderDetailModal(p, mode = 'default') {
    let carouselHtml = '';
    if (p.media_files && p.media_files.length > 0) {
        const indicators = p.media_files.map((_, i) => 
            `<button type="button" data-bs-target="#projectCarousel" data-bs-slide-to="${i}" class="${i===0?'active':''}"></button>`
        ).join('');

        const items = p.media_files.map((m, i) => {
            const content = m.file_type === 'video'
                ? `<div style="height:400px; background:#000; display:flex; align-items:center; justify-content:center;">
                    <video src="${m.file_path}" controls style="max-width:100%; max-height:100%"></video></div>`
                : `<img src="${m.file_path}" class="d-block w-100" style="height:400px; object-fit:contain; background:#000;">`; // 移除点击事件，防止递归预览
            return `<div class="carousel-item ${i===0?'active':''}">${content}</div>`;
        }).join('');

        carouselHtml = `
            <div id="projectCarousel" class="carousel slide" data-bs-ride="carousel">
                <div class="carousel-indicators">${indicators}</div>
                <div class="carousel-inner">${items}</div>
                <button class="carousel-control-prev" type="button" data-bs-target="#projectCarousel" data-bs-slide="prev"><span class="carousel-control-prev-icon"></span></button>
                <button class="carousel-control-next" type="button" data-bs-target="#projectCarousel" data-bs-slide="next"><span class="carousel-control-next-icon"></span></button>
            </div>`;
    } else {
        carouselHtml = '<div class="text-center p-4 text-muted bg-light">暂无现场照片</div>';
    }

    const html = `
        <div class="row">
            <div class="col-12 mb-3">${carouselHtml}</div>
            <div class="col-md-6">
                <p><b>类型:</b> ${Config.DICT.type[p.type] || p.type}</p>
                <p><b>状态:</b> ${Config.DICT.status[p.status]}</p>
                <p><b>桩号:</b> ${p.stake_number}</p>
            </div>
            <div class="col-md-6">
                <p><b>申请单位:</b> ${p.applicant || '-'}</p>
                <p><b>审批时间:</b> ${p.approval_date || '-'}</p>
                <p><b>完工时间:</b> ${p.completion_date || '-'}</p>
            </div>
            <div class="col-12 mt-2">
                <h6>描述:</h6>
                <p class="text-secondary">${p.description || '无描述'}</p>
            </div>
        </div>
    `;
    document.getElementById('detailBody').innerHTML = html;

    // [逻辑控制] 动态渲染底部按钮
    const footer = document.querySelector('#detailModal .modal-footer');
    if (footer) {
        if (mode === 'gallery') {
            // 画廊模式：保留删除项目，隐藏编辑项目（避免画廊预览时误入编辑）
            footer.innerHTML = `
                <button type="button" class="btn btn-danger me-auto" onclick="window.app.deleteProject()">删除项目</button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
            `;
        } else {
            /**
             * 默认模式（地图详情/查看详情）：
             * - 用户常见诉求：在“详情”里直接删除项目
             * - 因此这里不再隐藏删除按钮，保持“删/改/关”完整闭环
             */
            footer.innerHTML = `
                <button type="button" class="btn btn-danger me-auto" onclick="window.app.deleteProject()">删除项目</button>
                <button type="button" class="btn btn-primary" onclick="window.app.editProject()">编辑项目</button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
            `;
        }
    }

    new bootstrap.Modal(document.getElementById('detailModal')).show();
}

// === 启动流程 ===
document.addEventListener('DOMContentLoaded', () => {
    MapController.initMap('amap-container');
    MapController.initPicker('picker-map', 'input-lat', 'input-lng');
    initData();
    app.initRouter();
    app.initTheme();

    /**
     * 关键修复：
     * - projectForm 未绑定 submit 事件时，会走浏览器默认 GET 提交
     * - 表现为：URL 自动拼接 ?id=...&name=... 并整页刷新
     * - 绑定后：走 app.handleSubmit -> FormData -> 调用后端 API（POST/PUT）
     */
    const form = document.getElementById('projectForm');
    if (form) {
        form.addEventListener('submit', (e) => app.handleSubmit(e));
    }

    document.getElementById('input-lng').addEventListener('input', (e) => { 
        if(!e.target.value) app.clearPicker(); 
    });
});