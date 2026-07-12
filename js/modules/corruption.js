const CorruptionModule = (function () {
    var CATEGORY_LABELS = {
        bribery: 'Bribery / Extortion',
        favoritism: 'Favoritism',
        abuse_power: 'Abuse of Power',
        theft: 'Theft / Misuse',
        intimidation: 'Intimidation',
        false_reporting: 'False Reporting',
        nepotism: 'Nepotism',
        other: 'Other'
    };

    var CATEGORY_COLORS = {
        bribery: 'danger',
        favoritism: 'warning',
        abuse_power: 'orange',
        theft: 'danger',
        intimidation: 'danger',
        false_reporting: 'info',
        nepotism: 'purple',
        other: 'primary'
    };

    var EVIDENCE_TYPE_LABELS = {
        witness: 'Witness',
        proof: 'Proof',
        witness_proof: 'Witness & Proof'
    };

    function init() {
        initTabs();
        initForm();
        initFilters();
        initClearAll();
        renderRecords();
        renderStats();
        renderCharts();
    }

    function initTabs() {
        document.querySelectorAll('.tabs__btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.tabs__btn').forEach(function (b) { b.classList.remove('tabs__btn--active'); });
                document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('tab-panel--active'); });

                btn.classList.add('tabs__btn--active');
                var panel = document.getElementById('tab-' + btn.dataset.tab);
                if (panel) panel.classList.add('tab-panel--active');

                if (btn.dataset.tab === 'charts') renderCharts();
                if (btn.dataset.tab === 'records') renderRecords();
            });
        });
    }

    var selectedProofFiles = [];
    var MAX_PROOF_FILES = 4;
    var MAX_STORED_FILE_BYTES = 1.5 * 1024 * 1024; // ~1.5MB per file, kept safe for localStorage

    function initForm() {
        var form = document.getElementById('corruption-form');
        var textarea = document.getElementById('corruption-item');
        var charCount = document.getElementById('item-char-count');

        var config = App.getConfig();
        var accusedInput = document.getElementById('corruption-accused');
        if (accusedInput && config) {
            accusedInput.max = config.studentCount;
        }

        if (textarea && charCount) {
            textarea.addEventListener('input', function () {
                charCount.textContent = textarea.value.length;
            });
        }

        initEvidenceFields();

        if (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                handleSubmit();
            });
        }
    }

    function initEvidenceFields() {
        var typeSelect = document.getElementById('corruption-evidence-type');
        var witnessGroup = document.getElementById('evidence-witness-group');
        var proofGroup = document.getElementById('evidence-proof-group');
        var fileInput = document.getElementById('evidence-proof-file');

        if (!typeSelect) return;

        typeSelect.addEventListener('change', function () {
            var val = typeSelect.value;
            var showWitness = val === 'witness' || val === 'witness_proof';
            var showProof = val === 'proof' || val === 'witness_proof';

            witnessGroup.classList.toggle('hidden', !showWitness);
            proofGroup.classList.toggle('hidden', !showProof);

            if (!showWitness) {
                document.getElementById('evidence-witness-name').value = '';
                document.getElementById('evidence-witness-roll').value = '';
            }
            if (!showProof) {
                selectedProofFiles = [];
                fileInput.value = '';
                renderFileList();
            }
        });

        if (fileInput) {
            fileInput.addEventListener('change', function () {
                var incoming = Array.prototype.slice.call(fileInput.files);
                incoming.forEach(function (file) {
                    if (selectedProofFiles.length >= MAX_PROOF_FILES) return;
                    selectedProofFiles.push(file);
                });
                fileInput.value = '';
                if (incoming.length && selectedProofFiles.length >= MAX_PROOF_FILES) {
                    UI.toast('Up to ' + MAX_PROOF_FILES + ' files can be attached', 'info', 2500);
                }
                renderFileList();
            });
        }
    }

    function renderFileList() {
        var listEl = document.getElementById('evidence-file-list');
        var btnText = document.getElementById('evidence-file-btn-text');
        if (!listEl) return;

        if (btnText) {
            btnText.textContent = selectedProofFiles.length
                ? selectedProofFiles.length + ' file' + (selectedProofFiles.length !== 1 ? 's' : '') + ' selected — add more'
                : 'Choose images, screenshots or short videos';
        }

        if (selectedProofFiles.length === 0) {
            listEl.innerHTML = '';
            return;
        }

        var html = '';
        selectedProofFiles.forEach(function (file, i) {
            html +=
                '<div class="evidence-file-item">' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>' +
                    '<span class="evidence-file-item__name">' + UI.escapeHTML(file.name) + '</span>' +
                    '<button type="button" class="evidence-file-item__remove" data-index="' + i + '" aria-label="Remove file">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                    '</button>' +
                '</div>';
        });

        listEl.innerHTML = html;

        listEl.querySelectorAll('.evidence-file-item__remove').forEach(function (btn) {
            btn.addEventListener('click', function () {
                selectedProofFiles.splice(parseInt(btn.dataset.index, 10), 1);
                renderFileList();
            });
        });
    }

    function readFileAsDataURL(file) {
        return new Promise(function (resolve) {
            if (file.size > MAX_STORED_FILE_BYTES) {
                resolve(null);
                return;
            }
            var reader = new FileReader();
            reader.onload = function () { resolve(reader.result); };
            reader.onerror = function () { resolve(null); };
            reader.readAsDataURL(file);
        });
    }

    function initFilters() {
        var catFilter = document.getElementById('filter-category');
        var sortFilter = document.getElementById('filter-sort');

        if (catFilter) catFilter.addEventListener('change', renderRecords);
        if (sortFilter) sortFilter.addEventListener('change', renderRecords);
    }

    function initClearAll() {
        var btn = document.getElementById('clear-all-records');
        if (btn) {
            btn.addEventListener('click', function () {
                var entries = Storage.get('corruption') || [];
                if (entries.length === 0) return;
                UI.confirm('Delete all corruption records? This cannot be undone.', function () {
                    Storage.set('corruption', []);
                    renderRecords();
                    renderStats();
                    renderCharts();
                    UI.toast('All records cleared', 'info');
                });
            });
        }
    }

    function handleSubmit() {
        var item = document.getElementById('corruption-item').value.trim();
        var accused = document.getElementById('corruption-accused').value.trim();
        var category = document.getElementById('corruption-category').value;
        var date = document.getElementById('corruption-date').value;
        var evidenceType = document.getElementById('corruption-evidence-type').value;
        var witnessName = document.getElementById('evidence-witness-name').value.trim();
        var witnessRoll = document.getElementById('evidence-witness-roll').value.trim();

        var config = App.getConfig();
        var maxStudents = config ? config.studentCount : 60;
        var hasError = false;

        if (!item || item.length < 10) {
            showFormError('item', 'Description must be at least 10 characters');
            hasError = true;
        }

        var accusedNum = parseInt(accused, 10);
        if (isNaN(accusedNum) || accusedNum < 1 || accusedNum > maxStudents) {
            showFormError('accused', 'Enter a valid roll number (1-' + maxStudents + ')');
            hasError = true;
        }

        if (!category) {
            showFormError('category', 'Please select a category');
            hasError = true;
        }

        var needsWitness = evidenceType === 'witness' || evidenceType === 'witness_proof';
        var needsProof = evidenceType === 'proof' || evidenceType === 'witness_proof';

        if (needsWitness && (!witnessName || !witnessRoll)) {
            showFormError('witness', 'Enter both the witness\'s name and roll number');
            hasError = true;
        }

        if (needsProof && selectedProofFiles.length === 0) {
            showFormError('proof', 'Attach at least one file as proof');
            hasError = true;
        }

        if (hasError) return;

        var submitBtn = document.getElementById('corruption-submit-btn');
        UI.setLoading(submitBtn, true);

        var filesToProcess = needsProof ? selectedProofFiles.slice() : [];

        Promise.all(filesToProcess.map(function (file) {
            return readFileAsDataURL(file).then(function (dataUrl) {
                return {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    dataUrl: dataUrl
                };
            });
        })).then(function (proofFiles) {
            var entry = {
                id: Utils.generateId('cor'),
                item: item,
                accused: accusedNum,
                category: category,
                date: date || new Date().toISOString().split('T')[0],
                evidenceType: evidenceType || null,
                witnessName: needsWitness ? witnessName : null,
                witnessRoll: needsWitness ? parseInt(witnessRoll, 10) : null,
                proofFiles: needsProof ? proofFiles : [],
                reportedBy: App.getSession().rollNumber,
                timestamp: new Date().toISOString()
            };

            Storage.push('corruption', entry);

            document.getElementById('corruption-form').reset();
            document.getElementById('item-char-count').textContent = '0';
            document.getElementById('evidence-witness-group').classList.add('hidden');
            document.getElementById('evidence-proof-group').classList.add('hidden');
            selectedProofFiles = [];
            renderFileList();

            UI.setLoading(submitBtn, false);
            renderStats();
            UI.toast('Entry logged successfully!', 'success');
        });
    }

    function showFormError(field, message) {
        var errorEl = document.getElementById(field + '-error');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.remove('hidden');
            setTimeout(function () { errorEl.classList.add('hidden'); }, 3000);
        }
    }

    function getEntries() {
        return Storage.get('corruption') || [];
    }

    function renderStats() {
        var entries = getEntries();

        var totalEl = document.getElementById('stat-total');
        var accusedEl = document.getElementById('stat-accused');
        var weekEl = document.getElementById('stat-week');
        var topCatEl = document.getElementById('stat-top-cat');

        if (totalEl) UI.countUp(totalEl, entries.length, 600);

        var uniqueAccused = new Set(entries.map(function (e) { return e.accused; }));
        if (accusedEl) UI.countUp(accusedEl, uniqueAccused.size, 600);

        var oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        var weekEntries = entries.filter(function (e) {
            return new Date(e.timestamp) >= oneWeekAgo;
        });
        if (weekEl) UI.countUp(weekEl, weekEntries.length, 600);

        if (topCatEl) {
            if (entries.length === 0) {
                topCatEl.textContent = '—';
            } else {
                var catCounts = {};
                entries.forEach(function (e) {
                    catCounts[e.category] = (catCounts[e.category] || 0) + 1;
                });
                var topCat = Object.keys(catCounts).sort(function (a, b) { return catCounts[b] - catCounts[a]; })[0];
                topCatEl.textContent = CATEGORY_LABELS[topCat] ? CATEGORY_LABELS[topCat].split('/')[0].trim() : topCat;
            }
        }
    }

    function renderRecords() {
        var container = document.getElementById('corruption-records');
        if (!container) return;

        var entries = getEntries();
        var catFilter = document.getElementById('filter-category');
        var sortFilter = document.getElementById('filter-sort');

        var filterCat = catFilter ? catFilter.value : 'all';
        var sortBy = sortFilter ? sortFilter.value : 'newest';

        if (filterCat !== 'all') {
            entries = entries.filter(function (e) { return e.category === filterCat; });
        }

        switch (sortBy) {
            case 'newest':
                entries.sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
                break;
            case 'oldest':
                entries.sort(function (a, b) { return new Date(a.timestamp) - new Date(b.timestamp); });
                break;
            case 'accused':
                entries.sort(function (a, b) { return a.accused - b.accused; });
                break;
        }

        if (entries.length === 0) {
            container.innerHTML =
                '<div class="empty-state">' +
                    '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>' +
                    '<p class="empty-state__text">No records found.</p>' +
                '</div>';
            return;
        }

        var html = '';
        entries.forEach(function (entry) {
            html +=
                '<div class="glass-card record-card record-card--' + entry.category + ' animate-in">' +
                    '<div class="record-card__header">' +
                        '<span class="record-card__category record-card__category--' + entry.category + '">' +
                            (CATEGORY_LABELS[entry.category] || entry.category) +
                        '</span>' +
                        '<div class="record-card__actions">' +
                            '<button class="record-card__delete" data-id="' + entry.id + '" aria-label="Delete entry">' +
                                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                    '<p class="record-card__body">' + UI.escapeHTML(entry.item) + '</p>' +
                    '<div class="record-card__meta">' +
                        '<span class="record-card__meta-item">' +
                            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>' +
                            'Roll #' + entry.accused +
                        '</span>' +
                        '<span class="record-card__meta-item">' +
                            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
                            entry.date +
                        '</span>' +
                        (entry.evidenceType ?
                            '<span class="record-card__meta-item">' +
                                '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>' +
                                EVIDENCE_TYPE_LABELS[entry.evidenceType] +
                            '</span>' : '') +
                        '<span class="record-card__meta-item">' +
                            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
                            Utils.timeAgo(entry.timestamp) +
                        '</span>' +
                    '</div>' +
                    renderEvidenceDetail(entry) +
                '</div>';
        });

        container.innerHTML = html;

        container.querySelectorAll('.record-card__delete').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = btn.dataset.id;
                UI.confirm('Delete this record?', function () {
                    Storage.removeFromArray('corruption', function (e) { return e.id === id; });
                    renderRecords();
                    renderStats();
                    renderCharts();
                    UI.toast('Record deleted', 'info', 1500);
                });
            });
        });
    }

    function renderEvidenceDetail(entry) {
        var hasWitness = entry.witnessName || entry.witnessRoll;
        var hasProof = entry.proofFiles && entry.proofFiles.length > 0;

        if (!hasWitness && !hasProof) return '';

        var html = '<div class="record-card__evidence">';

        if (hasWitness) {
            html +=
                '<div class="record-card__meta-item">' +
                    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>' +
                    'Witness: ' + UI.escapeHTML(entry.witnessName || 'Unknown') +
                    (entry.witnessRoll ? ' (Roll #' + entry.witnessRoll + ')' : '') +
                '</div>';
        }

        if (hasProof) {
            html += '<div class="record-card__evidence-thumbs">';
            entry.proofFiles.forEach(function (file) {
                if (file.dataUrl && file.type && file.type.indexOf('image/') === 0) {
                    html += '<img class="record-card__evidence-thumb" src="' + file.dataUrl + '" alt="' + UI.escapeHTML(file.name) + '" title="' + UI.escapeHTML(file.name) + '">';
                } else {
                    html +=
                        '<span class="record-card__evidence-file" title="' + UI.escapeHTML(file.name) + (file.dataUrl ? '' : ' (too large to preview, filename saved only)') + '">' +
                            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>' +
                            UI.escapeHTML(Utils.truncate(file.name, 18)) +
                        '</span>';
                }
            });
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    function renderCharts() {
        var entries = getEntries();
        renderCategoryChart(entries);
        renderAccusedChart(entries);
        renderTimelineChart(entries);
    }

    function renderCategoryChart(entries) {
        var container = document.getElementById('chart-category');
        if (!container) return;

        if (entries.length === 0) {
            container.innerHTML = '<div class="chart-empty">No data to display</div>';
            return;
        }

        var counts = {};
        entries.forEach(function (e) {
            counts[e.category] = (counts[e.category] || 0) + 1;
        });

        var sorted = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
        var max = counts[sorted[0]];

        var colorCycle = ['primary', 'danger', 'warning', 'info', 'secondary', 'purple', 'orange'];
        var html = '';

        sorted.forEach(function (cat, i) {
            var pct = (counts[cat] / max) * 100;
            var color = CATEGORY_COLORS[cat] || colorCycle[i % colorCycle.length];
            html +=
                '<div class="chart-bar">' +
                    '<span class="chart-bar__label">' + (CATEGORY_LABELS[cat] ? CATEGORY_LABELS[cat].split('/')[0].trim() : cat) + '</span>' +
                    '<div class="chart-bar__track">' +
                        '<div class="chart-bar__fill chart-bar__fill--' + color + '" style="width: ' + pct + '%;"></div>' +
                    '</div>' +
                    '<span class="chart-bar__value">' + counts[cat] + '</span>' +
                '</div>';
        });

        container.innerHTML = html;
    }

    function renderAccusedChart(entries) {
        var container = document.getElementById('chart-accused');
        if (!container) return;

        if (entries.length === 0) {
            container.innerHTML = '<div class="chart-empty">No data to display</div>';
            return;
        }

        var counts = {};
        entries.forEach(function (e) {
            counts[e.accused] = (counts[e.accused] || 0) + 1;
        });

        var sorted = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 5);
        var max = counts[sorted[0]];

        var colors = ['danger', 'warning', 'primary', 'info', 'secondary'];
        var html = '';

        sorted.forEach(function (roll, i) {
            var pct = (counts[roll] / max) * 100;
            html +=
                '<div class="chart-bar">' +
                    '<span class="chart-bar__label">Roll #' + roll + '</span>' +
                    '<div class="chart-bar__track">' +
                        '<div class="chart-bar__fill chart-bar__fill--' + colors[i % colors.length] + '" style="width: ' + pct + '%;"></div>' +
                    '</div>' +
                    '<span class="chart-bar__value">' + counts[roll] + '</span>' +
                '</div>';
        });

        container.innerHTML = html;
    }

    function renderTimelineChart(entries) {
        var container = document.getElementById('chart-timeline');
        if (!container) return;

        if (entries.length === 0) {
            container.innerHTML = '<div class="chart-empty" style="height: 100%; display: flex; align-items: center; justify-content: center;">No data to display</div>';
            return;
        }

        var days = [];
        var dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (var i = 6; i >= 0; i--) {
            var d = new Date();
            d.setDate(d.getDate() - i);
            var dateStr = d.toISOString().split('T')[0];
            days.push({
                date: dateStr,
                label: dayLabels[d.getDay()],
                count: 0
            });
        }

        entries.forEach(function (e) {
            var entryDate = e.timestamp.split('T')[0];
            var day = days.find(function (d) { return d.date === entryDate; });
            if (day) day.count++;
        });

        var maxCount = Math.max.apply(null, days.map(function (d) { return d.count; })) || 1;

        var html = '';
        days.forEach(function (day) {
            var heightPct = (day.count / maxCount) * 100;
            html +=
                '<div class="chart-timeline__bar">' +
                    '<span class="chart-timeline__count">' + (day.count || '') + '</span>' +
                    '<div class="chart-timeline__fill" style="height: ' + Math.max(heightPct, 3) + '%;"></div>' +
                    '<span class="chart-timeline__label">' + day.label + '</span>' +
                '</div>';
        });

        container.innerHTML = html;
    }

    document.addEventListener('DOMContentLoaded', init);

    return {};
})();
