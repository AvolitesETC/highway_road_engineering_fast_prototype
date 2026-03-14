/*
 * @Author: AvolitesETC 860170077@qq.com
 * @Date: 2025-12-17 11:51:46
 * @LastEditors: AvolitesETC 860170077@qq.com
 * @LastEditTime: 2026-01-04 15:08:23
 * @FilePath: \Html-Demo\highway_project\scripts\export_data.js
 * @Description: 笃行致远 我是力源
 * 
 * Copyright (c) 2025 by AvolitesETC, All Rights Reserved.
 */

// scripts/export_data.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../data/highway.db');
const db = new sqlite3.Database(dbPath);

db.all("SELECT * FROM projects", [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }

    // 格式化数据，添加 hasImage 标记
    const seedData = rows.map(row => {
        return {
            name: row.name,
            type: row.type,
            stake_number: row.stake_number,
            latitude: row.latitude,
            longitude: row.longitude,
            status: row.status,
            applicant: row.applicant, // v2.1 新增
            description: row.description,
            approval_date: row.approval_date, // v2.1 新增
            completion_date: row.completion_date, // v2.1 新增
            created_at: row.created_at, // 保留原始创建时间
            hasImage: false // 默认全部设为 false
        };
    });

    console.log('请复制以下内容替换 seed.js 中的 SEED_DATA 数组：');
    console.log('--------------------------------------------------');
    console.log(JSON.stringify(seedData, null, 4)); // JSON 格式
    console.log('--------------------------------------------------');
});

db.close();