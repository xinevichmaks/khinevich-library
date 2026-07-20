import { useEffect, useRef, useState } from "react";
import { PenLine, Eraser, Trash2 } from "lucide-react";
import { Card, T, serif, sans, iconBtn, btnGhost } from "../ui.jsx";
import { useCol } from "../useDB.js";

export default function Whiteboard() {
  const ref = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState(T.ink);
  const [size, setSize] = useState(3);
  const { items: materials } = useCol("materials");
  const [bg, setBg] = useState(null);
  const sel = materials.find((m) => m.id === bg);

  useEffect(() => {
    const c = ref.current; if (!c) return;
    c.width = c.offsetWidth; c.height = c.offsetHeight;
  }, []);

  const pos = (e) => {
    const r = ref.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: cx - r.left, y: cy - r.top };
  };
  const start = (e) => { setDrawing(true); const ctx = ref.current.getContext("2d"); const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const move = (e) => {
    if (!drawing) return; e.preventDefault();
    const ctx = ref.current.getContext("2d"); const p = pos(e);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = color; ctx.lineWidth = tool === "eraser" ? 24 : size;
    ctx.lineTo(p.x, p.y); ctx.stroke();
  };
  const clear = () => { const c = ref.current; c.getContext("2d").clearRect(0, 0, c.width, c.height); };
  const tb = (active) => ({ ...iconBtn, background: active ? T.accent : T.card, color: active ? "#fff" : T.soft });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", gap: 14, height: "calc(100vh - 150px)" }}>
      <Card style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8, overflow: "auto" }}>
        <div style={{ font: `600 12px ${sans}`, color: T.soft, textTransform: "uppercase", letterSpacing: .4 }}>Конспект на доске</div>
        {materials.map((m) => (
          <button key={m.id} onClick={() => setBg(m.id)} style={{ textAlign: "left", padding: "9px 11px", borderRadius: 9, border: `1px solid ${bg === m.id ? T.accent : T.line}`, background: bg === m.id ? T.accentSoft : T.cardAlt, font: `600 13px ${sans}`, color: T.ink, cursor: "pointer" }}>{m.title}</button>
        ))}
        <button onClick={() => setBg(null)} style={{ textAlign: "left", padding: "9px 11px", borderRadius: 9, border: `1px solid ${bg === null ? T.accent : T.line}`, background: bg === null ? T.accentSoft : T.cardAlt, font: `600 13px ${sans}`, color: T.ink, cursor: "pointer" }}>Чистый лист</button>
      </Card>

      <Card style={{ padding: 12, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button style={tb(tool === "pen")} onClick={() => setTool("pen")}><PenLine size={17} /></button>
          <button style={tb(tool === "eraser")} onClick={() => setTool("eraser")}><Eraser size={17} /></button>
          {[T.ink, T.accent, "#a23b2d", "#3f7d4f"].map((c) => (
            <button key={c} onClick={() => { setColor(c); setTool("pen"); }} style={{ width: 26, height: 26, borderRadius: "50%", background: c, border: color === c ? `2px solid ${T.ink}` : `2px solid ${T.line}`, cursor: "pointer" }} />
          ))}
          <input type="range" min={1} max={10} value={size} onChange={(e) => setSize(+e.target.value)} style={{ width: 90 }} />
          <button style={btnGhost} onClick={clear}><Trash2 size={16} />Очистить</button>
        </div>
        <div style={{ position: "relative", flex: 1, borderRadius: 10, overflow: "hidden", border: `1px solid ${T.line}`, background: T.cardAlt }}>
          {sel && <div style={{ position: "absolute", inset: 0, padding: 26, overflow: "auto", color: T.soft, font: `15px/1.8 ${sans}` }}>
            <div style={{ font: `700 18px ${serif}`, color: T.ink, marginBottom: 10 }}>{sel.title}</div>{sel.body}
          </div>}
          <canvas ref={ref} onMouseDown={start} onMouseMove={move} onMouseUp={() => setDrawing(false)} onMouseLeave={() => setDrawing(false)}
            onTouchStart={start} onTouchMove={move} onTouchEnd={() => setDrawing(false)}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", touchAction: "none", cursor: "crosshair" }} />
        </div>
      </Card>
    </div>
  );
}
