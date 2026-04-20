# Danbooru Enhanced

![Danbooru Enhanced Preview](screenshots/preview.png)

> **English** | [中文](./README.md)

---

## 🚀 Quick Install

1. **[Click here to download the latest Release](https://github.com/OnonokiYotsuki/danbooru-enhanced/releases/latest)** (ZIP file).
2. Extract the downloaded ZIP to any folder.
3. Open `chrome://extensions/` in Chrome and enable **"Developer mode"** (top right).
4. Click **"Load unpacked"** and select the extracted folder.

---

## Features

### Quick Filter Panel

Injects a full-featured filter panel into the sidebar, integrating the native search box — no need to manually type meta-tags:

| Category | Options | Tags |
|----------|---------|------|
| **🛡️ Rating** | G · S · Q · E (multi-select) | `rating:g,s` etc. |
| **📊 Sort** | Score · Favs · Rank · Comment · Change · Random · Mpixels · Filesize · Latest | `order:score` `order:favcount` `order:rank` `order:comment` `order:change` `order:random` `order:mpixels` `order:filesize` _(default)_ |
| **⭐ Score / ❤️ Favorites** | Range input (e.g. `>50`, `10..100`) | `score:>50` `favcount:10..100` |
| **🕒 Time** | Input + Unit Dropdown (d/w/mo/y) | `age:<7d` · `age:>30d` · `age:1d..7d` |

Advanced settings (collapsible panel):

| Category | Options | Tags |
|----------|---------|------|
| **🔍 Filter** | Dedup | `parent:none` |
| **📁 Type** | Static · Animated | `filetype:jpg,png` `filetype:gif,mp4,webm,zip` |
| **📐 Image** | Landscape · Portrait · HD | `ratio:>1` `ratio:<1` `width:>1920` |
| **📄 Limit** | Free input (max 200) | `limit:20` ~ `limit:200` |

Additional features:

- **Multi-Select Ratings**: Rating buttons support combination selection (e.g. G + S simultaneously).
- **Integrated Search**: Built-in search button intercepts native form submission, merging panel state with user-typed tags.
- **🔄 Reset All**: Clear all filters and tags with one click.
- **State Persistence**: Filter state is persisted via `chrome.storage.local`, surviving across sessions.
- **State Sync**: On page load, existing meta-tags in the URL / search box are automatically parsed and reflected in panel button states.

### Masonry Layout

Replaces Danbooru's default fixed-height grid with a compact masonry layout:

- **Aspect Ratio Preservation**: Images share the same width but different heights, showing the full image without cropping.
- **HD Previews**: Batch-fetches "sample" size images (~850px) via the Danbooru API to replace blurry 180px thumbnails.
- **Progressive Loading**: Displays thumbnails first and seamlessly replaces them once the sample image finishes loading.
- **Persistence**: Layout preference is saved in `localStorage` and applied automatically on your next visit.
- **Performance Optimized**: Uses read-write separation to avoid forced reflows, batches DOM writes via `requestAnimationFrame`, GPU-accelerated positioning with `transform`, and debounced layout updates.

### Site UI Translation

Translates native Danbooru English UI elements into the user's language (Chinese / Japanese / Russian):

- **Coverage**: Top navigation bar, sidebar headings, post info labels, Site Map, and more.
- **Smart Preservation**: Search tags remain untranslated to ensure search functionality works correctly.
- **One-Click Toggle**: A translation switch is provided in the panel; toggling it automatically refreshes the page.
- **Auto-Hidden for English**: The translation button is hidden when the browser language is English.

### Theme Support

Fully compatible with Danbooru's light and dark themes. Uses native CSS variables (`--link-color`, `--default-border-color`, etc.) to follow system theme automatically.

---

## Install

### From Source

1. **Clone the repository**:
   ```bash
   git clone https://github.com/OnonokiYotsuki/danbooru-enhanced.git
   ```
2. **Open Chrome Extensions**: Go to `chrome://extensions/`.
3. **Enable Developer Mode**: Toggle the switch in the top right.
4. **Load Unpacked**: Click "Load unpacked" and select the project directory.
5. **Visit Danbooru**: The filter panel will appear in the sidebar.

---

## Usage

### Quick Filters

The filter panel is automatically injected at the top of the sidebar, with the native search box integrated inside. After selecting filter conditions, click the **"Search"** button in the panel (or press Enter) to execute. The panel automatically merges your manually typed tags with the selected meta-tags.

Click **"Advanced Settings"** to expand additional filtering options (Dedup, file type, image attributes, per-page limit, masonry layout, UI translation).

### Masonry Layout

Click the toggle button next to "Masonry" in the advanced settings panel to enable it. The page will automatically refresh to restore the default layout when disabled.

### Site Translation

Click the button next to "UI Translation" in the advanced settings panel to enable it. After enabling, the page refreshes and native Danbooru UI elements are translated into the current browser language.

---

## Project Structure

```
danbooru-enhanced/
├── _locales/           # Internationalization (i18n)
│   ├── zh_CN/          # 简体中文
│   ├── en/             # English
│   ├── ja/             # 日本語
│   ├── ru/             # Русский
│   └── icon.png        # Extension icon
├── manifest.json       # Chrome Extension Manifest V3
├── content.js          # Core logic: Filter panel + Masonry engine
├── translator.js       # Site UI translation engine
├── content.css         # Styles: Panel UI + Masonry layout
├── package.bat         # Release packaging script
├── PRIVACY.md          # Privacy Policy
├── README.md           # 中文文档
├── README_EN.md        # English Documentation
├── .gitignore
└── LICENSE
```

---

## Technical Details

| Item | Description |
|------|-------------|
| **Manifest** | V3 |
| **Permissions** | `activeTab` + `storage` |
| **Dependencies** | None (Pure JS/CSS) |
| **Masonry** | JS absolute positioning + `transform` GPU acceleration + `requestAnimationFrame` batch rendering |
| **API** | Danbooru JSON API (`/posts.json?tags=id:1,2,3`), concurrent batch requests |
| **i18n** | Chrome `_locales` (EN / ZH / JA / RU) |
| **State Management** | `chrome.storage.local` for filter state persistence, merged into search box only on submission |
| **DOM Monitoring** | Debounced MutationObserver for auto UI injection and masonry recovery |
| **Site Translation** | `translator.js` walks text nodes of nav/headings/post-info, replaces via mapping table |

---

## License

[MIT](LICENSE)
