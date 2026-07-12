const Auth = (function () {
    function init() {
        // Guard: if already logged in, redirect to Dashboard
        var session = Storage.get('session');
        if (session && session.isLoggedIn) {
            window.location.href = 'dashboard.html';
            return;
        }

        var instSetupCard = document.getElementById('inst-setup-card');
        var signinCard = document.getElementById('signin-card');

        if (instSetupCard) instSetupCard.classList.add('hidden');
        if (signinCard) signinCard.classList.remove('hidden');

        var loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.addEventListener('submit', handleSignIn);

        var rollInput = document.getElementById('roll-number');
        var passInput = document.getElementById('password');

        if (rollInput) rollInput.addEventListener('input', function () { clearFieldError('roll'); hideGlobalError(); });
        if (passInput) passInput.addEventListener('input', function () { clearFieldError('password'); hideGlobalError(); });

        var clearDataBtn = document.getElementById('clear-data-btn');
        if (clearDataBtn) clearDataBtn.addEventListener('click', handleClearData);

        populateFromConfig();
    }

    function populateFromConfig() {
        var config = Storage.get('config');
        var subtitle = document.getElementById('login-subtitle');
        if (subtitle) {
            if (config && config.schoolName) {
                var cls = config.class || (config.className ? config.className.split(' ')[0] : '');
                var sec = config.section || (config.className ? config.className.split(' ').slice(1).join(' ') : '');
                subtitle.textContent = config.schoolName + ' — ' + cls + ' ' + sec;
            } else {
                subtitle.textContent = 'Welcome back to Anti-Kuddus Protocol';
            }
        }

        var rollInput = document.getElementById('roll-number');
        if (rollInput) {
            rollInput.placeholder = 'Enter your roll number';
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

        if (isNaN(rollNumber) || rollInput.value.trim() === "") {
            showFieldError('roll', 'Roll Number is required');
            hasError = true;
        }

        if (!password) {
            showFieldError('password', 'Password is required');
            hasError = true;
        }

        if (hasError) {
            shakeCard('#signin-card');
            return;
        }

        var users = Storage.get('users') || [];
        var user = users.find(function (u) { return u.rollNumber === rollNumber; });

        if (!user) {
            showGlobalError('No account found with Roll #' + rollNumber + '. Please sign up first.');
            shakeCard('#signin-card');
            return;
        }

        if (user.password !== password) {
            showGlobalError('Incorrect password. Please try again.');
            shakeCard('#signin-card');
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

    function handleClearData() {
        UI.confirm('Are you sure you want to clear all platform data? This will permanently delete all users, complaints, rules, seat plans, and your active session.', function () {
            Storage.clear();
            localStorage.clear();
            UI.toast('All platform data cleared!', 'success');
            setTimeout(function () {
                window.location.reload();
            }, 800);
        });
    }

    function showFieldError(field, message) {
        var errorEl = document.getElementById(field + '-error');
        var inputIdMap = {
            'roll': 'roll-number',
            'password': 'password',
            'setup-school': 'setup-school-name',
            'setup-class': 'setup-class-name',
            'setup-section': 'setup-section-name'
        };
        var inputEl = document.getElementById(inputIdMap[field]);

        if (errorEl) { errorEl.textContent = message; errorEl.classList.remove('hidden'); }
        if (inputEl) { inputEl.classList.add('form-input--error'); }
    }

    function clearFieldError(field) {
        var errorEl = document.getElementById(field + '-error');
        var inputIdMap = {
            'roll': 'roll-number',
            'password': 'password',
            'setup-school': 'setup-school-name',
            'setup-class': 'setup-class-name',
            'setup-section': 'setup-section-name'
        };
        var inputEl = document.getElementById(inputIdMap[field]);

        if (errorEl) { errorEl.textContent = ''; errorEl.classList.add('hidden'); }
        if (inputEl) { inputEl.classList.remove('form-input--error'); }
    }

    function showGlobalError(message) {
        var el = document.getElementById('login-error');
        if (el) { el.textContent = message; el.classList.remove('hidden'); el.style.display = 'block'; }
    }

    function hideGlobalError() {
        var el = document.getElementById('login-error');
        if (el) { el.textContent = ''; el.classList.add('hidden'); el.style.display = 'none'; }
    }

    function shakeCard(selector) {
        var card = document.querySelector(selector || '.login-card');
        if (card) {
            card.classList.add('shake');
            card.addEventListener('animationend', function () { card.classList.remove('shake'); }, { once: true });
        }
    }

    document.addEventListener('DOMContentLoaded', init);

    return {};
})();
