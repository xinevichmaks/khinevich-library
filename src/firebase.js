import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCiqY-Jw-EcVc9mOy43FuEKr6vtHGbxB6E",
  authDomain: "khinevich-library.firebaseapp.com",
  projectId: "khinevich-library",
  storageBucket: "khinevich-library.firebasestorage.app",
  messagingSenderId: "113049117141",
  appId: "1:113049117141:web:8c618e1fb350559f925d5c",
  measurementId: "G-TLZ8QJ741W",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
