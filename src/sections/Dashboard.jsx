import { useMemo, useState } from "react";
import { CalendarDays, Wallet, BookOpen, Award, ChevronRight } from "lucide-react";
import { Card, T, serif, sans, chip } from "../ui.jsx";
import { useAuth } from "../auth.jsx";
import { useCol } from "../useDB.js";
import { scoreFraction, averagePct, computeWeakTopics } from "../grading.js";

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

/* ---------- свечной график динамики баллов ---------- */
function CandleChart({ rows }) {
  const [tip, setTip] = useState(null); // { x, y, text }
  const pts = rows.map((r) => { const f = scoreFraction(r.value, r.max); return { when: r.when, pct: f == null ? null : f * 100 }; }).filter((p) => p.pct != null);
  if (!pts.length) return <div style={{ font: `14px ${sans}`, color: T.faint, padding: "14px 0" }}>Здесь появится график, когда в журнале будут оценки.</div>;

  const W = 900, H = 220, padL = 34, padR = 14, padT = 14, padB = 10;
  const chartW = W - padL - padR, chartH = H - padT - padB;
  const n = pts.length, step = chartW / n;
  const candleW = Math.max(10, Math.min(34, step * 0.5));
  const y = (pct) => padT + chartH - (pct / 100) * chartH;

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 260 }} preserveAspectRatio="xMidYMid meet">
        {[0, 20, 40, 60, 80, 100].map((v) => (
          <g key={v}>
            <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke={T.line} strokeWidth="1" />
            <text x="4" y={y(v) + 4} fontSize="10.5" fill={T.faint} fontFamily={sans}>{v}</text>
          </g>
        ))}
        {pts.map((p, i) => (
          <line key={"w" + i} x1={padL + step * (i + 0.5)} y1={padT} x2={padL + step * (i + 0.5)} y2={padT + chartH} stroke={T.line} strokeWidth="1" opacity=".35" />
        ))}
        {pts.map((p, i) => {
          const prev = i === 0 ? p.pct : pts[i - 1].pct;
          const top = Math.max(prev, p.pct), bottom = Math.min(prev, p.pct);
          const up = p.pct >= prev;
          const cx = padL + step * (i + 0.5);
          const yTop = y(top), h = Math.max(2, y(bottom) - y(top));
          return <rect key={"b" + i} x={cx - candleW / 2} y={yTop} width={candleW} height={h} rx="2" fill={up ? T.up : T.down} style={{ pointerEvents: "none" }} />;
        })}
        {pts.map((p, i) => {
          const cx = padL + step * (i + 0.5);
          const label = (p.when ? p.when + ": " : "") + Math.round(p.pct) + "%";
          return (
            <rect key={"h" + i} x={cx - step / 2} y={padT} width={step} height={chartH} fill="transparent" style={{ cursor: "pointer" }}
              onMouseMove={(e) => setTip({ x: e.clientX, y: e.clientY, text: label })}
              onMouseLeave={() => setTip(null)} />
          );
        })}
      </svg>
      {tip && (
        <div style={{ position: "fixed", left: tip.x + 14, top: tip.y + 14, background: T.ink, color: "#fff", padding: "6px 10px", borderRadius: 7, font: `600 12.5px ${sans}`, pointerEvents: "none", zIndex: 60, boxShadow: "0 6px 16px rgba(0,0,0,.25)" }}>{tip.text}</div>
      )}
    </div>
  );
}

/* ---------- мини-календарь-виджет ---------- */
function CalendarWidget({ title, year, monthIdx, markedDays, color, legend }) {
  const first = new Date(year, monthIdx, 1).getDay();
  const leading = (first + 6) % 7;
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const today = new Date();
  const isCurMonth = today.getFullYear() === year && today.getMonth() === monthIdx;
  const monthNames = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
  const wd = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];
  const cells = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <Card style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ font: `600 14.5px ${sans}`, color: T.ink }}>{title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, font: `11px ${sans}`, color: T.faint }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, display: "inline-block" }} />{legend}
        </div>
      </div>
      <div style={{ font: `12px ${sans}`, color: T.faint, textTransform: "capitalize", marginTop: 2 }}>{monthNames[monthIdx]} {year}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, textAlign: "center", marginTop: 10 }}>
        {wd.map((w) => <div key={w} style={{ font: `600 10.5px ${sans}`, color: T.faint, paddingBottom: 4 }}>{w}</div>)}
        {cells.map((d, i) => {
          if (d == null) return <div key={i} />;
          const marked = markedDays.includes(d);
          const isToday = isCurMonth && today.getDate() === d;
          return (
            <div key={i} style={{ position: "relative", aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", font: `13px ${sans}`, color: T.ink, borderRadius: 8, background: isToday ? T.accentSoft : "transparent" }}>
              {marked && <span style={{ position: "absolute", inset: 2, borderRadius: 8, border: `2px solid ${color}` }} />}
              <span style={{ position: "relative" }}>{d}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

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

  const scoped = (arr) => (sid ? arr.filter((x) => x.studentId === sid) : arr);
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
    return rows.sort((a, b) => (parseDay(a.when) || 0) - (parseDay(b.when) || 0));
  }, [grades, homework, mocks, sid]);

  const avgScore = averagePct(gradeRows);

  // Ожидающая домашка — до 5 записей, невыполненные сначала
  const pendingHw = useMemo(() => {
    const src = role === "tutor" ? homework : myHw;
    return [...src].sort((a, b) => (a.status === "Проверена" ? 1 : 0) - (b.status === "Проверена" ? 1 : 0)).slice(0, 5);
  }, [homework, myHw, role]);

  const lessonDays = scoped(schedule).filter((l) => l.status !== "cancelled").map((l) => parseDay(l.date)).filter(Boolean);
  const mockDays = scoped(mocks).map((m) => parseDay(m.date)).filter(Boolean);

  const now = new Date();

  // прогноз даты новой оплаты — для родителя
  const paidPrediction = useMemo(() => {
    if (role !== "parent" || !myProfile) return null;
    const paid = myProfile.paidLessons || 0;
    const done = doneLessons;
    const remaining = Math.max(0, paid - done);
    const doneDays = scoped(schedule).filter((l) => l.status === "done").map((l) => parseDay(l.date)).filter(Boolean).sort((a, b) => a - b);
    const avgGap = doneDays.length >= 2 ? (doneDays[doneDays.length - 1] - doneDays[0]) / (doneDays.length - 1) : 3.5;
    const daysUntil = Math.max(0, remaining - 1) * avgGap;
    const date = new Date(now.getTime() + daysUntil * 86400000);
    const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
    return { paid, done, remaining, label: remaining <= 0 ? "уже пора" : `${date.getDate()} ${months[date.getMonth()]}`, avgGap };
  }, [role, myProfile, doneLessons]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {role === "tutor" && <>
          <Stat label="Занятий" val={schedule.length} Icon={CalendarDays} />
          <Stat label="Домашек выдано" val={homework.length} Icon={BookOpen} sub={`${homework.filter((h) => h.status !== "Выдана").length} сданы`} />
        </>}
        {role !== "tutor" && <>
          <Stat label="Занятий проведено" val={doneLessons} Icon={Wallet} sub={myProfile?.paidLessons ? `из ${myProfile.paidLessons} оплаченных` : undefined} />
          <Stat label="Домашек" val={myHw.length} Icon={BookOpen} sub={`${myHw.filter((h) => h.status !== "Выдана").length} выполнено`} />
        </>}
      </div>

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

      <Card style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
          <div style={{ font: `600 16px ${sans}` }}>Динамика баллов</div>
          <div style={{ font: `13px ${sans}`, color: T.faint }}>средний балл: <b style={{ color: T.ink }}>{avgScore == null ? "—" : avgScore + "%"}</b></div>
        </div>
        <CandleChart rows={gradeRows} />
        <div style={{ font: `11.5px ${sans}`, color: T.faint, marginTop: 6 }}>зелёная свеча — балл вырос к предыдущему, красная — снизился · шкала: 5→100%, 4→80%, 3→60%, 2→40%, либо балл из максимума</div>
      </Card>

      <WeakTopics sid={sid} homework={homework} mocks={mocks} tutorView={role === "tutor"} />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18 }}>
        <CalendarWidget title="Занятия" year={now.getFullYear()} monthIdx={now.getMonth()} markedDays={lessonDays} color={T.down} legend="занятие" />
        <CalendarWidget title="Пробники" year={now.getFullYear()} monthIdx={now.getMonth()} markedDays={mockDays} color={T.up} legend="пробник" />
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
