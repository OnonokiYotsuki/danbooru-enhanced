# Danbooru Enhanced

![Danbooru Enhanced Preview](screenshots/preview.png)

> [English](./README_EN.md) | **中文**

---

## 🚀 快速安装

1. **[点击下载最新 Release 包](https://github.com/OnonokiYotsuki/danbooru-enhanced/releases/latest)** (ZIP 文件)。
2. 解压下载的文件到任意文件夹。
3. 在 Chrome 中打开 `chrome://extensions/`，并开启右上角的 **「开发者模式」**。
4. 点击 **「加载已解压的扩展程序」**，选择刚刚解压的文件夹。

---

## 功能特性

### 快捷过滤面板

在侧边栏注入完整的过滤面板，将 Danbooru 原生搜索框整合其中，无需手动输入 meta-tag：

| 分类 | 选项 | 对应标签 |
|------|------|----------|
| **🛡️ 分级 (Rating)** | G · S · Q · E（多选） | `rating:g,s` 等 |
| **📊 排序 (Sort)** | 评分 · 收藏 · 排行 · 评论 · 更新 · 随机 · 高清 · 大文件 · 最新 | `order:score` `order:favcount` `order:rank` `order:comment` `order:change` `order:random` `order:mpixels` `order:filesize` _(默认)_ |
| **⭐ 评分 / ❤️ 收藏** | 范围输入（如 `>50`、`10..100`） | `score:>50` `favcount:10..100` |
| **🕒 时间 (Time)** | 数值输入 + 单位下拉 (d/w/mo/y) | `age:<7d` · `age:>30d` · `age:1d..7d` |

高级设置（可折叠面板）：

| 分类 | 选项 | 对应标签 |
|------|------|----------|
| **🔍 过滤** | 去重 | `parent:none` |
| **📁 类型 (Type)** | 静图 · 动图 | `filetype:jpg,png` `filetype:gif,mp4,webm,zip` |
| **📐 图片 (Image)** | 横屏 · 竖屏 · 高清 | `ratio:>1` `ratio:<1` `width:>1920` |
| **📄 每页 (Limit)** | 自由输入（最大 200） | `limit:20` ~ `limit:200` |

额外功能：

- **分级多选**：Rating 按钮支持多选组合（如同时选中 G 和 S）。
- **一键搜索**：面板内置搜索按钮，拦截原生表单提交，将面板状态与用户标签合并后统一提交。
- **🔄 一键重置**：一键清空所有过滤器和标签。
- **状态持久化**：过滤器状态通过 `chrome.storage.local` 持久化，跨会话保留。
- **状态同步**：打开页面时自动解析 URL / 搜索框中已有的 metatag，同步到面板按钮状态。

### 瀑布流布局

将 Danbooru 默认的等高网格替换为紧凑的瀑布流布局：

- **等宽不同高**：每张图片宽度一致，高度按原始比例完整显示，不裁切。
- **高清预览**：通过 Danbooru API 批量获取 sample 尺寸图片（~850px），替代模糊的 180px 缩略图。
- **渐进式加载**：先显示缩略图，sample 图加载完成后无缝替换。
- **偏好持久化**：布局选择保存在 `localStorage`，下次访问自动生效。
- **性能优化**：采用读写分离策略避免强制回流，通过 `requestAnimationFrame` 批量写入，`transform` GPU 加速定位，防抖合并高频布局请求。

### 站点界面翻译

将 Danbooru 原生英文界面元素翻译为用户语言（中文 / 日文 / 俄文）：

- **覆盖范围**：顶部导航栏、侧边栏标题、帖子详情标签、Site Map 等。
- **智能保留**：搜索标签保持英文不翻译，确保搜索功能正常。
- **一键切换**：面板内提供翻译开关，开启/关闭后自动刷新页面。
- **英文环境自动隐藏**：当浏览器语言为英语时，翻译按钮不显示。

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

点击 **「高级设置」** 展开更多过滤选项（去重、文件类型、图片属性、每页数量、瀑布流、界面翻译）。

### 瀑布流

在高级设置面板中点击「瀑布流」旁的开关按钮开启。关闭时页面会自动刷新以恢复默认布局。

### 站点翻译

在高级设置面板中点击「界面翻译」旁的按钮开启。开启后页面刷新，Danbooru 原生 UI 元素将被翻译为当前浏览器语言。

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
├── translator.js       # 站点 UI 翻译引擎
├── content.css         # 样式：面板 UI + 瀑布流布局
├── package.bat         # 打包发布脚本
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
| **权限** | `activeTab` + `storage` |
| **依赖** | 无（纯原生 JS/CSS） |
| **瀑布流实现** | JS 绝对定位 + `transform` GPU 加速 + `requestAnimationFrame` 批量渲染 |
| **API 调用** | Danbooru JSON API（`/posts.json?tags=id:1,2,3`），并发批量请求 |
| **多语言** | Chrome `_locales`（中 / 英 / 日 / 俄） |
| **状态管理** | `chrome.storage.local` 持久化过滤状态，搜索时合并写入搜索框 |
| **DOM 监听** | MutationObserver 防抖检测，自动注入 UI 和恢复瀑布流 |
| **站点翻译** | `translator.js` 遍历导航/标题/元信息的文本节点，按映射表替换 |

---

## 许可协议

[MIT](LICENSE)
