// Единая логика подсчёта среднего балла для смешанной системы оценивания:
// поддерживает и балл-из-максимума (напр. 88/100), и обычную пятибалльную оценку (2–5).
// Пятибалльная переводится в проценты по шкале: 5→100, 4→80, 3→60, 2→40.
export const FIVE_SCALE_PCT = { 5: 100, 4: 80, 3: 60, 2: 40 };

// Возвращает долю (0..1) для одной записи оценки, либо null, если посчитать нельзя.
export function scoreFraction(value, max) {
  if (value === undefined || value === null || value === "") return null;
  if (max !== undefined && max !== null && max !== "" && Number(max) > 0) {
    const v = Number(value);
    if (!Number.isFinite(v)) return null;
    return v / Number(max);
  }
  const n = Number(value);
  if (FIVE_SCALE_PCT[n] !== undefined) return FIVE_SCALE_PCT[n] / 100;
  return null;
}

// Средний балл (в процентах, округлён) по массиву { value, max } — например { rows }.
export function averagePct(rows) {
  const fracs = rows.map((r) => scoreFraction(r.value, r.max)).filter((x) => x != null);
  if (!fracs.length) return null;
  return Math.round((fracs.reduce((s, x) => s + x, 0) / fracs.length) * 100);
}

// Слабые места: разбирает отвеченные вопросы (домашка + пробники) по теме вопроса
// и считает % верных ответов на каждую тему.
export function computeWeakTopics({ sid, homework = [], mocks = [] }) {
  const tally = {};
  const addFrom = (list) => list.filter((x) => Array.isArray(x.answers) && x.questions).forEach((x) => {
    x.questions.forEach((qq, i) => {
      const topic = qq.topic || "Без темы";
      if (!tally[topic]) tally[topic] = { correct: 0, total: 0 };
      const type = qq.type || "single";
      if (type === "match") {
        const given = x.answers[i] || [];
        tally[topic].total += qq.left.length;
        qq.correctMap.forEach((c, k) => { if (given[k] === c) tally[topic].correct++; });
      } else if (type === "text") {
        tally[topic].total++;
        const given = (x.answers[i] || "").trim().toLowerCase();
        if (given && given === (qq.answer || "").trim().toLowerCase()) tally[topic].correct++;
      } else if (type === "graph") {
        if (x.manualScores && x.manualScores[i] != null) {
          tally[topic].total += qq.maxPoints;
          tally[topic].correct += x.manualScores[i];
        }
      } else {
        tally[topic].total++;
        if (x.answers[i] === qq.correct) tally[topic].correct++;
      }
    });
  });
  addFrom(sid ? homework.filter((h) => h.studentId === sid) : homework);
  addFrom(sid ? mocks.filter((m) => m.studentId === sid) : mocks);
  return Object.entries(tally)
    .filter(([, v]) => v.total > 0)
    .map(([topic, v]) => ({ topic, pct: Math.round((v.correct / v.total) * 100), correct: v.correct, total: v.total }))
    .sort((a, b) => a.pct - b.pct);
}
