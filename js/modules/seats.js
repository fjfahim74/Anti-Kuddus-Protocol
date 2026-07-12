const SeatsModule = (function () {
    let students = [];

    function init() {
        loadStudents();
        initForm();
        initControls();
        renderStudentList();

        var saved = Storage.get('seatplan');
        if (saved && saved.grid) {
            document.getElementById('grid-rows').value = saved.rows || 6;
            document.getElementById('grid-cols').value = saved.cols || 8;
            renderGrid(saved.grid, saved.rows, saved.cols);
        }
    }

    function loadStudents() {
        var saved = Storage.get('seatplan');
        students = saved && saved.students ? saved.students : [];
    }

    function saveStudents() {
        var saved = Storage.get('seatplan') || {};
        saved.students = students;
        Storage.set('seatplan', saved);
    }

    function initForm() {
        var form = document.getElementById('add-student-form');
        if (!form) return;

        var config = App.getConfig();
        var rollInput = document.getElementById('student-roll');
        if (rollInput && config) {
            rollInput.max = config.studentCount;
        }

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            var name = document.getElementById('student-name').value.trim();
            var roll = parseInt(document.getElementById('student-roll').value, 10);
            var height = parseInt(document.getElementById('student-height').value, 10);

            if (!name) {
                UI.toast('Please enter a student name', 'warning');
                return;
            }

            if (isNaN(roll) || roll < 1) {
                UI.toast('Please enter a valid roll number', 'warning');
                return;
            }

            if (students.some(function (s) { return s.roll === roll; })) {
                UI.toast('Roll #' + roll + ' already exists', 'error');
                return;
            }

            if (isNaN(height) || height < 100 || height > 220) {
                UI.toast('Height must be between 100 and 220 cm', 'warning');
                return;
            }

            students.push({ roll: roll, name: name, height: height });
            students.sort(function (a, b) { return a.roll - b.roll; });
            saveStudents();
            renderStudentList();

            form.reset();
            document.getElementById('student-name').focus();
            UI.toast(name + ' added', 'success', 1500);
        });
    }

    function initControls() {
        document.getElementById('generate-btn').addEventListener('click', generateLayout);

        document.getElementById('clear-students-btn').addEventListener('click', function () {
            if (students.length === 0) return;
            UI.confirm('Remove all students and clear the layout?', function () {
                students = [];
                Storage.remove('seatplan');
                renderStudentList();
                clearGrid();
                UI.toast('All students cleared', 'info');
            });
        });

        document.getElementById('save-layout-btn').addEventListener('click', function () {
            UI.toast('Layout saved!', 'success');
        });
    }

    function removeStudent(roll) {
        students = students.filter(function (s) { return s.roll !== roll; });
        saveStudents();
        renderStudentList();
    }

    function renderStudentList() {
        var container = document.getElementById('student-list');
        var totalEl = document.getElementById('student-total');
        if (!container) return;

        if (totalEl) totalEl.textContent = '(' + students.length + ')';

        if (students.length === 0) {
            container.innerHTML =
                '<div class="empty-state" style="padding: var(--space-8) var(--space-4);">' +
                    '<p class="empty-state__text">No students added yet.</p>' +
                '</div>';
            return;
        }

        var html = '';
        students.forEach(function (s) {
            html +=
                '<div class="student-item">' +
                    '<span class="student-item__roll">#' + s.roll + '</span>' +
                    '<span class="student-item__name">' + UI.escapeHTML(s.name) + '</span>' +
                    '<span class="student-item__height">' + s.height + 'cm</span>' +
                    '<button class="student-item__remove" data-roll="' + s.roll + '" aria-label="Remove ' + UI.escapeHTML(s.name) + '">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                    '</button>' +
                '</div>';
        });

        container.innerHTML = html;

        container.querySelectorAll('.student-item__remove').forEach(function (btn) {
            btn.addEventListener('click', function () {
                removeStudent(parseInt(btn.dataset.roll, 10));
            });
        });
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
                    el.className = 'seat-cell animate-in';
                    el.style.animationDelay = (r * cols + c) * 20 + 'ms';

                    var normalizedH = (cell.height - minH) / range;
                    var barClass = 'seat-cell__height-bar--short';
                    if (normalizedH > 0.66) barClass = 'seat-cell__height-bar--tall';
                    else if (normalizedH > 0.33) barClass = 'seat-cell__height-bar--avg';

                    el.innerHTML =
                        '<span class="seat-cell__name">' + UI.escapeHTML(cell.name) + '</span>' +
                        '<span class="seat-cell__roll">#' + cell.roll + '</span>' +
                        '<div class="seat-cell__height-bar ' + barClass + '"></div>';

                    el.title = cell.name + ' (Roll #' + cell.roll + ') — ' + cell.height + 'cm';
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
