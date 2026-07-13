// js/firebase-sos.js
// Real, cross-device SOS alerts. Any student's panic button write hits
// Firestore, and every captain's browser (dashboard or sos page open) gets
// an onSnapshot push within ~1 second — no refresh needed — plus a sound
// and a browser notification if permission was granted.

import { db, CLASS_ID } from './firebase-config.js';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    Timestamp
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

const COLLECTION = 'sos_alerts';

function alertsCol() {
    return collection(db, COLLECTION);
}

function toMillis(ts) {
    if (!ts) return Date.now();
    if (ts instanceof Timestamp) return ts.toMillis();
    if (ts.seconds) return ts.seconds * 1000;
    return Date.now();
}

async function sendSOS({ rollNumber, name, location }) {
    const docRef = await addDoc(alertsCol(), {
        classId: CLASS_ID,
        triggeredBy: rollNumber,
        triggeredByName: name,
        location: location,
        status: 'active',
        timestamp: serverTimestamp(),
        resolvedBy: null,
        resolvedAt: null
    });
    return docRef.id;
}

async function resolveAlert(id, resolvedByName) {
    await updateDoc(doc(db, COLLECTION, id), {
        status: 'resolved',
        resolvedBy: resolvedByName,
        resolvedAt: serverTimestamp()
    });
}

async function dismissAlert(id) {
    await deleteDoc(doc(db, COLLECTION, id));
}

// Subscribes to live active alerts for this class. Calls onChange(alerts)
// every time anything changes, and onNewAlert(alert) exactly once per
// newly-created alert (used to fire the notification/sound).
function listenActiveAlerts({ onChange, onNewAlert }) {
    const q = query(
        alertsCol(),
        where('classId', '==', CLASS_ID),
        where('status', '==', 'active'),
        orderBy('timestamp', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const alerts = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            timestamp: toMillisAsISO(d.data().timestamp)
        }));

        if (onNewAlert) {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    // Ignore alerts that already existed before this listener attached
                    // (Firestore fires "added" for the initial snapshot too) —
                    // only treat alerts created in roughly the last 10s as "new".
                    const ageMs = Date.now() - toMillis(data.timestamp);
                    if (ageMs < 10000) {
                        onNewAlert({ id: change.doc.id, ...data });
                    }
                }
            });
        }

        if (onChange) onChange(alerts);
    });
}

function listenResolvedAlerts(onChange) {
    const q = query(
        alertsCol(),
        where('classId', '==', CLASS_ID),
        where('status', '==', 'resolved'),
        orderBy('resolvedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const alerts = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            timestamp: toMillisAsISO(d.data().timestamp),
            resolvedAt: toMillisAsISO(d.data().resolvedAt)
        }));
        onChange(alerts);
    });
}

function toMillisAsISO(ts) {
    return new Date(toMillis(ts)).toISOString();
}

// --- Notifying captains immediately ---

async function requestNotificationPermission() {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
        return Notification.permission;
    }
    return Notification.requestPermission();
}

function playAlertSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const beep = (start, freq) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.15, ctx.currentTime + start);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + start);
            osc.stop(ctx.currentTime + start + 0.35);
        };
        beep(0, 880);
        beep(0.4, 880);
        beep(0.8, 880);
    } catch (err) {
        // Audio not available/blocked — non-fatal
    }
}

function notifyNewAlert(alert, locationLabel) {
    playAlertSound();
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            new Notification('🚨 SOS Alert', {
                body: `${alert.triggeredByName} (Roll #${alert.triggeredBy}) needs help — ${locationLabel}`,
                requireInteraction: true,
                tag: 'sos-' + alert.id
            });
        } catch (err) {
            // Notifications may be blocked in some contexts — non-fatal
        }
    }
}

export {
    sendSOS,
    resolveAlert,
    dismissAlert,
    listenActiveAlerts,
    listenResolvedAlerts,
    requestNotificationPermission,
    notifyNewAlert,
    playAlertSound
};
