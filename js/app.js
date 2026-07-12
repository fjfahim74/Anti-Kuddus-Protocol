const App = (function () {
    const PROTECTED_PAGES = [
        'dashboard.html',
        'complaint.html',
        'seats.html',
        'study.html',
        'corruption.html',
        'sos.html',
        'rules.html'
    ];

    function init() {
        applyTheme();
        checkAuth();
        initNavbar();
        initSeedData();
        initSoundEffects();
    }

    // --- Theme ---
    function applyTheme(theme) {
        const config = getConfig();
        const resolved = theme || (config && config.theme) || 'dark';
        document.documentElement.setAttribute('data-theme', resolved);
    }

    function setTheme(theme) {
        const config = getConfig() || {};
        config.theme = theme;
        Storage.set('config', config);
        applyTheme(theme);
    }

    // --- Sound Effects ---
    let audioCtx = null;

    function isSoundEnabled() {
        const config = getConfig();
        return !config || config.soundEnabled !== false;
    }

    function setSoundEnabled(enabled) {
        const config = getConfig() || {};
        config.soundEnabled = enabled;
        Storage.set('config', config);
    }

    function ensureAudioCtx() {
        if (audioCtx) return audioCtx;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return null;
        audioCtx = new AudioContextClass();
        return audioCtx;
    }

    function playClickSound() {
        if (!isSoundEnabled()) return;
        try {
            const ctx = ensureAudioCtx();
            if (!ctx) return;

            const fire = () => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(720, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + 0.08);

                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start();
                osc.stop(ctx.currentTime + 0.1);
            };

            // AudioContext.resume() is asynchronous — the sound must be
            // scheduled only after the context has actually resumed,
            // otherwise it gets silently dropped while suspended.
            if (ctx.state === 'suspended') {
                ctx.resume().then(fire).catch(() => {});
            } else {
                fire();
            }
        } catch (e) {
            // Audio not available — fail silently
        }
    }

    function initSoundEffects() {
        // Unlock/create the AudioContext on the very first user gesture so
        // it's already running (not "suspended") by the time a click needs it.
        const unlock = () => {
            ensureAudioCtx();
            if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
            document.removeEventListener('pointerdown', unlock, true);
        };
        document.addEventListener('pointerdown', unlock, true);

        document.addEventListener('click', (e) => {
            const target = e.target.closest('button, .btn, a.btn, .chip--clickable, .tab, .tabs__btn, .role-option label, .severity-option, [role="button"]');
            if (target) playClickSound();
        }, true);
    }

    function checkAuth() {
        const session = Storage.get('session');
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';

        const isProtected = PROTECTED_PAGES.some(
            (p) => currentPage === p || currentPage.endsWith('/' + p)
        );

        if (isProtected && (!session || !session.isLoggedIn)) {
            Utils.navigate('login.html');
            return;
        }

        if (currentPage === 'login.html' && session && session.isLoggedIn) {
            Utils.navigate('dashboard.html');
            return;
        }
    }

    function getSession() {
        return Storage.get('session');
    }

    function getConfig() {
        return Storage.get('config');
    }

    function isLoggedIn() {
        const session = getSession();
        return session && session.isLoggedIn;
    }

    function isSetupComplete() {
        const config = getConfig();
        return config && config.setupComplete;
    }

    function getSchoolName() {
        const config = getConfig();
        return config ? config.schoolName : 'My School';
    }

    function getClassName() {
        const config = getConfig();
        return config ? config.className : 'My Class';
    }

    function getStudentCount() {
        const config = getConfig();
        return config ? config.studentCount : 60;
    }

    function getCaptainName(level) {
        const config = getConfig();
        if (!config) return 'Captain';
        if (level === 2) return config.captain2Name || '2nd Captain';
        if (level === 3) return config.captain3Name || '3rd Captain';
        return config.captain1Name || config.captainName || 'Captain';
    }

    function getDisplayName() {
        const config = getConfig();
        if (!config) return 'Classroom Governance Platform';
        const classLabel = config.section ? config.className + '-' + config.section : config.className;
        return config.schoolName + ' — Class ' + classLabel;
    }

    function logout() {
        Storage.remove('session');
        Utils.navigate('index.html');
    }

    function resetSetup() {
        Storage.clear();
        Utils.navigate('index.html');
    }

    function initNavbar() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;

        const session = getSession();
        if (!session) return;

        const userEl = navbar.querySelector('.navbar__user');
        if (userEl) {
            const avatar = userEl.querySelector('.navbar__avatar');
            const nameEl = userEl.querySelector('.navbar__name');

            if (avatar) avatar.textContent = Utils.getInitials(session.name);
            if (nameEl) nameEl.textContent = session.name;

            userEl.addEventListener('click', () => openProfileModal());
            userEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openProfileModal();
                }
            });
        }

        const logoutBtn = navbar.querySelector('.navbar__logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                UI.confirm('Are you sure you want to sign out?', () => {
                    logout();
                });
            });
        }
    }

    // --- Profile / Settings Modal ---
    const ROLE_OPTIONS = [
        { value: 'student', label: 'Student' },
        { value: 'captain', label: 'Captain' }
    ];

    function openProfileModal() {
        const session = getSession();
        const config = getConfig();
        if (!session) return;

        const roleOptionsHTML = ROLE_OPTIONS.map((r) =>
            `<option value="${r.value}" ${session.role === r.value ? 'selected' : ''}>${r.label}</option>`
        ).join('');

        const content = `
            <div class="profile-modal">
                <div class="profile-modal__tabs">
                    <button type="button" class="profile-modal__tab profile-modal__tab--active" data-ptab="profile">Profile</button>
                    <button type="button" class="profile-modal__tab" data-ptab="settings">Settings</button>
                </div>

                <div class="profile-modal__panel" data-ppanel="profile">
                    <div class="profile-modal__avatar">
                        <div class="profile-modal__avatar-circle">${Utils.getInitials(session.name)}</div>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="profile-name">Your Name</label>
                        <input type="text" id="profile-name" class="form-input" value="${UI.escapeHTML(session.name || '')}">
                    </div>
                    <div class="setup-row" style="display:grid; grid-template-columns:1fr 1fr; gap: var(--space-4);">
                        <div class="form-group">
                            <label class="form-label" for="profile-roll">Roll Number</label>
                            <input type="number" id="profile-roll" class="form-input" value="${session.rollNumber}" min="1" max="${config ? config.studentCount : 200}">
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="profile-role">Role</label>
                            <select id="profile-role" class="form-input">${roleOptionsHTML}</select>
                        </div>
                    </div>
                    <div class="form-group ${session.role === 'captain' ? '' : 'hidden'}" id="profile-captain-level-group">
                        <label class="form-label" for="profile-captain-level">Which Captain?</label>
                        <select id="profile-captain-level" class="form-input">
                            <option value="1" ${session.captainLevel == 1 ? 'selected' : ''}>Captain 1</option>
                            <option value="2" ${session.captainLevel == 2 ? 'selected' : ''}>Captain 2</option>
                            <option value="3" ${session.captainLevel == 3 ? 'selected' : ''}>Captain 3</option>
                        </select>
                    </div>
                    <p class="profile-modal__meta">${config ? UI.escapeHTML(config.schoolName + ' — Class ' + config.className + (config.section ? '-' + config.section : '')) : ''}</p>
                    <span class="form-error hidden" id="profile-error"></span>
                </div>

                <div class="profile-modal__panel hidden" data-ppanel="settings">
                    <div class="profile-modal__setting-row">
                        <div>
                            <strong>Touch Sound</strong>
                            <p class="profile-modal__setting-desc">Play a subtle sound when tapping buttons</p>
                        </div>
                        <label class="toggle" for="settings-sound">
                            <input type="checkbox" id="settings-sound" ${isSoundEnabled() ? 'checked' : ''}>
                            <span class="toggle__slider"></span>
                        </label>
                    </div>
                    <div class="profile-modal__setting-row">
                        <div>
                            <strong>Dark Mode</strong>
                            <p class="profile-modal__setting-desc">Switch between dark and light appearance</p>
                        </div>
                        <label class="toggle" for="settings-theme">
                            <input type="checkbox" id="settings-theme" ${(config ? config.theme : 'dark') === 'dark' ? 'checked' : ''}>
                            <span class="toggle__slider"></span>
                        </label>
                    </div>
                </div>
            </div>
        `;

        const modalEl = UI.modal({
            title: 'Profile & Settings',
            content,
            confirmText: 'Save Changes',
            cancelText: 'Close',
            onConfirm: () => saveProfileChanges()
        });

        // Tab switching
        const tabs = modalEl.querySelectorAll('.profile-modal__tab');
        tabs.forEach((tab) => {
            tab.addEventListener('click', () => {
                tabs.forEach((t) => t.classList.remove('profile-modal__tab--active'));
                tab.classList.add('profile-modal__tab--active');
                modalEl.querySelectorAll('.profile-modal__panel').forEach((p) => {
                    p.classList.toggle('hidden', p.dataset.ppanel !== tab.dataset.ptab);
                });
            });
        });

        // Live-apply settings so the person can preview before saving
        const soundToggle = modalEl.querySelector('#settings-sound');
        const themeToggle = modalEl.querySelector('#settings-theme');

        if (soundToggle) {
            soundToggle.addEventListener('change', () => {
                setSoundEnabled(soundToggle.checked);
                if (soundToggle.checked) playClickSound();
            });
        }

        if (themeToggle) {
            themeToggle.addEventListener('change', () => {
                setTheme(themeToggle.checked ? 'dark' : 'light');
            });
        }

        // Show/hide captain level based on role selection
        const roleSelect = modalEl.querySelector('#profile-role');
        const captainLevelGroup = modalEl.querySelector('#profile-captain-level-group');
        if (roleSelect && captainLevelGroup) {
            roleSelect.addEventListener('change', () => {
                captainLevelGroup.classList.toggle('hidden', roleSelect.value !== 'captain');
            });
        }
    }

    function saveProfileChanges() {
        const session = getSession();
        if (!session) return;

        const nameInput = document.getElementById('profile-name');
        const rollInput = document.getElementById('profile-roll');
        const roleInput = document.getElementById('profile-role');
        if (!nameInput || !rollInput || !roleInput) return;

        const captainLevelInput = document.getElementById('profile-captain-level');
        const name = nameInput.value.trim();
        const rollNumber = parseInt(rollInput.value, 10);
        const role = roleInput.value;
        const captainLevel = role === 'captain' ? parseInt(captainLevelInput ? captainLevelInput.value : 1, 10) : null;
        const config = getConfig();
        const maxStudents = config ? config.studentCount : 200;

        if (!name || name.length < 2) {
            UI.toast('Name must be at least 2 characters', 'warning');
            return;
        }

        if (isNaN(rollNumber) || rollNumber < 1 || rollNumber > maxStudents) {
            UI.toast('Enter a valid roll number (1-' + maxStudents + ')', 'warning');
            return;
        }

        session.name = name;
        session.rollNumber = rollNumber;
        session.role = role;
        session.captainLevel = captainLevel;
        Storage.set('session', session);

        // Keep the persisted account record (used for future sign-ins) in sync
        const account = Storage.get('account');
        if (account) {
            account.name = name;
            account.rollNumber = rollNumber;
            account.role = role;
            account.captainLevel = captainLevel;
            Storage.set('account', account);
        }

        initNavbar();
        UI.toast('Profile updated!', 'success');
    }

    function initSeedData() {
        if (!Storage.has('rules')) {
            Storage.set('rules', getDefaultRules());
        }
    }

    function getDefaultRules() {
        return [
            { id: 'rule_001', text: 'Students must wear full uniform on all school days', category: 'uniform', keywords: ['uniform', 'dress', 'clothes', 'shirt', 'pants', 'tie'] },
            { id: 'rule_002', text: 'Students must arrive before 8:00 AM', category: 'attendance', keywords: ['late', 'time', 'arrive', 'morning', 'attendance', 'punctual'] },
            { id: 'rule_003', text: 'Mobile phones are not allowed on school premises', category: 'discipline', keywords: ['phone', 'mobile', 'smartphone', 'device', 'gadget'] },
            { id: 'rule_004', text: 'Students must bring their own stationery and books', category: 'supplies', keywords: ['pen', 'pencil', 'book', 'notebook', 'eraser', 'stationery'] },
            { id: 'rule_005', text: 'No food or drinks allowed inside the classroom during class hours', category: 'discipline', keywords: ['food', 'eat', 'drink', 'snack', 'water', 'tiffin'] },
            { id: 'rule_006', text: 'The class captain is responsible for maintaining discipline in the absence of the teacher', category: 'governance', keywords: ['captain', 'discipline', 'leader', 'authority', 'maintain', 'order'] },
            { id: 'rule_007', text: 'Students must complete and submit homework on time', category: 'academic', keywords: ['homework', 'assignment', 'submit', 'deadline', 'work'] },
            { id: 'rule_008', text: 'Bullying, harassment, or any form of intimidation is strictly prohibited', category: 'discipline', keywords: ['bully', 'harass', 'threat', 'intimidate', 'fight', 'hit', 'abuse'] },
            { id: 'rule_009', text: 'Students must respect all teachers, staff, and fellow students', category: 'conduct', keywords: ['respect', 'behavior', 'manners', 'polite', 'rude'] },
            { id: 'rule_010', text: 'The class captain cannot impose fines or collect money from students', category: 'governance', keywords: ['money', 'fine', 'collect', 'pay', 'bribe', 'charge', 'fee'] },
            { id: 'rule_011', text: 'Any student can report misconduct to the class teacher without fear of retaliation', category: 'governance', keywords: ['report', 'complaint', 'misconduct', 'teacher', 'retaliation'] },
            { id: 'rule_012', text: 'Students must keep the classroom clean and tidy', category: 'discipline', keywords: ['clean', 'tidy', 'trash', 'litter', 'mess', 'sweep'] },
            { id: 'rule_013', text: 'Exam cheating or copying leads to immediate disqualification', category: 'academic', keywords: ['cheat', 'copy', 'exam', 'test', 'unfair'] },
            { id: 'rule_014', text: 'Students must participate in morning assembly and national anthem', category: 'attendance', keywords: ['assembly', 'anthem', 'morning', 'prayer', 'flag'] },
            { id: 'rule_015', text: 'Damaging school property will result in a fine and disciplinary action', category: 'discipline', keywords: ['damage', 'break', 'property', 'desk', 'chair', 'wall', 'vandal'] }
        ];
    }

    function getNavbarHTML(options = {}) {
        const { backLink = 'dashboard.html', title = 'AKP' } = options;
        const base = Utils.getBasePath();
        return `
        <nav class="navbar" role="navigation" aria-label="Main navigation">
            <a href="${base}${backLink}" class="navbar__logo" aria-label="Go to dashboard">
                <div class="navbar__logo-icon"><svg viewBox="0 0 24 24" width="60%" height="60%" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.5L4.5 5.5V11C4.5 15.8 7.6 20.2 12 21.5C16.4 20.2 19.5 15.8 19.5 11V5.5L12 2.5Z" fill="white"/><path d="M8.5 12L10.8 14.3L15.5 9.2" stroke="#6c63ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg></div>
                <span>${title}</span>
            </a>
            <div class="navbar__actions">
                <div class="navbar__user">
                    <span class="navbar__name"></span>
                    <div class="navbar__avatar"></div>
                </div>
                <button class="btn btn--ghost btn--sm navbar__logout" aria-label="Logout">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                </button>
            </div>
        </nav>
        `;
    }

    function getPageHeaderHTML(title, subtitle, backLink) {
        const base = Utils.getBasePath();
        return `
        <div class="page-header">
            <a href="${base}${backLink || 'dashboard.html'}" class="page-header__back" aria-label="Go back">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </a>
            <div class="page-header__info">
                <h1 class="page-header__title">${title}</h1>
                ${subtitle ? `<p class="page-header__subtitle">${subtitle}</p>` : ''}
            </div>
        </div>
        `;
    }

    return {
        init,
        getSession,
        getConfig,
        isLoggedIn,
        isSetupComplete,
        getSchoolName,
        getClassName,
        getStudentCount,
        getCaptainName,
        getDisplayName,
        logout,
        resetSetup,
        getNavbarHTML,
        getPageHeaderHTML,
        applyTheme,
        setTheme,
        isSoundEnabled,
        setSoundEnabled,
        playClickSound,
        openProfileModal
    };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
