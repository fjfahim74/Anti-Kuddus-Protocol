const ComplaintModule = (function () {
    const CATEGORIES = {
        bullying: 'Bullying',
        abuse_of_power: 'Abuse of Power',
        theft: 'Theft',
        unfair_punishment: 'Unfair Punishment',
        harassment: 'Harassment',
        rule_violation: 'Rule Violation',
        corruption: 'Corruption',
        other: 'Other'
    };

    const SEVERITY_LABELS = ['', 'Low', 'Medium', 'High', 'Critical'];

    const ROLE_LABELS = {
        student: 'Student',
        captain_1: 'Class Captain 1',
        captain_2: 'Class Captain 2',
        captain_3: 'Class Captain 3'
    };

    let currentFilter = 'all';

    function init() {
        initTabs();
        initForm();
        initFilters();
        updateCount();
        renderComplaints();
        renderWarnings();
    }

    function initTabs() {
        const tabs = document.querySelectorAll('.tab[data-tab]');
        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                tabs.forEach(function (t) {
                    t.classList.remove('tab--active');
                    t.setAttribute('aria-selected', 'false');
                });
                tab.classList.add('tab--active');
                tab.setAttribute('aria-selected', 'true');

                document.querySelectorAll('.tab-content').forEach(function (c) {
                    c.classList.remove('tab-content--active');
                });

                var target = document.getElementById('tab-' + tab.dataset.tab);
                if (target) target.classList.add('tab-content--active');
            });
        });
    }

    function initForm() {
        var form = document.getElementById('complaint-form');
        if (!form) return;

        form.addEventListener('submit', handleSubmit);

        var message = document.getElementById('complaint-message');
        message.addEventListener('input', function () {
            var count = document.getElementById('char-count');
            if (count) count.textContent = message.value.length;
        });

        var targetInput = document.getElementById('complaint-target');
        var config = App.getConfig();
        if (targetInput && config) {
            targetInput.max = config.studentCount;
        }
    }

    function initFilters() {
        var container = document.getElementById('filter-chips');
        if (!container) return;

        container.addEventListener('click', function (e) {
            var chip = e.target.closest('.chip');
            if (!chip) return;

            container.querySelectorAll('.chip').forEach(function (c) {
                c.classList.remove('chip--active');
            });
            chip.classList.add('chip--active');

            currentFilter = chip.dataset.filter;
            renderComplaints();
        });
    }

    function handleSubmit(e) {
        e.preventDefault();

        var category = document.getElementById('complaint-category').value;
        var message = document.getElementById('complaint-message').value.trim();
        var severity = parseInt(document.querySelector('input[name="severity"]:checked').value, 10);
        var target = document.getElementById('complaint-target').value;
        var targetName = document.getElementById('complaint-target-name').value.trim();
        var targetRole = document.getElementById('complaint-target-role').value;
        var anonymous = document.getElementById('anonymous-check').checked;
        var session = App.getSession();

        var hasError = false;

        if (!category) {
            showFieldError('category', 'Please select a category');
            hasError = true;
        }

        if (!message) {
            showFieldError('message', 'Please describe the incident');
            hasError = true;
        } else if (message.length < 10) {
            showFieldError('message', 'Description must be at least 10 characters');
            hasError = true;
        }

        if (hasError) return;

        var complaint = {
            id: Utils.generateId('cmp'),
            category: category,
            message: message,
            severity: severity,
            targetRoll: target ? parseInt(target, 10) : null,
            targetName: targetName || null,
            targetRole: targetRole || null,
            anonymous: anonymous,
            submittedBy: session ? session.rollNumber : null,
            submitterName: session ? session.name : 'Unknown',
            timestamp: new Date().toISOString(),
            status: 'pending',
            resolved: false
        };

        Storage.push('complaints', complaint);

        if (complaint.targetRoll) {
            updateWarning(complaint.targetRoll);
        }

        document.getElementById('complaint-form').reset();
        document.getElementById('char-count').textContent = '0';
        document.getElementById('anonymous-check').checked = true;
        document.getElementById('complaint-target-name').value = '';
        document.getElementById('complaint-target-role').value = '';

        updateCount();
        renderComplaints();
        renderWarnings();

        UI.toast('Complaint submitted successfully!', 'success');
    }

    function updateWarning(rollNumber) {
        var key = String(rollNumber);
        var warnings = Storage.get('warnings') || {};
        var current = warnings[key] || { count: 0, level: 'green' };

        current.count += 1;
        if (current.count >= 5) {
            current.level = 'red';
        } else if (current.count >= 3) {
            current.level = 'yellow';
        } else {
            current.level = 'green';
        }

        warnings[key] = current;
        Storage.set('warnings', warnings);
    }

    function showFieldError(field, message) {
        var errorEl = document.getElementById(field + '-error');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.remove('hidden');
            setTimeout(function () {
                errorEl.classList.add('hidden');
            }, 4000);
        }
    }

    function updateCount() {
        var complaints = Storage.get('complaints') || [];
        var countEl = document.getElementById('complaints-count');
        if (countEl) countEl.textContent = complaints.length;
    }

    function renderComplaints() {
        var container = document.getElementById('complaints-list');
        if (!container) return;

        var complaints = Storage.get('complaints') || [];

        if (currentFilter !== 'all') {
            complaints = complaints.filter(function (c) { return c.category === currentFilter; });
        }

        complaints.sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });

        if (complaints.length === 0) {
            container.innerHTML =
                '<div class="empty-state">' +
                    '<div class="empty-state__icon">' +
                        '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>' +
                    '</div>' +
                    '<h3 class="empty-state__title">No complaints yet</h3>' +
                    '<p class="empty-state__text">' + (currentFilter !== 'all' ? 'No complaints in this category.' : 'Submit your first complaint using the Submit tab.') + '</p>' +
                '</div>';
            return;
        }

        var html = '';
        complaints.forEach(function (c) {
            var categoryLabel = CATEGORIES[c.category] || c.category;
            var severityLabel = SEVERITY_LABELS[c.severity] || 'Low';
            var statusBadge = c.resolved
                ? '<span class="badge badge--success">Resolved</span>'
                : '<span class="badge badge--warning">Pending</span>';
            var author = c.anonymous ? 'Anonymous' : ('Roll #' + c.submittedBy);

            var targetParts = [];
            if (c.targetRoll) targetParts.push('Roll #' + c.targetRoll);
            if (c.targetName) targetParts.push(UI.escapeHTML(c.targetName));
            if (c.targetRole) targetParts.push(ROLE_LABELS[c.targetRole] || c.targetRole);
            var targetLabel = targetParts.length ? (' → ' + targetParts.join(' · ')) : '';

            html +=
                '<div class="complaint-card glass-card glass-card--static animate-in">' +
                    '<div class="complaint-card__header">' +
                        '<div class="complaint-card__meta">' +
                            '<span class="complaint-card__severity complaint-card__severity--' + c.severity + '" title="' + severityLabel + ' severity"></span>' +
                            '<span class="complaint-card__category">' + UI.escapeHTML(categoryLabel) + '</span>' +
                        '</div>' +
                        '<span class="complaint-card__time">' + Utils.timeAgo(c.timestamp) + '</span>' +
                    '</div>' +
                    '<p class="complaint-card__message">' + UI.escapeHTML(c.message) + '</p>' +
                    '<div class="complaint-card__footer">' +
                        '<span class="complaint-card__author">' +
                            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>' +
                            author +
                            targetLabel +
                        '</span>' +
                        '<span class="complaint-card__status">' + statusBadge + '</span>' +
                    '</div>' +
                '</div>';
        });

        container.innerHTML = html;
    }

    function renderWarnings() {
        var warnings = Storage.get('warnings') || {};
        var entries = Object.keys(warnings).map(function (roll) {
            return { roll: parseInt(roll, 10), count: warnings[roll].count, level: warnings[roll].level };
        });

        entries.sort(function (a, b) { return b.count - a.count; });

        var totalComplaints = (Storage.get('complaints') || []).length;
        var warningCount = entries.filter(function (e) { return e.level === 'yellow'; }).length;
        var criticalCount = entries.filter(function (e) { return e.level === 'red'; }).length;

        var statsContainer = document.getElementById('warning-stats');
        if (statsContainer) {
            statsContainer.innerHTML =
                '<div class="glass-card warning-stat-card">' +
                    '<div class="warning-stat-card__value" style="color: var(--accent-primary);">' + totalComplaints + '</div>' +
                    '<div class="warning-stat-card__label">Total Complaints</div>' +
                '</div>' +
                '<div class="glass-card warning-stat-card">' +
                    '<div class="warning-stat-card__value" style="color: var(--accent-warning);">' + warningCount + '</div>' +
                    '<div class="warning-stat-card__label">Warnings</div>' +
                '</div>' +
                '<div class="glass-card warning-stat-card">' +
                    '<div class="warning-stat-card__value" style="color: var(--accent-danger);">' + criticalCount + '</div>' +
                    '<div class="warning-stat-card__label">Critical</div>' +
                '</div>';
        }

        var listContainer = document.getElementById('warnings-list');
        if (!listContainer) return;

        if (entries.length === 0) {
            listContainer.innerHTML =
                '<div class="empty-state">' +
                    '<div class="empty-state__icon">' +
                        '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>' +
                    '</div>' +
                    '<h3 class="empty-state__title">No warnings yet</h3>' +
                    '<p class="empty-state__text">Warnings appear when complaints target specific students by roll number.</p>' +
                '</div>';
            return;
        }

        var html = '';
        entries.forEach(function (entry) {
            var progressPercent = Math.min((entry.count / 5) * 100, 100);
            var progressClass = entry.level === 'red' ? 'progress__bar--danger' : (entry.level === 'yellow' ? 'progress__bar--warning' : '');

            html +=
                '<div class="warning-card glass-card glass-card--static">' +
                    '<div class="warning-card__indicator warning-card__indicator--' + entry.level + '"></div>' +
                    '<div class="warning-card__info">' +
                        '<div class="warning-card__name">Roll #' + entry.roll + '</div>' +
                        '<div class="warning-card__detail">' + entry.count + ' complaint' + (entry.count !== 1 ? 's' : '') + ' — ' + Utils.capitalize(entry.level) + ' level</div>' +
                    '</div>' +
                    '<div class="warning-card__progress">' +
                        '<div class="progress"><div class="progress__bar ' + progressClass + '" style="width: ' + progressPercent + '%;"></div></div>' +
                    '</div>' +
                    '<div class="warning-card__count warning-card__count--' + entry.level + '">' + entry.count + '</div>' +
                '</div>';
        });

        listContainer.innerHTML = html;
    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        renderComplaints: renderComplaints,
        renderWarnings: renderWarnings
    };
})();
