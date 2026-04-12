import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, Link } from "react-router-dom";
import { createPortal } from "react-dom"; // السلاح السري للزر العائم
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
  Pencil,
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
  if (m === "cash")     return "كاش";
  if (m === "card")     return "بطاقة";
  if (m === "transfer") return "تحويل بنكي";
  if (m === "bit")      return "بييت";
  if (m === "other")    return "أخرى";
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
  background: #15803d !important;
  box-shadow: 0 6px 20px rgba(22, 163, 74, 0.3) !important;
}

.actions-cell {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

.modern-table a {
  text-decoration: none;
  transition: color 0.15s ease;
}
.modern-table a:hover {
  text-decoration: underline;
}

.enrollment-picker-list {
  max-height: 180px;
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
  font-size: 14px;
  color: #16a34a;
  direction: rtl;
}

.epi-balance.debt {
  color: #dc2626;
}

/* =========================================
   تنسيقات النموذج (المودال) - ثابتة لجميع الشاشات
========================================= */
.form-section-title {
  margin: 0 0 16px 0;
  color: #0f172a;
  font-size: 16px;
  font-weight: 800;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 8px;
}

.modal-form-scroll-container {
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 8px;
  max-height: 65vh;
}

.modal-form-scroll-container::-webkit-scrollbar {
  width: 5px;
}
.modal-form-scroll-container::-webkit-scrollbar-track {
  background: transparent;
}
.modal-form-scroll-container::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 10px;
}
.modal-form-scroll-container::-webkit-scrollbar-thumb:hover {
  background-color: #94a3b8;
}

.responsive-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  padding-bottom: 16px;
}

.form-col-full { grid-column: span 2; }
.form-col { grid-column: span 1; }

.modal-fixed-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 16px;
  margin-top: 10px;
  border-top: 1px solid #f1f5f9;
}

/* =========================================
   تصميم كروت الموبايل الخاصة بالمدفوعات
========================================= */
.mobile-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  background: transparent;
}

.art-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 16px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.art-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
}

.art-card::before {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 5px;
  background: #16a34a; /* لون أخضر للمدفوعات */
  border-radius: 0 16px 16px 0;
}

.ac-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-right: 8px;
}

.ac-name {
  margin: 0;
  font-size: 17px;
  font-weight: 900;
  color: #0f172a;
  max-width: 70%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ac-class-badge {
  background: #f8fafc;
  color: #475569;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  border: 1px solid #e2e8f0;
}

.ac-amount {
  font-weight: 900;
  font-size: 16px;
  color: #16a34a; /* لون أخضر للمبلغ */
}

.ac-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-right: 8px;
}

.ac-date {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}

.ac-date-icon {
  color: #16a34a;
  background: #f0fdf4;
  padding: 4px;
  border-radius: 50%;
}

.ac-actions {
  display: flex;
  gap: 8px;
}

.ac-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
}
.ac-btn-edit { background: #f1f5f9; color: #3b82f6; }
.ac-btn-delete { background: #fef2f2; color: #ef4444; }

/* الزر العائم للموبايل */
.fab-button {
  position: fixed !important;
  bottom: 95px !important;
  right: 20px !important;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #16a34a; /* لون أخضر */
  color: white;
  border: none;
  box-shadow: 0 6px 16px rgba(22, 163, 74, 0.3);
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 999999 !important;
}

/* =========================================
   التجاوب الخاص بالموبايل
========================================= */
@media (max-width: 980px) {

  div.modalOverlay {
    align-items: center !important;
    padding: 16px !important;
    z-index: 99999 !important;
  }

  div.modalOverlay > div.modalCard {
    border-radius: 24px !important;
    margin: auto !important;
    width: 95% !important;
    max-height: 88vh !important;
    margin-bottom: auto !important;
    transform: none !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
  }

  /* modalBody becomes flex column so scroll container + footer stack cleanly */
  div.modalOverlay > div.modalCard > .modalBody {
    overflow: hidden !important;
    flex: 1 !important;
    min-height: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    padding: 0 !important;
  }

  .modal-form-scroll-container {
    flex: 1 !important;
    min-height: 0 !important;
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch !important;
    max-height: none !important;
    padding: 10px 16px 4px !important;
  }

  .modal-fixed-footer {
    flex-shrink: 0 !important;
    padding: 10px 16px max(14px, env(safe-area-inset-bottom)) !important;
    border-top: 1px solid rgba(0,0,0,0.07) !important;
    background: #fff !important;
    display: flex !important;
    gap: 8px !important;
  }

  .modal-fixed-footer .btn {
    flex: 1 !important;
    justify-content: center !important;
  }

  /* إخفاء زر الإضافة العادي والجدول على الموبايل */
  .desktop-table-container { display: none; }
  .btn-add-desktop { display: none !important; }
  
  /* زيادة عرض الفورم والكروت على الموبايل */
  .payments-toolbar { 
    padding: 16px; 
    border-bottom: none; 
    margin: 0 4px !important;
  }
  .payments-card { 
    background: transparent; 
    border: none; 
    box-shadow: none; 
  }
  .filters-group {
    background: #ffffff; 
    border-radius: 20px; 
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
    padding: 10px;
  }
  .page--payments { padding-bottom: 120px; }
  .mobile-list {
    padding: 16px 4px !important;
  }
  
  /* الإبقاء على ترتيب الفورم (عمودين) */
  .responsive-form-grid {
    grid-template-columns: 1fr 1fr !important;
    gap: 12px;
    padding-bottom: 12px;
  }
  
  .form-col-full { grid-column: span 2 !important; }
  .form-col { grid-column: span 1 !important; }

  .form-section-title { margin: 10px 0 10px 0; font-size: 14px; }
  .input { padding: 10px 14px; font-size: 13px; }

  .kpiGrid4 {
    display: grid;
    grid-template-columns: 1fr 1fr; 
    gap: 10px;
  }
}

@media (min-width: 981px) {
  .mobile-list { display: none; }
  .fab-button { display: none !important; }
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

  const [editPayId, setEditPayId] = useState(null);

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

  async function loadPickerData() {
    const [pRes, cRes] = await Promise.all([
      supabase
        .from("run_participants_view")
        .select("enrollment_id, child_name, run_id, balance"),
      supabase.from("course_runs_summary_view").select("run_id, title, label"),
    ]);

    if (!pRes.error && !cRes.error) {
      const runsMap = {};
      (cRes.data || []).forEach((r) => {
        runsMap[r.run_id] = r;
      });

      const merged = (pRes.data || []).map((p) => ({
        enrollment_id: p.enrollment_id,
        child_name: p.child_name || "—",
        course_title: runsMap[p.run_id]?.title || "—",
        run_label: runsMap[p.run_id]?.label || "—",
        balance: Number(p.balance || 0),
      }));

      merged.sort((a, b) => a.child_name.localeCompare(b.child_name, "ar"));
      setPickerRows(merged);
    }
  }

  async function openCreate() {
    setEditPayId(null);
    setOpenAdd(true);
    setPickerQ("");
    setPayEnrId("");
    setPayAmt("");
    setPayMethod("cash");
    setPayNote("");
    setPayAt(toInputDatetimeLocal(new Date()));
    await loadPickerData();
  }

  async function openEdit(payment) {
    setEditPayId(payment.id);
    setOpenAdd(true);
    setPickerQ("");
    setPayEnrId(payment.enrollment_id);
    setPayAmt(payment.amount);
    setPayMethod(payment.method || "cash");
    setPayNote(payment.note || "");
    setPayAt(toInputDatetimeLocal(payment.created_at));
    await loadPickerData();
  }

  const pickerFiltered = useMemo(() => {
    const s = pickerQ.trim().toLowerCase();
    const unpaid = pickerRows.filter((r) => Number(r.balance) > 0);
    if (!s) return unpaid;
    return unpaid.filter((r) => {
      const cName = String(r.child_name || "").toLowerCase();
      const crs = String(r.course_title || "").toLowerCase();
      return cName.includes(s) || crs.includes(s);
    });
  }, [pickerRows, pickerQ]);

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

      if (editPayId) {
        const { error: updErr } = await supabase
          .from("payments")
          .update(payload)
          .eq("id", editPayId);
        if (updErr) throw updErr;
        toast("تم تعديل الدفعة بنجاح.", "ok");
      } else {
        const { error: insErr } = await supabase
          .from("payments")
          .insert([payload]);
        if (insErr) throw insErr;
        toast("تم تسجيل الدفعة بنجاح.", "ok");
      }

      setOpenAdd(false);
      setEditPayId(null);
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

        {/* Toolbar & Table/Cards */}
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

              <div style={{ minWidth: 160 }}>
                <ModernSelect
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

            <button
              className="btn btn-add btn-add-desktop"
              onClick={openCreate}
            >
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
            <>
              {/* عرض الجدول للكمبيوتر */}
              <div
                className="desktop-table-container"
                style={{ overflowX: "auto" }}
              >
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th style={{ width: 140 }}>تاريخ ووقت</th>
                      <th>الطفل</th>
                      <th>الدورة / الفوج</th>
                      <th>طريقة الدفع</th>
                      <th>ملاحظة</th>
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

              {/* تصميم الكروت للموبايل */}
              <div className="mobile-list">
                {filtered.map((r) => (
                  <div
                    key={r.id}
                    className="art-card"
                    onClick={() => openEdit(r)}
                  >
                    <div className="ac-header">
                      <h3 className="ac-name">{r.child_name || "—"}</h3>
                      <span className="ac-amount">{fmtMoney(r.amount)} ₪</span>
                    </div>
                    <div className="ac-footer" style={{ marginTop: 4 }}>
                      <span className="ac-class-badge">
                        {r.course_title || "—"} - {r.run_label || "—"}
                      </span>
                      <span className="ac-class-badge">
                        {methodLabel(r.method)}
                      </span>
                    </div>
                    <div className="ac-footer" style={{ marginTop: 12 }}>
                      <div className="ac-date">
                        <span className="ac-date-icon">
                          <CalendarDays size={14} strokeWidth={2.5} />
                        </span>
                        <span dir="ltr">{fmtDT(r.created_at)}</span>
                      </div>
                      <div className="ac-actions">
                        <button
                          className="ac-btn ac-btn-edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(r);
                          }}
                        >
                          <Pencil size={16} strokeWidth={2.5} />
                        </button>
                        <button
                          className="ac-btn ac-btn-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirm({ open: true, id: r.id });
                          }}
                        >
                          <Trash2 size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* الزر العائم للموبايل - يختفي عند فتح المودال */}
      {!openAdd &&
        createPortal(
          <button
            className="fab-button"
            onClick={openCreate}
            title="إضافة دفعة"
          >
            <Plus size={30} strokeWidth={2.5} />
          </button>,
          document.body,
        )}

      {/* نافذة الإضافة/التعديل */}
      <Modal
        open={openAdd}
        title={editPayId ? "تعديل الدفعة" : "إضافة دفعة جديدة"}
        onClose={() => {
          if (!saving) {
            setOpenAdd(false);
            setEditPayId(null);
          }
        }}
      >
        <div className="modal-form-scroll-container">
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
                      {isDebt ? `متبقي عليه: ${r.balance} ₪` : "مدفوع بالكامل"}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* تفعيل باقي الحقول فقط إذا تم اختيار اشتراك */}
          {payEnrId && (
            <div style={{ marginTop: 24 }}>
              <h4 className="form-section-title">
                <CreditCard size={18} color="#64748b" /> تفاصيل الدفعة
              </h4>
              <div className="responsive-form-grid">
                <div className="form-col">
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

                <div className="form-col">
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
                      { value: "bit", label: "بييت" },
                      { value: "other", label: "أخرى" },
                    ]}
                  />
                </div>

                <div className="form-col-full">
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

                <div className="form-col-full">
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
        </div>

        <div className="modal-fixed-footer">
          <button
            className="btn"
            onClick={() => {
              setOpenAdd(false);
              setEditPayId(null);
            }}
            disabled={saving}
          >
            إلغاء
          </button>
          <button
            className="btn btn-add"
            onClick={createPayment}
            disabled={saving || !payEnrId}
          >
            {saving
              ? "جاري الحفظ..."
              : editPayId
                ? "تحديث الدفعة"
                : "حفظ الدفعة"}
          </button>
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
