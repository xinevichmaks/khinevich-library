import { Card, T, sans } from "../ui.jsx";
import { MultiMonthCalendar } from "../calendar.jsx";
import { useAuth } from "../auth.jsx";
import { useCol } from "../useDB.js";

export default function CalendarPage() {
  const { profile, role } = useAuth();
  const sid = role === "student" ? profile.uid : role === "parent" ? profile.childId : null;
  const { items: schedule } = useCol("schedule");
  const { items: mocks } = useCol("mocks");
  const { items: homework } = useCol("homework");

  const scoped = (arr) => (sid ? arr.filter((x) => x.studentId === sid) : arr);

  const lessonDates = scoped(schedule).filter((l) => l.status !== "cancelled").map((l) => l.date).filter(Boolean);
  const mockDates = scoped(mocks).map((m) => m.date).filter(Boolean);
  const hwDates = scoped(homework).filter((h) => h.status !== "Проверена").map((h) => h.due).filter(Boolean);

  const categories = [
    { dates: lessonDates, color: T.down, legend: "занятие" },
    { dates: mockDates, color: T.up, legend: "пробник" },
    { dates: hwDates, color: "#3b6ea5", legend: "дедлайн ДЗ" },
  ];

  return (
    <div>
      <div style={{ font: `13px ${sans}`, color: T.faint, marginBottom: 16 }}>Общий календарь: занятия, пробники и сроки сдачи домашних заданий {sid ? "" : "по всем ученикам"}.</div>
      <Card style={{ padding: 22 }}>
        <MultiMonthCalendar categories={categories} big />
      </Card>
    </div>
  );
}
