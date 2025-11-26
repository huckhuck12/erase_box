# EraseBox

**EraseBox** 是一个像素风格的解谜平台游戏。玩家需要帮助小机器人通过放置表情方块来搭建道路，利用物理引擎的特性跨越障碍，最终收集所有金币并抵达宝箱。游戏独特的机制在于“消除”——当四个方块在横向或纵向连成一线时，它们会消失，这既是解谜的关键，也是清理路障的手段。

![Game Screenshot](https://via.placeholder.com/600x400?text=EraseBox+Screenshot)

## 🎮 游戏特色

*   **复古像素风**: 采用 2.5D 视角的像素艺术风格，配合 VT323 字体，营造怀旧氛围。
*   **物理平台跳跃**: 基于 `matter.js` 的物理引擎，提供精准的跳跃手感和物体交互。
*   **独特建造/消除机制**:
    *   **建造**: 点击屏幕在空中放置静态方块，搭建通往高处的阶梯。
    *   **消除**: 类似三消游戏（这里是四消），横竖连成4个方块即可触发消除特效，用于破坏墙壁或回收方块。
*   **多端适配**: 完美支持桌面端（键盘+鼠标）和移动端（虚拟摇杆+触摸）。
*   **AI 互动**: 集成 Google Gemini API，在通关时生成机智幽默的鼓励语。
*   **音频体验**: 内置 Web Audio API 合成的 8-bit 背景音乐和音效。

## 🕹️ 操作指南

### 桌面端
*   **移动**: `A` / `D` 或 `←` / `→`
*   **跳跃**: `W` / `↑` / `空格键`
*   **放置方块**: 鼠标点击目标位置
*   **暂停**: `ESC` 键

### 移动端
*   **移动**: 屏幕左侧虚拟摇杆
*   **跳跃**: 屏幕右侧 JUMP 按钮
*   **放置方块**: 直接点击屏幕目标位置

## 🛠️ 技术栈

*   **前端框架**: [React 19](https://react.dev/)
*   **语言**: TypeScript
*   **物理引擎**: [Matter.js](https://brm.io/matter-js/)
*   **样式**: [Tailwind CSS](https://tailwindcss.com/)
*   **AI 服务**: [Google Gemini API](https://ai.google.dev/) (@google/genai)
*   **构建工具**: Vite

## 🌐 在线体验

🎮 **[立即游玩](https://huckhuck12.github.io/erase_box/)** - 无需安装，打开即玩！

## 🚀 快速开始

### 本地开发

1.  **克隆项目**
    ```bash
    git clone https://github.com/huckhuck12/erase_box.git
    cd erase_box
    ```

2.  **安装依赖**
    ```bash
    npm install
    ```

3.  **配置环境变量**
    在项目根目录创建 `.env` 文件（可选，用于 AI 功能）：
    ```env
    GEMINI_API_KEY=your_google_gemini_api_key
    ```

4.  **启动开发服务器**
    ```bash
    npm run dev
    ```
    访问 `http://localhost:3000` 开始游戏

5.  **构建生产版本**
    ```bash
    npm run build
    ```

### 部署说明

本项目已配置 GitHub Actions 自动部署流程。每次推送到 `main` 分支时，会自动：
- ✅ 安装依赖
- ✅ 构建项目
- ✅ 部署到 GitHub Pages

**配置步骤**：
1. 在仓库设置中启用 GitHub Pages（Source 选择 GitHub Actions）
2. 添加 Repository Secret：`GEMINI_API_KEY`（可选，用于 AI 功能）
3. 推送代码后在 Actions 页面查看部署状态

## 🧩 关卡设计

目前包含 10 个精心设计的关卡，难度循序渐进：
1.  **初出茅庐**: 基础移动与跳跃。
2.  **步步高升**: 学习搭建楼梯。
3.  **消除高墙**: 引入四连消除机制。
4.  ... 以及更多挑战！

## 📄 License

MIT License
