import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Wallet, BookOpen, Award, ChevronRight, PencilLine, AlertTriangle, X } from "lucide-react";
import { Card, T, serif, sans, chip } from "../ui.jsx";
import { MonthCalendar } from "../calendar.jsx";
import { CandleChart } from "../chart.jsx";
import { useAuth } from "../auth.jsx";
import { useCol, updateItem } from "../useDB.js";
import { scoreFraction, averagePct, computeWeakTopics } from "../grading.js";
import { fmtDateRu } from "../calendar.jsx";

function Stat({ label, val, Icon, sub }) {
  return (
    <Card style={{ padding: 20, flex: 1, minWidth: 220 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ font: `600 12px ${sans}`, color: T.soft, letterSpacing: .3, textTransform: "uppercase" }}>{label}</span>
        <Icon size={18} color={T.accent} />
      </div>
      <div style={{ font: `700 30px ${serif}`, color: T.ink, marginTop: 8 }}>{val}</div>
      {sub && <div style={{ font: `13px ${sans}`, color: T.faint, marginTop: 2 }}>{sub}</div>}
    </Card>
  );
}

function parseDay(s) { const n = parseInt(s, 10); return Number.isFinite(n) ? n : null; }

/* ---------- слабые места ---------- */
function WeakTopics({ sid, homework, mocks, tutorView }) {
  const data = useMemo(() => computeWeakTopics({ sid, homework, mocks }).slice(0, 5), [sid, homework, mocks]);
  return (
    <Card style={{ padding: 18 }}>
      <div style={{ font: `600 15px ${sans}`, color: T.ink, marginBottom: 2 }}>Слабые места</div>
      <div style={{ font: `12px ${sans}`, color: T.faint, marginBottom: 8 }}>{tutorView ? "по всем ученикам · темы вопросов из автопроверки" : "темы, где чаще всего ошибки"}</div>
      {data.length === 0 ? <div style={{ font: `14px ${sans}`, color: T.faint }}>Пока недостаточно данных — нужны пройденные вопросы с темами.</div> : data.map((t, i) => {
        const color = t.pct < 50 ? T.down : t.pct < 75 ? "#d9a622" : T.up;
        return (
          <div key={i} style={{ padding: "10px 0", borderBottom: i < data.length - 1 ? `1px solid ${T.line}` : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <div style={{ font: `600 13.5px ${sans}` }}>{t.topic}</div>
              <div style={{ font: `700 13px ${serif}`, color }}>{t.pct}%</div>
            </div>
            <div style={{ height: 5, borderRadius: 4, background: T.line, overflow: "hidden" }}><div style={{ height: "100%", width: `${t.pct}%`, background: color }} /></div>
            <div style={{ font: `11.5px ${sans}`, color: T.faint, marginTop: 3 }}>{t.correct} из {t.total} верно</div>
          </div>
        );
      })}
    </Card>
  );
}

export default function Dashboard({ go }) {
  const { profile, role } = useAuth();
  const sid = role === "student" ? profile.uid : role === "parent" ? profile.childId : null;

  const { items: users } = useCol("users");
  const { items: homework } = useCol("homework");
  const { items: grades } = useCol("grades");
  const { items: schedule } = useCol("schedule");
  const { items: mocks } = useCol("mocks");

  const scoped = (arr) => (sid ? arr.filter((x) => x.studentId === sid) : (role === "admin" ? arr : arr.filter((x) => x.tutorId === profile.uid)));
  const myProfile = sid ? users.find((u) => u.id === sid) : null;

  const myHw = useMemo(() => scoped(homework).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)), [homework, sid]);
  const doneLessons = scoped(schedule).filter((l) => l.status === "done").length;

  const gradeRows = useMemo(() => {
    const rows = [];
    scoped(grades).forEach((g) => rows.push({ value: g.value, max: g.max, when: g.when, createdAt: g.createdAt }));
    scoped(homework).filter((h) => h.status === "Проверена").forEach((h) => {
      if (h.total) rows.push({ value: h.score, max: h.total, when: h.due, createdAt: h.createdAt });
      else if (h.grade) rows.push({ value: h.grade, max: null, when: h.due, createdAt: h.createdAt });
    });
    scoped(mocks).filter((m) => m.status === "Пройден").forEach((m) => rows.push({ value: m.score, max: m.total, when: m.date, createdAt: m.createdAt }));
    return rows.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }, [grades, homework, mocks, sid]);

  const avgScore = averagePct(gradeRows);

  // Ожидающая домашка — до 5 записей, невыполненные сначала
  const pendingHw = useMemo(() => {
    const src = role === "tutor" ? scoped(homework) : role === "admin" ? homework : myHw;
    return [...src].sort((a, b) => (a.status === "Проверена" ? 1 : 0) - (b.status === "Проверена" ? 1 : 0)).slice(0, 5);
  }, [homework, myHw, role]);

  const lessonDays = scoped(schedule).filter((l) => l.status !== "cancelled").map((l) => l.date).filter(Boolean);
  const mockDays = scoped(mocks).map((m) => m.date).filter(Boolean);

  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);

  // Просроченные ДЗ — статус «Выдана», срок прошёл. Автоматически помечаем «Не выполнена».
  const overdueHw = useMemo(() => scoped(homework)
    .filter((h) => h.status === "Не выполнена" || (h.status === "Выдана" && h.due && h.due < todayISO))
    .sort((a, b) => (a.due || "").localeCompare(b.due || "")), [homework, sid, todayISO]);

  useEffect(() => {
    homework.forEach((h) => {
      if (h.status === "Выдана" && h.due && h.due < todayISO) {
        updateItem("homework", h.id, { status: "Не выполнена" });
      }
    });
  }, [homework, todayISO]);

  const notYetDone = overdueHw.length;

  const [showOverdueToast, setShowOverdueToast] = useState(true);

  // прогноз даты новой оплаты — для родителя
  const paidPrediction = useMemo(() => {
    if (role !== "parent" || !myProfile) return null;
    const paid = myProfile.paidLessons || 0;
    const done = doneLessons;
    const remaining = Math.max(0, paid - done);
    const doneDates = scoped(schedule).filter((l) => l.status === "done" && l.date).map((l) => new Date(l.date + "T00:00:00")).sort((a, b) => a - b);
    const avgGap = doneDates.length >= 2 ? (doneDates[doneDates.length - 1] - doneDates[0]) / 86400000 / (doneDates.length - 1) : 3.5;
    const daysUntil = Math.max(0, remaining - 1) * avgGap;
    const date = new Date(now.getTime() + daysUntil * 86400000);
    const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
    return { paid, done, remaining, label: remaining <= 0 ? "уже пора" : `${date.getDate()} ${months[date.getMonth()]}`, avgGap };
  }, [role, myProfile, doneLessons]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {role === "tutor" && <>
          <Stat label="Занятий" val={scoped(schedule).length} Icon={CalendarDays} />
          <Stat label="Домашек выдано" val={scoped(homework).length} Icon={BookOpen} sub={
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{ ...chip, background: "#cfe0cf" }}>{scoped(homework).filter((h) => h.status !== "Выдана" && h.status !== "Не выполнена").length} сданы</span>
              {notYetDone > 0 && <span style={{ ...chip, background: "#e7c6c1" }}>{notYetDone} не выполнено</span>}
            </div>
          } />
          <Stat label="Пробников" val={scoped(mocks).length} Icon={PencilLine} sub={`${scoped(mocks).filter((m) => m.status === "Пройден").length} пройдено`} />
        </>}
        {role !== "tutor" && <>
          <Stat label="Занятий проведено" val={doneLessons} Icon={Wallet} sub={myProfile?.paidLessons ? `из ${myProfile.paidLessons} оплаченных` : undefined} />
          <Stat label="Домашек" val={myHw.length} Icon={BookOpen} sub={
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{ ...chip, background: "#cfe0cf" }}>{myHw.filter((h) => h.status !== "Выдана" && h.status !== "Не выполнена").length} выполнено</span>
              {notYetDone > 0 && <span style={{ ...chip, background: "#e7c6c1" }}>{notYetDone} не выполнено</span>}
            </div>
          } />
          <Stat label="Пробников" val={scoped(mocks).length} Icon={PencilLine} sub={`${scoped(mocks).filter((m) => m.status === "Пройден").length} пройдено`} />
        </>}
      </div>

      {overdueHw.length > 0 && showOverdueToast && (
        <div style={{ position: "fixed", top: 20, right: 20, width: 320, background: T.card, border: `1px solid #e7c6c1`, borderRadius: 12, padding: "14px 16px", display: "flex", gap: 10, alignItems: "flex-start", boxShadow: "0 12px 32px rgba(0,0,0,.18)", zIndex: 100 }}>
          <AlertTriangle size={20} color="#a23b2d" style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ font: `600 14px ${sans}`, color: T.ink, marginBottom: 2 }}>Дедлайн истёк</div>
            <div style={{ font: `13px ${sans}`, color: T.faint }}>
              «{overdueHw[0].title}»{role === "tutor" || role === "admin" ? ` — ${overdueHw[0].studentName}` : ""} не сдано до {fmtDateRu(overdueHw[0].due)}.{overdueHw.length > 1 ? ` И ещё ${overdueHw.length - 1}.` : ""}
            </div>
          </div>
          <button onClick={() => setShowOverdueToast(false)} style={{ background: "none", border: "none", color: T.faint, cursor: "pointer", padding: 2 }}><X size={16} /></button>
        </div>
      )}

      {overdueHw.length > 0 && (
        <Card style={{ padding: 18 }}>
          <div style={{ font: `600 15px ${sans}`, color: T.ink, marginBottom: 10, display: "flex", alignItems: "center", gap: 7 }}><AlertTriangle size={16} color="#a23b2d" />Просроченные задания</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {overdueHw.map((h) => (
              <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 12, background: T.cardAlt, borderLeft: "3px solid #a23b2d", borderRadius: "0 8px 8px 0", padding: "10px 14px" }}>
                <AlertTriangle size={16} color="#a23b2d" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: `600 13.5px ${sans}`, color: T.ink }}>{h.title}</div>
                  <div style={{ font: `12px ${sans}`, color: T.faint }}>{(role === "tutor" || role === "admin") ? `${h.studentName} · ` : ""}срок был {fmtDateRu(h.due)}</div>
                </div>
                <span style={{ ...chip, background: "#e7c6c1" }}>Не выполнена</span>
              </div>
            ))}
          </div>
          <button onClick={() => go("homework")} style={{ marginTop: 10, font: `600 13px ${sans}`, color: T.accent, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3, padding: 0 }}>Открыть Домашку <ChevronRight size={14} /></button>
        </Card>
      )}

      {role !== "tutor" && role !== "admin" && (
        <Card style={{ padding: 18 }}>
          <div style={{ font: `600 15px ${sans}`, color: T.ink, marginBottom: 2 }}>Ожидающая домашка</div>
          <div style={{ font: `12px ${sans}`, color: T.faint, marginBottom: 6 }}>до 5 последних заданий</div>
          {pendingHw.length === 0 ? <div style={{ font: `14px ${sans}`, color: T.faint, padding: "6px 0" }}>Домашних заданий пока нет.</div> :
            pendingHw.map((h) => (
              <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 0", borderBottom: `1px solid ${T.line}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: `600 13.5px ${sans}`, color: T.ink }}>{h.title}</div>
                  <div style={{ font: `12px ${sans}`, color: T.faint }}>{role === "tutor" ? `${h.studentName} · ` : ""}срок {h.due || "—"}</div>
                </div>
                <span style={chip}>{h.status}</span>
              </div>
            ))}
          <button onClick={() => go("homework")} style={{ marginTop: 10, font: `600 13px ${sans}`, color: T.accent, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3, padding: 0 }}>Все задания <ChevronRight size={14} /></button>
        </Card>
      )}

      {role !== "tutor" && role !== "admin" && (
        <Card style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
            <div style={{ font: `600 16px ${sans}` }}>Динамика баллов</div>
            <div style={{ font: `13px ${sans}`, color: T.faint }}>средний балл: <b style={{ color: T.ink }}>{avgScore == null ? "—" : avgScore + "%"}</b></div>
          </div>
          <CandleChart rows={gradeRows} />
          <div style={{ font: `11.5px ${sans}`, color: T.faint, marginTop: 6 }}>зелёная свеча — балл вырос к предыдущему, красная — снизился · шкала: 5→100%, 4→80%, 3→60%, 2→40%, либо балл из максимума</div>
        </Card>
      )}

      {role !== "tutor" && role !== "admin" && (
        <WeakTopics sid={sid} homework={scoped(homework)} mocks={scoped(mocks)} tutorView={role === "tutor"} />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18 }}>
        <MonthCalendar title="Занятия" markedDates={lessonDays} color={T.down} legend="занятие" />
        <MonthCalendar title="Пробники" markedDates={mockDays} color={T.up} legend="пробник" />
      </div>

      {role === "parent" && paidPrediction && (
        <Card style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
            <div style={{ font: `600 15px ${sans}` }}>Счётчик оплаченных занятий</div>
            <Award size={18} color={T.accent} />
          </div>
          <div style={{ font: `12px ${sans}`, color: T.faint, marginBottom: 10 }}>проведено {paidPrediction.done} из {paidPrediction.paid} оплаченных · осталось {paidPrediction.remaining}</div>
          <div style={{ height: 8, borderRadius: 4, background: T.line, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${paidPrediction.paid ? Math.min(100, Math.round(paidPrediction.done / paidPrediction.paid * 100)) : 0}%`, background: paidPrediction.remaining === 0 ? T.down : T.accent }} />
          </div>
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.line}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ font: `600 14px ${sans}` }}>Потенциальная дата новой оплаты</div>
              <div style={{ font: `12px ${sans}`, color: T.faint, marginTop: 2 }}>расчёт по темпу занятий, с запасом в 1 занятие</div>
            </div>
            <div style={{ font: `700 24px ${serif}`, color: paidPrediction.remaining <= 1 ? T.down : T.ink }}>{paidPrediction.label}</div>
          </div>
          <div style={{ font: `11.5px ${sans}`, color: T.faint, marginTop: 10 }}>формула: дата = сегодня + (оплачено − использовано − 1) × средний интервал между занятиями ({paidPrediction.avgGap.toFixed(1)} дн., по факту проведённых занятий)</div>
        </Card>
      )}
    </div>
  );
}
