import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import ErrorBanner from "../components/ErrorBanner";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import IconButton from "../components/IconButton";
import ModernSelect from "../components/ModernSelect";
import { BookOpen, Plus, Sparkles, Pencil, Trash2 } from "lucide-react";
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

function InfoBox({ label, value }) {
  return (
    <div
      style={{
        border: "1px solid #e6deee",
        borderRadius: 18,
        padding: "14px 16px",
        minHeight: 92,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        background: "#ffffff",
        textAlign: "right",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#756d80",
          marginBottom: 8,
          lineHeight: 1.4,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 18,
          fontWeight: 900,
          color: "#1f172b",
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
    </div>
  );
}

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
          .select("template_id,status,next_session_at,participants_count"),
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
            participants: 0,
            nextSessionAt: null,
          };
        }

        if (r.status === "active") {
          const dt = r.next_session_at ? new Date(r.next_session_at) : null;
          if (
            dt &&
            (!m[id].nextSessionAt || dt < new Date(m[id].nextSessionAt))
          ) {
            m[id].nextSessionAt = r.next_session_at;
          }
        }

        m[id].participants += Number(r.participants_count ?? 0);
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
      list = list.filter((r) =>
        activeFilter === "active" ? r.is_active : !r.is_active,
      );
    }

    const sorted = [...list];

    if (sortBy === "title") {
      sorted.sort((a, b) =>
        String(a.title ?? "").localeCompare(String(b.title ?? ""), "ar"),
      );
    } else if (sortBy === "next") {
      sorted.sort((a, b) => {
        const ad = meta[a.id]?.nextSessionAt
          ? new Date(meta[a.id].nextSessionAt)
          : null;
        const bd = meta[b.id]?.nextSessionAt
          ? new Date(meta[b.id].nextSessionAt)
          : null;

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

  const courseCount = useMemo(
    () => filtered.filter((r) => r.kind !== "workshop").length,
    [filtered],
  );

  const workshopCount = useMemo(
    () => filtered.filter((r) => r.kind === "workshop").length,
    [filtered],
  );

  const filteredSorted = useMemo(() => {
    const courses = filtered.filter((r) => r.kind !== "workshop");
    const workshops = filtered.filter((r) => r.kind === "workshop");
    return [...courses, ...workshops];
  }, [filtered]);

  function kindLabel(k) {
    return k === "workshop" ? "ورشة" : "دورة";
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
        toast("العنوان مطلوب.", "warn");
        setSaving(false);
        return;
      }

      if (form.id) {
        const { error } = await supabase
          .from("courses")
          .update(payload)
          .eq("id", form.id);

        if (error) throw error;
        toast("تم تحديث الدورة.", "ok");
      } else {
        const { data, error } = await supabase
          .from("courses")
          .insert([payload])
          .select("id")
          .single();

        if (error) throw error;

        toast("تم إنشاء الدورة.", "ok");
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
      toast("فشل حفظ الدورة.", "danger");
    } finally {
      setSaving(false);
    }
  }

  async function removeCourse(id) {
    setError(null);

    const { error } = await supabase.from("courses").delete().eq("id", id);

    if (error) {
      setError(error);
      toast("فشل حذف الدورة.", "danger");
      return;
    }

    toast("تم حذف الدورة.", "ok");
    await load();
  }

  return (
    <div className="container page page--courses" dir="rtl" lang="ar">
      <PageHeader
        title="الدورات"
        subtitle="إدارة الدورات والورشات"
        actions={
          <div className="pageHeader__actions">
            <button className="btn soft" onClick={load} title="تحديث">
              تحديث
            </button>
          </div>
        }
      />

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="sectionRow">
          <div className="sectionLabel">فلاتر</div>
        </div>

        <div className="filtersBar">
          <input
            className="input filtersBar__search"
            style={{ textAlign: "right" }}
            placeholder="ابحث عن دورة…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <ModernSelect
            className="filtersBar__select"
            value={kindFilter}
            onChange={setKindFilter}
            menuWidth="trigger"
            options={[
              { value: "all", label: "كل الأنواع" },
              { value: "course", label: "دورات" },
              { value: "workshop", label: "ورشات" },
            ]}
          />

          <ModernSelect
            className="filtersBar__select"
            value={activeFilter}
            onChange={setActiveFilter}
            menuWidth="trigger"
            options={[
              { value: "all", label: "كل الحالات" },
              { value: "active", label: "فعّال" },
              { value: "inactive", label: "غير فعّال" },
            ]}
          />

          <ModernSelect
            className="filtersBar__select"
            value={sortBy}
            onChange={setSortBy}
            menuWidth="trigger"
            options={[
              { value: "newest", label: "الأحدث" },
              { value: "title", label: "العنوان (أ-ي)" },
              { value: "next", label: "الجلسة القادمة" },
            ]}
          />

          <button className="btn primary filtersBar__btn" onClick={openCreate}>
            <Plus size={18} /> إضافة
          </button>
        </div>
      </div>

      <ErrorBanner error={error} />

      {loading ? (
        <div className="card">جارٍ التحميل...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="لا توجد دورات أو ورشات"
          description=""
          actionLabel="إضافة"
          onAction={openCreate}
        />
      ) : (
        <div className="cardsGrid">
          {filteredSorted.map((r, idx) => {
            const m = meta[r.id] ?? {};
            const isWorkshop = r.kind === "workshop";
            const openCourse = () => navigate(`/courses/${r.id}`);
            const showHeader =
              idx === 0 || (filteredSorted[idx - 1]?.kind ?? null) !== r.kind;
            const sectionTitle = isWorkshop ? "الورشات" : "الدورات";
            const sectionCount = isWorkshop ? workshopCount : courseCount;

            return (
              <React.Fragment key={r.id}>
                {showHeader ? (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      gap: 8,
                      marginTop: idx === 0 ? 0 : 10,
                      marginBottom: 4,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 950,
                        color: "#241a31",
                      }}
                    >
                      {sectionTitle}
                    </div>

                    <span className="badge badge--page">{sectionCount}</span>
                  </div>
                ) : null}

                <div
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
                  style={{
                    padding: 18,
                    borderRadius: 24,
                    display: "grid",
                    gap: 14,
                    alignContent: "start",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div
                      className="cardTitle cardTitle--top"
                      style={{
                        margin: 0,
                        fontSize: 18,
                        fontWeight: 950,
                        color: "#1f172b",
                        lineHeight: 1.35,
                      }}
                    >
                      {r.title}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        justifyContent: "flex-start",
                      }}
                    >
                      <span className="badge badge--page">
                        {isWorkshop ? (
                          <Sparkles size={14} />
                        ) : (
                          <BookOpen size={14} />
                        )}
                        {kindLabel(r.kind)}
                      </span>

                      {r.is_active ? (
                        <span className="badge ok">فعّال</span>
                      ) : (
                        <span className="badge danger">غير فعّال</span>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 12,
                    }}
                  >
                    <InfoBox
                      label="₪ السعر"
                      value={Number(r.default_price ?? 0).toFixed(2)}
                    />

                    <InfoBox
                      label="المشاركون"
                      value={Number(m.participants ?? 0)}
                    />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      marginTop: 2,
                    }}
                  >
                    <IconButton
                      variant="soft"
                      icon={Pencil}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(r);
                      }}
                      title="تعديل"
                    >
                      تعديل
                    </IconButton>

                    <IconButton
                      variant="danger"
                      icon={Trash2}
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDel({
                          open: true,
                          id: r.id,
                          title: r.title,
                        });
                      }}
                      title="حذف"
                    >
                      حذف
                    </IconButton>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      <Modal
        open={openForm}
        title={form.id ? "تعديل دورة" : "إضافة دورة"}
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
                { value: "course", label: "دورة" },
                { value: "workshop", label: "ورشة" },
              ]}
            />
          </div>

          <div style={{ gridColumn: "span 6" }}>
            <div className="muted">السعر</div>
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

          {form.id ? (
            <div style={{ gridColumn: "span 6" }}>
              <div className="muted">الحالة</div>
              <ModernSelect
                value={form.is_active ? "1" : "0"}
                onChange={(v) =>
                  setForm((p) => ({ ...p, is_active: v === "1" }))
                }
                menuWidth="trigger"
                options={[
                  { value: "1", label: "فعّال" },
                  { value: "0", label: "غير فعّال" },
                ]}
              />
            </div>
          ) : null}

          <div style={{ gridColumn: "span 12" }}>
            <div className="muted">ملاحظات</div>
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
              {saving ? "جارٍ الحفظ..." : "حفظ"}
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => {
                setOpenForm(false);
                setForm(emptyForm);
              }}
            >
              إلغاء
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDel.open}
        title="حذف الدورة"
        message={`حذف هذه الدورة: ${confirmDel.title}؟ سيتم أيضًا حذف الاشتراكات المرتبطة.`}
        confirmText="حذف"
        cancelText="إلغاء"
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
