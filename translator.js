/**
 * Danbooru UI Translator
 * Responsible for translating native Danbooru elements into the user's language.
 */

(function() {
    'use strict';

    const SELECTORS = {
        navLinks: 'nav#nav a, #main-menu a, .subnav a',
        headings: '#sidebar h2, #sidebar-nav h2, #content h1, #content h2, #a-site-map h2',
        postInfoItems: '[id^="post-info-"]',
        postOptionLinks: '#post-options li a, .post-option-link',
        commentHeader: '#comments h2',
        siteMapLinks: '#a-site-map a'
    };

    const TRANSLATION_MAP = {
        // Top Navigation & Subnav
        'Posts': 'site_ui_posts',
        'Tags': 'site_ui_tags',
        'Artists': 'site_ui_artists',
        'Characters': 'site_ui_characters',
        'Copyrights': 'site_ui_copyrights',
        'Comments': 'site_ui_comments',
        'Forum': 'site_ui_forum',
        'Wiki': 'site_ui_wiki',
        'Help': 'site_ui_help',
        'More': 'site_ui_more',
        'My Account': 'site_ui_my_account',
        'Notes': 'site_ui_notes',
        'Pools': 'site_ui_pools',
        'Listing': 'site_ui_listing',
        'Upload': 'site_ui_upload',
        'Hot': 'site_ui_hot',
        'Favorites': 'site_ui_favorites',
        'Fav groups': 'site_ui_fav_groups',
        'Saved searches': 'site_ui_saved_searches',
        'Changes': 'site_ui_changes',

        // Site Map & Headers
        'Post Events': 'site_ui_post_events',
        'Artist commentary': 'site_ui_artist_commentary',
        'Reports': 'site_ui_reports',
        'Site': 'site_ui_site_section',
        'Profile': 'site_ui_profile',
        'Users': 'site_ui_users',
        'Admin': 'site_ui_admin',
        'Legal': 'site_ui_legal',
        
        // Site Map Links
        'Popular': 'site_ui_popular',
        'Votes': 'site_ui_votes',
        'Most Viewed': 'site_ui_most_viewed',
        'Similar Image Search': 'site_ui_similar_search',
        'Tag History': 'site_ui_tag_history',
        'Events': 'site_ui_events',
        'Appeals': 'site_ui_appeals',
        'Approvals': 'site_ui_approvals',
        'Disapprovals': 'site_ui_disapprovals',
        'Flags': 'site_ui_flags',
        'Replacements': 'site_ui_replacements',
        'Aliases': 'site_ui_aliases',
        'Implications': 'site_ui_implications',
        'AI Tags': 'site_ui_ai_tags',
        'Related Tags': 'site_ui_related_tags',
        'Cheat sheet': 'site_ui_cheat_sheet',
        'Gallery': 'site_ui_gallery',
        'User Reports': 'site_ui_user_reports',
        'Top Searches': 'site_ui_top_searches',
        'Missed Searches': 'site_ui_missed_searches',
        'Bulk Update Requests': 'site_ui_bulk_update',
        'RSS': 'site_ui_rss',
        'Mod Actions': 'site_ui_mod_actions',
        'Moderation Reports': 'site_ui_mod_reports',
        'Settings': 'site_ui_settings',
        'Uploads': 'site_ui_uploads',
        'Dmails': 'site_ui_dmails',
        'Upgrade account': 'site_ui_upgrade',
        'Bans': 'site_ui_bans',
        'Name Changes': 'site_ui_name_changes',
        'Feedback': 'site_ui_feedback',
        'Site Status': 'site_ui_site_status',
        'Site Statistics': 'site_ui_site_statistics',
        'Source Code': 'site_ui_source_code',
        'User Scripts': 'site_ui_user_scripts',
        'Keyboard Shortcuts': 'site_ui_keyboard',
        'API Documentation': 'site_ui_api',
        'Background Jobs': 'site_ui_background_jobs',
        'Privacy Policy': 'site_ui_privacy',
        'Terms of Service': 'site_ui_tos',
        '2257 Statement': 'site_ui_2257',
        'DMCA': 'site_ui_dmca',

        // Sidebar / Meta
        'Options': 'site_ui_sidebar_options',
        'History': 'site_ui_sidebar_history',
        'Statistics': 'site_ui_sidebar_statistics',
        'Information': 'site_ui_sidebar_information',

        // Post Info Labels
        'Uploader': 'site_ui_uploader',
        'Date': 'site_ui_date',
        'Size': 'site_ui_size',
        'Source': 'site_ui_source',
        'Rating': 'site_ui_rating',
        'Score': 'site_ui_score',
        'Status': 'site_ui_status'
    };

    function translateTextNode(node) {
        if (!node || !node.textContent) return;
        
        let originalText = node.textContent;
        let trimmedText = originalText.trim();
        
        // Clean text for matching: remove colons, quotes, and navigation arrows like »
        let cleanText = trimmedText.replace(/[:»]/g, '').trim();
        
        if (cleanText && TRANSLATION_MAP[cleanText]) {
            const translated = chrome.i18n.getMessage(TRANSLATION_MAP[cleanText]);
            if (translated && translated !== TRANSLATION_MAP[cleanText]) {
                // Preserve trailing symbols
                let result = translated;
                if (trimmedText.endsWith(':')) result += ':';
                if (trimmedText.endsWith(' »')) result += ' »';
                
                node.textContent = originalText.replace(trimmedText, result);
            }
        }
    }

    function translateItems(selector) {
        const items = document.querySelectorAll(selector);
        items.forEach(item => {
            for (let child of item.childNodes) {
                if (child.nodeType === Node.TEXT_NODE) {
                    translateTextNode(child);
                }
            }
        });
    }

    function translateSiteUI() {
        const enabled = localStorage.getItem('danbooru-enhanced-site-i18n') === 'true';
        if (!enabled) return;

        translateItems(SELECTORS.navLinks);
        translateItems(SELECTORS.headings);
        translateItems(SELECTORS.postInfoItems);
        translateItems(SELECTORS.postOptionLinks);
        translateItems(SELECTORS.siteMapLinks);
    }

    window.DanbooruTranslator = {
        apply: translateSiteUI
    };

    // Initial run
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', translateSiteUI);
    } else {
        translateSiteUI();
    }
})();
