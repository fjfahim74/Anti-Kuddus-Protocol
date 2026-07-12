const Utils = (function () {
    function generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function formatTime(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function formatDateTime(dateStr) {
        return `${formatDate(dateStr)} at ${formatTime(dateStr)}`;
    }

    function timeAgo(dateStr) {
        const now = new Date();
        const past = new Date(dateStr);
        const seconds = Math.floor((now - past) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return formatDate(dateStr);
    }

    function validateRequired(value, fieldName) {
        if (!value || (typeof value === 'string' && !value.trim())) {
            return `${fieldName} is required`;
        }
        return null;
    }

    function validateRollNumber(value, maxStudents) {
        const max = maxStudents || 60;
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 1 || num > max) {
            return 'Roll number must be between 1 and ' + max;
        }
        return null;
    }

    function validateMinLength(value, min, fieldName) {
        if (typeof value === 'string' && value.trim().length < min) {
            return `${fieldName} must be at least ${min} characters`;
        }
        return null;
    }

    function capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    function truncate(str, max = 100) {
        if (!str || str.length <= max) return str;
        return str.slice(0, max).trim() + '...';
    }

    function slugify(str) {
        return str
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }

    function debounce(fn, delay = 300) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    function getInitials(name) {
        if (!name) return '?';
        return name
            .split(' ')
            .map((w) => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    function getRoleName(role, captainLevel) {
        if (role === 'captain') {
            const ordinals = { 1: '1st', 2: '2nd', 3: '3rd' };
            const prefix = ordinals[captainLevel] || '';
            return (prefix ? prefix + ' ' : '') + 'Captain';
        }
        return 'Student';
    }

    function isCaptain(role) {
        return role === 'captain';
    }

    function isAuthority(role) {
        return isCaptain(role);
    }

    function validatePassword(value) {
        if (!value) return 'Password is required';
        if (value.length < 4) return 'Password must be at least 4 characters';
        return null;
    }

    function copyToClipboard(text) {
        if (navigator.clipboard) {
            return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
        }
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            return Promise.resolve(true);
        } catch {
            return Promise.resolve(false);
        } finally {
            textarea.remove();
        }
    }

    function cmToFeetInches(cm) {
        const totalInches = cm / 2.54;
        let feet = Math.floor(totalInches / 12);
        let inches = Math.round(totalInches - feet * 12);
        if (inches === 12) {
            feet += 1;
            inches = 0;
        }
        return { feet, inches };
    }

    function feetInchesToCm(feet, inches) {
        const ft = parseInt(feet, 10) || 0;
        const inch = parseInt(inches, 10) || 0;
        return Math.round((ft * 12 + inch) * 2.54);
    }

    function formatFeetInches(cm) {
        const { feet, inches } = cmToFeetInches(cm);
        return `${feet}'${inches}"`;
    }

    function getBasePath() {
        const path = window.location.pathname;
        if (path.includes('/pages/')) {
            return '../';
        }
        return './';
    }

    function navigate(page) {
        const base = getBasePath();
        window.location.href = base + page;
    }

    return {
        generateId,
        formatDate,
        formatTime,
        formatDateTime,
        timeAgo,
        validateRequired,
        validateRollNumber,
        validateMinLength,
        validatePassword,
        capitalize,
        truncate,
        slugify,
        debounce,
        getInitials,
        getRoleName,
        isCaptain,
        isAuthority,
        copyToClipboard,
        cmToFeetInches,
        feetInchesToCm,
        formatFeetInches,
        getBasePath,
        navigate
    };
})();
