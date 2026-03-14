/*
 * @Author: AvolitesETC 860170077@qq.com
 * @Date: 2025-12-15 12:29:40
 * @LastEditors: AvolitesETC 860170077@qq.com
 * @LastEditTime: 2025-12-29 16:22:35
 * @FilePath: \Html-Demo\highway_project\db\db_utils.js
 * @Description: 笃行致远 我是力源
 * 
 * Copyright (c) 2025 by AvolitesETC, All Rights Reserved.
 */
/**
 * db/db_utils.js
 * 数据库操作封装工具类
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// 创建数据库连接
const dbPath = process.env.DB_PATH || './data/highway.db';
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('❌️数据库连接失败:', err.message);
    else console.log(`✅️  基础数据库连接已建立...`);
});

// 开启外键约束支持 (SQLite默认关闭，必须手动开启)
db.run("PRAGMA foreign_keys = ON");

/**
 * 封装 db.run 为 Promise
 * 用于执行 INSERT, UPDATE, DELETE 等不返回数据的操作
 */
const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                // 如果出错，调用 reject，外层 catch 会捕获
                reject(err);
            } else {
                // 如果成功，调用 resolve，返回操作结果（如插入的ID）
                resolve({ id: this.lastID, changes: this.changes });
            }
        });
    });
};

/**
 * 封装 db.all 为 Promise
 * 用于执行 SELECT 查询，返回多行数据
 */
const all = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

/**
 * 封装 db.get 为 Promise
 * 用于执行 SELECT 查询，只返回一行数据
 */
const get = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

/**
 * 事务控制：开始事务
 */
const beginTransaction = async () => {
    await run("BEGIN TRANSACTION");
};

/**
 * 事务控制：提交事务
 * (所有操作都成功后执行，数据真正写入硬盘)
 */
const commitTransaction = async () => {
    await run("COMMIT");
};

/**
 * 事务控制：回滚事务
 * (如果中途报错，执行这个，撤销之前所有操作)
 */
const rollbackTransaction = async () => {
    await run("ROLLBACK");
};

// 导出这些方法供 server.js 使用
module.exports = {
    db, run, all, get, 
    beginTransaction, commitTransaction, rollbackTransaction
};