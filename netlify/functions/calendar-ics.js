// Живой ICS-фид расписания занятий для подписки в Apple Calendar / Google Calendar.
// URL: /.netlify/functions/calendar-ics?studentId=<uid>  (или ?studentId=all для репетитора)

const PROJECT_ID = "khinevich-library";
const API_KEY = "AIzaSyCiqY-Jw-EcVc9mOy43FuEKr6vtHGbxB6E";

async function getTempIdToken() {
  const email = `ics-feed-${Date.now()}-${Math.random().toString(36).slice(2)}@khinevich-library-temp.local`;
  const password = `Tmp${Math.random().toString(36).slice(2)}!9Aa`;
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = await res.json();
  if (!data.idToken) throw new Error("auth failed: " + JSON.stringify(data));
  return data.idToken;
}

function fromFV(v) {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(fromFV);
  if (v.mapValue !== undefined) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, val]) => [k, fromFV(val)]));
  return null;
}

async function queryCollection(idToken, collectionId, studentId) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/default/documents:runQuery`;
  const structuredQuery = {
    from: [{ collectionId }],
    ...(studentId && studentId !== "all"
      ? { where: { fieldFilter: { field: { fieldPath: "studentId" }, op: "EQUAL", value: { stringValue: studentId } } } }
      : {}),
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ structuredQuery }),
  });
  const data = await res.json();
  return (Array.isArray(data) ? data : []).filter((x) => x.document).map((x) => ({ id: x.document.name.split("/").pop(), ...fromFV({ mapValue: { fields: x.document.fields } }) }));
}

function pad(n) { return String(n).padStart(2, "0"); }

function icsEscape(s) {
  return String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function buildEvent({ uid, dateISO, timeHHMM, durationMin = 60, summary, description, alarmMinutesBefore }) {
  if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return "";
  const [y, m, d] = dateISO.split("-").map(Number);
  let hh = 9, mm = 0;
  if (timeHHMM && /^\d{1,2}:\d{2}/.test(timeHHMM)) {
    const [h2, mi2] = timeHHMM.split(":").map(Number);
    hh = h2; mm = mi2;
  }
  const start = new Date(y, m - 1, d, hh, mm);
  const end = new Date(start.getTime() + durationMin * 60000);
  const fmt = (dt) => `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
  const lines = [
    "BEGIN:VEVENT",
    `UID:${uid}@khinevich-library`,
    `DTSTAMP:${fmt(new Date())}Z`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${icsEscape(summary)}`,
    description ? `DESCRIPTION:${icsEscape(description)}` : null,
  ].filter(Boolean);
  if (alarmMinutesBefore) {
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsEscape(summary)}`,
      `TRIGGER:-PT${alarmMinutesBefore}M`,
      "END:VALARM"
    );
  }
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

export const handler = async (event) => {
  try {
    const studentId = (event.queryStringParameters && event.queryStringParameters.studentId) || "all";
    const idToken = await getTempIdToken();

    const [schedule, mocks, homework] = await Promise.all([
      queryCollection(idToken, "schedule", studentId),
      queryCollection(idToken, "mocks", studentId),
      queryCollection(idToken, "homework", studentId),
    ]);

    const events = [];

    schedule.filter((l) => l.status !== "cancelled").forEach((l) => {
      events.push(buildEvent({
        uid: "lesson-" + l.id,
        dateISO: l.date,
        timeHHMM: l.time,
        durationMin: 60,
        summary: `Занятие: ${l.topic || "без темы"}${studentId === "all" ? " — " + (l.studentName || "") : ""}`,
        description: l.studentName ? `Ученик: ${l.studentName}` : "",
        alarmMinutesBefore: 30,
      }));
    });

    mocks.forEach((m) => {
      events.push(buildEvent({
        uid: "mock-" + m.id,
        dateISO: m.date,
        timeHHMM: null,
        durationMin: 90,
        summary: `Пробник: ${m.title}${studentId === "all" ? " — " + (m.studentName || "") : ""}`,
        alarmMinutesBefore: 30,
      }));
    });

    homework.filter((h) => h.status !== "Проверена").forEach((h) => {
      events.push(buildEvent({
        uid: "hw-" + h.id,
        dateISO: h.due,
        timeHHMM: "23:00",
        durationMin: 30,
        summary: `Дедлайн ДЗ: ${h.title}${studentId === "all" ? " — " + (h.studentName || "") : ""}`,
        alarmMinutesBefore: 30,
      }));
    });

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Khinevich Library//Calendar//RU",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Khinevich Library",
      "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
      ...events.filter(Boolean),
      "END:VCALENDAR",
    ].join("\r\n");

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": "inline; filename=khinevich-library.ics",
        "Cache-Control": "public, max-age=1800",
        "Access-Control-Allow-Origin": "*",
      },
      body: ics,
    };
  } catch (err) {
    return { statusCode: 500, body: "Error building calendar: " + err.message };
  }
};
