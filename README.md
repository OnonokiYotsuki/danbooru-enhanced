# Danbooru Enhanced

![Danbooru Enhanced Preview](screenshots/preview.png)

> [English](./README_EN.md) | **中文**

一个增强 [Danbooru](https://danbooru.donmai.us/) 浏览体验的 Chrome 扩展，提供丰富的快捷过滤面板和瀑布流布局。

---

## 功能特性

### 快捷过滤面板

在侧边栏注入完整的过滤面板，将 Danbooru 原生搜索框整合其中，无需手动输入 meta-tag：

| 分类 | 选项 | 对应标签 |
|------|------|----------|
| **🛡️ 分级 (Rating)** | SFW · NSFW · G · S · Q · E | `rating:g,s` `rating:q,e` `rating:g` `rating:s` `rating:q` `rating:e` |
| **📊 排序 (Sort)** | 评分 · 收藏 · 排行 · 评论 · 更新 · 随机 · 高清 · 大文件 · 最新 | `order:score` `order:favcount` `order:rank` `order:comment` `order:change` `order:random` `order:mpixels` `order:filesize` _(默认)_ |
| **🕒 时间 (Time)** | 数值输入 + 单位下拉 (天/周/月/年) | `7` (自动补全为 `<7d`) · `>30d` · `1d..7d` |
| **📁 类型 (Type)** | 静图 · 动图 | `filetype:jpg,png` `filetype:gif,mp4,webm,zip` |
| **📐 图片 (Image)** | 横屏 · 竖屏 · 高清 | `ratio:>1` `ratio:<1` `width:>1920` |
| **📄 每页 (Limit)** | 20 · 40 · 100 · 200 | `limit:20` ~ `limit:200` |

额外功能：

- **SFW / NSFW 快捷预设**：一键切换安全/非安全内容过滤。
- **分级多选**：Rating 按钮支持多选组合（如同时选中 G 和 S）。
- **⭐ 评分 / ❤️ 收藏范围**：支持输入范围表达式（如 `>50`、`10..100`），精确筛选高质量内容。
- **一键搜索**：面板内置搜索按钮，拦截原生表单提交，将面板状态与用户标签合并后统一提交。
- **🔄 一键重置**：一键清空所有过滤器和标签。
- **状态同步**：打开页面时自动解析搜索框中已有的 metatag，同步到面板按钮状态。

### 瀑布流布局

将 Danbooru 默认的等高网格替换为紧凑的瀑布流布局：

- **等宽不同高**：每张图片宽度一致，高度按原始比例完整显示，不裁切。
- **高清预览**：通过 Danbooru API 批量获取 sample 尺寸图片（~850px），替代模糊的 180px 缩略图。
- **渐进式加载**：先显示缩略图，sample 图加载完成后无缝替换。
- **偏好持久化**：布局选择保存在 `localStorage`，下次访问自动生效。
- **性能优化**：采用读写分离策略避免强制回流，通过 `requestAnimationFrame` 批量写入，`transform` GPU 加速定位，防抖合并高频布局请求。

### 主题适配

完全适配 Danbooru 的浅色和深色主题，所有颜色使用 Danbooru 原生 CSS 变量（`--link-color`、`--default-border-color` 等），跟随系统主题自动切换。

---

## 安装说明

### 从源码安装

1. **Clone 本仓库**：
   ```bash
   git clone https://github.com/OnonokiYotsuki/danbooru-enhanced.git
   ```
2. **打开扩展程序**：打开 Chrome，进入 `chrome://extensions/`。
3. **开启开发者模式**：开启右上角开发者模式。
4. **加载已解压的扩展**：点击"加载已解压的扩展程序"，选择项目目录。
5. **访问 Danbooru**：侧边栏会出现过滤面板。

---

## 使用指南

### 快捷过滤

过滤面板自动注入到侧边栏顶部，原生搜索框被整合到面板内。选择过滤条件后，点击面板内的 **「搜索」** 按钮（或按 Enter）即可执行搜索。面板会自动合并你手动输入的标签与面板选择的 metatag。

### 瀑布流

点击侧边栏面板底部的「瀑布流」按钮开启。关闭时页面会自动刷新以恢复默认布局。

---

## 项目结构

```
danbooru-enhanced/
├── _locales/           # 国际化多语言 (中/英/日/俄)
│   ├── zh_CN/          # 简体中文
│   ├── en/             # English
│   ├── ja/             # 日本語
│   ├── ru/             # Русский
│   └── icon.png        # 扩展图标
├── manifest.json       # Chrome Extension Manifest V3
├── content.js          # 核心逻辑：过滤面板 + 瀑布流引擎
├── content.css         # 样式：面板 UI + 瀑布流布局
├── PRIVACY.md          # 隐私政策
├── README.md           # 中文文档
├── README_EN.md        # English Documentation
├── .gitignore
└── LICENSE
```

---

## 技术细节

| 项目 | 说明 |
|------|------|
| **Manifest** | V3 |
| **权限** | 仅 `activeTab` |
| **依赖** | 无（纯原生 JS/CSS） |
| **瀑布流实现** | JS 绝对定位 + `transform` GPU 加速 + `requestAnimationFrame` 批量渲染 |
| **API 调用** | Danbooru JSON API（`/posts.json?tags=id:1,2,3`），并发批量请求 |
| **多语言** | Chrome `_locales`（中 / 英 / 日 / 俄） |
| **状态管理** | 面板内部维护 filterState，搜索时才合并写入搜索框 |
| **DOM 监听** | MutationObserver 防抖检测，自动注入 UI 和恢复瀑布流 |

---

## 许可协议

[MIT](LICENSE)
