/*
 * @Author: AvolitesETC 860170077@qq.com
 * @Date: 2025-12-15 12:37:28
 * @LastEditors: AvolitesETC 860170077@qq.com
 * @LastEditTime: 2026-01-04 15:09:10
 * @FilePath: \Html-Demo\highway_project\scripts\init_db.js
 * @Description: 笃行致远 我是力源
 * 
 * Copyright (c) 2025 by AvolitesETC, All Rights Reserved.
 */
/**
 * scripts/init_db.js
 * 数据库初始化脚本 - 运行一次即可
 */
const fs = require('fs');
const path = require('path');
const dbUtils = require('../db/db_utils');

// 确保 data 目录存在
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

// 确保 highway.db 文件存在
async function init() {
    console.log('开始初始化数据库...v2.1...');
    
    try {
        // 1. 创建项目主表 (Projects)
        // status 枚举: 'planning'(规划中), 'construction'(施工中), 'completed'(已完成)
        // 修改：增加了 approval_date 和 completion_date 字段
        await dbUtils.run(`CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            stake_number TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            applicant TEXT,
            status TEXT DEFAULT 'planning', 
            approval_date TEXT,     -- 新增：审批时间 (YYYY-MM-DD)
            completion_date TEXT,   -- 新增：完工时间 (YYYY-MM-DD)
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        console.log('主表 projects 创建成功');

        // 2. 创建多媒体附表 (Project_Media)
        // 用于存储照片或视频，通过 project_id 关联主表
        await dbUtils.run(`CREATE TABLE IF NOT EXISTS project_media (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            file_path TEXT NOT NULL,
            file_type TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )`);
        console.log('附表 project_media 创建成功');
        
        console.log('数据库初始化完毕！');
    } catch (err) {
        console.error(`❌️  初始化失败:`, err);
    }
}

// 执行初始化
init();