import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, T, serif, sans, Avatar, initials } from "../ui.jsx";
import { useAuth } from "../auth.jsx";
import { useCol } from "../useDB.js";
import { computeWeakTopics } from "../grading.js";

function TopicBar({ t }) {
  const color = t.pct < 50 ? T.down : t.pct < 75 ? "#d9a622" : T.up;
  return (
    <div style={{ padding: "10px 0", borderBottom: `1px solid ${T.line}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <div style={{ font: `600 13.5px ${sans}` }}>{t.topic}</div>
        <div style={{ font: `700 13px ${serif}`, color }}>{t.pct}%</div>
      </div>
      <div style={{ height: 5, borderRadius: 4, background: T.line, overflow: "hidden" }}><div style={{ height: "100%", width: `${t.pct}%`, background: color }} /></div>
      <div style={{ font: `11.5px ${sans}`, color: T.faint, marginTop: 3 }}>{t.correct} из {t.total} верно</div>
    </div>
  );
}

export default function WeakSpots() {
  const { profile, role } = useAuth();
  const sid = role === "student" ? profile.uid : role === "parent" ? profile.childId : null;
  const isStaff = role === "tutor" || role === "admin";
  const { items: users } = useCol("users");
  const { items: homework } = useCol("homework");
  const { items: mocks } = useCol("mocks");

  const students = users.filter((u) => u.role === "student" && (role === "admin" || u.tutorId === profile.uid));
  const scoped = (arr) => (sid ? arr.filter((x) => x.studentId === sid) : (role === "admin" ? arr : arr.filter((x) => x.tutorId === profile.uid)));

  const [selectedStudent, setSelectedStudent] = useState("all");

  const perStudentData = useMemo(() => {
    if (!isStaff) return null;
    return students.map((s) => ({
      student: s,
      topics: computeWeakTopics({ sid: s.id, homework, mocks }).slice(0, 5),
    })).filter((x) => x.topics.length > 0);
  }, [students, homework, mocks, isStaff]);

  const myOwnData = useMemo(() => {
    if (isStaff) return [];
    return computeWeakTopics({ sid, homework: scoped(homework), mocks: scoped(mocks) }).slice(0, 15);
  }, [sid, homework, mocks, isStaff]);

  if (!isStaff) {
    return (
      <div>
        <div style={{ font: `13px ${sans}`, color: T.faint, marginBottom: 16 }}>Темы, где чаще всего встречаются ошибки в автопроверяемых заданиях (домашка и пробники).</div>
        <Card style={{ padding: 18 }}>
          {myOwnData.length === 0
            ? <div style={{ font: `14px ${sans}`, color: T.faint }}>Пока недостаточно данных — нужны пройденные вопросы с отмеченными темами.</div>
            : myOwnData.map((t, i) => <TopicBar key={i} t={t} />)}
        </Card>
      </div>
    );
  }

  const shown = selectedStudent === "all" ? perStudentData : perStudentData.filter((x) => x.student.id === selectedStudent);

  return (
    <div>
      <div style={{ font: `13px ${sans}`, color: T.faint, marginBottom: 16 }}>Слабые темы по каждому ученику — по данным автопроверяемых заданий (домашка и пробники).</div>
      {students.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
          <button onClick={() => setSelectedStudent("all")} style={{ padding: "7px 12px", borderRadius: 8, border: `1.5px solid ${selectedStudent === "all" ? T.accent : T.line}`, background: selectedStudent === "all" ? T.accentSoft : T.cardAlt, font: `600 12.5px ${sans}`, color: T.ink, cursor: "pointer" }}>Все ученики</button>
          {students.map((s) => (
            <button key={s.id} onClick={() => setSelectedStudent(s.id)} style={{ padding: "7px 12px", borderRadius: 8, border: `1.5px solid ${selectedStudent === s.id ? T.accent : T.line}`, background: selectedStudent === s.id ? T.accentSoft : T.cardAlt, font: `600 12.5px ${sans}`, color: T.ink, cursor: "pointer" }}>{s.name}</button>
          ))}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {shown.length === 0 && (
          <Card style={{ padding: 24, textAlign: "center" }}>
            <AlertTriangle size={22} color={T.faint} style={{ marginBottom: 8 }} />
            <div style={{ font: `14px ${sans}`, color: T.faint }}>Пока недостаточно данных — нужны пройденные вопросы с отмеченными темами.</div>
          </Card>
        )}
        {shown.map(({ student, topics }) => (
          <Card key={student.id} style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <Avatar text={initials(student.name)} size={32} />
              <div style={{ font: `600 15px ${sans}`, color: T.ink }}>{student.name}</div>
            </div>
            {topics.map((t, i) => <TopicBar key={i} t={t} />)}
          </Card>
        ))}
      </div>
    </div>
  );
}
