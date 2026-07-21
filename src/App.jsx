import { useEffect, useState } from "react";
import {
  LayoutGrid, BookOpen, Youtube, ClipboardList, PenLine,
  CalendarDays, Calendar as CalendarIcon, Award, PencilLine, Menu, X, Bell,
  GraduationCap, User, Users, LogOut, ChevronRight,
} from "lucide-react";
import { T, serif, sans, Card, Avatar, btn, input, ROLE_LABEL, initials, SUBJECTS } from "./ui.jsx";
import { useAuth } from "./auth.jsx";
import { useCol, setUserDoc } from "./useDB.js";

import Dashboard from "./sections/Dashboard.jsx";
import Students from "./sections/Students.jsx";
import Library from "./sections/Library.jsx";
import Useful from "./sections/Useful.jsx";
import Homework from "./sections/Homework.jsx";
import Schedule from "./sections/Schedule.jsx";
import Calendar from "./sections/Calendar.jsx";
import Notifications from "./sections/Notifications.jsx";
import Mocks from "./sections/Mocks.jsx";
import Grades from "./sections/Grades.jsx";

const NAV = [
  { id: "dash", label: "Главная", Icon: LayoutGrid, roles: ["tutor", "student", "parent"] },
  { id: "students", label: "Ученики", Icon: Users, roles: ["tutor"] },
  { id: "lib", label: "Библиотека", Icon: BookOpen, roles: ["tutor", "student", "parent"] },
  { id: "useful", label: "Полезное", Icon: Youtube, roles: ["tutor", "student", "parent"] },
  { id: "homework", label: "Домашка", Icon: ClipboardList, roles: ["tutor", "student", "parent"] },
  { id: "sched", label: "Расписание", Icon: CalendarDays, roles: ["tutor", "student", "parent"] },
  { id: "calendar", label: "Календарь", Icon: CalendarIcon, roles: ["tutor", "student", "parent"] },
  { id: "notifications", label: "Уведомления", Icon: Bell, roles: ["tutor", "student", "parent"] },
  { id: "mocks", label: "Пробники", Icon: PencilLine, roles: ["tutor", "student", "parent"] },
  { id: "grades", label: "Журнал оценок", Icon: Award, roles: ["tutor", "student", "parent"] },
];

const globalCss = `
*{box-sizing:border-box} body{margin:0}
::-webkit-scrollbar{width:9px;height:9px} ::-webkit-scrollbar-thumb{background:${T.lineDk};border-radius:9px}
button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid ${T.accent};outline-offset:1px}
input,textarea,select,button{font-family:${sans}}
.hamburger-btn{display:none}
.mobile-overlay{display:none}
@media (max-width: 900px){
  .app-aside{position:fixed !important; top:0; left:0; height:100dvh !important; z-index:60; width:min(80vw,280px) !important; transform:translateX(-105%); transition:transform .22s ease;}
  .app-aside.open{transform:translateX(0);}
  .hamburger-btn{display:inline-flex !important;}
  .mobile-overlay.show{display:block; position:fixed; inset:0; background:rgba(20,10,10,.45); z-index:50;}
  .app-header{padding:14px 16px !important;}
  .app-content{padding:16px !important;}
  .app-header h1{font-size:19px !important;}
}
@media (min-width: 901px) and (max-width: 1180px){
  .app-aside{width:190px !important;}
}
`;

export default function App() {
  const { user, profile, role, loading, logout } = useAuth();
  const [tab, setTab] = useState("dash");
  const [navOpen, setNavOpen] = useState(false);
  const { items: allUsers } = useCol("users");

  if (loading) return <Splash text="Загрузка…" />;
  if (!user || !profile) return <><style>{globalCss}</style><Auth /></>;
  if (role === "parent" && !profile.childId) return <><style>{globalCss}</style><LinkChild /></>;

  const NO_EXTRAS_SUBJECTS = ["Менторство", "Занятия с Марселькой"];
  const mySubject = role === "student" ? profile.subject : role === "parent" ? allUsers.find((u) => u.id === profile.childId)?.subject : null;
  const hideExtras = role !== "tutor" && NO_EXTRAS_SUBJECTS.includes(mySubject);
  const EXTRA_IDS = ["grades", "mocks", "useful"];

  const nav = NAV.filter((n) => n.roles.includes(role) && !(hideExtras && EXTRA_IDS.includes(n.id)));
  const current = nav.find((n) => n.id === tab) ? tab : "dash";
  const goTab = (id) => { setTab(id); setNavOpen(false); };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, color: T.ink }}>
      <style>{globalCss}</style>
      <div className={`mobile-overlay${navOpen ? " show" : ""}`} onClick={() => setNavOpen(false)} />
      <aside className={`app-aside${navOpen ? " open" : ""}`} style={{ width: 230, background: T.sidebar, borderRight: `1px solid ${T.sidebarLine}`, padding: "20px 14px", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px 18px" }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: T.ink, display: "grid", placeItems: "center", flexShrink: 0 }}><PenLine size={18} color="#fff" /></div>
          <div style={{ flex: 1 }}>
            <div style={{ font: `700 17px ${serif}`, color: "#fff", lineHeight: 1.15 }}>Khinevich<br />Library</div>
            <div style={{ font: `11px ${sans}`, color: "rgba(255,255,255,.65)" }}>кабинет репетитора</div>
          </div>
          <button className="hamburger-btn" onClick={() => setNavOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.8)" }}><X size={20} /></button>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 3, overflow: "auto" }}>
          {nav.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => goTab(id)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 9, border: "none", cursor: "pointer", background: current === id ? T.accent : "transparent", color: current === id ? "#fff" : "rgba(255,255,255,.78)", font: `600 14px ${sans}`, textAlign: "left" }}><Icon size={18} />{label}</button>
          ))}
        </nav>
        <div style={{ marginTop: "auto", paddingTop: 12, borderTop: `1px solid ${T.sidebarLine}`, display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar text={initials(profile.name)} size={34} bg="#fff" color="#111" />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ font: `600 13px ${sans}`, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.name}</div>
            <div style={{ font: `11px ${sans}`, color: "rgba(255,255,255,.6)" }}>{ROLE_LABEL[role]}</div>
          </div>
          <button onClick={logout} title="Выйти" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.7)" }}><LogOut size={17} /></button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header className="app-header" style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between", padding: "18px 28px", borderBottom: `1px solid ${T.line}`, background: T.card }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="hamburger-btn" onClick={() => setNavOpen(true)} style={{ background: T.cardAlt, border: `1px solid ${T.line}`, borderRadius: 8, width: 36, height: 36, alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.ink }}><Menu size={19} /></button>
            <h1 style={{ margin: 0, font: `700 24px ${serif}`, color: T.ink }}>{nav.find((n) => n.id === current)?.label}</h1>
          </div>
        </header>
        <div className="app-content" style={{ padding: 28, flex: 1, overflow: "auto" }}>
          {current === "dash" && <Dashboard go={setTab} />}
          {current === "students" && <Students />}
          {current === "lib" && <Library />}
          {current === "useful" && <Useful />}
          {current === "homework" && <Homework />}
          {current === "sched" && <Schedule />}
          {current === "calendar" && <Calendar />}
          {current === "notifications" && <Notifications />}
          {current === "mocks" && <Mocks />}
          {current === "grades" && <Grades />}
        </div>
      </main>
    </div>
  );
}

function Splash({ text }) {
  return <div style={{ minHeight: "100vh", background: T.bg, display: "grid", placeItems: "center", font: `15px ${sans}`, color: T.soft }}>{text}</div>;
}

/* ---------- вход / регистрация ---------- */
function Auth() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "", password: "", role: "tutor", subject: SUBJECTS[0] });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(""); setBusy(true);
    try {
      if (mode === "login") await login(f.email, f.password);
      else {
        if (!f.name) throw new Error("Введите имя");
        await register(f);
      }
    } catch (e) {
      setErr(translate(e.code || e.message));
    } finally { setBusy(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "grid", placeItems: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, justifyContent: "center", marginBottom: 22 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: T.ink, display: "grid", placeItems: "center" }}><PenLine size={21} color="#fff" /></div>
          <div style={{ font: `700 26px ${serif}`, color: T.ink }}>Khinevich Library</div>
        </div>
        <Card style={{ padding: 26 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 18, background: T.bg, padding: 4, borderRadius: 10 }}>
            {["login", "register"].map((m) => (
              <button key={m} onClick={() => { setMode(m); setErr(""); }} style={{ flex: 1, padding: "8px", borderRadius: 7, border: "none", cursor: "pointer", background: mode === m ? T.cardAlt : "transparent", color: mode === m ? T.ink : T.faint, font: `600 13px ${sans}`, boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}>{m === "login" ? "Вход" : "Регистрация"}</button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {mode === "register" && <input style={input} placeholder="Имя и фамилия" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}
            <input style={input} placeholder="Эл. почта" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <input style={input} type="password" placeholder="Пароль (мин. 6 символов)" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
            {mode === "register" && <>
              <div style={{ font: `12px ${sans}`, color: T.soft, marginTop: 4 }}>Я регистрируюсь как:</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[["tutor", GraduationCap], ["student", User], ["parent", Users]].map(([r, Ic]) => (
                  <button key={r} onClick={() => setF({ ...f, role: r })} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "10px 4px", borderRadius: 8, cursor: "pointer", border: `1.5px solid ${f.role === r ? T.accent : T.line}`, background: f.role === r ? T.accentSoft : T.cardAlt, font: `600 12px ${sans}`, color: T.ink }}><Ic size={17} />{ROLE_LABEL[r]}</button>
                ))}
              </div>
            </>}
            {mode === "register" && f.role === "student" && <>
              <div style={{ font: `12px ${sans}`, color: T.soft, marginTop: 4 }}>Какой предмет будете изучать:</div>
              <select style={input} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })}>
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </>}
            {err && <div style={{ font: `13px ${sans}`, color: "#a23b2d" }}>{err}</div>}
            <button style={{ ...btn, justifyContent: "center", marginTop: 6, opacity: busy ? .6 : 1 }} disabled={busy} onClick={submit}>{mode === "login" ? "Войти" : "Создать аккаунт"} <ChevronRight size={16} /></button>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------- родитель выбирает своего ученика ---------- */
function LinkChild() {
  const { profile, logout } = useAuth();
  const { items: users } = useCol("users");
  const students = users.filter((u) => u.role === "student");
  const [busy, setBusy] = useState(false);
  const pick = async (id) => { setBusy(true); await setUserDoc(profile.uid, { childId: id }); window.location.reload(); };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "grid", placeItems: "center", padding: 20 }}>
      <Card style={{ padding: 26, width: "100%", maxWidth: 420 }}>
        <div style={{ font: `700 20px ${serif}`, color: T.ink, marginBottom: 4 }}>Выберите своего ребёнка</div>
        <div style={{ font: `13px ${sans}`, color: T.faint, marginBottom: 16 }}>Так вы будете видеть его расписание, домашку и оценки</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {students.map((s) => (
            <button key={s.id} disabled={busy} onClick={() => pick(s.id)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 9, border: `1px solid ${T.line}`, background: T.cardAlt, cursor: "pointer", textAlign: "left" }}>
              <Avatar text={initials(s.name)} size={32} /><span style={{ font: `600 14px ${sans}`, color: T.ink }}>{s.name}</span>
            </button>
          ))}
          {students.length === 0 && <div style={{ font: `14px ${sans}`, color: T.faint }}>Учеников пока нет в системе. Попросите ученика сначала зарегистрироваться.</div>}
        </div>
        <button onClick={logout} style={{ marginTop: 16, background: "none", border: "none", color: T.faint, font: `13px ${sans}`, cursor: "pointer" }}>Выйти</button>
      </Card>
    </div>
  );
}

function translate(code) {
  const map = {
    "auth/invalid-email": "Неверный формат почты",
    "auth/invalid-credential": "Неверная почта или пароль",
    "auth/wrong-password": "Неверный пароль",
    "auth/user-not-found": "Пользователь не найден",
    "auth/email-already-in-use": "Эта почта уже зарегистрирована",
    "auth/weak-password": "Пароль слишком короткий (мин. 6 символов)",
    "auth/missing-password": "Введите пароль",
  };
  return map[code] || code;
}
