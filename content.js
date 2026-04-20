/**
 * Danbooru Quick Filter Extension - v1.0.0
 * 增强版：支持更多分级、多种排序、时间范围过滤和瀑布流布局。
 */

(function() {
    'use strict';

    const CONFIG = {
        selectors: {
            sidebar: '#sidebar',
            searchBox: '#search-box',
            tagInput: '#tags',
            searchForm: '#search-box form',
            postGallery: '.post-gallery',
            postsContainer: '.posts-container',
            postPreview: 'article.post-preview',
            postPreviewImage: 'img.post-preview-image'
        },
        masonry: {
            storageKey: 'danbooru-qf-masonry-enabled',
            columnWidth: 200,  // 每列宽度 (px)
            gap: 6             // 列间距 (px)
        },
        filterStateKey: 'danbooru-qf-filter-state'
    };

    /**
     * 复合过滤器：某些按钮需要同时操作多个 metatag
     * 返回 updates 对象，供 applyFilter 使用
     */
    const COMPOSITE_FILTERS = {
        // 文件类型：静图 = filetype:jpg,png ; 动图 = filetype:gif,mp4,webm,zip
        'filetype_static': { filetype: 'jpg,png' },
        'filetype_animated': { filetype: 'gif,mp4,webm,zip' },
        // 图片方向：横屏 = ratio:>1 ; 竖屏 = ratio:<1
        'ratio_landscape': { ratio: '>1' },
        'ratio_portrait': { ratio: '<1' },
        // 高清：width:>1920
        'ratio_hd': { width: '>1920' },
    };

    // 面板内部过滤器状态（不实时写入搜索框，点搜索时才生效）
    let filterState = {
        rating: null, order: null, age: null,
        filetype: null, score: null, favcount: null,
        ratio: null, width: null, limit: null, parent: null
    };

    /** 将 filterState 持久化到 chrome.storage.local */
    function saveFilterState() {
        try {
            chrome.storage.local.set({ [CONFIG.filterStateKey]: filterState });
        } catch (e) {
            // fallback: 忽略存储错误
        }
    }

    /** 从 chrome.storage.local 恢复 filterState（异步），完成后回调 */
    function loadFilterState(callback) {
        try {
            chrome.storage.local.get(CONFIG.filterStateKey, (result) => {
                const saved = result[CONFIG.filterStateKey];
                if (saved && typeof saved === 'object') {
                    for (const key in filterState) {
                        if (key in saved && saved[key] !== undefined) {
                            filterState[key] = saved[key];
                        }
                    }
                }
                if (callback) callback();
            });
        } catch (e) {
            if (callback) callback();
        }
    }

    /** 从搜索框当前内容初始化面板状态 */
    function initFilterState() {
        const input = document.querySelector(CONFIG.selectors.tagInput);
        if (!input) return;
        const parsed = getActiveState(input.value);
        for (const key in filterState) {
            filterState[key] = parsed[key] || null;
        }
        // 从搜索框中移除面板管理的 metatag，只保留用户手写的普通标签
        const managedKeys = Object.keys(filterState);
        const plainTags = input.value.split(/\s+/).filter(t => {
            if (!t.trim()) return false;
            return !managedKeys.some(k => t.toLowerCase().startsWith(k + ':'));
        });
        input.value = plainTags.join(' ');
    }

    /** 更新面板内部状态并刷新按钮 UI */
    function applyFilter(updates) {
        for (const key in updates) {
            const val = updates[key];
            if (key === 'rating' && val !== null) {
                // 多选切换
                let ratings = filterState.rating ? filterState.rating.split(',').filter(Boolean) : [];
                if (ratings.includes(val)) {
                    ratings = ratings.filter(r => r !== val);
                } else {
                    ratings.push(val);
                }
                const order = ['g', 's', 'q', 'e'];
                ratings.sort((a, b) => order.indexOf(a) - order.indexOf(b));
                filterState.rating = ratings.length > 0 ? ratings.join(',') : null;
            } else {
                filterState[key] = val || null;
            }
        }
        saveFilterState();
        updateButtonStates();
    }

    /** 根据面板状态 + 搜索框中用户输入的标签，构建最终搜索字符串并提交 */
    function executeSearch() {
        const input = document.querySelector(CONFIG.selectors.tagInput);
        if (!input) return;

        // 读取评分/收藏输入框的最新值
        const scoreInput = document.querySelector('#qf-score-input');
        const favInput = document.querySelector('#qf-fav-input');
        const ageInput = document.querySelector('#qf-age-input');
        const ageUnit = document.querySelector('#qf-age-unit');
        if (scoreInput) filterState.score = scoreInput.value.trim() || null;
        if (favInput) filterState.favcount = favInput.value.trim() || null;
        if (ageInput && ageUnit) {
            let val = ageInput.value.trim();
            if (val) {
                // 处理范围格式 1..7 -> 1d..7d
                const rangeMatch = val.match(/^(\d+)\.\.(\d+)$/);
                if (rangeMatch) {
                    val = `${rangeMatch[1]}${ageUnit.value}..${rangeMatch[2]}${ageUnit.value}`;
                } else {
                    // 如果只输入了数学并选择了单位，自动补上 <
                    if (val.match(/^\d+$/)) {
                        val = '<' + val;
                    }
                    // 如果末尾没单位且不是已经包含单位的复杂格式，补上单位
                    if (!val.match(/(d|w|mo|y)$/i)) {
                        val += ageUnit.value;
                    }
                }
            }
            filterState.age = val || null;
        }

        // 保留搜索框中用户手写的普通标签（排除面板管理的 metatag）
        const managedKeys = Object.keys(filterState);
        const tags = input.value.split(/\s+/).filter(t => {
            if (!t.trim()) return false;
            return !managedKeys.some(k => t.toLowerCase().startsWith(k + ':'));
        });

        // 追加面板状态中的 metatag
        for (const key in filterState) {
            if (filterState[key]) {
                tags.push(`${key}:${filterState[key]}`);
            }
        }

        input.value = tags.join(' ');

        saveFilterState();
        const form = document.querySelector(CONFIG.selectors.searchForm);
        if (form) form.submit();
    }


    function updateButtonStates() {
        const buttons = document.querySelectorAll('.quick-filter-btn');

        buttons.forEach(btn => {
            const { type, val, composite, preset } = btn.dataset;


            // 复合过滤器按钮
            if (composite) {
                const filters = COMPOSITE_FILTERS[composite];
                if (!filters) return;
                const isActive = Object.entries(filters).every(([k, v]) => filterState[k] === v);
                btn.classList.toggle('active', isActive);
                return;
            }

            if (!type) {
                if (btn.id === 'qf-reset') return;
                if (btn.id === 'qf-advanced-toggle') return;
                return;
            }

            let isActive = false;
            const currentVal = filterState[type];

            if (type === 'order' && val === '') {
                isActive = !currentVal;
            } else if (type === 'rating' && currentVal) {
                isActive = currentVal.split(',').includes(val);
            } else {
                isActive = (currentVal === val);
            }

            btn.classList.toggle('active', isActive);
        });

        // 同步范围输入框
        const scoreInput = document.querySelector('#qf-score-input');
        const favInput = document.querySelector('#qf-fav-input');
        const ageInput = document.querySelector('#qf-age-input');
        const ageUnit = document.querySelector('#qf-age-unit');
        const limitInput = document.querySelector('#qf-limit-input');
        if (scoreInput && document.activeElement !== scoreInput) scoreInput.value = filterState.score || '';
        if (favInput && document.activeElement !== favInput) favInput.value = filterState.favcount || '';
        if (limitInput && document.activeElement !== limitInput) limitInput.value = filterState.limit || '20';
        if (ageInput && ageUnit && document.activeElement !== ageInput && document.activeElement !== ageUnit) {
            const rawAge = filterState.age || '';
            // 尝试匹配范围格式 1d..7d
            const rangeMatch = rawAge.match(/^(\d+)(d|w|mo|y)\.\.(\d+)\2$/i);
            if (rangeMatch) {
                ageInput.value = `${rangeMatch[1]}..${rangeMatch[3]}`;
                ageUnit.value = rangeMatch[2].toLowerCase();
            } else {
                const match = rawAge.match(/^(.*)(d|w|mo|y)$/i);
                if (match) {
                    let valPart = match[1];
                    // 如果是以 < 开头且后面跟的是纯数字，则去掉 < 以保持界面简洁
                    if (valPart.match(/^<\d+$/)) {
                        valPart = valPart.substring(1);
                    }
                    ageInput.value = valPart;
                    ageUnit.value = match[2].toLowerCase();
                } else {
                    ageInput.value = rawAge;
                    ageUnit.value = 'd';
                }
            }
        }
    }

    function getActiveState(tags) {
        return {
            rating: (tags.match(/\brating:([gsqe,]+)\b/i) || [])[1],
            order: (tags.match(/\border:(\w+)\b/i) || [])[1],
            age: (tags.match(/\bage:([^\s]+)/i) || [])[1],
            filetype: (tags.match(/\bfiletype:([^\s]+)/i) || [])[1],
            score: (tags.match(/\bscore:([^\s]+)/i) || [])[1],
            favcount: (tags.match(/\bfavcount:([^\s]+)/i) || [])[1],
            ratio: (tags.match(/\bratio:([^\s]+)/i) || [])[1],
            width: (tags.match(/\bwidth:([^\s]+)/i) || [])[1],
            limit: (tags.match(/\blimit:([^\s]+)/i) || [])[1],
            parent: (tags.match(/\bparent:([^\s]+)/i) || [])[1],
        };
    }

    // ========== 瀑布流布局 (Masonry Layout) ==========

    let masonryEnabled = localStorage.getItem(CONFIG.masonry.storageKey) === 'true';
    let masonryResizeTimer = null;
    let masonryLayoutTimer = null;
    let masonryLayoutRafId = null;

    // 缓存的 DOM 引用，避免每次布局都查询
    let _masonryContainer = null;
    let _masonryItems = null;

    function cacheMasonryRefs() {
        _masonryContainer = document.querySelector(CONFIG.selectors.postsContainer);
        _masonryItems = _masonryContainer
            ? _masonryContainer.querySelectorAll('.masonry-item')
            : null;
    }

    function clearMasonryCache() {
        _masonryContainer = null;
        _masonryItems = null;
    }

    /**
     * 瀑布流布局引擎（性能优化版）：
     * - 使用缓存的 DOM 引用
     * - 先批量读取所有 item 高度（避免读写交替触发强制回流）
     * - 再通过 rAF 批量写入位置
     * - 使用 transform 替代 left/top（GPU 加速，不触发回流）
     */
    function layoutMasonry() {
        const container = _masonryContainer;
        if (!container || !container.classList.contains('masonry-container')) return;

        const items = _masonryItems;
        if (!items || items.length === 0) return;

        const containerWidth = container.clientWidth;
        if (containerWidth === 0) return;

        const colWidth = CONFIG.masonry.columnWidth;
        const gap = CONFIG.masonry.gap;

        const numCols = Math.max(1, Math.floor((containerWidth + gap) / (colWidth + gap)));
        const actualColWidth = (containerWidth - (numCols - 1) * gap) / numCols;

        const colHeights = new Array(numCols).fill(0);

        // 阶段 1：批量读取（读取所有 item 高度，不写入任何样式）
        // 先统一设置宽度，然后一次性读取高度
        const len = items.length;
        const positions = new Array(len);
        const itemHeights = new Array(len);

        // 设置宽度（如果宽度没变则跳过，减少写操作）
        const widthStr = actualColWidth + 'px';
        for (let i = 0; i < len; i++) {
            if (items[i].style.width !== widthStr) {
                items[i].style.width = widthStr;
            }
        }

        // 批量读取高度
        for (let i = 0; i < len; i++) {
            itemHeights[i] = items[i].offsetHeight;
        }

        // 阶段 2：纯计算（不访问 DOM）
        for (let i = 0; i < len; i++) {
            let minCol = 0;
            let minHeight = colHeights[0];
            for (let c = 1; c < numCols; c++) {
                if (colHeights[c] < minHeight) {
                    minHeight = colHeights[c];
                    minCol = c;
                }
            }

            const left = minCol * (actualColWidth + gap);
            const top = colHeights[minCol];
            positions[i] = { left, top };
            colHeights[minCol] = top + itemHeights[i] + gap;
        }

        const totalHeight = Math.max(...colHeights);

        // 阶段 3：通过 rAF 批量写入（合并到一帧，避免多次重绘）
        if (masonryLayoutRafId) cancelAnimationFrame(masonryLayoutRafId);
        masonryLayoutRafId = requestAnimationFrame(() => {
            for (let i = 0; i < len; i++) {
                const { left, top } = positions[i];
                items[i].style.transform = `translate(${left}px, ${top}px)`;
            }
            container.style.height = totalHeight + 'px';
            masonryLayoutRafId = null;
        });
    }

    /** 防抖版布局：多次调用合并为一次（用于图片加载回调等高频场景） */
    function scheduleLayout() {
        clearTimeout(masonryLayoutTimer);
        masonryLayoutTimer = setTimeout(() => layoutMasonry(), 50);
    }

    function isMasonryEnabled() {
        return masonryEnabled;
    }

    function setMasonryEnabled(enabled) {
        masonryEnabled = enabled;
        localStorage.setItem(CONFIG.masonry.storageKey, enabled ? 'true' : 'false');
        if (enabled) {
            applyMasonryLayout();
        } else {
            removeMasonryLayout();
        }
        updateMasonryButtonState();
    }

    function updateMasonryButtonState() {
        const btn = document.querySelector('#qf-masonry-toggle');
        if (!btn) return;
        if (masonryEnabled) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }

    /**
     * 通过 Danbooru API 批量获取帖子的 sample 图片 URL（并发请求）
     * @param {string[]} postIds 帖子 ID 数组
     * @returns {Promise<Object>} { postId: largeFileUrl }
     */
    async function fetchSampleUrls(postIds) {
        if (postIds.length === 0) return {};

        const map = {};
        const batchSize = 200; // Danbooru 单次最多 200
        const batches = [];

        for (let i = 0; i < postIds.length; i += batchSize) {
            const batch = postIds.slice(i, i + batchSize);
            const tagQuery = 'id:' + batch.join(',');
            batches.push(
                fetch(`/posts.json?tags=${encodeURIComponent(tagQuery)}&limit=${batch.length}`)
                    .then(r => r.ok ? r.json() : [])
                    .catch(() => [])
            );
        }

        const results = await Promise.all(batches);
        for (const posts of results) {
            for (const p of posts) {
                map[p.id] = p.large_file_url || p.file_url || null;
            }
        }
        return map;
    }

    async function applyMasonryLayout() {
        const gallery = document.querySelector(CONFIG.selectors.postGallery);
        const container = document.querySelector(CONFIG.selectors.postsContainer);
        if (!gallery || !container) return;

        // 添加瀑布流标记 class
        gallery.classList.add('masonry-mode');
        container.classList.add('masonry-container');

        // 移除画廊上 Danbooru 的固定尺寸 class（如 post-gallery-grid, post-gallery-180）
        const toRemove = [];
        gallery.classList.forEach(cls => {
            if (cls.startsWith('post-gallery-') && cls !== 'post-gallery') toRemove.push(cls);
        });
        toRemove.forEach(cls => {
            gallery.classList.add('masonry-removed-' + cls);
            gallery.classList.remove(cls);
        });

        const articles = container.querySelectorAll(CONFIG.selectors.postPreview);

        // 收集所有帖子 ID，并发请求 sample URL
        const postIds = [];
        articles.forEach(article => {
            const id = article.dataset.id;
            if (id) postIds.push(id);
        });
        const sampleUrlMap = await fetchSampleUrls(postIds);

        articles.forEach(article => {
            article.classList.add('masonry-item');

            // 移除 Danbooru 的固定尺寸 class
            const clsToRemove = [];
            article.classList.forEach(cls => {
                if (cls.startsWith('post-preview-') && cls !== 'post-preview') clsToRemove.push(cls);
            });
            clsToRemove.forEach(cls => {
                article.dataset.masonryRemoved = (article.dataset.masonryRemoved || '') + ' ' + cls;
                article.classList.remove(cls);
            });

            const img = article.querySelector(CONFIG.selectors.postPreviewImage);
            if (!img) return;

            // 保存原始尺寸属性以便恢复
            if (img.hasAttribute('width')) {
                img.dataset.masonryOrigWidth = img.getAttribute('width');
                img.removeAttribute('width');
            }
            if (img.hasAttribute('height')) {
                img.dataset.masonryOrigHeight = img.getAttribute('height');
                img.removeAttribute('height');
            }

            // 清除内联 style 中可能的固定尺寸
            img.style.cssText = '';

            // 替换为 sample 尺寸图片
            img.dataset.masonryOrigSrc = img.src;
            const postId = article.dataset.id;
            const sampleUrl = postId && sampleUrlMap[postId];
            if (sampleUrl) {
                const preloader = new Image();
                preloader.onload = function() {
                    const picture = img.closest('picture');
                    if (picture) {
                        picture.querySelectorAll('source').forEach(s => s.remove());
                    }
                    img.src = sampleUrl;
                    // 图片替换后尺寸变化，使用防抖布局（多张图同时加载完不会重复计算）
                    img.addEventListener('load', scheduleLayout, { once: true });
                };
                preloader.src = sampleUrl;
            }

            // 清除 post-preview-container 上的内联样式
            const previewContainer = article.querySelector('.post-preview-container');
            if (previewContainer) {
                previewContainer.style.cssText = '';
            }
        });

        // 缓存 DOM 引用后执行初始布局
        cacheMasonryRefs();
        layoutMasonry();

        // 监听未加载完的缩略图，使用防抖布局
        articles.forEach(article => {
            const img = article.querySelector(CONFIG.selectors.postPreviewImage);
            if (img && !img.complete) {
                img.addEventListener('load', scheduleLayout, { once: true });
            }
        });

        // 监听窗口 resize，防抖重新布局
        window.removeEventListener('resize', onMasonryResize);
        window.addEventListener('resize', onMasonryResize);
    }

    function onMasonryResize() {
        clearTimeout(masonryResizeTimer);
        masonryResizeTimer = setTimeout(() => layoutMasonry(), 150);
    }

    function removeMasonryLayout() {
        // 移除 resize 监听和定时器
        window.removeEventListener('resize', onMasonryResize);
        clearTimeout(masonryResizeTimer);
        clearTimeout(masonryLayoutTimer);
        if (masonryLayoutRafId) cancelAnimationFrame(masonryLayoutRafId);
        clearMasonryCache();

        const gallery = document.querySelector(CONFIG.selectors.postGallery);
        const container = document.querySelector(CONFIG.selectors.postsContainer);
        if (!gallery || !container) return;

        gallery.classList.remove('masonry-mode');
        container.classList.remove('masonry-container');
        container.style.height = '';

        const articles = container.querySelectorAll(CONFIG.selectors.postPreview);
        articles.forEach(article => {
            article.classList.remove('masonry-item');
            article.style.transform = '';
            article.style.width = '';
        });

        // 恢复页面需要刷新以还原原始图片尺寸
        location.reload();
    }

    // 在页面加载完成后自动应用瀑布流（如果已启用）
    function initMasonry() {
        if (!masonryEnabled) return;

        // 如果容器已存在，直接应用
        const container = document.querySelector(CONFIG.selectors.postsContainer);
        if (container) {
            applyMasonryLayout();
            return;
        }

        // 否则用 MutationObserver 等待容器出现（比 setInterval 更高效）
        const initObserver = new MutationObserver(() => {
            if (document.querySelector(CONFIG.selectors.postsContainer)) {
                initObserver.disconnect();
                applyMasonryLayout();
            }
        });
        initObserver.observe(document.body, { childList: true, subtree: true });
        // 5秒超时自动断开
        setTimeout(() => initObserver.disconnect(), 5000);
    }

    function injectUI() {
        const sidebar = document.querySelector(CONFIG.selectors.sidebar);
        if (!sidebar || document.querySelector('#quick-filter-container')) return;

        const container = document.createElement('div');
        container.id = 'quick-filter-container';
        
        const currentInput = document.querySelector(CONFIG.selectors.tagInput);
        const state = getActiveState(currentInput ? currentInput.value : '');
        const advancedOpen = localStorage.getItem('danbooru-enhanced-advanced-open') === 'true';

        const i18n = {
            extName: chrome.i18n.getMessage('extName'),
            rating: chrome.i18n.getMessage('rating_label'),
            sort: chrome.i18n.getMessage('sort_label'),
            time: chrome.i18n.getMessage('time_label'),
            reset: chrome.i18n.getMessage('reset_btn'),
            masonry: chrome.i18n.getMessage('masonry_btn'),
            score: chrome.i18n.getMessage('sort_score'),
            fav: chrome.i18n.getMessage('sort_fav'),
            rank: chrome.i18n.getMessage('sort_rank'),
            latest: chrome.i18n.getMessage('sort_latest'),
            comment: chrome.i18n.getMessage('sort_comment'),
            change: chrome.i18n.getMessage('sort_change'),
            random: chrome.i18n.getMessage('sort_random'),
            mpixels: chrome.i18n.getMessage('sort_mpixels'),
            filesize: chrome.i18n.getMessage('sort_filesize'),
            today: chrome.i18n.getMessage('time_today'),
            week: chrome.i18n.getMessage('time_week'),
            month: chrome.i18n.getMessage('time_month'),
            quarter: chrome.i18n.getMessage('time_quarter'),
            year: chrome.i18n.getMessage('time_year'),
            type_label: chrome.i18n.getMessage('type_label'),
            type_static: chrome.i18n.getMessage('type_static'),
            type_animated: chrome.i18n.getMessage('type_animated'),
            score_label: chrome.i18n.getMessage('score_label'),
            score_placeholder: chrome.i18n.getMessage('score_placeholder'),
            fav_label: chrome.i18n.getMessage('fav_label'),
            fav_placeholder: chrome.i18n.getMessage('fav_placeholder'),
            search_btn: chrome.i18n.getMessage('search_btn'),
            limit_label: chrome.i18n.getMessage('limit_label'),
            image_label: chrome.i18n.getMessage('image_label'),
            img_landscape: chrome.i18n.getMessage('img_landscape'),
            img_portrait: chrome.i18n.getMessage('img_portrait'),
            img_hd: chrome.i18n.getMessage('img_hd'),
            time_placeholder: chrome.i18n.getMessage('time_placeholder'),
            unit_d: chrome.i18n.getMessage('unit_day'),
            unit_w: chrome.i18n.getMessage('unit_week'),
            unit_mo: chrome.i18n.getMessage('unit_month'),
            unit_y: chrome.i18n.getMessage('unit_year'),
            dedup: chrome.i18n.getMessage('dedup_btn'),
            filter: chrome.i18n.getMessage('filter_label'),
            advanced: chrome.i18n.getMessage('advanced_settings'),
            site_i18n: chrome.i18n.getMessage('site_i18n_btn'),
        };

        const isRatingActive = (val) => (state.rating || '').split(',').includes(val);

        container.innerHTML = `
            <!-- 搜索框占位：原生 #search-box 将被 JS 移入此处 -->
            <div id="qf-search-slot"></div>
            <div class="qf-divider"></div>

            <!-- 分级过滤 -->
            <div class="quick-filter-section">
                <div class="quick-filter-label">${i18n.rating}</div>
                <div class="quick-filter-group">
                    <button class="quick-filter-btn btn-rating-g ${isRatingActive('g') ? 'active' : ''}" data-type="rating" data-val="g">G</button>
                    <button class="quick-filter-btn btn-rating-s ${isRatingActive('s') ? 'active' : ''}" data-type="rating" data-val="s">S</button>
                    <button class="quick-filter-btn btn-rating-q ${isRatingActive('q') ? 'active' : ''}" data-type="rating" data-val="q">Q</button>
                    <button class="quick-filter-btn btn-rating-e ${isRatingActive('e') ? 'active' : ''}" data-type="rating" data-val="e">E</button>
                </div>
            </div>

            <!-- 排序方式 -->
            <div class="quick-filter-section">
                <div class="quick-filter-label">${i18n.sort}</div>
                <div class="quick-filter-group">
                    <button class="quick-filter-btn btn-sort-score ${state.order === 'score' ? 'active' : ''}" data-type="order" data-val="score">${i18n.score}</button>
                    <button class="quick-filter-btn btn-sort-fav ${state.order === 'favcount' ? 'active' : ''}" data-type="order" data-val="favcount">${i18n.fav}</button>
                    <button class="quick-filter-btn btn-sort-rank ${state.order === 'rank' ? 'active' : ''}" data-type="order" data-val="rank">${i18n.rank}</button>
                    <button class="quick-filter-btn btn-sort-comment ${state.order === 'comment' ? 'active' : ''}" data-type="order" data-val="comment">${i18n.comment}</button>
                    <button class="quick-filter-btn btn-sort-change ${state.order === 'change' ? 'active' : ''}" data-type="order" data-val="change">${i18n.change}</button>
                    <button class="quick-filter-btn btn-sort-random ${state.order === 'random' ? 'active' : ''}" data-type="order" data-val="random">${i18n.random}</button>
                    <button class="quick-filter-btn btn-sort-mpixels ${state.order === 'mpixels' ? 'active' : ''}" data-type="order" data-val="mpixels">${i18n.mpixels}</button>
                    <button class="quick-filter-btn btn-sort-filesize ${state.order === 'filesize' ? 'active' : ''}" data-type="order" data-val="filesize">${i18n.filesize}</button>
                    <button class="quick-filter-btn btn-sort-latest ${!state.order ? 'active' : ''}" data-type="order" data-val="">${i18n.latest}</button>
                </div>
            </div>

            <!-- 评分 & 收藏 & 时间范围 -->
            <div class="quick-filter-section">
                <div class="quick-filter-range-grid">
                    <div class="qf-range-item">
                        <span class="qf-range-label">${i18n.score_label}</span>
                        <input type="text" class="quick-filter-input" id="qf-score-input"
                               placeholder="${i18n.score_placeholder}" value="${state.score || ''}" />
                    </div>
                    <div class="qf-range-item">
                        <span class="qf-range-label">${i18n.fav_label}</span>
                        <input type="text" class="quick-filter-input" id="qf-fav-input"
                               placeholder="${i18n.fav_placeholder}" value="${state.favcount || ''}" />
                    </div>
                    <div class="qf-range-item qf-range-item-wide">
                        <span class="qf-range-label">${i18n.time}</span>
                        <div class="qf-input-combined">
                            <input type="text" class="quick-filter-input" id="qf-age-input"
                                   placeholder="${i18n.time_placeholder}" value="" />
                            <select class="quick-filter-select" id="qf-age-unit">
                                <option value="d">d</option>
                                <option value="w">w</option>
                                <option value="mo">m</option>
                                <option value="y">y</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div id="qf-advanced-content" class="${advancedOpen ? 'open' : ''}">
                <!-- 类型 & 属性 & 过滤 -->
                <div class="quick-filter-section">
                    <div class="quick-filter-range-grid">
                        <div class="qf-range-item">
                            <span class="qf-range-label">${i18n.type_label}</span>
                            <div class="quick-filter-group">
                                <button class="quick-filter-btn btn-type-static" data-composite="filetype_static">${i18n.type_static}</button>
                                <button class="quick-filter-btn btn-type-animated" data-composite="filetype_animated">${i18n.type_animated}</button>
                            </div>
                        </div>
                        <div class="qf-range-item">
                            <span class="qf-range-label">${i18n.image_label}</span>
                            <div class="quick-filter-group">
                                <button class="quick-filter-btn btn-img-landscape" data-composite="ratio_landscape">${i18n.img_landscape}</button>
                                <button class="quick-filter-btn btn-img-portrait" data-composite="ratio_portrait">${i18n.img_portrait}</button>
                                <button class="quick-filter-btn btn-img-hd" data-composite="ratio_hd">${i18n.img_hd}</button>
                            </div>
                        </div>
                        <div class="qf-range-item qf-range-item-wide">
                            <span class="qf-range-label">${i18n.filter}</span>
                            <div class="quick-filter-group">
                                <button class="quick-filter-btn btn-dedup ${state.parent === 'none' ? 'active' : ''}" data-type="parent" data-val="none">${i18n.dedup}</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 界面设置 (UI) -->
                <div class="quick-filter-section">
                    <div class="quick-filter-range-grid">
                        <div class="qf-range-item">
                            <span class="qf-range-label">${i18n.masonry}</span>
                            <div class="quick-filter-group">
                                <button class="quick-filter-btn btn-layout-masonry ${masonryEnabled ? 'active' : ''}" id="qf-masonry-toggle">切换</button>
                            </div>
                        </div>
                        <div class="qf-range-item">
                            <span class="qf-range-label">${i18n.site_i18n}</span>
                            <div class="quick-filter-group">
                                <button class="quick-filter-btn btn-site-i18n ${localStorage.getItem('danbooru-enhanced-site-i18n') === 'true' ? 'active' : ''}" id="qf-site-i18n-toggle">翻译</button>
                            </div>
                        </div>
                        <div class="qf-range-item qf-range-item-wide">
                            <span class="qf-range-label">${i18n.limit_label}</span>
                            <input type="text" class="quick-filter-input" id="qf-limit-input"
                                   placeholder="max 200" value="${state.limit || '20'}" />
                        </div>
                    </div>
                </div>
            </div>

            <div class="qf-control-row">
                <button class="quick-filter-btn btn-advanced ${advancedOpen ? 'open' : ''}" id="qf-advanced-toggle">
                    ${i18n.advanced} <span class="qf-arrow"></span>
                </button>
                <button class="quick-filter-btn btn-reset" id="qf-reset">${i18n.reset}</button>
            </div>
        `;

        // 插入到侧边栏顶部
        sidebar.prepend(container);

        // 将原生搜索框移入面板，并注入自定义搜索按钮
        const searchBox = document.querySelector(CONFIG.selectors.searchBox);
        const searchSlot = container.querySelector('#qf-search-slot');
        if (searchBox && searchSlot) {
            searchSlot.appendChild(searchBox);
            // 在原生 form 内追加自定义搜索按钮
            // 拦截原生表单提交，改用 executeSearch (将面板过滤状态合并到搜索)
            const form = searchBox.querySelector('form');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    executeSearch();
                });
            }
        }

        // 从搜索框初始化面板状态（会清理搜索框中的 metatag）
        // 先从 URL 搜索框解析，再合并持久化存储中的状态
        initFilterState();
        loadFilterState(() => {
            // URL 中的 metatag 优先级高于存储的状态
            // initFilterState 已经解析了 URL，这里用 URL 的值覆盖存储值
            const input = document.querySelector(CONFIG.selectors.tagInput);
            if (input) {
                const urlState = getActiveState(location.search || '');
                // 如果 URL 中有某个 metatag，则以 URL 为准
                for (const key in filterState) {
                    if (urlState[key]) {
                        filterState[key] = urlState[key];
                    }
                }
            }
            updateButtonStates();
        });

        // 委托处理所有过滤按钮点击
        container.addEventListener('click', (e) => {
            const btn = e.target.closest('.quick-filter-btn');
            if (!btn) return;

            if (btn.id === 'qf-reset') {
                filterState = {
                    rating: null, order: null, age: null,
                    filetype: null, score: null, favcount: null,
                    ratio: null, width: null, limit: null, parent: null
                };
                const input = document.querySelector(CONFIG.selectors.tagInput);
                if (input) input.value = '';
                saveFilterState();
                updateButtonStates();
                return;
            }

            if (btn.id === 'qf-masonry-toggle') {
                setMasonryEnabled(!masonryEnabled);
                return;
            }

            if (btn.id === 'qf-site-i18n-toggle') {
                const enabled = localStorage.getItem('danbooru-enhanced-site-i18n') !== 'true';
                localStorage.setItem('danbooru-enhanced-site-i18n', enabled);
                btn.classList.toggle('active', enabled);
                if (enabled) {
                    location.reload(); // Reload to apply translations
                } else {
                    location.reload(); // Reload to restore original English text
                }
                return;
            }

            if (btn.id === 'qf-advanced-toggle') {
                const content = document.querySelector('#qf-advanced-content');
                const isOpen = content.classList.toggle('open');
                btn.classList.toggle('open', isOpen);
                localStorage.setItem('danbooru-enhanced-advanced-open', isOpen);
                return;
            }


            // 复合过滤器按钮
            const { composite } = btn.dataset;
            if (composite) {
                const filters = COMPOSITE_FILTERS[composite];
                if (!filters) return;
                
                // 检查是否已经处于该状态（如果是，则清除）
                const alreadyActive = Object.entries(filters).every(([k, v]) => filterState[k] === v);
                if (alreadyActive) {
                    const clears = {};
                    Object.keys(filters).forEach(k => clears[k] = null);
                    applyFilter(clears);
                } else {
                    applyFilter(filters);
                }
                return;
            }

            const { type, val } = btn.dataset;
            if (type && val !== undefined) {
                if (type === 'rating') {
                    applyFilter({ rating: val });
                } else {
                    // 单选逻辑
                    if (filterState[type] === val) {
                        applyFilter({ [type]: null });
                    } else {
                        applyFilter({ [type]: val || null });
                    }
                }
            }
        });

        // 监听输入框的 input 和 change 事件，实时同步状态到 filterState 并持久化
        container.addEventListener('input', (e) => {
            const id = e.target.id;
            if (['qf-score-input', 'qf-fav-input', 'qf-age-input', 'qf-limit-input'].includes(id)) {
                filterUpdateFromInputs();
                saveFilterState();
            }
        });

        container.addEventListener('change', (e) => {
            if (e.target.id === 'qf-age-unit') {
                filterUpdateFromInputs();
                saveFilterState();
            }
        });
    }

    /** 从 UI 输入组件读取当前值并同步更新到 filterState 内部变量 */
    function filterUpdateFromInputs() {
        const scoreInput = document.querySelector('#qf-score-input');
        const favInput = document.querySelector('#qf-fav-input');
        const ageInput = document.querySelector('#qf-age-input');
        const ageUnit = document.querySelector('#qf-age-unit');

        if (scoreInput) filterState.score = scoreInput.value.trim() || null;
        if (favInput) filterState.favcount = favInput.value.trim() || null;

        const limitInput = document.querySelector('#qf-limit-input');
        if (limitInput) {
            let val = parseInt(limitInput.value.trim(), 10) || 20;
            if (val > 200) val = 200;
            if (val < 1) val = 20;
            filterState.limit = val.toString();
        }
        
        if (ageInput && ageUnit) {
            let val = ageInput.value.trim();
            if (val) {
                const rangeMatch = val.match(/^(\d+)\.\.(\d+)$/);
                if (rangeMatch) {
                    val = `${rangeMatch[1]}${ageUnit.value}..${rangeMatch[2]}${ageUnit.value}`;
                } else {
                    if (val.match(/^\d+$/)) val = '<' + val;
                    if (!val.match(/(d|w|mo|y)$/i)) val += ageUnit.value;
                }
            }
            filterState.age = val || null;
        }
    }

    // 初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectUI);
    } else {
        injectUI();
    }

    // 防抖的 MutationObserver：避免每次 DOM 微变动都执行昂贵操作
    let observerTimer = null;
    const observer = new MutationObserver(() => {
        clearTimeout(observerTimer);
        observerTimer = setTimeout(() => {
            if (!document.querySelector('#quick-filter-container')) injectUI();
            if (masonryEnabled) {
                const container = document.querySelector(CONFIG.selectors.postsContainer);
                if (container && !container.classList.contains('masonry-container')) {
                    applyMasonryLayout();
                }
            }
        }, 200);
    });
    // 只监听 sidebar 的直接子节点变化（UI 注入检测）
    // 以及 content 区域（瀑布流容器检测）
    const sidebar = document.querySelector(CONFIG.selectors.sidebar);
    if (sidebar) {
        observer.observe(sidebar, { childList: true });
    }
    // 监听主内容区域（瀑布流容器可能被 Danbooru 动态替换）
    const content = document.querySelector('#content') || document.body;
    observer.observe(content, { childList: true, subtree: true });

    // 初始化瀑布流
    initMasonry();

})();
