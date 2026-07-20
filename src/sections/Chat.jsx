import { useState } from "react";
import { Send, Plus } from "lucide-react";
import { Card, Modal, T, sans, btn, input } from "../ui.jsx";
import { useAuth } from "../auth.jsx";
import { useCol, addItem, updateItem } from "../useDB.js";

export default function Chat() {
  const { profile, role } = useAuth();
  const { items: users } = useCol("users");
  const { items: threads } = useCol("threads");
  const [activeId, setActiveId] = useState(null);
  const [text, setText] = useState("");
  const [add, setAdd] = useState(false);
  const [pick, setPick] = useState({ studentId: "", parentId: "" });

  const mine = threads.filter((t) => role === "tutor" || (t.members || []).includes(profile.uid));
  const active = mine.find((t) => t.id === activeId) || mine[0];
  const students = users.filter((u) => u.role === "student");
  const parents = users.filter((u) => u.role === "parent");

  const send = async () => {
    if (!text.trim() || !active) return;
    const msg = { fromId: profile.uid, fromName: profile.name, text: text.trim(), t: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) };
    await updateItem("threads", active.id, { msgs: [...(active.msgs || []), msg] });
    setText("");
  };

  const create = async () => {
    if (!pick.studentId) return;
    const st = users.find((u) => u.id === pick.studentId);
    const pr = users.find((u) => u.id === pick.parentId);
    const members = [profile.uid, pick.studentId, ...(pick.parentId ? [pick.parentId] : [])];
    const names = ["Я", st?.name, pr?.name].filter(Boolean);
    await addItem("threads", {
      kind: pick.parentId ? "Я + ученик + родитель" : "Я + ученик",
      members, memberNames: names, msgs: [],
    });
    setAdd(false); setPick({ studentId: "", parentId: "" });
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "270px 1fr", gap: 14, height: "calc(100vh - 150px)" }}>
      <Card style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {role === "tutor" && <button style={{ ...btn, margin: 12, justifyContent: "center" }} onClick={() => setAdd(true)}><Plus size={16} />Новый чат</button>}
        <div style={{ overflow: "auto", flex: 1 }}>
          {mine.map((t) => (
            <button key={t.id} onClick={() => setActiveId(t.id)} style={{ width: "100%", textAlign: "left", padding: "14px 15px", border: "none", borderBottom: `1px solid ${T.line}`, borderLeft: `3px solid ${active?.id === t.id ? T.accent : "transparent"}`, background: active?.id === t.id ? T.accentSoft : "transparent", cursor: "pointer" }}>
              <div style={{ font: `600 14px ${sans}`, color: T.ink }}>{t.kind}</div>
              <div style={{ font: `12px ${sans}`, color: T.faint, marginTop: 3 }}>{(t.memberNames || []).filter((n) => n !== "Я").join(", ")}</div>
            </button>
          ))}
          {mine.length === 0 && <div style={{ color: T.faint, font: `13px ${sans}`, padding: 16 }}>Чатов пока нет.</div>}
        </div>
      </Card>

      <Card style={{ display: "flex", flexDirection: "column" }}>
        {active ? <>
          <div style={{ padding: "13px 16px", borderBottom: `1px solid ${T.line}`, font: `600 15px ${sans}`, color: T.ink }}>{active.kind}</div>
          <div style={{ flex: 1, overflow: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {(active.msgs || []).map((m, i) => {
              const mineMsg = m.fromId === profile.uid;
              return (
                <div key={i} style={{ alignSelf: mineMsg ? "flex-end" : "flex-start", maxWidth: "72%" }}>
                  <div style={{ font: `11px ${sans}`, color: T.faint, marginBottom: 3, textAlign: mineMsg ? "right" : "left" }}>{m.fromName} · {m.t}</div>
                  <div style={{ padding: "9px 13px", borderRadius: 12, background: mineMsg ? T.accent : T.cardAlt, color: mineMsg ? "#fff" : T.ink, font: `14px/1.45 ${sans}`, border: mineMsg ? "none" : `1px solid ${T.line}` }}>{m.text}</div>
                </div>
              );
            })}
            {(active.msgs || []).length === 0 && <div style={{ color: T.faint, font: `13px ${sans}` }}>Сообщений пока нет — напишите первое.</div>}
          </div>
          <div style={{ display: "flex", gap: 10, padding: 12, borderTop: `1px solid ${T.line}` }}>
            <input style={input} placeholder="Сообщение…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
            <button style={{ ...btn, padding: "0 14px" }} onClick={send}><Send size={17} /></button>
          </div>
        </> : <div style={{ display: "grid", placeItems: "center", flex: 1, color: T.faint, font: `14px ${sans}` }}>Выберите чат</div>}
      </Card>

      <Modal open={add} onClose={() => setAdd(false)} title="Новый чат">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ font: `600 13px ${sans}`, color: T.soft, marginBottom: 6 }}>Ученик</div>
            <select style={input} value={pick.studentId} onChange={(e) => setPick({ ...pick, studentId: e.target.value })}>
              <option value="">— выберите —</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <div style={{ font: `600 13px ${sans}`, color: T.soft, marginBottom: 6 }}>Родитель (необязательно)</div>
            <select style={input} value={pick.parentId} onChange={(e) => setPick({ ...pick, parentId: e.target.value })}>
              <option value="">— без родителя —</option>
              {parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <button style={btn} onClick={create}>Создать чат</button>
        </div>
      </Modal>
    </div>
  );
}
