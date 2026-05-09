// =====================================================
// FIREBASE CONFIGURATION
// =====================================================
// Reemplaza estos valores con los de tu proyecto Firebase
// Los encuentras en: Firebase Console → Proyecto → Configuración → Tus apps
// =====================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDy0avX_awQLyzp0_f3As7wRTPHjgwVyiM",
  authDomain: "supercontrol-f9996.firebaseapp.com",
  projectId: "supercontrol-f9996",
  storageBucket: "supercontrol-f9996.firebasestorage.app",
  messagingSenderId: "863575248821",
  appId: "1:863575248821:web:042f2e9f5816c00a0593fc"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
