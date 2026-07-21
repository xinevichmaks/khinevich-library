import { useState } from "react";
import { T, sans } from "./ui.jsx";
import { scoreFraction } from "./grading.js";

export function CandleChart({ rows }) {
  const [tip, setTip] = useState(null); // { x, y, text }
  const pts = rows.map((r) => { const f = scoreFraction(r.value, r.max); return { when: r.when, pct: f == null ? null : f * 100 }; }).filter((p) => p.pct != null);
  if (!pts.length) return <div style={{ font: `14px ${sans}`, color: T.faint, padding: "14px 0" }}>Здесь появится график, когда в журнале будут оценки.</div>;

  const W = 900, H = 220, padL = 34, padR = 14, padT = 14, padB = 10;
  const chartW = W - padL - padR, chartH = H - padT - padB;
  const n = pts.length, step = chartW / n;
  const candleW = Math.max(10, Math.min(34, step * 0.5));
  const y = (pct) => padT + chartH - (pct / 100) * chartH;

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 260 }} preserveAspectRatio="xMidYMid meet">
        {[0, 20, 40, 60, 80, 100].map((v) => (
          <g key={v}>
            <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke={T.line} strokeWidth="1" />
            <text x="4" y={y(v) + 4} fontSize="10.5" fill={T.faint} fontFamily={sans}>{v}</text>
          </g>
        ))}
        {pts.map((p, i) => (
          <line key={"w" + i} x1={padL + step * (i + 0.5)} y1={padT} x2={padL + step * (i + 0.5)} y2={padT + chartH} stroke={T.line} strokeWidth="1" opacity=".35" />
        ))}
        {pts.map((p, i) => {
          const prev = i === 0 ? p.pct : pts[i - 1].pct;
          const top = Math.max(prev, p.pct), bottom = Math.min(prev, p.pct);
          const up = p.pct >= prev;
          const cx = padL + step * (i + 0.5);
          const yTop = y(top), h = Math.max(2, y(bottom) - y(top));
          return <rect key={"b" + i} x={cx - candleW / 2} y={yTop} width={candleW} height={h} rx="2" fill={up ? T.up : T.down} style={{ pointerEvents: "none" }} />;
        })}
        {pts.map((p, i) => {
          const cx = padL + step * (i + 0.5);
          const label = (p.when ? p.when + ": " : "") + Math.round(p.pct) + "%";
          return (
            <rect key={"h" + i} x={cx - step / 2} y={padT} width={step} height={chartH} fill="transparent" style={{ cursor: "pointer" }}
              onMouseMove={(e) => setTip({ x: e.clientX, y: e.clientY, text: label })}
              onMouseLeave={() => setTip(null)} />
          );
        })}
      </svg>
      {tip && (
        <div style={{ position: "fixed", left: tip.x + 14, top: tip.y + 14, background: T.ink, color: "#fff", padding: "6px 10px", borderRadius: 7, font: `600 12.5px ${sans}`, pointerEvents: "none", zIndex: 60, boxShadow: "0 6px 16px rgba(0,0,0,.25)" }}>{tip.text}</div>
      )}
    </div>
  );
}
