<!--
 * @Author: AvolitesETC 860170077@qq.com
 * @Date: 2025-12-22 17:37:36
 * @LastEditors: AvolitesETC 860170077@qq.com
 * @LastEditTime: 2026-01-04 20:00:57
 * @FilePath: \Html-Demo\highway_project\Readme.md
 * @Description: 笃行致远 我是力源
 * 
 * Copyright (c) 2026 by AvolitesETC, All Rights Reserved.
-->

# 🛣️ 高速公路涉路工程管理系统 (Highway Management System)

> **版本**：v3.7 Alpha (Rapid Prototype)  
> **定位**：基于 Node.js + SQLite + 高德 GIS 的涉路工程全生命周期管理原型。

---

## 📖 项目简介
本项目是一个**单页应用 (SPA)** 架构的涉路工程管理系统原型。旨在解决高速公路管理中“台账不直观、位置不精确、统计不实时”的痛点。通过 GIS 地图可视化、数据驾驶舱、自动化数据治理等手段，实现对涉路工程从“申请 -> 施工 -> 完工”的全流程闭环管理。

## ✨ 核心功能概览
*   **🗺️ 地图驾驶舱**：集成高德地图 JS API，支持自定义 Marker（呼吸灯/状态色）、HUD 实时仪表盘、深色模式联动。
*   **📝 全流程管理**：支持工程项目的增删改查 (CRUD)，支持多媒体（图片/视频）上传与预览，支持自动添加水印。
*   **📊 数据看板**：基于 Apache ECharts 实现多维分析（类型/状态/趋势），支持数据明细查看及 **Excel 一键导出**。
*   **🤖 自动化运维**：内置 `seed` 脚本，支持一键清空数据库并注入带图片的黄金测试数据，极大降低演示成本。

---

## 🛠️ 技术栈说明

| 分层 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| **运行时** | **Node.js (v18+)** | 后端基础环境 |
| **Web框架** | **Express.js** | 提供 RESTful API 服务 |
| **数据库** | **SQLite3** | 单文件数据库，零配置，适合原型快速部署 |
| **前端架构** | **Native ES Modules** | 无需 Webpack/Vite，浏览器原生模块化，极速启动 |
| **UI 框架** | **Bootstrap 5** | 响应式布局与组件库 |
| **地图引擎** | **高德地图 JS API v2.0** | 核心 GIS 能力支持 |
| **图表引擎** | **Apache ECharts v5** | 高性能数据可视化 |
| **核心依赖** | **Sharp** (图片处理), **SheetJS** (Excel), **Multer** (上传) | 业务功能支撑 |

---

## 🚀 快速启动指南 (Zero to Hero)

### 1. 环境准备
- 确保本地已安装 [Node.js](https://nodejs.org/) (建议 v16 或更高版本)。

### 2. 安装依赖
- 在项目根目录下打开终端，执行：
```bash
npm install

```
---

### 📝 项目结构
```text
highway-project/
├── data/                       # SQLite 数据库文件存放处
├── db/                         # 数据库连接与事务封装 (db_utils.js)
├── public/                     # 前端静态资源 (核心业务)
│   ├── js/
│   │   ├── config.js           # 全局配置 (颜色、字典、API地址)
│   │   ├── dataService.js      # API 请求封装层
│   │   ├── mapController.js    # 地图与 HUD 逻辑控制器
│   │   ├── chartController.js  # 图表与 Excel 逻辑控制器
│   │   └── main.js             # 主入口与路由分发
│   ├── style.css               # 全局样式与 CSS 变量设计系统
│   └── index.html              # 单页应用入口
├── scripts/                    # 运维脚本 (init_db.js, seed.js)
├── uploads/                    # 图片上传存储目录 (自动管理)
├── utils/                      # 后端工具类 (file_utils.js - 水印/命名)
└── server.js                   # 后端主程序
```
---

### 3. 配置密钥 (.env & index.html)
1.  **后端配置**：复制 `.env.example` 为 `.env` (如无则新建)，配置端口和数据库路径：
    ```ini
    PORT=3001
    DB_PATH=./data/highway.db
    ```
2.  **前端配置**：打开 `public/index.html`，找到以下两行，填入你的高德地图 Key 和安全密钥：
    ```html
    <script>window._AMapSecurityConfig = { securityJsCode: '你的安全密钥' }</script>
    <script src="https://webapi.amap.com/maps?v=2.0&key=你的Key"></script>
    ```

### 4. 数据初始化 (关键步骤)
- 首次运行或需要重置演示数据时，执行此命令。它会**清空数据库**并**自动生成**带水印的测试数据。
- *(注：若需注入图片，需确保 `assets/sample_images/demo.jpg` 文件存在)*
```bash
npm run seed
```

### 5. 启动服务
- 在项目根目录下打开终端，执行：
```bash
npm start
```
- 访问 `http://localhost:3001`，即可看到高速公路涉路工程管理系统原型。

---

