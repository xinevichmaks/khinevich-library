import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDVix3w8vLE6ihazDWVHpjYFWq5cu4AciY",
  authDomain: "grifel-6822a.firebaseapp.com",
  projectId: "grifel-6822a",
  storageBucket: "grifel-6822a.firebasestorage.app",
  messagingSenderId: "870210968125",
  appId: "1:870210968125:web:ffcbca4e629b20794c6854",
  measurementId: "G-FEL07Y92GW",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
