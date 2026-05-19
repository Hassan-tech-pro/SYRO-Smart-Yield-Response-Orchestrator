import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, writeBatch } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAKIv_7xd2KPuVwmn5ofizQ2Tc5AVc2VkY",
  authDomain: "syro-38a34.firebaseapp.com",
  projectId: "syro-38a34",
  storageBucket: "syro-38a34.firebasestorage.app",
  messagingSenderId: "196079785943",
  appId: "1:196079785943:web:151d3531586b803da31d92",
  measurementId: "G-6FJE8N6B9B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider, signInWithPopup, signOut, collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, writeBatch };
