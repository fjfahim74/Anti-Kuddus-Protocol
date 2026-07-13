const SeatsModule = (function () {
    let students = [];

    var MOCK_NAMES = [
        'Rahim', 'Karim', 'Fatima', 'Ayesha', 'Tanvir', 'Sadia', 'Nayeem', 'Mim',
        'Arif', 'Rifat', 'Nusrat', 'Shanto', 'Priya', 'Tanjim', 'Farhan', 'Lamia',
        'Hridoy', 'Jannat', 'Rakib', 'Sumaiya', 'Imran', 'Tasnim', 'Rezwan', 'Anika',
        'Sabbir', 'Mahin', 'Ruma', 'Zarin', 'Nafis', 'Ishika'
    ];

    function init() {
        loadStudents();
        initForm();
        initControls();
        renderStudentList();

        var saved = Storage.get('seatplan');
        if (saved) {
            if (saved.rows) document.getElementById('grid-rows').value = saved.rows;
            if (saved.cols) document.getElementById('grid-cols').value = saved.cols;
            if (saved.algorithm) document.getElementById('sort-algorithm').value = saved.algorithm;
        }

        // Roster (mock or real) always has data now, so render the seating
        // chart immediately instead of waiting for a manual "Generate" click.
        generateLayout();
    }

    // Deterministic-ish pseudo-random height so the same roll always gets
    // the same mock height until they report a real one and re-save.
    function mockHeightForRoll(roll) {
        var seed = Math.sin(roll * 9301 + 49297) * 233280;
        var frac = seed - Math.floor(seed);
        return Math.round(140 + frac * 45); // ~140cm - 185cm mock range
    }

    function mockNameForRoll(roll) {
        var base = MOCK_NAMES[(roll - 1) % MOCK_NAMES.length];
        return roll > MOCK_NAMES.length ? base + ' ' + roll : base;
    }

    function buildMockRoster(count) {
        var roster = [];
        for (var i = 1; i <= count; i++) {
            roster.push({
                roll: i,
                name: mockNameForRoll(i),
                height: mockHeightForRoll(i),
                reported: false
            });
        }
        return roster;
    }

    function loadStudents() {
        var saved = Storage.get('seatplan');
        var totalCount = App.getStudentCount() || 60;

        if (saved && saved.students && saved.students.length === totalCount) {
            students = saved.students;
        } else {
            // No roster yet, or class size changed in setup — regenerate
            // mock placeholders for everyone (real reported heights, if any
            // still fit the new count, are preserved by roll below).
            var previous = (saved && saved.students) || [];
            students = buildMockRoster(totalCount);
            previous.forEach(function (p) {
                if (p.reported && p.roll <= totalCount) {
                    var match = students.find(function (s) { return s.roll === p.roll; });
                    if (match) {
                        match.name = p.name;
                        match.height = p.height;
                        match.reported = true;
                    }
                }
            });
            saveStudents();
        }

        syncCurrentUserIdentity();
    }

    // Keeps the logged-in student's name in the roster matched to their
    // session, and reflects it in the "My Height" card.
    function syncCurrentUserIdentity() {
        var session = App.getSession();
        var identityEl = document.getElementById('my-height-identity');
        if (!session || !session.rollNumber) return;

        var me = students.find(function (s) { return s.roll === session.rollNumber; });
        if (me) {
            me.name = session.name || me.name;
            me.isYou = true;

            if (me.reported) {
                var fi = Utils.cmToFeetInches(me.height);
                var feetInput = document.getElementById('student-height-feet');
                var inchesInput = document.getElementById('student-height-inches');
                if (feetInput) feetInput.value = fi.feet;
                if (inchesInput) inchesInput.value = fi.inches;
            }
        }

        if (identityEl) {
            identityEl.innerHTML = 'You are <strong>' + UI.escapeHTML(session.name || 'Student') +
                '</strong>, Roll <strong>#' + session.rollNumber + '</strong>';
        }
    }

    function saveStudents() {
        var saved = Storage.get('seatplan') || {};
        saved.students = students;
        Storage.set('seatplan', saved);
    }

    function initForm() {
        var form = document.getElementById('my-height-form');
        if (!form) return;

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            var session = App.getSession();
            if (!session || !session.rollNumber) {
                UI.toast('Could not identify your account. Please log in again.', 'error');
                return;
            }

            var feetInput = document.getElementById('student-height-feet').value;
            var inchesInput = document.getElementById('student-height-inches').value;
            var feet = parseInt(feetInput, 10);
            var inches = parseInt(inchesInput, 10);

            if (isNaN(feet)) feet = 0;
            if (isNaN(inches)) inches = 0;

            var height = Utils.feetInchesToCm(feet, inches);

            if (isNaN(height) || height < 100 || height > 220) {
                UI.toast('Height must be between 3\'3" and 7\'2"', 'warning');
                return;
            }

            var me = students.find(function (s) { return s.roll === session.rollNumber; });
            if (!me) {
                me = { roll: session.rollNumber, name: session.name, isYou: true };
                students.push(me);
                students.sort(function (a, b) { return a.roll - b.roll; });
            }

            me.name = session.name || me.name;
            me.height = height;
            me.reported = true;
            me.isYou = true;

            saveStudents();
            renderStudentList();

            // Update the seating chart immediately — no separate "Generate" click needed.
            generateLayout();

            UI.toast('Your height was saved — seating chart updated', 'success', 1800);
        });
    }

    function initControls() {
        document.getElementById('generate-btn').addEventListener('click', generateLayout);

        document.getElementById('clear-students-btn').addEventListener('click', function () {
            UI.confirm('Reset everyone\'s height back to placeholder mock data? Your own reported height will be lost too.', function () {
                var totalCount = App.getStudentCount() || 60;
                students = buildMockRoster(totalCount);
                saveStudents();
                syncCurrentUserIdentity();
                var feetInput = document.getElementById('student-height-feet');
                var inchesInput = document.getElementById('student-height-inches');
                if (feetInput) feetInput.value = '';
                if (inchesInput) inchesInput.value = '';
                renderStudentList();
                generateLayout();
                UI.toast('Roster reset to mock data', 'info');
            });
        });

        document.getElementById('save-layout-btn').addEventListener('click', function () {
            UI.toast('Layout saved!', 'success');
        });
    }

    function renderStudentList() {
        var container = document.getElementById('student-list');
        var totalEl = document.getElementById('student-total');
        if (!container) return;

        if (totalEl) totalEl.textContent = '(' + students.length + ')';

        if (students.length === 0) {
            container.innerHTML =
                '<div class="empty-state" style="padding: var(--space-8) var(--space-4);">' +
                    '<p class="empty-state__text">No students in class yet. Set a class size in Setup.</p>' +
                '</div>';
            return;
        }

        var html = '';
        students.forEach(function (s) {
            var itemClass = 'student-item' + (s.isYou ? ' student-item--you' : '');
            var statusBadge = s.reported
                ? '<span class="student-item__status student-item__status--reported" title="Real height reported">✓</span>'
                : '<span class="student-item__status student-item__status--mock" title="Placeholder mock data">mock</span>';

            html +=
                '<div class="' + itemClass + '">' +
                    '<span class="student-item__roll">#' + s.roll + '</span>' +
                    '<span class="student-item__name">' + UI.escapeHTML(s.name) + (s.isYou ? ' <em>(You)</em>' : '') + '</span>' +
                    '<span class="student-item__height">' + Utils.formatFeetInches(s.height) + '</span>' +
                    statusBadge +
                '</div>';
        });

        container.innerHTML = html;
    }

    function generateLayout() {
        var rows = parseInt(document.getElementById('grid-rows').value, 10) || 6;
        var cols = parseInt(document.getElementById('grid-cols').value, 10) || 8;
        var algorithm = document.getElementById('sort-algorithm').value;

        if (students.length === 0) {
            UI.toast('Add students first before generating', 'warning');
            return;
        }

        var sorted = students.slice();

        switch (algorithm) {
            case 'height-asc':
                sorted.sort(function (a, b) { return a.height - b.height; });
                break;
            case 'height-desc':
                sorted.sort(function (a, b) { return b.height - a.height; });
                break;
            case 'roll':
                sorted.sort(function (a, b) { return a.roll - b.roll; });
                break;
            case 'random':
                for (var i = sorted.length - 1; i > 0; i--) {
                    var j = Math.floor(Math.random() * (i + 1));
                    var temp = sorted[i];
                    sorted[i] = sorted[j];
                    sorted[j] = temp;
                }
                break;
        }

        var totalSeats = rows * cols;
        var grid = [];
        var idx = 0;

        for (var r = 0; r < rows; r++) {
            var row = [];
            for (var c = 0; c < cols; c++) {
                if (idx < sorted.length) {
                    row.push(sorted[idx]);
                    idx++;
                } else {
                    row.push(null);
                }
            }
            grid.push(row);
        }

        var seatplan = {
            rows: rows,
            cols: cols,
            students: students,
            grid: grid,
            algorithm: algorithm,
            lastGenerated: new Date().toISOString()
        };

        Storage.set('seatplan', seatplan);
        renderGrid(grid, rows, cols);
        UI.toast('Seating layout generated!', 'success');
    }

    function renderGrid(grid, rows, cols) {
        var container = document.getElementById('classroom-grid');
        if (!container) return;

        var allHeights = [];
        grid.forEach(function (row) {
            row.forEach(function (cell) {
                if (cell && cell.height) allHeights.push(cell.height);
            });
        });

        var minH = Math.min.apply(null, allHeights);
        var maxH = Math.max.apply(null, allHeights);
        var range = maxH - minH || 1;

        container.innerHTML = '';
        container.style.display = 'block';

        var table = document.createElement('div');
        table.className = 'classroom-grid__table';
        table.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';

        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                var cell = grid[r][c];
                var el = document.createElement('div');

                if (cell) {
                    el.className = 'seat-cell animate-in' +
                        (cell.isYou ? ' seat-cell--you' : '') +
                        (!cell.reported ? ' seat-cell--mock' : '');
                    el.style.animationDelay = (r * cols + c) * 20 + 'ms';

                    var normalizedH = (cell.height - minH) / range;
                    var barClass = 'seat-cell__height-bar--short';
                    if (normalizedH > 0.66) barClass = 'seat-cell__height-bar--tall';
                    else if (normalizedH > 0.33) barClass = 'seat-cell__height-bar--avg';

                    el.innerHTML =
                        '<span class="seat-cell__name">' + UI.escapeHTML(cell.name) + '</span>' +
                        '<span class="seat-cell__roll">#' + cell.roll + '</span>' +
                        '<div class="seat-cell__height-bar ' + barClass + '"></div>';

                    el.title = cell.name + ' (Roll #' + cell.roll + ') — ' + Utils.formatFeetInches(cell.height) +
                        (cell.reported ? '' : ' (mock)');
                } else {
                    el.className = 'seat-cell seat-cell--empty';
                }

                table.appendChild(el);
            }
        }

        container.appendChild(table);

        var legend = document.getElementById('height-legend');
        if (legend) legend.style.display = 'flex';
    }

    function clearGrid() {
        var container = document.getElementById('classroom-grid');
        if (container) {
            container.style.display = 'flex';
            container.innerHTML =
                '<div class="classroom-grid__empty">' +
                    '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>' +
                    '<p>Add students and click <strong>Generate Layout</strong> to create the seating plan</p>' +
                '</div>';
        }
        var legend = document.getElementById('height-legend');
        if (legend) legend.style.display = 'none';
    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        generateLayout: generateLayout
    };
})();
