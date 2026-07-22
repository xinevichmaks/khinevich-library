import { useState } from "react";
import { Plus, X, Check, Trash2 } from "lucide-react";
import { Modal, T, serif, sans, btn, btnGhost, input, chip } from "../ui.jsx";
import { DatePicker, fmtDateRu } from "../calendar.jsx";
import { useAuth } from "../auth.jsx";
import { useCol, addItem, updateItem, removeItem, notify } from "../useDB.js";

const NOTE_COLORS = ["#f4e3a1", "#f6c6c6", "#c7e3c0", "#c3d8ee", "#e6cff2", "#f7dcb4"];
// стабильный небольшой наклон и цвет по id заметки — чтобы не «прыгали» при перерендере
function hashSeed(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}
const STATUS_LABEL = { pending: "В работе", done: "Выполнено", not_required: "Не требуется" };

export default function Notes() {
  const { profile, role } = useAuth();
  const isStaff = role === "tutor" || role === "admin";
  const sid = role === "student" ? profile.uid : role === "parent" ? profile.childId : null;
  const { items: users } = useCol("users");
  const { items: notes } = useCol("notes");
  const [add, setAdd] = useState(false);
  const [form, setForm] = useState({ text: "", due: "", studentId: "", notRequired: false });

  const myTutorId = isStaff ? profile.uid : users.find((u) => u.id === sid)?.tutorId;
  const students = users.filter((u) => u.role === "student" && u.tutorId === profile.uid);

  const list = notes.filter((n) => role === "admin" ? true : isStaff ? n.tutorId === profile.uid : (n.tutorId === myTutorId && (!n.studentId || n.studentId === sid)));

  const save = async () => {
    if (!form.text.trim()) return;
    const st = students.find((s) => s.id === form.studentId);
    await addItem("notes", {
      tutorId: profile.uid, text: form.text.trim(), due: form.due || null,
      studentId: form.studentId || null, studentName: st?.name || null,
      status: form.notRequired ? "not_required" : "pending",
    });
    if (form.studentId) await notify(form.studentId, st?.name || "", `Новая заметка от репетитора${form.due ? " · срок " + fmtDateRu(form.due) : ""}: «${form.text.trim().slice(0, 60)}»`, "new_note");
    setAdd(false); setForm({ text: "", due: "", studentId: "", notRequired: false });
  };
  const toggleDone = (n) => updateItem("notes", n.id, { status: n.status === "done" ? "pending" : "done" });

  return (
    <div style={{
      minHeight: "70vh", borderRadius: 16, padding: 28, position: "relative",
      background: `
        radial-gradient(rgba(0,0,0,.05) 1px, transparent 1px),
        radial-gradient(rgba(0,0,0,.04) 1.5px, transparent 1.5px),
        linear-gradient(135deg, #c99a63, #b98550 60%, #ad7a48)`,
      backgroundSize: "5px 5px, 11px 11px, 100% 100%",
      backgroundPosition: "0 0, 3px 5px, 0 0",
      boxShadow: "inset 0 0 60px rgba(0,0,0,.25)",
    }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 16, background: "rgba(20,10,5,.08)", pointerEvents: "none" }} />
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <div style={{ font: `700 18px ${serif}`, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,.35)" }}>Доска заметок</div>
        {isStaff && <button onClick={() => setAdd(true)} style={{ background: "#fff", color: T.accent, border: "none", borderRadius: 8, padding: "9px 15px", font: `600 13px ${sans}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 3px 8px rgba(0,0,0,.25)" }}><Plus size={15} />Новая заметка</button>}
      </div>

      <div style={{ position: "relative", display: "flex", flexWrap: "wrap", gap: 26, paddingBottom: 10 }}>
        {list.map((n) => {
          const seed = hashSeed(n.id);
          const rot = ((seed % 7) - 3) * 1.4;
          const color = NOTE_COLORS[seed % NOTE_COLORS.length];
          const done = n.status === "done";
          const notReq = n.status === "not_required";
          return (
            <div key={n.id} style={{ position: "relative", width: 190, transform: `rotate(${rot}deg)`, transition: "transform .15s" }}
              onMouseEnter={(e) => e.currentTarget.style.transform = `rotate(0deg) scale(1.04)`}
              onMouseLeave={(e) => e.currentTarget.style.transform = `rotate(${rot}deg)`}>
              <div style={{
                position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", width: 22, height: 22, borderRadius: "50%",
                background: "#fff", border: `3px solid ${T.accent}`, boxShadow: "0 3px 5px rgba(0,0,0,.35)", zIndex: 2,
              }} />
              <div style={{
                background: color, borderRadius: 3, padding: "22px 14px 16px", minHeight: 150,
                boxShadow: "0 8px 16px rgba(0,0,0,.28)", opacity: (notReq || done) ? 0.55 : 1, display: "flex", flexDirection: "column", gap: 10,
              }}>
                <div style={{ font: `14px/1.4 ${sans}`, color: "#2a2118", whiteSpace: "pre-wrap", textDecoration: done ? "line-through" : "none", flex: 1 }}>{n.text}</div>
                {n.studentName && <div style={{ font: `11px ${sans}`, color: "#5a4a35" }}>👤 {n.studentName}</div>}
                {n.due && <div style={{ font: `11px ${sans}`, color: "#5a4a35" }}>⏰ {fmtDateRu(n.due)}</div>}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ font: `600 10.5px ${sans}`, color: "#5a4a35", background: "rgba(255,255,255,.5)", padding: "2px 7px", borderRadius: 20 }}>{STATUS_LABEL[n.status]}</span>
                  {(isStaff || n.studentId === sid) && n.status !== "not_required" && (
                    <button onClick={() => toggleDone(n)} title={done ? "Вернуть в работу" : "Отметить выполненной"} style={{ background: "none", border: "none", cursor: "pointer", color: done ? "#3f7a4d" : "#5a4a35" }}><Check size={16} /></button>
                  )}
                  {isStaff && <button onClick={() => removeItem("notes", n.id)} title="Удалить" style={{ background: "none", border: "none", cursor: "pointer", color: "#8a4a3a" }}><Trash2 size={14} /></button>}
                </div>
              </div>
            </div>
          );
        })}
        {list.length === 0 && <div style={{ font: `14px ${sans}`, color: "rgba(255,255,255,.85)" }}>На доске пока пусто.</div>}
      </div>

      <Modal open={add} onClose={() => setAdd(false)} title="Новая заметка">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <textarea style={{ ...input, minHeight: 90, resize: "vertical" }} placeholder="Текст заметки" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
          <select style={input} value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>
            <option value="">— общая заметка (без ученика) —</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div>
            <div style={{ font: `12px ${sans}`, color: T.faint, marginBottom: 6 }}>Дедлайн (необязательно)</div>
            <DatePicker value={form.due} onChange={(d) => setForm({ ...form, due: d })} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, font: `13px ${sans}`, color: T.soft, cursor: "pointer" }}>
            <input type="checkbox" checked={form.notRequired} onChange={(e) => setForm({ ...form, notRequired: e.target.checked })} />
            Выполнение не требуется (просто напоминание/факт)
          </label>
          <button style={btn} onClick={save}>Приколоть на доску</button>
        </div>
      </Modal>
    </div>
  );
}
