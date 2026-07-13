// js/firebase-config.js
// Initializes the Firebase app once and exports the shared auth/db handles.
// Every other firebase-*.js file imports from here — never call initializeApp() again elsewhere.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

// TODO: paste the config object from
// Firebase Console -> Project settings -> General -> Your apps -> SDK setup and configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAZ1MfaHYIFTkHObZbVrODwuB-isTipgJc",
  authDomain: "anti-kuddus-protocol-007.firebaseapp.com",
  projectId: "anti-kuddus-protocol-007",
  storageBucket: "anti-kuddus-protocol-007.firebasestorage.app",
  messagingSenderId: "796202523604",
  appId: "1:796202523604:web:867645048c62a252ae5441",
  measurementId: "G-992WCBVG34"
};
export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

// A fixed id for the single class this deployment serves.
// (The app is built for one class/section per deployment — every student
// and captain in that class shares this one document.)
export const CLASS_ID = 'main';
