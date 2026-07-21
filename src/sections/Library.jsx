import { useMemo, useState } from "react";
import { Search, Plus, FileText, Link2, Settings2, Trash2, Pin, PinOff } from "lucide-react";
import { Card, Modal, T, sans, btn, btnGhost, input, chip, TAG_PALETTE, SUBJECTS } from "../ui.jsx";
import { useAuth } from "../auth.jsx";
import { useCol, addItem, updateItem, removeItem } from "../useDB.js";

export default function Library() {
  const { role, profile } = useAuth();
  const { items: users } = useCol("users");
  const { items: materials } = useCol("materials");
  const { items: tags } = useCol("tags");
  const [q, setQ] = useState("");
  const [filterTag, setFilterTag] = useState(null);
  const [view, setView] = useState(null);
  const [add, setAdd] = useState(false);
  const [tagSettings, setTagSettings] = useState(false);
  const [form, setForm] = useState({ title: "", subject: "Обществознание", type: "Конспект", body: "", link: "", tagIds: [] });

  const tagById = (id) => tags.find((t) => t.id === id);
  const matTagIds = (m) => m.tagIds || (m.tagId ? [m.tagId] : []); // поддержка старых записей с одним tagId

  // Доступ к предметам: у ученика/родителя виден материал только по разрешённым предметам.
  // По умолчанию (если доступ не настроен репетитором) — только основной предмет ученика.
  const mySubjects = useMemo(() => {
    if (role === "tutor") return null; // репетитору видно всё
    const sid = role === "student" ? profile.uid : profile.childId;
    const st = users.find((u) => u.id === sid);
    if (!st) return [];
    return st.subjectAccess && st.subjectAccess.length ? st.subjectAccess : [st.subject].filter(Boolean);
  }, [role, profile, users]);

  const list = useMemo(() => materials
    .filter((m) =>
      (m.title + " " + m.subject).toLowerCase().includes(q.toLowerCase()) &&
      (!filterTag || matTagIds(m).includes(filterTag)) &&
      (mySubjects === null || mySubjects.includes(m.subject))
    )
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)),
  [q, materials, filterTag]);

  const save = async () => {
    if (!form.title) return;
    await addItem("materials", { ...form, pinned: false, date: new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) });
    setAdd(false); setForm({ title: "", subject: "Обществознание", type: "Конспект", body: "", link: "", tagIds: [] });
  };
  const togglePin = (m) => updateItem("materials", m.id, { pinned: !m.pinned });
  const deleteMaterial = (m) => { if (confirm(`Удалить «${m.title}» из библиотеки?`)) removeItem("materials", m.id); };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={17} color={T.faint} style={{ position: "absolute", left: 12, top: 11 }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по библиотеке…" style={{ ...input, paddingLeft: 38 }} />
        </div>
        {role === "tutor" && <button style={btnGhost} onClick={() => setTagSettings(true)}><Settings2 size={16} />Теги</button>}
        {role === "tutor" && <button style={btn} onClick={() => setAdd(true)}><Plus size={17} />Добавить материал</button>}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ font: `12px ${sans}`, color: T.faint }}>Теги:</span>
        <button onClick={() => setFilterTag(null)} style={{ ...chip, background: !filterTag ? T.accent : T.line, color: !filterTag ? "#fff" : T.soft, border: "none", cursor: "pointer" }}>Все</button>
        {tags.map((t) => (
          <button key={t.id} onClick={() => setFilterTag(filterTag === t.id ? null : t.id)} style={{ display: "inline-flex", alignItems: "center", gap: 6, ...chip, background: filterTag === t.id ? t.color : T.card, color: filterTag === t.id ? "#fff" : T.ink, border: `1px solid ${filterTag === t.id ? t.color : T.line}`, cursor: "pointer" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.color, display: "inline-block" }} />{t.name}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
        {list.map((m) => {
          const mTags = matTagIds(m).map(tagById).filter(Boolean);
          return (
            <Card key={m.id} style={{ padding: 16, position: "relative", border: m.pinned ? `1.5px solid ${T.accent}` : undefined }}>
              <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 4 }}>
                {role === "tutor" && (
                  <>
                    <button title={m.pinned ? "Открепить" : "Закрепить"} onClick={() => togglePin(m)} style={{ background: "none", border: "none", cursor: "pointer", color: m.pinned ? T.accent : T.faint, padding: 3 }}>
                      {m.pinned ? <Pin size={15} fill={T.accent} /> : <Pin size={15} />}
                    </button>
                    <button title="Удалить" onClick={() => deleteMaterial(m)} style={{ background: "none", border: "none", cursor: "pointer", color: T.faint, padding: 3 }}><Trash2 size={15} /></button>
                  </>
                )}
              </div>
              <div onClick={() => setView(m)} style={{ display: "flex", flexDirection: "column", gap: 9, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", paddingRight: role === "tutor" ? 46 : 0 }}>
                  <FileText size={20} color={T.accent} />
                  <span style={chip}>{m.type}</span>
                </div>
                <div style={{ font: `600 15px ${sans}`, color: T.ink, lineHeight: 1.3 }}>{m.title}</div>
                <div style={{ font: `12px ${sans}`, color: T.faint }}>{m.subject} · {m.date}</div>
                {mTags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {mTags.map((t) => (
                      <div key={t.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, font: `11px ${sans}`, color: T.faint }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: t.color }} />{t.name}</div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
        {list.length === 0 && <div style={{ color: T.faint, font: `14px ${sans}`, padding: 24 }}>{materials.length ? "Ничего не нашлось." : "Библиотека пуста. Добавьте первый материал."}</div>}
      </div>

      <Modal open={!!view} onClose={() => setView(null)} title={view?.title}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
          <span style={chip}>{view?.type}</span><span style={chip}>{view?.subject}</span>
          {view && matTagIds(view).map(tagById).filter(Boolean).map((t) => (
            <span key={t.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, ...chip }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: t.color }} />{t.name}</span>
          ))}
        </div>
        {view?.link && <a href={view.link} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, font: `600 14px ${sans}`, color: T.accent, marginBottom: 12 }}><Link2 size={15} />Открыть файл</a>}
        <p style={{ font: `15px/1.7 ${sans}`, color: T.ink, whiteSpace: "pre-wrap" }}>{view?.body}</p>
        {role === "tutor" && view && (
          <div style={{ borderTop: `1px solid ${T.line}`, marginTop: 14, paddingTop: 14 }}>
            <div style={{ font: `12px ${sans}`, color: T.faint, marginBottom: 8 }}>Теги (до двух):</div>
            <TagPicker value={matTagIds(view)} tags={tags} onChange={(ids) => { updateItem("materials", view.id, { tagIds: ids }); setView({ ...view, tagIds: ids }); }} />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button style={btnGhost} onClick={() => { togglePin(view); setView({ ...view, pinned: !view.pinned }); }}>{view.pinned ? <PinOff size={15} /> : <Pin size={15} />}{view.pinned ? "Открепить" : "Закрепить"}</button>
              <button style={{ ...btnGhost, color: "#a23b2d" }} onClick={() => { deleteMaterial(view); setView(null); }}><Trash2 size={15} />Удалить материал</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={add} onClose={() => setAdd(false)} title="Новый материал">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input style={input} placeholder="Название" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div style={{ display: "flex", gap: 10 }}>
            <select style={input} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
              {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select style={input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {["Конспект", "PDF", "Презентация"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <textarea style={{ ...input, minHeight: 110, resize: "vertical" }} placeholder="Текст конспекта / описание" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <input style={input} placeholder="Ссылка на файл (Google Drive / PDF) — необязательно" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
          <div>
            <div style={{ font: `12px ${sans}`, color: T.faint, marginBottom: 8 }}>Теги (до двух)</div>
            <TagPicker value={form.tagIds} tags={tags} onChange={(ids) => setForm({ ...form, tagIds: ids })} />
          </div>
          <button style={btn} onClick={save}>Сохранить в библиотеку</button>
        </div>
      </Modal>

      <Modal open={tagSettings} onClose={() => setTagSettings(false)} title="Управление тегами" wide>
        <TagManager tags={tags} />
      </Modal>
    </div>
  );
}

function TagPicker({ value, tags, onChange }) {
  const toggle = (id) => {
    if (value.includes(id)) { onChange(value.filter((x) => x !== id)); return; }
    if (value.length >= 2) { onChange([value[1], id]); return; } // сдвигаем окно из двух тегов
    onChange([...value, id]);
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {tags.map((t) => {
          const on = value.includes(t.id);
          return (
            <button key={t.id} onClick={() => toggle(t.id)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 8, border: `1.5px solid ${on ? t.color : T.line}`, background: on ? T.accentSoft : T.cardAlt, font: `600 12.5px ${sans}`, color: T.ink }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: t.color }} />{t.name}
            </button>
          );
        })}
      </div>
      {value.length >= 2 && <div style={{ font: `11.5px ${sans}`, color: T.faint, marginTop: 6 }}>Выбрано максимум тегов (2) — выбор нового заменит самый ранний.</div>}
    </div>
  );
}

function TagManager({ tags }) {
  const [name, setName] = useState("");
  const [colorIdx, setColorIdx] = useState(0);

  const addTag = async () => {
    if (!name.trim()) return;
    await addItem("tags", { name: name.trim(), color: TAG_PALETTE[colorIdx] });
    setName(""); setColorIdx(0);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ font: `13px ${sans}`, color: T.faint }}>Создавайте свои теги и назначайте любой из 15 цветов — как метки в Finder на Mac, без ограничения по количеству. У каждого материала может быть до двух тегов.</div>
      {tags.map((t) => (
        <div key={t.id} style={{ padding: "10px 0", borderBottom: `1px solid ${T.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ width: 16, height: 16, borderRadius: "50%", background: t.color, flexShrink: 0 }} />
            <input style={input} defaultValue={t.name} onBlur={(e) => { if (e.target.value.trim() && e.target.value !== t.name) updateItem("tags", t.id, { name: e.target.value.trim() }); }} />
            <button onClick={() => removeItem("tags", t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: T.faint }}><Trash2 size={15} /></button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {TAG_PALETTE.map((c) => (
              <button key={c} onClick={() => updateItem("tags", t.id, { color: c })} style={{ width: 20, height: 20, borderRadius: "50%", background: c, border: `2px solid ${t.color === c ? T.ink : "transparent"}`, cursor: "pointer" }} />
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
