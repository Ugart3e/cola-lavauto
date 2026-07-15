import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
    getFirestore,
    collection,
    doc,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAmjNiF0EeLOMWXtAED3Bsl5T6RkUV6vY0",
    authDomain: "cola-lavadero.firebaseapp.com",
    projectId: "cola-lavadero",
    storageBucket: "cola-lavadero.firebasestorage.app",
    messagingSenderId: "364876742890",
    appId: "1:364876742890:web:1a52eb554d8736a17dd793"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export {
    db,
    collection,
    doc,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs
};