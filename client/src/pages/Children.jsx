import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import ErrorBanner from "../components/ErrorBanner";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { useNavigate, useOutletContext } from "react-router";
import IconButton from "../components/IconButton";
import ModernSelect from "../components/ModernSelect";
import { Pencil, Trash2, UserRound, Plus } from "lucide-react";

const emptyForm = {
  id: null,
  name: "",
  age: "",
  class: "",
  gender: "male",
  country_id: "",
  new_city: "",
  mother_name: "",
  mother_phone: "",
  father_name: "",
  father_phone: "",
  notes: "",
};

export default function Children() {
  const navigate = useNavigate();
  const { toast } = useOutletContext();

  const [rows, setRows] = useState([]);
  const [countries, setCountries] = useState([]);
  const [classOptions, setClassOptions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [q, setQ] = useState("");

  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Add new Class (persistent)
  const [newClassName, setNewClassName] = useState("");
  const [addingClass, setAddingClass] = useState(false);

  // Add new City (persistent)
  const [addingCity, setAddingCity] = useState(false);

  const [confirmDel, setConfirmDel] = useState({
    open: false,
    id: null,
    name: "",
  });

  async function loadClassesOnly() {
    const clsRes = await supabase
      .from("child_classes")
      .select("id,name")
      .order("name", { ascending: true });

    if (clsRes.error) {
      // إذا الجدول مش موجود (لسه ما شغّلت الـ SQL)
      setClassOptions([]);
      return;
    }

    setClassOptions(clsRes.data ?? []);
  }

  async function loadCitiesOnly() {
    const cRes = await supabase
      .from("countries")
      .select("id,name")
      .order("name", { ascending: true });

    if (cRes.error) {
      setError(cRes.error);
      return;
    }

    setCountries(cRes.data ?? []);
  }

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [cRes, chRes, clsRes] = await Promise.all([
        supabase
          .from("countries")
          .select("id,name")
          .order("name", { ascending: true }),
        supabase
          .from("children_view")
          .select("*")
          .order("id", { ascending: false }),
        supabase
          .from("child_classes")
          .select("id,name")
          .order("name", { ascending: true }),
      ]);

      if (cRes.error) throw cRes.error;
      if (chRes.error) throw chRes.error;

      setCountries(cRes.data ?? []);
      setRows(chRes.data ?? []);

      // classes table is optional until you run the SQL migration
      if (!clsRes.error) setClassOptions(clsRes.data ?? []);
      else setClassOptions([]);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        (r.name ?? "").toLowerCase().includes(s) ||
        (r.mother_phone ?? "").toLowerCase().includes(s) ||
        (r.father_phone ?? "").toLowerCase().includes(s),
    );
  }, [rows, q]);

  const classSelectOptions = useMemo(() => {
    const base = (classOptions || []).map((c) => ({
      value: c.name,
      label: c.name,
    }));

    const current = (form.class ?? "").trim();
    if (current && !base.some((o) => o.value === current)) {
      base.unshift({ value: current, label: current });
    }

    return base;
  }, [classOptions, form.class]);

  function openCreate() {
    setForm(emptyForm);
    setNewClassName("");
    setOpenForm(true);
  }

  function openEdit(r) {
    const match = countries.find((c) => c.name === r.country);
    setForm({
      id: r.id,
      name: r.name ?? "",
      age: r.age ?? "",
      class: r.class ?? "",
      gender: r.gender ?? "male",
      country_id: match ? String(match.id) : "",
      new_city: "",
      mother_name: r.mother_name ?? "",
      mother_phone: r.mother_phone ?? "",
      father_name: r.father_name ?? "",
      father_phone: r.father_phone ?? "",
      notes: r.notes ?? "",
    });
    setNewClassName("");
    setOpenForm(true);
  }

  async function upsertCityIfNeeded() {
    const hasSelected = !!form.country_id;
    if (hasSelected) return Number(form.country_id);

    const name = (form.new_city ?? "").trim();
    if (!name) return null;

    const { data, error } = await supabase
      .from("countries")
      .upsert([{ name }], { onConflict: "name" })
      .select("id")
      .single();

    if (error) throw error;
    return data?.id ?? null;
  }

  async function addNewClass() {
    const name = (newClassName ?? "").trim();
    if (!name) {
      toast("اكتب اسم الصف أولاً", "warn");
      return;
    }

    setAddingClass(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("child_classes")
        .upsert([{ name }], { onConflict: "name" });

      if (error) throw error;

      setNewClassName("");
      await loadClassesOnly();
      setForm((p) => ({ ...p, class: name }));
      toast("تم إضافة الصف وحفظه للدروب داون", "ok");
    } catch (e) {
      // إذا الجدول مش موجود، غالبًا لازم تشغيل SQL
      if (String(e?.code) === "42P01") {
        toast("لازم أولاً تشغّل ملف SQL اللي بضيف جدول child_classes", "warn");
      } else {
        toast("فشل إضافة الصف", "danger");
      }
      setError(e);
    } finally {
      setAddingClass(false);
    }
  }

  async function addNewCity() {
    const name = (form.new_city ?? "").trim();
    if (!name) {
      toast("اكتب اسم المدينة أولاً", "warn");
      return;
    }

    setAddingCity(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("countries")
        .upsert([{ name }], { onConflict: "name" })
        .select("id,name")
        .single();

      if (error) throw error;

      await loadCitiesOnly();
      setForm((p) => ({
        ...p,
        country_id: data?.id ? String(data.id) : p.country_id,
        new_city: "",
      }));
      toast("تم إضافة المدينة وحفظها للدروب داون", "ok");
    } catch (e) {
      if (String(e?.code) === "42P01") {
        toast("جدول المدن غير موجود. تأكد إن جدول countries موجود.", "warn");
      } else if (String(e?.code) === "23505") {
        toast("المدينة موجودة مسبقًا", "warn");
      } else {
        toast("فشل إضافة المدينة", "danger");
      }
      setError(e);
    } finally {
      setAddingCity(false);
    }
  }

  async function saveChild(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const countryId = await upsertCityIfNeeded();

      const payload = {
        name: form.name.trim(),
        age: form.age === "" ? null : Math.floor(Number(form.age)),
        class: (form.class ?? "").trim() || null,
        gender: form.gender,
        country_id: countryId,

        mother_name: form.mother_name.trim() || null,
        mother_phone: form.mother_phone.trim() || null,
        father_name: form.father_name.trim() || null,
        father_phone: form.father_phone.trim() || null,
        notes: form.notes.trim() || null,
      };

      if (
        !payload.name ||
        payload.age === null ||
        !Number.isFinite(payload.age) ||
        payload.age < 0
      ) {
        toast("الاسم والعمر مطلوبان.", "warn");
        setSaving(false);
        return;
      }

      if (form.id) {
        const { error } = await supabase
          .from("children")
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
        toast("تم التعديل.", "ok");
      } else {
        const { error } = await supabase.from("children").insert([payload]);
        if (error) throw error;
        toast("تمت الإضافة.", "ok");
      }

      setOpenForm(false);
      setForm(emptyForm);
      setNewClassName("");
      await loadAll();
    } catch (e2) {
      setError(e2);
      toast("فشل حفظ بيانات الطفل.", "danger");
    } finally {
      setSaving(false);
    }
  }

  async function deleteChild(id) {
    setError(null);
    const { error } = await supabase.from("children").delete().eq("id", id);
    if (error) {
      setError(error);
      toast("فشل حذف الطفل.", "danger");
      return;
    }
    toast("تم حذف الطفل.", "ok");
    await loadAll();
  }

  return (
    <div className="container page page--children" dir="rtl" lang="ar">
      <PageHeader
        title="الأطفال"
        subtitle="إدارة الأطفال"
        actions={
          <div className="toolbar">
            <input
              className="input"
              placeholder="ابحث بالاسم…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button className="btn primary" onClick={openCreate}>
              <Plus size={18} /> إضافة طفل
            </button>
          </div>
        }
      />

      <ErrorBanner error={error} />

      {loading ? (
        <div className="card">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title="لا يوجد أطفال"
          description=""
          actionLabel=""
          onAction={openCreate}
        />
      ) : (
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>رقم</th>
                <th>الاسم</th>
                <th>العمر</th>
                <th>الصف</th>
                <th>الجنس</th>
                <th>المدينة</th>
                <th>هاتف الأم</th>
                <th>هاتف الأب</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="muted">{r.id}</td>

                  <td style={{ fontWeight: 800 }}>
                    <button
                      className="linkBtn"
                      onClick={() => navigate(`/children/${r.id}`)}
                    >
                      {r.name}
                    </button>
                  </td>

                  <td>{r.age}</td>
                  <td className="muted">{r.class ?? "-"}</td>
                  <td className="muted">
                    {r.gender === "male" ? "ذكر" : "أنثى"}
                  </td>
                  <td className="muted">{r.country || "-"}</td>
                  <td className="muted">{r.mother_phone ?? "-"}</td>
                  <td className="muted">{r.father_phone ?? "-"}</td>
                  <td>
                    <div className="row">
                      <div className="actionsRow">
                        <IconButton title="تعديل" onClick={() => openEdit(r)}>
                          <Pencil size={18} />
                        </IconButton>

                        <IconButton
                          title="حذف"
                          variant="danger"
                          onClick={() =>
                            setConfirmDel({
                              open: true,
                              id: r.id,
                              name: r.name,
                            })
                          }
                        >
                          <Trash2 size={18} />
                        </IconButton>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={openForm}
        title={form.id ? "تعديل طفل" : "إضافة طفل"}
        onClose={() => {
          setOpenForm(false);
          setForm(emptyForm);
          setNewClassName("");
        }}
      >
        <form onSubmit={saveChild} className="grid">
          <div style={{ gridColumn: "span 6" }}>
            <div className="muted">الاسم *</div>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div style={{ gridColumn: "span 3" }}>
            <div className="muted">العمر *</div>
            <input
              className="input"
              type="number"
              min={0}
              step={1}
              value={form.age}
              onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))}
              placeholder="e.g. 6"
            />
          </div>

          <div style={{ gridColumn: "span 3" }}>
            <div className="muted">الجنس</div>
            <ModernSelect
              value={form.gender}
              onChange={(v) => setForm((p) => ({ ...p, gender: v }))}
              menuWidth="trigger"
              options={[
                { value: "male", label: "ذكر" },
                { value: "female", label: "أنثى" },
              ]}
            />
          </div>

          <div style={{ gridColumn: "span 4" }}>
            <div className="muted">الصف</div>
            <ModernSelect
              value={form.class}
              onChange={(v) => setForm((p) => ({ ...p, class: v }))}
              menuWidth="trigger"
              options={classSelectOptions}
              placeholder={
                classSelectOptions.length
                  ? "Select a class…"
                  : "No classes yet…"
              }
            />

            <div className="row" style={{ gap: 8, marginTop: 8 }}>
              <input
                className="input"
                placeholder="أضف صفًا جديدًا…"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
              />
              <button
                type="button"
                className="btn"
                onClick={addNewClass}
                disabled={addingClass}
              >
                {addingClass ? "جاري الإضافة..." : "إضافة"}
              </button>
            </div>
          </div>

          <div style={{ gridColumn: "span 8" }}>
            <div className="muted">المدينة</div>
            <ModernSelect
              value={form.country_id}
              onChange={(v) => setForm((p) => ({ ...p, country_id: v }))}
              menuWidth="trigger"
              options={(countries || []).map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              placeholder="اختر مدينة…"
            />

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input
                className="input"
                placeholder="أضف مدينة جديدة..."
                value={form.new_city}
                onChange={(e) =>
                  setForm((p) => ({ ...p, new_city: e.target.value }))
                }
              />
              <button
                type="button"
                className="btn"
                onClick={addNewCity}
                disabled={addingCity}
              >
                {addingCity ? "جاري الإضافة..." : "إضافة"}
              </button>
            </div>
          </div>

          <div style={{ gridColumn: "span 6" }}>
            <div className="muted">اسم الأم</div>
            <input
              className="input"
              value={form.mother_name}
              placeholder="e.g. Sarah"
              onChange={(e) =>
                setForm((p) => ({ ...p, mother_name: e.target.value }))
              }
            />
          </div>
          <div style={{ gridColumn: "span 6" }}>
            <div className="muted">هاتف الأم</div>
            <input
              className="input"
              value={form.mother_phone}
              placeholder="e.g. 050-1234567"
              onChange={(e) =>
                setForm((p) => ({ ...p, mother_phone: e.target.value }))
              }
            />
          </div>

          <div style={{ gridColumn: "span 6" }}>
            <div className="muted">اسم الأب</div>
            <input
              className="input"
              value={form.father_name}
              placeholder="e.g. Ahmad"
              onChange={(e) =>
                setForm((p) => ({ ...p, father_name: e.target.value }))
              }
            />
          </div>
          <div style={{ gridColumn: "span 6" }}>
            <div className="muted">هاتف الأب</div>
            <input
              className="input"
              value={form.father_phone}
              placeholder="e.g. 052-1234567"
              onChange={(e) =>
                setForm((p) => ({ ...p, father_phone: e.target.value }))
              }
            />
          </div>

          <div style={{ gridColumn: "span 12" }}>
            <div className="muted">ملاحظات (اختياري)</div>
            <textarea
              className="input"
              rows={3}
              placeholder="ملاحظات (اختياري)..."
              value={form.notes}
              onChange={(e) =>
                setForm((p) => ({ ...p, notes: e.target.value }))
              }
            />
          </div>

          <div className="row" style={{ gridColumn: "span 12" }}>
            <button className="btn primary" disabled={saving}>
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setOpenForm(false);
                setForm(emptyForm);
                setNewClassName("");
              }}
            >
              إلغاء
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDel.open}
        title="حذف"
        message={`حذف: ${confirmDel.name}`}
        confirmText="حذف"
        cancelText="إلغاء"
        danger
        onCancel={() => setConfirmDel({ open: false, id: null, name: "" })}
        onConfirm={async () => {
          const id = confirmDel.id;
          setConfirmDel({ open: false, id: null, name: "" });
          await deleteChild(id);
        }}
      />
    </div>
  );
}
