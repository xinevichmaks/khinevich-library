import { useState } from "react";
import { Plus, Trash2, ListChecks, Check, X, Eye, Search, Settings2, Tag, Edit3 } from "lucide-react";
import { Card, Modal, T, sans, btn, btnGhost, iconBtn, input, chip, TAG_PALETTE } from "../ui.jsx";
import { DatePicker, fmtDateRu } from "../calendar.jsx";
import { useAuth } from "../auth.jsx";
import { useCol, addItem, updateItem, removeItem } from "../useDB.js";

const LETTERS = "АБВГДЕЖЗИК";
const QTYPES = [
  { key: "single", label: "Один правильный ответ" },
  { key: "text", label: "Текстовый ответ" },
  { key: "match", label: "Установление соответствия" },
  { key: "graph", label: "Графиковый (текст + картинка)" },
];

function blankQuestion(type) {
  if (type === "single") return { type, q: "", topic: "", opts: ["", "", "", ""], correct: 0 };
  if (type === "text") return { type, q: "", topic: "", answer: "" };
  if (type === "match") return { type, q: "", topic: "", leftTitle: "", rightTitle: "", left: ["", ""], right: ["", ""], correctMap: [0, 0] };
  return { type: "graph", q: "", topic: "", promptText: "", imageData: "", maxPoints: 6 };
}

export default function Mocks() {
  const { profile, role } = useAuth();
  const isStaff = role === "tutor" || role === "admin";
  const sid = role === "student" ? profile.uid : role === "parent" ? profile.childId : null;
  const { items: users } = useCol("users");
  const { items: mocks } = useCol("mocks");
  const { items: allTags } = useCol("mockTags");
  const students = users.filter((u) => u.role === "student" && (role === "admin" || u.tutorId === profile.uid));
  const myTutorId = isStaff ? profile.uid : users.find((u) => u.id === sid)?.tutorId;
  const tags = isStaff ? allTags.filter((t) => t.tutorId === profile.uid) : allTags.filter((t) => t.tutorId === myTutorId);
  const scoped = sid
    ? mocks.filter((m) => m.studentId === sid)
    : (role === "admin" ? mocks : mocks.filter((m) => m.tutorId === profile.uid));
  const [q, setQ] = useState("");
  const [filterTag, setFilterTag] = useState(null);
  const [sortBy, setSortBy] = useState("date");
  const [tagManager, setTagManager] = useState(false);
  const [tagging, setTagging] = useState(null);
  const list = scoped.filter((m) =>
    (m.title + " " + (m.subject || "") + " " + (m.studentName || "")).toLowerCase().includes(q.toLowerCase()) &&
    (!filterTag || (m.tagIds || []).includes(filterTag))
  ).sort((a, b) => sortBy === "alpha"
    ? a.title.localeCompare(b.title, "ru")
    : (a.date || "9999-99-99").localeCompare(b.date || "9999-99-99"));
  const tagById = (id) => allTags.find((t) => t.id === id);

  const [add, setAdd] = useState(false);
  const [editingMock, setEditingMock] = useState(null);
  const [targetIds, setTargetIds] = useState(new Set());
  const [form, setForm] = useState({ title: "", subject: "", date: "" });
  const [qs, setQs] = useState([]);

  const [taking, setTaking] = useState(null);
  const [answers, setAnswers] = useState({});
  const [review, setReview] = useState(null);
  const [grading, setGrading] = useState(null);
  const [gradeInputs, setGradeInputs] = useState({});

  const toggleTarget = (id) => setTargetIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const addQ = () => setQs([...qs, blankQuestion("single")]);
  const setQType = (i, type) => setQs(qs.map((q, idx) => (idx === i ? { ...blankQuestion(type), q: q.q, topic: q.topic } : q)));
  const updQ = (i, patch) => setQs(qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  const updOpt = (i, j, v) => setQs(qs.map((q, idx) => (idx === i ? { ...q, opts: q.opts.map((o, oi) => (oi === j ? v : o)) } : q)));
  const updLeft = (i, k, v) => setQs(qs.map((q, idx) => (idx === i ? { ...q, left: q.left.map((l, li) => (li === k ? v : l)) } : q)));
  const updRight = (i, k, v) => setQs(qs.map((q, idx) => (idx === i ? { ...q, right: q.right.map((r, ri) => (ri === k ? v : r)) } : q)));
  const addLeftRow = (i) => setQs(qs.map((q, idx) => (idx === i ? { ...q, left: [...q.left, ""], correctMap: [...q.correctMap, 0] } : q)));
  const removeLeftRow = (i, k) => setQs(qs.map((q, idx) => (idx === i ? { ...q, left: q.left.filter((_, li) => li !== k), correctMap: q.correctMap.filter((_, ci) => ci !== k) } : q)));
  const addRightRow = (i) => setQs(qs.map((q, idx) => (idx === i ? { ...q, right: [...q.right, ""] } : q)));
  const removeRightRow = (i, k) => setQs(qs.map((q, idx) => (idx === i ? { ...q, right: q.right.filter((_, ri) => ri !== k) } : q)));
  const setMatchAns = (i, k, v) => setQs(qs.map((q, idx) => (idx === i ? { ...q, correctMap: q.correctMap.map((c, ci) => (ci === k ? Number(v) : c)) } : q)));
  const setImage = (i, dataUrl) => setQs(qs.map((q, idx) => (idx === i ? { ...q, imageData: dataUrl } : q)));

  const onFile = (i, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setImage(i, e.target.result);
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!form.title) return;
    const cleanQs = qs.filter((q) => q.q.trim());
    if (editingMock) {
      await updateItem("mocks", editingMock.id, { ...form, ...(cleanQs.length ? { questions: JSON.parse(JSON.stringify(cleanQs)) } : {}) });
      setEditingMock(null); setAdd(false); setForm({ title: "", subject: "", date: "" }); setQs([]);
      return;
    }
    if (targetIds.size === 0) return;
    await Promise.all([...targetIds].map((studentId) => {
      const st = users.find((u) => u.id === studentId);
      return addItem("mocks", { ...form, studentId, studentName: st?.name || "", tutorId: profile.uid, status: "Ожидает", questions: JSON.parse(JSON.stringify(cleanQs)) });
    }));
    setAdd(false); setForm({ title: "", subject: "", date: "" }); setQs([]); setTargetIds(new Set());
  };

  const openEditMock = (m) => {
    setEditingMock(m);
    setForm({ title: m.title, subject: m.subject || "", date: m.date || "" });
    setQs(m.questions || []);
    setAdd(true);
  };

  const submitTake = async () => {
    if (!taking) return;
    let earned = 0, total = 0, hasGraph = false;
    const finalAnswers = [];
    taking.questions.forEach((qq, i) => {
      const type = qq.type || "single";
      if (type === "single") {
        total += 1;
        const given = answers[i] ?? -1;
        if (given === qq.correct) earned += 1;
        finalAnswers.push(given);
      } else if (type === "text") {
        total += 1;
        const given = (answers[i] || "").trim();
        if (given.toLowerCase() === (qq.answer || "").trim().toLowerCase()) earned += 1;
        finalAnswers.push(given);
      } else if (type === "match") {
        const given = answers[i] || [];
        total += qq.left.length;
        qq.correctMap.forEach((c, k) => { if (given[k] === c) earned += 1; });
        finalAnswers.push(given);
      } else {
        hasGraph = true;
        finalAnswers.push((answers[i] || "").trim());
      }
    });
    await updateItem("mocks", taking.id, {
      answers: finalAnswers, autoScore: earned, autoTotal: total, score: earned, total,
      manualScores: taking.manualScores || {}, status: hasGraph ? "Требует проверки" : "Пройден",
    });
    setTaking(null); setAnswers({});
  };

  const saveGrades = async () => {
    if (!grading) return;
    let graphEarned = 0, graphTotal = 0;
    const manualScores = { ...(grading.manualScores || {}) };
    grading.questions.forEach((q, i) => {
      if ((q.type || "single") !== "graph") return;
      const v = Math.max(0, Math.min(q.maxPoints, Number(gradeInputs[i]) || 0));
      manualScores[i] = v;
      graphEarned += v; graphTotal += q.maxPoints;
    });
    await updateItem("mocks", grading.id, {
      manualScores, score: (grading.autoScore || 0) + graphEarned, total: (grading.autoTotal || 0) + graphTotal, status: "Пройден",
    });
    setGrading(null); setGradeInputs({});
  };

  return (
    <div>
      {role === "tutor" && <div style={{ marginBottom: 16, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button style={btn} onClick={() => { setEditingMock(null); setForm({ title: "", subject: "", date: "" }); setQs([]); setAdd(true); }}><Plus size={16} />Добавить пробник</button>
        <button style={btnGhost} onClick={() => setTagManager(true)}><Settings2 size={16} />Теги</button>
      </div>}

      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search size={17} color={T.faint} style={{ position: "absolute", left: 12, top: 11 }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по пробникам…" style={{ ...input, paddingLeft: 38 }} />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ font: `12px ${sans}`, color: T.faint }}>Сортировка:</span>
        <button onClick={() => setSortBy("date")} style={{ ...chip, background: sortBy === "date" ? T.accent : T.card, color: sortBy === "date" ? "#fff" : T.ink, border: `1px solid ${sortBy === "date" ? T.accent : T.line}`, cursor: "pointer" }}>По ближайшей дате</button>
        <button onClick={() => setSortBy("alpha")} style={{ ...chip, background: sortBy === "alpha" ? T.accent : T.card, color: sortBy === "alpha" ? "#fff" : T.ink, border: `1px solid ${sortBy === "alpha" ? T.accent : T.line}`, cursor: "pointer" }}>По алфавиту</button>
      </div>
      {tags.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ font: `12px ${sans}`, color: T.faint }}>Теги:</span>
          <button onClick={() => setFilterTag(null)} style={{ ...chip, background: !filterTag ? T.accent : T.line, color: !filterTag ? "#fff" : T.soft, border: "none", cursor: "pointer" }}>Все</button>
          {tags.map((t) => (
            <button key={t.id} onClick={() => setFilterTag(filterTag === t.id ? null : t.id)} style={{ display: "inline-flex", alignItems: "center", gap: 6, ...chip, background: filterTag === t.id ? t.color : T.card, color: filterTag === t.id ? "#fff" : T.ink, border: `1px solid ${filterTag === t.id ? t.color : T.line}`, cursor: "pointer" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.color, display: "inline-block" }} />{t.name}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {list.map((m) => {
          const answered = Array.isArray(m.answers);
          const needsReview = m.status === "Требует проверки";
          const statusBg = m.status === "Пройден" ? "#cfe0cf" : needsReview ? "#f0d9a6" : T.line;
          const mTags = (m.tagIds || []).map(tagById).filter(Boolean);
          return (
            <Card key={m.id} style={{ padding: 16 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ font: `600 15px ${sans}`, color: T.ink, flex: 1 }}>{m.title}</div>
                <span style={chip}>{m.subject}</span>
                <span style={chip}>{m.questions.length} вопр.</span>
                {answered && <span style={chip}>{m.score}/{m.total} б.</span>}
                <span style={{ ...chip, background: statusBg }}>{m.status}</span>
              </div>
              {mTags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                  {mTags.map((t) => (
                    <span key={t.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, font: `11px ${sans}`, color: T.faint }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: t.color }} />{t.name}</span>
                  ))}
                </div>
              )}
              {role === "tutor" && <div style={{ font: `12px ${sans}`, color: T.faint, marginTop: 2 }}>{m.studentName}</div>}
              <div style={{ font: `12px ${sans}`, color: T.faint, marginTop: 6 }}>дата: {fmtDateRu(m.date) || "—"}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                {role === "student" && !answered && <button style={btn} onClick={() => { setTaking(m); setAnswers({}); }}>Пройти пробник</button>}
                {answered && <button style={{ ...btnGhost, padding: "8px 11px" }} onClick={() => setReview(m)}><ListChecks size={15} />Разбор ответов</button>}
                {role === "tutor" && needsReview && <button style={btn} onClick={() => { setGrading(m); setGradeInputs(m.manualScores || {}); }}>✍️ Проверить вручную</button>}
                {role === "tutor" && <button title="Просмотреть и редактировать" style={{ ...btnGhost, padding: "8px 11px" }} onClick={() => openEditMock(m)}><Edit3 size={15} />Редактировать</button>}
                {role === "tutor" && <button title="Теги" style={{ ...iconBtn, border: `1px solid ${T.line}` }} onClick={() => setTagging(m)}><Tag size={15} /></button>}
                {role === "tutor" && <button style={{ ...btnGhost, padding: "8px 11px" }} onClick={() => removeItem("mocks", m.id)}><Trash2 size={15} /></button>}
              </div>
            </Card>
          );
        })}
        {list.length === 0 && <div style={{ color: T.faint, font: `14px ${sans}`, padding: 24 }}>Пробников пока нет.</div>}
      </div>

      {/* ---------- создание пробника ---------- */}
      <Modal open={add} onClose={() => { setAdd(false); setEditingMock(null); }} title={editingMock ? `Редактировать: ${editingMock.title}` : "Новый пробник"} wide>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {editingMock ? (
            <div style={{ font: `13px ${sans}`, color: T.faint }}>Ученик: <b style={{ color: T.ink }}>{editingMock.studentName}</b></div>
          ) : (
            <div>
              <div style={{ font: `12px ${sans}`, color: T.faint, marginBottom: 8 }}>Кому назначить (можно выбрать нескольких)</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {students.map((s) => {
                  const on = targetIds.has(s.id);
                  return <button key={s.id} onClick={() => toggleTarget(s.id)} style={{ padding: "7px 12px", borderRadius: 8, border: `1.5px solid ${on ? T.accent : T.line}`, background: on ? T.accentSoft : T.cardAlt, font: `600 12.5px ${sans}`, color: T.ink, cursor: "pointer" }}>{s.name}</button>;
                })}
              </div>
            </div>
          )}
          <input style={input} placeholder="Название пробника" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div style={{ display: "flex", gap: 10 }}>
            <input style={input} placeholder="Предмет" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            <DatePicker value={form.date} onChange={(d) => setForm({ ...form, date: d })} />
          </div>

          <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 12 }}>
            <div style={{ font: `600 13px ${sans}`, color: T.ink, marginBottom: 4 }}>Вопросы</div>
            <div style={{ font: `12px ${sans}`, color: T.faint, marginBottom: 10 }}>Четыре типа — можно комбинировать в одном пробнике: тест с вариантами, текстовый ответ, установление соответствия (формат ЕГЭ) и графиковый (текст + картинка, проверяется вручную).</div>
            {qs.map((q, i) => (
              <Card key={i} style={{ padding: 14, background: T.cardAlt, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={chip}>Вопрос №{i + 1}</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <select value={q.type} onChange={(e) => setQType(i, e.target.value)} style={{ ...input, width: "auto", padding: "5px 8px", fontSize: 12.5 }}>
                      {QTYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                    </select>
                    <button style={{ background: "none", border: "none", cursor: "pointer", color: T.faint }} onClick={() => setQs(qs.filter((_, idx) => idx !== i))}><Trash2 size={15} /></button>
                  </div>
                </div>

                {q.type === "single" && <>
                  <input style={{ ...input, marginBottom: 8 }} placeholder="Текст вопроса" value={q.q} onChange={(e) => updQ(i, { q: e.target.value })} />
                  <input style={{ ...input, marginBottom: 8 }} placeholder="Тема (для слабых мест)" value={q.topic} onChange={(e) => updQ(i, { topic: e.target.value })} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ font: `12px ${sans}`, color: T.faint }}>Вариантов ответа:</span>
                    <input type="number" min={2} max={10} value={q.opts.length} style={{ width: 56, padding: "5px 8px", borderRadius: 7, border: `1px solid ${T.lineDk}` }}
                      onChange={(e) => { let n = Math.max(2, Math.min(10, Number(e.target.value) || 2)); const opts = q.opts.slice(0, n); while (opts.length < n) opts.push(""); updQ(i, { opts, correct: q.correct >= n ? 0 : q.correct }); }} />
                  </div>
                  {q.opts.map((o, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <input type="radio" name={`mc${i}`} checked={q.correct === j} onChange={() => updQ(i, { correct: j })} title="Верный ответ" />
                      <input style={input} placeholder={`Вариант ${j + 1}`} value={o} onChange={(e) => updOpt(i, j, e.target.value)} />
                    </div>
                  ))}
                  <div style={{ font: `11.5px ${sans}`, color: T.faint }}>Отметьте кружком верный вариант.</div>
                </>}

                {q.type === "text" && <>
                  <input style={{ ...input, marginBottom: 8 }} placeholder="Текст вопроса" value={q.q} onChange={(e) => updQ(i, { q: e.target.value })} />
                  <input style={{ ...input, marginBottom: 8 }} placeholder="Тема (для слабых мест)" value={q.topic} onChange={(e) => updQ(i, { topic: e.target.value })} />
                  <input style={input} placeholder="Правильный ответ (без учёта регистра)" value={q.answer} onChange={(e) => updQ(i, { answer: e.target.value })} />
                </>}

                {q.type === "match" && <>
                  <input style={{ ...input, marginBottom: 8 }} placeholder="Формулировка задания" value={q.q} onChange={(e) => updQ(i, { q: e.target.value })} />
                  <input style={{ ...input, marginBottom: 8 }} placeholder="Тема (для слабых мест)" value={q.topic} onChange={(e) => updQ(i, { topic: e.target.value })} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <input style={{ ...input, marginBottom: 8 }} placeholder="Заголовок левого списка" value={q.leftTitle} onChange={(e) => updQ(i, { leftTitle: e.target.value })} />
                      {q.left.map((l, k) => (
                        <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <span style={{ font: `600 12px ${sans}`, color: T.faint, width: 16 }}>{LETTERS[k] || k + 1}</span>
                          <input style={input} placeholder={`Пункт ${LETTERS[k] || k + 1}`} value={l} onChange={(e) => updLeft(i, k, e.target.value)} />
                          <button style={{ background: "none", border: "none", cursor: "pointer", color: T.faint }} onClick={() => removeLeftRow(i, k)}>✕</button>
                        </div>
                      ))}
                      <button style={{ ...btnGhost, padding: "6px 10px" }} onClick={() => addLeftRow(i)}>+ Строка слева</button>
                    </div>
                    <div>
                      <input style={{ ...input, marginBottom: 8 }} placeholder="Заголовок правого списка" value={q.rightTitle} onChange={(e) => updQ(i, { rightTitle: e.target.value })} />
                      {q.right.map((r, k) => (
                        <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <span style={{ font: `600 12px ${sans}`, color: T.faint, width: 16 }}>{k + 1}</span>
                          <input style={input} placeholder={`Вариант ${k + 1}`} value={r} onChange={(e) => updRight(i, k, e.target.value)} />
                          <button style={{ background: "none", border: "none", cursor: "pointer", color: T.faint }} onClick={() => removeRightRow(i, k)}>✕</button>
                        </div>
                      ))}
                      <button style={{ ...btnGhost, padding: "6px 10px" }} onClick={() => addRightRow(i)}>+ Вариант справа</button>
                    </div>
                  </div>
                  <div style={{ font: `12px ${sans}`, color: T.faint, margin: "10px 0 6px" }}>Укажите верное соответствие для каждой буквы:</div>
                  {q.left.map((l, k) => (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ font: `600 12.5px ${sans}`, width: 90 }}>{LETTERS[k] || k + 1}) {l || "…"}</span>
                      <select style={{ ...input, width: "auto" }} value={q.correctMap[k]} onChange={(e) => setMatchAns(i, k, e.target.value)}>
                        {q.right.map((r, ri) => <option key={ri} value={ri}>{ri + 1}) {r || "…"}</option>)}
                      </select>
                    </div>
                  ))}
                </>}

                {q.type === "graph" && <>
                  <input style={{ ...input, marginBottom: 8 }} placeholder="Короткое название (напр. «Задание 21. Анализ графика»)" value={q.q} onChange={(e) => updQ(i, { q: e.target.value })} />
                  <input style={{ ...input, marginBottom: 8 }} placeholder="Тема (для слабых мест)" value={q.topic} onChange={(e) => updQ(i, { topic: e.target.value })} />
                  <textarea style={{ ...input, minHeight: 100, resize: "vertical", marginBottom: 8 }} placeholder="Текст задания (условие, вопрос к графику/тексту)" value={q.promptText} onChange={(e) => updQ(i, { promptText: e.target.value })} />
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ font: `12px ${sans}`, color: T.faint, marginBottom: 6 }}>Картинка (график, таблица, скан задания)</div>
                    {q.imageData ? (
                      <div style={{ position: "relative", display: "inline-block" }}>
                        <img src={q.imageData} style={{ maxWidth: 220, maxHeight: 150, borderRadius: 8, border: `1px solid ${T.line}`, display: "block" }} />
                        <button onClick={() => setImage(i, "")} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,.6)", color: "#fff", border: "none", borderRadius: 6, width: 22, height: 22, cursor: "pointer" }}>✕</button>
                      </div>
                    ) : <input type="file" accept="image/*" onChange={(e) => onFile(i, e.target.files[0])} />}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ font: `12px ${sans}`, color: T.faint }}>Макс. баллов:</span>
                    <input type="number" min={1} max={20} value={q.maxPoints} style={{ width: 60, padding: "5px 8px", borderRadius: 7, border: `1px solid ${T.lineDk}` }} onChange={(e) => updQ(i, { maxPoints: Number(e.target.value) || 1 })} />
                  </div>
                  <div style={{ font: `11.5px ${sans}`, color: T.faint, marginTop: 8 }}>Этот тип не проверяется автоматически — ученик напишет развёрнутый ответ, вы проверите вручную и выставите баллы.</div>
                </>}
              </Card>
            ))}
            <button style={btnGhost} onClick={addQ}><Plus size={15} />Добавить вопрос</button>
          </div>

          <button style={btn} onClick={save}>Создать и назначить</button>
        </div>
      </Modal>

      {/* ---------- прохождение пробника ---------- */}
      <Modal open={!!taking} onClose={() => setTaking(null)} title={taking?.title} wide>
        {taking && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {taking.questions.map((qq, i) => {
              const type = qq.type || "single";
              if (type === "single") return (
                <div key={i}>
                  <div style={{ font: `600 15px ${sans}`, color: T.ink, marginBottom: 10 }}>{i + 1}. {qq.q}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {qq.opts.map((o, j) => {
                      const chosen = answers[i] === j;
                      return <button key={j} onClick={() => setAnswers({ ...answers, [i]: j })} style={{ textAlign: "left", padding: "11px 14px", borderRadius: 9, cursor: "pointer", border: `1.5px solid ${chosen ? T.accent : T.line}`, background: chosen ? T.accentSoft : T.cardAlt, font: `14px ${sans}`, color: T.ink }}>{o || `Вариант ${j + 1}`}</button>;
                    })}
                  </div>
                </div>
              );
              if (type === "text") return (
                <div key={i}>
                  <div style={{ font: `600 15px ${sans}`, color: T.ink, marginBottom: 10 }}>{i + 1}. {qq.q}</div>
                  <input style={input} placeholder="Ваш ответ" value={answers[i] || ""} onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })} />
                </div>
              );
              if (type === "match") return (
                <div key={i}>
                  <div style={{ font: `600 15px ${sans}`, color: T.ink, marginBottom: 4 }}>{i + 1}. {qq.q}</div>
                  {qq.leftTitle && <div style={{ font: `11px ${sans}`, color: T.faint, textTransform: "uppercase", marginBottom: 8 }}>{qq.leftTitle} → {qq.rightTitle || ""}</div>}
                  {qq.left.map((l, k) => (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ font: `600 13px ${sans}`, width: 90 }}>{LETTERS[k] || k + 1}) {l}</span>
                      <select style={{ ...input, width: "auto" }} value={(answers[i] || [])[k] ?? ""} onChange={(e) => { const arr = [...(answers[i] || [])]; arr[k] = e.target.value === "" ? -1 : Number(e.target.value); setAnswers({ ...answers, [i]: arr }); }}>
                        <option value="">—</option>
                        {qq.right.map((r, ri) => <option key={ri} value={ri}>{ri + 1}) {r}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              );
              return (
                <div key={i}>
                  <div style={{ font: `600 15px ${sans}`, color: T.ink, marginBottom: 8 }}>{i + 1}. {qq.q}</div>
                  <div style={{ font: `14px/1.6 ${sans}`, color: T.soft, whiteSpace: "pre-wrap", background: T.cardAlt, border: `1px solid ${T.line}`, borderRadius: 9, padding: 12, marginBottom: 8 }}>{qq.promptText}</div>
                  {qq.imageData && <img src={qq.imageData} style={{ maxWidth: "100%", borderRadius: 9, border: `1px solid ${T.line}`, marginBottom: 8, display: "block" }} />}
                  <textarea style={{ ...input, minHeight: 130, resize: "vertical" }} placeholder="Развёрнутый ответ" value={answers[i] || ""} onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })} />
                  <div style={{ font: `11.5px ${sans}`, color: T.faint, marginTop: 6 }}>Максимум {qq.maxPoints} баллов — репетитор проверит вручную.</div>
                </div>
              );
            })}
            <button style={btn} onClick={submitTake}>Завершить и отправить</button>
          </div>
        )}
      </Modal>

      {/* ---------- разбор ответов ---------- */}
      <Modal open={!!review} onClose={() => setReview(null)} title="Разбор пробника" wide>
        {review && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ font: `15px ${sans}`, color: T.soft }}>Результат: <b style={{ color: T.ink }}>{review.score}/{review.total}</b>{role === "tutor" ? ` · ${review.studentName}` : ""}</div>
            {review.questions.map((qq, i) => {
              const type = qq.type || "single";
              const given = review.answers[i];
              return (
                <div key={i} style={{ borderTop: `1px solid ${T.line}`, paddingTop: 12 }}>
                  <div style={{ font: `11px ${sans}`, color: T.faint, textTransform: "uppercase", marginBottom: 3 }}>{qq.topic || ""}</div>
                  <div style={{ font: `600 14px ${sans}`, color: T.ink, marginBottom: 6 }}>{i + 1}. {qq.q}</div>
                  {type === "single" && (() => { const ok = given === qq.correct; return (
                    <div style={{ font: `14px ${sans}`, color: T.soft }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>Ответ: {qq.opts[given] ?? "—"} {ok ? <Check size={15} color="#3f7a4d" /> : <X size={15} color="#a23b2d" />}</div>
                      {!ok && <div>Правильный ответ: {qq.opts[qq.correct]}</div>}
                    </div>); })()}
                  {type === "text" && (() => { const ok = (given || "").trim().toLowerCase() === (qq.answer || "").trim().toLowerCase(); return (
                    <div style={{ font: `14px ${sans}`, color: T.soft }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>Ответ: {given || "—"} {ok ? <Check size={15} color="#3f7a4d" /> : <X size={15} color="#a23b2d" />}</div>
                      {!ok && <div>Правильный ответ: {qq.answer}</div>}
                    </div>); })()}
                  {type === "match" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {qq.left.map((l, k) => {
                        const arr = given || []; const ok = arr[k] === qq.correctMap[k];
                        return (
                          <div key={k} style={{ font: `13.5px ${sans}`, color: T.soft, display: "flex", gap: 6, alignItems: "center" }}>
                            <span style={{ width: 110 }}>{LETTERS[k] || k + 1}) {l}</span> → {arr[k] != null && arr[k] >= 0 ? `${arr[k] + 1}) ${qq.right[arr[k]]}` : "—"}
                            {ok ? <Check size={14} color="#3f7a4d" /> : <span style={{ color: "#a23b2d" }}>✗ верно: {qq.correctMap[k] + 1}) {qq.right[qq.correctMap[k]]}</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {type === "graph" && (() => { const g = review.manualScores ? review.manualScores[i] : undefined; return (
                    <div>
                      {qq.promptText && <div style={{ font: `13px ${sans}`, color: T.faint, marginBottom: 6 }}>{qq.promptText}</div>}
                      {qq.imageData && <img src={qq.imageData} style={{ maxWidth: "100%", borderRadius: 9, border: `1px solid ${T.line}`, marginBottom: 8, display: "block" }} />}
                      <div style={{ font: `14px/1.6 ${sans}`, color: T.ink, whiteSpace: "pre-wrap", background: T.cardAlt, border: `1px solid ${T.line}`, borderRadius: 9, padding: 10, marginBottom: 6 }}>{given || "Ответ не дан."}</div>
                      <div style={{ font: `13px ${sans}`, color: T.soft }}>{g != null ? <>Баллы: <b>{g} из {qq.maxPoints}</b></> : `Ожидает проверки репетитором (макс. ${qq.maxPoints})`}</div>
                    </div>); })()}
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* ---------- ручная проверка графиковых вопросов ---------- */}
      <Modal open={!!grading} onClose={() => setGrading(null)} title="Проверка развёрнутых ответов" wide>
        {grading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ font: `13px ${sans}`, color: T.faint }}>{grading.studentName} · {grading.title}</div>
            {grading.questions.map((q, i) => {
              if ((q.type || "single") !== "graph") return null;
              return (
                <div key={i} style={{ borderTop: `1px solid ${T.line}`, paddingTop: 12 }}>
                  <div style={{ font: `11px ${sans}`, color: T.faint, textTransform: "uppercase", marginBottom: 3 }}>{q.topic || ""}</div>
                  <div style={{ font: `600 14px ${sans}`, color: T.ink, marginBottom: 6 }}>{i + 1}. {q.q}</div>
                  <div style={{ font: `13px/1.5 ${sans}`, color: T.faint, marginBottom: 6 }}>{q.promptText}</div>
                  {q.imageData && <img src={q.imageData} style={{ maxWidth: "100%", borderRadius: 9, border: `1px solid ${T.line}`, marginBottom: 8, display: "block" }} />}
                  <div style={{ font: `14px/1.6 ${sans}`, color: T.ink, whiteSpace: "pre-wrap", background: T.cardAlt, border: `1px solid ${T.line}`, borderRadius: 9, padding: 10, marginBottom: 8 }}>{grading.answers[i] || "Ученик не дал ответа."}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ font: `12px ${sans}`, color: T.faint }}>Баллы:</span>
                    <input type="number" min={0} max={q.maxPoints} value={gradeInputs[i] ?? ""} onChange={(e) => setGradeInputs({ ...gradeInputs, [i]: e.target.value })} style={{ width: 60, padding: "5px 8px", borderRadius: 7, border: `1px solid ${T.lineDk}` }} />
                    <span style={{ font: `12px ${sans}`, color: T.faint }}>из {q.maxPoints}</span>
                  </div>
                </div>
              );
            })}
            <button style={btn} onClick={saveGrades}>Сохранить баллы</button>
          </div>
        )}
      </Modal>

      {/* ---------- назначение тегов уже созданному пробнику ---------- */}
      <Modal open={!!tagging} onClose={() => setTagging(null)} title={tagging ? `Теги: ${tagging.title}` : ""}>
        {tagging && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {tags.length === 0 && <div style={{ font: `13px ${sans}`, color: T.faint }}>Тегов ещё нет — создайте их через кнопку «Теги» в списке пробников.</div>}
            {tags.map((t) => {
              const current = tagging.tagIds || [];
              const on = current.includes(t.id);
              const toggle = async () => {
                const next = on ? current.filter((x) => x !== t.id) : [...current, t.id];
                await updateItem("mocks", tagging.id, { tagIds: next });
                setTagging({ ...tagging, tagIds: next });
              };
              return (
                <button key={t.id} onClick={toggle} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 8, border: `1.5px solid ${on ? t.color : T.line}`, background: on ? T.accentSoft : T.cardAlt, font: `600 12.5px ${sans}`, color: T.ink }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: t.color }} />{t.name}
                </button>
              );
            })}
          </div>
        )}
      </Modal>

      {/* ---------- менеджер тегов пробников (отдельно от библиотеки и домашки) ---------- */}
      <Modal open={tagManager} onClose={() => setTagManager(false)} title="Теги пробников" wide>
        <MockTagManager tags={tags} tutorId={profile.uid} />
      </Modal>
    </div>
  );
}

function MockTagManager({ tags, tutorId }) {
  const [name, setName] = useState("");
  const [colorIdx, setColorIdx] = useState(0);
  const addTag = async () => {
    if (!name.trim()) return;
    await addItem("mockTags", { name: name.trim(), color: TAG_PALETTE[colorIdx], tutorId });
    setName(""); setColorIdx(0);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ font: `13px ${sans}`, color: T.faint }}>Эти теги отдельные от тегов библиотеки и домашки — только для пробников.</div>
      {tags.map((t) => (
        <div key={t.id} style={{ padding: "10px 0", borderBottom: `1px solid ${T.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ width: 16, height: 16, borderRadius: "50%", background: t.color, flexShrink: 0 }} />
            <input style={input} defaultValue={t.name} onBlur={(e) => { if (e.target.value.trim() && e.target.value !== t.name) updateItem("mockTags", t.id, { name: e.target.value.trim() }); }} />
            <button onClick={() => removeItem("mockTags", t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: T.faint }}><Trash2 size={15} /></button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {TAG_PALETTE.map((c) => (
              <button key={c} onClick={() => updateItem("mockTags", t.id, { color: c })} style={{ width: 20, height: 20, borderRadius: "50%", background: c, border: `2px solid ${t.color === c ? T.ink : "transparent"}`, cursor: "pointer" }} />
            ))}
          </div>
        </div>
      ))}
      <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 14 }}>
        <div style={{ font: `600 13px ${sans}`, color: T.ink, marginBottom: 8 }}>Новый тег</div>
        <input style={{ ...input, marginBottom: 10 }} placeholder="Название тега" value={name} onChange={(e) => setName(e.target.value)} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {TAG_PALETTE.map((c, i) => (
            <button key={c} onClick={() => setColorIdx(i)} style={{ width: 26, height: 26, borderRadius: "50%", background: c, border: `2px solid ${colorIdx === i ? T.ink : "transparent"}`, cursor: "pointer" }} />
          ))}
        </div>
        <button style={{ ...btn, padding: "8px 13px" }} onClick={addTag}><Plus size={15} />Добавить тег</button>
      </div>
    </div>
  );
}
