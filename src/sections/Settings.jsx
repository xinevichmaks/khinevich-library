import { useState } from "react";
import { Plus, Trash2, BookOpen } from "lucide-react";
import { Card, T, serif, sans, btn, btnGhost, input } from "../ui.jsx";
import { useAuth } from "../auth.jsx";
import { useCol, addItem, removeItem } from "../useDB.js";

export default function SettingsPage() {
  const { profile, role } = useAuth();
  const { items: allSubjects } = useCol("subjects");
  const [name, setName] = useState("");
  const mySubjects = allSubjects.filter((s) => s.tutorId === profile.uid);

  const addSubject = async () => {
    if (!name.trim()) return;
    await addItem("subjects", { tutorId: profile.uid, tutorName: profile.name, name: name.trim() });
    setName("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 620 }}>
      <Card style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, font: `600 16px ${sans}`, color: T.ink, marginBottom: 4 }}><BookOpen size={18} color={T.accent} />Мои предметы / курсы</div>
        <div style={{ font: `13px ${sans}`, color: T.faint, marginBottom: 16 }}>
          Называйте курсы как удобно — эти названия увидят ваши ученики при регистрации и в разделе доступа к библиотеке. {role === "admin" && "Как администратору, вам заодно видно, кому какой курс принадлежит, в разделе «Репетиторы»."}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {mySubjects.map((s) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, background: T.cardAlt, border: `1px solid ${T.line}` }}>
              <span style={{ flex: 1, font: `600 13.5px ${sans}`, color: T.ink }}>{s.name}</span>
              <button onClick={() => removeItem("subjects", s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: T.faint }}><Trash2 size={15} /></button>
            </div>
          ))}
          {mySubjects.length === 0 && <div style={{ font: `13px ${sans}`, color: T.faint }}>Вы ещё не завели ни одного курса.</div>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input style={input} placeholder="Название курса (например «Математика ОГЭ»)" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSubject()} />
          <button style={btn} onClick={addSubject}><Plus size={15} />Добавить</button>
        </div>
      </Card>

      <Card style={{ padding: 20 }}>
        <div style={{ font: `600 16px ${sans}`, color: T.ink, marginBottom: 4 }}>Профиль</div>
        <div style={{ font: `13px ${sans}`, color: T.faint, marginBottom: 12 }}>Имя и почта, которые видят ваши ученики.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, font: `14px ${sans}`, color: T.ink }}>
          <div><b>Имя:</b> {profile.name}</div>
          <div><b>Почта:</b> {profile.email}</div>
        </div>
      </Card>

      <div style={{ font: `12px ${sans}`, color: T.faint }}>Скоро здесь появится: раздельные Apple-календари для вас и учеников, стандартная стоимость занятия, часовой пояс.</div>
    </div>
  );
}
