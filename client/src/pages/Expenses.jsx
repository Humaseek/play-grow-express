import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import { supabase } from "../supabaseClient";

import PageHeader from "../components/PageHeader";
import ErrorBanner from "../components/ErrorBanner";
import KpiCard from "../components/KpiCard";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import IconButton from "../components/IconButton";
import Control from "../components/Control";
import ModernSelect from "../components/ModernSelect";

import {
  Receipt,
  CalendarDays,
  Banknote,
  Layers,
  Plus,
  Trash2,
  Pencil,
  Search,
  Filter,
  AlertTriangle,
} from "lucide-react";

function fmtMoney(n) {
  const x = Number(n || 0);
  return x.toLocaleString("en", { maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("en", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function isoDate(d) {
  // YYYY-MM-DD
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const da = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function startOfMonth(d = new Date()) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function uniqSorted(list) {
  const s = new Set();
  for (const v of list) {
    const x = String(v || "").trim();
    if (x) s.add(x);
  }
  return Array.from(s).sort((a, b) => a.localeCompare(b, "en"));
}

export default function Expenses() {
  const { toast } = useOutletContext();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasTable, setHasTable] = useState(true);

  // Filters
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [partyFilter, setPartyFilter] = useState("all");

  const [rangePreset, setRangePreset] = useState("this_month");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Picklists (dropdown options saved in DB)
  const [catOptions, setCatOptions] = useState([]);
  const [partyOptions, setPartyOptions] = useState([]);
  const [hasPicklists, setHasPicklists] = useState(true);

  // Modal/form
  const [openAdd, setOpenAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [expDate, setExpDate] = useState(isoDate(new Date()));
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("");
  const [expParty, setExpParty] = useState("");
  const [expDesc, setExpDesc] = useState("");

  const [newCatName, setNewCatName] = useState("");
  const [newPartyName, setNewPartyName] = useState("");

  const [confirm, setConfirm] = useState({ open: false, id: null });

  function computeRange() {
    if (rangePreset === "all") return { from: null, to: null };
    const now = new Date();

    if (rangePreset === "this_month") {
      const from = startOfMonth(now);
      const to = addDays(new Date(from), 32);
      to.setDate(1);
      to.setHours(0, 0, 0, 0);
      return { from: isoDate(from), to: isoDate(addDays(to, -1)) };
    }

    if (rangePreset === "30d") {
      const from = addDays(now, -30);
      return { from: isoDate(from), to: isoDate(now) };
    }

    if (rangePreset === "custom") {
      if (!fromDate || !toDate) return { from: null, to: null };
      return { from: fromDate, to: toDate };
    }

    return { from: null, to: null };
  }

  async function loadPicklists() {
    // These tables are created by: 20260215_expenses_add_party_and_picklists.sql
    // If they don't exist, we'll fallback to deriving options from rows.
    setHasPicklists(true);

    const [catsRes, partiesRes] = await Promise.all([
      supabase
        .from("expense_categories")
        .select("name")
        .order("name", { ascending: true }),
      supabase
        .from("expense_parties")
        .select("name")
        .order("name", { ascending: true }),
    ]);

    const anyErr = catsRes.error || partiesRes.error;
    if (anyErr) {
      const msg = String(anyErr.message || "").toLowerCase();
      if (msg.includes("does not exist")) {
        setHasPicklists(false);
        setCatOptions([]);
        setPartyOptions([]);
        return;
      }
      // For other errors (RLS), show error but keep working
      setError(anyErr);
      setHasPicklists(false);
      setCatOptions([]);
      setPartyOptions([]);
      return;
    }

    setCatOptions((catsRes.data || []).map((x) => x.name).filter(Boolean));
    setPartyOptions((partiesRes.data || []).map((x) => x.name).filter(Boolean));
  }

  async function load() {
    setLoading(true);
    setError(null);

    const { from, to } = computeRange();

    let query = supabase
      .from("expenses")
      .select("id,spent_on,amount,category,party,description,created_at")
      .order("spent_on", { ascending: false })
      .order("id", { ascending: false });

    if (from) query = query.gte("spent_on", from);
    if (to) query = query.lte("spent_on", to);

    const res = await query;

    if (res.error) {
      const msg = String(res.error.message || "");
      if (msg.toLowerCase().includes("does not exist")) {
        setHasTable(false);
      }
      setError(res.error);
      setRows([]);
      setLoading(false);
      return;
    }

    setHasTable(true);
    setRows(res.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangePreset]);

  useEffect(() => {
    loadPicklists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fallback: derive from rows if picklist tables missing
  const categories = useMemo(() => {
    if (hasPicklists && catOptions.length) return uniqSorted(catOptions);
    return uniqSorted(rows.map((r) => r.category));
  }, [hasPicklists, catOptions, rows]);

  const parties = useMemo(() => {
    if (hasPicklists && partyOptions.length) return uniqSorted(partyOptions);
    return uniqSorted(rows.map((r) => r.party));
  }, [hasPicklists, partyOptions, rows]);

  const filtered = useMemo(() => {
    let list = [...rows];

    const s = q.trim().toLowerCase();
    if (s) {
      list = list.filter((r) => {
        const a = String(r.category || "").toLowerCase();
        const b = String(r.party || "").toLowerCase();
        const c = String(r.description || "").toLowerCase();
        return a.includes(s) || b.includes(s) || c.includes(s);
      });
    }

    if (cat !== "all")
      list = list.filter((r) => String(r.category || "") === cat);
    if (partyFilter !== "all")
      list = list.filter((r) => String(r.party || "") === partyFilter);

    return list;
  }, [rows, q, cat, partyFilter]);

  const rangeHint = useMemo(() => {
    if (rangePreset === "custom") {
      const a = fromDate ? new Date(fromDate).toLocaleDateString("en") : "—";
      const b = toDate ? new Date(toDate).toLocaleDateString("en") : "—";
      return `${a} → ${b}`;
    }
    if (rangePreset === "this_month") return "هذا الشهر";
    if (rangePreset === "30d") return "آخر 30 يوم";
    if (rangePreset === "all") return "كل الوقت";
    return "هذا الشهر";
  }, [rangePreset, fromDate, toDate]);

  const stats = useMemo(() => {
    const total = filtered.reduce((acc, r) => acc + Number(r.amount || 0), 0);
    const count = filtered.length;
    const avg = count === 0 ? 0 : total / count;
    const max = filtered.reduce(
      (m, r) => Math.max(m, Number(r.amount || 0)),
      0,
    );

    const byCat = new Map();
    for (const r of filtered) {
      const c = (r.category || " ").trim() || " ";
      byCat.set(c, (byCat.get(c) || 0) + Number(r.amount || 0));
    }
    const top = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1])[0];

    return {
      total,
      count,
      avg,
      max,
      topCat: top ? top[0] : "—",
      topCatTotal: top ? top[1] : 0,
    };
  }, [filtered]);

  function resetForm() {
    setExpDate(isoDate(new Date()));
    setExpAmount("");
    setExpCategory("");
    setExpParty("");
    setExpDesc("");
    setNewCatName("");
    setNewPartyName("");
    setEditId(null);
  }

  function openCreate() {
    resetForm();
    setOpenAdd(true);
  }

  function openEdit(row) {
    setEditId(row.id);
    setExpDate(row.spent_on ? String(row.spent_on) : isoDate(new Date()));
    setExpAmount(String(row.amount ?? ""));
    setExpCategory(String(row.category ?? ""));
    setExpParty(String(row.party ?? ""));
    setExpDesc(String(row.description ?? ""));
    setOpenAdd(true);
  }

  async function safeInsertPicklist(tableName, rawName) {
    const name = String(rawName || "").trim();
    if (!name) return { ok: false };

    const ins = await supabase.from(tableName).insert([{ name }]);

    if (ins.error) {
      const msg = String(ins.error.message || "").toLowerCase();
      // ignore duplicates
      if (ins.error.code === "23505" || msg.includes("duplicate")) {
        return { ok: true };
      }
      setError(ins.error);
      return { ok: false };
    }
    return { ok: true };
  }

  async function addNewCategory() {
    const name = newCatName.trim();
    if (!name) return;

    const r = await safeInsertPicklist("expense_categories", name);
    if (!r.ok) {
      toast("فشل إضافة الفئة.", "danger");
      return;
    }

    await loadPicklists();
    setExpCategory(name);
    setNewCatName("");
    toast("تم إضافة الفئة.", "ok");
  }

  async function addNewParty() {
    const name = newPartyName.trim();
    if (!name) return;

    const r = await safeInsertPicklist("expense_parties", name);
    if (!r.ok) {
      toast("فشل إضافة شخص/المتجر.", "danger");
      return;
    }

    await loadPicklists();
    setExpParty(name);
    setNewPartyName("");
    toast("تم إضافة شخص/المتجر.", "ok");
  }

  async function saveExpense() {
    const amount = Number(expAmount);
    if (!expDate) {
      toast("الرجاء اختيار التاريخ.", "warn");
      return;
    }
    if (!amount || amount <= 0) {
      toast("الرجاء إدخال مبلغ صحيح.", "warn");
      return;
    }

    const payload = {
      spent_on: expDate,
      amount,
      category: expCategory?.trim() || null,
      party: expParty?.trim() || null,
      description: expDesc?.trim() || null,
    };

    if (editId) {
      const up = await supabase
        .from("expenses")
        .update(payload)
        .eq("id", editId);
      if (up.error) {
        setError(up.error);
        toast("فشل تعديل المصروف.", "danger");
        return;
      }
      toast("تم تعديل المصروف.", "ok");
    } else {
      const ins = await supabase.from("expenses").insert([payload]);
      if (ins.error) {
        setError(ins.error);
        toast("فشل حفظ المصروف.", "danger");
        return;
      }
      toast("تم حفظ المصروف.", "ok");
    }

    setOpenAdd(false);
    await load();
    await loadPicklists();
  }

  async function deleteExpense(id) {
    const d = await supabase.from("expenses").delete().eq("id", id);
    if (d.error) {
      setError(d.error);
      toast("فشل حذف المصروف.", "danger");
      return;
    }
    toast("تم حذف المصروف.", "ok");
    await load();
  }

  return (
    <div className="container page page--expenses" dir="rtl" lang="ar">
      <PageHeader
        title="المصروفات"
        subtitle={`النطاق: ${rangeHint}`}
        actions={
          <div className="toolbar">
            <button className="btn" onClick={load}>
              تحديث
            </button>
            <button className="btn primary" onClick={openCreate}>
              <Plus size={18} /> إضافة مصروف
            </button>
          </div>
        }
      />

      <ErrorBanner error={error} />

      {!hasTable ? (
        <div className="card">
          <EmptyState
            icon={AlertTriangle}
            title="جدول المصروفات غير موجود"
            description="جدول المصروفات غير موجود في قاعدة البيانات. شغّل ملفات الـ SQL ثم حدّث الصفحة."
          />
        </div>
      ) : (
        <>
          <div className="kpiGrid4" style={{ marginBottom: 14 }}>
            <KpiCard
              icon={Receipt}
              label="إجمالي المصروف"
              value={`${fmtMoney(stats.total)} ₪`}
              hint={
                stats.count
                  ? `${stats.count} ${stats.count === 1 ? "مصروف" : "مصروفات"}`
                  : "لا توجد مصروفات"
              }
              variant={stats.total === 0 ? "neutral" : "warn"}
              className="kpi--accent"
            />

            <KpiCard
              icon={Layers}
              label="أعلى فئة"
              value={stats.topCat}
              hint={
                stats.topCat !== "—" ? `${fmtMoney(stats.topCatTotal)} ₪` : "—"
              }
              variant={stats.topCat !== "—" ? "info" : "neutral"}
              className="kpi--accent"
            />

            <KpiCard
              icon={Banknote}
              label="متوسط المصروف"
              value={`${fmtMoney(stats.avg)} ₪`}
              hint={stats.count ? "متوسط لكل مصروف" : "—"}
              variant={stats.avg === 0 ? "neutral" : "info"}
              className="kpi--accent"
            />

            <KpiCard
              icon={Banknote}
              label="أكبر مصروف"
              value={`${fmtMoney(stats.max)} ₪`}
              hint={stats.max === 0 ? "—" : "أكبر مصروف منفرد"}
              variant={stats.max === 0 ? "neutral" : "danger"}
              className="kpi--accent"
            />
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            <div
              className="toolbar"
              style={{ justifyContent: "space-between" }}
            >
              <div className="filtersBar">
                <Control
                  icon={Search}
                  className=""
                  style={{ minWidth: 260, width: "auto", flex: "1 1 320px" }}
                >
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="ابحث في المصروفات..."
                  />
                </Control>

                <Control
                  icon={Filter}
                  style={{ minWidth: 180, width: "auto", flex: "0 0 auto" }}
                >
                  <ModernSelect
                    bare
                    value={cat}
                    onChange={setCat}
                    placeholder="كل الفئات"
                    options={[
                      { value: "all", label: "كل الفئات" },
                      ...categories.map((c) => ({ value: c, label: c })),
                    ]}
                  />
                </Control>

                <Control
                  icon={Filter}
                  style={{ minWidth: 180, width: "auto", flex: "0 0 auto" }}
                >
                  <ModernSelect
                    bare
                    value={partyFilter}
                    onChange={setPartyFilter}
                    placeholder="كل الأشخاص"
                    options={[
                      { value: "all", label: "كل الأشخاص" },
                      ...parties.map((p) => ({ value: p, label: p })),
                    ]}
                  />
                </Control>

                <Control
                  icon={CalendarDays}
                  style={{ minWidth: 180, width: "auto", flex: "0 0 auto" }}
                >
                  <ModernSelect
                    bare
                    value={rangePreset}
                    onChange={setRangePreset}
                    placeholder="هذا الشهر"
                    options={[
                      { value: "this_month", label: "هذا الشهر" },
                      { value: "30d", label: "آخر 30 يوم" },
                      { value: "custom", label: "نطاق مخصص" },
                      { value: "all", label: "كل الوقت" },
                    ]}
                  />
                </Control>

                {rangePreset === "custom" ? (
                  <div
                    className="filtersBar"
                    style={{ justifyContent: "flex-start" }}
                  >
                    <div className="input">
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                      />
                    </div>
                    <div className="input">
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                      />
                    </div>
                    <button className="btn" onClick={load}>
                      Apply
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="card">جارٍ التحميل...</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={
                rows.length === 0 ? "لا توجد مصروفات بعد" : "لا توجد نتائج"
              }
              description={
                rows.length === 0
                  ? "أضف أول مصروف للبدء بالتتبع."
                  : "جرّب تغيير البحث أو الفلاتر."
              }
              actionLabel="إضافة مصروف"
              onAction={openCreate}
            />
          ) : (
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>الفئة</th>
                    <th>شخص/المتجر</th>
                    <th>الوصف</th>
                    <th>المبلغ</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {fmtDate(r.spent_on)}
                      </td>
                      <td>{r.category || <span className="muted">—</span>}</td>
                      <td>{r.party || <span className="muted">—</span>}</td>
                      <td style={{ minWidth: 260 }}>
                        {r.description || <span className="muted">—</span>}
                      </td>
                      <td style={{ fontWeight: 950, whiteSpace: "nowrap" }}>
                        {fmtMoney(r.amount)} ₪
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <div
                          className="row"
                          style={{ justifyContent: "flex-end" }}
                        >
                          <IconButton
                            title="تعديل"
                            onClick={() => openEdit(r)}
                            icon={Pencil}
                            variant="soft"
                          />
                          <IconButton
                            title="حذف"
                            onClick={() => setConfirm({ open: true, id: r.id })}
                            icon={Trash2}
                            variant="danger"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <Modal
        open={openAdd}
        title={editId ? "تعديل مصروف" : "إضافة مصروف"}
        onClose={() => setOpenAdd(false)}
      >
        <div className="card" style={{ border: "none", boxShadow: "none" }}>
          {!hasPicklists ? (
            <div
              className="muted"
              style={{ marginBottom: 10, lineHeight: 1.4 }}
            >
              ملاحظة: جداول الخيارات غير موجودة. شغّل ملف الـ SQL ثم حدّث
              الصفحة.
            </div>
          ) : null}

          <div className="grid" style={{ marginBottom: 12 }}>
            <div style={{ gridColumn: "span 4" }}>
              <div className="label">التاريخ</div>
              <div className="input">
                <input
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    outline: "none",
                  }}
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                />
              </div>
            </div>

            <div style={{ gridColumn: "span 4" }}>
              <div className="label">المبلغ (₪)</div>
              <div className="input">
                <input
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    outline: "none",
                  }}
                  type="number"
                  min="0"
                  step="0.01"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  placeholder="e.g. 120"
                />
              </div>
            </div>

            <div style={{ gridColumn: "span 4" }}>
              <div className="label">الفئة</div>
              <div className="input">
                <ModernSelect
                  bare
                  value={expCategory || ""}
                  onChange={setExpCategory}
                  placeholder="اختر فئة..."
                  options={[
                    { value: "", label: "—" },
                    ...categories.map((c) => ({ value: c, label: c })),
                  ]}
                />
              </div>

              <div className="row" style={{ gap: 10, marginTop: 10 }}>
                <div className="input" style={{ flex: 1 }}>
                  <input
                    style={{
                      width: "100%",
                      border: "none",
                      background: "transparent",
                      outline: "none",
                    }}
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="إضافة فئة جديدة..."
                  />
                </div>
                <button
                  className="btn"
                  onClick={addNewCategory}
                  disabled={!newCatName.trim()}
                >
                  Add
                </button>
              </div>
            </div>

            <div style={{ gridColumn: "span 4" }}>
              <div className="label">شخص/متجر</div>
              <div className="input">
                <ModernSelect
                  bare
                  value={expParty || ""}
                  onChange={setExpParty}
                  placeholder="اختر شخص/متجر..."
                  options={[
                    { value: "", label: "—" },
                    ...parties.map((p) => ({ value: p, label: p })),
                  ]}
                />
              </div>

              <div className="row" style={{ gap: 10, marginTop: 10 }}>
                <div className="input" style={{ flex: 1 }}>
                  <input
                    style={{
                      width: "100%",
                      border: "none",
                      background: "transparent",
                      outline: "none",
                    }}
                    value={newPartyName}
                    onChange={(e) => setNewPartyName(e.target.value)}
                    placeholder="إضافة شخص/متجر جديد..."
                  />
                </div>
                <button
                  className="btn"
                  onClick={addNewParty}
                  disabled={!newPartyName.trim()}
                >
                  Add
                </button>
              </div>
            </div>

            <div style={{ gridColumn: "span 8" }}>
              <div className="label">الوصف</div>
              <div className="input">
                <input
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    outline: "none",
                  }}
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  placeholder="e.g. taxi, supplies, rent..."
                />
              </div>
            </div>
          </div>

          <div className="row" style={{ gap: 10 }}>
            <button className="btn primary" onClick={saveExpense}>
              <Plus size={18} /> حفظ
            </button>
            <button className="btn" onClick={() => setOpenAdd(false)}>
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        title="حذف مصروف"
        message="هل أنت متأكد أنك تريد حذف هذا المصروف؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="حذف"
        cancelText="إلغاء"
        danger
        onCancel={() => setConfirm({ open: false, id: null })}
        onConfirm={async () => {
          const id = confirm.id;
          setConfirm({ open: false, id: null });
          if (id) await deleteExpense(id);
        }}
      />
    </div>
  );
}
