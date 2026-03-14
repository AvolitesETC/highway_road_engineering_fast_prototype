/*
 * @Author: AvolitesETC 860170077@qq.com
 * @Date: 2026-03-14 19:53:33
 * @LastEditors: AvolitesETC 860170077@qq.com
 * @LastEditTime: 2026-03-14 19:59:56
 * @FilePath: \highway_project\eslint.config.mjs
 * @Description: 笃行致远 我是力源
 * 
 * Copyright (c) 2026 by AvolitesETC, All Rights Reserved.
 */
import globals from "globals";
import css from "@eslint/css";
import htmlPlugin from "eslint-plugin-html"; // 引入 HTML 插件
import { defineConfig } from "eslint/config";

export default defineConfig([
  // 1. 基础配置：JS 文件（Node + 浏览器环境）
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs", // 适配 Node.js 的 require/exports
      globals: { ...globals.browser, ...globals.node }, // 同时支持浏览器和 Node 环境
      ecmaVersion: "latest" // 支持最新 JS 语法
    },
    // 自定义规则（新手友好，和旧配置一致）
    rules: {
      "no-unused-vars": "warn",    // 未使用变量仅警告
      "no-console": "off",         // 允许 console.log
      "no-undef": "warn"           // 未定义变量仅警告（适配 HTML 全局变量）
    },
    extends: ["eslint:recommended"] // 启用 ESLint 推荐规则
  },
  // 2. CSS 文件配置（保留你选择的 CSS 支持）
  {
    files: ["**/*.css"],
    plugins: { css },
    language: "css/css",
    rules: {
      // 可选：添加 CSS 规则（比如禁止空规则集）
      "css/no-empty-rule-set": "warn"
    }
  },
  // 3. HTML 文件配置（解析 HTML 中的 JS 代码）
  {
    files: ["**/*.html"],
    plugins: { html: htmlPlugin },
    processor: "html/html" // 启用 HTML 处理器，解析 HTML 中的 <script> 标签
  }
]);