import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        setProfile(snap.exists() ? { uid: u.uid, ...snap.data() } : null);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const register = async ({ name, email, password, role, subject }) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const needsApproval = role === "tutor" || role === "admin";
    const data = {
      name, email, role, createdAt: Date.now(),
      ...(role === "student" && subject ? { subject } : {}),
      ...(needsApproval ? { approved: false } : {}),
    };
    await setDoc(doc(db, "users", cred.user.uid), data);
    setProfile({ uid: cred.user.uid, ...data });
  };
  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);

  return (
    <Ctx.Provider value={{ user, profile, role: profile?.role, loading, register, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}
