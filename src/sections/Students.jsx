import { useState } from "react";
import { Mail, BookOpen, ClipboardList, Award, TrendingUp, Users as UsersIcon, X, Trash2, Check, ShieldCheck } from "lucide-react";
import { Card, Modal, T, serif, sans, chip, btnGhost, btn, Avatar, initials, SUBJECTS, ROLE_LABEL } from "../ui.jsx";
import { CandleChart } from "../chart.jsx";
import { useAuth } from "../auth.jsx";
import { useCol, updateItem, removeItem } from "../useDB.js";
import { averagePct, computeWeakTopics } from "../grading.js";

export default function Students() {
  const { role } = useAuth();
  const { items: users } = useCol("users");
  const { items: homework } = useCol("homework");
  const { items: grades } = useCol("grades");
  const { items: mocks } = useCol("mocks");
  const { items: schedule } = useCol("schedule");
  const [open, setOpen] = useState(null);

  const students = users.filter((u) => u.role === "student");
  const parentOf = (sid) => users.find((u) => u.role === "parent" && u.childId === sid);

  const statsFor = (sid) => {
    const hw = homework.filter((h) => h.studentId === sid);
    const pendingHw = hw.filter((h) => h.status === "Выдана" || h.status === "Требует доработки");
    const doneLessons = schedule.filter((l) => l.studentId === sid && l.status === "done").length;
    const rows = [];
    grades.filter((g) => g.studentId === sid).forEach((g) => rows.push({ value: g.value, max: g.max, when: g.when, createdAt: g.createdAt }));
    hw.filter((h) => h.status === "Проверена").forEach((h) => {
      if (h.total) rows.push({ value: h.score, max: h.total, when: h.due, createdAt: h.createdAt });
      else if (h.grade) rows.push({ value: h.grade, max: null, when: h.due, createdAt: h.createdAt });
    });
    mocks.filter((m) => m.studentId === sid && m.status === "Пройден").forEach((m) => rows.push({ value: m.score, max: m.total, when: m.date, createdAt: m.createdAt }));
    rows.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    const avg = averagePct(rows);
    const weak = computeWeakTopics({ sid, homework, mocks }).slice(0, 3);
    return { pendingHw: pendingHw.length, doneLessons, avg, rows, weak, hwTotal: hw.length };
  };

  const pendingStaff = users.filter((u) => (u.role === "tutor" || u.role === "admin") && u.approved === false);
  const approveStaff = (u) => updateItem("users", u.id, { approved: true });
  const rejectStaff = (u) => { if (confirm(`Отклонить заявку «${u.name}»?`)) removeItem("users", u.id); };

  return (
    <div>
      {(role === "tutor" || role === "admin") && pendingStaff.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ font: `600 14px ${sans}`, color: T.ink, marginBottom: 10, display: "flex", alignItems: "center", gap: 7 }}><ShieldCheck size={16} color={T.accent} />Ожидают подтверждения доступа</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pendingStaff.map((u) => (
              <Card key={u.id} style={{ padding: 14, display: "flex", alignItems: "center", gap: 12, border: "1.5px solid #f0d9a6" }}>
                <Avatar text={initials(u.name)} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: `600 14px ${sans}`, color: T.ink }}>{u.name}</div>
                  <div style={{ font: `12px ${sans}`, color: T.faint }}>{u.email} · регистрируется как {ROLE_LABEL[u.role]}</div>
                </div>
                <button style={{ ...btn, padding: "8px 13px" }} onClick={() => approveStaff(u)}><Check size={15} />Одобрить</button>
                <button style={{ ...btnGhost, padding: "8px 13px", color: "#a23b2d" }} onClick={() => rejectStaff(u)}><X size={15} />Отклонить</button>
              </Card>
            ))}
          </div>
        </div>
      )}
      <div style={{ font: `13px ${sans}`, color: T.faint, marginBottom: 16 }}>Общий реестр учеников — успеваемость, занятия, слабые места и связанные аккаунты родителей.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
        {students.map((st) => {
          const s = statsFor(st.id);
          const parent = parentOf(st.id);
          return (
            <Card key={st.id} onClick={() => setOpen(st.id)} style={{ padding: 18, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar text={initials(st.name)} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: `600 15px ${sans}`, color: T.ink }}>{st.name}</div>
                  <div style={{ font: `12px ${sans}`, color: T.faint }}>{st.subject || "предмет не указан"}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                <span style={chip}>{s.avg != null ? `${s.avg}% ср. балл` : "нет оценок"}</span>
                <span style={chip}>{s.doneLessons}/{st.paidLessons || 0} занятий</span>
                {s.pendingHw > 0 && <span style={{ ...chip, background: "#f0d9a6" }}>{s.pendingHw} активных ДЗ</span>}
                {parent && <span style={chip}>родитель подключён</span>}
              </div>
              {s.weak.length > 0 && (
                <div style={{ marginTop: 10, font: `12px ${sans}`, color: T.faint }}>
                  Слабое место: <b style={{ color: T.ink }}>{s.weak[0].topic}</b> ({s.weak[0].pct}%)
                </div>
              )}
            </Card>
          );
        })}
        {students.length === 0 && <div style={{ color: T.faint, font: `14px ${sans}`, padding: 24 }}>Учеников пока нет — они появятся здесь после регистрации.</div>}
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} title={students.find((s) => s.id === open)?.name} wide>
        {open && (() => {
          const st = students.find((s) => s.id === open);
          const s = statsFor(open);
          const parent = parentOf(open);
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <Avatar text={initials(st.name)} size={54} />
                <div>
                  <div style={{ font: `700 19px ${serif}`, color: T.ink }}>{st.name}</div>
                  <div style={{ font: `13px ${sans}`, color: T.faint, display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}><Mail size={13} />{st.email || "email не указан"}</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <StatChip icon={BookOpen} label="Предмет" value={st.subject || "—"} />
                <StatChip icon={TrendingUp} label="Средний балл" value={s.avg != null ? s.avg + "%" : "—"} />
                <StatChip icon={ClipboardList} label="Занятий" value={`${s.doneLessons} из ${st.paidLessons || 0}`} />
                <StatChip icon={Award} label="Активных ДЗ" value={s.pendingHw} />
              </div>

              <div>
                <div style={{ font: `600 14px ${sans}`, color: T.ink, marginBottom: 8 }}>Динамика баллов</div>
                <CandleChart rows={s.rows} />
              </div>

              <div>
                <div style={{ font: `600 14px ${sans}`, color: T.ink, marginBottom: 8 }}>Слабые места</div>
                {s.weak.length === 0 ? <div style={{ font: `13px ${sans}`, color: T.faint }}>Пока недостаточно данных.</div> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {s.weak.map((w, i) => {
                      const color = w.pct < 50 ? T.down : w.pct < 75 ? "#d9a622" : T.up;
                      return (
                        <div key={i}>
                          <div style={{ display: "flex", justifyContent: "space-between", font: `13px ${sans}`, marginBottom: 4 }}><span>{w.topic}</span><b style={{ color }}>{w.pct}%</b></div>
                          <div style={{ height: 5, borderRadius: 4, background: T.line, overflow: "hidden" }}><div style={{ height: "100%", width: `${w.pct}%`, background: color }} /></div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <div style={{ font: `600 14px ${sans}`, color: T.ink, marginBottom: 6 }}>Доступ к предметам библиотеки</div>
                <div style={{ font: `12px ${sans}`, color: T.faint, marginBottom: 10 }}>По умолчанию ученик видит в библиотеке материалы только своего основного предмета. Здесь можно открыть доступ и к другим.</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {SUBJECTS.map((subj) => {
                    const current = st.subjectAccess && st.subjectAccess.length ? st.subjectAccess : [st.subject].filter(Boolean);
                    const on = current.includes(subj);
                    const toggle = () => {
                      const next = on ? current.filter((x) => x !== subj) : [...current, subj];
                      updateItem("users", st.id, { subjectAccess: next });
                    };
                    return (
                      <button key={subj} onClick={toggle} style={{ padding: "7px 12px", borderRadius: 8, border: `1.5px solid ${on ? T.accent : T.line}`, background: on ? T.accentSoft : T.cardAlt, font: `600 12.5px ${sans}`, color: T.ink, cursor: "pointer" }}>
                        {subj}{subj === st.subject ? " (основной)" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, font: `13px ${sans}`, color: T.faint, borderTop: `1px solid ${T.line}`, paddingTop: 14 }}>
                <UsersIcon size={15} />
                {parent ? `Родительский аккаунт подключён: ${parent.name}` : "Родительский аккаунт пока не подключён"}
              </div>

              <button
                style={{ ...btnGhost, color: "#a23b2d", alignSelf: "flex-start" }}
                onClick={() => {
                  if (confirm(`Удалить ${st.name} из списка учеников? Вход в аккаунт для ученика станет недоступен внутри приложения, но история домашних заданий и оценок сохранится в базе.`)) {
                    removeItem("users", st.id);
                    setOpen(null);
                  }
                }}
              ><Trash2 size={15} />Удалить ученика</button>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

function StatChip({ icon: Icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: T.cardAlt, border: `1px solid ${T.line}` }}>
      <Icon size={16} color={T.accent} />
      <div>
        <div style={{ font: `11px ${sans}`, color: T.faint }}>{label}</div>
        <div style={{ font: `600 14px ${sans}`, color: T.ink }}>{value}</div>
      </div>
    </div>
  );
}
