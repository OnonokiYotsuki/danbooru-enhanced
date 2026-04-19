# Danbooru Enhanced

> **English** | [中文](./README.md)

A Chrome extension that enhances [Danbooru](https://danbooru.donmai.us/) with a comprehensive filter panel and a Pinterest-style masonry layout.

---

## Features

### Quick Filter Panel

Injects a full-featured filter panel into the sidebar, integrating the native search box — no need to manually type meta-tags:

| Category | Options | Tags |
|----------|---------|------|
| **🛡️ Rating** | SFW · NSFW · G · S · Q · E | `rating:g,s` `rating:q,e` `rating:g` `rating:s` `rating:q` `rating:e` |
| **📊 Sort** | Score · Favs · Rank · Comment · Change · Random · Mpixels · Filesize · Latest | `order:score` `order:favcount` `order:rank` `order:comment` `order:change` `order:random` `order:mpixels` `order:filesize` _(default)_ |
| **🕒 Time** | Input + Unit Dropdown (d/w/mo/y) | `7` (auto-completes to `<7d`) · `>30d` · `1d..7d` |
| **📁 Type** | Static · Animated | `filetype:jpg,png` `filetype:gif,mp4,webm,zip` |
| **📐 Image** | Landscape · Portrait · HD | `ratio:>1` `ratio:<1` `width:>1920` |
| **📄 Limit** | 20 · 40 · 100 · 200 | `limit:20` ~ `limit:200` |

Additional features:

- **SFW / NSFW Presets**: Toggle safe / explicit content filtering with one click.
- **Multi-Select Ratings**: Rating buttons support combination selection (e.g. G + S simultaneously).
- **⭐ Score / ❤️ Favorites Range**: Input range expressions (e.g. `>50`, `10..100`) to precisely filter high-quality content.
- **Integrated Search**: Built-in search button intercepts native form submission, merging panel state with user-typed tags.
- **🔄 Reset All**: Clear all filters and tags with one click.
- **State Sync**: On page load, existing meta-tags in the search box are automatically parsed and reflected in panel button states.

### Masonry Layout

Replaces Danbooru's default fixed-height grid with a compact masonry layout:

- **Aspect Ratio Preservation**: Images share the same width but different heights, showing the full image without cropping.
- **HD Previews**: Batch-fetches "sample" size images (~850px) via the Danbooru API to replace blurry 180px thumbnails.
- **Progressive Loading**: Displays thumbnails first and seamlessly replaces them once the sample image finishes loading.
- **Persistence**: Layout preference is saved in `localStorage` and applied automatically on your next visit.
- **Performance Optimized**: Uses read-write separation to avoid forced reflows, batches DOM writes via `requestAnimationFrame`, GPU-accelerated positioning with `transform`, and debounced layout updates.

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

### Masonry Layout

Click the "Masonry" button at the bottom of the sidebar panel to enable it. The page will automatically refresh to restore the default layout when disabled.

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
├── content.css         # Styles: Panel UI + Masonry layout
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
| **Permissions** | `activeTab` only |
| **Dependencies** | None (Pure JS/CSS) |
| **Masonry** | JS absolute positioning + `transform` GPU acceleration + `requestAnimationFrame` batch rendering |
| **API** | Danbooru JSON API (`/posts.json?tags=id:1,2,3`), concurrent batch requests |
| **i18n** | Chrome `_locales` (EN / ZH / JA / RU) |
| **State Management** | Internal filterState, merged into search box only on submission |
| **DOM Monitoring** | Debounced MutationObserver for auto UI injection and masonry recovery |

---

## License

[MIT](LICENSE)
