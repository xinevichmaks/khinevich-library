import { useState } from "react";
import { Plus, CheckCircle2, Circle, BadgeCheck, AlertCircle, RotateCcw, Trash2, Eye, ListChecks, Check, X, Search, Settings2, Tag, Repeat, Edit3 } from "lucide-react";
import { Card, Modal, T, sans, btn, btnGhost, iconBtn, input, chip, TAG_PALETTE } from "../ui.jsx";
import { DatePicker, fmtDateRu } from "../calendar.jsx";
import { useAuth } from "../auth.jsx";
import { useCol, addItem, updateItem, removeItem, notify } from "../useDB.js";

// Статусы, которые репетитор может выбирать сам — видны всем ролям
export const HW_STATUSES = ["Выдана", "Выполнена", "Требует проверки", "Проверена", "Требует доработки", "Не выполнена"];
const STATUS_COLOR = {
  "Выдана": T.line, "Выполнена": T.accentSoft, "Требует проверки": "#e0c48a", "Проверена": "#cfe0cf",
  "Требует доработки": "#f0d9a6", "Не выполнена": "#e7c6c1",
};
const STATUS_ICON = { "Проверена": BadgeCheck, "Выполнена": CheckCircle2, "Требует проверки": Eye, "Требует доработки": RotateCcw, "Не выполнена": AlertCircle };

export default function Homework() {
  const { profile, role } = useAuth();
  const isStaff = role === "tutor" || role === "admin";
  const sid = role === "student" ? profile.uid : role === "parent" ? profile.childId : null;
  const { items: users } = useCol("users");
  const { items: homework } = useCol("homework");
  const { items: materials } = useCol("materials");
  const { items: allTags } = useCol("hwTags");
  const students = users.filter((u) => u.role === "student" && (role === "admin" || u.tutorId === profile.uid));
  const myTutorId = isStaff ? profile.uid : users.find((u) => u.id === sid)?.tutorId;
  const tags = isStaff ? allTags.filter((t) => t.tutorId === profile.uid) : allTags.filter((t) => t.tutorId === myTutorId);
  const [add, setAdd] = useState(false);
  const [editingHw, setEditingHw] = useState(null); // домашка, которую редактируем (или null — режим создания)
  const [targetIds, setTargetIds] = useState(new Set());
  const [form, setForm] = useState({ title: "", desc: "", due: "", materialId: "", tagIds: [] });
  const [qs, setQs] = useState([]); // автопроверяемые вопросы для новой домашки
  const [q, setQ] = useState(""); // поиск
  const [filterTag, setFilterTag] = useState(null);
  const [tagManager, setTagManager] = useState(false);
  const [tagging, setTagging] = useState(null); // домашка, которой сейчас назначаем теги
  const [reassigning, setReassigning] = useState(null); // домашка, которую переназначаем
  const [reassignIds, setReassignIds] = useState(new Set());
  const [reassignDue, setReassignDue] = useState("");

  const [doingText, setDoingText] = useState(null); // домашка без вопросов — текстовая сдача
  const [submissionText, setSubmissionText] = useState("");
  const [doingQuiz, setDoingQuiz] = useState(null); // домашка с вопросами — прохождение
  const [answers, setAnswers] = useState({});
  const [viewing, setViewing] = useState(null); // просмотр текстовой сдачи (репетитор)
  const [review, setReview] = useState(null); // разбор ответов на вопросы (обе роли)
  const [grading, setGrading] = useState(null); // домашка на ручной проверке (репетитор)
  const [gradePoints, setGradePoints] = useState({});

  const scoped = sid
    ? homework.filter((h) => h.studentId === sid)
    : (role === "admin" ? homework : homework.filter((h) => h.tutorId === profile.uid));
  const list = scoped.filter((h) =>
    (h.title + " " + (h.desc || "") + " " + (h.studentName || "")).toLowerCase().includes(q.toLowerCase()) &&
    (!filterTag || (h.tagIds || []).includes(filterTag))
  );
  const tagById = (id) => allTags.find((t) => t.id === id);

  const toggleTarget = (id) => setTargetIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const addQ = () => setQs([...qs, { q: "", opts: ["", "", "", ""], correct: 0, topic: "" }]);
  const updQ = (i, patch) => setQs(qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  const updOpt = (i, j, v) => setQs(qs.map((q, idx) => (idx === i ? { ...q, opts: q.opts.map((o, oi) => (oi === j ? v : o)) } : q)));

  const save = async () => {
    if (!form.title) return;
    const cleanQs = qs.filter((q) => q.q.trim());
    if (editingHw) {
      await updateItem("homework", editingHw.id, { ...form, ...(cleanQs.length ? { questions: cleanQs } : {}) });
      setEditingHw(null); setAdd(false); setForm({ title: "", desc: "", due: "", materialId: "", tagIds: [] }); setQs([]);
      return;
    }
    if (targetIds.size === 0) return;
    await Promise.all([...targetIds].map(async (studentId) => {
      const st = users.find((u) => u.id === studentId);
      await addItem("homework", { ...form, studentId, studentName: st?.name || "", tutorId: profile.uid, status: "Выдана", ...(cleanQs.length ? { questions: cleanQs } : {}) });
      await notify(studentId, st?.name || "", `Новое домашнее задание: «${form.title}»`, "new_homework");
    }));
    setAdd(false); setForm({ title: "", desc: "", due: "", materialId: "", tagIds: [] }); setQs([]); setTargetIds(new Set());
  };

  const openEdit = (h) => {
    setEditingHw(h);
    setForm({ title: h.title, desc: h.desc || "", due: h.due || "", materialId: h.materialId || "", tagIds: h.tagIds || [] });
    setQs(h.questions || []);
    setAdd(true);
  };

  const submitText = async () => {
    if (!doingText) return;
    await updateItem("homework", doingText.id, { status: "Выполнена", submission: submissionText, submittedAt: Date.now() });
    await notify(doingText.studentId, doingText.studentName, `${doingText.studentName} выполнил(а) задание «${doingText.title}»`, "homework_done");
    setDoingText(null); setSubmissionText("");
  };

  const submitQuiz = async () => {
    if (!doingQuiz) return;
    const hasGraph = doingQuiz.questions.some((qq) => qq.type === "graph");
    let score = 0, total = 0;
    doingQuiz.questions.forEach((qq, i) => {
      if (qq.type === "graph") return; // считается вручную репетитором
      total++;
      if (answers[i] === qq.correct) score++;
    });
    await updateItem("homework", doingQuiz.id, {
      status: hasGraph ? "Требует проверки" : "Проверена",
      ...(hasGraph ? {} : { due: null }),
      answers: doingQuiz.questions.map((_, i) => answers[i] ?? (doingQuiz.questions[i].type === "graph" ? "" : -1)),
      score, total, submission: submissionText, submittedAt: Date.now(),
    });
    await notify(doingQuiz.studentId, doingQuiz.studentName, `${doingQuiz.studentName} выполнил(а) задание «${doingQuiz.title}»${hasGraph ? " — ожидает проверки" : ` — ${score}/${total}`}`, "homework_done");
    setDoingQuiz(null); setAnswers({}); setSubmissionText("");
  };

  const saveManualGrade = async () => {
    if (!grading) return;
    let manualTotal = 0, manualScore = 0;
    grading.questions.forEach((qq, i) => {
      if (qq.type !== "graph") return;
      manualTotal += qq.maxPoints || 0;
      manualScore += Number(gradePoints[i]) || 0;
    });
    const mcScore = grading.score || 0, mcTotal = grading.total || 0;
    await updateItem("homework", grading.id, {
      status: "Проверена", manualScores: gradePoints, due: null,
      score: mcScore + manualScore, total: mcTotal + manualTotal,
    });
    await notify(grading.studentId, grading.studentName, `Домашнее задание проверено: «${grading.title}» — ${mcScore + manualScore}/${mcTotal + manualTotal}`, "homework_checked");
    setGrading(null); setGradePoints({});
  };

  const doReassign = async () => {
    if (!reassigning || reassignIds.size === 0) return;
    const { id, createdAt, studentId, studentName, status, score, total, answers, submission, submittedAt, grade, manualScores, due, ...rest } = reassigning;
    await Promise.all([...reassignIds].map(async (sid2) => {
      const st = users.find((u) => u.id === sid2);
      await addItem("homework", { ...rest, due: reassignDue || null, studentId: sid2, studentName: st?.name || "", tutorId: profile.uid, status: "Выдана" });
      await notify(sid2, st?.name || "", `Новое домашнее задание: «${reassigning.title}»`, "new_homework");
    }));
    setReassigning(null); setReassignIds(new Set()); setReassignDue("");
  };
  const toggleReassign = (id) => setReassignIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div>
      {isStaff && <div style={{ marginBottom: 16, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button style={btn} onClick={() => { setEditingHw(null); setForm({ title: "", desc: "", due: "", materialId: "", tagIds: [] }); setQs([]); setAdd(true); }}><Plus size={16} />Выдать домашку</button>
        <button style={btnGhost} onClick={() => setTagManager(true)}><Settings2 size={16} />Теги</button>
      </div>}

      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search size={17} color={T.faint} style={{ position: "absolute", left: 12, top: 11 }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по домашним заданиям…" style={{ ...input, paddingLeft: 38 }} />
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

      {(() => {
        const renderCard = (h) => {
          const mat = materials.find((m) => m.id === h.materialId);
          const Icon = STATUS_ICON[h.status] || Circle;
          const hasQuiz = h.questions && h.questions.length > 0;
          const alreadyAnswered = Array.isArray(h.answers);
          const hTags = (h.tagIds || []).map(tagById).filter(Boolean);
          return (
            <Card key={h.id} style={{ padding: 16, display: "flex", gap: 14, alignItems: "flex-start" }}>
              <Icon size={26} color={h.status === "Выдана" ? T.faint : T.soft} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ font: `600 15px ${sans}`, color: T.ink }}>{h.title}</div>
                  {hasQuiz && <span style={chip}><ListChecks size={11} style={{ verticalAlign: -1, marginRight: 3 }} />{h.questions.length} вопр.</span>}
                  {alreadyAnswered && <span style={chip}>{h.score}/{h.total} верно</span>}
                  {h.grade && <span style={chip}>Оценка: {h.grade}</span>}
                </div>
                {hTags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                    {hTags.map((t) => (
                      <span key={t.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, font: `11px ${sans}`, color: T.faint }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: t.color }} />{t.name}</span>
                    ))}
                  </div>
                )}
                {isStaff && <div style={{ font: `12px ${sans}`, color: T.faint, marginTop: 2 }}>{h.studentName}</div>}
                {h.desc && <div style={{ font: `14px/1.5 ${sans}`, color: T.soft, marginTop: 6 }}>{h.desc}</div>}
                <div style={{ font: `12px ${sans}`, color: T.faint, marginTop: 6 }}>{h.due ? `срок: ${fmtDateRu(h.due)}` : "без срока (архив)"}{mat ? ` · материал: ${mat.title}` : ""}</div>

                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                  {isStaff ? (
                    <select value={h.status} onChange={async (e) => {
                      const val = e.target.value;
                      await updateItem("homework", h.id, { status: val, ...(val === "Проверена" ? { due: null } : {}) });
                      if (val === "Проверена") await notify(h.studentId, h.studentName, `Домашнее задание проверено: «${h.title}»`, "homework_checked");
                    }}
                      style={{ ...chip, background: STATUS_COLOR[h.status] || T.line, color: T.ink, border: "none", cursor: "pointer", padding: "5px 10px", font: `600 12px ${sans}` }}>
                      {HW_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <span style={{ ...chip, background: STATUS_COLOR[h.status], color: T.ink }}>{h.status}</span>
                  )}

                  {role === "student" && hasQuiz && (h.status === "Выдана" || h.status === "Требует доработки") &&
                    <button style={btn} onClick={() => { setDoingQuiz(h); setAnswers({}); setSubmissionText(h.submission || ""); }}>{h.status === "Требует доработки" ? "Пройти заново" : "Пройти задание"}</button>}
                  {role === "student" && !hasQuiz && h.status === "Выдана" && <button style={btn} onClick={() => { setDoingText(h); setSubmissionText(""); }}>Отметить выполненной</button>}
                  {role === "student" && !hasQuiz && h.status === "Требует доработки" && <button style={btn} onClick={() => { setDoingText(h); setSubmissionText(h.submission || ""); }}>Сдать заново</button>}

                  {alreadyAnswered && <button style={{ ...btnGhost, padding: "8px 11px" }} onClick={() => setReview(h)}><ListChecks size={15} />Разбор ответов</button>}
                  {isStaff && h.submission && <button style={{ ...btnGhost, padding: "8px 11px" }} onClick={() => setViewing(h)}><Eye size={15} />Как выполнил</button>}

                  {isStaff && !hasQuiz && (h.status === "Выполнена" || h.status === "Требует доработки") && <>
                    <input style={{ ...input, width: 90, padding: "7px 10px" }} placeholder="Оценка" id={`g-${h.id}`} defaultValue={h.grade || ""} />
                    <button style={btn} onClick={async () => { const v = document.getElementById(`g-${h.id}`).value; await updateItem("homework", h.id, { status: "Проверена", grade: v || "—", due: null }); await notify(h.studentId, h.studentName, `Домашнее задание проверено: «${h.title}» — оценка ${v || "—"}`, "homework_checked"); }}>Принять</button>
                  </>}
                  {isStaff && h.status === "Требует проверки" && <button style={btn} onClick={() => { setGrading(h); setGradePoints(h.manualScores || {}); }}>✍️ Проверить вручную</button>}
                  {isStaff && <button title="Теги" style={{ ...iconBtn, border: `1px solid ${T.line}` }} onClick={() => setTagging(h)}><Tag size={15} /></button>}
                  {isStaff && <button title="Просмотреть и редактировать" style={{ ...btnGhost, padding: "8px 11px" }} onClick={() => openEdit(h)}><Edit3 size={15} />Редактировать</button>}
                  {isStaff && <button title="Задать ещё раз или другим ученикам" style={{ ...btnGhost, padding: "8px 11px" }} onClick={() => { setReassigning(h); setReassignIds(new Set([h.studentId])); setReassignDue(""); }}><Repeat size={15} />Задать ещё</button>}
                  {isStaff && <button style={{ ...btnGhost, padding: "8px 11px" }} onClick={() => removeItem("homework", h.id)}><Trash2 size={15} /></button>}
                </div>
              </div>
            </Card>
          );
        };

        const needsReview = list.filter((h) => h.status === "Требует проверки");
        const archived = list.filter((h) => h.status === "Проверена");
        const active = list.filter((h) => h.status !== "Требует проверки" && h.status !== "Проверена");

        const Section = ({ title, items, empty }) => items.length === 0 && !empty ? null : (
          <div style={{ marginBottom: 26 }}>
            <div style={{ font: `600 13px ${sans}`, color: T.faint, textTransform: "uppercase", letterSpacing: ".03em", marginBottom: 10 }}>{title} {items.length > 0 && `(${items.length})`}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {items.length > 0 ? items.map(renderCard) : <div style={{ color: T.faint, font: `14px ${sans}`, padding: 16 }}>Пусто.</div>}
            </div>
          </div>
        );

        if (!isStaff) {
          // ученик/родитель: активные сверху, архив — внизу отдельным блоком
          const activeStudent = list.filter((h) => h.status !== "Проверена");
          const archivedStudent = list.filter((h) => h.status === "Проверена");
          return (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: activeStudent.length ? 0 : 20 }}>
                {activeStudent.length > 0 ? activeStudent.map(renderCard) : <div style={{ color: T.faint, font: `14px ${sans}`, padding: 24 }}>Активных домашних заданий нет.</div>}
              </div>
              {archivedStudent.length > 0 && <Section title="Архив (решённые)" items={archivedStudent} empty />}
            </>
          );
        }

        return (
          <>
            <Section title="Требуют проверки" items={needsReview} empty={list.length === 0} />
            <Section title="Активные" items={active} empty={list.length === 0} />
            <Section title="Архив (решённые)" items={archived} empty={list.length === 0} />
          </>
        );
      })()}

      {/* ---------- создание домашки ---------- */}
      <Modal open={add} onClose={() => { setAdd(false); setEditingHw(null); }} title={editingHw ? `Редактировать: ${editingHw.title}` : "Новая домашка"} wide>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {editingHw ? (
            <div style={{ font: `13px ${sans}`, color: T.faint }}>Ученик: <b style={{ color: T.ink }}>{editingHw.studentName}</b> (чтобы назначить другим — используйте «Задать ещё»)</div>
          ) : (
            <div>
              <div style={{ font: `12px ${sans}`, color: T.faint, marginBottom: 8 }}>Кому выдать (можно выбрать нескольких)</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {students.map((s) => {
                  const on = targetIds.has(s.id);
                  return <button key={s.id} onClick={() => toggleTarget(s.id)} style={{ padding: "7px 12px", borderRadius: 8, border: `1.5px solid ${on ? T.accent : T.line}`, background: on ? T.accentSoft : T.cardAlt, font: `600 12.5px ${sans}`, color: T.ink, cursor: "pointer" }}>{s.name}</button>;
                })}
              </div>
            </div>
          )}
          <input style={input} placeholder="Задание" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea style={{ ...input, minHeight: 90, resize: "vertical" }} placeholder="Описание / что сделать" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} />
          <div style={{ display: "flex", gap: 10 }}>
            <DatePicker value={form.due} onChange={(d) => setForm({ ...form, due: d })} placeholder="Срок сдачи" />
            <select style={input} value={form.materialId} onChange={(e) => setForm({ ...form, materialId: e.target.value })}>
              <option value="">— материал (необяз.) —</option>
              {materials.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
          </div>
          {tags.length > 0 && (
            <div>
              <div style={{ font: `12px ${sans}`, color: T.faint, marginBottom: 8 }}>Теги</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {tags.map((t) => {
                  const on = form.tagIds.includes(t.id);
                  const toggle = () => setForm({ ...form, tagIds: on ? form.tagIds.filter((x) => x !== t.id) : [...form.tagIds, t.id] });
                  return (
                    <button key={t.id} onClick={toggle} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 8, border: `1.5px solid ${on ? t.color : T.line}`, background: on ? T.accentSoft : T.cardAlt, font: `600 12.5px ${sans}`, color: T.ink }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: t.color }} />{t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 12 }}>
            <div style={{ font: `600 13px ${sans}`, color: T.ink, marginBottom: 4 }}>Вопросы теста (автопроверка, необязательно)</div>
            <div style={{ font: `12px ${sans}`, color: T.faint, marginBottom: 10 }}>Если добавить вопросы, ученик пройдёт их как тест — результат посчитается сам, а статус станет «Проверена» автоматически. Тема вопроса используется для «Слабых мест».</div>
            {qs.map((q, i) => (
              <Card key={i} style={{ padding: 14, background: T.cardAlt, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={chip}>Вопрос №{i + 1}</span>
                  <button style={{ background: "none", border: "none", cursor: "pointer", color: T.faint }} onClick={() => setQs(qs.filter((_, idx) => idx !== i))}><Trash2 size={15} /></button>
                </div>
                <input style={{ ...input, marginBottom: 8 }} placeholder="Текст вопроса" value={q.q} onChange={(e) => updQ(i, { q: e.target.value })} />
                <input style={{ ...input, marginBottom: 8 }} placeholder="Тема (для слабых мест, напр. «Формулы приведения»)" value={q.topic} onChange={(e) => updQ(i, { topic: e.target.value })} />
                {q.opts.map((o, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <input type="radio" name={`c${i}`} checked={q.correct === j} onChange={() => updQ(i, { correct: j })} title="Верный ответ" />
                    <input style={input} placeholder={`Вариант ${j + 1}`} value={o} onChange={(e) => updOpt(i, j, e.target.value)} />
                    {q.opts.length > 2 && <button title="Удалить вариант" style={{ background: "none", border: "none", cursor: "pointer", color: T.faint }} onClick={() => setQs(qs.map((qq, idx) => idx === i ? { ...qq, opts: qq.opts.filter((_, oi) => oi !== j), correct: qq.correct === j ? 0 : qq.correct > j ? qq.correct - 1 : qq.correct } : qq))}><X size={14} /></button>}
                  </div>
                ))}
                {q.opts.length < 10 && <button style={{ ...btnGhost, padding: "6px 11px", font: `12px ${sans}` }} onClick={() => setQs(qs.map((qq, idx) => idx === i ? { ...qq, opts: [...qq.opts, ""] } : qq))}><Plus size={13} />Ещё вариант ({q.opts.length}/10)</button>}
                <div style={{ font: `12px ${sans}`, color: T.faint, marginTop: 6 }}>Отметьте кружком верный вариант.</div>
              </Card>
            ))}
            <button style={btnGhost} onClick={addQ}><Plus size={15} />Добавить вопрос</button>
          </div>

          <button style={btn} onClick={save}>{editingHw ? "Сохранить изменения" : "Выдать"}</button>
        </div>
      </Modal>

      {/* ---------- ученик сдаёт текстовую домашку ---------- */}
      <Modal open={!!doingText} onClose={() => setDoingText(null)} title="Как вы выполнили задание?">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ font: `13px ${sans}`, color: T.faint }}>Опишите, что сделали, вставьте ссылку на файл/фото решения или ответ — репетитор увидит это при проверке.</div>
          <textarea style={{ ...input, minHeight: 120, resize: "vertical" }} placeholder="Например: решил все задачи, файл тут: …" value={submissionText} onChange={(e) => setSubmissionText(e.target.value)} />
          <button style={btn} onClick={submitText}>Отправить на проверку</button>
        </div>
      </Modal>

      {/* ---------- ученик проходит вопросы (автопроверка) ---------- */}
      <Modal open={!!doingQuiz} onClose={() => setDoingQuiz(null)} title={doingQuiz?.title} wide>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {doingQuiz?.questions.map((qq, i) => (
            <div key={i}>
              <div style={{ font: `600 15px ${sans}`, color: T.ink, marginBottom: 10 }}>{i + 1}. {qq.q}</div>
              {qq.type === "graph" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {qq.promptText && <div style={{ font: `14px/1.6 ${sans}`, color: T.soft, background: T.cardAlt, border: `1px solid ${T.line}`, borderRadius: 9, padding: 12, whiteSpace: "pre-wrap" }}>{qq.promptText}</div>}
                  {qq.imageData && <img src={qq.imageData} alt="" style={{ maxWidth: "100%", borderRadius: 9, border: `1px solid ${T.line}` }} />}
                  <textarea style={{ ...input, minHeight: 110, resize: "vertical" }} placeholder="Развёрнутый ответ" value={answers[i] || ""} onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })} />
                  <div style={{ font: `11.5px ${sans}`, color: T.faint }}>Максимум {qq.maxPoints ?? 3} балла — проверит репетитор вручную.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {qq.opts.map((o, j) => {
                    const chosen = answers[i] === j;
                    return (
                      <button key={j} onClick={() => setAnswers({ ...answers, [i]: j })}
                        style={{ textAlign: "left", padding: "11px 14px", borderRadius: 9, cursor: "pointer", border: `1.5px solid ${chosen ? T.accent : T.line}`, background: chosen ? T.accentSoft : T.cardAlt, font: `14px ${sans}`, color: T.ink }}>{o || `Вариант ${j + 1}`}</button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          <textarea style={{ ...input, minHeight: 70, resize: "vertical" }} placeholder="Комментарий репетитору (необязательно)" value={submissionText} onChange={(e) => setSubmissionText(e.target.value)} />
          <button style={btn} onClick={submitQuiz}>Завершить и отправить{doingQuiz?.questions.some((qq) => qq.type === "graph") ? "" : " — проверится автоматически"}</button>
        </div>
      </Modal>

      {/* ---------- репетитор проверяет вручную (графиковые вопросы) ---------- */}
      <Modal open={!!grading} onClose={() => setGrading(null)} title={grading ? `Проверка: ${grading.title}` : ""} wide>
        {grading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ font: `13px ${sans}`, color: T.faint }}>{grading.studentName}</div>
            {grading.questions.map((qq, i) => {
              if (qq.type !== "graph") return null;
              const given = grading.answers?.[i];
              return (
                <div key={i} style={{ borderTop: `1px solid ${T.line}`, paddingTop: 12 }}>
                  <div style={{ font: `600 14px ${sans}`, color: T.ink, marginBottom: 8 }}>{i + 1}. {qq.q}</div>
                  {qq.promptText && <div style={{ font: `13px/1.6 ${sans}`, color: T.faint, marginBottom: 8, whiteSpace: "pre-wrap" }}>{qq.promptText}</div>}
                  {qq.imageData && <img src={qq.imageData} alt="" style={{ maxWidth: "100%", borderRadius: 9, marginBottom: 8 }} />}
                  <div style={{ font: `14px/1.6 ${sans}`, color: T.ink, background: T.cardAlt, border: `1px solid ${T.line}`, borderRadius: 9, padding: 12, whiteSpace: "pre-wrap", marginBottom: 8 }}>{given || "Ученик не дал ответ."}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ font: `13px ${sans}`, color: T.faint }}>Баллы (максимум {qq.maxPoints ?? 3}):</span>
                    <input type="number" min="0" max={qq.maxPoints ?? 3} style={{ ...input, width: 70, padding: "7px 10px" }} value={gradePoints[i] ?? ""} onChange={(e) => setGradePoints({ ...gradePoints, [i]: e.target.value })} />
                  </div>
                </div>
              );
            })}
            <button style={btn} onClick={saveManualGrade}>Сохранить проверку</button>
          </div>
        )}
      </Modal>

      {/* ---------- репетитор смотрит текстовую сдачу ---------- */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing ? `Выполнение: ${viewing.title}` : ""}>
        {viewing && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ font: `12px ${sans}`, color: T.faint }}>{viewing.studentName}{viewing.submittedAt ? ` · ${new Date(viewing.submittedAt).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}</div>
            <div style={{ font: `14px/1.6 ${sans}`, color: T.ink, whiteSpace: "pre-wrap", padding: 12, background: T.cardAlt, borderRadius: 9, border: `1px solid ${T.line}` }}>{viewing.submission || "Ученик не оставил описания."}</div>
          </div>
        )}
      </Modal>

      {/* ---------- разбор ответов — видят и репетитор, и ученик ---------- */}
      <Modal open={!!review} onClose={() => setReview(null)} title="Разбор ответов" wide>
        {review && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ font: `15px ${sans}`, color: T.soft }}>Результат: <b style={{ color: T.ink }}>{review.score}/{review.total}</b>{role === "tutor" ? ` · ${review.studentName}` : ""}</div>
            {review.questions.map((qq, i) => {
              const given = review.answers[i];
              if (qq.type === "graph") {
                return (
                  <div key={i} style={{ borderTop: `1px solid ${T.line}`, paddingTop: 12 }}>
                    <div style={{ font: `600 14px ${sans}`, color: T.ink, marginBottom: 6 }}>{i + 1}. {qq.q}</div>
                    <div style={{ font: `14px/1.6 ${sans}`, color: T.soft, whiteSpace: "pre-wrap" }}>Ответ: {given || "—"}</div>
                    <div style={{ font: `12px ${sans}`, color: T.faint, marginTop: 4 }}>Баллы: {review.manualScores?.[i] ?? "не проверено"} из {qq.maxPoints ?? 3}</div>
                  </div>
                );
              }
              const ok = given === qq.correct;
              return (
                <div key={i} style={{ borderTop: `1px solid ${T.line}`, paddingTop: 12 }}>
                  <div style={{ font: `600 14px ${sans}`, color: T.ink, marginBottom: 6 }}>{i + 1}. {qq.q}</div>
                  <div style={{ font: `14px ${sans}`, color: T.soft, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>Ответ: {qq.opts[given] ?? "—"} {ok ? <Check size={15} color="#3f7a4d" /> : <X size={15} color="#a23b2d" />}</div>
                    {!ok && <div>Правильный ответ: {qq.opts[qq.correct]}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>
      {/* ---------- задать ещё раз / другим ученикам ---------- */}
      <Modal open={!!reassigning} onClose={() => setReassigning(null)} title={reassigning ? `Задать ещё: «${reassigning.title}»` : ""}>
        {reassigning && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ font: `13px ${sans}`, color: T.faint }}>Выберите, кому назначить это задание заново — можно тому же ученику (повторить попытку) и/или другим. Будет создана новая копия со статусом «Выдана», старая история сохранится.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {students.map((s) => {
                const on = reassignIds.has(s.id);
                const isOriginal = s.id === reassigning.studentId;
                return (
                  <button key={s.id} onClick={() => toggleReassign(s.id)} style={{ padding: "7px 12px", borderRadius: 8, border: `1.5px solid ${on ? T.accent : T.line}`, background: on ? T.accentSoft : T.cardAlt, font: `600 12.5px ${sans}`, color: T.ink, cursor: "pointer" }}>
                    {s.name}{isOriginal ? " (уже был выдан)" : ""}
                  </button>
                );
              })}
            </div>
            <div>
              <div style={{ font: `12px ${sans}`, color: T.faint, marginBottom: 6 }}>Новый срок сдачи</div>
              <DatePicker value={reassignDue} onChange={setReassignDue} />
            </div>
            <button style={btn} onClick={doReassign}>Назначить выбранным ({reassignIds.size})</button>
          </div>
        )}
      </Modal>

      {/* ---------- назначение тегов уже выданной домашке ---------- */}
      <Modal open={!!tagging} onClose={() => setTagging(null)} title={tagging ? `Теги: ${tagging.title}` : ""}>
        {tagging && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {tags.length === 0 && <div style={{ font: `13px ${sans}`, color: T.faint }}>Тегов ещё нет — создайте их через кнопку «Теги» в списке домашних заданий.</div>}
              {tags.map((t) => {
                const current = tagging.tagIds || [];
                const on = current.includes(t.id);
                const toggle = async () => {
                  const next = on ? current.filter((x) => x !== t.id) : [...current, t.id];
                  await updateItem("homework", tagging.id, { tagIds: next });
                  setTagging({ ...tagging, tagIds: next });
                };
                return (
                  <button key={t.id} onClick={toggle} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 8, border: `1.5px solid ${on ? t.color : T.line}`, background: on ? T.accentSoft : T.cardAlt, font: `600 12.5px ${sans}`, color: T.ink }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: t.color }} />{t.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      {/* ---------- менеджер тегов домашки (отдельно от тегов библиотеки) ---------- */}
      <Modal open={tagManager} onClose={() => setTagManager(false)} title="Теги домашних заданий" wide>
        <HwTagManager tags={tags} tutorId={profile.uid} />
      </Modal>
    </div>
  );
}

function HwTagManager({ tags, tutorId }) {
  const [name, setName] = useState("");
  const [colorIdx, setColorIdx] = useState(0);
  const addTag = async () => {
    if (!name.trim()) return;
    await addItem("hwTags", { name: name.trim(), color: TAG_PALETTE[colorIdx], tutorId });
    setName(""); setColorIdx(0);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ font: `13px ${sans}`, color: T.faint }}>Эти теги отдельные от тегов библиотеки — используются только для домашних заданий (например, по темам или срокам).</div>
      {tags.map((t) => (
        <div key={t.id} style={{ padding: "10px 0", borderBottom: `1px solid ${T.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ width: 16, height: 16, borderRadius: "50%", background: t.color, flexShrink: 0 }} />
            <input style={input} defaultValue={t.name} onBlur={(e) => { if (e.target.value.trim() && e.target.value !== t.name) updateItem("hwTags", t.id, { name: e.target.value.trim() }); }} />
            <button onClick={() => removeItem("hwTags", t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: T.faint }}><Trash2 size={15} /></button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {TAG_PALETTE.map((c) => (
              <button key={c} onClick={() => updateItem("hwTags", t.id, { color: c })} style={{ width: 20, height: 20, borderRadius: "50%", background: c, border: `2px solid ${t.color === c ? T.ink : "transparent"}`, cursor: "pointer" }} />
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
