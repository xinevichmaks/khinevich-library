import { useState } from "react";
import { Plus, Award, Trash2 } from "lucide-react";
import { Card, Modal, T, serif, sans, btn, btnGhost, input, Avatar, initials } from "../ui.jsx";
import { CandleChart } from "../chart.jsx";
import { useAuth } from "../auth.jsx";
import { useCol, addItem, removeItem, notify } from "../useDB.js";
import { averagePct } from "../grading.js";

// Собирает записи журнала (домашка со статусом «Проверена» + пробники «Пройден» + оценки вручную)
function buildRows({ sid, homework, grades, mocks }) {
  const rows = [];
  homework.filter((h) => h.studentId === sid && h.status === "Проверена").forEach((h) => {
    if (h.total) {
      rows.push({ subject: "Домашнее задание (автопроверка)", title: h.title, value: h.score, max: h.total, comment: `${h.score} из ${h.total} верно`, when: h.due || "", createdAt: h.createdAt, editable: false });
    } else {
      rows.push({ subject: "Домашнее задание", title: h.title, value: h.grade, max: null, comment: h.desc || "", when: h.due || "", createdAt: h.createdAt, editable: false });
    }
  });
  mocks.filter((m) => m.studentId === sid && m.status === "Пройден").forEach((m) =>
    rows.push({ subject: `${m.subject || "Пробник"} (пробник)`, title: m.title, value: m.score, max: m.total, comment: `${m.score} из ${m.total} баллов`, when: m.date || "", createdAt: m.createdAt, editable: false }));
  grades.filter((g) => g.studentId === sid).forEach((g) =>
    rows.push({ id: g.id, subject: g.subject || "Занятие", title: g.title, value: g.value, max: g.max, comment: g.comment, when: g.when, createdAt: g.createdAt, editable: true }));
  return rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export default function Grades() {
  const { profile, role } = useAuth();
  const { items: users } = useCol("users");
  const { items: homework } = useCol("homework");
  const { items: grades } = useCol("grades");
  const { items: mocks } = useCol("mocks");

  const students = users.filter((u) => u.role === "student" && (role === "admin" || u.tutorId === profile.uid));
  const sid = role === "student" ? profile.uid : role === "parent" ? profile.childId : null;
  const shown = sid ? students.filter((s) => s.id === sid) : students;

  const [add, setAdd] = useState(null); // studentId
  const [form, setForm] = useState({ subject: "", title: "", value: "", max: "", comment: "" });

  const saveGrade = async () => {
    if (!form.title || !form.value) return;
    const st = users.find((u) => u.id === add);
    await addItem("grades", { studentId: add, studentName: st?.name || "", tutorId: profile.uid, ...form, when: new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) });
    await notify(add, st?.name || "", `Новая оценка: ${form.value}${form.max ? "/" + form.max : ""} — «${form.title}»`, "new_grade");
    setAdd(null); setForm({ subject: "", title: "", value: "", max: "", comment: "" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {shown.map((st) => {
        const rows = buildRows({ sid: st.id, homework, grades, mocks });
        const avg = averagePct(rows);
        return (
          <Card key={st.id} style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", borderBottom: `1px solid ${T.line}`, background: T.cardAlt }}>
              <Avatar text={initials(st.name)} size={38} />
              <div style={{ flex: 1 }}>
                <div style={{ font: `600 16px ${sans}`, color: T.ink }}>{st.name}</div>
                <div style={{ font: `12px ${sans}`, color: T.faint }}>{rows.length} {rows.length === 1 ? "запись" : "записей"} в журнале{avg != null ? ` · средний балл ${avg}%` : ""}</div>
              </div>
              <Award size={17} color={T.accent} />
              {role === "tutor" && <button style={{ ...btn, padding: "8px 13px" }} onClick={() => setAdd(st.id)}><Plus size={15} />Оценка</button>}
            </div>

            {rows.length > 0 && (
              <div style={{ padding: "16px 18px", borderBottom: `1px solid ${T.line}` }}>
                <CandleChart rows={rows} />
              </div>
            )}

            {rows.length === 0 ? (
              <div style={{ font: `14px ${sans}`, color: T.faint, padding: "18px" }}>Пока нет оценок.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", font: `13.5px ${sans}` }}>
                  <thead>
                    <tr style={{ background: T.card }}>
                      <th style={thStyle}>Дата</th>
                      <th style={thStyle}>Предмет / за что</th>
                      <th style={{ ...thStyle, textAlign: "center" }}>Оценка</th>
                      <th style={thStyle}>Комментарий</th>
                      {role === "tutor" && <th style={thStyle}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} style={{ borderTop: `1px solid ${T.line}` }}>
                        <td style={{ ...tdStyle, color: T.faint, whiteSpace: "nowrap" }}>{r.when || "—"}</td>
                        <td style={tdStyle}>
                          <div style={{ font: `600 13.5px ${sans}`, color: T.ink }}>{r.subject}</div>
                          <div style={{ font: `12px ${sans}`, color: T.faint }}>{r.title}</div>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          <span style={{ display: "inline-block", minWidth: 34, padding: "3px 9px", borderRadius: 7, background: T.accentSoft, color: T.accentDk, font: `700 14px ${serif}` }}>{r.value ? (r.max ? `${r.value}/${r.max}` : r.value) : "—"}</span>
                        </td>
                        <td style={{ ...tdStyle, color: T.soft }}>{r.comment || "—"}</td>
                        {role === "tutor" && (
                          <td style={tdStyle}>
                            {r.editable && <button style={{ ...btnGhost, padding: "5px 8px" }} onClick={() => removeItem("grades", r.id)}><Trash2 size={13} /></button>}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        );
      })}
      {shown.length === 0 && <div style={{ color: T.faint, font: `14px ${sans}`, padding: 24 }}>{sid ? "Профиль ещё не привязан к ученику." : "Учеников пока нет."}</div>}

      <Modal open={!!add} onClose={() => setAdd(null)} title="Поставить оценку">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input style={input} placeholder="Предмет (напр. Английский язык)" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <input style={input} placeholder="За что (напр. Устный ответ, контрольная)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div style={{ display: "flex", gap: 10 }}>
            <input style={input} placeholder="Оценка (напр. 5 или 87)" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            <input style={input} placeholder="Из (макс, необязательно)" value={form.max} onChange={(e) => setForm({ ...form, max: e.target.value })} />
          </div>
          <input style={input} placeholder="Комментарий (необязательно)" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
          <button style={btn} onClick={saveGrade}>Сохранить оценку</button>
        </div>
      </Modal>
    </div>
  );
}

const thStyle = { textAlign: "left", padding: "9px 14px", font: `600 11px ${sans}`, color: T.faint, textTransform: "uppercase", letterSpacing: .3 };
const tdStyle = { padding: "10px 14px", verticalAlign: "top" };
