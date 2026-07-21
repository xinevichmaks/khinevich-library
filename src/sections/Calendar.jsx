import { useState } from "react";
import { Link2, Copy, Check } from "lucide-react";
import { Card, Modal, T, sans, btn, btnGhost } from "../ui.jsx";
import { MultiMonthCalendar, fmtDateRu } from "../calendar.jsx";
import { useAuth } from "../auth.jsx";
import { useCol } from "../useDB.js";

export default function CalendarPage() {
  const { profile, role } = useAuth();
  const sid = role === "student" ? profile.uid : role === "parent" ? profile.childId : null;
  const { items: users } = useCol("users");
  const { items: schedule } = useCol("schedule");
  const { items: mocks } = useCol("mocks");
  const { items: homework } = useCol("homework");
  const { items: notes } = useCol("notes");
  const [dayOpen, setDayOpen] = useState(null); // iso дата
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const myTutorId = sid ? users.find((u) => u.id === sid)?.tutorId : null;
  const scoped = (arr) => (sid ? arr.filter((x) => x.studentId === sid) : (role === "admin" ? arr : arr.filter((x) => x.tutorId === profile.uid)));
  const scopedNotes = sid
    ? notes.filter((n) => n.tutorId === myTutorId && (!n.studentId || n.studentId === sid))
    : (role === "admin" ? notes : notes.filter((n) => n.tutorId === profile.uid));

  const lessonDates = scoped(schedule).filter((l) => l.status !== "cancelled").map((l) => l.date).filter(Boolean);
  const mockDates = scoped(mocks).map((m) => m.date).filter(Boolean);
  const hwDates = scoped(homework).filter((h) => h.status !== "Проверена").map((h) => h.due).filter(Boolean);
  const noteDates = scopedNotes.filter((n) => n.status !== "done").map((n) => n.due).filter(Boolean);

  const categories = [
    { dates: lessonDates, color: T.down, legend: "занятие" },
    { dates: mockDates, color: T.up, legend: "пробник" },
    { dates: hwDates, color: "#3b6ea5", legend: "дедлайн ДЗ" },
    { dates: noteDates, color: "#8a5aab", legend: "заметка" },
  ];

  const dayLessons = dayOpen ? scoped(schedule).filter((l) => l.date === dayOpen && l.status !== "cancelled") : [];
  const dayMocks = dayOpen ? scoped(mocks).filter((m) => m.date === dayOpen) : [];
  const dayHw = dayOpen ? scoped(homework).filter((h) => h.due === dayOpen && h.status !== "Проверена") : [];
  const dayNotes = dayOpen ? scopedNotes.filter((n) => n.due === dayOpen && n.status !== "done") : [];

  const feedUrl = `${window.location.origin}/.netlify/functions/calendar-ics?studentId=${sid || "all"}`;
  const copyLink = () => { navigator.clipboard.writeText(feedUrl); setCopied(true); setTimeout(() => setCopied(false), 1800); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ font: `13px ${sans}`, color: T.faint }}>Общий календарь: занятия, пробники и сроки сдачи домашних заданий {sid ? "" : "по всем ученикам"}. Нажмите на дату, чтобы увидеть детали.</div>
        <button style={btnGhost} onClick={() => setSubscribeOpen(true)}><Link2 size={15} />Подключить к Apple Calendar</button>
      </div>
      <Card style={{ padding: 22 }}>
        <MultiMonthCalendar categories={categories} big onDayClick={setDayOpen} />
      </Card>

      {/* ---------- детали дня ---------- */}
      <Modal open={!!dayOpen} onClose={() => setDayOpen(null)} title={dayOpen ? fmtDateRu(dayOpen) : ""}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {dayLessons.length === 0 && dayMocks.length === 0 && dayHw.length === 0 && dayNotes.length === 0 && (
            <div style={{ font: `14px ${sans}`, color: T.faint }}>На эту дату ничего не запланировано.</div>
          )}
          {dayLessons.length > 0 && (
            <div>
              <div style={{ font: `600 12px ${sans}`, color: T.down, textTransform: "uppercase", marginBottom: 6 }}>Занятия</div>
              {dayLessons.map((l) => (
                <div key={l.id} style={{ padding: "8px 0", borderTop: `1px solid ${T.line}`, font: `14px ${sans}`, color: T.ink }}>
                  <b>{l.time || "время не указано"}</b> — {l.topic}{role === "tutor" ? ` · ${l.studentName}` : ""}
                </div>
              ))}
            </div>
          )}
          {dayMocks.length > 0 && (
            <div>
              <div style={{ font: `600 12px ${sans}`, color: T.up, textTransform: "uppercase", marginBottom: 6 }}>Пробники</div>
              {dayMocks.map((m) => (
                <div key={m.id} style={{ padding: "8px 0", borderTop: `1px solid ${T.line}`, font: `14px ${sans}`, color: T.ink }}>
                  {m.title}{role === "tutor" ? ` · ${m.studentName}` : ""}
                </div>
              ))}
            </div>
          )}
          {dayHw.length > 0 && (
            <div>
              <div style={{ font: `600 12px ${sans}`, color: "#3b6ea5", textTransform: "uppercase", marginBottom: 6 }}>Дедлайны домашних заданий</div>
              {dayHw.map((h) => (
                <div key={h.id} style={{ padding: "8px 0", borderTop: `1px solid ${T.line}`, font: `14px ${sans}`, color: T.ink }}>
                  {h.title}{role === "tutor" ? ` · ${h.studentName}` : ""}
                </div>
              ))}
            </div>
          )}
          {dayNotes.length > 0 && (
            <div>
              <div style={{ font: `600 12px ${sans}`, color: "#8a5aab", textTransform: "uppercase", marginBottom: 6 }}>Заметки</div>
              {dayNotes.map((n) => (
                <div key={n.id} style={{ padding: "8px 0", borderTop: `1px solid ${T.line}`, font: `14px ${sans}`, color: T.ink }}>
                  {n.text}{n.studentName ? ` · ${n.studentName}` : ""}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* ---------- подписка на календарь в Apple Calendar ---------- */}
      <Modal open={subscribeOpen} onClose={() => setSubscribeOpen(false)} title="Подключить к Apple Calendar">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ font: `14px/1.6 ${sans}`, color: T.soft }}>
            Эта ссылка — живая подписка: календарь на iPhone/Mac будет сам обновляться, когда расписание меняется на сайте. Напоминание ставится автоматически за 30 минут до каждого занятия.
          </div>
          <ol style={{ font: `13px/1.7 ${sans}`, color: T.faint, paddingLeft: 18, margin: 0 }}>
            <li>Скопируйте ссылку ниже</li>
            <li>На iPhone/Mac: Календарь → Файл → Новая подписка на календарь (на iPhone: Настройки → Календарь → Учётные записи → Добавить учётную запись → Другое → Подписной календарь)</li>
            <li>Вставьте ссылку и подтвердите</li>
          </ol>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.lineDk}`, background: T.cardAlt, font: `13px ${sans}`, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{feedUrl}</div>
            <button style={btn} onClick={copyLink}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "Скопировано" : "Копировать"}</button>
          </div>
          <div style={{ font: `12px ${sans}`, color: T.faint }}>{sid ? "Эта ссылка покажет только ваши занятия." : "Эта ссылка (как у репетитора) покажет занятия всех учеников."}</div>
        </div>
      </Modal>
    </div>
  );
}
