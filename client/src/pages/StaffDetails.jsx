import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

import ErrorBanner from "../components/ErrorBanner";
import KpiCard from "../components/KpiCard";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import IconButton from "../components/IconButton";

import {
  ArrowRight,
  Clock,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Pencil,
  Printer,
  Receipt,
  UserRound,
  Phone,
  Briefcase,
} from "lucide-react";

/* ─── helpers ─── */
function fmtMoney(n) {
  return Number(n || 0).toLocaleString("en", { maximumFractionDigits: 2 });
}
function fmtDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function calcHours(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? diff / 60 : 0;
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function lastDayOfMonth(y, m) {
  return new Date(y, m, 0).toISOString().slice(0, 10);
}
function monthName(y, m) {
  return new Date(y, m - 1, 1).toLocaleString("ar", { month: "long", year: "numeric" });
}

const EMPTY_FORM = { work_date: todayISO(), start_time: "", end_time: "", hourly_rate: "", notes: "" };

/* ─── styles ─── */
const CSS = `
.sd-page { direction: rtl; }

.sd-back {
  display: inline-flex; align-items: center; gap: 6px;
  background: none; border: none; cursor: pointer;
  color: #64748b; font-size: 14px; font-weight: 800;
  padding: 0; margin-bottom: 18px; transition: color 0.15s;
}
.sd-back:hover { color: #1e293b; }

.sd-header-card {
  background: #fff;
  border: 1px solid rgba(15,23,42,0.07);
  border-radius: 20px;
  padding: 20px 24px;
  display: flex; align-items: center; gap: 18px;
  margin-bottom: 24px;
  box-shadow: 0 4px 18px rgba(0,0,0,0.04);
}
.sd-header-avatar {
  width: 60px; height: 60px; border-radius: 50%;
  background: linear-gradient(135deg, rgba(0,172,71,0.18), rgba(0,172,71,0.06));
  display: flex; align-items: center; justify-content: center;
  color: #00ac47; flex-shrink: 0;
  border: 2px solid rgba(0,172,71,0.15);
}
.sd-header-name { font-size: 20px; font-weight: 900; color: #1e293b; }
.sd-header-meta { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 6px; }
.sd-meta-item { display: flex; align-items: center; gap: 5px; font-size: 13px; color: #64748b; font-weight: 700; }

.sd-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 14px; margin-bottom: 24px;
}

.sd-toolbar {
  display: flex; align-items: center; gap: 12px;
  flex-wrap: wrap; margin-bottom: 18px;
}
.sd-toolbar-title { font-size: 16px; font-weight: 900; color: #1e293b; flex: 1; }

.sd-select {
  padding: 9px 14px; border-radius: 12px;
  border: 1px solid #e2e8f0; background: #fff;
  font-size: 14px; font-weight: 700; color: #334155;
  cursor: pointer; outline: none;
}
.sd-select:focus { border-color: #00ac47; box-shadow: 0 0 0 3px rgba(0,172,71,0.12); }

.sd-table-wrap {
  background: #fff; border: 1px solid rgba(15,23,42,0.07);
  border-radius: 18px; overflow: hidden;
  box-shadow: 0 4px 18px rgba(0,0,0,0.04);
  margin-bottom: 28px;
}
.sd-table { width: 100%; border-collapse: collapse; direction: rtl; }
.sd-table th {
  background: #f8fafc; color: #64748b; font-weight: 800; font-size: 13px;
  padding: 13px 18px; border-bottom: 2px solid #f1f5f9; text-align: right;
  white-space: nowrap;
}
.sd-table td {
  padding: 13px 18px; border-bottom: 1px solid #f8fafc;
  color: #334155; font-size: 14px; text-align: right;
}
.sd-table tr:last-child td { border-bottom: none; }
.sd-table tr:hover td { background: #fafafa; }
.sd-table tfoot td {
  background: #f8fafc; font-weight: 900; font-size: 15px;
  padding: 14px 18px; border-top: 2px solid #f1f5f9; border-bottom: none;
}

.sd-monthly-section { margin-bottom: 28px; }
.sd-section-title { font-size: 16px; font-weight: 900; color: #1e293b; margin-bottom: 14px; }

.sd-month-table-wrap {
  background: #fff; border: 1px solid rgba(15,23,42,0.07);
  border-radius: 18px; overflow: hidden;
  box-shadow: 0 4px 18px rgba(0,0,0,0.04);
}
.sd-month-table { width: 100%; border-collapse: collapse; direction: rtl; }
.sd-month-table th {
  background: #f8fafc; color: #64748b; font-weight: 800; font-size: 13px;
  padding: 13px 18px; border-bottom: 2px solid #f1f5f9; text-align: right;
  white-space: nowrap;
}
.sd-month-table td {
  padding: 13px 18px; border-bottom: 1px solid #f8fafc;
  color: #334155; font-size: 14px; text-align: right;
}
.sd-month-table tr:last-child td { border-bottom: none; }
.sd-month-table tr:hover td { background: #fafafa; }

.sd-paid-badge {
  display: inline-flex; align-items: center; gap: 5px;
  background: rgba(0,172,71,0.1); color: #00ac47;
  border: 1px solid rgba(0,172,71,0.2);
  border-radius: 10px; padding: 4px 10px; font-size: 12px; font-weight: 800;
}
.sd-unpaid-badge {
  display: inline-flex; align-items: center; gap: 5px;
  background: rgba(245,158,11,0.1); color: #d97706;
  border: 1px solid rgba(245,158,11,0.2);
  border-radius: 10px; padding: 4px 10px; font-size: 12px; font-weight: 800;
}
.sd-convert-btn {
  display: inline-flex; align-items: center; gap: 5px;
  background: #fff7ed; color: #ea580c;
  border: 1px solid rgba(234,88,12,0.25);
  border-radius: 10px; padding: 6px 12px; font-size: 13px; font-weight: 800;
  cursor: pointer; transition: background 0.15s; white-space: nowrap;
}
.sd-convert-btn:hover { background: #ffedd5; }
.sd-convert-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* form */
.sd-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.sd-form-group { display: flex; flex-direction: column; gap: 6px; }
.sd-form-group label { font-size: 13px; font-weight: 800; color: #475569; }
.sd-calc-box {
  background: linear-gradient(135deg, rgba(0,172,71,0.08), rgba(0,172,71,0.04));
  border: 1px solid rgba(0,172,71,0.18); border-radius: 14px; padding: 14px 18px;
  display: flex; justify-content: space-between; align-items: center;
}
.sd-calc-label { font-size: 14px; font-weight: 700; color: #475569; }
.sd-calc-hours { font-size: 16px; font-weight: 900; color: #00ac47; }
.sd-calc-total { font-size: 13px; color: #64748b; font-weight: 700; margin-top: 2px; }

/* ─── print invoice ─── */
.sd-invoice {
  font-family: "Noto Sans Hebrew", Arial, sans-serif;
  direction: rtl; color: #1e293b;
  max-width: 720px; margin: 0 auto;
}
.sd-inv-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 24px; padding-bottom: 18px;
  border-bottom: 3px solid #00ac47;
}
.sd-inv-brand { font-size: 22px; font-weight: 900; color: #00ac47; }
.sd-inv-brand-sub { font-size: 13px; color: #64748b; font-weight: 700; margin-top: 4px; }
.sd-inv-meta { text-align: left; }
.sd-inv-meta-row { font-size: 13px; color: #64748b; margin-bottom: 2px; }
.sd-inv-meta-row strong { color: #1e293b; }
.sd-inv-teacher {
  background: #f8fafc; border-radius: 14px; padding: 16px 20px;
  margin-bottom: 20px; display: flex; gap: 24px; flex-wrap: wrap;
}
.sd-inv-teacher-field { font-size: 14px; color: #475569; }
.sd-inv-teacher-field strong { display: block; font-size: 16px; color: #1e293b; font-weight: 900; }
.sd-inv-period {
  font-size: 15px; font-weight: 800; color: #00ac47;
  margin-bottom: 14px;
}
.sd-inv-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
.sd-inv-table th {
  background: #f1f5f9; color: #475569; font-weight: 800; font-size: 13px;
  padding: 10px 14px; border: 1px solid #e2e8f0; text-align: right;
}
.sd-inv-table td {
  padding: 10px 14px; border: 1px solid #e2e8f0;
  font-size: 14px; color: #334155; text-align: right;
}
.sd-inv-table tfoot td {
  background: #f8fafc; font-weight: 900; font-size: 15px;
  border-top: 2px solid #00ac47;
}
.sd-inv-totals {
  display: flex; justify-content: flex-end; margin-bottom: 24px;
}
.sd-inv-totals-box {
  background: linear-gradient(135deg, rgba(0,172,71,0.08), rgba(0,172,71,0.04));
  border: 1px solid rgba(0,172,71,0.2); border-radius: 14px;
  padding: 16px 24px; min-width: 240px;
}
.sd-inv-total-row {
  display: flex; justify-content: space-between; gap: 24px;
  font-size: 14px; color: #475569; margin-bottom: 8px;
}
.sd-inv-total-row:last-child {
  margin-bottom: 0; font-size: 17px; font-weight: 900; color: #1e293b;
  border-top: 1px solid rgba(0,172,71,0.2); padding-top: 8px; margin-top: 4px;
}
.sd-inv-signatures {
  display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
  margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0;
}
.sd-inv-sig-line {
  border-bottom: 1px solid #94a3b8; height: 40px; margin-bottom: 6px;
}
.sd-inv-sig-label { font-size: 13px; color: #64748b; font-weight: 700; text-align: center; }
.sd-inv-footer {
  text-align: center; font-size: 12px; color: #94a3b8;
  margin-top: 20px; padding-top: 16px; border-top: 1px solid #f1f5f9;
}

@media print {
  .sd-no-print { display: none !important; }
  .sd-invoice { max-width: 100%; }
}

@media (max-width: 600px) {
  .sd-form-row { grid-template-columns: 1fr; }
  .sd-header-card { flex-direction: column; align-items: flex-start; }
  .sd-inv-header { flex-direction: column; gap: 12px; }
  .sd-inv-signatures { grid-template-columns: 1fr; }
}
`;

let styleInjected = false;
function injectStyles() {
  if (styleInjected) return;
  const el = document.createElement("style");
  el.textContent = CSS;
  document.head.appendChild(el);
  styleInjected = true;
}

/* ══════════════════════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════════════════════ */
export default function StaffDetails() {
  injectStyles();
  const { staffId } = useParams();
  const navigate = useNavigate();

  const [member, setMember]       = useState(null);
  const [allHours, setAllHours]   = useState([]);
  const [payments, setPayments]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [err, setErr]             = useState(null);

  /* filters */
  const [filterYear, setFilterYear]   = useState(String(new Date().getFullYear()));
  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1));

  /* modals */
  const [logModal, setLogModal]     = useState(null); // { editRow? }
  const [deleteLog, setDeleteLog]   = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceMonth, setInvoiceMonth] = useState(null); // { year, month }

  /* form */
  const [form, setForm]     = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(null);

  const invoiceRef = useRef(null);

  /* ─── load ─── */
  async function load() {
    setLoading(true);
    setErr(null);
    const [{ data: s, error: se }, { data: h, error: he }, { data: p, error: pe }] = await Promise.all([
      supabase.from("staff").select("*").eq("id", staffId).single(),
      supabase.from("staff_hours").select("*").eq("staff_id", staffId).order("work_date", { ascending: false }),
      supabase.from("staff_salary_payments").select("*").eq("staff_id", staffId),
    ]);
    setLoading(false);
    if (se || he) { setErr((se || he || pe).message); return; }
    setMember(s);
    setAllHours(h || []);
    setPayments(p || []);
  }
  useEffect(() => { load(); }, [staffId]);

  /* ─── available years ─── */
  const availableYears = useMemo(() => {
    const years = new Set(allHours.map(r => r.work_date?.slice(0, 4)).filter(Boolean));
    years.add(String(new Date().getFullYear()));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [allHours]);

  /* ─── filtered hours ─── */
  const filteredHours = useMemo(() => {
    return allHours.filter(r => {
      if (!r.work_date) return false;
      const [y, m] = r.work_date.split("-");
      if (y !== filterYear) return false;
      if (filterMonth !== "0" && m !== filterMonth.padStart(2, "0")) return false;
      return true;
    });
  }, [allHours, filterYear, filterMonth]);

  /* ─── filtered totals ─── */
  const filteredTotals = useMemo(() => {
    let hours = 0, amount = 0;
    for (const r of filteredHours) {
      const h = calcHours(r.start_time, r.end_time);
      hours += h;
      amount += h * Number(r.hourly_rate || 0);
    }
    return { hours, amount };
  }, [filteredHours]);

  /* ─── all-time KPIs ─── */
  const allKpi = useMemo(() => {
    let totalHours = 0, totalAmount = 0, paidAmount = 0;
    for (const r of allHours) {
      const h = calcHours(r.start_time, r.end_time);
      totalHours += h;
      totalAmount += h * Number(r.hourly_rate || 0);
    }
    for (const p of payments) { paidAmount += Number(p.total_amount || 0); }
    return { totalHours, totalAmount, paidAmount, pendingAmount: totalAmount - paidAmount };
  }, [allHours, payments]);

  /* ─── monthly breakdown ─── */
  const monthlyStats = useMemo(() => {
    const map = {};
    for (const r of allHours) {
      const key = r.work_date?.slice(0, 7);
      if (!key) continue;
      if (!map[key]) map[key] = { hours: 0, amount: 0, count: 0 };
      const h = calcHours(r.start_time, r.end_time);
      map[key].hours += h;
      map[key].amount += h * Number(r.hourly_rate || 0);
      map[key].count += 1;
    }
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, s]) => {
        const [y, m] = key.split("-");
        return { key, year: Number(y), month: Number(m), ...s };
      });
  }, [allHours]);

  const paidMap = useMemo(() => {
    const m = {};
    for (const p of payments) {
      m[`${p.year}-${String(p.month).padStart(2, "0")}`] = p;
    }
    return m;
  }, [payments]);

  /* ─── convert to expense ─── */
  async function convertToExpense(ms) {
    setConverting(ms.key);
    const description = `راتب ${member.name} — ${monthName(ms.year, ms.month)}`;

    // تأكد إن اسم المعلمة موجود بقائمة الأشخاص/المتاجر في المصاريف
    await supabase.from("expense_parties")
      .insert([{ name: member.name }])
      .then(() => {}); // تجاهل خطأ التكرار

    const { data: expData, error: expErr } = await supabase
      .from("expenses")
      .insert([{ spent_on: lastDayOfMonth(ms.year, ms.month), amount: ms.amount, category: "معاش", party: member.name, description }])
      .select("id").single();
    if (expErr) { setErr(expErr.message); setConverting(null); return; }
    const { error: payErr } = await supabase.from("staff_salary_payments").insert([{
      staff_id: staffId, year: ms.year, month: ms.month,
      total_hours: ms.hours, total_amount: ms.amount, expense_id: expData.id,
    }]);
    setConverting(null);
    if (payErr) { setErr(payErr.message); return; }
    load();
  }

  /* ─── log modal ─── */
  function openLog(editRow = null) {
    setLogModal({ editRow });
    setForm(editRow ? {
      work_date: editRow.work_date || todayISO(),
      start_time: editRow.start_time || "",
      end_time: editRow.end_time || "",
      hourly_rate: String(editRow.hourly_rate || ""),
      notes: editRow.notes || "",
    } : EMPTY_FORM);
  }

  async function saveLog() {
    if (!form.work_date || !form.start_time || !form.end_time || !form.hourly_rate) return;
    setSaving(true);
    const payload = {
      staff_id: staffId,
      work_date: form.work_date,
      start_time: form.start_time,
      end_time: form.end_time,
      hourly_rate: Number(form.hourly_rate),
      notes: form.notes || null,
    };
    let error;
    if (logModal?.editRow) {
      ({ error } = await supabase.from("staff_hours").update(payload).eq("id", logModal.editRow.id));
    } else {
      ({ error } = await supabase.from("staff_hours").insert([payload]));
    }
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setLogModal(null);
    load();
  }

  async function confirmDeleteLog() {
    if (!deleteLog) return;
    await supabase.from("staff_hours").delete().eq("id", deleteLog.id);
    setDeleteLog(null);
    load();
  }

  const hoursCalc = calcHours(form.start_time, form.end_time);
  const totalCalc = hoursCalc * Number(form.hourly_rate || 0);

  /* ─── invoice data ─── */
  const invoiceRows = useMemo(() => {
    if (!invoiceMonth) return [];
    return allHours.filter(r => {
      const [y, m] = (r.work_date || "").split("-");
      return Number(y) === invoiceMonth.year && Number(m) === invoiceMonth.month;
    }).sort((a, b) => a.work_date.localeCompare(b.work_date));
  }, [allHours, invoiceMonth]);

  const invoiceTotals = useMemo(() => {
    let hours = 0, amount = 0;
    for (const r of invoiceRows) {
      const h = calcHours(r.start_time, r.end_time);
      hours += h; amount += h * Number(r.hourly_rate || 0);
    }
    return { hours, amount };
  }, [invoiceRows]);

  function openInvoice(ms) {
    setInvoiceMonth({ year: ms.year, month: ms.month });
    setShowInvoice(true);
  }

  function printInvoice() {
    window.print();
  }

  /* ══════════ RENDER ══════════ */
  if (loading) return <div className="container" style={{ textAlign: "center", padding: "80px 0", color: "#94a3b8", fontWeight: 800 }}>جار التحميل...</div>;
  if (!member) return <div className="container" style={{ textAlign: "center", padding: "80px 0", color: "#ef4444", fontWeight: 800 }}>لم يتم العثور على المعلمة</div>;

  return (
    <div className="container sd-page sd-no-print">
      {err && <ErrorBanner message={err} onClose={() => setErr(null)} />}

      {/* back */}
      <button className="sd-back" onClick={() => navigate("/staff-hours")}>
        <ArrowRight size={16} /> العودة لساعات العمل
      </button>

      {/* header card */}
      <div className="sd-header-card">
        <div className="sd-header-avatar"><UserRound size={28} /></div>
        <div style={{ flex: 1 }}>
          <div className="sd-header-name">{member.name}</div>
          <div className="sd-header-meta">
            {member.role && <span className="sd-meta-item"><Briefcase size={14} />{member.role}</span>}
            {member.phone && <span className="sd-meta-item"><Phone size={14} />{member.phone}</span>}
          </div>
        </div>
        <button className="btn" onClick={() => openLog()}>
          <Plus size={16} /> تسجيل ساعات
        </button>
      </div>

      {/* KPIs */}
      <div className="sd-kpi-grid">
        <KpiCard icon={Clock}       label="إجمالي الساعات"  value={`${allKpi.totalHours.toFixed(1)} س`}    hint="كل الوقت"     variant="ok" />
        <KpiCard icon={Banknote}    label="إجمالي المستحق"  value={`${fmtMoney(allKpi.totalAmount)} ₪`}    hint="كل الوقت"     variant="info" />
        <KpiCard icon={CheckCircle2} label="تم الدفع"       value={`${fmtMoney(allKpi.paidAmount)} ₪`}     hint="مُحوَّل لمصروف" variant="ok" />
        <KpiCard icon={AlertCircle} label="غير مدفوع"       value={`${fmtMoney(allKpi.pendingAmount)} ₪`}  hint="متبقي"        variant="warn" />
      </div>

      {/* ─── hours table ─── */}
      <div className="sd-toolbar">
        <div className="sd-toolbar-title">سجل الساعات</div>
        <select className="sd-select" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="sd-select" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
          <option value="0">كل الأشهر</option>
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
            <option key={m} value={String(m)}>
              {new Date(2000, m - 1, 1).toLocaleString("ar", { month: "long" })}
            </option>
          ))}
        </select>
      </div>

      <div className="sd-table-wrap">
        {filteredHours.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontWeight: 800 }}>لا يوجد سجلات للفترة المحددة</div>
        ) : (
          <table className="sd-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>البدء</th>
                <th>الانتهاء</th>
                <th>الساعات</th>
                <th>السعر/س</th>
                <th>الإجمالي</th>
                <th>ملاحظات</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredHours.map(row => {
                const h = calcHours(row.start_time, row.end_time);
                const total = h * Number(row.hourly_rate || 0);
                return (
                  <tr key={row.id}>
                    <td>{fmtDate(row.work_date)}</td>
                    <td>{row.start_time?.slice(0, 5) || "—"}</td>
                    <td>{row.end_time?.slice(0, 5) || "—"}</td>
                    <td style={{ fontWeight: 800, color: "#00ac47" }}>{h.toFixed(2)}</td>
                    <td>{fmtMoney(row.hourly_rate)} ₪</td>
                    <td style={{ fontWeight: 800 }}>{fmtMoney(total)} ₪</td>
                    <td style={{ color: "#94a3b8", fontSize: 13 }}>{row.notes || "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <IconButton icon={Pencil} size={14} title="تعديل" onClick={() => openLog(row)} />
                        <IconButton icon={Trash2} size={14} title="حذف" variant="danger" onClick={() => setDeleteLog(row)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ color: "#64748b", fontWeight: 800 }}>المجموع</td>
                <td style={{ color: "#00ac47" }}>{filteredTotals.hours.toFixed(2)} س</td>
                <td></td>
                <td>{fmtMoney(filteredTotals.amount)} ₪</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* ─── monthly summary ─── */}
      <div className="sd-monthly-section">
        <div className="sd-section-title">ملخص الأشهر</div>
        <div className="sd-month-table-wrap">
          {monthlyStats.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontWeight: 800 }}>لا يوجد بيانات</div>
          ) : (
            <table className="sd-month-table">
              <thead>
                <tr>
                  <th>الشهر</th>
                  <th>جلسات</th>
                  <th>ساعات</th>
                  <th>المبلغ</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {monthlyStats.map(ms => {
                  const payment = paidMap[ms.key];
                  return (
                    <tr key={ms.key}>
                      <td style={{ fontWeight: 800 }}>{monthName(ms.year, ms.month)}</td>
                      <td>{ms.count}</td>
                      <td style={{ fontWeight: 800, color: "#00ac47" }}>{ms.hours.toFixed(2)} س</td>
                      <td style={{ fontWeight: 800 }}>{fmtMoney(ms.amount)} ₪</td>
                      <td>
                        {payment
                          ? <span className="sd-paid-badge"><CheckCircle2 size={13} /> تم الدفع</span>
                          : <span className="sd-unpaid-badge">غير مدفوع</span>}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button className="sd-convert-btn" style={{ background: "#f0fdf4", color: "#15803d", borderColor: "rgba(21,128,61,0.25)" }} onClick={() => openInvoice(ms)}>
                            <Printer size={14} /> فاتورة
                          </button>
                          {!payment && (
                            <button className="sd-convert-btn" disabled={converting === ms.key} onClick={() => convertToExpense(ms)}>
                              <Receipt size={14} />
                              {converting === ms.key ? "جار..." : "تحويل لمصروف"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ════ Log Modal ════ */}
      <Modal open={!!logModal} title={logModal?.editRow ? "تعديل السجل" : "تسجيل ساعات"} onClose={() => setLogModal(null)} maxWidth={480}>
        <div className="stack" style={{ direction: "rtl" }}>
          <div className="sd-form-group">
            <label>التاريخ</label>
            <input type="date" className="input" value={form.work_date} onChange={e => setForm(f => ({ ...f, work_date: e.target.value }))} />
          </div>
          <div className="sd-form-row">
            <div className="sd-form-group">
              <label>ساعة البدء</label>
              <input type="time" className="input" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
            </div>
            <div className="sd-form-group">
              <label>ساعة الانتهاء</label>
              <input type="time" className="input" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
            </div>
          </div>
          <div className="sd-form-group">
            <label>المبلغ على الساعة (₪)</label>
            <input type="number" min="0" step="0.5" className="input" placeholder="مثال: 50" value={form.hourly_rate} onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))} style={{ textAlign: "right" }} />
          </div>
          {hoursCalc > 0 && (
            <div className="sd-calc-box">
              <div className="sd-calc-label">الحساب التلقائي</div>
              <div>
                <div className="sd-calc-hours">{hoursCalc.toFixed(2)} ساعة</div>
                {totalCalc > 0 && <div className="sd-calc-total">= {fmtMoney(totalCalc)} ₪</div>}
              </div>
            </div>
          )}
          <div className="sd-form-group">
            <label>ملاحظات (اختياري)</label>
            <input type="text" className="input" placeholder="أي ملاحظة..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <button className="btn" disabled={saving || !form.work_date || !form.start_time || !form.end_time || !form.hourly_rate} onClick={saveLog} style={{ width: "100%", justifyContent: "center" }}>
            {saving ? "جار الحفظ..." : logModal?.editRow ? "حفظ التعديلات" : "تسجيل"}
          </button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteLog} title="حذف السجل" message="هل أنت متأكد من الحذف؟" confirmText="حذف" cancelText="إلغاء" danger onConfirm={confirmDeleteLog} onCancel={() => setDeleteLog(null)} />

      {/* ════ Invoice Modal ════ */}
      <Modal
        open={showInvoice}
        title=""
        onClose={() => setShowInvoice(false)}
        maxWidth={760}
      >
        <div>
          {/* print / close buttons */}
          <div className="sd-no-print" style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 18, direction: "rtl" }}>
            <button className="btn" onClick={printInvoice}>
              <Printer size={16} /> طباعة
            </button>
          </div>

          {/* invoice content */}
          {invoiceMonth && (
            <div className="sd-invoice" ref={invoiceRef}>
              {/* header */}
              <div className="sd-inv-header">
                <div>
                  <div className="sd-inv-brand">Play &amp; Grow</div>
                  <div className="sd-inv-brand-sub">كشف حساب — رواتب</div>
                </div>
                <div className="sd-inv-meta">
                  <div className="sd-inv-meta-row">تاريخ الإصدار: <strong>{fmtDate(todayISO())}</strong></div>
                  <div className="sd-inv-meta-row">الفترة: <strong>{monthName(invoiceMonth.year, invoiceMonth.month)}</strong></div>
                </div>
              </div>

              {/* teacher info */}
              <div className="sd-inv-teacher">
                <div className="sd-inv-teacher-field">
                  الاسم<strong>{member.name}</strong>
                </div>
                {member.role && (
                  <div className="sd-inv-teacher-field">
                    الدور<strong>{member.role}</strong>
                  </div>
                )}
                {member.phone && (
                  <div className="sd-inv-teacher-field">
                    الهاتف<strong>{member.phone}</strong>
                  </div>
                )}
              </div>

              <div className="sd-inv-period">
                جلسات عمل — {monthName(invoiceMonth.year, invoiceMonth.month)} ({invoiceRows.length} جلسة)
              </div>

              {/* sessions table */}
              <table className="sd-inv-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>التاريخ</th>
                    <th>من</th>
                    <th>إلى</th>
                    <th>الساعات</th>
                    <th>السعر/س</th>
                    <th>الإجمالي</th>
                    <th>ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceRows.map((row, i) => {
                    const h = calcHours(row.start_time, row.end_time);
                    const total = h * Number(row.hourly_rate || 0);
                    return (
                      <tr key={row.id}>
                        <td>{i + 1}</td>
                        <td>{fmtDate(row.work_date)}</td>
                        <td>{row.start_time?.slice(0, 5) || "—"}</td>
                        <td>{row.end_time?.slice(0, 5) || "—"}</td>
                        <td style={{ fontWeight: 800, color: "#00ac47" }}>{h.toFixed(2)}</td>
                        <td>{fmtMoney(row.hourly_rate)} ₪</td>
                        <td style={{ fontWeight: 800 }}>{fmtMoney(total)} ₪</td>
                        <td style={{ color: "#64748b", fontSize: 12 }}>{row.notes || ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} style={{ color: "#64748b" }}>المجموع</td>
                    <td style={{ color: "#00ac47" }}>{invoiceTotals.hours.toFixed(2)} س</td>
                    <td></td>
                    <td>{fmtMoney(invoiceTotals.amount)} ₪</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>

              {/* totals box */}
              <div className="sd-inv-totals">
                <div className="sd-inv-totals-box">
                  <div className="sd-inv-total-row">
                    <span>إجمالي الساعات</span>
                    <span>{invoiceTotals.hours.toFixed(2)} ساعة</span>
                  </div>
                  <div className="sd-inv-total-row">
                    <span>المبلغ الإجمالي</span>
                    <span>{fmtMoney(invoiceTotals.amount)} ₪</span>
                  </div>
                </div>
              </div>

              {/* signatures */}
              <div className="sd-inv-signatures">
                <div>
                  <div className="sd-inv-sig-line"></div>
                  <div className="sd-inv-sig-label">توقيع المعلمة</div>
                </div>
                <div>
                  <div className="sd-inv-sig-line"></div>
                  <div className="sd-inv-sig-label">توقيع الإدارة</div>
                </div>
              </div>

              <div className="sd-inv-footer">Play &amp; Grow — تم إصداره بتاريخ {fmtDate(todayISO())}</div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
