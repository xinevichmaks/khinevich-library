import { useState } from "react";
import { CalendarDays, Plus, Trash2, Wallet, ChevronDown, ChevronUp } from "lucide-react";
import { Card, Modal, T, serif, sans, btn, btnGhost, input, chip, iconBtn, Avatar, initials } from "../ui.jsx";
import { DatePicker, fmtDateRu } from "../calendar.jsx";
import { useAuth } from "../auth.jsx";
import { useCol, addItem, updateItem, removeItem } from "../useDB.js";

export const SCHED_STATUSES = [
  { key: "planned", label: "Запланировано" },
  { key: "done", label: "Проведено" },
  { key: "moved", label: "Перенесено" },
  { key: "cancelled", label: "Отменено" },
];
const SCHED_COLOR = { planned: T.line, done: T.accentSoft, moved: "#f0d9a6", cancelled: "#e7c6c1" };

export default function Schedule() {
  const { profile, role } = useAuth();
  const sid = role === "student" ? profile.uid : role === "parent" ? profile.childId : null;
  const { items: users } = useCol("users");
  const { items: schedule } = useCol("schedule");
  const students = users.filter((u) => u.role === "student");
  const [linked, setLinked] = useState(false);
  const [add, setAdd] = useState(false);
  const [move, setMove] = useState(null); // занятие, которое переносим
  const [moveForm, setMoveForm] = useState({ date: "", time: "" });
  const [form, setForm] = useState({ studentId: "", topic: "", date: "", time: "" });

  const list = (sid ? schedule.filter((l) => l.studentId === sid) : schedule)
    .slice().sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  const save = async () => {
    if (!form.studentId || !form.topic) return;
    const st = users.find((u) => u.id === form.studentId);
    await addItem("schedule", { ...form, studentName: st?.name || "", status: "planned" });
    setAdd(false); setForm({ studentId: "", topic: "", date: "", time: "" });
  };

  const setStatus = async (l, status) => {
    if (status === "moved") { setMove(l); setMoveForm({ date: l.date, time: l.time }); return; }
    await updateItem("schedule", l.id, { status });
  };
  const confirmMove = async () => {
    if (!move) return;
    await updateItem("schedule", move.id, { origDate: move.date, origTime: move.time, date: moveForm.date || move.date, time: moveForm.time || move.time, status: "moved" });
    setMove(null);
  };

  return (
    <div>
      {role === "tutor" && <PaidCounter students={students} schedule={schedule} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ font: `14px ${sans}`, color: T.soft }}>Занятия</div>
        <div style={{ display: "flex", gap: 10 }}>
          {role === "tutor" && <button style={linked ? btnGhost : btn} onClick={() => setLinked(!linked)}><CalendarDays size={16} />{linked ? "Google Calendar подключён" : "Подключить Google Calendar"}</button>}
          {role === "tutor" && <button style={btn} onClick={() => setAdd(true)}><Plus size={16} />Занятие</button>}
        </div>
      </div>
      {linked && <div style={{ font: `13px ${sans}`, color: T.soft, marginBottom: 14, padding: "10px 12px", background: T.accentSoft, borderRadius: 9 }}>Синхронизация с Google Calendar и пуш-напоминания подключаются через OAuth и Cloud Functions — следующий этап.</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {list.map((l) => {
          const cancelled = l.status === "cancelled";
          return (
            <Card key={l.id} style={{ padding: 15, display: "flex", alignItems: "center", gap: 14, opacity: cancelled ? 0.55 : 1 }}>
              <div style={{ textAlign: "center", width: 70 }}>
                {l.status === "moved" && <div style={{ font: `11px ${sans}`, color: T.faint, textDecoration: "line-through" }}>{fmtDateRu(l.origDate)}</div>}
                <div style={{ font: `700 15px ${serif}`, color: T.ink }}>{fmtDateRu(l.date) || "—"}</div>
                <div style={{ font: `12px ${sans}`, color: T.faint }}>{l.time}</div>
              </div>
              <div style={{ width: 1, height: 36, background: T.line }} />
              <div style={{ flex: 1 }}>
                <div style={{ font: `600 15px ${sans}`, color: T.ink, textDecoration: cancelled ? "line-through" : "none" }}>{l.topic}</div>
                <div style={{ font: `13px ${sans}`, color: T.faint }}>{l.studentName}</div>
              </div>
              {role === "tutor" ? (
                <select value={l.status || "planned"} onChange={(e) => setStatus(l, e.target.value)}
                  style={{ ...chip, background: SCHED_COLOR[l.status] || T.line, color: T.ink, border: "none", cursor: "pointer", padding: "5px 10px" }}>
                  {SCHED_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              ) : (
                <span style={{ ...chip, background: SCHED_COLOR[l.status] || T.line }}>{SCHED_STATUSES.find((s) => s.key === l.status)?.label || "Запланировано"}</span>
              )}
              {role === "tutor" && <button onClick={() => removeItem("schedule", l.id)} style={{ ...iconBtn, color: T.faint }}><Trash2 size={16} /></button>}
            </Card>
          );
        })}
        {list.length === 0 && <div style={{ color: T.faint, font: `14px ${sans}`, padding: 24 }}>Занятий пока нет.</div>}
      </div>
      <div style={{ font: `12px ${sans}`, color: T.faint, marginTop: 10 }}>Статус занятия меняется в выпадающем списке. При выборе «Перенесено» откроется окно для новой даты — старая останется видна зачёркнутой. «Отменено» не удаляет занятие, а просто помечает его неактивным.</div>

      <Modal open={add} onClose={() => setAdd(false)} title="Новое занятие">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <select style={input} value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>
            <option value="">— ученик —</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input style={input} placeholder="Тема занятия" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
          <div style={{ display: "flex", gap: 10 }}>
            <DatePicker value={form.date} onChange={(d) => setForm({ ...form, date: d })} />
            <input style={input} placeholder="Время (16:00)" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </div>
          <button style={btn} onClick={save}>Добавить</button>
        </div>
      </Modal>

      <Modal open={!!move} onClose={() => setMove(null)} title="Перенести занятие">
        {move && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ font: `13px ${sans}`, color: T.faint }}>Текущая дата: <b style={{ color: T.ink }}>{fmtDateRu(move.date)}, {move.time}</b>. Старая дата сохранится в истории, зачёркнутой.</div>
            <DatePicker value={moveForm.date} onChange={(d) => setMoveForm({ ...moveForm, date: d })} />
            <input style={input} placeholder="Новое время" value={moveForm.time} onChange={(e) => setMoveForm({ ...moveForm, time: e.target.value })} />
            <button style={btn} onClick={confirmMove}>Подтвердить перенос</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ---------- счётчик оплаченных занятий (для репетитора) ---------- */
function PaidCounter({ students, schedule }) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(null);
  const [amount, setAmount] = useState("");

  const addPaid = async (st, delta) => {
    const n = Math.max(0, (st.paidLessons || 0) + delta);
    await updateItem("users", st.id, { paidLessons: n });
  };
  const setPaid = async (st) => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 0) return;
    await updateItem("users", st.id, { paidLessons: n });
    setEditing(null); setAmount("");
  };

  if (students.length === 0) return null;

  return (
    <Card style={{ padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setOpen(!open)}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, font: `600 15px ${sans}`, color: T.ink }}>
          <Wallet size={17} color={T.accent} />Счётчик оплаченных занятий
        </div>
        <button style={{ ...iconBtn, border: "none" }}>{open ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</button>
      </div>

      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          {students.map((st) => {
            const paid = st.paidLessons || 0;
            const done = schedule.filter((l) => l.studentId === st.id && l.status === "done").length;
            const left = Math.max(0, paid - done);
            const pct = paid > 0 ? Math.min(100, Math.round((done / paid) * 100)) : 0;
            return (
              <div key={st.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderTop: `1px solid ${T.line}` }}>
                <Avatar text={initials(st.name)} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: `600 14px ${sans}`, color: T.ink }}>{st.name}{st.subject && <span style={{ ...chip, marginLeft: 6 }}>{st.subject}</span>}</div>
                  <div style={{ font: `12px ${sans}`, color: T.faint, marginTop: 2 }}>
                    проведено <b style={{ color: T.ink }}>{done}</b> из <b style={{ color: T.ink }}>{paid}</b> оплаченных
                    {paid > 0 && <> · осталось {left}</>}
                  </div>
                  {paid > 0 && (
                    <div style={{ height: 5, borderRadius: 4, background: T.line, marginTop: 6, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: left === 0 ? "#8a3b32" : T.accent, borderRadius: 4 }} />
                    </div>
                  )}
                </div>
                {editing === st.id ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input style={{ ...input, width: 70, padding: "7px 9px" }} placeholder="Пакет" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
                    <button style={{ ...btn, padding: "7px 11px" }} onClick={() => setPaid(st)}>OK</button>
                    <button style={{ ...btnGhost, padding: "7px 11px" }} onClick={() => { setEditing(null); setAmount(""); }}>×</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button title="Убрать одно занятие (если ошиблись)" style={{ ...btnGhost, padding: "7px 11px" }} onClick={() => addPaid(st, -1)}>−1</button>
                    <button title="Добавить 1 оплаченное занятие" style={{ ...btnGhost, padding: "7px 11px" }} onClick={() => addPaid(st, 1)}>+1</button>
                    <button title="Задать число оплаченных занятий" style={{ ...btnGhost, padding: "7px 11px" }} onClick={() => { setEditing(st.id); setAmount(String(paid)); }}>изменить</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
