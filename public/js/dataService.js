/*
 * @Author: AvolitesETC 860170077@qq.com
 * @Date: 2025-12-19 12:28:20
 * @LastEditors: AvolitesETC 860170077@qq.com
 * @LastEditTime: 2026-03-14 23:14:03
 * @FilePath: \highway_project\public\js\dataService.js
 * @Description: 笃行致远 我是力源
 *
 * Copyright (c) 2025 by AvolitesETC, All Rights Reserved.
 */
/**
 * public/js/dataService.js
 * 数据服务层：负责所有前后端 API 交互
 * 只返回数据 Promise，不处理 UI
 */

// [新增] 带超时的 fetch 封装
// 作用：避免接口长时间 pending 时，页面表现得像“还没渲染完”
async function fetchWithTimeout(url, options = {}, timeout = 8000) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeout);

	try {
		const res = await fetch(url, {
			...options,
			signal: controller.signal,
		});
		return res;
	} finally {
		clearTimeout(timer);
	}
}

export const DataService = {
	// 获取所有项目列表
	async fetchProjects() {
		try {
			const res = await fetchWithTimeout("/api/projects", {}, 8000);
			if (!res.ok) throw new Error(`fetchProjects HTTP ${res.status}`);
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
			const res = await fetchWithTimeout("/api/stats", {}, 8000);
			if (!res.ok) throw new Error(`fetchStats HTTP ${res.status}`);
			return await res.json();
		} catch (err) {
			console.error("API Error [fetchStats]:", err);
			throw err;
		}
	},

	// 创建项目 (POST)
	async createProject(formData) {
		try {
			const res = await fetch("/api/projects", {
				method: "POST",
				body: formData,
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
				method: "PUT",
				body: formData,
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
				method: "DELETE",
			});
			// 简单的状态码检查
			if (!res.ok) throw new Error(res.statusText);
			return res;
		} catch (err) {
			console.error(`API Error [deleteProject ${id}]:`, err);
			throw err;
		}
	},
};
