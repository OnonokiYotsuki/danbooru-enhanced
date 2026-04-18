/**
 * Danbooru Quick Filter Extension - v2
 * 增强版：支持更多分级、多种排序和时间范围过滤。
 */

(function() {
    'use strict';

    const CONFIG = {
        selectors: {
            sidebar: '#sidebar',
            searchBox: '#search-box',
            tagInput: '#tags',
            searchForm: '#search-box form'
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
    });
    observer.observe(document.body, { childList: true, subtree: true });

})();
