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
  return new Date(y, m - 1, 1).toLocaleString("ar", {
    month: "long",
    year: "numeric",
  });
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

.sd-month-nav {
  display: inline-flex; align-items: center; gap: 4px;
  background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
  padding: 4px 6px;
}
.sd-month-nav-arrow {
  width: 32px; height: 32px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  border: none; background: none; cursor: pointer;
  color: #64748b; font-size: 18px; transition: background 0.12s;
}
.sd-month-nav-arrow:hover { background: #f1f5f9; color: #1e293b; }
.sd-month-nav-arrow:disabled { opacity: 0.3; cursor: default; }
.sd-month-nav-label {
  display: inline-flex; align-items: center; gap: 6px; padding: 4px 6px;
}
.sd-month-nav-part {
  font-size: 15px; font-weight: 900; color: #1e293b;
  padding: 4px 8px; border-radius: 8px; cursor: pointer;
  transition: background 0.12s; border: none; background: none;
}
.sd-month-nav-part:hover { background: #f1f5f9; }
.sd-month-nav-part.active { background: rgba(0,172,71,0.1); color: #00ac47; }
.sd-month-dropdown {
  position: absolute; top: calc(100% + 6px); right: 0;
  background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.1);
  z-index: 200; min-width: 140px; padding: 6px;
  display: grid; grid-template-columns: 1fr 1fr; gap: 2px;
}
.sd-month-dropdown.years { grid-template-columns: 1fr; min-width: 100px; }
.sd-month-opt {
  padding: 8px 10px; border-radius: 10px; font-size: 14px; font-weight: 700;
  color: #334155; cursor: pointer; text-align: center; transition: background 0.1s;
}
.sd-month-opt:hover { background: #f1f5f9; }
.sd-month-opt.selected { background: rgba(0,172,71,0.12); color: #00ac47; }
.sd-month-opt.all { grid-column: 1 / -1; border-bottom: 1px solid #f1f5f9; margin-bottom: 4px; }

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
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => ({
  value: String(m),
  label: new Date(2000, m - 1, 1).toLocaleString("ar", { month: "long" }),
}));

function MonthYearPicker({
  year,
  month,
  onYearChange,
  onMonthChange,
  availableYears,
}) {
  const [showMonths, setShowMonths] = useState(false);
  const [showYears, setShowYears] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setShowMonths(false);
        setShowYears(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function prevMonth() {
    const m = Number(month);
    const y = Number(year);
    if (month === "0") {
      onMonthChange("12");
      onYearChange(String(y - 1));
      return;
    }
    if (m === 1) {
      onMonthChange("12");
      onYearChange(String(y - 1));
    } else onMonthChange(String(m - 1));
  }
  function nextMonth() {
    const m = Number(month);
    const y = Number(year);
    if (month === "0") {
      onMonthChange("1");
      return;
    }
    if (m === 12) {
      onMonthChange("1");
      onYearChange(String(y + 1));
    } else onMonthChange(String(m + 1));
  }

  const monthLabel =
    month === "0"
      ? "كل الأشهر"
      : MONTHS.find((x) => x.value === month)?.label || "";

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <div className="sd-month-nav">
        <button className="sd-month-nav-arrow" onClick={nextMonth}>
          ‹
        </button>
        <div className="sd-month-nav-label">
          <button
            className={`sd-month-nav-part${showMonths ? " active" : ""}`}
            onClick={() => {
              setShowMonths((v) => !v);
              setShowYears(false);
            }}
          >
            {monthLabel}
          </button>
          <button
            className={`sd-month-nav-part${showYears ? " active" : ""}`}
            onClick={() => {
              setShowYears((v) => !v);
              setShowMonths(false);
            }}
          >
            {year}
          </button>
        </div>
        <button className="sd-month-nav-arrow" onClick={prevMonth}>
          ›
        </button>
      </div>

      {showMonths && (
        <div className="sd-month-dropdown">
          <div
            className={`sd-month-opt all${month === "0" ? " selected" : ""}`}
            onClick={() => {
              onMonthChange("0");
              setShowMonths(false);
            }}
          >
            كل الأشهر
          </div>
          {MONTHS.map((m) => (
            <div
              key={m.value}
              className={`sd-month-opt${month === m.value ? " selected" : ""}`}
              onClick={() => {
                onMonthChange(m.value);
                setShowMonths(false);
              }}
            >
              {m.label}
            </div>
          ))}
        </div>
      )}

      {showYears && (
        <div className="sd-month-dropdown years">
          {availableYears.map((y) => (
            <div
              key={y}
              className={`sd-month-opt${year === y ? " selected" : ""}`}
              onClick={() => {
                onYearChange(y);
                setShowYears(false);
              }}
            >
              {y}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StaffDetails() {
  injectStyles();
  const { staffId } = useParams();
  const navigate = useNavigate();

  const [member, setMember] = useState(null);
  const [allHours, setAllHours] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  /* filters */
  const [filterYear, setFilterYear] = useState(
    String(new Date().getFullYear()),
  );
  const [filterMonth, setFilterMonth] = useState(
    String(new Date().getMonth() + 1),
  );

  /* modals */
  const [logModal, setLogModal] = useState(null); // { editRow? }
  const [deleteLog, setDeleteLog] = useState(null);

  /* form */
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertModal, setConvertModal] = useState(null); // { dateFrom, dateTo }
  const [invoiceModal, setInvoiceModal] = useState(null); // { dateFrom, dateTo }

  /* ─── load ─── */
  async function load() {
    setLoading(true);
    setErr(null);
    const [
      { data: s, error: se },
      { data: h, error: he },
      { data: p, error: pe },
    ] = await Promise.all([
      supabase.from("staff").select("*").eq("id", staffId).single(),
      supabase
        .from("staff_hours")
        .select("*")
        .eq("staff_id", staffId)
        .order("work_date", { ascending: false }),
      supabase
        .from("staff_salary_payments")
        .select("*")
        .eq("staff_id", staffId),
    ]);
    setLoading(false);
    if (se || he) {
      setErr((se || he || pe).message);
      return;
    }
    setMember(s);
    setAllHours(h || []);
    setPayments(p || []);
  }
  useEffect(() => {
    load();
  }, [staffId]);

  /* ─── available years ─── */
  const availableYears = useMemo(() => {
    const years = new Set(
      allHours.map((r) => r.work_date?.slice(0, 4)).filter(Boolean),
    );
    years.add(String(new Date().getFullYear()));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [allHours]);

  /* ─── filtered hours ─── */
  const filteredHours = useMemo(() => {
    return allHours.filter((r) => {
      if (!r.work_date) return false;
      const [y, m] = r.work_date.split("-");
      if (y !== filterYear) return false;
      if (filterMonth !== "0" && m !== filterMonth.padStart(2, "0"))
        return false;
      return true;
    });
  }, [allHours, filterYear, filterMonth]);

  /* ─── filtered totals ─── */
  const filteredTotals = useMemo(() => {
    let hours = 0,
      amount = 0;
    for (const r of filteredHours) {
      const h = calcHours(r.start_time, r.end_time);
      hours += h;
      amount += h * Number(r.hourly_rate || 0);
    }
    return { hours, amount };
  }, [filteredHours]);

  /* ─── unpaid hours = not covered by any payment ─── */
  const unpaidHours = useMemo(
    () =>
      allHours.filter(
        (r) =>
          r.work_date &&
          !payments.some(
            (p) => r.work_date >= p.date_from && r.work_date <= p.date_to,
          ),
      ),
    [allHours, payments],
  );

  const unpaidTotals = useMemo(() => {
    let hours = 0,
      amount = 0;
    for (const r of unpaidHours) {
      const h = calcHours(r.start_time, r.end_time);
      hours += h;
      amount += h * Number(r.hourly_rate || 0);
    }
    return { hours, amount, count: unpaidHours.length };
  }, [unpaidHours]);

  const unpaidDateRange = useMemo(() => {
    const dates = unpaidHours
      .map((r) => r.work_date)
      .filter(Boolean)
      .sort();
    if (!dates.length) return { min: todayISO(), max: todayISO() };
    return { min: dates[0], max: dates[dates.length - 1] };
  }, [unpaidHours]);

  /* ─── preview for convert modal ─── */
  const convertPreview = useMemo(() => {
    if (!convertModal?.dateFrom || !convertModal?.dateTo)
      return { hours: 0, amount: 0, count: 0 };
    const hrs = allHours.filter(
      (r) =>
        r.work_date >= convertModal.dateFrom &&
        r.work_date <= convertModal.dateTo &&
        !payments.some(
          (p) => r.work_date >= p.date_from && r.work_date <= p.date_to,
        ),
    );
    let hours = 0,
      amount = 0;
    for (const r of hrs) {
      const h = calcHours(r.start_time, r.end_time);
      hours += h;
      amount += h * Number(r.hourly_rate || 0);
    }
    return { hours, amount, count: hrs.length };
  }, [convertModal, allHours, payments]);

  /* ─── all-time KPIs ─── */
  const allKpi = useMemo(() => {
    let totalHours = 0,
      totalAmount = 0,
      paidAmount = 0;
    for (const r of allHours) {
      const h = calcHours(r.start_time, r.end_time);
      totalHours += h;
      totalAmount += h * Number(r.hourly_rate || 0);
    }
    for (const p of payments) {
      paidAmount += Number(p.total_amount || 0);
    }
    return {
      totalHours,
      totalAmount,
      paidAmount,
      pendingAmount: unpaidTotals.amount,
    };
  }, [allHours, payments, unpaidTotals]);

  /* ─── open convert modal ─── */
  function openConvertModal(dateFrom, dateTo) {
    setConvertModal({
      dateFrom: dateFrom || unpaidDateRange.min,
      dateTo: dateTo || unpaidDateRange.max,
    });
  }

  /* ─── execute convert ─── */
  async function executeConvert() {
    if (!convertModal || !member || convertPreview.count === 0) return;
    setConverting(true);
    const desc = `راتب ${member.name} — ${fmtDate(convertModal.dateFrom)} إلى ${fmtDate(convertModal.dateTo)}`;

    await supabase
      .from("expense_parties")
      .insert([{ name: member.name }])
      .then(() => {});

    const { data: expData, error: expErr } = await supabase
      .from("expenses")
      .insert([
        {
          spent_on: convertModal.dateTo,
          amount: convertPreview.amount,
          category: "معاش",
          party: member.name,
          description: desc,
        },
      ])
      .select("id")
      .single();
    if (expErr) {
      setErr(expErr.message);
      setConverting(false);
      return;
    }

    const { error: payErr } = await supabase
      .from("staff_salary_payments")
      .insert([
        {
          staff_id: staffId,
          date_from: convertModal.dateFrom,
          date_to: convertModal.dateTo,
          total_hours: convertPreview.hours,
          total_amount: convertPreview.amount,
          expense_id: expData.id,
        },
      ]);
    if (payErr) {
      setErr(payErr.message);
      setConverting(false);
      return;
    }

    setConverting(false);
    setConvertModal(null);
    load();
  }

  /* ─── log modal ─── */
  function openLog(editRow = null) {
    setLogModal({ editRow });
    setForm(
      editRow
        ? {
            work_date: editRow.work_date || todayISO(),
            start_time: editRow.start_time || "",
            end_time: editRow.end_time || "",
            hourly_rate: String(editRow.hourly_rate || ""),
            notes: editRow.notes || "",
          }
        : EMPTY_FORM,
    );
  }

  /* ─── sync expense amount after editing a session ─── */
  async function syncPaymentExpense(datesToCheck) {
    for (const date of datesToCheck) {
      const covering = payments.filter(
        (p) => date >= p.date_from && date <= p.date_to,
      );
      for (const payment of covering) {
        const { data: hrs } = await supabase
          .from("staff_hours")
          .select("start_time, end_time, hourly_rate")
          .eq("staff_id", staffId)
          .gte("work_date", payment.date_from)
          .lte("work_date", payment.date_to);
        let totalHours = 0,
          totalAmount = 0;
        for (const r of hrs || []) {
          const h = calcHours(r.start_time, r.end_time);
          totalHours += h;
          totalAmount += h * Number(r.hourly_rate || 0);
        }
        await supabase
          .from("staff_salary_payments")
          .update({ total_hours: totalHours, total_amount: totalAmount })
          .eq("id", payment.id);
        if (payment.expense_id) {
          await supabase
            .from("expenses")
            .update({ amount: totalAmount })
            .eq("id", payment.expense_id);
        }
      }
    }
  }

  async function saveLog() {
    if (
      !form.work_date ||
      !form.start_time ||
      !form.end_time ||
      !form.hourly_rate
    )
      return;
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
      ({ error } = await supabase
        .from("staff_hours")
        .update(payload)
        .eq("id", logModal.editRow.id));
      if (!error) {
        // sync expense for affected date(s)
        const datesToCheck = [form.work_date];
        if (logModal.editRow.work_date !== form.work_date)
          datesToCheck.push(logModal.editRow.work_date);
        await syncPaymentExpense(datesToCheck);
      }
    } else {
      ({ error } = await supabase.from("staff_hours").insert([payload]));
    }
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
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

  /* ─── build & print invoice in new window ─── */
  function buildAndPrintInvoice(dateFrom, dateTo, unpaidOnly = false) {
    const rows = allHours
      .filter((r) => {
        if (!r.work_date || r.work_date < dateFrom || r.work_date > dateTo)
          return false;
        if (
          unpaidOnly &&
          payments.some(
            (p) => r.work_date >= p.date_from && r.work_date <= p.date_to,
          )
        )
          return false;
        return true;
      })
      .sort((a, b) => a.work_date.localeCompare(b.work_date));

    let totalHours = 0,
      totalAmount = 0;
    const tableRows = rows
      .map((row, i) => {
        const h = calcHours(row.start_time, row.end_time);
        const total = h * Number(row.hourly_rate || 0);
        totalHours += h;
        totalAmount += total;
        return `<tr>
        <td>${i + 1}</td>
        <td>${fmtDate(row.work_date)}</td>
        <td>${row.start_time?.slice(0, 5) || "—"}</td>
        <td>${row.end_time?.slice(0, 5) || "—"}</td>
        <td class="num green">${h.toFixed(2)}</td>
        <td class="num">${fmtMoney(row.hourly_rate)} ₪</td>
        <td class="num bold">${fmtMoney(total)} ₪</td>
      </tr>`;
      })
      .join("");

    const period =
      dateFrom === dateTo
        ? fmtDate(dateFrom)
        : `${fmtDate(dateFrom)} — ${fmtDate(dateTo)}`;

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>معاش — ${member.name} — ${period}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@400;700;800;900&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Noto Sans Hebrew',Arial,sans-serif;direction:rtl;color:#1e293b;background:#fff;padding:36px 44px;font-size:14px;line-height:1.5}

.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;margin-bottom:26px;border-bottom:3px solid #00ac47}
.brand{font-size:26px;font-weight:900;color:#00ac47;letter-spacing:-0.5px}
.brand-sub{font-size:12px;color:#64748b;font-weight:700;margin-top:3px}
.meta{text-align:left}
.meta-row{font-size:13px;color:#64748b;margin-bottom:3px}
.meta-row strong{color:#1e293b;font-weight:800}

.info-grid{display:flex;gap:0;margin-bottom:26px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden}
.info-cell{flex:1;padding:13px 18px;background:#f8fafc;border-left:1px solid #e2e8f0}
.info-cell:last-child{border-left:none}
.info-label{font-size:10px;color:#94a3b8;font-weight:800;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:4px}
.info-value{font-size:15px;font-weight:900;color:#1e293b}

.section-title{font-size:13px;font-weight:800;color:#475569;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.section-title::before{content:"";display:inline-block;width:4px;height:16px;background:#00ac47;border-radius:2px;flex-shrink:0}

table{width:100%;border-collapse:collapse;margin-bottom:22px}
thead th{background:#1e293b;color:#fff;font-weight:800;font-size:13px;padding:11px 14px;text-align:right;white-space:nowrap}
thead th:first-child{border-radius:0 8px 0 0}
thead th:last-child{border-radius:8px 0 0 0}
tbody tr:nth-child(even){background:#f8fafc}
tbody td{padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155}
tfoot td{padding:11px 14px;font-weight:900;font-size:14px;background:#f1f5f9;border-top:2px solid #e2e8f0}
.num{text-align:right;font-variant-numeric:tabular-nums}
.green{color:#00ac47;font-weight:900}
.bold{font-weight:900}
.note{color:#94a3b8;font-size:12px}

.totals{display:flex;justify-content:flex-end;margin-bottom:30px}
.totals-box{background:linear-gradient(135deg,rgba(0,172,71,.08),rgba(0,172,71,.03));border:1.5px solid rgba(0,172,71,.25);border-radius:14px;padding:18px 26px;min-width:270px}
.total-row{display:flex;justify-content:space-between;gap:36px;font-size:14px;color:#475569;padding:5px 0}
.total-row span:last-child{font-weight:800;color:#334155}
.total-row.main{font-size:18px;font-weight:900;color:#1e293b;border-top:1.5px solid rgba(0,172,71,.2);margin-top:8px;padding-top:12px}
.total-row.main span:last-child{color:#00ac47;font-size:20px}

.footer{text-align:center;font-size:11px;color:#cbd5e1;border-top:1px solid #f1f5f9;padding-top:14px;font-weight:700;letter-spacing:.3px}

@media print{body{padding:18px 22px}@page{margin:.8cm;size:A4}}
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="brand">Play &amp; Grow</div>
    <div class="brand-sub">كشف معاش</div>
  </div>
  <div class="meta">
    <div class="meta-row">تاريخ الإصدار: <strong>${fmtDate(todayISO())}</strong></div>
    <div class="meta-row">الفترة: <strong>${period}</strong></div>
  </div>
</div>

<div class="info-grid">
  <div class="info-cell"><div class="info-label">المعلمة</div><div class="info-value">${member.name}</div></div>
  ${member.role ? `<div class="info-cell"><div class="info-label">الدور</div><div class="info-value">${member.role}</div></div>` : ""}
  ${member.phone ? `<div class="info-cell"><div class="info-label">الهاتف</div><div class="info-value">${member.phone}</div></div>` : ""}
  <div class="info-cell"><div class="info-label">الأيام</div><div class="info-value">${rows.length}</div></div>
</div>

<div class="section-title">أيام العمل — ${period}</div>

<table>
  <thead>
    <tr>
      <th>#</th><th>التاريخ</th><th>من</th><th>إلى</th>
      <th>الساعات</th><th>سعر/س</th><th>الإجمالي</th>
    </tr>
  </thead>
  <tbody>${tableRows}</tbody>
  <tfoot>
    <tr>
      <td colspan="4" style="color:#64748b">المجموع</td>
      <td class="num green">${totalHours.toFixed(2)} س</td>
      <td></td>
      <td class="num bold">${fmtMoney(totalAmount)} ₪</td>
    </tr>
  </tfoot>
</table>

<div class="totals">
  <div class="totals-box">
    <div class="total-row"><span>إجمالي الساعات</span><span>${totalHours.toFixed(2)}</span></div>
    <div class="total-row main"><span>المبلغ الإجمالي</span><span>${fmtMoney(totalAmount)} ₪</span></div>
  </div>
</div>

<div class="footer">Play &amp; Grow &nbsp;•&nbsp; ${period} &nbsp;•&nbsp; ${fmtDate(todayISO())}</div>

<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),500))</script>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) {
      alert("يرجى السماح بالنوافذ المنبثقة لهذا الموقع");
      return;
    }
    win.document.write(html);
    win.document.close();
  }

  /* ══════════ RENDER ══════════ */
  if (loading)
    return (
      <div
        className="container"
        style={{
          textAlign: "center",
          padding: "80px 0",
          color: "#94a3b8",
          fontWeight: 800,
        }}
      >
        جار التحميل...
      </div>
    );
  if (!member)
    return (
      <div
        className="container"
        style={{
          textAlign: "center",
          padding: "80px 0",
          color: "#ef4444",
          fontWeight: 800,
        }}
      >
        لم يتم العثور على المعلمة
      </div>
    );

  return (
    <div className="container sd-page sd-no-print">
      {err && <ErrorBanner message={err} onClose={() => setErr(null)} />}

      {/* back */}
      <button className="sd-back" onClick={() => navigate("/staff-hours")}>
        <ArrowRight size={16} /> العودة لساعات العمل
      </button>

      {/* header card */}
      <div className="sd-header-card">
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: "-0.5px",
              lineHeight: 1.2,
              background: "linear-gradient(135deg, #1e293b 0%, #00ac47 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {member.name}
          </div>
          <div className="sd-header-meta">
            {member.role && (
              <span className="sd-meta-item">
                <Briefcase size={14} />
                {member.role}
              </span>
            )}
            {member.phone && (
              <span className="sd-meta-item">
                <Phone size={14} />
                {member.phone}
              </span>
            )}
          </div>
        </div>
        <button className="btn" onClick={() => openLog()}>
          <Plus size={16} /> تسجيل ساعات
        </button>
      </div>

      {/* KPIs */}
      <div className="sd-kpi-grid">
        <KpiCard
          icon={Clock}
          label="إجمالي الساعات"
          value={`${allKpi.totalHours.toFixed(1)} س`}
          hint="كل الوقت"
          variant="ok"
        />
        <KpiCard
          icon={Banknote}
          label="إجمالي المستحق"
          value={`${fmtMoney(allKpi.totalAmount)} ₪`}
          hint="كل الوقت"
          variant="info"
        />
        <KpiCard
          icon={CheckCircle2}
          label="تم الدفع"
          value={`${fmtMoney(allKpi.paidAmount)} ₪`}
          hint="مُحوَّل لمصروف"
          variant="ok"
        />
        <KpiCard
          icon={AlertCircle}
          label="غير مدفوع"
          value={`${fmtMoney(allKpi.pendingAmount)} ₪`}
          hint="متبقي"
          variant="warn"
        />
      </div>

      {/* ─── hours table ─── */}
      <div className="sd-toolbar">
        <div className="sd-toolbar-title">سجل الساعات</div>
        <MonthYearPicker
          year={filterYear}
          month={filterMonth}
          onYearChange={setFilterYear}
          onMonthChange={setFilterMonth}
          availableYears={availableYears}
        />
      </div>

      <div className="sd-table-wrap">
        {filteredHours.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              color: "#94a3b8",
              fontWeight: 800,
            }}
          >
            لا يوجد سجلات للفترة المحددة
          </div>
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
              {filteredHours.map((row) => {
                const h = calcHours(row.start_time, row.end_time);
                const total = h * Number(row.hourly_rate || 0);
                const isUnpaid = unpaidHours.some((u) => u.id === row.id);
                return (
                  <tr key={row.id}>
                    <td>{fmtDate(row.work_date)}</td>
                    <td>{row.start_time?.slice(0, 5) || "—"}</td>
                    <td>{row.end_time?.slice(0, 5) || "—"}</td>
                    <td style={{ fontWeight: 800, color: "#00ac47" }}>
                      {h.toFixed(2)}
                    </td>
                    <td>{fmtMoney(row.hourly_rate)} ₪</td>
                    <td style={{ fontWeight: 800 }}>{fmtMoney(total)} ₪</td>
                    <td style={{ color: "#94a3b8", fontSize: 13 }}>
                      {row.notes || "—"}
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: 4,
                          alignItems: "center",
                        }}
                      >
                        {isUnpaid && (
                          <IconButton
                            icon={Receipt}
                            size={14}
                            title="تحويل لمصروف"
                            onClick={() =>
                              openConvertModal(row.work_date, row.work_date)
                            }
                          />
                        )}
                        <IconButton
                          icon={Pencil}
                          size={14}
                          title="تعديل"
                          onClick={() => openLog(row)}
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
            <tfoot>
              <tr>
                <td colSpan={3} style={{ color: "#64748b", fontWeight: 800 }}>
                  المجموع
                </td>
                <td style={{ color: "#00ac47" }}>
                  {filteredTotals.hours.toFixed(2)} س
                </td>
                <td></td>
                <td>{fmtMoney(filteredTotals.amount)} ₪</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* ─── payments & pending ─── */}
      <div className="sd-monthly-section">
        <div className="sd-section-title">المستحقات والدفعات</div>

        {/* Unpaid block */}
        {unpaidHours.length > 0 && (
          <div
            style={{
              background: "#fffbeb",
              border: "1.5px solid rgba(245,158,11,0.25)",
              borderRadius: 16,
              padding: "16px 20px",
              marginBottom: 14,
              direction: "rtl",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <span className="sd-unpaid-badge" style={{ marginLeft: 10 }}>
                  غير مدفوع
                </span>
                <span
                  style={{ fontSize: 14, fontWeight: 800, color: "#334155" }}
                >
                  {unpaidTotals.count} يوم &nbsp;·&nbsp;{" "}
                  {unpaidTotals.hours.toFixed(2)} س &nbsp;·&nbsp;{" "}
                  {fmtMoney(unpaidTotals.amount)} ₪
                </span>
              </div>
              <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 700 }}>
                {fmtDate(unpaidDateRange.min)} — {fmtDate(unpaidDateRange.max)}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="sd-convert-btn"
                  style={{
                    background: "#f0fdf4",
                    color: "#15803d",
                    borderColor: "rgba(21,128,61,0.25)",
                  }}
                  onClick={() =>
                    setInvoiceModal({
                      dateFrom: unpaidDateRange.min,
                      dateTo: unpaidDateRange.max,
                      unpaidOnly: true,
                    })
                  }
                >
                  <Printer size={14} /> فاتورة
                </button>
                <button
                  className="sd-convert-btn"
                  onClick={() => openConvertModal()}
                >
                  <Receipt size={14} /> تحويل لمصروف
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Paid & deleted records */}
        {payments.length > 0 && (
          <div className="sd-month-table-wrap">
            <table className="sd-month-table">
              <thead>
                <tr>
                  <th>الفترة</th>
                  <th>ساعات</th>
                  <th>المبلغ</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {[...payments]
                  .sort((a, b) => b.date_from.localeCompare(a.date_from))
                  .map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 800 }}>
                        {fmtDate(p.date_from)} — {fmtDate(p.date_to)}
                      </td>
                      <td style={{ color: "#00ac47", fontWeight: 800 }}>
                        {Number(p.total_hours || 0).toFixed(2)} س
                      </td>
                      <td style={{ fontWeight: 800 }}>
                        {fmtMoney(p.total_amount)} ₪
                      </td>
                      <td>
                        <span className="sd-paid-badge">
                          <CheckCircle2 size={13} /> تم الدفع
                        </span>
                      </td>
                      <td>
                        <button
                          className="sd-convert-btn"
                          style={{
                            background: "#f0fdf4",
                            color: "#15803d",
                            borderColor: "rgba(21,128,61,0.25)",
                          }}
                          onClick={() =>
                            setInvoiceModal({
                              dateFrom: p.date_from,
                              dateTo: p.date_to,
                            })
                          }
                        >
                          <Printer size={14} /> فاتورة
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {allHours.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              color: "#94a3b8",
              fontWeight: 800,
            }}
          >
            لا يوجد سجلات بعد
          </div>
        )}
      </div>

      {/* ════ Log Modal ════ */}
      <Modal
        open={!!logModal}
        title={logModal?.editRow ? "تعديل السجل" : "تسجيل ساعات"}
        onClose={() => setLogModal(null)}
        maxWidth={480}
      >
        <div className="stack" style={{ direction: "rtl" }}>
          <div className="sd-form-group">
            <label>التاريخ</label>
            <input
              type="date"
              className="input"
              value={form.work_date}
              onChange={(e) =>
                setForm((f) => ({ ...f, work_date: e.target.value }))
              }
            />
          </div>
          <div className="sd-form-row">
            <div className="sd-form-group">
              <label>ساعة البدء</label>
              <input
                type="time"
                className="input"
                value={form.start_time}
                onChange={(e) =>
                  setForm((f) => ({ ...f, start_time: e.target.value }))
                }
              />
            </div>
            <div className="sd-form-group">
              <label>ساعة الانتهاء</label>
              <input
                type="time"
                className="input"
                value={form.end_time}
                onChange={(e) =>
                  setForm((f) => ({ ...f, end_time: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="sd-form-group">
            <label>المبلغ على الساعة (₪)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              className="input"
              placeholder="مثال: 50"
              value={form.hourly_rate}
              onChange={(e) =>
                setForm((f) => ({ ...f, hourly_rate: e.target.value }))
              }
              style={{ textAlign: "right" }}
            />
          </div>
          {hoursCalc > 0 && (
            <div className="sd-calc-box">
              <div className="sd-calc-label">الحساب التلقائي</div>
              <div>
                <div className="sd-calc-hours">{hoursCalc.toFixed(2)} ساعة</div>
                {totalCalc > 0 && (
                  <div className="sd-calc-total">= {fmtMoney(totalCalc)} ₪</div>
                )}
              </div>
            </div>
          )}
          <div className="sd-form-group">
            <label>ملاحظات (اختياري)</label>
            <input
              type="text"
              className="input"
              placeholder="أي ملاحظة..."
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
            />
          </div>
          <button
            className="btn"
            disabled={
              saving ||
              !form.work_date ||
              !form.start_time ||
              !form.end_time ||
              !form.hourly_rate
            }
            onClick={saveLog}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {saving
              ? "جار الحفظ..."
              : logModal?.editRow
                ? "حفظ التعديلات"
                : "تسجيل"}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteLog}
        title="حذف السجل"
        message="هل أنت متأكد من الحذف؟"
        confirmText="حذف"
        cancelText="إلغاء"
        danger
        onConfirm={confirmDeleteLog}
        onCancel={() => setDeleteLog(null)}
      />

      {/* ════ Invoice date-range modal ════ */}
      <Modal
        open={!!invoiceModal}
        title="إنشاء فاتورة"
        onClose={() => setInvoiceModal(null)}
        maxWidth={380}
      >
        <div className="stack" style={{ direction: "rtl" }}>
          <div className="sd-form-row">
            <div className="sd-form-group">
              <label>من تاريخ</label>
              <input
                type="date"
                className="input"
                value={invoiceModal?.dateFrom || ""}
                onChange={(e) =>
                  setInvoiceModal((c) => ({ ...c, dateFrom: e.target.value }))
                }
              />
            </div>
            <div className="sd-form-group">
              <label>إلى تاريخ</label>
              <input
                type="date"
                className="input"
                value={invoiceModal?.dateTo || ""}
                onChange={(e) =>
                  setInvoiceModal((c) => ({ ...c, dateTo: e.target.value }))
                }
              />
            </div>
          </div>
          <button
            className="btn"
            disabled={!invoiceModal?.dateFrom || !invoiceModal?.dateTo}
            onClick={() => {
              buildAndPrintInvoice(
                invoiceModal.dateFrom,
                invoiceModal.dateTo,
                invoiceModal.unpaidOnly,
              );
              setInvoiceModal(null);
            }}
            style={{ width: "100%", justifyContent: "center" }}
          >
            <Printer size={16} /> إنشاء وطباعة
          </button>
        </div>
      </Modal>

      {/* ════ Convert modal ════ */}
      <Modal
        open={!!convertModal}
        title="تحويل لمصروف"
        onClose={() => setConvertModal(null)}
        maxWidth={420}
      >
        <div className="stack" style={{ direction: "rtl" }}>
          <div className="sd-form-row">
            <div className="sd-form-group">
              <label>من تاريخ</label>
              <input
                type="date"
                className="input"
                value={convertModal?.dateFrom || ""}
                onChange={(e) =>
                  setConvertModal((c) => ({ ...c, dateFrom: e.target.value }))
                }
              />
            </div>
            <div className="sd-form-group">
              <label>إلى تاريخ</label>
              <input
                type="date"
                className="input"
                value={convertModal?.dateTo || ""}
                onChange={(e) =>
                  setConvertModal((c) => ({ ...c, dateTo: e.target.value }))
                }
              />
            </div>
          </div>
          {convertPreview.count > 0 ? (
            <div className="sd-calc-box">
              <div className="sd-calc-label">سيتم تسجيل</div>
              <div>
                <div className="sd-calc-hours">
                  {convertPreview.hours.toFixed(2)} ساعة
                </div>
                <div className="sd-calc-total">
                  {convertPreview.count} يوم — {fmtMoney(convertPreview.amount)}{" "}
                  ₪
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                color: "#94a3b8",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              لا يوجد ساعات غير مدفوعة في هذا النطاق
            </div>
          )}
          <button
            className="btn"
            disabled={converting || convertPreview.count === 0}
            onClick={executeConvert}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {converting
              ? "جار التسجيل..."
              : `تأكيد — ${fmtMoney(convertPreview.amount)} ₪`}
          </button>
        </div>
      </Modal>
    </div>
  );
}
