/**
 * public/js/mapController.js
 * 地图控制器：负责高德地图渲染、点位标记、HUD 更新
 */
import { Config } from './config.js';

export const MapController = {
    map: null,          // 主地图实例
    pickerMap: null,    // 选点地图实例
    pickerMarker: null, // 选点标记

    // === 初始化主地图 ===
    initMap(containerId) {
        // 访问全局 AMap 对象
        this.map = new AMap.Map(containerId, { 
            zoom: 11, 
            center: [119.3255, 35.3928] // 日照附近坐标
        });
        
        // 点击空白处关闭弹窗
        this.map.on('click', () => this.map.clearInfoWindow());
    },

    // === 初始化选点地图 ===
    initPicker(containerId, latInputId, lngInputId) {
        this.pickerMap = new AMap.Map(containerId, { 
            zoom: 12, 
            center: [119.3255, 35.3928], 
            cursor: 'crosshair' 
        });

        this.pickerMap.on('click', (e) => {
            const lng = e.lnglat.getLng();
            const lat = e.lnglat.getLat();
            
            // 更新输入框
            document.getElementById(lngInputId).value = lng;
            document.getElementById(latInputId).value = lat;
            
            // 更新标记
            if (this.pickerMarker) {
                this.pickerMarker.setPosition([lng, lat]);
            } else {
                this.pickerMarker = new AMap.Marker({ 
                    position: [lng, lat], 
                    map: this.pickerMap 
                });
            }
        });
    },

    // 清除选点
    clearPicker(latInputId, lngInputId) {
        document.getElementById(lngInputId).value = '';
        document.getElementById(latInputId).value = '';
        if (this.pickerMarker) {
            this.pickerMarker.setMap(null);
            this.pickerMarker = null;
        }
    },

    // 设置选点回显（编辑模式用）
    setPickerLocation(lng, lat) {
        if (!this.pickerMap) return;
        this.pickerMap.setCenter([lng, lat]);
        if (this.pickerMarker) {
            this.pickerMarker.setPosition([lng, lat]);
            this.pickerMarker.setMap(this.pickerMap);
        } else {
            this.pickerMarker = new AMap.Marker({ 
                position: [lng, lat], 
                map: this.pickerMap 
            });
        }
    },

    // === 渲染所有标记点 ===
    renderMarkers(list) {
        if (!this.map) return;
        this.map.clearMap(); // 清除旧点

        list.forEach(p => {
            let content = '';
            // 根据状态生成自定义 Marker 样式
            if (p.status === 'construction') content = '<div class="marker-pulse"></div>';
            else if (p.status === 'completed') content = '<div class="marker-dot bg-completed"></div>';
            else content = '<div class="marker-dot bg-planning"></div>';

            const marker = new AMap.Marker({
                position: [p.longitude, p.latitude],
                content: content,
                offset: new AMap.Pixel(-12, -12),
                label: {
                    content: `<div class="custom-label-content">${p.name}</div>`,
                    offset: new AMap.Pixel(0, -20),
                    direction: 'top'
                },
                zIndex: 100
            });

            const badgeClass = Config.COLOR_DICT[p.status] || 'bg-secondary';
            const statusText = Config.DICT.status[p.status];

            // 绑定点击事件 -> 调用全局 app 的 showDetail 方法
            marker.on('click', () => {
                const info = new AMap.InfoWindow({
                    content: `
                        <div style="padding:5px; min-width:200px;">
                            <h6 class="mb-2">${p.name}</h6>
                            <span class="badge ${badgeClass}">${statusText}</span>
                            <hr style="margin:8px 0">
                            <button class="btn btn-sm btn-primary w-100" onclick="window.app.showDetail(${p.id})">查看详情</button>
                        </div>
                    `,
                    offset: new AMap.Pixel(0, -10)
                });
                info.open(this.map, marker.getPosition());
            });
            
            marker.setMap(this.map);
        });
    },

    // === 更新 HUD 仪表盘 ===
    updateHUD(list) {
        const stats = { total: list.length, planning: 0, construction: 0, completed: 0 };
        list.forEach(p => {
            const status = p.status ? p.status.trim() : '';
            if (stats[status] !== undefined) stats[status]++;
        });

        // 辅助函数：更新 DOM 文本
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerText = val;
        };

        setVal('hud-total', stats.total);
        setVal('hud-planning', stats.planning);
        setVal('hud-construction', stats.construction);
        setVal('hud-completed', stats.completed);
    },

    // 切换主题样式
    setMapStyle(theme) {
        const style = theme === 'dark' ? 'amap://styles/dark' : 'amap://styles/normal';
        if (this.map) this.map.setMapStyle(style);
        if (this.pickerMap) this.pickerMap.setMapStyle(style);
    },

    resize() {
        if (this.map) this.map.resize();
    }
};