const StudyModule = (function () {
    var isGenerating = false;

    function init() {
        initForm();
        initHistory();
        renderHistory();
    }

    function initForm() {
        var generateBtn = document.getElementById('generate-summary-btn');
        var clearBtn = document.getElementById('clear-input-btn');
        var copyBtn = document.getElementById('copy-output-btn');
        var textarea = document.getElementById('syllabus-input');
        var charCount = document.getElementById('study-char-count');
        var typeSelect = document.getElementById('summary-type');
        var typeChips = document.querySelectorAll('.summary-type-chip');

        if (generateBtn) {
            generateBtn.addEventListener('click', handleGenerate);
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                textarea.value = '';
                textarea.focus();
                updateCharCount();
            });
        }

        if (copyBtn) {
            copyBtn.addEventListener('click', function () {
                var outputEl = document.querySelector('.study-output__content');
                if (!outputEl) return;
                Utils.copyToClipboard(outputEl.innerText).then(function () {
                    UI.toast('Copied to clipboard!', 'success', 1500);
                });
            });
        }

        function updateCharCount() {
            if (!textarea || !charCount) return;
            var len = textarea.value.length;
            charCount.textContent = len + (len === 1 ? ' character' : ' characters');
            charCount.classList.toggle('study-char-count--ok', len >= 20);
        }

        if (textarea) {
            textarea.addEventListener('input', updateCharCount);
            updateCharCount();
        }

        typeChips.forEach(function (chip) {
            chip.addEventListener('click', function () {
                typeChips.forEach(function (c) {
                    c.classList.remove('is-active');
                    c.setAttribute('aria-checked', 'false');
                });
                chip.classList.add('is-active');
                chip.setAttribute('aria-checked', 'true');
                if (typeSelect) typeSelect.value = chip.dataset.type;
            });
        });
    }

    function initHistory() {
        var clearHistoryBtn = document.getElementById('clear-history-btn');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', function () {
                var summaries = Storage.get('summaries') || [];
                if (summaries.length === 0) return;
                UI.confirm('Clear all summary history?', function () {
                    Storage.set('summaries', []);
                    renderHistory();
                    UI.toast('History cleared', 'info');
                });
            });
        }
    }

    async function handleGenerate() {
        if (isGenerating) return;

        var input = document.getElementById('syllabus-input').value.trim();
        var type = document.getElementById('summary-type').value;

        if (!input) {
            UI.toast('Please paste some syllabus content first', 'warning');
            return;
        }

        if (input.length < 20) {
            UI.toast('Please enter more content for a meaningful summary', 'warning');
            return;
        }

        isGenerating = true;
        showLoading();
        var btn = document.getElementById('generate-summary-btn');
        UI.setLoading(btn, true);

        try {
            var result = await GeminiAPI.summarize(input, type);
            showOutput(result);

            var summary = {
                id: Utils.generateId('sum'),
                input: Utils.truncate(input, 100),
                output: result,
                type: type,
                timestamp: new Date().toISOString()
            };

            Storage.push('summaries', summary);
            renderHistory();

            UI.toast('Summary generated!', 'success');
        } catch (err) {
            showError(err.message);
            UI.toast(err.message, 'error', 5000);
        } finally {
            isGenerating = false;
            UI.setLoading(btn, false);
        }
    }

    function showLoading() {
        var output = document.getElementById('study-output');
        var actions = document.getElementById('output-actions');
        if (actions) actions.style.display = 'none';

        output.innerHTML =
            '<div class="study-output__loading">' +
                '<div class="ai-typing"><span></span><span></span><span></span></div>' +
                '<p class="study-output__loading-text">Gemini is analyzing your content...</p>' +
            '</div>';
    }

    function showOutput(text) {
        var output = document.getElementById('study-output');
        var actions = document.getElementById('output-actions');
        if (actions) actions.style.display = 'flex';

        var html = markdownToHTML(text);
        output.innerHTML = '<div class="study-output__content">' + html + '</div>';
    }

    function showError(message) {
        var output = document.getElementById('study-output');
        var actions = document.getElementById('output-actions');
        if (actions) actions.style.display = 'none';

        output.innerHTML =
            '<div class="study-output__empty" style="color: var(--accent-danger);">' +
                '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' +
                '<p>' + UI.escapeHTML(message) + '</p>' +
            '</div>';
    }

    function markdownToHTML(md) {
        if (!md) return '';
        var html = md
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html = html.replace(/`(.+?)`/g, '<code>$1</code>');

        html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

        var lines = html.split('\n');
        var result = [];
        var inUl = false;
        var inOl = false;

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];

            var ulMatch = line.match(/^[\-\*] (.+)$/);
            var olMatch = line.match(/^\d+\. (.+)$/);

            if (ulMatch) {
                if (!inUl) { result.push('<ul>'); inUl = true; }
                result.push('<li>' + ulMatch[1] + '</li>');
            } else if (olMatch) {
                if (!inOl) { result.push('<ol>'); inOl = true; }
                result.push('<li>' + olMatch[1] + '</li>');
            } else {
                if (inUl) { result.push('</ul>'); inUl = false; }
                if (inOl) { result.push('</ol>'); inOl = false; }

                if (line.match(/^<h[1-4]>/) || line.match(/^<blockquote>/)) {
                    result.push(line);
                } else if (line.trim() === '') {
                    result.push('');
                } else {
                    result.push('<p>' + line + '</p>');
                }
            }
        }

        if (inUl) result.push('</ul>');
        if (inOl) result.push('</ol>');

        return result.join('\n');
    }

    function renderHistory() {
        var container = document.getElementById('study-history');
        var countEl = document.getElementById('history-count');
        var summaries = Storage.get('summaries') || [];

        if (countEl) countEl.textContent = '(' + summaries.length + ')';

        if (summaries.length === 0) {
            container.innerHTML =
                '<div class="empty-state" style="padding: var(--space-6) var(--space-4);">' +
                    '<p class="empty-state__text">No summaries generated yet.</p>' +
                '</div>';
            return;
        }

        var typeLabels = {
            bullet: 'Bullet Points',
            brief: 'Brief',
            detailed: 'Detailed',
            qa: 'Q&A',
            explain: 'Simple'
        };

        var reversed = summaries.slice().reverse();
        var html = '';

        reversed.forEach(function (s) {
            html +=
                '<div class="history-item" data-id="' + s.id + '">' +
                    '<div class="history-item__icon">' +
                        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>' +
                    '</div>' +
                    '<div class="history-item__info">' +
                        '<div class="history-item__title">' + UI.escapeHTML(s.input) + '</div>' +
                        '<div class="history-item__meta">' +
                            '<span>' + (typeLabels[s.type] || s.type) + '</span>' +
                            '<span>' + Utils.timeAgo(s.timestamp) + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<button class="history-item__remove" data-id="' + s.id + '" aria-label="Remove">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                    '</button>' +
                '</div>';
        });

        container.innerHTML = html;

        container.querySelectorAll('.history-item').forEach(function (item) {
            item.addEventListener('click', function (e) {
                if (e.target.closest('.history-item__remove')) return;
                var id = item.dataset.id;
                var summary = summaries.find(function (s) { return s.id === id; });
                if (summary) showOutput(summary.output);
            });
        });

        container.querySelectorAll('.history-item__remove').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var id = btn.dataset.id;
                Storage.removeFromArray('summaries', function (s) { return s.id === id; });
                renderHistory();
                UI.toast('Summary removed', 'info', 1500);
            });
        });
    }

    document.addEventListener('DOMContentLoaded', init);

    return {};
})();
