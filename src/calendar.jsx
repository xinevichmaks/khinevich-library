import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from "lucide-react";
import { T, sans } from "./ui.jsx";

export const RU_MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
const RU_MONTHS_SHORT = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const RU_WD = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];

// Ограничение диапазона: с начала 2026 по август 2027 включительно
export const MIN_YM = { y: 2026, m: 0 };
export const MAX_YM = { y: 2027, m: 7 };

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function fmtDateRu(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso; // на случай старых строк вида "23 июн"
  return `${d} ${RU_MONTHS_SHORT[m - 1]}`;
}
function inRange(y, m) {
  if (y < MIN_YM.y || (y === MIN_YM.y && m < MIN_YM.m)) return false;
  if (y > MAX_YM.y || (y === MAX_YM.y && m > MAX_YM.m)) return false;
  return true;
}
function daysGrid(y, m) {
  const first = new Date(y, m, 1).getDay();
  const leading = (first + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

/* ---------- выбор одной даты (для форм создания занятий/пробников) ---------- */
export function DatePicker({ value, onChange, placeholder = "Выберите дату" }) {
  const [open, setOpen] = useState(false);
  const init = value ? value.split("-").map(Number) : null;
  const today = new Date();
  const [y, setY] = useState(init ? init[0] : today.getFullYear());
  const [m, setM] = useState(init ? init[1] - 1 : today.getMonth());

  const shiftMonth = (delta) => {
    let ny = y, nm = m + delta;
    if (nm < 0) { nm = 11; ny--; } else if (nm > 11) { nm = 0; ny++; }
    if (inRange(ny, nm)) { setY(ny); setM(nm); }
  };
  const pick = (d) => {
    const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    onChange(iso);
    setOpen(false);
  };
  const cells = daysGrid(y, m);
  const selectedDay = init && init[0] === y && init[1] - 1 === m ? init[2] : null;

  return (
    <div style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 11px", borderRadius: 9, border: `1px solid ${T.lineDk}`, background: "#fff", font: `13.5px ${sans}`, color: value ? T.ink : T.faint, cursor: "pointer", textAlign: "left" }}>
        <CalIcon size={15} color={T.faint} />{value ? fmtDateRu(value) + `, ${y}` : placeholder}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 41, background: T.cardAlt, border: `1px solid ${T.line}`, borderRadius: 12, padding: 14, width: 260, boxShadow: "0 14px 34px rgba(20,10,10,.18)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <button type="button" onClick={() => shiftMonth(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: T.soft, padding: 4 }}><ChevronLeft size={17} /></button>
              <div style={{ font: `600 13.5px ${sans}`, color: T.ink, textTransform: "capitalize" }}>{RU_MONTHS[m]} {y}</div>
              <button type="button" onClick={() => shiftMonth(1)} style={{ background: "none", border: "none", cursor: "pointer", color: T.soft, padding: 4 }}><ChevronRight size={17} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, textAlign: "center" }}>
              {RU_WD.map((w) => <div key={w} style={{ font: `600 10px ${sans}`, color: T.faint, paddingBottom: 3 }}>{w}</div>)}
              {cells.map((d, i) => d == null ? <div key={i} /> : (
                <button type="button" key={i} onClick={() => pick(d)} style={{ aspectRatio: "1", border: "none", borderRadius: 7, cursor: "pointer", background: selectedDay === d ? T.accent : "transparent", color: selectedDay === d ? "#fff" : T.ink, font: `12.5px ${sans}` }}>{d}</button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- полноразмерный календарь с несколькими категориями ---------- */
export function MultiMonthCalendar({ categories, initialYear, initialMonth, big }) {
  const today = new Date();
  const [y, setY] = useState(initialYear ?? today.getFullYear());
  const [m, setM] = useState(initialMonth ?? today.getMonth());
  const shiftMonth = (delta) => {
    let ny = y, nm = m + delta;
    if (nm < 0) { nm = 11; ny--; } else if (nm > 11) { nm = 0; ny++; }
    if (inRange(ny, nm)) { setY(ny); setM(nm); }
  };
  const cells = daysGrid(y, m);
  const setsByCat = categories.map((c) => new Set((c.dates || []).filter(Boolean)));
  const isoOf = (d) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const isToday = (d) => today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
  const canPrev = inRange(m === 0 ? y - 1 : y, m === 0 ? 11 : m - 1);
  const canNext = inRange(m === 11 ? y + 1 : y, m === 11 ? 0 : m + 1);
  const cellSize = big ? 64 : 44;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => shiftMonth(-1)} disabled={!canPrev} style={{ background: T.cardAlt, border: `1px solid ${T.line}`, borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: canPrev ? "pointer" : "default", color: canPrev ? T.soft : T.line }}><ChevronLeft size={18} /></button>
          <div style={{ font: `700 18px ${sans}`, color: T.ink, textTransform: "capitalize", minWidth: 150, textAlign: "center" }}>{RU_MONTHS[m]} {y}</div>
          <button onClick={() => shiftMonth(1)} disabled={!canNext} style={{ background: T.cardAlt, border: `1px solid ${T.line}`, borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: canNext ? "pointer" : "default", color: canNext ? T.soft : T.line }}><ChevronRight size={18} /></button>
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {categories.map((c) => (
            <div key={c.legend} style={{ display: "flex", alignItems: "center", gap: 6, font: `12px ${sans}`, color: T.faint }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: c.color, display: "inline-block" }} />{c.legend}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, textAlign: "center" }}>
        {RU_WD.map((w) => <div key={w} style={{ font: `600 11px ${sans}`, color: T.faint, paddingBottom: 4 }}>{w}</div>)}
        {cells.map((d, i) => {
          if (d == null) return <div key={i} />;
          const iso = isoOf(d);
          const marks = categories.map((c, ci) => setsByCat[ci].has(iso) ? c.color : null).filter(Boolean);
          return (
            <div key={i} style={{ position: "relative", height: cellSize, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 10, background: isToday(d) ? T.accentSoft : T.cardAlt, border: `1px solid ${T.line}` }}>
              <span style={{ font: `600 ${big ? 15 : 13}px ${sans}`, color: T.ink }}>{d}</span>
              {marks.length > 0 && (
                <div style={{ display: "flex", gap: 3 }}>
                  {marks.map((c, k) => <span key={k} style={{ width: 6, height: 6, borderRadius: "50%", background: c, display: "inline-block" }} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- виджет-календарь месяца с навигацией (для главной) ---------- */
export function MonthCalendar({ title, color, legend, markedDates = [] }) {
  const today = new Date();
  const [y, setY] = useState(today.getFullYear());
  const [m, setM] = useState(today.getMonth());
  const shiftMonth = (delta) => {
    let ny = y, nm = m + delta;
    if (nm < 0) { nm = 11; ny--; } else if (nm > 11) { nm = 0; ny++; }
    if (inRange(ny, nm)) { setY(ny); setM(nm); }
  };
  const cells = daysGrid(y, m);
  const marked = new Set(markedDates.filter(Boolean).map((iso) => iso));
  const isMarked = (d) => marked.has(`${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  const isToday = (d) => today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
  const canPrev = inRange(m === 0 ? y - 1 : y, m === 0 ? 11 : m - 1);
  const canNext = inRange(m === 11 ? y + 1 : y, m === 11 ? 0 : m + 1);

  return (
    <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 13, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ font: `600 14.5px ${sans}`, color: T.ink }}>{title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, font: `11px ${sans}`, color: T.faint }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, display: "inline-block" }} />{legend}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
        <button onClick={() => shiftMonth(-1)} disabled={!canPrev} style={{ background: "none", border: "none", cursor: canPrev ? "pointer" : "default", color: canPrev ? T.soft : T.line, padding: 4 }}><ChevronLeft size={17} /></button>
        <div style={{ font: `12.5px ${sans}`, color: T.faint, textTransform: "capitalize" }}>{RU_MONTHS[m]} {y}</div>
        <button onClick={() => shiftMonth(1)} disabled={!canNext} style={{ background: "none", border: "none", cursor: canNext ? "pointer" : "default", color: canNext ? T.soft : T.line, padding: 4 }}><ChevronRight size={17} /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, textAlign: "center", marginTop: 10 }}>
        {RU_WD.map((w) => <div key={w} style={{ font: `600 10.5px ${sans}`, color: T.faint, paddingBottom: 4 }}>{w}</div>)}
        {cells.map((d, i) => {
          if (d == null) return <div key={i} />;
          return (
            <div key={i} style={{ position: "relative", aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", font: `13px ${sans}`, color: T.ink, borderRadius: 8, background: isToday(d) ? T.accentSoft : "transparent" }}>
              {isMarked(d) && <span style={{ position: "absolute", inset: 2, borderRadius: 8, border: `2px solid ${color}` }} />}
              <span style={{ position: "relative" }}>{d}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
