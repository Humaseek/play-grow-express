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
  birth_date: "",
  class: "",
  gender: "male",
  country_id: "",
  new_country: "",
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [q, setQ] = useState("");

  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [confirmDel, setConfirmDel] = useState({
    open: false,
    id: null,
    name: "",
  });

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [cRes, chRes] = await Promise.all([
        supabase
          .from("countries")
          .select("id,name")
          .order("name", { ascending: true }),
        supabase
          .from("children_view")
          .select("*")
          .order("id", { ascending: false }),
      ]);

      if (cRes.error) throw cRes.error;
      if (chRes.error) throw chRes.error;

      setCountries(cRes.data ?? []);
      setRows(chRes.data ?? []);
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

  function openCreate() {
    setForm(emptyForm);
    setOpenForm(true);
  }

  function openEdit(r) {
    const match = countries.find((c) => c.name === r.country);
    setForm({
      id: r.id,
      name: r.name ?? "",
      birth_date: r.birth_date ?? "",
      class: r.class ?? "",
      gender: r.gender ?? "male",
      country_id: match ? String(match.id) : "",
      new_country: "",
      mother_name: r.mother_name ?? "",
      mother_phone: r.mother_phone ?? "",
      father_name: r.father_name ?? "",
      father_phone: r.father_phone ?? "",
      notes: r.notes ?? "",
    });
    setOpenForm(true);
  }

  async function upsertCountryIfNeeded() {
    const hasSelected = !!form.country_id;
    if (hasSelected) return Number(form.country_id);

    const name = (form.new_country ?? "").trim();
    if (!name) return null;

    const { data, error } = await supabase
      .from("countries")
      .upsert([{ name }], { onConflict: "name" })
      .select("id")
      .single();

    if (error) throw error;
    return data?.id ?? null;
  }

  async function saveChild(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const countryId = await upsertCountryIfNeeded();

      const payload = {
        name: form.name.trim(),
        birth_date: form.birth_date,
        class: form.class.trim() || null,
        gender: form.gender,
        country_id: countryId,

        mother_name: form.mother_name.trim() || null,
        mother_phone: form.mother_phone.trim() || null,
        father_name: form.father_name.trim() || null,
        father_phone: form.father_phone.trim() || null,
        notes: form.notes.trim() || null,
      };

      if (!payload.name || !payload.birth_date) {
        toast("الاسم وتاريخ الميلاد مطلوبين.", "warn");
        setSaving(false);
        return;
      }

      if (form.id) {
        const { error } = await supabase
          .from("children")
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
        toast("تم تعديل بيانات الطفل.", "ok");
      } else {
        const { error } = await supabase.from("children").insert([payload]);
        if (error) throw error;
        toast("تم إضافة الطفل.", "ok");
      }

      setOpenForm(false);
      setForm(emptyForm);
      await loadAll();
    } catch (e2) {
      setError(e2);
      toast("فشل الحفظ.", "danger");
    } finally {
      setSaving(false);
    }
  }

  async function deleteChild(id) {
    setError(null);
    const { error } = await supabase.from("children").delete().eq("id", id);
    if (error) {
      setError(error);
      toast("فشل الحذف.", "danger");
      return;
    }
    toast("تم حذف الطفل.", "ok");
    await loadAll();
  }

  return (
    <div className="container page page--children">
      <PageHeader
  title="الأطفال"
  subtitle="بحث سريع + إدارة بيانات الأطفال"
  actions={
    <div className="toolbar">
      <input
        className="input"
        placeholder="بحث بالاسم أو الهاتف..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <button className="btn primary" onClick={openCreate}>
        <Plus size={18} /> طفل
      </button>
    </div>
  }
/>

<ErrorBanner error={error} />

      {loading ? (
        <div className="card">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={UserRound} title="لا يوجد أطفال بعد" description="ابدأ بإضافة أول طفل حتى تتمكن من تسجيله في حصص أو دفعات." actionLabel="إضافة طفل" onAction={openCreate} />
      ) : (
        <div className="tableWrap">
          <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>الاسم</th>
              <th>العمر</th>
              <th>الصف</th>
              <th>الجنس</th>
              <th>البلد</th>
              <th>هاتف الأم</th>
              <th>هاتف الأب</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="muted">{r.id}</td>

                {/* ✅ الاسم يفتح ملف الطفل */}
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
                          setConfirmDel({ open: true, id: r.id, name: r.name })
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
            <div className="muted">تاريخ الميلاد *</div>
            <input
              className="input"
              type="date"
              value={form.birth_date}
              onChange={(e) =>
                setForm((p) => ({ ...p, birth_date: e.target.value }))
              }
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
            <input
              className="input"
              value={form.class}
              onChange={(e) =>
                setForm((p) => ({ ...p, class: e.target.value }))
              }
            />
          </div>

          <div style={{ gridColumn: "span 4" }}>
            <div className="muted">البلد (اختيار)</div>
            <ModernSelect
              value={form.country_id}
              onChange={(v) => setForm((p) => ({ ...p, country_id: v }))}
              menuWidth="trigger"
              options={(countries || []).map((c) => ({ value: c.id, label: c.name }))}
              placeholder="اختر الدولة"
/>
          </div>

          <div style={{ gridColumn: "span 4" }}>
            <div className="muted">أو بلد جديد</div>
            <input
              className="input"
              value={form.new_country}
              onChange={(e) =>
                setForm((p) => ({ ...p, new_country: e.target.value }))
              }
            />
          </div>

          <div style={{ gridColumn: "span 6" }}>
            <div className="muted">اسم الأم</div>
            <input
              className="input"
              value={form.mother_name}
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
              onChange={(e) =>
                setForm((p) => ({ ...p, father_phone: e.target.value }))
              }
            />
          </div>

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
              {saving ? "جاري الحفظ..." : "حفظ"}
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
        title="حذف طفل"
        message={`هل تريد حذف الطفل: ${confirmDel.name} ؟`}
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
