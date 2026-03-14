/**
 * public/js/chartController.js
 * 图表控制器：基于 Apache ECharts 实现
 * 功能：图表渲染、深色模式适配、表格渲染、Excel 导出
 * v3.6 稳健修复版
 */
import { Config } from './config.js';

export const ChartController = {
    // 存储 ECharts 实例，用于后续 resize、销毁或主题切换
    instances: {
        type: null,
        status: null,
        trend: null
    },

    // 缓存当前数据，用于切换主题时重绘
    currentData: null,

    // === 1. 渲染顶部统计卡片 ===
    renderSummaryCards(summary, list) {
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerText = val;
        };

        if (!summary) return;

        setVal('stat-total', summary.total || 0);
        setVal('stat-working', summary.working || 0);
        setVal('stat-new', summary.newMonth || 0);

        const completed = list ? list.filter(p => p.status === 'completed').length : 0;
        const rate = (summary.total > 0) ? Math.round(completed / summary.total * 100) : 0;
        setVal('stat-done', rate + '%');
    },

    // === 2. 渲染所有图表 (入口) ===
    renderCharts(byType, byStatus, byTrend) {
        // 1. 缓存数据
        this.currentData = { byType, byStatus, byTrend };

        // 2. 检查 ECharts 库是否加载
        if (typeof echarts === 'undefined') {
            console.error("ECharts 库未加载，图表无法渲染");
            return;
        }

        // 3. 获取当前主题配置
        const theme = this._getCurrentThemeConfig();

        // 4. 初始化各个图表
        this.initStatusChart(byStatus || [], theme);
        this.initTypeChart(byType || [], theme);
        this.initTrendChart(byTrend || [], theme);

        // 5. 绑定窗口缩放自适应
        window.addEventListener('resize', () => {
            Object.values(this.instances).forEach(chart => chart && chart.resize());
        });
    },

    // === [新增] 主题切换响应 ===
    updateTheme(isDark) {
        if (!this.currentData) return;
        
        // 获取新主题的颜色配置
        const theme = this._getCurrentThemeConfig();
        
        // 使用缓存的数据重绘图表
        this.initStatusChart(this.currentData.byStatus || [], theme);
        this.initTypeChart(this.currentData.byType || [], theme);
        this.initTrendChart(this.currentData.byTrend || [], theme);
    },

    // --- 内部私有：获取主题配置 (带安全兜底) ---
    _getCurrentThemeConfig() {
        // 判断当前 HTML 标签上的 data-theme 属性
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        
        // 安全获取 Config 中的配置，防止 config.js 未更新导致报错
        // 如果 Config.THEME 不存在，使用默认亮色配置兜底
        const defaultTheme = {
            text: '#333',
            grid: '#eee',
            colors: Config.CHART_COLORS || { planning: '#0dcaf0', construction: '#dc3545', completed: '#198754', default: '#0d6efd' }
        };

        if (Config.THEME) {
            return isDark ? Config.THEME.dark : Config.THEME.light;
        } else {
            // 如果 config.js 还没更新，深色模式手动反转颜色
            return isDark ? { text: '#ccc', grid: '#444', colors: defaultTheme.colors } : defaultTheme;
        }
    },

    // --- 内部图表渲染函数 ---

    initStatusChart(data, theme) {
        const dom = document.getElementById('chartStatus');
        if (!dom) return;
        
        // 销毁旧实例以应用新主题背景
        if (this.instances.status) this.instances.status.dispose();
        const chart = echarts.init(dom, null, { renderer: 'svg' });
        this.instances.status = chart;

        const chartData = data.map(item => ({
            value: item.count,
            name: Config.DICT.status[item.status]
        }));

        const option = {
            // 颜色顺序：申请中(蓝), 施工中(红), 已完工(绿)
            color: [theme.colors.planning, theme.colors.construction, theme.colors.completed],
            tooltip: {
                trigger: 'item',
                formatter: '{b}: {c} ({d}%)',
                backgroundColor: 'rgba(50,50,50,0.7)',
                textStyle: { color: '#fff' }
            },
            legend: {
                bottom: '0%',
                left: 'center',
                textStyle: { color: theme.text } // 适配文字颜色
            },
            series: [
                {
                    name: '工程状态',
                    type: 'pie',
                    radius: ['0%', '70%'],
                    data: chartData.length ? chartData : [{value: 0, name: '无数据'}],
                    label: {
                        show: true,
                        position: 'inside',
                        formatter: '{d}%', 
                        color: '#fff',
                        fontWeight: 'bold'
                    },
                    itemStyle: {
                        borderColor: '#fff',
                        borderWidth: 2
                    },
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    }
                }
            ]
        };
        chart.setOption(option);
    },

    initTypeChart(data, theme) {
        const dom = document.getElementById('chartType');
        if (!dom) return;

        if (this.instances.type) this.instances.type.dispose();
        const chart = echarts.init(dom, null, { renderer: 'svg' });
        this.instances.type = chart;

        const xData = data.map(item => Config.DICT.type[item.type] || item.type);
        const yData = data.map(item => item.count);

        const option = {
            color: [theme.colors.default],
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                backgroundColor: 'rgba(50,50,50,0.7)',
                textStyle: { color: '#fff' }
            },
            grid: {
                left: '3%', right: '4%', bottom: '3%', containLabel: true
            },
            xAxis: {
                type: 'category',
                data: xData,
                axisTick: { alignWithLabel: true },
                axisLabel: { color: theme.text }, // 适配文字
                axisLine: { lineStyle: { color: theme.grid } } // 适配轴线
            },
            yAxis: {
                type: 'value',
                minInterval: 1,
                splitLine: { lineStyle: { color: theme.grid } }, // 适配网格线
                axisLabel: { color: theme.text }
            },
            series: [
                {
                    name: '项目数量',
                    type: 'bar',
                    barWidth: '50%',
                    data: yData,
                    label: {
                        show: true,
                        position: 'top',
                        color: theme.text
                    },
                    itemStyle: {
                        borderRadius: [4, 4, 0, 0] // 顶部圆角
                    }
                }
            ]
        };
        chart.setOption(option);
    },

    initTrendChart(data, theme) {
        const dom = document.getElementById('chartTrend');
        if (!dom) return;

        if (this.instances.trend) this.instances.trend.dispose();
        const chart = echarts.init(dom, null, { renderer: 'svg' });
        this.instances.trend = chart;

        const xData = data.map(item => item.month);
        const yData = data.map(item => item.count);

        const option = {
            color: ['#6610f2'],
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(50,50,50,0.7)',
                textStyle: { color: '#fff' }
            },
            grid: {
                left: '3%', right: '4%', bottom: '3%', containLabel: true
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: xData,
                axisLabel: { color: theme.text },
                axisLine: { lineStyle: { color: theme.grid } }
            },
            yAxis: {
                type: 'value',
                minInterval: 1,
                splitLine: { lineStyle: { color: theme.grid } },
                axisLabel: { color: theme.text }
            },
            series: [
                {
                    name: '月度申请',
                    type: 'line',
                    data: yData,
                    smooth: true,
                    areaStyle: {
                        opacity: 0.2
                    },
                    label: { show: false }
                }
            ]
        };
        chart.setOption(option);
    },

    // === 3. 渲染数据表格 ===
    renderTable(list) {
        const tbody = document.getElementById('stats-table-body');
        if (!tbody) return;

        if (!list || list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">暂无数据</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(p => `
            <tr>
                <td>${p.id}</td>
                <td>${p.name}</td>
                <td>${Config.DICT.type[p.type] || p.type}</td>
                <td><span class="badge ${Config.COLOR_DICT[p.status]}">${Config.DICT.status[p.status]}</span></td>
                <td>${p.stake_number}</td>
                <td>${p.applicant || '-'}</td>
                <td>${p.approval_date || '-'}</td>
                <td>${p.completion_date || '-'}</td>
            </tr>
        `).join('');
    },

    // === 4. 导出 Excel ===
    exportToExcel() {
        if (!confirm('确认导出当前显示的表格数据？')) return;
        try {
            // 检查 xlsx 库是否加载
            if (typeof XLSX === 'undefined') {
                alert("Excel 导出组件未加载，请检查网络或刷新页面");
                return;
            }
            
            const table = document.getElementById('stats-table');
            const wb = XLSX.utils.table_to_book(table, { sheet: "涉路工程统计" });
            XLSX.writeFile(wb, `Highway_Data_${new Date().toLocaleDateString()}.xlsx`);
        } catch (err) {
            console.error("Excel导出错误:", err);
            alert("导出失败，请检查浏览器控制台");
        }
    }
};