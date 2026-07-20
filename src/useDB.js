import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, setDoc,
} from "firebase/firestore";
import { db } from "./firebase";

// Подписка на коллекцию в реальном времени, отсортировано по createdAt (новые сверху)
export function useCol(name) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, name), (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setItems(arr);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [name]);
  return { items, loading };
}

export const addItem = (name, data) =>
  addDoc(collection(db, name), { ...data, createdAt: Date.now() });
export const updateItem = (name, id, data) =>
  updateDoc(doc(db, name, id), data);
export const removeItem = (name, id) => deleteDoc(doc(db, name, id));
export const setUserDoc = (uid, data) =>
  setDoc(doc(db, "users", uid), data, { merge: true });
export const setDocById = (name, id, data) =>
  setDoc(doc(db, name, id), data, { merge: true });
