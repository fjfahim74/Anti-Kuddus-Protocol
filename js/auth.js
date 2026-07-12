const Auth = (function () {
    function init() {
        const form = document.getElementById('login-form');
        if (!form) return;

        form.addEventListener('submit', handleLogin);

        const rollInput = document.getElementById('roll-number');
        const passwordInput = document.getElementById('password');

        if (rollInput) rollInput.addEventListener('input', () => clearError('roll'));
        if (passwordInput) passwordInput.addEventListener('input', () => clearError('password'));

        const clearDataBtn = document.getElementById('clear-data-btn');
        if (clearDataBtn) clearDataBtn.addEventListener('click', handleClearData);
    }

    function handleLogin(e) {
        e.preventDefault();

        const rollInput = document.getElementById('roll-number');
        const passwordInput = document.getElementById('password');
        const loginBtn = document.getElementById('login-btn');

        const rollNumber = parseInt(rollInput.value, 10);
        const password = passwordInput.value;

        let hasError = false;

        const rollError = Utils.validateRequired(rollInput.value, 'Roll number');
        if (rollError) {
            showError('roll', rollError);
            hasError = true;
        }

        const passwordError = Utils.validateRequired(password, 'Password');
        if (passwordError) {
            showError('password', passwordError);
            hasError = true;
        }

        if (hasError) {
            shakeCard();
            return;
        }

        const account = Storage.get('account');

        if (!account) {
            showError('roll', "No account found on this device. Please sign up first.");
            shakeCard();
            return;
        }

        if (account.rollNumber !== rollNumber) {
            showError('roll', 'No account found with that roll number.');
            shakeCard();
            return;
        }

        if (account.password !== password) {
            showError('password', 'Incorrect password.');
            shakeCard();
            return;
        }

        UI.setLoading(loginBtn, true);

        setTimeout(() => {
            const session = {
                rollNumber: account.rollNumber,
                name: account.name,
                role: account.role,
                captainLevel: account.captainLevel || null,
                isLoggedIn: true,
                loginTime: new Date().toISOString()
            };

            Storage.set('session', session);
            UI.toast('Welcome back, ' + account.name + '!', 'success');

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 500);
        }, 500);
    }

    function handleClearData() {
        UI.confirm('This will erase all data saved on this device (your account, complaints, everything). You will need to sign up again. Continue?', () => {
            Storage.clear();
            UI.modal({
                title: 'Data Cleared',
                content: '<p>All local data has been cleared. You can sign up again whenever you\'re ready.</p>',
                confirmText: 'OK',
                showCancel: false
            });

            const form = document.getElementById('login-form');
            if (form) form.reset();
        });
    }

    function shakeCard() {
        const card = document.querySelector('.login-card');
        if (!card) return;
        card.classList.add('shake');
        card.addEventListener('animationend', () => card.classList.remove('shake'), { once: true });
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
