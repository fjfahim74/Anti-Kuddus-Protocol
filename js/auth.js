const Auth = (function () {
    function init() {
        var form = document.getElementById('login-form');
        if (!form) return;

        form.addEventListener('submit', handleSignIn);

        var rollInput = document.getElementById('roll-number');
        var passInput = document.getElementById('password');

        if (rollInput) rollInput.addEventListener('input', function () { clearFieldError('roll'); hideGlobalError(); });
        if (passInput) passInput.addEventListener('input', function () { clearFieldError('password'); hideGlobalError(); });

        populateFromConfig();
    }

    function populateFromConfig() {
        var config = Storage.get('config');
        if (!config) return;

        var subtitle = document.getElementById('login-subtitle');
        if (subtitle) {
            subtitle.textContent = config.schoolName + ' — Class ' + config.className;
        }

        var rollInput = document.getElementById('roll-number');
        if (rollInput) {
            rollInput.max = config.studentCount;
            rollInput.placeholder = 'Roll number (1-' + config.studentCount + ')';
        }
    }

    function handleSignIn(e) {
        e.preventDefault();

        var rollInput = document.getElementById('roll-number');
        var passInput = document.getElementById('password');
        var loginBtn = document.getElementById('login-btn');

        var rollNumber = parseInt(rollInput.value, 10);
        var password = passInput.value;

        var hasError = false;

        if (isNaN(rollNumber) || rollNumber < 1) {
            showFieldError('roll', 'Enter a valid roll number');
            hasError = true;
        }

        if (!password) {
            showFieldError('password', 'Password is required');
            hasError = true;
        }

        if (hasError) {
            shakeCard();
            return;
        }

        var users = Storage.get('users') || [];
        var user = users.find(function (u) { return u.rollNumber === rollNumber; });

        if (!user) {
            showGlobalError('No account found with Roll #' + rollNumber + '. Please sign up first.');
            shakeCard();
            return;
        }

        if (user.password !== password) {
            showGlobalError('Incorrect password. Please try again.');
            shakeCard();
            return;
        }

        UI.setLoading(loginBtn, true);

        setTimeout(function () {
            var session = {
                rollNumber: user.rollNumber,
                name: user.name,
                role: user.role,
                isLoggedIn: true,
                loginTime: new Date().toISOString()
            };

            Storage.set('session', session);
            UI.toast('Welcome back, ' + user.name + '!', 'success');

            setTimeout(function () {
                window.location.href = 'dashboard.html';
            }, 500);
        }, 600);
    }

    function showFieldError(field, message) {
        var errorEl = document.getElementById(field + '-error');
        var inputEl = document.getElementById(field === 'roll' ? 'roll-number' : field);

        if (errorEl) { errorEl.textContent = message; errorEl.classList.remove('hidden'); }
        if (inputEl) { inputEl.classList.add('form-input--error'); }
    }

    function clearFieldError(field) {
        var errorEl = document.getElementById(field + '-error');
        var inputEl = document.getElementById(field === 'roll' ? 'roll-number' : field);

        if (errorEl) { errorEl.textContent = ''; errorEl.classList.add('hidden'); }
        if (inputEl) { inputEl.classList.remove('form-input--error'); }
    }

    function showGlobalError(message) {
        var el = document.getElementById('login-error');
        if (el) { el.textContent = message; el.style.display = 'block'; }
    }

    function hideGlobalError() {
        var el = document.getElementById('login-error');
        if (el) { el.textContent = ''; el.style.display = 'none'; }
    }

    function shakeCard() {
        var card = document.querySelector('.login-card');
        if (card) {
            card.classList.add('shake');
            card.addEventListener('animationend', function () { card.classList.remove('shake'); }, { once: true });
        }
    }

    document.addEventListener('DOMContentLoaded', init);

    return {};
})();
