import { useMemo, useState } from "react";
import { Search, Plus, FileText, Link2, Settings2, Trash2 } from "lucide-react";
import { Card, Modal, T, sans, btn, btnGhost, input, chip, TAG_PALETTE } from "../ui.jsx";
import { useAuth } from "../auth.jsx";
import { useCol, addItem, updateItem, removeItem } from "../useDB.js";

export default function Library() {
  const { role } = useAuth();
  const { items: materials } = useCol("materials");
  const { items: tags } = useCol("tags");
  const [q, setQ] = useState("");
  const [filterTag, setFilterTag] = useState(null);
  const [view, setView] = useState(null);
  const [add, setAdd] = useState(false);
  const [tagSettings, setTagSettings] = useState(false);
  const [form, setForm] = useState({ title: "", subject: "Обществознание", type: "Конспект", body: "", link: "", tagId: "" });

  const tagById = (id) => tags.find((t) => t.id === id);

  const list = useMemo(() => materials.filter((m) =>
    (m.title + " " + m.subject).toLowerCase().includes(q.toLowerCase()) &&
    (!filterTag || m.tagId === filterTag)
  ), [q, materials, filterTag]);

  const save = async () => {
    if (!form.title) return;
    await addItem("materials", { ...form, date: new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) });
    setAdd(false); setForm({ title: "", subject: "Обществознание", type: "Конспект", body: "", link: "", tagId: "" });
  };

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
          const t = tagById(m.tagId);
          return (
            <Card key={m.id} style={{ padding: 16, cursor: "pointer", position: "relative" }}>
              {t && <span title={t.name} style={{ position: "absolute", top: 14, right: 14, width: 11, height: 11, borderRadius: "50%", background: t.color }} />}
              <div onClick={() => setView(m)} style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <FileText size={20} color={T.accent} />
                  <span style={chip}>{m.type}</span>
                </div>
                <div style={{ font: `600 15px ${sans}`, color: T.ink, lineHeight: 1.3 }}>{m.title}</div>
                <div style={{ font: `12px ${sans}`, color: T.faint }}>{m.subject} · {m.date}</div>
                {t && <div style={{ display: "inline-flex", alignItems: "center", gap: 5, font: `11px ${sans}`, color: T.faint }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: t.color }} />{t.name}</div>}
              </div>
            </Card>
          );
        })}
        {list.length === 0 && <div style={{ color: T.faint, font: `14px ${sans}`, padding: 24 }}>{materials.length ? "Ничего не нашлось." : "Библиотека пуста. Добавьте первый материал."}</div>}
      </div>

      <Modal open={!!view} onClose={() => setView(null)} title={view?.title}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
          <span style={chip}>{view?.type}</span><span style={chip}>{view?.subject}</span>
          {view && tagById(view.tagId) && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, ...chip }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: tagById(view.tagId).color }} />{tagById(view.tagId).name}</span>}
        </div>
        {view?.link && <a href={view.link} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, font: `600 14px ${sans}`, color: T.accent, marginBottom: 12 }}><Link2 size={15} />Открыть файл</a>}
        <p style={{ font: `15px/1.7 ${sans}`, color: T.ink, whiteSpace: "pre-wrap" }}>{view?.body}</p>
        {role === "tutor" && view && (
          <div style={{ borderTop: `1px solid ${T.line}`, marginTop: 14, paddingTop: 14 }}>
            <div style={{ font: `12px ${sans}`, color: T.faint, marginBottom: 8 }}>Изменить тег:</div>
            <TagPicker value={view.tagId} tags={tags} onChange={(id) => { updateItem("materials", view.id, { tagId: id }); setView({ ...view, tagId: id }); }} />
          </div>
        )}
      </Modal>

      <Modal open={add} onClose={() => setAdd(false)} title="Новый материал">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input style={input} placeholder="Название" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div style={{ display: "flex", gap: 10 }}>
            <select style={input} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
              {["Обществознание", "История", "Английский", "Математика", "Другое"].map((s) => <option key={s}>{s}</option>)}
            </select>
            <select style={input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {["Конспект", "PDF", "Презентация"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <textarea style={{ ...input, minHeight: 110, resize: "vertical" }} placeholder="Текст конспекта / описание" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <input style={input} placeholder="Ссылка на файл (Google Drive / PDF) — необязательно" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
          <div>
            <div style={{ font: `12px ${sans}`, color: T.faint, marginBottom: 8 }}>Категория (тег)</div>
            <TagPicker value={form.tagId} tags={tags} onChange={(id) => setForm({ ...form, tagId: id })} />
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
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button onClick={() => onChange("")} style={{ padding: "7px 12px", borderRadius: 8, border: `1.5px solid ${!value ? T.accent : T.line}`, background: !value ? T.accentSoft : T.cardAlt, font: `600 12.5px ${sans}`, color: T.ink }}>Без тега</button>
      {tags.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 8, border: `1.5px solid ${value === t.id ? t.color : T.line}`, background: value === t.id ? T.accentSoft : T.cardAlt, font: `600 12.5px ${sans}`, color: T.ink }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: t.color }} />{t.name}
        </button>
      ))}
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
      <div style={{ font: `13px ${sans}`, color: T.faint }}>Создавайте свои теги и назначайте любой из 15 цветов — как метки в Finder на Mac, без ограничения по количеству.</div>
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
