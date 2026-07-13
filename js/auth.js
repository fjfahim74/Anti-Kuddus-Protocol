import { signIn, friendlyAuthError } from './firebase-auth.js';

const Auth = (function () {
    function init() {
        const form = document.getElementById('login-form');
        if (!form) return;

        form.addEventListener('submit', handleLogin);

        const instituteInput = document.getElementById('institute-name');
        const rollInput = document.getElementById('roll-number');
        const passwordInput = document.getElementById('password');

        if (instituteInput) instituteInput.addEventListener('input', () => clearError('institute'));
        if (rollInput) rollInput.addEventListener('input', () => clearError('roll'));
        if (passwordInput) passwordInput.addEventListener('input', () => clearError('password'));

        const clearDataBtn = document.getElementById('clear-data-btn');
        if (clearDataBtn) clearDataBtn.addEventListener('click', handleClearData);
    }

    async function handleLogin(e) {
        e.preventDefault();

        const instituteInput = document.getElementById('institute-name');
        const rollInput = document.getElementById('roll-number');
        const passwordInput = document.getElementById('password');
        const loginBtn = document.getElementById('login-btn');

        const instituteName = instituteInput.value.trim();
        const rollNumber = parseInt(rollInput.value, 10);
        const password = passwordInput.value;

        let hasError = false;

        const instituteError = Utils.validateRequired(instituteName, 'Institute/School name');
        if (instituteError) {
            showError('institute', instituteError);
            hasError = true;
        }

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

        UI.setLoading(loginBtn, true);

        try {
            const profile = await signIn(rollNumber, password, instituteName);
            UI.toast('Welcome back, ' + profile.name + '!', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 500);
        } catch (err) {
            UI.setLoading(loginBtn, false);
            const message = friendlyAuthError(err);
            if (err && err.code === 'akp/institute-mismatch') {
                showError('institute', message);
            } else if (err && err.code === 'auth/user-not-found') {
                showError('roll', message);
            } else {
                showError('password', message);
            }
            shakeCard();
        }
    }

    function handleClearData() {
        UI.confirm('This clears data cached on this device (your session cache). Your account itself stays safe in the cloud and you can sign back in normally. Continue?', () => {
            Storage.clear();
            UI.modal({
                title: 'Local Cache Cleared',
                content: '<p>Local cache cleared. Sign in again with your roll number and password.</p>',
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

    function fieldInputId(field) {
        if (field === 'roll') return 'roll-number';
        if (field === 'institute') return 'institute-name';
        return field;
    }

    function showError(field, message) {
        const errorEl = document.getElementById(field + '-error');
        const inputEl = document.getElementById(fieldInputId(field));

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
        const inputEl = document.getElementById(fieldInputId(field));

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

window.Auth = Auth;