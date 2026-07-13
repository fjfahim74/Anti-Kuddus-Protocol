import {
    sendSOS,
    resolveAlert as fbResolveAlert,
    dismissAlert as fbDismissAlert,
    listenActiveAlerts,
    listenResolvedAlerts,
    requestNotificationPermission,
    notifyNewAlert
} from '../firebase-sos.js';
import { guardPage } from '../firebase-auth.js';

const SOSModule = (function () {
    var COOLDOWN_SECONDS = 30;
    var cooldownTimer = null;
    var currentActive = [];
    var currentResolved = [];
    var unsubscribeActive = null;
    var unsubscribeResolved = null;

    var LOCATION_LABELS = {
        classroom: 'Classroom',
        corridor: 'Corridor',
        playground: 'Playground',
        canteen: 'Canteen',
        washroom: 'Washroom Area',
        library: 'Library',
        lab: 'Lab',
        stairs: 'Staircase',
        gate: 'School Gate',
        other: 'Other'
    };

    function init() {
        if (!document.getElementById('sos-panic-btn')) return; // not on the SOS page

        // Make sure we know who's signed in (and kick to login if not) before
        // subscribing to alerts, since captain-only actions depend on role.
        guardPage({
            onReady: function () {
                initPanicButton();
                initClearResolved();
                requestNotificationPermission();
                subscribeToAlerts();
            }
        });
    }

    function subscribeToAlerts() {
        if (unsubscribeActive) unsubscribeActive();
        if (unsubscribeResolved) unsubscribeResolved();

        unsubscribeActive = listenActiveAlerts({
            onChange: function (alerts) {
                currentActive = alerts;
                renderActiveAlerts(currentActive);
                updateCounts();
            },
            onNewAlert: function (alert) {
                var session = App.getSession();
                // Notify everyone viewing this page except the person who triggered it —
                // in practice this is what makes captains get the signal immediately.
                if (!session || session.rollNumber !== alert.triggeredBy) {
                    var label = LOCATION_LABELS[alert.location] || alert.location;
                    notifyNewAlert(alert, label);
                    UI.toast('🚨 SOS from ' + alert.triggeredByName + ' — ' + label, 'warning', 6000);
                }
            }
        });

        unsubscribeResolved = listenResolvedAlerts(function (alerts) {
            currentResolved = alerts;
            renderResolvedAlerts(currentResolved);
            updateCounts();
        });
    }

    function updateCounts() {
        var activeCount = document.getElementById('active-count');
        var resolvedCount = document.getElementById('resolved-count');
        if (activeCount) activeCount.textContent = currentActive.length;
        if (resolvedCount) resolvedCount.textContent = '(' + currentResolved.length + ')';
    }

    function initPanicButton() {
        var btn = document.getElementById('sos-panic-btn');
        if (!btn) return;

        btn.addEventListener('click', triggerSOS);
    }

    function initClearResolved() {
        var btn = document.getElementById('clear-resolved-btn');
        if (btn) {
            btn.addEventListener('click', function () {
                if (currentResolved.length === 0) return;

                UI.confirm('Clear all resolved alerts?', function () {
                    currentResolved.forEach(function (a) {
                        fbDismissAlert(a.id).catch(function () {});
                    });
                    UI.toast('Resolved alerts cleared', 'info');
                });
            });
        }
    }

    function triggerSOS() {
        var session = App.getSession();
        if (!session) return;

        var location = document.getElementById('sos-location').value;
        var btn = document.getElementById('sos-panic-btn');

        btn.disabled = true;

        sendSOS({
            rollNumber: session.rollNumber,
            name: session.name,
            location: location
        }).then(function () {
            btn.disabled = false;
            btn.classList.add('sos-panic-btn--triggered');
            btn.innerHTML =
                '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
                '<span>SENT</span>';

            var status = document.getElementById('sos-status');
            if (status) status.style.display = 'flex';

            UI.toast('SOS Alert sent! Captains have been notified.', 'warning', 4000);
            startCooldown();
        }).catch(function (err) {
            btn.disabled = false;
            console.error(err);
            UI.toast('Could not send SOS — check your internet connection and try again.', 'danger', 5000);
        });
    }

    function startCooldown() {
        var btn = document.getElementById('sos-panic-btn');
        var remaining = COOLDOWN_SECONDS;

        cooldownTimer = setInterval(function () {
            remaining--;

            if (remaining <= 0) {
                clearInterval(cooldownTimer);
                cooldownTimer = null;
                resetButton();
            }
        }, 1000);

        setTimeout(function () {
            resetButton();
        }, COOLDOWN_SECONDS * 1000);
    }

    function resetButton() {
        if (cooldownTimer) {
            clearInterval(cooldownTimer);
            cooldownTimer = null;
        }

        var btn = document.getElementById('sos-panic-btn');
        if (btn) {
            btn.classList.remove('sos-panic-btn--triggered');
            btn.innerHTML =
                '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
                '<span>SOS</span>';
        }

        var status = document.getElementById('sos-status');
        if (status) status.style.display = 'none';
    }

    function resolveAlert(id) {
        var session = App.getSession();
        fbResolveAlert(id, session.name).then(function () {
            UI.toast('Alert resolved', 'success');
        }).catch(function (err) {
            console.error(err);
            UI.toast('Failed to resolve alert', 'danger');
        });
    }

    function dismissAlert(id) {
        fbDismissAlert(id).then(function () {
            UI.toast('Alert dismissed', 'info', 1500);
        }).catch(function (err) {
            console.error(err);
            UI.toast('Failed to dismiss alert', 'danger');
        });
    }

    function renderActiveAlerts(active) {
        var container = document.getElementById('active-alerts');
        if (!container) return;

        if (active.length === 0) {
            container.innerHTML =
                '<div class="empty-state" style="padding: var(--space-6) var(--space-4);">' +
                    '<p class="empty-state__text">No active alerts. All clear!</p>' +
                '</div>';
            return;
        }

        var session = App.getSession();
        var isAuthority = session && Utils.isAuthority(session.role);

        var html = '';

        active.forEach(function (alert) {
            html +=
                '<div class="sos-alert-item animate-in">' +
                    '<div class="sos-alert-item__header">' +
                        '<span class="sos-alert-item__who">' +
                            UI.escapeHTML(alert.triggeredByName) + ' (Roll #' + alert.triggeredBy + ')' +
                        '</span>' +
                        '<span class="sos-alert-item__time">' + Utils.timeAgo(alert.timestamp) + '</span>' +
                    '</div>' +
                    '<div class="sos-alert-item__details">' +
                        '<span class="sos-alert-item__location">' +
                            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
                            (LOCATION_LABELS[alert.location] || alert.location) +
                        '</span>' +
                        '<span>' + Utils.formatTime(alert.timestamp) + '</span>' +
                    '</div>' +
                    (isAuthority ?
                        '<div class="sos-alert-item__actions">' +
                            '<button class="sos-alert-item__resolve-btn" data-id="' + alert.id + '">Resolve</button>' +
                            '<button class="sos-alert-item__dismiss-btn" data-id="' + alert.id + '">Dismiss</button>' +
                        '</div>' : '') +
                '</div>';
        });

        container.innerHTML = html;

        container.querySelectorAll('.sos-alert-item__resolve-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                resolveAlert(btn.dataset.id);
            });
        });

        container.querySelectorAll('.sos-alert-item__dismiss-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                UI.confirm('Dismiss this alert without resolving?', function () {
                    dismissAlert(btn.dataset.id);
                });
            });
        });
    }

    function renderResolvedAlerts(resolved) {
        var container = document.getElementById('resolved-alerts');
        if (!container) return;

        if (resolved.length === 0) {
            container.innerHTML =
                '<div class="empty-state" style="padding: var(--space-6) var(--space-4);">' +
                    '<p class="empty-state__text">No resolved alerts yet.</p>' +
                '</div>';
            return;
        }

        var html = '';

        resolved.forEach(function (alert) {
            html +=
                '<div class="sos-alert-item sos-alert-item--resolved">' +
                    '<div class="sos-alert-item__header">' +
                        '<span class="sos-alert-item__who">' +
                            UI.escapeHTML(alert.triggeredByName) + ' (Roll #' + alert.triggeredBy + ')' +
                        '</span>' +
                        '<span class="sos-alert-item__time">' + Utils.timeAgo(alert.timestamp) + '</span>' +
                    '</div>' +
                    '<div class="sos-alert-item__details">' +
                        '<span class="sos-alert-item__location">' +
                            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
                            (LOCATION_LABELS[alert.location] || alert.location) +
                        '</span>' +
                    '</div>' +
                    '<span class="sos-alert-item__resolved-by">Resolved by ' + UI.escapeHTML(alert.resolvedBy || 'Unknown') + '</span>' +
                '</div>';
        });

        container.innerHTML = html;
    }

    document.addEventListener('DOMContentLoaded', init);

    return {};
})();
