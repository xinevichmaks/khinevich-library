import { ShieldCheck, Check, X, Trash2, Mail } from "lucide-react";
import { Card, T, serif, sans, chip, btn, btnGhost, Avatar, initials, ROLE_LABEL } from "../ui.jsx";
import { useAuth } from "../auth.jsx";
import { useCol, updateItem, removeItem } from "../useDB.js";

export default function Tutors() {
  const { profile } = useAuth();
  const { items: users } = useCol("users");
  const staff = users.filter((u) => u.role === "tutor" || u.role === "admin");
  const pending = staff.filter((u) => u.approved === false);
  const approved = staff.filter((u) => u.approved !== false);

  const approve = (u) => updateItem("users", u.id, { approved: true });
  const reject = (u) => { if (confirm(`Отклонить и удалить заявку «${u.name}»?`)) removeItem("users", u.id); };
  const revoke = (u) => {
    if (u.id === profile.uid) { alert("Нельзя забрать доступ у самого себя."); return; }
    if (confirm(`Удалить доступ у ${u.name}?`)) removeItem("users", u.id);
  };

  return (
    <div>
      {pending.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ font: `600 14px ${sans}`, color: T.ink, marginBottom: 10 }}>Ожидают подтверждения ({pending.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pending.map((u) => (
              <Card key={u.id} style={{ padding: 14, display: "flex", alignItems: "center", gap: 12, border: "1.5px solid #f0d9a6" }}>
                <Avatar text={initials(u.name)} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: `600 14px ${sans}`, color: T.ink }}>{u.name}</div>
                  <div style={{ font: `12px ${sans}`, color: T.faint, display: "flex", alignItems: "center", gap: 6 }}><Mail size={12} />{u.email} · {ROLE_LABEL[u.role]}</div>
                </div>
                <button style={{ ...btn, padding: "8px 13px" }} onClick={() => approve(u)}><Check size={15} />Одобрить</button>
                <button style={{ ...btnGhost, padding: "8px 13px", color: "#a23b2d" }} onClick={() => reject(u)}><X size={15} />Отклонить</button>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div style={{ font: `600 14px ${sans}`, color: T.ink, marginBottom: 10 }}>Репетиторы и администраторы ({approved.length})</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {approved.map((u) => (
          <Card key={u.id} style={{ padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar text={initials(u.name)} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: `600 14px ${sans}`, color: T.ink }}>{u.name}{u.id === profile.uid ? " (вы)" : ""}</div>
              <div style={{ font: `12px ${sans}`, color: T.faint, display: "flex", alignItems: "center", gap: 6 }}><Mail size={12} />{u.email}</div>
            </div>
            <span style={chip}>{ROLE_LABEL[u.role]}</span>
            {u.id !== profile.uid && <button title="Удалить доступ" style={{ ...btnGhost, padding: "8px 11px" }} onClick={() => revoke(u)}><Trash2 size={15} /></button>}
          </Card>
        ))}
        {approved.length === 0 && <div style={{ color: T.faint, font: `14px ${sans}`, padding: 24 }}>Пока никого нет.</div>}
      </div>
    </div>
  );
}
