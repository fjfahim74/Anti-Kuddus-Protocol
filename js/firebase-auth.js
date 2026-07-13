// js/firebase-auth.js
// Replaces the old "check localStorage for an account" login with real
// Firebase Authentication (Email/Password provider), plus a Firestore
// profile document per user. Roll numbers are mapped to a synthetic email
// (rollNumber@akp-<CLASS_ID>.local) since Firebase Auth needs an email,
// but students only ever see/type their roll number.

import { auth, db, CLASS_ID } from './firebase-config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updatePassword
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

function emailForRoll(rollNumber) {
    return `roll${rollNumber}@akp-${CLASS_ID}.local`;
}

function profileToSession(profile) {
    return {
        uid: profile.uid,
        rollNumber: profile.rollNumber,
        name: profile.name,
        role: profile.role,
        captainLevel: profile.captainLevel || null,
        isLoggedIn: true,
        loginTime: new Date().toISOString()
    };
}

// Keeps the existing Storage-based session cache in sync so every other
// page/module (App.getSession(), sos.js, etc.) keeps working unmodified.
function cacheSession(profile) {
    if (typeof Storage !== 'undefined' && Storage.set) {
        Storage.set('session', profileToSession(profile));
    }
}

async function signUp({ rollNumber, name, role, captainLevel, password, schoolName, className, section, studentCount }) {
    const email = emailForRoll(rollNumber);
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;

    const profile = {
        uid,
        rollNumber,
        name,
        role,
        captainLevel: role === 'captain' ? captainLevel : null,
        classId: CLASS_ID,
        createdAt: serverTimestamp()
    };

    await setDoc(doc(db, 'users', uid), profile);

    // Save/merge the shared class config (school name, class, section, roster size)
    // so it exists for every member of the class, not just whoever set it up first.
    await setDoc(doc(db, 'classes', CLASS_ID), {
        schoolName,
        className,
        section,
        studentCount,
        updatedAt: serverTimestamp()
    }, { merge: true });

    cacheSession(profile);
    return profile;
}

async function signIn(rollNumber, password) {
    const email = emailForRoll(rollNumber);
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const profile = await getUserProfile(credential.user.uid);
    if (!profile) {
        throw new Error('Account exists but profile data is missing. Contact your captain.');
    }
    cacheSession(profile);
    return profile;
}

async function signOutUser() {
    await signOut(auth);
    if (typeof Storage !== 'undefined' && Storage.remove) {
        Storage.remove('session');
    }
}

async function getUserProfile(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? { uid, ...snap.data() } : null;
}

async function changePassword(newPassword) {
    if (!auth.currentUser) throw new Error('Not signed in');
    await updatePassword(auth.currentUser, newPassword);
}

// Call once per page (e.g. dashboard, sos, complaint, etc.) to keep the
// local session cache honest and redirect unauthenticated visitors to login.
// options.onReady(profile) fires once we know who's signed in.
// options.redirectOnSignedOut: path to send visitors to if not logged in (default 'login.html' from page root).
function guardPage({ onReady, redirectPath } = {}) {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            if (typeof Storage !== 'undefined' && Storage.remove) Storage.remove('session');
            const target = redirectPath || (Utils && Utils.getBasePath ? Utils.getBasePath() + 'login.html' : 'login.html');
            window.location.href = target;
            return;
        }
        try {
            const profile = await getUserProfile(user.uid);
            if (profile) {
                cacheSession(profile);
                if (onReady) onReady(profile);
            }
        } catch (err) {
            console.error('Failed to load profile', err);
        }
    });
}

function friendlyAuthError(err) {
    const code = err && err.code;
    switch (code) {
        case 'auth/email-already-in-use':
            return 'An account with this roll number already exists. Please sign in instead.';
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
            return 'Incorrect roll number or password.';
        case 'auth/user-not-found':
            return 'No account found with that roll number.';
        case 'auth/weak-password':
            return 'Password must be at least 6 characters.';
        case 'auth/too-many-requests':
            return 'Too many attempts. Please wait a moment and try again.';
        case 'auth/network-request-failed':
            return 'Network error — check your internet connection.';
        default:
            return err && err.message ? err.message : 'Something went wrong. Please try again.';
    }
}

export {
    signUp,
    signIn,
    signOutUser,
    getUserProfile,
    changePassword,
    guardPage,
    friendlyAuthError,
    emailForRoll
};
