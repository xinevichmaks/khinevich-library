import { useRef, useState } from "react";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { Card, Modal, Avatar, T, sans, btn, iconBtn, initials } from "../ui.jsx";
import { useAuth } from "../auth.jsx";
import { useCol } from "../useDB.js";

export default function Calls() {
  const { role } = useAuth();
  const { items: users } = useCol("users");
  const people = users.filter((u) => (role === "tutor" ? u.role === "student" : u.role === "tutor"));
  const [active, setActive] = useState(null);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const vref = useRef(null);

  const start = async (p) => {
    setActive(p);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (vref.current) vref.current.srcObject = stream;
    } catch { /* доступ к камере не выдан */ }
  };
  const end = () => {
    if (vref.current?.srcObject) vref.current.srcObject.getTracks().forEach((t) => t.stop());
    setActive(null);
  };

  return (
    <div>
      <div style={{ font: `13px ${sans}`, color: T.soft, marginBottom: 14, padding: "10px 12px", background: T.accentSoft, borderRadius: 9 }}>
        Видеосвязь работает на WebRTC. Сейчас показывается ваша камера; звонки между устройствами подключим через сигналинг на Firestore — это следующий этап.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14 }}>
        {people.map((s) => (
          <Card key={s.id} style={{ padding: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <Avatar text={initials(s.name)} size={56} />
            <div style={{ textAlign: "center" }}>
              <div style={{ font: `600 15px ${sans}`, color: T.ink }}>{s.name}</div>
            </div>
            <button style={{ ...btn, width: "100%", justifyContent: "center" }} onClick={() => start(s)}><Phone size={16} />Позвонить</button>
          </Card>
        ))}
        {people.length === 0 && <div style={{ color: T.faint, font: `14px ${sans}`, padding: 24 }}>Пока некому звонить — нужны зарегистрированные пользователи.</div>}
      </div>

      <Modal open={!!active} onClose={end} title={`Звонок · ${active?.name || ""}`} wide>
        <div style={{ aspectRatio: "16/9", background: "#15171c", borderRadius: 12, position: "relative", overflow: "hidden", display: "grid", placeItems: "center" }}>
          <video ref={vref} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", opacity: cam ? 1 : 0 }} />
          {!cam && <div style={{ position: "absolute" }}><Avatar text={initials(active?.name)} size={70} /></div>}
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16 }}>
          <button style={iconBtn} onClick={() => setMic(!mic)}>{mic ? <Mic size={18} /> : <MicOff size={18} />}</button>
          <button style={iconBtn} onClick={() => setCam(!cam)}>{cam ? <Video size={18} /> : <VideoOff size={18} />}</button>
          <button style={{ ...iconBtn, background: "#a23b2d", color: "#fff", border: "none", width: 50 }} onClick={end}><PhoneOff size={18} /></button>
        </div>
      </Modal>
    </div>
  );
}
