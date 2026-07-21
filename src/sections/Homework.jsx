import { useState } from "react";
import { Plus, CheckCircle2, Circle, BadgeCheck, AlertCircle, RotateCcw, Trash2, Eye, ListChecks, Check, X, Search } from "lucide-react";
import { Card, Modal, T, sans, btn, btnGhost, input, chip } from "../ui.jsx";
import { useAuth } from "../auth.jsx";
import { useCol, addItem, updateItem, removeItem } from "../useDB.js";

// Статусы, которые репетитор может выбирать сам — видны всем ролям
export const HW_STATUSES = ["Выдана", "Выполнена", "Проверена", "Требует доработки", "Не выполнена"];
const STATUS_COLOR = {
  "Выдана": T.line, "Выполнена": T.accentSoft, "Проверена": "#cfe0cf",
  "Требует доработки": "#f0d9a6", "Не выполнена": "#e7c6c1",
};
const STATUS_ICON = { "Проверена": BadgeCheck, "Выполнена": CheckCircle2, "Требует доработки": RotateCcw, "Не выполнена": AlertCircle };

export default function Homework() {
  const { profile, role } = useAuth();
  const sid = role === "student" ? profile.uid : role === "parent" ? profile.childId : null;
  const { items: users } = useCol("users");
  const { items: homework } = useCol("homework");
  const { items: materials } = useCol("materials");
  const { items: tags } = useCol("tags");
  const students = users.filter((u) => u.role === "student");
  const [add, setAdd] = useState(false);
  const [targetIds, setTargetIds] = useState(new Set());
  const [form, setForm] = useState({ title: "", desc: "", due: "", materialId: "", tagIds: [] });
  const [qs, setQs] = useState([]); // автопроверяемые вопросы для новой домашки
  const [q, setQ] = useState(""); // поиск
  const [filterTag, setFilterTag] = useState(null);

  const [doingText, setDoingText] = useState(null); // домашка без вопросов — текстовая сдача
  const [submissionText, setSubmissionText] = useState("");
  const [doingQuiz, setDoingQuiz] = useState(null); // домашка с вопросами — прохождение
  const [answers, setAnswers] = useState({});
  const [viewing, setViewing] = useState(null); // просмотр текстовой сдачи (репетитор)
  const [review, setReview] = useState(null); // разбор ответов на вопросы (обе роли)

  const scoped = sid ? homework.filter((h) => h.studentId === sid) : homework;
  const list = scoped.filter((h) =>
    (h.title + " " + (h.desc || "") + " " + (h.studentName || "")).toLowerCase().includes(q.toLowerCase()) &&
    (!filterTag || (h.tagIds || []).includes(filterTag))
  );
  const tagById = (id) => tags.find((t) => t.id === id);

  const toggleTarget = (id) => setTargetIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const addQ = () => setQs([...qs, { q: "", opts: ["", "", "", ""], correct: 0, topic: "" }]);
  const updQ = (i, patch) => setQs(qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  const updOpt = (i, j, v) => setQs(qs.map((q, idx) => (idx === i ? { ...q, opts: q.opts.map((o, oi) => (oi === j ? v : o)) } : q)));

  const save = async () => {
    if (!form.title || targetIds.size === 0) return;
    const cleanQs = qs.filter((q) => q.q.trim());
    await Promise.all([...targetIds].map((studentId) => {
      const st = users.find((u) => u.id === studentId);
      return addItem("homework", { ...form, studentId, studentName: st?.name || "", status: "Выдана", ...(cleanQs.length ? { questions: cleanQs } : {}) });
    }));
    setAdd(false); setForm({ title: "", desc: "", due: "", materialId: "", tagIds: [] }); setQs([]); setTargetIds(new Set());
  };

  const submitText = async () => {
    if (!doingText) return;
    await updateItem("homework", doingText.id, { status: "Выполнена", submission: submissionText, submittedAt: Date.now() });
    setDoingText(null); setSubmissionText("");
  };

  const submitQuiz = async () => {
    if (!doingQuiz) return;
    let score = 0;
    doingQuiz.questions.forEach((qq, i) => { if (answers[i] === qq.correct) score++; });
    await updateItem("homework", doingQuiz.id, {
      status: "Проверена", answers: doingQuiz.questions.map((_, i) => answers[i] ?? -1),
      score, total: doingQuiz.questions.length, submission: submissionText, submittedAt: Date.now(),
    });
    setDoingQuiz(null); setAnswers({}); setSubmissionText("");
  };

  return (
    <div>
      {role === "tutor" && <div style={{ marginBottom: 16 }}><button style={btn} onClick={() => setAdd(true)}><Plus size={16} />Выдать домашку</button></div>}

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

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {list.map((h) => {
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
                {role === "tutor" && <div style={{ font: `12px ${sans}`, color: T.faint, marginTop: 2 }}>{h.studentName}</div>}
                {h.desc && <div style={{ font: `14px/1.5 ${sans}`, color: T.soft, marginTop: 6 }}>{h.desc}</div>}
                <div style={{ font: `12px ${sans}`, color: T.faint, marginTop: 6 }}>срок: {h.due || "—"}{mat ? ` · материал: ${mat.title}` : ""}</div>

                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                  {role === "tutor" ? (
                    <select value={h.status} onChange={(e) => updateItem("homework", h.id, { status: e.target.value })}
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
                  {role === "tutor" && h.submission && <button style={{ ...btnGhost, padding: "8px 11px" }} onClick={() => setViewing(h)}><Eye size={15} />Как выполнил</button>}

                  {role === "tutor" && !hasQuiz && (h.status === "Выполнена" || h.status === "Требует доработки") && <>
                    <input style={{ ...input, width: 90, padding: "7px 10px" }} placeholder="Оценка" id={`g-${h.id}`} defaultValue={h.grade || ""} />
                    <button style={btn} onClick={() => { const v = document.getElementById(`g-${h.id}`).value; updateItem("homework", h.id, { status: "Проверена", grade: v || "—" }); }}>Принять</button>
                  </>}
                  {role === "tutor" && <button style={{ ...btnGhost, padding: "8px 11px" }} onClick={() => removeItem("homework", h.id)}><Trash2 size={15} /></button>}
                </div>
              </div>
            </Card>
          );
        })}
        {list.length === 0 && <div style={{ color: T.faint, font: `14px ${sans}`, padding: 24 }}>Домашних заданий пока нет.</div>}
      </div>

      {/* ---------- создание домашки ---------- */}
      <Modal open={add} onClose={() => setAdd(false)} title="Новая домашка" wide>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ font: `12px ${sans}`, color: T.faint, marginBottom: 8 }}>Кому выдать (можно выбрать нескольких)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {students.map((s) => {
                const on = targetIds.has(s.id);
                return <button key={s.id} onClick={() => toggleTarget(s.id)} style={{ padding: "7px 12px", borderRadius: 8, border: `1.5px solid ${on ? T.accent : T.line}`, background: on ? T.accentSoft : T.cardAlt, font: `600 12.5px ${sans}`, color: T.ink, cursor: "pointer" }}>{s.name}</button>;
              })}
            </div>
          </div>
          <input style={input} placeholder="Задание" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea style={{ ...input, minHeight: 90, resize: "vertical" }} placeholder="Описание / что сделать" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} />
          <div style={{ display: "flex", gap: 10 }}>
            <input style={input} placeholder="Срок (напр. 25 июн)" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} />
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
                  </div>
                ))}
                <div style={{ font: `12px ${sans}`, color: T.faint }}>Отметьте кружком верный вариант.</div>
              </Card>
            ))}
            <button style={btnGhost} onClick={addQ}><Plus size={15} />Добавить вопрос</button>
          </div>

          <button style={btn} onClick={save}>Выдать</button>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {qq.opts.map((o, j) => {
                  const chosen = answers[i] === j;
                  return (
                    <button key={j} onClick={() => setAnswers({ ...answers, [i]: j })}
                      style={{ textAlign: "left", padding: "11px 14px", borderRadius: 9, cursor: "pointer", border: `1.5px solid ${chosen ? T.accent : T.line}`, background: chosen ? T.accentSoft : T.cardAlt, font: `14px ${sans}`, color: T.ink }}>{o || `Вариант ${j + 1}`}</button>
                  );
                })}
              </div>
            </div>
          ))}
          <textarea style={{ ...input, minHeight: 70, resize: "vertical" }} placeholder="Комментарий репетитору (необязательно)" value={submissionText} onChange={(e) => setSubmissionText(e.target.value)} />
          <button style={btn} onClick={submitQuiz}>Завершить и отправить — проверится автоматически</button>
        </div>
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
    </div>
  );
}
