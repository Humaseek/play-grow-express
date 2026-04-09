import React, { useEffect, useMemo, useState } from "react";
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
  History,
  TrendingUp,
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

function monthRange() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(y, d.getMonth() + 1, 0).getDate();
  return {
    from: `${y}-${m}-01`,
    to: `${y}-${m}-${String(lastDay).padStart(2, "0")}`,
  };
}

const EMPTY_FORM = {
  work_date: todayISO(),
  start_time: "",
  end_time: "",
  hourly_rate: "",
  notes: "",
};

/* ─── styles injected once ─── */
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
  background: linear-gradient(135deg, rgba(0,172,71,0.18), rgba(0,172,71,0.08));
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  color: #00ac47;
  font-weight: 900;
  font-size: 18px;
  border: 2px solid rgba(0,172,71,0.15);
}

.sh-card-name { font-weight: 900; font-size: 16px; color: #1e293b; }
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
  background: #00ac47;
  color: #fff;
  border: none; border-radius: 12px;
  font-size: 14px; font-weight: 800;
  cursor: pointer;
  transition: background 0.15s;
}
.sh-btn-primary:hover { background: #009940; }

.sh-btn-secondary {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px 14px;
  background: #f1f5f9;
  color: #475569;
  border: none; border-radius: 12px;
  font-size: 14px; font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
}
.sh-btn-secondary:hover { background: #e2e8f0; }

/* form */
.sh-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.sh-form-group { display: flex; flex-direction: column; gap: 6px; }
.sh-form-group label { font-size: 13px; font-weight: 800; color: #475569; }
.sh-form-group .input { text-align: right; }
.sh-calc-box {
  background: linear-gradient(135deg, rgba(0,172,71,0.08), rgba(0,172,71,0.04));
  border: 1px solid rgba(0,172,71,0.18);
  border-radius: 14px;
  padding: 14px 18px;
  display: flex; justify-content: space-between; align-items: center;
}
.sh-calc-label { font-size: 14px; font-weight: 700; color: #475569; }
.sh-calc-values { text-align: left; }
.sh-calc-hours { font-size: 16px; font-weight: 900; color: #00ac47; }
.sh-calc-total { font-size: 13px; color: #64748b; font-weight: 700; margin-top: 2px; }

/* history table */
.sh-hist-table {
  width: 100%; border-collapse: collapse; direction: rtl;
}
.sh-hist-table th {
  background: #f8fafc; color: #64748b; font-weight: 800; font-size: 13px;
  padding: 12px 16px; border-bottom: 2px solid #f1f5f9; text-align: right;
}
.sh-hist-table td {
  padding: 12px 16px; border-bottom: 1px solid #f8fafc;
  color: #334155; font-size: 14px; text-align: right;
}
.sh-hist-table tr:hover td { background: #fafafa; }

.sh-fab {
  position: fixed;
  bottom: 28px; left: 28px;
  width: 56px; height: 56px;
  border-radius: 50%;
  background: #00ac47;
  color: #fff;
  border: none;
  box-shadow: 0 8px 24px rgba(0,172,71,0.35);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  font-size: 24px;
  transition: background 0.15s, transform 0.15s;
  z-index: 40;
}
.sh-fab:hover { background: #009940; transform: scale(1.07); }

.sh-month-badge {
  background: rgba(0,172,71,0.1);
  color: #00ac47;
  border: 1px solid rgba(0,172,71,0.2);
  border-radius: 10px;
  padding: 4px 10px;
  font-size: 13px;
  font-weight: 800;
}

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

/* ════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════ */
export default function StaffHours() {
  injectStyles();

  const [staff, setStaff] = useState([]);
  const [hours, setHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  /* modals */
  const [logModal, setLogModal] = useState(null);   // { staffId, staffName, editRow? }
  const [histModal, setHistModal] = useState(null); // { staffId, staffName }
  const [staffModal, setStaffModal] = useState(null); // null | 'add' | { edit row }
  const [deleteLog, setDeleteLog] = useState(null); // log row to delete
  const [deleteStaff, setDeleteStaff] = useState(null);

  /* form state */
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  /* staff form */
  const [staffForm, setStaffForm] = useState({ name: "", role: "", phone: "" });

  const { from, to } = useMemo(() => monthRange(), []);

  /* ─── load ─── */
  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [{ data: s, error: se }, { data: h, error: he }] = await Promise.all([
        supabase.from("staff").select("*").order("name"),
        supabase
          .from("staff_hours")
          .select("*")
          .gte("work_date", from)
          .lte("work_date", to)
          .order("work_date", { ascending: false }),
      ]);
      if (se) throw se;
      if (he) throw he;
      setStaff(s || []);
      setHours(h || []);
    } catch (e) {
      setErr(e.message || "حدث خطأ أثناء التحميل");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  /* ─── per-staff stats ─── */
  const staffStats = useMemo(() => {
    const map = {};
    for (const row of hours) {
      if (!map[row.staff_id]) map[row.staff_id] = { totalHours: 0, totalAmount: 0, count: 0 };
      const h = calcHours(row.start_time, row.end_time);
      const amt = h * Number(row.hourly_rate || 0);
      map[row.staff_id].totalHours += h;
      map[row.staff_id].totalAmount += amt;
      map[row.staff_id].count += 1;
    }
    return map;
  }, [hours]);

  /* ─── global KPIs ─── */
  const kpi = useMemo(() => {
    let totalHours = 0, totalAmount = 0;
    for (const v of Object.values(staffStats)) {
      totalHours += v.totalHours;
      totalAmount += v.totalAmount;
    }
    return { totalHours, totalAmount, staffCount: staff.length };
  }, [staffStats, staff]);

  /* ─── history for modal ─── */
  const [histRows, setHistRows] = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  async function loadHistory(staffId) {
    setHistLoading(true);
    const { data, error } = await supabase
      .from("staff_hours")
      .select("*")
      .eq("staff_id", staffId)
      .order("work_date", { ascending: false })
      .limit(100);
    setHistLoading(false);
    if (!error) setHistRows(data || []);
  }

  /* ─── open log modal ─── */
  function openLog(member, editRow = null) {
    setLogModal({ staffId: member.id, staffName: member.name, editRow });
    if (editRow) {
      setForm({
        work_date: editRow.work_date || todayISO(),
        start_time: editRow.start_time || "",
        end_time: editRow.end_time || "",
        hourly_rate: String(editRow.hourly_rate || ""),
        notes: editRow.notes || "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }

  /* ─── save log ─── */
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
    // refresh history if open
    if (histModal?.staffId === logModal.staffId) loadHistory(logModal.staffId);
  }

  /* ─── delete log ─── */
  async function confirmDeleteLog() {
    if (!deleteLog) return;
    await supabase.from("staff_hours").delete().eq("id", deleteLog.id);
    setDeleteLog(null);
    load();
    if (histModal) loadHistory(histModal.staffId);
  }

  /* ─── save staff ─── */
  async function saveStaff() {
    if (!staffForm.name.trim()) return;
    setSaving(true);
    let error;
    if (staffModal && typeof staffModal === "object" && staffModal.id) {
      ({ error } = await supabase.from("staff").update({ name: staffForm.name, role: staffForm.role, phone: staffForm.phone }).eq("id", staffModal.id));
    } else {
      ({ error } = await supabase.from("staff").insert([{ name: staffForm.name, role: staffForm.role, phone: staffForm.phone }]));
    }
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setStaffModal(null);
    load();
  }

  /* ─── delete staff ─── */
  async function confirmDeleteStaff() {
    if (!deleteStaff) return;
    await supabase.from("staff").delete().eq("id", deleteStaff.id);
    setDeleteStaff(null);
    load();
  }

  /* ─── computed for form ─── */
  const hoursCalc = calcHours(form.start_time, form.end_time);
  const totalCalc = hoursCalc * Number(form.hourly_rate || 0);

  /* ─── current month label ─── */
  const monthLabel = new Date().toLocaleString("ar", { month: "long", year: "numeric" });

  /* ══════════ RENDER ══════════ */
  return (
    <div className="container sh-page">
      <PageHeader
        title="ساعات العمل"
        subtitle="متابعة ساعات عمل المعلمات والمبالغ المستحقة"
        actions={
          <button
            className="btn"
            onClick={() => { setStaffModal("add"); setStaffForm({ name: "", role: "", phone: "" }); }}
          >
            <Plus size={16} /> إضافة معلمة
          </button>
        }
      />

      {err && <ErrorBanner message={err} onClose={() => setErr(null)} />}

      {/* KPIs */}
      <div className="sh-kpi-grid">
        <KpiCard
          icon={Users}
          label="عدد المعلمات"
          value={kpi.staffCount}
          hint="إجمالي المعلمات المسجلات"
          variant="info"
        />
        <KpiCard
          icon={Clock}
          label="ساعات هذا الشهر"
          value={`${kpi.totalHours.toFixed(1)} س`}
          hint={monthLabel}
          variant="ok"
        />
        <KpiCard
          icon={Banknote}
          label="إجمالي المستحقات"
          value={`${fmtMoney(kpi.totalAmount)} ₪`}
          hint={`${monthLabel}`}
          variant="warn"
        />
        <KpiCard
          icon={TrendingUp}
          label="متوسط ساعات / معلمة"
          value={kpi.staffCount > 0 ? `${(kpi.totalHours / kpi.staffCount).toFixed(1)} س` : "—"}
          hint="هذا الشهر"
          variant="neutral"
        />
      </div>

      {/* staff cards */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8", fontWeight: 800 }}>جار التحميل...</div>
      ) : staff.length === 0 ? (
        <EmptyState
          icon={Users}
          title="لا يوجد معلمات"
          description="أضف معلمة جديدة للبدء بتسجيل ساعات العمل"
        />
      ) : (
        <div className="sh-cards-grid">
          {staff.map((member) => {
            const stats = staffStats[member.id] || { totalHours: 0, totalAmount: 0, count: 0 };
            const initials = member.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("");
            return (
              <div key={member.id} className="sh-teacher-card">
                {/* header */}
                <div className="sh-card-header">
                  <div className="sh-avatar">{initials}</div>
                  <div style={{ flex: 1 }}>
                    <div className="sh-card-name">{member.name}</div>
                    {member.role && <div className="sh-card-role">{member.role}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <IconButton
                      icon={Pencil}
                      size={15}
                      title="تعديل"
                      onClick={() => {
                        setStaffModal(member);
                        setStaffForm({ name: member.name, role: member.role || "", phone: member.phone || "" });
                      }}
                    />
                    <IconButton
                      icon={Trash2}
                      size={15}
                      title="حذف"
                      variant="danger"
                      onClick={() => setDeleteStaff(member)}
                    />
                  </div>
                </div>

                {/* stats */}
                <div className="sh-card-stats">
                  <div className="sh-stat-box">
                    <div className="sh-stat-label">ساعات الشهر</div>
                    <div className="sh-stat-value">
                      {stats.totalHours.toFixed(1)}
                      <span className="sh-stat-unit"> س</span>
                    </div>
                  </div>
                  <div className="sh-stat-box">
                    <div className="sh-stat-label">المستحق</div>
                    <div className="sh-stat-value" style={{ fontSize: 15 }}>
                      {fmtMoney(stats.totalAmount)}
                      <span className="sh-stat-unit"> ₪</span>
                    </div>
                  </div>
                  <div className="sh-stat-box" style={{ gridColumn: "1 / -1" }}>
                    <div className="sh-stat-label">عدد الجلسات المسجلة</div>
                    <div className="sh-stat-value" style={{ fontSize: 16 }}>
                      {stats.count}
                      <span className="sh-stat-unit"> جلسة هذا الشهر</span>
                    </div>
                  </div>
                </div>

                {/* actions */}
                <div className="sh-card-actions">
                  <button className="sh-btn-primary" onClick={() => openLog(member)}>
                    <Plus size={16} /> تسجيل ساعات
                  </button>
                  <button
                    className="sh-btn-secondary"
                    onClick={() => { setHistModal({ staffId: member.id, staffName: member.name }); loadHistory(member.id); }}
                  >
                    <History size={16} /> السجل
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════ Log Hours Modal ════ */}
      <Modal
        open={!!logModal}
        title={logModal ? `تسجيل ساعات — ${logModal.staffName}` : ""}
        onClose={() => setLogModal(null)}
        maxWidth={480}
      >
        <div className="stack" style={{ direction: "rtl" }}>
          {/* date */}
          <div className="sh-form-group">
            <label>التاريخ</label>
            <input
              type="date"
              className="input"
              value={form.work_date}
              onChange={e => setForm(f => ({ ...f, work_date: e.target.value }))}
            />
          </div>

          {/* times */}
          <div className="sh-form-row">
            <div className="sh-form-group">
              <label>ساعة البدء</label>
              <input
                type="time"
                className="input"
                value={form.start_time}
                onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
              />
            </div>
            <div className="sh-form-group">
              <label>ساعة الانتهاء</label>
              <input
                type="time"
                className="input"
                value={form.end_time}
                onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
              />
            </div>
          </div>

          {/* hourly rate */}
          <div className="sh-form-group">
            <label>المبلغ على الساعة (₪)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              className="input"
              placeholder="مثال: 50"
              value={form.hourly_rate}
              onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))}
              style={{ textAlign: "right" }}
            />
          </div>

          {/* auto-calc */}
          {hoursCalc > 0 && (
            <div className="sh-calc-box">
              <div className="sh-calc-label">الحساب التلقائي</div>
              <div className="sh-calc-values">
                <div className="sh-calc-hours">{hoursCalc.toFixed(2)} ساعة</div>
                {totalCalc > 0 && (
                  <div className="sh-calc-total">= {fmtMoney(totalCalc)} ₪</div>
                )}
              </div>
            </div>
          )}

          {/* notes */}
          <div className="sh-form-group">
            <label>ملاحظات (اختياري)</label>
            <input
              type="text"
              className="input"
              placeholder="أي ملاحظة إضافية..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <button
            className="btn"
            disabled={saving || !form.work_date || !form.start_time || !form.end_time || !form.hourly_rate}
            onClick={saveLog}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {saving ? "جار الحفظ..." : logModal?.editRow ? "حفظ التعديلات" : "تسجيل"}
          </button>
        </div>
      </Modal>

      {/* ════ History Modal ════ */}
      <Modal
        open={!!histModal}
        title={histModal ? `سجل ساعات — ${histModal.staffName}` : ""}
        onClose={() => setHistModal(null)}
        maxWidth={700}
      >
        {histLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontWeight: 800 }}>جار التحميل...</div>
        ) : histRows.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontWeight: 800 }}>لا يوجد سجلات</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="sh-hist-table">
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
                {histRows.map((row) => {
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
                          <IconButton
                            icon={Pencil}
                            size={14}
                            title="تعديل"
                            onClick={() => {
                              openLog({ id: histModal.staffId, name: histModal.staffName }, row);
                            }}
                          />
                          <IconButton
                            icon={Trash2}
                            size={14}
                            title="حذف"
                            variant="danger"
                            onClick={() => setDeleteLog(row)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* ════ Add/Edit Staff Modal ════ */}
      <Modal
        open={!!staffModal}
        title={staffModal && typeof staffModal === "object" && staffModal.id ? "تعديل معلمة" : "إضافة معلمة جديدة"}
        onClose={() => setStaffModal(null)}
        maxWidth={420}
      >
        <div className="stack" style={{ direction: "rtl" }}>
          <div className="sh-form-group">
            <label>الاسم *</label>
            <input
              type="text"
              className="input"
              placeholder="اسم المعلمة"
              value={staffForm.name}
              onChange={e => setStaffForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="sh-form-group">
            <label>الدور / التخصص</label>
            <input
              type="text"
              className="input"
              placeholder="مثال: معلمة رياضيات"
              value={staffForm.role}
              onChange={e => setStaffForm(f => ({ ...f, role: e.target.value }))}
            />
          </div>
          <div className="sh-form-group">
            <label>رقم الهاتف</label>
            <input
              type="tel"
              className="input"
              placeholder="05X-XXXXXXX"
              value={staffForm.phone}
              onChange={e => setStaffForm(f => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <button
            className="btn"
            disabled={saving || !staffForm.name.trim()}
            onClick={saveStaff}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {saving ? "جار الحفظ..." : "حفظ"}
          </button>
        </div>
      </Modal>

      {/* ════ Confirm Dialogs ════ */}
      <ConfirmDialog
        open={!!deleteLog}
        title="حذف السجل"
        message="هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع."
        confirmText="حذف"
        cancelText="إلغاء"
        danger
        onConfirm={confirmDeleteLog}
        onCancel={() => setDeleteLog(null)}
      />
      <ConfirmDialog
        open={!!deleteStaff}
        title="حذف المعلمة"
        message={`هل تريد حذف "${deleteStaff?.name}"؟ سيتم حذف جميع سجلات ساعات العمل المرتبطة بها.`}
        confirmText="حذف"
        cancelText="إلغاء"
        danger
        onConfirm={confirmDeleteStaff}
        onCancel={() => setDeleteStaff(null)}
      />
    </div>
  );
}
