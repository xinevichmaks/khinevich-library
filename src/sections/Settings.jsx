import { useState } from "react";
import { Plus, Trash2, BookOpen, Wallet, Globe, Link2 } from "lucide-react";
import { Card, T, serif, sans, btn, btnGhost, input } from "../ui.jsx";
import { useAuth } from "../auth.jsx";
import { useCol, addItem, removeItem, updateItem } from "../useDB.js";

const TIMEZONES = [
  { v: "Europe/Kaliningrad", l: "Калининград (UTC+2)" },
  { v: "Europe/Moscow", l: "Москва (UTC+3)" },
  { v: "Europe/Samara", l: "Самара (UTC+4)" },
  { v: "Asia/Yekaterinburg", l: "Екатеринбург (UTC+5)" },
  { v: "Asia/Omsk", l: "Омск (UTC+6)" },
  { v: "Asia/Krasnoyarsk", l: "Красноярск (UTC+7)" },
  { v: "Asia/Irkutsk", l: "Иркутск (UTC+8)" },
  { v: "Asia/Yakutsk", l: "Якутск (UTC+9)" },
  { v: "Asia/Vladivostok", l: "Владивосток (UTC+10)" },
];

export default function SettingsPage() {
  const { profile, role } = useAuth();
  const { items: allSubjects } = useCol("subjects");
  const [name, setName] = useState("");
  const [price, setPrice] = useState(profile.defaultLessonPrice || "");
  const [tz, setTz] = useState(profile.timezone || "Europe/Moscow");
  const mySubjects = allSubjects.filter((s) => s.tutorId === profile.uid);

  const addSubject = async () => {
    if (!name.trim()) return;
    await addItem("subjects", { tutorId: profile.uid, tutorName: profile.name, name: name.trim() });
    setName("");
  };
  const savePrice = () => updateItem("users", profile.uid, { defaultLessonPrice: price });
  const saveTz = (v) => { setTz(v); updateItem("users", profile.uid, { timezone: v }); };

  const feedUrl = `${window.location.origin}/.netlify/functions/calendar-ics?tutorId=${profile.uid}`;

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
        <div style={{ display: "flex", alignItems: "center", gap: 9, font: `600 16px ${sans}`, color: T.ink, marginBottom: 4 }}><Wallet size={18} color={T.accent} />Стандартная стоимость занятия</div>
        <div style={{ font: `13px ${sans}`, color: T.faint, marginBottom: 12 }}>Ориентир для себя — подставится подсказкой при создании занятий в будущем.</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input style={{ ...input, maxWidth: 160 }} type="number" placeholder="Например 2500" value={price} onChange={(e) => setPrice(e.target.value)} />
          <span style={{ display: "flex", alignItems: "center", font: `13px ${sans}`, color: T.faint }}>₽ за занятие</span>
          <button style={btnGhost} onClick={savePrice}>Сохранить</button>
        </div>
      </Card>

      <Card style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, font: `600 16px ${sans}`, color: T.ink, marginBottom: 4 }}><Globe size={18} color={T.accent} />Часовой пояс</div>
        <div style={{ font: `13px ${sans}`, color: T.faint, marginBottom: 12 }}>Используется для отображения времени занятий в календаре и Apple-подписке.</div>
        <select style={input} value={tz} onChange={(e) => saveTz(e.target.value)}>
          {TIMEZONES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
        </select>
      </Card>

      <Card style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, font: `600 16px ${sans}`, color: T.ink, marginBottom: 4 }}><Link2 size={18} color={T.accent} />Ваш личный Apple Calendar</div>
        <div style={{ font: `13px ${sans}`, color: T.faint, marginBottom: 12 }}>Раздельные календари уже работают: эта ссылка показывает занятия только ваших учеников, ученики по своей ссылке (в разделе «Календарь») видят только себя.</div>
        <div style={{ padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.lineDk}`, background: T.cardAlt, font: `12.5px ${sans}`, color: T.ink, wordBreak: "break-all", minHeight: 90, lineHeight: 1.6 }}>{feedUrl}</div>
        <div style={{ font: `11.5px ${sans}`, color: T.faint, marginTop: 8 }}>Полная инструкция по подключению — в разделе «Календарь».</div>
      </Card>

      <Card style={{ padding: 20 }}>
        <div style={{ font: `600 16px ${sans}`, color: T.ink, marginBottom: 4 }}>Профиль</div>
        <div style={{ font: `13px ${sans}`, color: T.faint, marginBottom: 12 }}>Имя и почта, которые видят ваши ученики.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, font: `14px ${sans}`, color: T.ink }}>
          <div><b>Имя:</b> {profile.name}</div>
          <div><b>Почта:</b> {profile.email}</div>
        </div>
      </Card>
    </div>
  );
}
