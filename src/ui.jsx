import { X } from "lucide-react";

export const T = {
  bg: "#EDE7E6", card: "#F7F3F2", cardAlt: "#FCF9F8",
  ink: "#221010", soft: "#5E4A49", faint: "#9C8887",
  line: "#DED2D1", lineDk: "#C9B5B4",
  accent: "#3C0000", accentSoft: "#EBD6D3", accentDk: "#280000",
  sidebar: "#4A0F1E", sidebarLine: "#6E2A3A",
  up: "#3f7a4d", down: "#a23b2d",
};
export const TAG_PALETTE = ["#c0453a","#d97a3f","#d9a622","#9a9a3f","#4b8f5c","#3f8f82","#3b8ea5","#3b6ea5","#5c66b0","#7a5aab","#a2529b","#c2568a","#8a5a3a","#6b6b6b","#7a2e3a"];
export const SUBJECTS = ["Обществознание", "Математика", "Английский язык", "Менторство", "Занятия с Марселькой"];
export const serif = "'Georgia','Times New Roman',serif";
export const sans = "'Inter','Segoe UI',system-ui,-apple-system,sans-serif";

export const iconBtn = { display: "grid", placeItems: "center", width: 34, height: 34, borderRadius: 8, border: `1px solid ${T.line}`, background: T.card, color: T.soft, cursor: "pointer" };
export const btn = { display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 15px", borderRadius: 9, border: "none", background: T.accent, color: "#fff", font: `600 14px ${sans}`, cursor: "pointer" };
export const btnGhost = { ...btn, background: T.card, color: T.ink, border: `1px solid ${T.lineDk}` };
export const input = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 9, border: `1px solid ${T.lineDk}`, background: "#fff", font: `14px ${sans}`, color: T.ink, outline: "none" };
export const chip = { font: `600 11px ${sans}`, padding: "3px 9px", borderRadius: 20, background: T.accentSoft, color: T.accentDk, whiteSpace: "nowrap" };

export function Card({ children, style }) {
  return <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 13, ...style }}>{children}</div>;
}
export function Avatar({ text, size = 36, bg = T.accent, color = "#fff" }) {
  return <div style={{ width: size, height: size, borderRadius: "50%", background: bg, color, display: "grid", placeItems: "center", font: `600 ${size * 0.38}px ${sans}`, flexShrink: 0 }}>{text}</div>;
}
export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,22,26,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.cardAlt, borderRadius: 14, border: `1px solid ${T.line}`, width: "100%", maxWidth: wide ? 880 : 540, maxHeight: "88vh", overflow: "auto", boxShadow: "0 24px 60px rgba(20,22,26,.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${T.line}`, position: "sticky", top: 0, background: T.cardAlt }}>
          <h3 style={{ margin: 0, font: `600 17px ${sans}`, color: T.ink }}>{title}</h3>
          <button onClick={onClose} style={iconBtn}><X size={18} /></button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}
export const initials = (name = "?") => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
export const ROLE_LABEL = { tutor: "Репетитор", student: "Ученик", parent: "Родитель" };
