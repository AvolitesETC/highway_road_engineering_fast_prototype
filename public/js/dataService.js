/*
 * @Author: AvolitesETC 860170077@qq.com
 * @Date: 2025-12-19 12:28:20
 * @LastEditors: AvolitesETC 860170077@qq.com
 * @LastEditTime: 2025-12-19 12:28:32
 * @FilePath: \Html-Demo\highway_project\public\js\dataService.js
 * @Description: 笃行致远 我是力源
 * 
 * Copyright (c) 2025 by AvolitesETC, All Rights Reserved.
 */
/**
 * public/js/dataService.js
 * 数据服务层：负责所有前后端 API 交互
 * 只返回数据 Promise，不处理 UI
 */

export const DataService = {
    // 获取所有项目列表
    async fetchProjects() {
        try {
            const res = await fetch('/api/projects');
            return await res.json();
        } catch (err) {
            console.error("API Error [fetchProjects]:", err);
            throw err;
        }
    },

    // 获取单个项目详情
    async fetchProjectById(id) {
        try {
            const res = await fetch(`/api/projects/${id}`);
            return await res.json();
        } catch (err) {
            console.error(`API Error [fetchProjectById ${id}]:`, err);
            throw err;
        }
    },

    // 获取统计数据
    async fetchStats() {
        try {
            const res = await fetch('/api/stats');
            return await res.json();
        } catch (err) {
            console.error("API Error [fetchStats]:", err);
            throw err;
        }
    },

    // 创建项目 (POST)
    async createProject(formData) {
        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                body: formData
            });
            return await res.json();
        } catch (err) {
            console.error("API Error [createProject]:", err);
            throw err;
        }
    },

    // 更新项目 (PUT)
    async updateProject(id, formData) {
        try {
            const res = await fetch(`/api/projects/${id}`, {
                method: 'PUT',
                body: formData
            });
            return await res.json();
        } catch (err) {
            console.error(`API Error [updateProject ${id}]:`, err);
            throw err;
        }
    },

    // 删除项目 (DELETE)
    async deleteProject(id) {
        try {
            const res = await fetch(`/api/projects/${id}`, {
                method: 'DELETE'
            });
            // 简单的状态码检查
            if (!res.ok) throw new Error(res.statusText);
            return res;
        } catch (err) {
            console.error(`API Error [deleteProject ${id}]:`, err);
            throw err;
        }
    }
};