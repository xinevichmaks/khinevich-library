import { useState } from "react";
import { Eye, Search, GraduationCap, User, Users as UsersIcon, ShieldCheck } from "lucide-react";
import { Card, T, sans, btn, btnGhost, input, chip, Avatar, initials, ROLE_LABEL } from "../ui.jsx";
import { useAuth } from "../auth.jsx";
import { useCol } from "../useDB.js";

const ROLE_ICON = { admin: ShieldCheck, tutor: GraduationCap, student: User, parent: UsersIcon };

export default function Profiles() {
  const { startImpersonate } = useAuth();
  const { items: users } = useCol("users");
  const [q, setQ] = useState("");
  const [filterRole, setFilterRole] = useState(null);

  const list = users.filter((u) =>
    (u.name + " " + u.email).toLowerCase().includes(q.toLowerCase()) &&
    (!filterRole || u.role === filterRole)
  );

  return (
    <div>
      <div style={{ font: `13px ${sans}`, color: T.faint, marginBottom: 16 }}>Все аккаунты платформы. Можно посмотреть платформу глазами любого пользователя — это не меняет его пароль и не влияет на его сессию.</div>
      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search size={17} color={T.faint} style={{ position: "absolute", left: 12, top: 11 }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по имени или почте…" style={{ ...input, paddingLeft: 38 }} />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={() => setFilterRole(null)} style={{ ...chip, background: !filterRole ? T.accent : T.line, color: !filterRole ? "#fff" : T.soft, border: "none", cursor: "pointer" }}>Все</button>
        {["admin", "tutor", "student", "parent"].map((r) => (
          <button key={r} onClick={() => setFilterRole(filterRole === r ? null : r)} style={{ ...chip, background: filterRole === r ? T.accent : T.card, color: filterRole === r ? "#fff" : T.ink, border: `1px solid ${filterRole === r ? T.accent : T.line}`, cursor: "pointer" }}>{ROLE_LABEL[r]}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {list.map((u) => {
          const Icon = ROLE_ICON[u.role] || User;
          return (
            <Card key={u.id} style={{ padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar text={initials(u.name)} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: `600 14px ${sans}`, color: T.ink, display: "flex", alignItems: "center", gap: 6 }}><Icon size={14} color={T.accent} />{u.name}</div>
                <div style={{ font: `12px ${sans}`, color: T.faint }}>{u.email} · {ROLE_LABEL[u.role]}{u.subject ? ` · ${u.subject}` : ""}{u.approved === false ? " · ожидает подтверждения" : ""}</div>
              </div>
              <button style={{ ...btnGhost, padding: "8px 13px" }} onClick={() => startImpersonate(u)}><Eye size={15} />Смотреть как</button>
            </Card>
          );
        })}
        {list.length === 0 && <div style={{ color: T.faint, font: `14px ${sans}`, padding: 24 }}>Никого не найдено.</div>}
      </div>
    </div>
  );
}
