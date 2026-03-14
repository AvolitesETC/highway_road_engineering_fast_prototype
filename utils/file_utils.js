/**
 * utils/file_utils.js
 * 文件处理工具类：包含时间戳命名、自适应智能水印
 * v2.3 修正版 - 解决水印比例和背景自适应问题
 */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// 1. 生成时间戳文件名 (保持不变)
function generateTimestampName(originalName) {
    const now = new Date();
    const YYYY = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const DD = String(now.getDate()).padStart(2, '0');
    const HH = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const SSS = String(now.getMilliseconds()).padStart(3, '0');
    const random = Math.floor(Math.random() * 1000);
    const ext = path.extname(originalName);
    return `${YYYY}${MM}${DD}${HH}${mm}${ss}${SSS}_${random}${ext}`;
}

// 辅助：计算字符串的视觉宽度系数 (中文算1，非中文算0.6)
function getTextWidthFactor(text) {
    let width = 0;
    for (let i = 0; i < text.length; i++) {
        if (text.charCodeAt(i) > 255) width += 1;
        else width += 0.6;
    }
    return width;
}

// 2. 添加自适应水印
async function addWatermark(inputPath, outputPath, text) {
    try {
        // [新增] 第一步：读取原图元数据，获取分辨率
        const metadata = await sharp(inputPath).metadata();
        const imgWidth = metadata.width;
        
        // [新增] 第二步：动态计算样式参数
        let fontSize = Math.floor(imgWidth * 0.03); 
        if (fontSize < 14) fontSize = 14;

        // 计算文字的大致宽度
        const textFactor = getTextWidthFactor(text);
        const textWidthApprox = Math.floor(textFactor * fontSize);
        
        // 背景框宽度 = 文字宽 + 左右内边距 (各 0.5 个字宽)
        const rectWidth = textWidthApprox + fontSize; 
        const rectHeight = Math.floor(fontSize * 1.6); // 高度稍微宽松点
        
        // SVG 画布总尺寸
        const svgWidth = rectWidth + 10;
        const svgHeight = rectHeight + 10;

        // [修改] 第三步：构建动态 SVG
        const svgImage = `
        <svg width="${svgWidth}" height="${svgHeight}">
            <style>
                .title { 
                    fill: white; 
                    font-size: ${fontSize}px; 
                    font-family: "Microsoft YaHei", sans-serif; 
                    font-weight: bold; 
                    dominant-baseline: middle; /* 垂直居中 */
                }
                .bg { fill: rgba(0, 0, 0, 0.6); rx: 8; ry: 8; } /* rx/ry 圆角 */
            </style>
            <!-- 动态宽度的黑背景 -->
            <rect x="0" y="0" width="${rectWidth}" height="${rectHeight}" class="bg" />
            <!-- 文字居中放置 -->
            <text x="${fontSize/2}" y="${rectHeight/2 + 2}" class="title">${text}</text>
        </svg>
        `;

        const svgBuffer = Buffer.from(svgImage);

        // [修改] 第四步：合成
        await sharp(inputPath)
            .composite([
                {
                    input: svgBuffer,
                    top: Math.floor(imgWidth * 0.04), // 距离顶部 4%
                    left: Math.floor(imgWidth * 0.03), // 距离左侧 3%
                }
            ])
            .toFile(outputPath);
            
        return true;
    } catch (error) {
        console.error("水印添加失败:", error);
        // 保底：直接复制原图
        fs.copyFileSync(inputPath, outputPath);
        return false;
    }
}

module.exports = { generateTimestampName, addWatermark };