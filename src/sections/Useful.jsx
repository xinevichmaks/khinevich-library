import { useMemo, useState } from "react";
import { Plus, Play } from "lucide-react";
import { Card, Modal, Avatar, T, sans, btn, input, chip, SUBJECTS } from "../ui.jsx";
import { useAuth } from "../auth.jsx";
import { useCol, addItem } from "../useDB.js";

const parseId = (u) => {
  const m = u.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : u.trim().length === 11 ? u.trim() : null;
};

export default function Useful() {
  const { role, profile } = useAuth();
  const { items: useful } = useCol("useful");
  const { items: users } = useCol("users");
  const [open, setOpen] = useState(null);
  const [add, setAdd] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [filterSubject, setFilterSubject] = useState(null);

  // Доступ к предметам — как в библиотеке: по умолчанию только основной предмет ученика,
  // если репетитор не открыл доступ к другим через раздел «Ученики».
  const mySubjects = useMemo(() => {
    if (role === "tutor") return null;
    const sid = role === "student" ? profile.uid : profile.childId;
    const st = users.find((u) => u.id === sid);
    if (!st) return [];
    return st.subjectAccess && st.subjectAccess.length ? st.subjectAccess : [st.subject].filter(Boolean);
  }, [role, profile, users]);

  const visible = useful.filter((v) => mySubjects === null || mySubjects.includes(v.subject || "Обществознание"));
  const list = filterSubject ? visible.filter((v) => (v.subject || "Обществознание") === filterSubject) : visible;
  const subjectsPresent = [...new Set(visible.map((v) => v.subject || "Обществознание"))];

  const save = async () => {
    const vid = parseId(url);
    if (!vid || !title) return;
    await addItem("useful", { vid, title, channel: "Khinevich Library", subject });
    setAdd(false); setUrl(""); setTitle(""); setSubject(SUBJECTS[0]);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ font: `14px ${sans}`, color: T.soft }}>Подборка видео — доступна вам, ученику и родителю</div>
        {role === "tutor" && <button style={btn} onClick={() => setAdd(true)}><Plus size={17} />Добавить ссылку</button>}
      </div>

      {subjectsPresent.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ font: `12px ${sans}`, color: T.faint }}>Предмет:</span>
          <button onClick={() => setFilterSubject(null)} style={{ ...chip, background: !filterSubject ? T.accent : T.line, color: !filterSubject ? "#fff" : T.soft, border: "none", cursor: "pointer" }}>Все</button>
          {subjectsPresent.map((s) => (
            <button key={s} onClick={() => setFilterSubject(filterSubject === s ? null : s)} style={{ ...chip, background: filterSubject === s ? T.accent : T.card, color: filterSubject === s ? "#fff" : T.ink, border: `1px solid ${filterSubject === s ? T.accent : T.line}`, cursor: "pointer" }}>{s}</button>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: "20px 16px" }}>
        {useful.map((v) => (
          <div key={v.id} onClick={() => setOpen(v)} style={{ cursor: "pointer" }}>
            <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", aspectRatio: "16/9", background: "#000" }}>
              <img alt="" src={`https://i.ytimg.com/vi/${v.vid}/hqdefault.jpg`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,.12)" }}>
                <div style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(0,0,0,.6)", display: "grid", placeItems: "center" }}><Play size={20} color="#fff" fill="#fff" /></div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <Avatar text="K" size={34} bg={T.ink} />
              <div style={{ minWidth: 0 }}>
                <div style={{ font: `600 14px/1.35 ${sans}`, color: T.ink, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{v.title}</div>
                <div style={{ font: `13px ${sans}`, color: T.faint, marginTop: 3 }}>{v.channel} · {v.subject || "Обществознание"}</div>
              </div>
            </div>
          </div>
        ))}
        {useful.length === 0 && <div style={{ color: T.faint, font: `14px ${sans}`, padding: 24 }}>Пока пусто. {role === "tutor" ? "Добавьте первое видео." : "Учитель ещё не добавил видео."}</div>}
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.title} wide>
        <div style={{ aspectRatio: "16/9", borderRadius: 10, overflow: "hidden" }}>
          {open && <iframe title="yt" src={`https://www.youtube.com/embed/${open.vid}`} style={{ width: "100%", height: "100%", border: 0 }} allowFullScreen />}
        </div>
      </Modal>

      <Modal open={add} onClose={() => setAdd(false)} title="Добавить видео в «Полезное»">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input style={input} placeholder="Ссылка на YouTube" value={url} onChange={(e) => setUrl(e.target.value)} />
          <input style={input} placeholder="Заголовок" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select style={input} value={subject} onChange={(e) => setSubject(e.target.value)}>
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button style={btn} onClick={save}>Добавить</button>
        </div>
      </Modal>
    </div>
  );
}
