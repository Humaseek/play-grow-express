import React, { useEffect, useMemo, useState, useRef } from "react";
import { useOutletContext } from "react-router";
import { supabase } from "../supabaseClient";

import PageHeader from "../components/PageHeader";
import ErrorBanner from "../components/ErrorBanner";
import KpiCard from "../components/KpiCard";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import IconButton from "../components/IconButton";
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
  ChevronDown,
} from "lucide-react";

// --- دوال مساعدة ---
function fmtMoney(n) {
  const x = Number(n || 0);
  return x.toLocaleString("en", { maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

function isoDate(d) {
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

// --- Custom Combobox Component ---
function CustomCombobox({ value, onChange, options, placeholder, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter((o) =>
    (o.label || "").toLowerCase().includes((value || "").toLowerCase()),
  );

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <input
        className="input"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        style={{ width: "100%", paddingLeft: 36 }}
      />
      <ChevronDown
        size={16}
        style={{
          position: "absolute",
          left: 12,
          top: "50%",
          transform: `translateY(-50%) ${isOpen ? "rotate(180deg)" : "rotate(0deg)"}`,
          color: "#94a3b8",
          pointerEvents: "none",
          transition: "transform 0.2s ease",
        }}
      />
      {isOpen && filtered.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "#fff",
            border: "1px solid rgba(15,23,42,0.08)",
            borderRadius: "14px",
            maxHeight: "200px",
            overflowY: "auto",
            boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
            padding: "4px",
          }}
        >
          {filtered.map((opt, i) => (
            <div
              key={i}
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 600,
                color: "#334155",
                borderRadius: "10px",
                transition: "background 0.15s ease",
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(opt.value);
                setIsOpen(false);
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#f8fafc")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- CSS Styles ---
const EXPENSES_STYLES = `
.page--expenses {
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.05) 0%, #f4f6f8 300px);
  min-height: 100vh;
  padding-bottom: 40px;
}

.expenses-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.expenses-title {
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 54px;
  padding: 10px 24px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
  font-size: 24px;
  font-weight: 900;
  color: #0f172a;
}

.expenses-subtitle {
  font-size: 15px;
  font-weight: 700;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 8px;
}

.expenses-card {
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 22px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.03);
  overflow: hidden;
  margin-bottom: 20px;
}

.expenses-toolbar {
  padding: 20px 24px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f1f5f9;
  background: #f8fafc;
}

.filters-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.search-wrapper {
  position: relative;
  flex: 1 1 250px;
  max-width: 350px;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 42px;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  background: #fff;
  font-size: 14px;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}

.search-input:focus {
  outline: none;
  border-color: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
}

.filter-select {
  min-width: 160px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}

.modern-table {
  width: 100%;
  border-collapse: collapse;
  text-align: right;
}

.modern-table th {
  background: #fff;
  color: #64748b;
  font-weight: 800;
  font-size: 14px;
  padding: 16px 24px;
  border-bottom: 2px solid #f1f5f9;
  white-space: nowrap;
}

.modern-table td {
  padding: 16px 24px;
  border-bottom: 1px solid #f8fafc;
  color: #334155;
  font-size: 15px;
  vertical-align: middle;
  transition: background 0.15s ease;
}

.modern-table tr:hover td {
  background: #f8fafc;
}

.modern-table tr:last-child td {
  border-bottom: none;
}

.btn-add {
  background: #f59e0b !important;
  color: #fff !important;
  border: none !important;
  border-radius: 14px !important;
  padding: 10px 20px !important;
  font-weight: 800 !important;
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.2) !important;
  transition: all 0.2s !important;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-add:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.3) !important;
  background: #d97706 !important;
}

.actions-cell {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

.form-section-title {
  margin: 0 0 16px 0;
  color: #0f172a;
  font-size: 16px;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}
`;

export default function Expenses() {
  const { toast } = useOutletContext();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [hasTable, setHasTable] = useState(true);

  // Filters
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [partyFilter, setPartyFilter] = useState("all");

  const [rangePreset, setRangePreset] = useState("this_month");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Picklists
  const [catOptions, setCatOptions] = useState([]);
  const [partyOptions, setPartyOptions] = useState([]);
  const [hasPicklists, setHasPicklists] = useState(true);

  // Modal
  const [openAdd, setOpenAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [expDate, setExpDate] = useState(isoDate(new Date()));
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("");
  const [expParty, setExpParty] = useState("");
  const [expDesc, setExpDesc] = useState("");

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
      // تجاهل خطأ التكرار إذا كان العنصر موجود مسبقاً
      if (ins.error.code === "23505" || msg.includes("duplicate")) {
        return { ok: true };
      }
      return { ok: false };
    }
    return { ok: true };
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

    setSaving(true);
    try {
      // حفظ الفئة الجديدة إذا لم تكن موجودة
      if (expCategory?.trim()) {
        await safeInsertPicklist("expense_categories", expCategory);
      }
      // حفظ اسم الشخص/المتجر الجديد إذا لم يكن موجود
      if (expParty?.trim()) {
        await safeInsertPicklist("expense_parties", expParty);
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
        if (up.error) throw up.error;
        toast("تم تعديل المصروف.", "ok");
      } else {
        const ins = await supabase.from("expenses").insert([payload]);
        if (ins.error) throw ins.error;
        toast("تم حفظ المصروف.", "ok");
      }

      setOpenAdd(false);
      await load();
      await loadPicklists();
    } catch (e) {
      setError(e);
      toast("فشل حفظ المصروف.", "danger");
    } finally {
      setSaving(false);
    }
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
    <div className="page page--expenses" dir="rtl" lang="ar">
      <style>{EXPENSES_STYLES}</style>
      <div className="container">
        {/* رأس الصفحة */}
        <div className="expenses-header">
          <div className="expenses-title">المصروفات</div>
          <div className="expenses-subtitle">
            <span style={{ color: "#cbd5e1" }}>|</span>
            <CalendarDays size={16} /> النطاق: {rangeHint}
          </div>
        </div>

        {error && <ErrorBanner error={error} />}

        {!hasTable ? (
          <div className="expenses-card">
            <EmptyState
              icon={AlertTriangle}
              title="جدول المصروفات غير موجود"
              description="جدول المصروفات غير موجود في قاعدة البيانات. شغّل ملفات الـ SQL ثم حدّث الصفحة."
            />
          </div>
        ) : (
          <>
            {/* بطاقات الإحصائيات */}
            <div className="kpiGrid4" style={{ marginBottom: 20 }}>
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
                  stats.topCat !== "—"
                    ? `${fmtMoney(stats.topCatTotal)} ₪`
                    : "—"
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

            {/* الجدول والفلاتر */}
            <div className="expenses-card">
              <div className="expenses-toolbar">
                <div className="filters-group">
                  <div className="search-wrapper">
                    <Search size={18} className="search-icon" />
                    <input
                      className="search-input"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="ابحث في المصروفات..."
                    />
                  </div>

                  <div className="filter-select">
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
                  </div>

                  <div className="filter-select">
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
                  </div>

                  <div className="filter-select">
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
                  </div>

                  {rangePreset === "custom" && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        className="search-input"
                        style={{ padding: "10px 16px", maxWidth: "140px" }}
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                      />
                      <input
                        className="search-input"
                        style={{ padding: "10px 16px", maxWidth: "140px" }}
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                      />
                      <button className="btn" onClick={load}>
                        تطبيق
                      </button>
                    </div>
                  )}
                </div>

                <button className="btn btn-add" onClick={openCreate}>
                  <Plus size={18} /> إضافة مصروف
                </button>
              </div>

              {loading ? (
                <div
                  style={{ padding: 40, textAlign: "center", color: "#64748b" }}
                >
                  جارٍ التحميل...
                </div>
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
                <div style={{ overflowX: "auto" }}>
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th style={{ width: 140 }}>التاريخ</th>
                        <th>الفئة</th>
                        <th>شخص/المتجر</th>
                        <th>الوصف</th>
                        <th style={{ width: 120 }}>المبلغ</th>
                        <th style={{ width: 100, textAlign: "center" }}>
                          إجراءات
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r) => (
                        <tr key={r.id}>
                          <td style={{ color: "#64748b", fontWeight: 600 }}>
                            {fmtDate(r.spent_on)}
                          </td>
                          <td style={{ fontWeight: 700 }}>
                            {r.category || <span className="muted">—</span>}
                          </td>
                          <td>{r.party || <span className="muted">—</span>}</td>
                          <td style={{ color: "#64748b", minWidth: 200 }}>
                            {r.description || <span className="muted">—</span>}
                          </td>
                          <td style={{ fontWeight: 900, color: "#0f172a" }}>
                            {fmtMoney(r.amount)} ₪
                          </td>
                          <td>
                            <div className="actions-cell">
                              <IconButton
                                title="تعديل"
                                onClick={() => openEdit(r)}
                                icon={Pencil}
                              />
                              <IconButton
                                title="حذف"
                                onClick={() =>
                                  setConfirm({ open: true, id: r.id })
                                }
                                icon={Trash2}
                                danger
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Modal الإضافة والتعديل */}
        <Modal
          open={openAdd}
          title={editId ? "تعديل مصروف" : "إضافة مصروف"}
          onClose={() => !saving && setOpenAdd(false)}
        >
          <div className="grid" style={{ gap: "20px", padding: "10px 0" }}>
            <div style={{ gridColumn: "span 12" }}>
              <h4 className="form-section-title">
                <Receipt size={18} color="#64748b" /> تفاصيل المصروف
              </h4>
              <div className="grid" style={{ gap: "16px" }}>
                <div style={{ gridColumn: "span 6" }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    التاريخ *
                  </div>
                  <input
                    className="input"
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                  />
                </div>

                <div style={{ gridColumn: "span 6" }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    المبلغ (₪) *
                  </div>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    placeholder="مثال: 150"
                  />
                </div>

                <div style={{ gridColumn: "span 6" }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    الفئة
                  </div>
                  <CustomCombobox
                    value={expCategory}
                    onChange={setExpCategory}
                    options={categories.map((c) => ({ value: c, label: c }))}
                    placeholder="اختر أو اكتب فئة جديدة..."
                  />
                </div>

                <div style={{ gridColumn: "span 6" }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    شخص / المتجر
                  </div>
                  <CustomCombobox
                    value={expParty}
                    onChange={setExpParty}
                    options={parties.map((p) => ({ value: p, label: p }))}
                    placeholder="اختر أو اكتب شخص/متجر..."
                  />
                </div>

                <div style={{ gridColumn: "span 12" }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    الوصف (اختياري)
                  </div>
                  <input
                    className="input"
                    value={expDesc}
                    onChange={(e) => setExpDesc(e.target.value)}
                    placeholder="مثال: شراء ضيافة للطلاب..."
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                gridColumn: "span 12",
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 10,
              }}
            >
              <button
                className="btn"
                onClick={() => setOpenAdd(false)}
                disabled={saving}
              >
                إلغاء
              </button>
              <button
                className="btn btn-add"
                onClick={saveExpense}
                disabled={saving}
              >
                {saving ? "جاري الحفظ..." : "حفظ البيانات"}
              </button>
            </div>
          </div>
        </Modal>

        {/* حوار التأكيد للحذف */}
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
    </div>
  );
}
