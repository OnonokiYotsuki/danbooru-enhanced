/**
 * Danbooru Quick Filter Extension - v3
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
        }
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
        ratio: null, width: null
    };

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
        updateButtonStates();
    }

    /** 根据面板状态 + 搜索框中用户输入的标签，构建最终搜索字符串并提交 */
    function executeSearch() {
        const input = document.querySelector(CONFIG.selectors.tagInput);
        if (!input) return;

        // 读取评分/收藏输入框的最新值
        const scoreInput = document.querySelector('#qf-score-input');
        const favInput = document.querySelector('#qf-fav-input');
        if (scoreInput) filterState.score = scoreInput.value.trim() || null;
        if (favInput) filterState.favcount = favInput.value.trim() || null;

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

        const form = document.querySelector(CONFIG.selectors.searchForm);
        if (form) form.submit();
    }

    function updateButtonStates() {
        const buttons = document.querySelectorAll('.quick-filter-btn');

        buttons.forEach(btn => {
            const { type, val, composite } = btn.dataset;

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
        if (scoreInput && document.activeElement !== scoreInput) scoreInput.value = filterState.score || '';
        if (favInput && document.activeElement !== favInput) favInput.value = filterState.favcount || '';
    }

    function getActiveState(tags) {
        return {
            rating: (tags.match(/\brating:([gsqe,]+)\b/i) || [])[1],
            order: (tags.match(/\border:(\w+)\b/i) || [])[1],
            age: (tags.match(/\bage:(<[^\s]+)/i) || [])[1],
            filetype: (tags.match(/\bfiletype:([^\s]+)/i) || [])[1],
            score: (tags.match(/\bscore:([^\s]+)/i) || [])[1],
            favcount: (tags.match(/\bfavcount:([^\s]+)/i) || [])[1],
            ratio: (tags.match(/\bratio:([^\s]+)/i) || [])[1],
            width: (tags.match(/\bwidth:([^\s]+)/i) || [])[1],
        };
    }

    // ========== 瀑布流布局 (Masonry Layout) ==========

    let masonryEnabled = localStorage.getItem(CONFIG.masonry.storageKey) === 'true';
    let masonryObserver = null;
    let masonryResizeTimer = null;

    /**
     * 瀑布流布局引擎：按行顺序排列（每个 item 放入当前最短的列）
     * 当列高度相同时，按从左到右的顺序填充，从而实现行优先排序。
     */
    function layoutMasonry() {
        const container = document.querySelector(CONFIG.selectors.postsContainer);
        if (!container || !container.classList.contains('masonry-container')) return;

        const items = container.querySelectorAll('.masonry-item');
        if (items.length === 0) return;

        const containerWidth = container.clientWidth;
        const colWidth = CONFIG.masonry.columnWidth;
        const gap = CONFIG.masonry.gap;

        // 计算列数（至少 1 列）
        const numCols = Math.max(1, Math.floor((containerWidth + gap) / (colWidth + gap)));
        // 重新计算实际列宽，使列均匀分布填满容器
        const actualColWidth = (containerWidth - (numCols - 1) * gap) / numCols;

        // 每列的当前高度
        const colHeights = new Array(numCols).fill(0);

        items.forEach(item => {
            // 找到最短的列（高度相同时取最左边的，即索引最小的）
            let minHeight = colHeights[0];
            let minCol = 0;
            for (let c = 1; c < numCols; c++) {
                if (colHeights[c] < minHeight) {
                    minHeight = colHeights[c];
                    minCol = c;
                }
            }

            // 计算位置
            const left = minCol * (actualColWidth + gap);
            const top = colHeights[minCol];

            // 设置 item 的位置和宽度
            item.style.width = actualColWidth + 'px';
            item.style.left = left + 'px';
            item.style.top = top + 'px';

            // 更新该列高度（item 实际高度 + 间距）
            const itemHeight = item.offsetHeight;
            colHeights[minCol] = top + itemHeight + gap;
        });

        // 设置容器高度为最高列的高度
        container.style.height = Math.max(...colHeights) + 'px';
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
     * 通过 Danbooru API 批量获取帖子的 sample 图片 URL
     * @param {string[]} postIds 帖子 ID 数组
     * @returns {Promise<Object>} { postId: largeFileUrl }
     */
    async function fetchSampleUrls(postIds) {
        const map = {};
        const batchSize = 20;
        for (let i = 0; i < postIds.length; i += batchSize) {
            const batch = postIds.slice(i, i + batchSize);
            const tagQuery = 'id:' + batch.join(',');
            try {
                const resp = await fetch(
                    `/posts.json?tags=${encodeURIComponent(tagQuery)}&limit=${batch.length}`
                );
                if (resp.ok) {
                    const posts = await resp.json();
                    posts.forEach(p => {
                        map[p.id] = p.large_file_url || p.file_url || null;
                    });
                }
            } catch (e) {
                // 静默失败，保留缩略图
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
        gallery.classList.forEach(cls => {
            if (cls.startsWith('post-gallery-') && cls !== 'post-gallery') {
                gallery.classList.add('masonry-removed-' + cls);
                gallery.classList.remove(cls);
            }
        });

        const articles = container.querySelectorAll(CONFIG.selectors.postPreview);

        // 收集所有帖子 ID，批量请求 sample URL
        const postIds = [];
        articles.forEach(article => {
            const id = article.dataset.id;
            if (id) postIds.push(id);
        });
        const sampleUrlMap = await fetchSampleUrls(postIds);

        articles.forEach(article => {
            article.classList.add('masonry-item');

            // 移除 Danbooru 的固定尺寸 class（如 post-preview-180, post-preview-fit-compact）
            article.classList.forEach(cls => {
                if (cls.startsWith('post-preview-') && cls !== 'post-preview') {
                    article.dataset.masonryRemoved = (article.dataset.masonryRemoved || '') + ' ' + cls;
                    article.classList.remove(cls);
                }
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
            img.style.width = '';
            img.style.height = '';
            img.style.maxHeight = '';
            img.style.minHeight = '';

            // 替换为 sample 尺寸图片（通过 API 获取的 large_file_url）
            // 先保留缩略图显示，预加载 sample 图完成后再无缝替换
            img.dataset.masonryOrigSrc = img.src;
            const postId = article.dataset.id;
            const sampleUrl = postId && sampleUrlMap[postId];
            if (sampleUrl) {
                const preloader = new Image();
                preloader.onload = function() {
                    // sample 加载完成，移除 <source> 并替换 src，实现无缝切换
                    const picture = img.closest('picture');
                    if (picture) {
                        picture.querySelectorAll('source').forEach(s => s.remove());
                    }
                    img.src = sampleUrl;
                    // 图片替换后尺寸变化，需要在加载完成后重新布局
                    img.addEventListener('load', () => layoutMasonry(), { once: true });
                };
                preloader.onerror = function() {
                    // 加载失败，保留缩略图
                };
                preloader.src = sampleUrl;
            }

            // 同样清除 post-preview-container 上的内联样式
            const previewContainer = article.querySelector('.post-preview-container');
            if (previewContainer) {
                previewContainer.style.width = '';
                previewContainer.style.height = '';
                previewContainer.style.maxHeight = '';
            }
        });

        // 初始布局（使用缩略图尺寸先排一次）
        layoutMasonry();

        // 监听所有缩略图加载完成后重新布局（处理图片尺寸未知的情况）
        articles.forEach(article => {
            const img = article.querySelector(CONFIG.selectors.postPreviewImage);
            if (img && !img.complete) {
                img.addEventListener('load', () => layoutMasonry(), { once: true });
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
        // 移除 resize 监听
        window.removeEventListener('resize', onMasonryResize);
        clearTimeout(masonryResizeTimer);

        const gallery = document.querySelector(CONFIG.selectors.postGallery);
        const container = document.querySelector(CONFIG.selectors.postsContainer);
        if (!gallery || !container) return;

        gallery.classList.remove('masonry-mode');
        container.classList.remove('masonry-container');
        container.style.height = '';

        const articles = container.querySelectorAll(CONFIG.selectors.postPreview);
        articles.forEach(article => {
            article.classList.remove('masonry-item');
            article.style.position = '';
            article.style.left = '';
            article.style.top = '';
            article.style.width = '';
        });

        // 恢复页面需要刷新以还原原始图片尺寸
        // 简单方案：直接刷新页面
        location.reload();
    }

    // 在页面加载完成后自动应用瀑布流（如果已启用）
    function initMasonry() {
        if (masonryEnabled) {
            // 等待图片容器出现
            const waitForGallery = setInterval(() => {
                const container = document.querySelector(CONFIG.selectors.postsContainer);
                if (container) {
                    clearInterval(waitForGallery);
                    applyMasonryLayout();
                }
            }, 100);
            // 5秒超时
            setTimeout(() => clearInterval(waitForGallery), 5000);
        }
    }

    function injectUI() {
        const sidebar = document.querySelector(CONFIG.selectors.sidebar);
        if (!sidebar || document.querySelector('#quick-filter-container')) return;

        const container = document.createElement('div');
        container.id = 'quick-filter-container';
        
        const currentInput = document.querySelector(CONFIG.selectors.tagInput);
        const state = getActiveState(currentInput ? currentInput.value : '');

        const i18n = {
            rating: chrome.i18n.getMessage('rating_label'),
            sort: chrome.i18n.getMessage('sort_label'),
            time: chrome.i18n.getMessage('time_label'),
            layout: chrome.i18n.getMessage('layout_label'),
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
            image_label: chrome.i18n.getMessage('image_label'),
            img_landscape: chrome.i18n.getMessage('img_landscape'),
            img_portrait: chrome.i18n.getMessage('img_portrait'),
            img_hd: chrome.i18n.getMessage('img_hd'),
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

            <!-- 时间范围 -->
            <div class="quick-filter-section">
                <div class="quick-filter-label">${i18n.time}</div>
                <div class="quick-filter-group">
                    <button class="quick-filter-btn ${state.age === '<1d' ? 'active' : ''}" data-type="age" data-val="<1d">${i18n.today}</button>
                    <button class="quick-filter-btn ${state.age === '<1w' ? 'active' : ''}" data-type="age" data-val="<1w">${i18n.week}</button>
                    <button class="quick-filter-btn ${state.age === '<1mo' ? 'active' : ''}" data-type="age" data-val="<1mo">${i18n.month}</button>
                    <button class="quick-filter-btn ${state.age === '<3mo' ? 'active' : ''}" data-type="age" data-val="<3mo">${i18n.quarter}</button>
                    <button class="quick-filter-btn ${state.age === '<1y' ? 'active' : ''}" data-type="age" data-val="<1y">${i18n.year}</button>
                </div>
            </div>

            <!-- 文件类型 -->
            <div class="quick-filter-section">
                <div class="quick-filter-label">${i18n.type_label}</div>
                <div class="quick-filter-group">
                    <button class="quick-filter-btn btn-type-static" data-composite="filetype_static">${i18n.type_static}</button>
                    <button class="quick-filter-btn btn-type-animated" data-composite="filetype_animated">${i18n.type_animated}</button>
                </div>
            </div>

            <!-- 评分 & 收藏范围 -->
            <div class="quick-filter-section">
                <div class="quick-filter-range-labels">
                    <span class="quick-filter-range-label">${i18n.score_label}</span>
                    <span class="quick-filter-range-label">${i18n.fav_label}</span>
                </div>
                <div class="quick-filter-range">
                    <input type="text" class="quick-filter-input" id="qf-score-input"
                           placeholder="${i18n.score_placeholder}" value="${state.score || ''}" />
                    <input type="text" class="quick-filter-input" id="qf-fav-input"
                           placeholder="${i18n.fav_placeholder}" value="${state.favcount || ''}" />
                </div>
            </div>

            <!-- 图片属性 -->
            <div class="quick-filter-section">
                <div class="quick-filter-label">${i18n.image_label}</div>
                <div class="quick-filter-group">
                    <button class="quick-filter-btn btn-img-landscape" data-composite="ratio_landscape">${i18n.img_landscape}</button>
                    <button class="quick-filter-btn btn-img-portrait" data-composite="ratio_portrait">${i18n.img_portrait}</button>
                    <button class="quick-filter-btn btn-img-hd" data-composite="ratio_hd">${i18n.img_hd}</button>
                </div>
            </div>

            <!-- 布局切换 -->
            <div class="quick-filter-section">
                <div class="quick-filter-label">${i18n.layout}</div>
                <div class="quick-filter-group">
                    <button class="quick-filter-btn btn-layout-masonry ${masonryEnabled ? 'active' : ''}" id="qf-masonry-toggle">${i18n.masonry}</button>
                </div>
            </div>

            <button class="quick-filter-btn btn-reset" id="qf-reset">${i18n.reset}</button>
        `;

        // 插入到侧边栏顶部
        sidebar.prepend(container);

        // 将原生搜索框移入面板，并注入自定义搜索按钮
        const searchBox = document.querySelector(CONFIG.selectors.searchBox);
        const searchSlot = container.querySelector('#qf-search-slot');
        if (searchBox && searchSlot) {
            searchSlot.appendChild(searchBox);
            // 在原生 form 内追加自定义搜索按钮
            const form = searchBox.querySelector('form');
            if (form) {
                const submitBtn = document.createElement('button');
                submitBtn.type = 'button';
                submitBtn.className = 'qf-search-submit';
                submitBtn.id = 'qf-search';
                submitBtn.textContent = i18n.search_btn;
                form.appendChild(submitBtn);

                // 拦截原生表单提交，改用 executeSearch
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    executeSearch();
                });

                submitBtn.addEventListener('click', () => executeSearch());
            }
        }

        // 从搜索框初始化面板状态（会清理搜索框中的 metatag）
        initFilterState();
        updateButtonStates();

        // 委托处理所有过滤按钮点击
        container.addEventListener('click', (e) => {
            const btn = e.target.closest('.quick-filter-btn');
            if (!btn) return;

            if (btn.id === 'qf-reset') {
                applyFilter({
                    rating: null, order: null, age: null,
                    filetype: null, score: null, favcount: null,
                    ratio: null, width: null
                });
                const ti = document.querySelector(CONFIG.selectors.tagInput);
                if (ti) ti.value = '';
                return;
            }

            if (btn.id === 'qf-masonry-toggle') {
                setMasonryEnabled(!isMasonryEnabled());
                return;
            }

            // 复合过滤器按钮
            const { composite } = btn.dataset;
            if (composite) {
                const filters = COMPOSITE_FILTERS[composite];
                if (!filters) return;
                if (btn.classList.contains('active')) {
                    const nullFilters = {};
                    for (const k in filters) nullFilters[k] = null;
                    applyFilter(nullFilters);
                } else {
                    applyFilter(filters);
                }
                return;
            }

            const { type, val } = btn.dataset;
            if (type) {
                if (type === 'rating') {
                    applyFilter({ [type]: val });
                } else {
                    if (btn.classList.contains('active')) {
                        applyFilter({ [type]: null });
                    } else {
                        applyFilter({ [type]: val || null });
                    }
                }
            }
        });
    }

    // 初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectUI);
    } else {
        injectUI();
    }

    const observer = new MutationObserver(() => {
        if (!document.querySelector('#quick-filter-container')) injectUI();
        // 如果瀑布流已启用但容器没有 masonry 标记，重新应用
        if (masonryEnabled) {
            const container = document.querySelector(CONFIG.selectors.postsContainer);
            if (container && !container.classList.contains('masonry-container')) {
                applyMasonryLayout();
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // 初始化瀑布流
    initMasonry();

})();
