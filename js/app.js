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

    const SETUP_REQUIRED_PAGES = [
        'dashboard.html',
        'complaint.html',
        'seats.html',
        'study.html',
        'corruption.html',
        'sos.html',
        'rules.html'
    ];

    function init() {
        checkSetup();
        checkAuth();
        initNavbar();
        initSeedData();
    }

    function checkSetup() {
        const config = getConfig();
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';

        const needsSetup = SETUP_REQUIRED_PAGES.some(
            (p) => currentPage === p || currentPage.endsWith('/' + p)
        );

        if (needsSetup && (!config || !config.setupComplete)) {
            Utils.navigate('setup.html');
            return;
        }
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

    function getCaptainName() {
        const config = getConfig();
        return config ? config.captainName : 'Captain';
    }

    function getDisplayName() {
        const config = getConfig();
        if (!config) return 'Classroom Governance Platform';
        return config.schoolName + ' — Class ' + config.className;
    }

    function logout() {
        Storage.remove('session');
        Utils.navigate('index.html');
    }

    function resetSetup() {
        Storage.clear();
        Utils.navigate('setup.html');
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
        }

        const logoutBtn = navbar.querySelector('.navbar__logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                UI.confirm('Are you sure you want to logout?', () => {
                    logout();
                });
            });
        }
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
        const { backLink = 'index.html', title = 'AKP' } = options;
        const base = Utils.getBasePath();
        const displayTitle = title === 'AKP' 
            ? `<span class="logo-brand">A<span class="logo-brand-accent">K</span>P</span>` 
            : `<span class="logo-brand">${title}</span>`;
            
        return `
        <nav class="navbar" role="navigation" aria-label="Main navigation">
            <a href="${base}${backLink}" class="navbar__logo" aria-label="Anti-Kuddus Protocol Home">
                <div class="navbar__logo-icon">
                    <svg class="logo-icon-svg" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="logo-grad-dyn" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="#6366f1" />
                                <stop offset="100%" stop-color="#06b6d4" />
                            </linearGradient>
                        </defs>
                        <path d="M16 2L28 8V20L16 30L4 20V8L16 2Z" class="logo-icon-shield" stroke="url(#logo-grad-dyn)" stroke-width="2" stroke-linejoin="round" fill="rgba(99, 102, 241, 0.05)" />
                        <path d="M17 7L10 15H16L15 25L22 14H16L17 7Z" class="logo-icon-lightning" fill="url(#logo-grad-dyn)" />
                    </svg>
                </div>
                ${displayTitle}
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
        getPageHeaderHTML
    };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
