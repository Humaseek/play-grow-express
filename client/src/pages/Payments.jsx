import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

import PageHeader from "../components/PageHeader";
import ErrorBanner from "../components/ErrorBanner";
import KpiCard from "../components/KpiCard";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import IconButton from "../components/IconButton";
import ModernSelect from "../components/ModernSelect";
import { fmtDateTime24 } from "../utils/datetime";

import {
  CreditCard,
  Banknote,
  CalendarDays,
  UserRound,
  Plus,
  Trash2,
  Search,
  Filter,
  AlertTriangle,
} from "lucide-react";

// --- دوال مساعدة ---
function fmtMoney(n) {
  const x = Number(n || 0);
  return x.toLocaleString("en", { maximumFractionDigits: 2 });
}

function fmtDT(dt) {
  if (!dt) return "—";
  return fmtDateTime24(dt);
}

function methodLabel(m) {
  if (m === "cash") return "كاش";
  if (m === "card") return "بطاقة";
  if (m === "transfer") return "تحويل بنكي";
  if (m === "other") return "أخرى";
  return "—";
}

function isoDate(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const da = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function toInputDatetimeLocal(dt) {
  const d = dt ? new Date(dt) : new Date();
  const pad = (x) => String(x).padStart(2, "0");
  const y = d.getFullYear();
  const mo = pad(d.getMonth() + 1);
  const da = pad(d.getDate());
  const h = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${y}-${mo}-${da}T${h}:${mi}`;
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

// --- CSS Styles ---
const PAYMENTS_STYLES = `
.page--payments {
  /* خلفية بلون أخضر خفيف جداً ينسجم مع طابع المدفوعات */
  background: linear-gradient(180deg, rgba(22, 163, 74, 0.05) 0%, #f4f6f8 300px);
  min-height: 100vh;
  padding-bottom: 40px;
}

.payments-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.payments-title {
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

.payments-subtitle {
  font-size: 15px;
  font-weight: 700;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 8px;
}

.payments-card {
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 22px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.03);
  overflow: hidden;
  margin-bottom: 20px;
}

.payments-toolbar {
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
  /* إطار أخضر عند التحديد */
  border-color: #16a34a;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
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
  /* زر رئيسي باللون الأخضر */
  background: #16a34a !important;
  color: #fff !important;
  border: none !important;
  border-radius: 14px !important;
  padding: 10px 20px !important;
  font-weight: 800 !important;
  box-shadow: 0 4px 14px rgba(22, 163, 74, 0.2) !important;
  transition: all 0.2s !important;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-add:hover {
  transform: translateY(-2px);
  /* لون أخضر أغمق عند الوقوف بالماوس */
  background: #15803d !important;
  box-shadow: 0 6px 20px rgba(22, 163, 74, 0.3) !important;
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

/* تنسيق الروابط داخل الجدول لتظهر باللون الأخضر المميز */
.modern-table a {
  text-decoration: none;
  transition: color 0.15s ease;
}
.modern-table a:hover {
  text-decoration: underline;
}

/* تنسيق قائمة اختيار الطالب (Picker) */
.enrollment-picker-list {
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.enrollment-picker-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.enrollment-picker-item:last-child {
  border-bottom: none;
}

.enrollment-picker-item:hover {
  background: #f8fafc;
}

.enrollment-picker-item.selected {
  background: #f0fdf4;
  border-right: 4px solid #16a34a;
}

.epi-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.epi-name {
  font-weight: 800;
  color: #0f172a;
  font-size: 15px;
}

.epi-meta {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}

.epi-balance {
  font-weight: 900;
  font-size: 15px;
  color: #16a34a;
  direction: ltr;
}

.epi-balance.debt {
  color: #dc2626;
}
`;

export default function Payments() {
  const { toast } = useOutletContext();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [q, setQ] = useState("");
  const [rangePreset, setRangePreset] = useState("this_month");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [openAdd, setOpenAdd] = useState(false);

  // لحالة الإضافة
  const [pickerRows, setPickerRows] = useState([]);
  const [pickerQ, setPickerQ] = useState("");
  const [payEnrId, setPayEnrId] = useState("");
  const [payAmt, setPayAmt] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payNote, setPayNote] = useState("");
  const [payAt, setPayAt] = useState(toInputDatetimeLocal(new Date()));

  const [confirm, setConfirm] = useState({ open: false, id: null });
  const [saving, setSaving] = useState(false);

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

  async function load() {
    setLoading(true);
    setError(null);

    const { from, to } = computeRange();
    let query = supabase
      .from("payments_details_view")
      .select("*")
      .order("created_at", { ascending: false });

    if (from) query = query.gte("created_at", from + "T00:00:00");
    if (to) query = query.lte("created_at", to + "T23:59:59");

    const res = await query;
    if (res.error) {
      setError(res.error);
    } else {
      setRows(res.data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangePreset]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const cName = String(r.child_name || "").toLowerCase();
      const crName = String(r.course_title || "").toLowerCase();
      const rName = String(r.run_label || "").toLowerCase();
      const n = String(r.note || "").toLowerCase();
      return (
        cName.includes(s) ||
        crName.includes(s) ||
        rName.includes(s) ||
        n.includes(s)
      );
    });
  }, [rows, q]);

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

    return { total, count, avg, max };
  }, [filtered]);

  async function openCreate() {
    setOpenAdd(true);
    setPickerQ("");
    setPayEnrId("");
    setPayAmt("");
    setPayMethod("cash");
    setPayNote("");
    setPayAt(toInputDatetimeLocal(new Date()));

    const r = await supabase
      .from("enrollments_finance_view")
      .select("*")
      .order("child_name", { ascending: true });

    if (!r.error) {
      setPickerRows(r.data ?? []);
    }
  }

  const pickerFiltered = useMemo(() => {
    const s = pickerQ.trim().toLowerCase();
    if (!s) return pickerRows;
    return pickerRows.filter((r) => {
      const cName = String(r.child_name || "").toLowerCase();
      const crs = String(r.course_title || "").toLowerCase();
      return cName.includes(s) || crs.includes(s);
    });
  }, [pickerRows, pickerQ]);

  // عندما نختار اشتراك معين، يمكننا جلب رصيده تلقائيًا لمساعدة المستخدم
  useEffect(() => {
    if (payEnrId) {
      const match = pickerRows.find((r) => r.enrollment_id === payEnrId);
      if (match && Number(match.balance) > 0 && !payAmt) {
        setPayAmt(match.balance);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payEnrId]);

  async function createPayment() {
    if (!payEnrId) {
      toast("الرجاء اختيار الطالب والاشتراك.", "warn");
      return;
    }
    const val = Number(payAmt);
    if (!val || val <= 0) {
      toast("أدخل مبلغًا صحيحًا.", "warn");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        enrollment_id: payEnrId,
        amount: val,
        method: payMethod,
        note: payNote.trim() || null,
        created_at: new Date(payAt).toISOString(),
      };
      const { error: insErr } = await supabase
        .from("payments")
        .insert([payload]);
      if (insErr) throw insErr;

      toast("تم تسجيل الدفعة بنجاح.", "ok");
      setOpenAdd(false);
      await load();
    } catch (e) {
      toast("حدث خطأ أثناء الحفظ.", "danger");
    } finally {
      setSaving(false);
    }
  }

  async function deletePayment(id) {
    const { error: delErr } = await supabase
      .from("payments")
      .delete()
      .eq("id", id);
    if (delErr) {
      toast("فشل حذف الدفعة.", "danger");
      return;
    }
    toast("تم الحذف بنجاح.", "ok");
    await load();
  }

  return (
    <div className="page page--payments" dir="rtl" lang="ar">
      <style>{PAYMENTS_STYLES}</style>
      <div className="container">
        {/* Header */}
        <div className="payments-header">
          <div className="payments-title">المدفوعات</div>
          <div className="payments-subtitle">
            <span style={{ color: "#cbd5e1" }}>|</span>
            <CalendarDays size={16} /> النطاق: {rangeHint}
          </div>
        </div>

        {error && <ErrorBanner error={error} />}

        {/* KPIs */}
        <div className="kpiGrid4" style={{ marginBottom: 20 }}>
          <KpiCard
            icon={Banknote}
            label="إجمالي المدفوعات"
            value={`${fmtMoney(stats.total)} ₪`}
            hint={stats.count ? `${stats.count} دفعة` : "لا توجد دفعات"}
            variant="ok"
            className="kpi--accent"
          />

          <KpiCard
            icon={CreditCard}
            label="عدد الدفعات"
            value={stats.count}
            hint="خلال النطاق المحدد"
            variant="neutral"
            className="kpi--accent"
          />

          <KpiCard
            icon={Banknote}
            label="متوسط الدفعة"
            value={`${fmtMoney(stats.avg)} ₪`}
            hint={stats.count ? "متوسط لكل دفعة" : "—"}
            variant="neutral"
            className="kpi--accent"
          />

          <KpiCard
            icon={Banknote}
            label="أكبر دفعة"
            value={`${fmtMoney(stats.max)} ₪`}
            hint={stats.max === 0 ? "—" : "أكبر دفعة منفردة"}
            variant="info"
            className="kpi--accent"
          />
        </div>

        {/* Toolbar & Table */}
        <div className="payments-card">
          <div className="payments-toolbar">
            <div className="filters-group">
              <div className="search-wrapper">
                <Search size={18} className="search-icon" />
                <input
                  className="search-input"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="ابحث بالاسم، الدورة، الفوج، الملاحظة..."
                />
              </div>

              <div className="filter-select">
                <ModernSelect
                  bare
                  value={rangePreset}
                  onChange={setRangePreset}
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
              <Plus size={18} /> إضافة دفعة
            </button>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
              جاري التحميل...
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title={
                rows.length === 0 ? "لا توجد مدفوعات بعد" : "لا توجد نتائج"
              }
              description={
                rows.length === 0
                  ? "قم بإضافة دفعة جديدة للبدء."
                  : "جرّب تغيير البحث أو الفلاتر."
              }
              actionLabel="إضافة دفعة"
              onAction={openCreate}
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="modern-table">
                <thead>
                  <tr>
                    <th style={{ width: 140 }}>تاريخ ووقت</th>
                    <th>الطفل</th>
                    <th>الدورة / الفوج</th>
                    <th>طريقة الدفع</th>
                    <th>ملاحظة</th>
                    <th style={{ width: 120 }}>المبلغ</th>
                    <th style={{ width: 80, textAlign: "center" }}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td style={{ color: "#64748b", fontWeight: 600 }}>
                        <span dir="ltr">{fmtDT(r.created_at)}</span>
                      </td>

                      <td style={{ fontWeight: 900 }}>
                        <Link
                          to={`/children/${r.child_id}`}
                          style={{ color: "#0f172a" }}
                          title="ملف الطفل"
                        >
                          {r.child_name || "—"}
                        </Link>
                      </td>

                      <td style={{ minWidth: 180 }}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                          }}
                        >
                          <Link
                            to={`/courses/${r.course_id}`}
                            style={{ color: "#16a34a", fontWeight: 800 }}
                            title="تفاصيل الدورة"
                          >
                            {r.course_title || "—"}
                          </Link>
                          <Link
                            to={`/runs/${r.run_id}`}
                            style={{
                              color: "#64748b",
                              fontSize: "13px",
                              fontWeight: 600,
                            }}
                            title="تفاصيل الفوج"
                          >
                            {r.run_label || "—"}
                          </Link>
                        </div>
                      </td>

                      <td className="muted">
                        <span
                          style={{
                            background: "#f1f5f9",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: 700,
                          }}
                        >
                          {methodLabel(r.method)}
                        </span>
                      </td>

                      <td style={{ color: "#64748b", minWidth: 150 }}>
                        {r.note || "—"}
                      </td>

                      <td style={{ fontWeight: 900, color: "#16a34a" }}>
                        <span dir="ltr">{fmtMoney(r.amount)} ₪</span>
                      </td>

                      <td>
                        <div className="actions-cell">
                          <IconButton
                            title="حذف"
                            onClick={() => setConfirm({ open: true, id: r.id })}
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
      </div>

      {/* نافذة الإضافة */}
      <Modal
        open={openAdd}
        title="إضافة دفعة جديدة"
        onClose={() => !saving && setOpenAdd(false)}
      >
        <div className="grid" style={{ gap: "20px", padding: "10px 0" }}>
          <div style={{ gridColumn: "span 12" }}>
            <h4 className="form-section-title">
              <UserRound size={18} color="#64748b" /> اختيار الاشتراك
            </h4>
            <div
              className="search-wrapper"
              style={{ maxWidth: "100%", marginBottom: 12 }}
            >
              <Search size={18} className="search-icon" />
              <input
                className="search-input"
                value={pickerQ}
                onChange={(e) => setPickerQ(e.target.value)}
                placeholder="ابحث باسم الطفل أو الدورة..."
              />
            </div>

            {/* قائمة الاختيار التفاعلية */}
            <div className="enrollment-picker-list">
              {pickerFiltered.length === 0 ? (
                <div
                  style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}
                >
                  لا توجد اشتراكات متطابقة
                </div>
              ) : (
                pickerFiltered.map((r) => {
                  const isSelected = payEnrId === r.enrollment_id;
                  const isDebt = Number(r.balance) > 0;
                  return (
                    <div
                      key={r.enrollment_id}
                      className={`enrollment-picker-item ${isSelected ? "selected" : ""}`}
                      onClick={() => setPayEnrId(r.enrollment_id)}
                    >
                      <div className="epi-main">
                        <div className="epi-name">{r.child_name}</div>
                        <div className="epi-meta">
                          {r.course_title} — {r.run_label}
                        </div>
                      </div>
                      <div className={`epi-balance ${isDebt ? "debt" : ""}`}>
                        {isDebt ? `متبقي: ${r.balance}` : "خالص"}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* تفعيل باقي الحقول فقط إذا تم اختيار اشتراك */}
          {payEnrId && (
            <div style={{ gridColumn: "span 12" }}>
              <h4 className="form-section-title">
                <CreditCard size={18} color="#64748b" /> تفاصيل الدفعة
              </h4>
              <div className="grid" style={{ gap: "16px" }}>
                <div style={{ gridColumn: "span 6" }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    المبلغ (₪) *
                  </div>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={payAmt}
                    onChange={(e) => setPayAmt(e.target.value)}
                    placeholder="أدخل المبلغ..."
                  />
                </div>

                <div style={{ gridColumn: "span 6" }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    طريقة الدفع
                  </div>
                  <ModernSelect
                    value={payMethod}
                    onChange={setPayMethod}
                    options={[
                      { value: "cash", label: "كاش" },
                      { value: "card", label: "بطاقة" },
                      { value: "transfer", label: "تحويل بنكي" },
                      { value: "other", label: "أخرى" },
                    ]}
                  />
                </div>

                <div style={{ gridColumn: "span 6" }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    التاريخ والوقت *
                  </div>
                  <input
                    className="input"
                    type="datetime-local"
                    value={payAt}
                    onChange={(e) => setPayAt(e.target.value)}
                  />
                </div>

                <div style={{ gridColumn: "span 12" }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    ملاحظة (اختياري)
                  </div>
                  <input
                    className="input"
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                    placeholder="أي ملاحظات حول الدفعة..."
                  />
                </div>
              </div>
            </div>
          )}

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
              onClick={createPayment}
              disabled={saving || !payEnrId}
            >
              {saving ? "جاري الحفظ..." : "حفظ الدفعة"}
            </button>
          </div>
        </div>
      </Modal>

      {/* حوار تأكيد الحذف */}
      <ConfirmDialog
        open={confirm.open}
        title="حذف الدفعة"
        message="هل أنت متأكد أنك تريد حذف هذه الدفعة؟ لا يمكن التراجع."
        confirmText="حذف"
        cancelText="إلغاء"
        danger
        onCancel={() => setConfirm({ open: false, id: null })}
        onConfirm={async () => {
          const id = confirm.id;
          setConfirm({ open: false, id: null });
          if (id) await deletePayment(id);
        }}
      />
    </div>
  );
}
