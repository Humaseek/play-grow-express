import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import ErrorBanner from "../components/ErrorBanner";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import IconButton from "../components/IconButton";
import ModernSelect from "../components/ModernSelect";
import {
  BookOpen,
  Plus,
  Sparkles,
  Users,
  CalendarClock,
  Pencil,
  Trash2,
} from "lucide-react";
import { useNavigate, useOutletContext } from "react-router";

const emptyForm = {
  id: null,
  title: "",
  kind: "course",
  capacity: 10,
  default_price: 0,
  is_active: true,
  notes: "",
};

export default function Courses() {
  const navigate = useNavigate();
  const { toast } = useOutletContext();

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [confirmDel, setConfirmDel] = useState({
    open: false,
    id: null,
    title: "",
  });

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const [cRes, runsRes] = await Promise.all([
        supabase.from("courses").select("*").order("id", { ascending: false }),
        supabase
          .from("course_runs_summary_view")
          .select("template_id,status,next_session_at,participants_count,sessions_count"),
      ]);

      if (cRes.error) throw cRes.error;
      if (runsRes.error) throw runsRes.error;

      const courses = cRes.data ?? [];
      const runs = runsRes.data ?? [];

      const m = {};
      for (const r of runs) {
        const id = r.template_id;
        if (!id) continue;
        if (!m[id]) {
          m[id] = {
            activeRuns: 0,
            participants: 0,
            nextSessionAt: null,
            sessions: 0,
          };
        }
        if (r.status === "active") {
          m[id].activeRuns += 1;
          const dt = r.next_session_at ? new Date(r.next_session_at) : null;
          if (dt && (!m[id].nextSessionAt || dt < new Date(m[id].nextSessionAt))) {
            m[id].nextSessionAt = r.next_session_at;
          }
        }
        m[id].participants += Number(r.participants_count ?? 0);
        m[id].sessions += Number(r.sessions_count ?? 0);
      }

      setRows(courses);
      setMeta(m);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = rows;

    const s = q.trim().toLowerCase();
    if (s) {
      list = list.filter((r) => (r.title ?? "").toLowerCase().includes(s));
    }

    if (kindFilter !== "all") {
      list = list.filter((r) => r.kind === kindFilter);
    }

    if (activeFilter !== "all") {
      list = list.filter((r) => (activeFilter === "active" ? r.is_active : !r.is_active));
    }

    const sorted = [...list];
    if (sortBy === "title") {
      sorted.sort((a, b) => String(a.title ?? "").localeCompare(String(b.title ?? ""), "ar"));
    } else if (sortBy === "next") {
      sorted.sort((a, b) => {
        const ad = meta[a.id]?.nextSessionAt ? new Date(meta[a.id].nextSessionAt) : null;
        const bd = meta[b.id]?.nextSessionAt ? new Date(meta[b.id].nextSessionAt) : null;
        if (ad && bd) return ad - bd;
        if (ad && !bd) return -1;
        if (!ad && bd) return 1;
        return Number(b.id) - Number(a.id);
      });
    } else {
      sorted.sort((a, b) => Number(b.id) - Number(a.id));
    }

    return sorted;
  }, [rows, q, kindFilter, activeFilter, sortBy, meta]);

  function fmtDT(v) {
    if (!v) return "-";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "-";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  }

  function kindLabel(k) {
    return k === "workshop" ? "סדנה" : "קורס";
  }

  function openCreate() {
    setForm(emptyForm);
    setOpenForm(true);
  }

  function openEdit(r) {
    setForm({
      id: r.id,
      title: r.title ?? "",
      kind: r.kind ?? "course",
      capacity: r.capacity ?? 10,
      default_price: r.default_price ?? 0,
      is_active: !!r.is_active,
      notes: r.notes ?? "",
    });
    setOpenForm(true);
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        title: form.title.trim(),
        kind: form.kind,
        capacity: Number(form.capacity),
        default_price: Number(form.default_price),
        is_active: !!form.is_active,
        notes: form.notes.trim() || null,
      };

      if (!payload.title) {
        toast("כותרת הקורס נדרשת.", "warn");
        setSaving(false);
        return;
      }

      if (form.id) {
        const { error } = await supabase
          .from("courses")
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
        toast("הקורס עודכן.", "ok");
      } else {
        const { data, error } = await supabase
          .from("courses")
          .insert([payload])
          .select("id")
          .single();
        if (error) throw error;
        toast("הקורס נוצר.", "ok");
        setOpenForm(false);
        await load();
        navigate(`/courses/${data.id}`);
        return;
      }

      setOpenForm(false);
      setForm(emptyForm);
      await load();
    } catch (e2) {
      setError(e2);
      toast("שמירה נכשלה.", "danger");
    } finally {
      setSaving(false);
    }
  }

  async function removeCourse(id) {
    setError(null);
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) {
      setError(error);
      toast("מחיקה נכשלה.", "danger");
      return;
    }
    toast("הקורס נמחק.", "ok");
    await load();
  }

  return (
    <div className="container page page--courses">
      <PageHeader
        title="קורסים וסדנאות"
        subtitle="תבניות קורסים/סדנאות — פתח תבנית לניהול תשלומים ושיעורים"
        actions={
          <div className="pageHeader__actions">
            <button className="btn soft" onClick={load} title="רענן">
              רענן
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="sectionRow">
          <div className="sectionLabel">فלאتر</div>
        </div>

        <div className="filtersBar">
          <input
            className="input filtersBar__search"
            placeholder="חיפוש לפי כותרת..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <ModernSelect
            className="filtersBar__select"
            value={kindFilter}
            onChange={setKindFilter}
            menuWidth="trigger"
            options={[
              { value: "all", label: "כל הסוגים" },
              { value: "course", label: "קורס" },
              { value: "workshop", label: "סדנה" },
            ]}
/>

          <ModernSelect
            className="filtersBar__select"
            value={activeFilter}
            onChange={setActiveFilter}
            menuWidth="trigger"
            options={[
              { value: "all", label: "כל המצבים" },
              { value: "active", label: "פעיל" },
              { value: "inactive", label: "לא פעיל" },
            ]}
/>

          <ModernSelect
            className="filtersBar__select"
            value={sortBy}
            onChange={setSortBy}
            menuWidth="trigger"
            options={[
              { value: "updated_desc", label: "העדכני ביותר" },
              { value: "title_asc", label: "כותרת (א-ת)" },
              { value: "participants_desc", label: "הכי הרבה משתתפים" },
            ]}
/>

          <button className="btn primary filtersBar__btn" onClick={openCreate}>
            <Plus size={18} /> הוספה
          </button>
        </div>
      </div>

      <ErrorBanner error={error} />

      {loading ? (
        <div className="card">טוען...</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="אין קורסים עדיין" description="צור קורס/סדנה ראשון כדי להתחיל להוסיף מחזורים ושיעורים." actionLabel="קורס חדש" onAction={openCreate} />
      ) : (
        <div className="cardsGrid">
          {filtered.map((r) => {
            const m = meta[r.id] ?? {};
            const isWorkshop = r.kind === "workshop";
            const openCourse = () => navigate(`/courses/${r.id}`);
            return (
              <div
                key={r.id}
                className="card hoverLift clickCard"
                role="button"
                tabIndex={0}
                onClick={openCourse}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openCourse();
                  }
                }}
              >
                <div className="metaRow" style={{ justifyContent: "space-between" }}>
                  <div className="metaRow">
                    <span className="badge badge--page">
                      {isWorkshop ? <Sparkles size={14} /> : <BookOpen size={14} />}
                      {kindLabel(r.kind)}
                    </span>
                    {r.is_active ? (
                      <span className="badge ok">פעיל</span>
                    ) : (
                      <span className="badge danger">לא פעיל</span>
                    )}
                  </div>

                  <span className="muted" style={{ fontSize: 12 }}>اضغط لפתח</span>
                </div>

                <div style={{ marginTop: 10 }}>
                  <div className="cardTitle">{r.title}</div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    מחזורים פעיל: <b>{Number(m.activeRuns ?? 0)}</b> · השיעור הקרוב: <b>{fmtDT(m.nextSessionAt)}</b>
                  </div>
                </div>

                <div className="statsRow">
                  <div className="stat">
                    <div className="muted">
                      <Users size={14} /> السعة
                    </div>
                    <b>{Number(r.capacity ?? 0)}</b>
                  </div>
                  <div className="stat">
                    <div className="muted">
                      ₪ الמחיר اלאفتراضي
                    </div>
                    <b>{Number(r.default_price ?? 0).toFixed(2)}</b>
                  </div>
                  <div className="stat">
                    <div className="muted">משתתפים (تقريبي)</div>
                    <b>{Number(m.participants ?? 0)}</b>
                  </div>
                  <div className="stat">
                    <div className="muted">
                      <CalendarClock size={14} /> مجموع שיעורים (כל התשלומים)
                    </div>
                    <b>{Number(m.sessions ?? 0)}</b>
                  </div>
                </div>

                <div className="actionsRow" style={{ marginTop: 12, justifyContent: "flex-end" }}>
                  <IconButton
                    variant="soft"
                    icon={Pencil}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(r);
                    }}
                    title="עריכה"
                  >
                    עריכה
                  </IconButton>
                  <IconButton
                    variant="danger"
                    icon={Trash2}
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDel({ open: true, id: r.id, title: r.title });
                    }}
                    title="מחיקה"
                  >
                    מחיקה
                  </IconButton>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={openForm}
        title={form.id ? "עריכה קורס" : "צור קורס"}
        onClose={() => {
          setOpenForm(false);
          setForm(emptyForm);
        }}
      >
        <form onSubmit={save} className="grid">
          <div style={{ gridColumn: "span 7" }}>
            <div className="muted">العنوان *</div>
            <input
              className="input"
              value={form.title}
              onChange={(e) =>
                setForm((p) => ({ ...p, title: e.target.value }))
              }
            />
          </div>

          <div style={{ gridColumn: "span 5" }}>
            <div className="muted">النوع</div>
            <ModernSelect
              value={form.kind}
              onChange={(v) => setForm((p) => ({ ...p, kind: v }))}
              menuWidth="trigger"
              options={[
                { value: "course", label: "קורס" },
                { value: "workshop", label: "סדנה" },
              ]}
/>
          </div>

          <div style={{ gridColumn: "span 4" }}>
            <div className="muted">السعة</div>
            <input
              className="input"
              type="number"
              min="1"
              value={form.capacity}
              onChange={(e) =>
                setForm((p) => ({ ...p, capacity: e.target.value }))
              }
            />
          </div>

          <div style={{ gridColumn: "span 4" }}>
            <div className="muted">الמחיר اלאفتراضي</div>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={form.default_price}
              onChange={(e) =>
                setForm((p) => ({ ...p, default_price: e.target.value }))
              }
            />
          </div>

          <div style={{ gridColumn: "span 4" }}>
            <div className="muted">פעיל؟</div>
            <ModernSelect
              value={form.is_active ? "1" : "0"}
              onChange={(v) => setForm((p) => ({ ...p, is_active: v === "1" }))}
              menuWidth="trigger"
              options={[
                { value: "1", label: "פעיל" },
                { value: "0", label: "לא פעיל" },
              ]}
/>
          </div>

          <div style={{ gridColumn: "span 12" }}>
            <div className="muted">הערות</div>
            <textarea
              className="input"
              rows={3}
              value={form.notes}
              onChange={(e) =>
                setForm((p) => ({ ...p, notes: e.target.value }))
              }
            />
          </div>

          <div className="row" style={{ gridColumn: "span 12" }}>
            <button className="btn primary" disabled={saving}>
              {saving ? "שומר..." : "שמור"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setOpenForm(false);
                setForm(emptyForm);
              }}
            >
              ביטול
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDel.open}
        title="מחיקה קורס"
        message={`האם ברצונך מחיקה קורס: ${confirmDel.title} ؟ (سيتم מחיקה שיעורים والتسجيלאت وתשלומים المرتبطة)`}
        confirmText="מחיקה"
        cancelText="ביטול"
        danger
        onCancel={() => setConfirmDel({ open: false, id: null, title: "" })}
        onConfirm={async () => {
          const id = confirmDel.id;
          setConfirmDel({ open: false, id: null, title: "" });
          await removeCourse(id);
        }}
      />
    </div>
  );
}
