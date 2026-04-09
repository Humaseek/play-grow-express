import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

import PageHeader from "../components/PageHeader";
import ErrorBanner from "../components/ErrorBanner";
import KpiCard from "../components/KpiCard";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import IconButton from "../components/IconButton";

import {
  Clock,
  Banknote,
  Users,
  Plus,
  Trash2,
  Pencil,
  TrendingUp,
  BarChart2,

  ChevronLeft,
  CheckCircle2,
  Receipt,
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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}




const EMPTY_FORM = {
  work_date: todayISO(),
  start_time: "",
  end_time: "",
  hourly_rate: "",
  notes: "",
};

/* ─── styles ─── */
const CSS = `
.sh-page { direction: rtl; }

.sh-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
  margin-bottom: 28px;
}

.sh-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 18px;
}

.sh-teacher-card {
  background: #fff;
  border: 1px solid rgba(15,23,42,0.07);
  border-radius: 20px;
  box-shadow: 0 4px 18px rgba(0,0,0,0.04);
  overflow: hidden;
  transition: transform 0.15s, box-shadow 0.15s;
}
.sh-teacher-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.08);
}

.sh-card-header {
  padding: 18px 20px 14px;
  display: flex;
  align-items: center;
  gap: 14px;
  border-bottom: 1px solid #f1f5f9;
}

.sh-avatar {
  width: 48px; height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(0,172,71,0.18), rgba(0,172,71,0.06));
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  color: #00ac47;
  border: 2px solid rgba(0,172,71,0.15);
}

.sh-card-name {
  font-weight: 900; font-size: 16px; color: #1e293b;
  cursor: pointer; transition: color 0.15s;
}
.sh-card-name:hover { color: #00ac47; }
.sh-card-role { font-size: 13px; color: #64748b; margin-top: 2px; }

.sh-card-stats {
  padding: 14px 20px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  border-bottom: 1px solid #f1f5f9;
}

.sh-stat-box {
  background: #f8fafc;
  border-radius: 12px;
  padding: 10px 12px;
}
.sh-stat-label { font-size: 12px; color: #94a3b8; font-weight: 700; margin-bottom: 4px; }
.sh-stat-value { font-size: 18px; font-weight: 900; color: #1e293b; }
.sh-stat-unit { font-size: 11px; color: #94a3b8; font-weight: 600; }

.sh-card-actions {
  padding: 14px 20px;
  display: flex;
  gap: 8px;
}

.sh-btn-primary {
  flex: 1;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px 14px;
  background: #00ac47; color: #fff;
  border: none; border-radius: 12px;
  font-size: 14px; font-weight: 800;
  cursor: pointer; transition: background 0.15s;
}
.sh-btn-primary:hover { background: #009940; }

.sh-btn-secondary {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px 14px;
  background: #f1f5f9; color: #475569;
  border: none; border-radius: 12px;
  font-size: 14px; font-weight: 700;
  cursor: pointer; transition: background 0.15s;
}
.sh-btn-secondary:hover { background: #e2e8f0; }

/* form */
.sh-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.sh-form-group { display: flex; flex-direction: column; gap: 6px; }
.sh-form-group label { font-size: 13px; font-weight: 800; color: #475569; }
.sh-calc-box {
  background: linear-gradient(135deg, rgba(0,172,71,0.08), rgba(0,172,71,0.04));
  border: 1px solid rgba(0,172,71,0.18);
  border-radius: 14px; padding: 14px 18px;
  display: flex; justify-content: space-between; align-items: center;
}
.sh-calc-label { font-size: 14px; font-weight: 700; color: #475569; }
.sh-calc-values { text-align: left; }
.sh-calc-hours { font-size: 16px; font-weight: 900; color: #00ac47; }
.sh-calc-total { font-size: 13px; color: #64748b; font-weight: 700; margin-top: 2px; }

/* monthly table */
.sh-month-table { width: 100%; border-collapse: collapse; direction: rtl; }
.sh-month-table th {
  background: #f8fafc; color: #64748b; font-weight: 800; font-size: 13px;
  padding: 12px 16px; border-bottom: 2px solid #f1f5f9; text-align: right;
  white-space: nowrap;
}
.sh-month-table td {
  padding: 12px 16px; border-bottom: 1px solid #f8fafc;
  color: #334155; font-size: 14px; text-align: right;
}
.sh-month-table tr:last-child td { border-bottom: none; }
.sh-month-table tr:hover td { background: #fafafa; }

.sh-paid-badge {
  display: inline-flex; align-items: center; gap: 5px;
  background: rgba(0,172,71,0.1); color: #00ac47;
  border: 1px solid rgba(0,172,71,0.2);
  border-radius: 10px; padding: 4px 10px;
  font-size: 12px; font-weight: 800; white-space: nowrap;
}
.sh-unpaid-badge {
  display: inline-flex; align-items: center; gap: 5px;
  background: rgba(245,158,11,0.1); color: #d97706;
  border: 1px solid rgba(245,158,11,0.2);
  border-radius: 10px; padding: 4px 10px;
  font-size: 12px; font-weight: 800; white-space: nowrap;
}

.sh-convert-btn {
  display: inline-flex; align-items: center; gap: 5px;
  background: #fff7ed; color: #ea580c;
  border: 1px solid rgba(234,88,12,0.25);
  border-radius: 10px; padding: 6px 12px;
  font-size: 13px; font-weight: 800;
  cursor: pointer; transition: background 0.15s; white-space: nowrap;
}
.sh-convert-btn:hover { background: #ffedd5; }
.sh-convert-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.sh-detail-link {
  display: inline-flex; align-items: center; gap: 4px;
  color: #00ac47; font-size: 13px; font-weight: 800;
  cursor: pointer; background: none; border: none; padding: 0;
  text-decoration: none; transition: opacity 0.15s;
}
.sh-detail-link:hover { opacity: 0.7; }

@media (max-width: 600px) {
  .sh-form-row { grid-template-columns: 1fr; }
  .sh-cards-grid { grid-template-columns: 1fr; }
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
   MAIN PAGE
   ══════════════════════════════════════════════════════════════ */
export default function StaffHours() {
  injectStyles();
  const navigate = useNavigate();

  const [staff, setStaff] = useState([]);
  const [allHours, setAllHours] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  /* modals */
  const [logModal, setLogModal]     = useState(null); // { staffId, staffName, editRow? }
  const [monthsModal, setMonthsModal] = useState(null); // { staffId, staffName }
  const [staffModal, setStaffModal] = useState(null);
  const [deleteLog, setDeleteLog]   = useState(null);
  const [deleteStaff, setDeleteStaff] = useState(null);

  /* form */
  const [form, setForm]         = useState(EMPTY_FORM);
  const [staffForm, setStaffForm] = useState({ name: "", role: "", phone: "" });
  const [saving, setSaving]     = useState(false);

  /* monthly modal data */
  const [monthsAllHours, setMonthsAllHours]   = useState([]);
  const [monthsPayments, setMonthsPayments]   = useState([]);
  const [monthsLoading, setMonthsLoading]     = useState(false);
  const [converting, setConverting]           = useState(null); // key being converted

  /* ─── load ─── */
  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [{ data: s, error: se }, { data: ah, error: ahe }, { data: ap, error: ape }] = await Promise.all([
        supabase.from("staff").select("*").order("name"),
        supabase.from("staff_hours").select("staff_id, work_date, start_time, end_time, hourly_rate"),
        supabase.from("staff_salary_payments").select("staff_id, date_from, date_to"),
      ]);
      if (se) throw se;
      if (ahe || ape) throw ahe || ape;
      setStaff(s || []);
      setAllHours(ah || []);
      setAllPayments(ap || []);
    } catch (e) {
      setErr(e.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);


  /* ─── per-staff unpaid (all time) ─── */
  const staffUnpaid = useMemo(() => {
    const map = {};
    for (const row of allHours) {
      const covered = allPayments.some(p =>
        p.staff_id === row.staff_id &&
        row.work_date >= p.date_from &&
        row.work_date <= p.date_to
      );
      if (!covered) {
        if (!map[row.staff_id]) map[row.staff_id] = { amount: 0, hours: 0 };
        const h = calcHours(row.start_time, row.end_time);
        map[row.staff_id].amount += h * Number(row.hourly_rate || 0);
        map[row.staff_id].hours += h;
      }
    }
    return map;
  }, [allHours, allPayments]);

  /* ─── global KPIs (unpaid totals) ─── */
  const kpi = useMemo(() => {
    let totalHours = 0, totalAmount = 0;
    for (const v of Object.values(staffUnpaid)) {
      totalHours += v.hours;
      totalAmount += v.amount;
    }
    return { totalHours, totalAmount, staffCount: staff.length };
  }, [staffUnpaid, staff]);

  /* ─── monthly modal data ─── */
  async function loadMonthsData(staffId) {
    setMonthsLoading(true);
    const [{ data: hrs }, { data: pays }] = await Promise.all([
      supabase.from("staff_hours").select("*").eq("staff_id", staffId).order("work_date"),
      supabase.from("staff_salary_payments").select("*").eq("staff_id", staffId),
    ]);
    setMonthsAllHours(hrs || []);
    setMonthsPayments(pays || []);
    setMonthsLoading(false);
  }

  // ساعات غير مدفوعة (خارج نطاق أي دفعة)
  const monthsUnpaidHours = useMemo(() => monthsAllHours.filter(r =>
    r.work_date && !monthsPayments.some(p => r.work_date >= p.date_from && r.work_date <= p.date_to)
  ), [monthsAllHours, monthsPayments]);

  const monthsUnpaidTotals = useMemo(() => {
    let hours = 0, amount = 0;
    for (const r of monthsUnpaidHours) {
      const h = calcHours(r.start_time, r.end_time);
      hours += h;
      amount += h * Number(r.hourly_rate || 0);
    }
    const dates = monthsUnpaidHours.map(r => r.work_date).filter(Boolean).sort();
    return { hours, amount, count: monthsUnpaidHours.length, minDate: dates[0], maxDate: dates[dates.length - 1] };
  }, [monthsUnpaidHours]);

  /* ─── convert unpaid to expense ─── */
  async function convertToExpense() {
    if (!monthsModal || monthsUnpaidTotals.count === 0) return;
    setConverting(true);
    const { minDate, maxDate, hours, amount } = monthsUnpaidTotals;
    const description = `راتب ${monthsModal.staffName} — ${fmtDate(minDate)} إلى ${fmtDate(maxDate)}`;

    await supabase.from("expense_parties").insert([{ name: monthsModal.staffName }]).then(() => {});

    const { data: expData, error: expErr } = await supabase
      .from("expenses")
      .insert([{ spent_on: maxDate, amount, category: "معاش", party: monthsModal.staffName, description }])
      .select("id").single();

    if (expErr) { setErr(expErr.message); setConverting(false); return; }

    const { error: payErr } = await supabase.from("staff_salary_payments").insert([{
      staff_id: monthsModal.staffId,
      date_from: minDate,
      date_to: maxDate,
      total_hours: hours,
      total_amount: amount,
      expense_id: expData.id,
    }]);

    setConverting(false);
    if (payErr) { setErr(payErr.message); return; }
    loadMonthsData(monthsModal.staffId);
    load();
  }

  /* ─── log modal ─── */
  function openLog(member, editRow = null) {
    setLogModal({ staffId: member.id, staffName: member.name, editRow });
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
      staff_id: logModal.staffId,
      work_date: form.work_date,
      start_time: form.start_time,
      end_time: form.end_time,
      hourly_rate: Number(form.hourly_rate),
      notes: form.notes || null,
    };
    let error;
    if (logModal.editRow) {
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

  /* ─── staff modal ─── */
  async function saveStaff() {
    if (!staffForm.name.trim()) return;
    setSaving(true);
    let error;
    if (staffModal?.id) {
      ({ error } = await supabase.from("staff")
        .update({ name: staffForm.name, role: staffForm.role, phone: staffForm.phone })
        .eq("id", staffModal.id));
    } else {
      ({ error } = await supabase.from("staff")
        .insert([{ name: staffForm.name, role: staffForm.role, phone: staffForm.phone }]));
    }
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setStaffModal(null);
    load();
  }

  async function confirmDeleteStaff() {
    if (!deleteStaff) return;
    await supabase.from("staff").delete().eq("id", deleteStaff.id);
    setDeleteStaff(null);
    load();
  }

  const hoursCalc = calcHours(form.start_time, form.end_time);
  const totalCalc = hoursCalc * Number(form.hourly_rate || 0);


  /* ══════════ RENDER ══════════ */
  return (
    <div className="container sh-page">
      <PageHeader
        title="ساعات العمل"
        subtitle="متابعة ساعات عمل المعلمات والمبالغ المستحقة"
        actions={
          <button className="btn" onClick={() => { setStaffModal("add"); setStaffForm({ name: "", role: "", phone: "" }); }}>
            <Plus size={16} /> إضافة معلمة
          </button>
        }
      />

      {err && <ErrorBanner message={err} onClose={() => setErr(null)} />}

      {/* KPIs */}
      <div className="sh-kpi-grid">
        <KpiCard icon={Users}     label="عدد المعلمات"         value={kpi.staffCount}                         hint="إجمالي المعلمات" variant="info" />
        <KpiCard icon={Clock}     label="ساعات غير مدفوعة"    value={`${kpi.totalHours.toFixed(1)} س`}        hint="إجمالي متراكم" variant="ok" />
        <KpiCard icon={Banknote}  label="مستحقات غير مدفوعة"  value={`${fmtMoney(kpi.totalAmount)} ₪`}        hint="إجمالي متراكم" variant="warn" />
        <KpiCard icon={TrendingUp} label="متوسط / معلمة"      value={kpi.staffCount > 0 ? `${(kpi.totalHours / kpi.staffCount).toFixed(1)} س` : "—"} hint="غير مدفوع" variant="neutral" />
      </div>

      {/* cards */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8", fontWeight: 800 }}>جار التحميل...</div>
      ) : staff.length === 0 ? (
        <EmptyState icon={Users} title="لا يوجد معلمات" description="أضف معلمة جديدة للبدء" />
      ) : (
        <div className="sh-cards-grid">
          {staff.map((member) => {
            const unpaidData = staffUnpaid[member.id] || { amount: 0, hours: 0 };
            const unpaidAmount = unpaidData.amount;
            const unpaidHours = unpaidData.hours;
            return (
              <div key={member.id} className="sh-teacher-card" style={{ cursor: "pointer" }}
                onClick={() => navigate(`/staff-hours/${member.id}`)}>
                <div className="sh-card-header" style={{ justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0, opacity: 0.3, transition: "opacity 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "0.3"}>
                    <IconButton icon={Pencil} size={13} title="تعديل" onClick={e => { e.stopPropagation(); setStaffModal(member); setStaffForm({ name: member.name, role: member.role || "", phone: member.phone || "" }); }} />
                    <IconButton icon={Trash2} size={13} title="حذف" variant="danger" onClick={e => { e.stopPropagation(); setDeleteStaff(member); }} />
                  </div>
                  <div style={{ textAlign: "right", minWidth: 0 }}>
                    <div style={{
                      fontSize: 22, fontWeight: 900,
                      letterSpacing: "-0.5px", lineHeight: 1.2,
                      background: "linear-gradient(135deg, #1e293b 0%, #00ac47 100%)",
                      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    }}>{member.name}</div>
                    {member.role && <div className="sh-card-role" style={{ marginTop: 3 }}>{member.role}</div>}
                  </div>
                </div>

                <div className="sh-card-stats">
                  <div className="sh-stat-box">
                    <div className="sh-stat-label">المستحق غير المدفوع</div>
                    <div className="sh-stat-value" style={{ fontSize: 16, color: unpaidAmount > 0 ? "#d97706" : "#00ac47" }}>
                      {fmtMoney(unpaidAmount)}<span className="sh-stat-unit"> ₪</span>
                    </div>
                  </div>
                  <div className="sh-stat-box">
                    <div className="sh-stat-label">ساعات غير مدفوعة</div>
                    <div className="sh-stat-value" style={{ fontSize: 16, color: unpaidHours > 0 ? "#d97706" : "#00ac47" }}>
                      {unpaidHours.toFixed(1)}<span className="sh-stat-unit"> س</span>
                    </div>
                  </div>
                </div>

                <div className="sh-card-actions">
                  <button className="sh-btn-primary" onClick={e => { e.stopPropagation(); openLog(member); }}>
                    <Plus size={16} /> تسجيل ساعات
                  </button>
                  <button className="sh-btn-secondary" onClick={e => { e.stopPropagation(); setMonthsModal({ staffId: member.id, staffName: member.name }); loadMonthsData(member.id); }}>
                    <BarChart2 size={16} /> فواتير
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════ Log Hours Modal ════ */}
      <Modal open={!!logModal} title={logModal ? `تسجيل ساعات — ${logModal.staffName}` : ""} onClose={() => setLogModal(null)} maxWidth={480}>
        <div className="stack" style={{ direction: "rtl" }}>
          <div className="sh-form-group">
            <label>التاريخ</label>
            <input type="date" className="input" value={form.work_date} onChange={e => setForm(f => ({ ...f, work_date: e.target.value }))} />
          </div>
          <div className="sh-form-row">
            <div className="sh-form-group">
              <label>ساعة البدء</label>
              <input type="time" className="input" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
            </div>
            <div className="sh-form-group">
              <label>ساعة الانتهاء</label>
              <input type="time" className="input" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
            </div>
          </div>
          <div className="sh-form-group">
            <label>المبلغ على الساعة (₪)</label>
            <input type="number" min="0" step="0.5" className="input" placeholder="مثال: 50" value={form.hourly_rate} onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))} style={{ textAlign: "right" }} />
          </div>
          {hoursCalc > 0 && (
            <div className="sh-calc-box">
              <div className="sh-calc-label">الحساب التلقائي</div>
              <div className="sh-calc-values">
                <div className="sh-calc-hours">{hoursCalc.toFixed(2)} ساعة</div>
                {totalCalc > 0 && <div className="sh-calc-total">= {fmtMoney(totalCalc)} ₪</div>}
              </div>
            </div>
          )}
          <div className="sh-form-group">
            <label>ملاحظات (اختياري)</label>
            <input type="text" className="input" placeholder="أي ملاحظة..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <button className="btn" disabled={saving || !form.work_date || !form.start_time || !form.end_time || !form.hourly_rate} onClick={saveLog} style={{ width: "100%", justifyContent: "center" }}>
            {saving ? "جار الحفظ..." : logModal?.editRow ? "حفظ التعديلات" : "تسجيل"}
          </button>
        </div>
      </Modal>

      {/* ════ Monthly Summary Modal ════ */}
      <Modal open={!!monthsModal} title={monthsModal ? `فواتير — ${monthsModal.staffName}` : ""} onClose={() => setMonthsModal(null)} maxWidth={560}>
        {monthsLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontWeight: 800 }}>جار التحميل...</div>
        ) : monthsAllHours.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontWeight: 800 }}>لا يوجد سجلات بعد</div>
        ) : (
          <div className="stack" style={{ direction: "rtl", gap: 14 }}>

            {/* Unpaid block */}
            {monthsUnpaidTotals.count > 0 && (
              <div style={{ background: "#fffbeb", border: "1.5px solid rgba(245,158,11,0.25)", borderRadius: 14, padding: "14px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                  <div>
                    <span className="sh-unpaid-badge" style={{ marginLeft: 8 }}>غير مدفوع</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#334155" }}>
                      {monthsUnpaidTotals.count} يوم · {monthsUnpaidTotals.hours.toFixed(2)} س · {fmtMoney(monthsUnpaidTotals.amount)} ₪
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>
                    {fmtDate(monthsUnpaidTotals.minDate)} — {fmtDate(monthsUnpaidTotals.maxDate)}
                  </span>
                </div>
                <button className="sh-convert-btn" disabled={converting} onClick={convertToExpense} style={{ width: "100%", justifyContent: "center" }}>
                  <Receipt size={14} /> {converting ? "جار التسجيل..." : `تحويل لمصروف — ${fmtMoney(monthsUnpaidTotals.amount)} ₪`}
                </button>
              </div>
            )}

            {/* Paid records */}
            {monthsPayments.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#64748b", marginBottom: 8 }}>الدفعات المسجلة</div>
                <table className="sh-month-table">
                  <thead><tr><th>الفترة</th><th>ساعات</th><th>المبلغ</th><th>الحالة</th></tr></thead>
                  <tbody>
                    {monthsPayments.sort((a, b) => b.date_from.localeCompare(a.date_from)).map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 800, fontSize: 13 }}>{fmtDate(p.date_from)} — {fmtDate(p.date_to)}</td>
                        <td style={{ color: "#00ac47", fontWeight: 800 }}>{Number(p.total_hours || 0).toFixed(2)} س</td>
                        <td style={{ fontWeight: 800 }}>{fmtMoney(p.total_amount)} ₪</td>
                        <td><span className="sh-paid-badge"><CheckCircle2 size={13} /> تم الدفع</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ textAlign: "center", borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
              <button className="sh-detail-link" onClick={() => { setMonthsModal(null); navigate(`/staff-hours/${monthsModal.staffId}`); }}>
                عرض التفاصيل الكاملة وطباعة الفاتورة <ChevronLeft size={15} />
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ════ Staff Modal ════ */}
      <Modal open={!!staffModal} title={staffModal?.id ? "تعديل معلمة" : "إضافة معلمة جديدة"} onClose={() => setStaffModal(null)} maxWidth={420}>
        <div className="stack" style={{ direction: "rtl" }}>
          <div className="sh-form-group">
            <label>الاسم *</label>
            <input type="text" className="input" placeholder="اسم المعلمة" value={staffForm.name} onChange={e => setStaffForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="sh-form-group">
            <label>الدور / التخصص</label>
            <input type="text" className="input" placeholder="مثال: معلمة رياضيات" value={staffForm.role} onChange={e => setStaffForm(f => ({ ...f, role: e.target.value }))} />
          </div>
          <div className="sh-form-group">
            <label>رقم الهاتف</label>
            <input type="tel" className="input" placeholder="05X-XXXXXXX" value={staffForm.phone} onChange={e => setStaffForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <button className="btn" disabled={saving || !staffForm.name.trim()} onClick={saveStaff} style={{ width: "100%", justifyContent: "center" }}>
            {saving ? "جار الحفظ..." : "حفظ"}
          </button>
        </div>
      </Modal>

      {/* ════ Confirms ════ */}
      <ConfirmDialog open={!!deleteLog} title="حذف السجل" message="هل أنت متأكد من حذف هذا السجل؟" confirmText="حذف" cancelText="إلغاء" danger onConfirm={confirmDeleteLog} onCancel={() => setDeleteLog(null)} />
      <ConfirmDialog open={!!deleteStaff} title="حذف المعلمة" message={`هل تريد حذف "${deleteStaff?.name}"؟`} confirmText="حذف" cancelText="إلغاء" danger onConfirm={confirmDeleteStaff} onCancel={() => setDeleteStaff(null)} />
    </div>
  );
}
