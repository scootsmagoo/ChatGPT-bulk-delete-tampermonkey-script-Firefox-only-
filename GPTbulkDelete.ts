// ==UserScript==
// @name         ChatGPT Bulk Delete (API + Ctrl Multi-Select)
// @namespace    https://chatgpt.com/
// @version      6.0.0
// @description  Bulk-delete ChatGPT conversations using the backend API with Ctrl-click multi-select + checkboxes. Faster batching and native UI.
// @author       scootsmagoo
// @contributor  aaactimel
// @match        https://chatgpt.com/*
// @connect      chatgpt.com
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';

    console.log('[BulkDeleteAPI] Script loaded');

    const HISTORY_SELECTOR = '#history, nav[aria-label="Chat history"]';
    const ROW_SELECTOR = 'a[href^="/c/"]';

    let authToken = null;

    // ----------------- Utility helpers -----------------

    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    function gmRequest(options) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                ...options,
                onload: res => resolve(res),
                onerror: err => reject(err)
            });
        });
    }

    async function getAuthToken() {
        if (authToken) return authToken;
        try {
            const res = await gmRequest({
                method: 'GET',
                url: 'https://chatgpt.com/api/auth/session'
            });
            const data = JSON.parse(res.responseText || '{}');
            if (data && data.accessToken) {
                authToken = data.accessToken;
                console.log('[BulkDeleteAPI] Retrieved auth token');
                return authToken;
            }
            throw new Error('accessToken missing in /api/auth/session');
        } catch (err) {
            console.error('[BulkDeleteAPI] Failed to get auth token', err);
            showNotification('Could not retrieve auth token. Are you logged in?', 'error', 6000);
            return null;
        }
    }

    async function waitForHistoryContainer() {
        let node = null;
        while (!node) {
            node = document.querySelector(HISTORY_SELECTOR);
            if (!node) await sleep(100);
        }
        console.log('[BulkDeleteAPI] Found history container');
        return node;
    }

    async function waitForRows(container) {
        let rows = [];
        while (rows.length === 0) {
            rows = container.querySelectorAll(ROW_SELECTOR);
            if (rows.length === 0) await sleep(100);
        }
        console.log('[BulkDeleteAPI] Found', rows.length, 'chat rows');
        return rows;
    }

    // ----------------- Notifications & Inline Confirm -----------------

    function showNotification(message, type = 'info', duration = 4000) {
        const panel = document.getElementById('bulkDeletePanel');
        if (!panel) return;

        let container = panel.querySelector('.bulkToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.className = 'bulkToastContainer';
            panel.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `bulkToast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        if (duration > 0) {
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(-4px)';
                setTimeout(() => toast.remove(), 250);
            }, duration);
        }
    }

    function requestConfirmation(count) {
        return new Promise((resolve) => {
            const panel = document.getElementById('bulkDeletePanel');
            if (!panel) return resolve(false);

            const existing = panel.querySelector('.bulkConfirmBox');
            if (existing) existing.remove();

            const box = document.createElement('div');
            box.className = 'bulkConfirmBox';

            const text = document.createElement('div');
            text.className = 'bulkConfirmText';
            text.textContent = `Delete ${count} selected chat${count > 1 ? 's' : ''}?`;

            const actions = document.createElement('div');
            actions.className = 'bulkConfirmActions';

            const yesBtn = document.createElement('button');
            yesBtn.className = 'bulkConfirmBtn bulkConfirmYes';
            yesBtn.textContent = 'Yes, Delete';

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'bulkConfirmBtn bulkConfirmCancel';
            cancelBtn.textContent = 'Cancel';

            yesBtn.addEventListener('click', () => {
                box.remove();
                resolve(true);
            });

            cancelBtn.addEventListener('click', () => {
                box.remove();
                resolve(false);
            });

            actions.append(cancelBtn, yesBtn);
            box.append(text, actions);

            const btn = document.getElementById('bulkDeleteButton');
            if (btn && btn.nextSibling) {
                panel.insertBefore(box, btn.nextSibling);
            } else {
                panel.appendChild(box);
            }
        });
    }

    // ----------------- Styles (Native ChatGPT Look) -----------------
    function injectStyles() {
        const css = `
            .bulkCheck {
                appearance: none;
                -webkit-appearance: none;
                width: 16px;
                height: 16px;
                border: 1px solid rgba(142, 142, 160, 0.5);
                border-radius: 4px;
                margin-right: 10px;
                cursor: pointer;
                position: relative;
                outline: none;
                flex-shrink: 0;
                background-color: transparent;
                transition: all 0.2s ease-in-out;
            }
            .bulkCheck:hover {
                border-color: #10a37f;
            }
            .bulkCheck:checked {
                background-color: #10a37f;
                border-color: #10a37f;
            }
            .bulkCheck:checked::after {
                content: '';
                position: absolute;
                left: 4.5px;
                top: 1.5px;
                width: 4px;
                height: 8px;
                border: solid white;
                border-width: 0 2px 2px 0;
                transform: rotate(45deg);
            }
            #bulkDeletePanel {
                padding: 10px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                margin-bottom: 6px;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            #bulkDeleteButton {
                width: 100%;
                padding: 10px;
                background-color: var(--theme-submit-btn-bg, #10a37f);
                border: none;
                border-radius: 6px;
                color: white;
                cursor: pointer;
                font-weight: 500;
                font-size: 14px;
                transition: background-color 0.2s ease;
            }
            #bulkDeleteButton:hover {
                background-color: color-mix(in srgb, var(--theme-submit-btn-bg, #10a37f), #000 20%);
            }
            #bulkDeleteButton:disabled {
                background-color: #f87171;
                cursor: not-allowed;
            }
            .bulkHelpText {
                font-size: 11px;
                color: rgba(142, 142, 160, 0.8);
                text-align: center;
            }

            /* Custom In-Panel Notifications */
            .bulkToastContainer {
                display: flex;
                flex-direction: column;
                gap: 6px;
                margin-top: 2px;
            }
            .bulkToast {
                padding: 8px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                line-height: 1.3;
                transition: opacity 0.25s ease, transform 0.25s ease;
                animation: bulkSlideIn 0.2s ease-out;
                border: 1px solid transparent;
            }
            .bulkToast.info {
                background-color: #2a2b32;
                color: #ececf1;
                border-color: rgba(255, 255, 255, 0.15);
            }
            .bulkToast.success {
                background-color: #054f31;
                color: #d1fae5;
                border-color: #10a37f;
            }
            .bulkToast.error {
                background-color: #450a0a;
                color: #fecaca;
                border-color: #ef4444;
            }
            .bulkToast.warning {
                background-color: #451a03;
                color: #fef3c7;
                border-color: #f59e0b;
            }

            /* Inline Confirm Dialog */
            .bulkConfirmBox {
                background-color: #202123;
                border: 1px solid #ef4444;
                border-radius: 6px;
                padding: 10px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                animation: bulkSlideIn 0.2s ease-out;
            }
            .bulkConfirmText {
                font-size: 12px;
                color: #ececf1;
                font-weight: 500;
                text-align: center;
            }
            .bulkConfirmActions {
                display: flex;
                gap: 6px;
            }
            .bulkConfirmBtn {
                flex: 1;
                padding: 6px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 600;
                transition: background-color 0.15s ease;
            }
            .bulkConfirmYes {
                background-color: #ef4444;
                color: white;
            }
            .bulkConfirmYes:hover {
                background-color: #dc2626;
            }
            .bulkConfirmCancel {
                background-color: #343541;
                color: #ececf1;
                border: 1px solid rgba(255,255,255,0.15);
            }
            .bulkConfirmCancel:hover {
                background-color: #40414f;
            }

            @keyframes bulkSlideIn {
                from { opacity: 0; transform: translateY(-4px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;

        if (typeof GM_addStyle !== "undefined") {
            GM_addStyle(css);
        } else {
            const style = document.createElement("style");
            style.textContent = css;
            document.head.appendChild(style);
        }
    }

    // ----------------- UI injection -----------------

    function injectUI(container) {
        if (document.getElementById('bulkDeletePanel')) return;

        const panel = document.createElement('div');
        panel.id = 'bulkDeletePanel';

        const btn = document.createElement('button');
        btn.id = 'bulkDeleteButton';
        btn.textContent = 'Bulk Delete Selected';
        btn.addEventListener('click', bulkDelete);

        const help = document.createElement('div');
        help.className = 'bulkHelpText';
        help.textContent = 'Ctrl/Cmd + Click to select multiple';

        panel.append(btn, help);
        container.prepend(panel);

        console.log('[BulkDeleteAPI] UI panel injected');
    }

    function addCheckboxes(container) {
        const rows = container.querySelectorAll(ROW_SELECTOR);

        rows.forEach(row => {
            if (row.querySelector('.bulkCheck')) return;

            const titleDiv = row.querySelector('div.truncate') || row.querySelector('div.flex') || row.firstElementChild;

            if (!titleDiv) return;

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'bulkCheck';

            cb.addEventListener('click', ev => {
                ev.stopPropagation();
            });

            row.addEventListener('click', ev => {
                if (ev.ctrlKey || ev.metaKey) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    cb.checked = !cb.checked;
                }
            }, true);

            titleDiv.prepend(cb);
        });
    }

    // ----------------- Deletion logic -----------------

    async function deleteConversation(conversationId) {
        const token = await getAuthToken();
        if (!token) throw new Error('No auth token');

        const url = `https://chatgpt.com/backend-api/conversation/${conversationId}`;
        const res = await gmRequest({
            method: 'PATCH',
            url,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            data: JSON.stringify({ is_visible: false })
        });

        if (res.status < 200 || res.status >= 300) {
            throw new Error(`Status ${res.status}`);
        }
        return res;
    }

    async function bulkDelete() {
        const selectedCbs = [...document.querySelectorAll('.bulkCheck:checked')];

        if (!selectedCbs.length) {
            showNotification('No conversations selected.', 'warning', 3000);
            return;
        }

        const ok = await requestConfirmation(selectedCbs.length);
        if (!ok) return;

        const button = document.getElementById('bulkDeleteButton');
        if (button) {
            button.disabled = true;
            button.textContent = `Deleting ${selectedCbs.length} chats…`;
        }

        let success = 0;
        let failed = 0;

        const CONCURRENCY_LIMIT = 4;

        for (let i = 0; i < selectedCbs.length; i += CONCURRENCY_LIMIT) {
            const batch = selectedCbs.slice(i, i + CONCURRENCY_LIMIT);

            await Promise.all(batch.map(async (cb) => {
                const row = cb.closest('a[href^="/c/"]');
                if (!row) {
                    failed++;
                    return;
                }

                const href = row.getAttribute('href') || '';
                const conversationId = href.split('/').pop();

                try {
                    await deleteConversation(conversationId);

                    row.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    row.style.opacity = '0';
                    row.style.transform = 'translateX(-12px)';
                    setTimeout(() => row.remove(), 350);
                    success++;
                } catch (err) {
                    console.error('[BulkDeleteAPI] Failed to delete', conversationId, err);
                    row.style.outline = '2px solid #ef4444';
                    failed++;
                }
            }));

            if (i + CONCURRENCY_LIMIT < selectedCbs.length) {
                await sleep(250);
            }
        }

        if (button) {
            button.disabled = false;
            button.textContent = 'Bulk Delete Selected';
        }

        const msgType = failed > 0 ? 'warning' : 'success';
        showNotification(`Deleted: ${success} | Failed: ${failed}`, msgType, 5000);
    }

    // ----------------- Bootstrap -----------------

    async function start() {
        console.log('[BulkDeleteAPI] Starting…');
        injectStyles();

        const container = await waitForHistoryContainer();
        await waitForRows(container);

        injectUI(container);
        addCheckboxes(container);

        const obs = new MutationObserver(() => addCheckboxes(container));
        obs.observe(container, { childList: true, subtree: true });
    }

    start();

})();
