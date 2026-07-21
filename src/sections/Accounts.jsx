import { useState } from "react";
import { Search, Mail, KeyRound, Save, Info } from "lucide-react";
import { Card, Modal, T, sans, btn, btnGhost, input, chip, Avatar, initials, ROLE_LABEL } from "../ui.jsx";
import { useAuth } from "../auth.jsx";
import { useCol, updateItem } from "../useDB.js";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase.js";

export default function Accounts() {
  const { items: users } = useCol("users");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [nameVal, setNameVal] = useState("");
  const [emailVal, setEmailVal] = useState("");
  const [resetMsg, setResetMsg] = useState("");

  const list = users.filter((u) => (u.name + " " + u.email).toLowerCase().includes(q.toLowerCase()));

  const openEdit = (u) => { setEditing(u); setNameVal(u.name || ""); setEmailVal(u.email || ""); setResetMsg(""); };
  const save = async () => {
    await updateItem("users", editing.id, { name: nameVal, email: emailVal });
    setEditing(null);
  };
  const sendReset = async () => {
    try {
      await sendPasswordResetEmail(auth, editing.email);
      setResetMsg("Письмо для сброса пароля отправлено на " + editing.email);
    } catch (e) {
      setResetMsg("Не получилось отправить: " + (e.message || e.code));
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: T.accentSoft, border: `1px solid ${T.line}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <Info size={17} color={T.accent} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ font: `12.5px/1.6 ${sans}`, color: T.soft }}>
          Здесь можно поменять имя и почту в профиле пользователя (то, что видно внутри платформы), а также отправить ему письмо для сброса пароля.
          Изменить пароль напрямую или логин-почту для входа отсюда нельзя — это требует, чтобы человек сам подтвердил действие через письмо (так безопаснее).
        </div>
      </div>

      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={17} color={T.faint} style={{ position: "absolute", left: 12, top: 11 }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по имени или почте…" style={{ ...input, paddingLeft: 38 }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {list.map((u) => (
          <Card key={u.id} style={{ padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar text={initials(u.name)} size={38} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: `600 14px ${sans}`, color: T.ink }}>{u.name}</div>
              <div style={{ font: `12px ${sans}`, color: T.faint, display: "flex", alignItems: "center", gap: 6 }}><Mail size={12} />{u.email}</div>
            </div>
            <span style={chip}>{ROLE_LABEL[u.role]}</span>
            <button style={{ ...btnGhost, padding: "8px 13px" }} onClick={() => openEdit(u)}>Редактировать</button>
          </Card>
        ))}
        {list.length === 0 && <div style={{ color: T.faint, font: `14px ${sans}`, padding: 24 }}>Никого не найдено.</div>}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing ? `Редактировать: ${editing.name}` : ""}>
        {editing && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ font: `12px ${sans}`, color: T.faint, marginBottom: 6 }}>Имя в профиле</div>
              <input style={input} value={nameVal} onChange={(e) => setNameVal(e.target.value)} />
            </div>
            <div>
              <div style={{ font: `12px ${sans}`, color: T.faint, marginBottom: 6 }}>Почта в профиле</div>
              <input style={input} value={emailVal} onChange={(e) => setEmailVal(e.target.value)} />
              <div style={{ font: `11px ${sans}`, color: T.faint, marginTop: 4 }}>Это поле для отображения. Логин для входа при этом не меняется автоматически.</div>
            </div>
            <button style={btn} onClick={save}><Save size={15} />Сохранить</button>
            <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 12, marginTop: 4 }}>
              <button style={btnGhost} onClick={sendReset}><KeyRound size={15} />Отправить письмо для сброса пароля</button>
              {resetMsg && <div style={{ font: `12px ${sans}`, color: T.faint, marginTop: 8 }}>{resetMsg}</div>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
