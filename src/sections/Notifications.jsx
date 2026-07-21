import { Bell, BookOpen, Award, CheckCircle2, Trash2, StickyNote } from "lucide-react";
import { Card, T, sans, btnGhost } from "../ui.jsx";
import { useAuth } from "../auth.jsx";
import { useCol, updateItem, removeItem } from "../useDB.js";

const TYPE_ICON = { new_homework: BookOpen, homework_done: CheckCircle2, new_grade: Award, homework_checked: CheckCircle2, new_note: StickyNote };
const TYPE_COLOR = { new_homework: "#3b6ea5", homework_done: "#3f8f82", new_grade: T.accent, homework_checked: "#4b8f5c", new_note: "#8a5aab" };

function timeAgo(ts) {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} ч назад`;
  const days = Math.floor(hrs / 24);
  return `${days} дн назад`;
}

export default function Notifications() {
  const { profile, role } = useAuth();
  const sid = role === "student" ? profile.uid : role === "parent" ? profile.childId : null;
  const { items: notifications } = useCol("notifications");

  const list = sid ? notifications.filter((n) => n.studentId === sid) : notifications;
  const unreadCount = list.filter((n) => !n.read).length;

  const markRead = (n) => { if (!n.read) updateItem("notifications", n.id, { read: true }); };
  const markAllRead = () => list.filter((n) => !n.read).forEach((n) => updateItem("notifications", n.id, { read: true }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ font: `13px ${sans}`, color: T.faint }}>{unreadCount > 0 ? `${unreadCount} новых уведомлений` : "Новых уведомлений нет"}</div>
        {unreadCount > 0 && <button style={btnGhost} onClick={markAllRead}>Отметить все прочитанными</button>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {list.map((n) => {
          const Icon = TYPE_ICON[n.type] || Bell;
          const color = TYPE_COLOR[n.type] || T.accent;
          return (
            <Card key={n.id} onClick={() => markRead(n)} style={{ padding: 14, display: "flex", gap: 12, alignItems: "flex-start", cursor: n.read ? "default" : "pointer", border: n.read ? undefined : `1.5px solid ${color}` }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: color + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={17} color={color} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: `${n.read ? 500 : 700} 14px ${sans}`, color: T.ink }}>{n.text}</div>
                <div style={{ font: `12px ${sans}`, color: T.faint, marginTop: 3 }}>{role === "tutor" ? (n.studentName ? n.studentName + " · " : "") : ""}{timeAgo(n.createdAt)}</div>
              </div>
              {!n.read && <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 5 }} />}
              {role === "tutor" && <button onClick={(e) => { e.stopPropagation(); removeItem("notifications", n.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: T.faint }}><Trash2 size={15} /></button>}
            </Card>
          );
        })}
        {list.length === 0 && <div style={{ color: T.faint, font: `14px ${sans}`, padding: 24 }}>Здесь появятся уведомления о выданных и выполненных домашних заданиях, новых оценках и других событиях.</div>}
      </div>
    </div>
  );
}
