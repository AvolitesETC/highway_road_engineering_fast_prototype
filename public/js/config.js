/**
 * public/js/config.js
 * 系统配置中心
 */

export const Config = {
    API_BASE_URL: '/api',

    DICT: {
        type: { bridge: '桥梁维修', tunnel: '隧道养护', advertisement: '非标广告牌', pipe: '管线施工' },
        status: { planning: '申请中', construction: '施工中', completed: '已完工' }
    },

    COLOR_DICT: {
        planning: 'bg-primary',
        construction: 'bg-danger',
        completed: 'bg-success'
    },

    // [新增] 图表主题配置 (适配深色模式)
    THEME: {
        light: {
            text: '#333',
            grid: '#eee',
            colors: {
                planning: '#0dcaf0',
                construction: '#dc3545',
                completed: '#198754',
                default: '#0d6efd'
            }
        },
        dark: {
            text: '#ccc',
            grid: '#444',
            colors: {
                planning: '#0dcaf0',
                construction: '#dc3545',
                completed: '#198754', 
                default: '#0d6efd'
            }
        }
    }
};