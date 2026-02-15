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
      new_country: "",
      mother_name: r.mother_name ?? "",
      mother_phone: r.mother_phone ?? "",
      father_name: r.father_name ?? "",
      father_phone: r.father_phone ?? "",
      notes: r.notes ?? "",
    });
    setNewClassName("");
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

  async function saveChild(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const countryId = await upsertCountryIfNeeded();

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
        toast("Name and age are required.", "warn");
        setSaving(false);
        return;
      }

      if (form.id) {
        const { error } = await supabase
          .from("children")
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
        toast("Edit.", "ok");
      } else {
        const { error } = await supabase.from("children").insert([payload]);
        if (error) throw error;
        toast("Add.", "ok");
      }

      setOpenForm(false);
      setForm(emptyForm);
      setNewClassName("");
      await loadAll();
    } catch (e2) {
      setError(e2);
      toast("Failed to save child.", "danger");
    } finally {
      setSaving(false);
    }
  }

  async function deleteChild(id) {
    setError(null);
    const { error } = await supabase.from("children").delete().eq("id", id);
    if (error) {
      setError(error);
      toast("Failed to delete child.", "danger");
      return;
    }
    toast("Child deleted.", "ok");
    await loadAll();
  }

  return (
    <div className="container page page--children">
      <PageHeader
        title="Children"
        subtitle="Manage children"
        actions={
          <div className="toolbar">
            <input
              className="input"
              placeholder="Search by name…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button className="btn primary" onClick={openCreate}>
              <Plus size={18} /> Add child
            </button>
          </div>
        }
      />

      <ErrorBanner error={error} />

      {loading ? (
        <div className="card">Loading...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title="No children found"
          description="Add a child to start enrolling."
          actionLabel="Add child"
          onAction={openCreate}
        />
      ) : (
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Age</th>
                <th>Class</th>
                <th>Gender</th>
                <th>City</th>
                <th>Mother phone</th>
                <th>Father phone</th>
                <th>Actions</th>
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
                    {r.gender === "male" ? "Male" : "Female"}
                  </td>
                  <td className="muted">{r.country || "-"}</td>
                  <td className="muted">{r.mother_phone ?? "-"}</td>
                  <td className="muted">{r.father_phone ?? "-"}</td>
                  <td>
                    <div className="row">
                      <div className="actionsRow">
                        <IconButton title="Edit" onClick={() => openEdit(r)}>
                          <Pencil size={18} />
                        </IconButton>

                        <IconButton
                          title="Delete"
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
        title={form.id ? "Edit child" : "Add child"}
        onClose={() => {
          setOpenForm(false);
          setForm(emptyForm);
          setNewClassName("");
        }}
      >
        <form onSubmit={saveChild} className="grid">
          <div style={{ gridColumn: "span 6" }}>
            <div className="muted">Name *</div>
            <input
              className="input"
              value={form.name}
              onChange={(e) =>
                setForm((p) => ({ ...p, name: e.target.value }))
              }
            />
          </div>

          <div style={{ gridColumn: "span 3" }}>
            <div className="muted">Age *</div>
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
            <div className="muted">Gender</div>
            <ModernSelect
              value={form.gender}
              onChange={(v) => setForm((p) => ({ ...p, gender: v }))}
              menuWidth="trigger"
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
              ]}
            />
          </div>

          <div style={{ gridColumn: "span 4" }}>
            <div className="muted">Class</div>
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
                placeholder="Add new class…"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
              />
              <button
                type="button"
                className="btn"
                onClick={addNewClass}
                disabled={addingClass}
              >
                {addingClass ? "Adding..." : "Add"}
              </button>
            </div>
            <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
              * أي Class بتضيفه هون بينحفظ وبيطلعلك بكل المرات الجاي.
            </div>
          </div>

          <div style={{ gridColumn: "span 4" }}>
            <div className="muted">City</div>
            <ModernSelect
              value={form.country_id}
              onChange={(v) => setForm((p) => ({ ...p, country_id: v }))}
              menuWidth="trigger"
              options={(countries || []).map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              placeholder="Select a country…"
            />
          </div>

          <div style={{ gridColumn: "span 4" }}>
            <div className="muted">New country (optional)</div>
            <input
              className="input"
              value={form.new_country}
              placeholder="e.g. Israel"
              onChange={(e) =>
                setForm((p) => ({ ...p, new_country: e.target.value }))
              }
            />
          </div>

          <div style={{ gridColumn: "span 6" }}>
            <div className="muted">Mother name</div>
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
            <div className="muted">Mother phone</div>
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
            <div className="muted">Father name</div>
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
            <div className="muted">Father phone</div>
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
            <div className="muted">Notes (optional)</div>
            <textarea
              className="input"
              rows={3}
              placeholder="Optional notes..."
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>

          <div className="row" style={{ gridColumn: "span 12" }}>
            <button className="btn primary" disabled={saving}>
              {saving ? " Save..." : "Save"}
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
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDel.open}
        title="Delete "
        message={` Delete : ${confirmDel.name} `}
        confirmText="Delete"
        cancelText="Cancel"
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
