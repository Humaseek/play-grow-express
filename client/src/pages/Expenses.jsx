import React, { useEffect, useMemo, useState, useRef } from "react";
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
  Settings2,
  Check,
  X,
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
  return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
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
  background: linear-gradient(180deg, rgba(239, 68, 68, 0.05) 0%, #f4f6f8 300px);
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
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
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
  background: #ef4444 !important;
  color: #fff !important;
  border: none !important;
  border-radius: 14px !important;
  padding: 10px 20px !important;
  font-weight: 800 !important;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.2) !important;
  transition: all 0.2s !important;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-add:hover {
  transform: translateY(-2px);
  background: #dc2626 !important;
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.3) !important;
}

.actions-cell {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

/* =========================================
   تنسيقات النموذج (المودال) للكمبيوتر
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
   تصميم كروت الموبايل الخاصة بالمصروفات
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
  background: #ef4444; /* لون أحمر للمصروفات */
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
  color: #0f172a;
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
  color: #ef4444;
  background: #fef2f2;
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
  background: #ef4444; /* لون أحمر */
  color: white;
  border: none;
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.3);
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
  }
  
  div.modalOverlay > div.modalCard {
    border-radius: 24px !important; 
    margin: auto !important; 
    width: 92% !important; 
    max-height: 85vh !important; 
    margin-bottom: auto !important; 
    transform: translateY(-5vh) !important;
  }

  .modal-form-scroll-container {
    max-height: calc(85vh - 140px) !important; 
    padding: 0 5px;
  }

  /* إخفاء زر الإضافة العادي والجدول على الموبايل */
  .desktop-table-container { display: none; }
  .btn-add-desktop { display: none !important; }
  
  /* زيادة عرض الفورم والكروت على الموبايل */
  .expenses-toolbar { 
    padding: 16px; 
    border-bottom: none; 
    margin: 0 4px !important; /* لزيادة عرض البحث */
  }
  .expenses-card { 
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
  .page--expenses { padding-bottom: 120px; }
  .mobile-list {
    padding: 16px 4px !important; /* تقليل الفراغ الجانبي لزيادة عرض الكروت */
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
  .modal-fixed-footer { padding-bottom: 10px; margin-top: 5px; }

  .kpiGrid4 {
    display: grid;
    grid-template-columns: 1fr 1fr; /* إحصائيات الموبايل عمودين */
    gap: 10px;
  }
}

@media (min-width: 981px) {
  .mobile-list { display: none; }
  .fab-button { display: none !important; }
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

  // Category management
  const [openCatMgmt, setOpenCatMgmt] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [editingCatValue, setEditingCatValue] = useState("");
  const [catSaving, setCatSaving] = useState(false);

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
      .from("expenses_details_view")
      .select(
        "id,spent_on,amount,category,party,description,created_at,run_id,course_id,course_title,run_label",
      )
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
        const d = String(r.course_title || "").toLowerCase();
        const e = String(r.run_label || "").toLowerCase();
        return (
          a.includes(s) ||
          b.includes(s) ||
          c.includes(s) ||
          d.includes(s) ||
          e.includes(s)
        );
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
      if (ins.error.code === "23505" || msg.includes("duplicate")) {
        return { ok: true };
      }
      return { ok: false };
    }
    return { ok: true };
  }

  async function renameCategory(oldName, newName) {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingCat(null);
      return;
    }
    setCatSaving(true);
    try {
      const [catUpd, expUpd] = await Promise.all([
        supabase
          .from("expense_categories")
          .update({ name: trimmed })
          .eq("name", oldName),
        supabase
          .from("expenses")
          .update({ category: trimmed })
          .eq("category", oldName),
      ]);
      if (catUpd.error) throw catUpd.error;
      if (expUpd.error) throw expUpd.error;
      await Promise.all([loadPicklists(), load()]);
      toast("تم تعديل الفئة بنجاح.", "ok");
      setEditingCat(null);
    } catch (e) {
      console.error(e);
      toast("فشل تعديل الفئة.", "danger");
    } finally {
      setCatSaving(false);
    }
  }

  async function deleteCategory(name) {
    setCatSaving(true);
    try {
      const del = await supabase
        .from("expense_categories")
        .delete()
        .eq("name", name);
      if (del.error) throw del.error;
      await loadPicklists();
      toast("تم حذف الفئة من القائمة.", "ok");
    } catch (e) {
      console.error(e);
      toast("فشل حذف الفئة.", "danger");
    } finally {
      setCatSaving(false);
    }
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
      if (expCategory?.trim()) {
        await safeInsertPicklist("expense_categories", expCategory);
      }
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

            {/* الجدول والفلاتر والكروت للموبايل */}
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

                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ minWidth: 140 }}>
                      <ModernSelect
                        value={cat}
                        onChange={setCat}
                        placeholder="كل الفئات"
                        options={[
                          { value: "all", label: "كل الفئات" },
                          ...categories.map((c) => ({ value: c, label: c })),
                        ]}
                      />
                    </div>
                    <button
                      title="إدارة الفئات"
                      onClick={() => { setEditingCat(null); setOpenCatMgmt(true); }}
                      style={{ padding: "7px 9px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", display: "flex", alignItems: "center", color: "#64748b" }}
                    >
                      <Settings2 size={16} />
                    </button>
                  </div>

                  <div style={{ minWidth: 140 }}>
                    <ModernSelect
                      value={partyFilter}
                      onChange={setPartyFilter}
                      placeholder="كل الأشخاص"
                      options={[
                        { value: "all", label: "كل الأشخاص" },
                        ...parties.map((p) => ({ value: p, label: p })),
                      ]}
                    />
                  </div>

                  <div style={{ minWidth: 160 }}>
                    <ModernSelect
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

                <button
                  className="btn btn-add btn-add-desktop"
                  onClick={openCreate}
                >
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
                <>
                  {/* عرض الجدول للكمبيوتر */}
                  <div
                    className="desktop-table-container"
                    style={{ overflowX: "auto" }}
                  >
                    <table className="modern-table">
                      <thead>
                        <tr>
                          <th style={{ width: 140 }}>التاريخ</th>
                          <th>الفئة</th>
                          <th>شخص/المتجر</th>
                          <th>الوصف</th>
                          <th>التبعية (الدورة/الفوج)</th>
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
                            <td>
                              {r.party || <span className="muted">—</span>}
                            </td>
                            <td style={{ color: "#64748b", minWidth: 200 }}>
                              {r.description || (
                                <span className="muted">—</span>
                              )}
                            </td>
                            <td style={{ minWidth: 200 }}>
                              {r.run_id ? (
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "2px",
                                  }}
                                >
                                  <Link
                                    to={`/courses/${r.course_id}`}
                                    style={{
                                      color: "#ef4444",
                                      fontWeight: 700,
                                      textDecoration: "none",
                                    }}
                                    title="انتقل لتفاصيل الدورة"
                                  >
                                    {r.course_title}
                                  </Link>
                                  <Link
                                    to={`/runs/${r.run_id}`}
                                    style={{
                                      color: "#64748b",
                                      fontSize: "13px",
                                      fontWeight: 600,
                                      textDecoration: "none",
                                    }}
                                    title="انتقل لتفاصيل الفوج"
                                  >
                                    الفوج: {r.run_label}
                                  </Link>
                                </div>
                              ) : (
                                <span className="muted">مصروف عام</span>
                              )}
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

                  {/* تصميم الكروت للموبايل */}
                  <div className="mobile-list">
                    {filtered.map((r) => (
                      <div
                        key={r.id}
                        className="art-card"
                        onClick={() => openEdit(r)}
                      >
                        <div className="ac-header">
                          <h3 className="ac-name">
                            {r.description || r.party || "مصروف"}
                          </h3>
                          <span className="ac-amount">
                            {fmtMoney(r.amount)} ₪
                          </span>
                        </div>
                        <div className="ac-footer" style={{ marginTop: 4 }}>
                          <span className="ac-class-badge">
                            {r.category || "بدون فئة"}
                          </span>
                        </div>
                        <div className="ac-footer" style={{ marginTop: 12 }}>
                          <div className="ac-date">
                            <span className="ac-date-icon">
                              <CalendarDays size={14} strokeWidth={2.5} />
                            </span>
                            {fmtDate(r.spent_on)}
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
          </>
        )}

        {/* الزر العائم - يختفي عند فتح المودال */}
        {!openAdd &&
          createPortal(
            <button
              className="fab-button"
              onClick={openCreate}
              title="إضافة مصروف"
            >
              <Plus size={30} strokeWidth={2.5} />
            </button>,
            document.body,
          )}

        {/* Modal الإضافة والتعديل */}
        <Modal
          open={openAdd}
          title={editId ? "تعديل مصروف" : "إضافة مصروف"}
          onClose={() => !saving && setOpenAdd(false)}
        >
          <div className="modal-form-scroll-container">
            <h4 className="form-section-title">
              <Receipt size={18} color="#64748b" /> تفاصيل المصروف
            </h4>
            <div className="responsive-form-grid">
              <div className="form-col">
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

              <div className="form-col">
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

              <div className="form-col">
                <div className="muted" style={{ marginBottom: 6 }}>
                  الفئة
                </div>
                <CustomCombobox
                  value={expCategory}
                  onChange={setExpCategory}
                  options={categories.map((c) => ({ value: c, label: c }))}
                  placeholder="اختر أو اكتب فئة..."
                />
              </div>

              <div className="form-col">
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

              <div className="form-col-full">
                <div className="muted" style={{ marginBottom: 6 }}>
                  الوصف (اختياري)
                </div>
                <input
                  className="input"
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  placeholder="مثال: شراء ضيافة للاطفال..."
                />
              </div>
            </div>
          </div>

          <div className="modal-fixed-footer">
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
        </Modal>

        {/* حوار التأكيد للحذف */}
        {/* Modal: إدارة الفئات */}
        <Modal
          open={openCatMgmt}
          title="إدارة الفئات"
          onClose={() => { setOpenCatMgmt(false); setEditingCat(null); }}
        >
          {catOptions.length === 0 ? (
            <p style={{ color: "#64748b", textAlign: "center", padding: 20 }}>لا توجد فئات محفوظة</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {catOptions.map((name) => (
                <div
                  key={name}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: editingCat === name ? "#f0fdf4" : "#f8fafc" }}
                >
                  {editingCat === name ? (
                    <>
                      <input
                        autoFocus
                        className="input"
                        style={{ flex: 1, fontSize: 14, padding: "6px 10px" }}
                        value={editingCatValue}
                        onChange={(e) => setEditingCatValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") renameCategory(name, editingCatValue);
                          if (e.key === "Escape") setEditingCat(null);
                        }}
                      />
                      <button
                        disabled={catSaving}
                        onClick={() => renameCategory(name, editingCatValue)}
                        style={{ padding: "5px 8px", borderRadius: 7, border: "none", background: "#16a34a", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center" }}
                      >
                        <Check size={15} />
                      </button>
                      <button
                        onClick={() => setEditingCat(null)}
                        style={{ padding: "5px 8px", borderRadius: 7, border: "none", background: "#e2e8f0", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center" }}
                      >
                        <X size={15} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{name}</span>
                      <button
                        onClick={() => { setEditingCat(name); setEditingCatValue(name); }}
                        style={{ padding: "5px 8px", borderRadius: 7, border: "none", background: "#e0f2fe", color: "#0284c7", cursor: "pointer", display: "flex", alignItems: "center" }}
                        title="تعديل"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        disabled={catSaving}
                        onClick={() => deleteCategory(name)}
                        style={{ padding: "5px 8px", borderRadius: 7, border: "none", background: "#fee2e2", color: "#dc2626", cursor: "pointer", display: "flex", alignItems: "center" }}
                        title="حذف من القائمة"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </Modal>

        <ConfirmDialog
          open={confirm.open}
          title="حذف مصروف"
          message="هل أنت متأكد أنك تريد حذف هذا المصروف؟ لا يمكن التراجع."
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
