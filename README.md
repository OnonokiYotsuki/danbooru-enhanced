# Danbooru Enhanced

> A Chrome extension that enhances [Danbooru](https://danbooru.donmai.us/) with quick filters and a Pinterest-style masonry layout.

一个增强 [Danbooru](https://danbooru.donmai.us/) 浏览体验的 Chrome 扩展，提供快捷过滤按钮和瀑布流布局。

---

## Features / 功能

### Quick Filters / 快捷过滤

在侧边栏注入一组一键过滤按钮，无需手动输入 meta-tag：

| 分类 | 选项 | 对应标签 |
|------|------|----------|
| **Rating / 分级** | G · S · Q · E | `rating:g` `rating:s` `rating:q` `rating:e` |
| **Sort / 排序** | 评分 · 收藏 · 排行 · 最新 | `order:score` `order:favcount` `order:rank` _(default)_ |
| **Time / 时间** | 今日 · 本周 · 本月 | `age:<1d` `age:<1w` `age:<1mo` |

- 点击按钮切换过滤条件，再次点击取消
- 一键重置所有过滤器
- 按钮状态与搜索框实时同步

### Masonry Layout / 瀑布流布局

将 Danbooru 默认的等高网格替换为紧凑的瀑布流布局：

- **等宽不同高** — 每张图片宽度一致，高度按原始比例完整显示，不裁切
- **高清预览** — 通过 Danbooru API 获取 sample 尺寸图片（~850px），替代模糊的 180px 缩略图
- **渐进式加载** — 先显示缩略图，sample 图加载完成后无缝替换
- **偏好持久化** — 布局选择保存在 `localStorage`，下次访问自动生效

### Theme Support / 主题适配

完全适配 Danbooru 的浅色和深色主题，所有颜色使用 Danbooru 原生 CSS 变量（`--link-color`、`--default-border-color` 等），跟随系统主题自动切换。

---

## Install / 安装

### From source / 从源码安装

1. Clone 本仓库：

   ```bash
   git clone https://github.com/<your-username>/danbooru-enhanced.git
   ```

2. 打开 Chrome，进入 `chrome://extensions/`

3. 开启右上角 **开发者模式**

4. 点击 **加载已解压的扩展程序**，选择项目目录

5. 访问 [danbooru.donmai.us](https://danbooru.donmai.us/)，侧边栏会出现过滤面板

---

## Usage / 使用

### Quick Filters / 快捷过滤

过滤面板自动注入到 Danbooru 侧边栏搜索框下方。点击按钮会修改搜索框中的 tag，**需要手动按 Enter 或点击搜索按钮执行搜索**。

### Masonry Layout / 瀑布流

点击侧边栏「瀑布流」按钮开启。关闭时页面会自动刷新以恢复默认布局。

---

## Project Structure / 项目结构

```
danbooru-enhanced/
├── manifest.json   # Chrome Extension Manifest V3
├── content.js      # 核心逻辑：过滤器 + 瀑布流
├── content.css     # 样式：按钮 + 瀑布流布局
├── .gitignore
└── README.md
```

- **manifest.json** — Manifest V3 配置，仅请求 `activeTab` 权限，仅在 `danbooru.donmai.us` 上运行
- **content.js** — Content Script，包含过滤器 UI 注入、tag 解析、瀑布流布局、API 调用
- **content.css** — 全部使用 Danbooru CSS 变量，适配浅色/深色主题

---

## Technical Details / 技术细节

| 项目 | 说明 |
|------|------|
| Manifest | V3 |
| 权限 | `activeTab` only |
| 依赖 | 无（纯原生 JS/CSS） |
| 瀑布流实现 | CSS `column-width` + JS class 操作 |
| 高清图获取 | Danbooru JSON API (`/posts.json?tags=id:1,2,3`) → `large_file_url` |
| 图片加载策略 | `new Image()` 预加载，完成后移除 `<source>` 替换 `<img src>` |
| 主题适配 | 使用 Danbooru CSS 变量（`--link-color`、`--card-background-color` 等） |
| SPA 兼容 | `MutationObserver` 监听 DOM 变化，自动重新注入 UI |

---

## Browser Support / 浏览器支持

- Chrome / Chromium 系浏览器（Edge、Brave、Arc 等）
- 需要 Manifest V3 支持

---

## License / 许可

[MIT](LICENSE)
