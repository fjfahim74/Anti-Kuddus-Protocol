const UI = (function () {
    let toastContainer = null;

    function ensureToastContainer() {
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            toastContainer.setAttribute('aria-live', 'polite');
            document.body.appendChild(toastContainer);
        }
        return toastContainer;
    }

    const TOAST_ICONS = {
        success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    function toast(message, type = 'info', duration = 3000) {
        const container = ensureToastContainer();

        const el = document.createElement('div');
        el.className = `toast toast--${type}`;
        el.innerHTML = `
            <span class="toast__icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span>
            <span class="toast__message">${escapeHTML(message)}</span>
            <button class="toast__close" aria-label="Close notification">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        `;

        const closeBtn = el.querySelector('.toast__close');
        closeBtn.addEventListener('click', () => removeToast(el));

        container.appendChild(el);

        if (duration > 0) {
            setTimeout(() => removeToast(el), duration);
        }

        return el;
    }

    function removeToast(el) {
        if (!el || !el.parentNode) return;
        el.classList.add('toast--removing');
        el.addEventListener('animationend', () => el.remove(), { once: true });
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    let activeModal = null;
    let activeBackdrop = null;

    function modal(options = {}) {
        const {
            title = '',
            content = '',
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            confirmClass = 'btn--primary',
            onConfirm = null,
            onCancel = null,
            showCancel = true
        } = options;

        closeModal();

        activeBackdrop = document.createElement('div');
        activeBackdrop.className = 'modal-backdrop';

        activeModal = document.createElement('div');
        activeModal.className = 'modal glass-card--elevated';
        activeModal.setAttribute('role', 'dialog');
        activeModal.setAttribute('aria-modal', 'true');
        activeModal.setAttribute('aria-label', title);

        activeModal.innerHTML = `
            <div class="modal__header">
                <h3 class="modal__title">${escapeHTML(title)}</h3>
                <button class="modal__close btn--icon" aria-label="Close dialog">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div class="modal__body">${typeof content === 'string' ? content : ''}</div>
            <div class="modal__footer">
                ${showCancel ? `<button class="btn btn--secondary modal__cancel-btn">${escapeHTML(cancelText)}</button>` : ''}
                <button class="btn ${confirmClass} modal__confirm-btn">${escapeHTML(confirmText)}</button>
            </div>
        `;

        if (typeof content !== 'string' && content instanceof HTMLElement) {
            activeModal.querySelector('.modal__body').appendChild(content);
        }

        document.body.appendChild(activeBackdrop);
        document.body.appendChild(activeModal);

        requestAnimationFrame(() => {
            activeBackdrop.classList.add('modal-backdrop--active');
            activeModal.classList.add('modal--active');
        });

        const closeBtn = activeModal.querySelector('.modal__close');
        const cancelBtn = activeModal.querySelector('.modal__cancel-btn');
        const confirmBtn = activeModal.querySelector('.modal__confirm-btn');

        closeBtn.addEventListener('click', () => {
            closeModal();
            if (onCancel) onCancel();
        });

        activeBackdrop.addEventListener('click', () => {
            closeModal();
            if (onCancel) onCancel();
        });

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                closeModal();
                if (onCancel) onCancel();
            });
        }

        confirmBtn.addEventListener('click', () => {
            closeModal();
            if (onConfirm) onConfirm();
        });

        document.addEventListener('keydown', handleEscape);
        confirmBtn.focus();

        return activeModal;
    }

    function handleEscape(e) {
        if (e.key === 'Escape') closeModal();
    }

    function closeModal() {
        document.removeEventListener('keydown', handleEscape);

        if (activeBackdrop) {
            activeBackdrop.classList.remove('modal-backdrop--active');
            setTimeout(() => {
                if (activeBackdrop) activeBackdrop.remove();
                activeBackdrop = null;
            }, 250);
        }

        if (activeModal) {
            activeModal.classList.remove('modal--active');
            setTimeout(() => {
                if (activeModal) activeModal.remove();
                activeModal = null;
            }, 250);
        }
    }

    function confirm(message, onConfirm) {
        return modal({
            title: 'Confirm Action',
            content: `<p>${escapeHTML(message)}</p>`,
            confirmText: 'Yes, Continue',
            confirmClass: 'btn--danger',
            onConfirm
        });
    }

    function countUp(element, target, duration = 1000) {
        const start = 0;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(start + (target - start) * eased);

            element.textContent = current;

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    }

    function setLoading(button, loading) {
        if (loading) {
            button.dataset.originalText = button.innerHTML;
            button.disabled = true;
            button.innerHTML = '<span class="spinner"></span> Loading...';
        } else {
            button.disabled = false;
            button.innerHTML = button.dataset.originalText || button.innerHTML;
        }
    }

    return {
        toast,
        modal,
        closeModal,
        confirm,
        countUp,
        setLoading,
        escapeHTML
    };
})();
