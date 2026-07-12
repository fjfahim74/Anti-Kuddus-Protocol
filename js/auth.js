const Auth = (function () {
    function init() {
        const form = document.getElementById('login-form');
        if (!form) return;

        form.addEventListener('submit', handleLogin);

        const rollInput = document.getElementById('roll-number');
        const nameInput = document.getElementById('name');

        rollInput.addEventListener('input', () => clearError('roll'));
        nameInput.addEventListener('input', () => clearError('name'));

        populateFromConfig();
    }

    function populateFromConfig() {
        const config = Storage.get('config');
        if (!config) return;

        const subtitle = document.getElementById('login-subtitle');
        if (subtitle) {
            subtitle.textContent = config.schoolName + ' — Class ' + config.className;
        }

        const rollInput = document.getElementById('roll-number');
        if (rollInput) {
            rollInput.max = config.studentCount;
            rollInput.placeholder = 'Enter roll number (1-' + config.studentCount + ')';
        }

        const rollHint = document.getElementById('roll-hint');
        if (rollHint) {
            rollHint.textContent = 'Your class roll number between 1 and ' + config.studentCount;
        }
    }

    function handleLogin(e) {
        e.preventDefault();

        const config = Storage.get('config');
        const maxStudents = config ? config.studentCount : 60;

        const rollInput = document.getElementById('roll-number');
        const nameInput = document.getElementById('name');
        const roleInput = document.querySelector('input[name="role"]:checked');
        const loginBtn = document.getElementById('login-btn');

        const rollNumber = parseInt(rollInput.value, 10);
        const name = nameInput.value.trim();
        const role = roleInput ? roleInput.value : 'student';

        let hasError = false;

        const rollError = Utils.validateRollNumber(rollInput.value, maxStudents);
        if (rollError) {
            showError('roll', rollError);
            hasError = true;
        }

        const nameError = Utils.validateRequired(name, 'Name') || Utils.validateMinLength(name, 2, 'Name');
        if (nameError) {
            showError('name', nameError);
            hasError = true;
        }

        if (hasError) {
            const card = document.querySelector('.login-card');
            card.classList.add('shake');
            card.addEventListener('animationend', () => card.classList.remove('shake'), { once: true });
            return;
        }

        UI.setLoading(loginBtn, true);

        setTimeout(() => {
            const session = {
                rollNumber: rollNumber,
                name: name,
                role: role,
                isLoggedIn: true,
                loginTime: new Date().toISOString()
            };

            Storage.set('session', session);
            UI.toast('Welcome, ' + name + '!', 'success');

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 500);
        }, 600);
    }

    function showError(field, message) {
        const errorEl = document.getElementById(field + '-error');
        const inputEl = document.getElementById(field === 'roll' ? 'roll-number' : field);

        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.remove('hidden');
        }

        if (inputEl) {
            inputEl.classList.add('form-input--error');
        }
    }

    function clearError(field) {
        const errorEl = document.getElementById(field + '-error');
        const inputEl = document.getElementById(field === 'roll' ? 'roll-number' : field);

        if (errorEl) {
            errorEl.textContent = '';
            errorEl.classList.add('hidden');
        }

        if (inputEl) {
            inputEl.classList.remove('form-input--error');
        }
    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        handleLogin
    };
})();
