const RulesModule = (function () {
    var CATEGORY_LABELS = {
        discipline: 'Discipline',
        attendance: 'Attendance',
        academic: 'Academic',
        governance: 'Governance',
        conduct: 'Conduct',
        uniform: 'Uniform',
        supplies: 'Supplies'
    };

    var FORBIDDEN_KEYWORDS = ['not allowed', 'prohibited', 'cannot', 'must not', 'no ', 'strictly', 'disqualification', 'fine'];
    var ALLOWED_KEYWORDS = ['can ', 'must ', 'should ', 'allowed', 'responsible', 'required'];

    function init() {
        initSearch();
        initFilter();
        renderRules();
    }

    function initSearch() {
        var input = document.getElementById('rules-search');
        var clearBtn = document.getElementById('search-clear');

        if (!input) return;

        var debouncedSearch = Utils.debounce(function () {
            var query = input.value.trim();
            if (clearBtn) clearBtn.style.display = query ? 'flex' : 'none';
            performSearch(query);
        }, 250);

        input.addEventListener('input', debouncedSearch);

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                input.value = '';
                if (clearBtn) clearBtn.style.display = 'none';
                performSearch('');
            }
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                input.value = '';
                clearBtn.style.display = 'none';
                performSearch('');
                input.focus();
            });
        }
    }

    function initFilter() {
        var filter = document.getElementById('filter-category');
        if (filter) {
            filter.addEventListener('change', function () {
                var query = document.getElementById('rules-search').value.trim();
                performSearch(query);
            });
        }
    }

    function getRules() {
        return Storage.get('rules') || [];
    }

    function performSearch(query) {
        var rules = getRules();
        var filter = document.getElementById('filter-category');
        var filterCat = filter ? filter.value : 'all';

        if (filterCat !== 'all') {
            rules = rules.filter(function (r) { return r.category === filterCat; });
        }

        if (!query) {
            hideVerdict();
            renderRules(rules, '');
            return;
        }

        var queryLower = query.toLowerCase();
        var words = queryLower.split(/\s+/).filter(function (w) { return w.length > 1; });

        var scored = rules.map(function (rule) {
            var score = 0;
            var textLower = rule.text.toLowerCase();
            var keywordsStr = rule.keywords.join(' ');

            words.forEach(function (word) {
                if (textLower.includes(word)) score += 3;
                if (keywordsStr.includes(word)) score += 5;
            });

            if (textLower.includes(queryLower)) score += 10;

            rule.keywords.forEach(function (kw) {
                words.forEach(function (word) {
                    if (kw.startsWith(word) || word.startsWith(kw)) score += 4;
                });
            });

            return { rule: rule, score: score };
        });

        var matches = scored
            .filter(function (s) { return s.score > 0; })
            .sort(function (a, b) { return b.score - a.score; });

        if (matches.length > 0) {
            showVerdict(matches[0].rule, query);
            renderRules(
                matches.map(function (m) { return m.rule; }),
                query,
                matches[0].rule.id
            );
        } else {
            showNoMatch(query);
            renderRules([], query);
        }
    }

    function showVerdict(rule, query) {
        var container = document.getElementById('rules-verdict');
        if (!container) return;

        var verdict = determineVerdict(rule);
        var iconSvg = '';
        var title = '';

        if (verdict === 'forbidden') {
            iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
            title = 'Not Allowed';
        } else if (verdict === 'allowed') {
            iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
            title = 'Allowed / Required';
        } else {
            iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
            title = 'See Rule Below';
        }

        container.style.display = 'block';
        container.innerHTML =
            '<div class="glass-card verdict-card verdict-card--' + verdict + '">' +
                '<div class="verdict-card__header">' +
                    '<div class="verdict-card__icon">' + iconSvg + '</div>' +
                    '<span class="verdict-card__title">' + title + '</span>' +
                '</div>' +
                '<div class="verdict-card__rule">' + UI.escapeHTML(rule.text) + '</div>' +
                '<div class="verdict-card__category">Category: ' + (CATEGORY_LABELS[rule.category] || rule.category) + '</div>' +
            '</div>';
    }

    function showNoMatch(query) {
        var container = document.getElementById('rules-verdict');
        if (!container) return;

        container.style.display = 'block';
        container.innerHTML =
            '<div class="glass-card verdict-card verdict-card--unclear">' +
                '<div class="verdict-card__header">' +
                    '<div class="verdict-card__icon">' +
                        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
                    '</div>' +
                    '<span class="verdict-card__title">No Rule Found</span>' +
                '</div>' +
                '<div class="verdict-card__rule">No matching rule found for "' + UI.escapeHTML(query) + '". This may not be covered by current rules.</div>' +
            '</div>';
    }

    function hideVerdict() {
        var container = document.getElementById('rules-verdict');
        if (container) container.style.display = 'none';
    }

    function determineVerdict(rule) {
        var textLower = rule.text.toLowerCase();

        for (var i = 0; i < FORBIDDEN_KEYWORDS.length; i++) {
            if (textLower.includes(FORBIDDEN_KEYWORDS[i])) return 'forbidden';
        }

        for (var j = 0; j < ALLOWED_KEYWORDS.length; j++) {
            if (textLower.includes(ALLOWED_KEYWORDS[j])) return 'allowed';
        }

        return 'unclear';
    }

    function renderRules(rules, query, highlightId) {
        var container = document.getElementById('rules-list');
        var countEl = document.getElementById('rules-count');
        if (!container) return;

        if (rules === undefined) {
            rules = getRules();
            var filter = document.getElementById('filter-category');
            var filterCat = filter ? filter.value : 'all';
            if (filterCat !== 'all') {
                rules = rules.filter(function (r) { return r.category === filterCat; });
            }
        }

        if (countEl) countEl.textContent = '(' + rules.length + ')';

        if (rules.length === 0) {
            container.innerHTML =
                '<div class="rules-no-results">' +
                    '<div class="rules-no-results__icon">' +
                        '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
                    '</div>' +
                    '<p class="rules-no-results__text">No rules match your search.</p>' +
                    '<p class="rules-no-results__hint">Try different keywords or check the category filter.</p>' +
                '</div>';
            return;
        }

        var html = '';
        rules.forEach(function (rule, index) {
            var isHighlight = highlightId && rule.id === highlightId;
            var ruleText = rule.text;

            if (query) {
                ruleText = highlightText(ruleText, query);
            }

            html +=
                '<div class="rule-item' + (isHighlight ? ' rule-item--highlight' : '') + '">' +
                    '<div class="rule-item__number">' + (index + 1) + '</div>' +
                    '<div class="rule-item__content">' +
                        '<p class="rule-item__text">' + ruleText + '</p>' +
                        '<span class="rule-item__badge">' + (CATEGORY_LABELS[rule.category] || rule.category) + '</span>' +
                    '</div>' +
                '</div>';
        });

        container.innerHTML = html;
    }

    function highlightText(text, query) {
        var words = query.toLowerCase().split(/\s+/).filter(function (w) { return w.length > 1; });
        var escaped = UI.escapeHTML(text);

        words.forEach(function (word) {
            var regex = new RegExp('(' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
            escaped = escaped.replace(regex, '<mark>$1</mark>');
        });

        return escaped;
    }

    document.addEventListener('DOMContentLoaded', init);

    return {};
})();
