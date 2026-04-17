# iOS Photo Migration Classification System

[![Built with Google AI Studio](https://img.shields.io/badge/Built%20with-Google%20AI%20Studio-blue)](https://ai.studio/build)

Do you have a massive iOS photo library? Worried about data loss and want to back it up locally? Or planning to switch to an Android phone and concerned about format issues?

This is an automated system designed specifically for organizing photos and videos after exporting them from iOS devices (iPhone/iPad) to a local computer. It helps you quickly classify, deduplicate, rename, and extract files in specific formats, thoroughly solving the mess after photo backups.

Simply copy all images from your phone to your computer, then download your organized albums via iCloud, and you can quickly achieve photo archiving.

This project was built with the assistance of **Google AI Studio** and fully complies with open-source regulations.

---

## Core Features

1. **Deduplication**: Intelligently compares files across different directories, supporting comparison by "filename" or "file hash (SHA-256)", and safely removes redundant copies.
2. **Clean AAE Files**: One-click removal of iOS-specific `.AAE` modification record files to keep directories clean.
3. **Extract Specific Formats**: Extract and consolidate files from deep subdirectories to a specified folder by extension (e.g., .mov, .mp4, .heic, etc.).
4. **Batch Rename**: Reads photo metadata (capture date) and batch renames files and folders according to rules like "YYYYMMDD_sequence".
5. **All in One Consolidation**: Gathers files scattered across various yearly/monthly subdirectories into a single directory, automatically handling naming conflicts.
6. **Edited Photo Extraction**: Automatically identifies and extracts iOS-edited photos with the `IMG_E*` prefix.

---

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS 4
- **Backend**: Node.js, Express
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **AI Support**: Google Gemini API (for potential future intelligent classification extensions)

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm or yarn

### Local Setup

1. **Clone or download the project**, then navigate to the project root directory.
2. **Install dependencies**:
    ```bash
    npm install
    ```
3. **Start the application**:
    ```bash
    npm run dev
    ```
4. **Access the application**: Open your browser and visit `http://localhost:3000`.

---

## Deployment Guide

### Web Deployment

This project is compatible with standard web deployment workflows.

1. **Build for production**:
    ```bash
    npm run build
    ```
    The built static files will be generated in the `dist` directory.

2. **Start the production server**:
    Make sure the environment variable `NODE_ENV=production` is set, then run:
    ```bash
    npm start
    ```
    Or use `node server.ts` directly (the system will automatically detect the production environment and serve static assets from the `dist` directory).

### Environment Variables

Create a `.env` file in the root directory (or refer to `.env.example`):
- `GEMINI_API_KEY`: Your Google Gemini API key.
- `NODE_ENV`: Set to `production` for formal deployment.

---

## Open Source Statement

This project fully adheres to the spirit of open source. You are free to use, modify, and distribute this project.

**Statement**: This project was generated with the assistance of an AI tool on the Google AI Studio platform.

---
*For more details, please refer to the project metadata `metadata.json`.*

---

---

# iOS 照片迁移分类系统

[![Built with Google AI Studio](https://img.shields.io/badge/Built%20with-Google%20AI%20Studio-blue)](https://ai.studio/build)

你是否拥有一个超大的IOS相册？担心数据流失想保存到本地？或者想换安卓手机担心格式会乱？

这是一个专门为从 iOS 设备（iPhone/iPad）导出照片和视频到本地电脑后的整理工作而设计的自动化系统。它可以帮助您快速分类、去重、重命名并提取特定格式的文件，彻底解决照片备份后的乱象。

只需要直接从手机中拷贝所以图片到本地，再通过iCloud下载你归类好的相簿，就可以快速实现照片归档处理。

本项目由 **Google AI Studio** 协助制作，完全遵守开源规定。

---

## 核心功能

1. **去重整理**：智能比对不同目录下的文件，支持根据"文件名"或"文件哈希 (SHA-256)"进行比对，安全删除冗余副本。
2. **清理 AAE 文件**：一键清除 iOS 特有的 `.AAE` 修改记录文件，保持目录清爽。
3. **提取特定格式**：通过后缀名（如 .mov, .mp4, .heic 等）将文件从深层子目录中提取并汇总到指定文件夹。
4. **批量重命名**：读取照片元数据（拍摄日期），按"年月日_序号"等规则批量修改文件名及文件夹名。
5. **整合 All in One**：将分散在各个年月子目录中的文件全部汇总到一个单一目录，自动处理重名冲突。
6. **子项去除 (Edited 提取)**：自动识别并提取 iOS 编辑后生成的 `IMG_E*` 开头的照片。

---

## 技术栈

- **前端**: React 19, Vite, Tailwind CSS 4
- **后端**: Node.js, Express
- **动画**: Framer Motion
- **图标**: Lucide React
- **AI 支持**: Google Gemini API (用于后续可能的智能分类扩展)

---

## 快速开始

### 环境依赖

- [Node.js](https://nodejs.org/) (建议 v18 或更高版本)
- npm 或 yarn

### 本地运行

1. **克隆或下载项目**后，进入项目根目录。
2. **安装依赖**:
    ```bash
    npm install
    ```
3. **启动应用**:
    ```bash
    npm run dev
    ```
4. **访问应用**: 打开浏览器访问 `http://localhost:3000`。

---

## 部署指南

### 在 Web 环境部署

本项目已适配标准的 Web 部署流程。

1. **构建生产版本**:
    ```bash
    npm run build
    ```
    构建后的静态文件将生成在 `dist` 目录中。

2. **启动生产环境服务**:
    确保环境变量 `NODE_ENV=production` 已设置，然后运行：
    ```bash
    npm start
    ```
    或者直接使用 `node server.ts`（系统会自动识别生产环境并处理 `dist` 目录下的静态资源）。

### 环境变量配置

在根目录创建 `.env` 文件（或参考 `.env.example`）：
- `GEMINI_API_KEY`: 您的 Google Gemini API 密钥。
- `NODE_ENV`: 设置为 `production` 进行正式部署。

---

## 开源声明

本项目完全遵循开源精神。您可以自由地使用、修改和分发本项目。

**声明**：本项目由人工智能助手在 Google AI Studio 平台协助生成。

---
*更多详细信息请参考项目元数据 `metadata.json`。*
