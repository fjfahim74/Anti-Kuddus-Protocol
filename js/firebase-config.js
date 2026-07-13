// js/firebase-config.js
// Initializes the Firebase app once and exports the shared auth/db handles.
// Every other firebase-*.js file imports from here — never call initializeApp() again elsewhere.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

// TODO: paste the config object from
// Firebase Console -> Project settings -> General -> Your apps -> SDK setup and configuration
const firebaseConfig = {
    apiKey: "PASTE_YOUR_API_KEY",
    authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
    projectId: "PASTE_YOUR_PROJECT_ID",
    storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
    messagingSenderId: "PASTE_YOUR_SENDER_ID",
    appId: "PASTE_YOUR_APP_ID"
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

// A fixed id for the single class this deployment serves.
// (The app is built for one class/section per deployment — every student
// and captain in that class shares this one document.)
export const CLASS_ID = 'main';
