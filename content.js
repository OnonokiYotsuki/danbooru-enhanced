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
     * 解析并更新标签字符串
     * @param {string} currentTags 
     * @param {Object} updates { key: value } 
     */
    function updateTags(currentTags, updates) {
        let tags = currentTags.split(/\s+/).filter(t => t.trim().length > 0);
        
        for (const key in updates) {
            // 移除现有的同类标签 (例如移除原有所有 rating:*)
            tags = tags.filter(t => !t.startsWith(`${key}:`));
            
            // 如果是时间范围 (age)，我们也视其为一种 meta 标签
            if (key === 'age') {
                tags = tags.filter(t => !t.startsWith('age:'));
            }

            if (updates[key]) {
                tags.push(`${key}:${updates[key]}`);
            }
        }
        
        return tags.join(' ');
    }

    function applyFilter(updates) {
        const input = document.querySelector(CONFIG.selectors.tagInput);
        if (!input) return;

        input.value = updateTags(input.value, updates);
        
        // 更新 UI 状态
        updateButtonStates();
    }

    function updateButtonStates() {
        const input = document.querySelector(CONFIG.selectors.tagInput);
        if (!input) return;

        const state = getActiveState(input.value);
        const buttons = document.querySelectorAll('.quick-filter-btn');

        buttons.forEach(btn => {
            const { type, val } = btn.dataset;
            if (!type) {
                // 处理重置按钮或其他无 dataset 的按钮
                if (btn.id === 'qf-reset') return;
                return;
            }

            let isActive = false;
            const currentVal = state[type];

            if (type === 'order' && val === '') {
                // 特殊处理“最新”按钮
                isActive = !currentVal;
            } else {
                isActive = (currentVal === val);
            }

            if (isActive) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    function getActiveState(tags) {
        return {
            rating: (tags.match(/\brating:([gsqe])\b/i) || [])[1],
            order: (tags.match(/\border:(\w+)\b/i) || [])[1],
            age: (tags.match(/\bage:(<[^\s]+)/i) || [])[1]
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

        container.innerHTML = `
            <!-- 分级过滤 -->
            <div class="quick-filter-section">
                <div class="quick-filter-label">🛡️ 分级 (Rating)</div>
                <div class="quick-filter-group">
                    <button class="quick-filter-btn btn-rating-g ${state.rating === 'g' ? 'active' : ''}" data-type="rating" data-val="g">G</button>
                    <button class="quick-filter-btn btn-rating-s ${state.rating === 's' ? 'active' : ''}" data-type="rating" data-val="s">S</button>
                    <button class="quick-filter-btn btn-rating-q ${state.rating === 'q' ? 'active' : ''}" data-type="rating" data-val="q">Q</button>
                    <button class="quick-filter-btn btn-rating-e ${state.rating === 'e' ? 'active' : ''}" data-type="rating" data-val="e">E</button>
                </div>
            </div>

            <!-- 排序方式 -->
            <div class="quick-filter-section">
                <div class="quick-filter-label">📊 排序 (Sort)</div>
                <div class="quick-filter-group">
                    <button class="quick-filter-btn btn-sort-score ${state.order === 'score' ? 'active' : ''}" data-type="order" data-val="score">评分</button>
                    <button class="quick-filter-btn btn-sort-fav ${state.order === 'favcount' ? 'active' : ''}" data-type="order" data-val="favcount">收藏</button>
                    <button class="quick-filter-btn btn-sort-rank ${state.order === 'rank' ? 'active' : ''}" data-type="order" data-val="rank">排行</button>
                    <button class="quick-filter-btn btn-sort-latest ${!state.order ? 'active' : ''}" data-type="order" data-val="">最新</button>
                </div>
            </div>

            <!-- 时间范围 -->
            <div class="quick-filter-section">
                <div class="quick-filter-label">🕒 时间 (Time)</div>
                <div class="quick-filter-group">
                    <button class="quick-filter-btn ${state.age === '<1d' ? 'active' : ''}" data-type="age" data-val="<1d">今日</button>
                    <button class="quick-filter-btn ${state.age === '<1w' ? 'active' : ''}" data-type="age" data-val="<1w">本周</button>
                    <button class="quick-filter-btn ${state.age === '<1mo' ? 'active' : ''}" data-type="age" data-val="<1mo">本月</button>
                </div>
            </div>

            <!-- 布局切换 -->
            <div class="quick-filter-section">
                <div class="quick-filter-label">🖼️ 布局 (Layout)</div>
                <div class="quick-filter-group">
                    <button class="quick-filter-btn btn-layout-masonry ${masonryEnabled ? 'active' : ''}" id="qf-masonry-toggle">瀑布流</button>
                </div>
            </div>

            <button class="quick-filter-btn btn-reset" id="qf-reset">🔄 重置所有过滤器</button>
        `;

        const searchBox = document.querySelector(CONFIG.selectors.searchBox);
        if (searchBox) {
            searchBox.parentNode.insertBefore(container, searchBox.nextSibling);
        } else {
            sidebar.prepend(container);
        }

        // 委托处理所有按钮点击
        container.addEventListener('click', (e) => {
            const btn = e.target.closest('.quick-filter-btn');
            if (!btn) return;

            if (btn.id === 'qf-reset') {
                applyFilter({ rating: null, order: null, age: null });
                return;
            }

            if (btn.id === 'qf-masonry-toggle') {
                setMasonryEnabled(!isMasonryEnabled());
                return;
            }

            const { type, val } = btn.dataset;
            if (type) {
                // 如果按钮已经是激活状态，则点击它代表取消该过滤条件
                if (btn.classList.contains('active')) {
                    applyFilter({ [type]: null });
                } else {
                    applyFilter({ [type]: val || null });
                }
            }
        });
        // 监听手动输入更新按钮状态
        const input = document.querySelector(CONFIG.selectors.tagInput);
        if (input) {
            input.addEventListener('input', updateButtonStates);
        }
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
