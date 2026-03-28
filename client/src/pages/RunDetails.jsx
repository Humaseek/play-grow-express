import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router";
import { supabase } from "../supabaseClient";
import ErrorBanner from "../components/ErrorBanner";
import Badge from "../components/Badge";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import IconButton from "../components/IconButton";
import ModernSelect from "../components/ModernSelect";
import {
  Calendar,
  Clock,
  CreditCard,
  Users,
  CalendarDays,
  CalendarClock,
  CalendarPlus,
  GraduationCap,
  Hourglass,
  ShoppingCart,
  Ticket,
  Receipt,
  Pencil,
  Trash2,
  Copy,
  CheckCircle2,
  XCircle,
  Search,
  Cake,
  Tag,
  ExternalLink,
  Settings2,
  Plus,
  Minus,
  Banknote,
  PlusCircle,
  History,
  List,
  CalendarCheck,
  Phone,
  ChevronDown,
} from "lucide-react";

const LOCALE_LATN = "en-IL";

function fmtDT(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDate(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function fmtTimeHM(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtWeekday(dt) {
  if (!dt) return "—";
  return new Intl.DateTimeFormat("ar", { weekday: "long" }).format(
    new Date(dt),
  );
}

function fmtNum(n) {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return "0";
  return new Intl.NumberFormat(LOCALE_LATN, {
    maximumFractionDigits: 0,
  }).format(x);
}

function fmtILS(n, digits = 2) {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x))
    return new Intl.NumberFormat(LOCALE_LATN, {
      style: "currency",
      currency: "ILS",
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(0);
  return new Intl.NumberFormat(LOCALE_LATN, {
    style: "currency",
    currency: "ILS",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(x);
}

function isoDate(d) {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const da = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function updateDateKeepTime(dateStr) {
  if (!dateStr) return new Date().toISOString();
  const d = new Date();
  const [y, m, day] = dateStr.split("-");
  if (y && m && day) {
    d.setFullYear(parseInt(y), parseInt(m) - 1, parseInt(day));
  }
  return d.toISOString();
}

function uniqSorted(list) {
  const s = new Set();
  for (const v of list || []) {
    const x = String(v || "").trim();
    if (x) s.add(x);
  }
  return Array.from(s).sort((a, b) => a.localeCompare(b, "en"));
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

// --- مُركّب مخصص للجمع بين الكتابة والقائمة المنسدلة (Combobox) ---
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

// ============================================================================
// 👇 تنسيقات CSS - لم يتم تخريب الديسكتوب، تم إضافة التجاوب للموبايل بالأسفل 👇
// ============================================================================
const RUN_DETAILS_SOFT_UI_STYLES = `
.page.page--runs {
  background: linear-gradient(180deg, rgba(0, 172, 71, 0.08) 0%, #f7faf8 240px, #f4f6f8 100%) !important;
}

.runDetails {
  padding-block: 22px 40px;
}

.modalCard:has(.modal-wide-1000) {
  width: 95% !important;
  max-width: 1000px !important;
}

.modalCard:has(.modal-wide-900) {
  width: 95% !important;
  max-width: 900px !important;
}

.runDetails .tableWrap.inCard {
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 18px;
  overflow: visible !important; 
}

.modal-compact-table {
  width: 100% !important;
  min-width: 100% !important;
  border-collapse: separate !important;
  border-spacing: 0 8px !important;
  table-layout: auto !important; 
}

.modal-compact-table th,
.modal-compact-table td {
  text-align: center !important;
  vertical-align: middle !important;
  white-space: nowrap !important; 
}

.modal-compact-table th {
  background: #f8fafc !important;
  color: #64748b !important;
  font-weight: 800 !important;
  padding: 16px 15px !important;
  font-size: 15px;
  border-bottom: 2px solid #edf2f7;
}

.modal-compact-table td {
  padding: 18px 15px !important;
  background: #fff !important;
  border-top: 1px solid #f1f5f9 !important;
  border-bottom: 1px solid #f1f5f9 !important;
  font-size: 15px;
}

.modal-compact-table tr td:first-child { border-right: 1px solid #f1f5f9; border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
.modal-compact-table tr td:last-child { border-left: 1px solid #f1f5f9; border-top-left-radius: 12px; border-bottom-left-radius: 12px; }

.runDetails .card {
  background: #ffffff !important;
  border: 1px solid rgba(15, 23, 42, 0.08) !important;
  border-radius: 22px !important;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04) !important;
}

.actionSquare {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  background: #ffffff; border: 1px solid rgba(15,23,42,0.06); border-radius: 16px; padding: 14px 8px;
  color: #475569; transition: all 0.2s ease; cursor: pointer; min-height: 86px; width: 100%; box-shadow: 0 2px 8px rgba(0,0,0,0.01);
}
.actionSquare:hover:not(:disabled) { background: #f8fafc; border-color: rgba(15,23,42,0.12); color: #0f172a; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
.actionSquare span { font-size: 11.5px; font-weight: 800; text-align: center; line-height: 1.2; }
.actionSquare:disabled { opacity: 0.4; cursor: not-allowed; }

.runHeroTitle {
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 54px;
  max-width: 100%;
  padding: 10px 18px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.045);
  font-size: clamp(20px, 2vw, 32px);
  font-weight: 900;
  line-height: 1.15;
  color: rgb(24, 24, 24);
  letter-spacing: -0.015em;
  white-space: nowrap;
}

.heroMiniChip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: none;
  white-space: nowrap;
}

.runDetails .btn {
  border-radius: 14px !important;
  min-height: 42px;
  padding-inline: 16px !important;
  box-shadow: none !important;
}

.runDetails .btn.primary,
.runDetails .btn.btn-primary {
  background: rgb(0, 172, 71) !important;
  border-color: rgb(0, 172, 71) !important;
}

.summaryGridSoft {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.summaryCardSoft {
  padding: 18px;
}

.summaryCardTop {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.summaryLabel {
  font-size: 14px;
  font-weight: 800;
  color: rgb(82, 82, 82);
}

.summaryIcon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(248, 250, 252, 0.95);
  color: rgb(24, 24, 24);
}

.summaryCardSoft.is-agreed .summaryIcon { background: rgba(122, 92, 255, 0.10); color: rgb(122, 92, 255); }
.summaryCardSoft.is-paid .summaryIcon { background: rgba(0, 172, 71, 0.10); color: rgb(0, 172, 71); }
.summaryCardSoft.is-expenses .summaryIcon { background: rgba(255, 153, 0, 0.12); color: rgb(255, 153, 0); }
.summaryCardSoft.is-balance .summaryIcon { background: rgba(239, 68, 68, 0.10); color: rgb(239, 68, 68); }
.summaryCardSoft.is-balance.is-good .summaryIcon { background: rgba(0, 172, 71, 0.10); color: rgb(0, 172, 71); }

.summaryValue { font-size: clamp(28px, 2vw, 34px); font-weight: 900; line-height: 1.1; margin-bottom: 8px; }
.summaryNote { color: rgb(82, 82, 82); font-size: 12px; line-height: 1.5; }

.runDetails .tabs {
  display: inline-flex; flex-wrap: wrap; gap: 8px; padding: 6px; border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.08); background: rgba(255, 255, 255, 0.8); margin-bottom: 12px !important;
}

.runDetails .tab {
  border-radius: 999px !important; min-height: 40px; padding-inline: 16px !important;
  font-weight: 800; color: rgb(82, 82, 82);
}

.runDetails .tab.active {
  background: rgba(0, 172, 71, 0.12) !important; border-color: rgba(0, 172, 71, 0.18) !important;
  color: rgb(0, 172, 71) !important;
}

.runDetails .pToolbar { gap: 20px !important; }
.runDetails .pTitle h2, .runDetails .h1 { font-size: 28px; line-height: 1.2; }

.runDetails .input, .runDetails select.input {
  min-height: 46px; border-radius: 14px !important;
  border: 1px solid rgba(15, 23, 42, 0.10) !important; background: #fff !important;
}

.runDetails .pGrid {
  display: grid !important; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px !important; align-items: stretch !important;
}

.runDetails .pCard {
  width: 100% !important; border: 1px solid rgba(15, 23, 42, 0.08) !important;
  border-radius: 22px !important; padding: 18px !important; background: #fff !important;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.runDetails .pCard:hover {
  transform: translateY(-2px); box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08); border-color: rgba(0, 172, 71, 0.18) !important;
}

.runDetails .pHead { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.runDetails .pName { font-size: 21px; font-weight: 900; line-height: 1.2; margin-bottom: 6px; }
.runDetails .pMeta { display: flex; flex-wrap: wrap; gap: 8px; }
.runDetails .metaItem {
  display: inline-flex; align-items: center; gap: 6px; min-height: 30px; padding: 6px 10px;
  border-radius: 999px; background: rgba(248, 250, 252, 1); border: 1px solid rgba(15, 23, 42, 0.06);
  color: rgb(82, 82, 82); font-size: 12px; font-weight: 700;
}

.runDetails .pQuickStats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 20px; }
.runDetails .pStatBlock {
  padding: 14px 10px; border-radius: 16px; background: rgba(248, 250, 252, 0.8);
  border: 1px solid rgba(15, 23, 42, 0.04); display: flex; flex-direction: column; align-items: center;
  justify-content: center; text-align: center; gap: 8px; transition: all 0.2s ease;
}
.runDetails .pStatBlock.stat-green { background: rgba(0, 172, 71, 0.08); border-color: rgba(0, 172, 71, 0.15); }
.runDetails .pStatBlock.stat-green .pStatValue { color: rgb(0, 172, 71); }
.runDetails .pStatBlock.stat-yellow { background: rgba(245, 158, 11, 0.08); border-color: rgba(245, 158, 11, 0.15); }
.runDetails .pStatBlock.stat-yellow .pStatValue { color: rgb(217, 119, 6); }
.runDetails .pStatBlock.stat-red { background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.15); }
.runDetails .pStatBlock.stat-red .pStatValue { color: rgb(220, 38, 38) !important; }

.runDetails .pStatLabel { display: flex; align-items: center; justify-content: center; gap: 6px; color: rgb(100, 116, 139); font-size: 13px; font-weight: 700; margin: 0; white-space: nowrap; }
.runDetails .pStatValue { font-size: 18px; font-weight: 900; line-height: 1; color: rgb(15, 23, 42); }

.runDetails .pProgressWrap { padding: 12px 0 0; margin-top: 2px; }
.runDetails .pProgressHead { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 12px; color: rgb(82, 82, 82); margin-bottom: 8px; }
.runDetails .pBar { height: 8px !important; border-radius: 999px !important; background: rgba(15, 23, 42, 0.08) !important; overflow: hidden; }
.runDetails .pBar span { display: block; height: 100%; border-radius: inherit; background: rgb(0, 172, 71); }
.runDetails .pBarPartial span { background: rgb(245, 158, 11); }
.runDetails .pBarUnpaid span { background: rgb(239, 68, 68); }
.runDetails .pBarFree span { background: rgb(148, 163, 184); }

.runDetails .sessionRow {
  border-radius: 18px !important; background: rgba(255, 255, 255, 0.94); transition: all 0.2s ease;
  border-left: 1px solid transparent; border-top: 1px solid transparent; border-bottom: 1px solid transparent;
}
.runDetails .sessionRow:hover { background: #fff !important; box-shadow: 0 6px 16px rgba(0,0,0,0.04); }
.runDetails .sectionHeader { font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 10px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }

/* =========================================
   📱 تجاوب الموبايل الخرافي (Mobile Pro Fixes)
========================================= */
.desktop-only { display: block; }
.mobile-only { display: none; }
.session-actions-desktop { display: flex; gap: 8px; justify-content: flex-end; }

/* --- Mobile Data Cards (Payments/Expenses) --- */
.mobile-card { 
  background: #fff; 
  border-radius: 16px; 
  padding: 16px; 
  border: 1px solid rgba(15,23,42,0.06); 
  box-shadow: 0 4px 12px rgba(0,0,0,0.03); 
  display: flex; 
  flex-direction: column; 
  gap: 12px; 
  position: relative; 
  margin-bottom: 12px;
}

@media (max-width: 980px) {
  .desktop-only { display: none !important; }
  .mobile-only { display: flex !important; flex-direction: column; gap: 12px; }

  /* ── صفحة الـ Run بالكامل ── */
  .runDetails { padding-block: 12px 32px; }
  .container { padding-inline: 12px !important; }

  /* --- Hero Header --- */
  .runHeroTitle { 
    font-size: 20px !important; 
    white-space: normal !important; 
    text-align: center !important; 
    width: 100% !important; 
    padding: 12px 16px !important;
    border-radius: 16px !important;
  }

  /* الـ wrapper الخارجي للهيدر: عمودي على الموبايل */
  .runDetails > .container > div:first-child {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 12px !important;
  }

  /* صف العنوان + الـ chips: عمودي */
  .runDetails > .container > div:first-child > div:first-child {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 10px !important;
    width: 100% !important;
  }

  /* الـ chips تتمدد بالكامل وتلتف */
  .runDetails > .container > div:first-child > div:first-child > div {
    flex-wrap: wrap !important;
    gap: 8px !important;
  }

  .heroMiniChip {
    flex: 1 1 auto !important;
    justify-content: center !important;
    min-width: 100px !important;
    font-size: 13px !important;
    padding: 6px 12px !important;
    min-height: 36px !important;
  }

  .run-header-actions {
    width: 100% !important;
    display: flex !important;
    justify-content: stretch !important;
    gap: 10px !important;
    margin-top: 0 !important;
  }
  .run-header-actions button {
    flex: 1 !important;
    justify-content: center !important;
    font-size: 14px !important;
  }

  /* --- KPIs Grid --- */
  .summaryGridSoft { 
    grid-template-columns: 1fr 1fr !important; 
    gap: 10px !important;
  }
  .summaryCardSoft {
    padding: 14px 12px !important;
  }
  .summaryValue {
    font-size: 20px !important;
  }
  .summaryLabel { font-size: 13px !important; }
  .summaryNote { font-size: 11px !important; }
  .summaryIcon { width: 36px !important; height: 36px !important; }

  /* --- Tabs --- */
  .runDetails .tabs { 
    width: 100% !important; 
    overflow-x: auto !important; 
    white-space: nowrap !important; 
    flex-wrap: nowrap !important; 
    justify-content: flex-start !important; 
    padding-bottom: 4px !important;
    border-radius: 16px !important;
    gap: 4px !important;
  }
  .runDetails .tabs::-webkit-scrollbar { display: none; }
  .runDetails .tab {
    font-size: 13px !important;
    padding-inline: 12px !important;
    min-height: 36px !important;
  }

  /* --- Participants Tab Toolbar --- */
  .pToolbar {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 12px !important;
  }
  .pControls {
    min-width: 100% !important;
    flex: none !important;
  }
  .pControls-filters {
    flex-wrap: wrap !important;
    overflow-x: hidden !important;
    gap: 8px !important;
  }
  .pControls-filters > * {
    flex: 1 1 calc(50% - 4px) !important;
    max-width: 100% !important;
    min-width: 0 !important;
  }
  /* حقل البحث يأخذ عرض كامل */
  .pControls-filters > div:first-child {
    flex: 1 1 100% !important;
  }
  .pControls select.input { 
    width: 100% !important; 
    flex: 1 1 calc(50% - 4px) !important; 
  }
  .tab-add-btn { 
    width: 100% !important; 
    justify-content: center !important; 
    margin-top: 4px !important; 
  }

  /* --- Participant Cards Grid --- */
  .runDetails .pGrid { grid-template-columns: 1fr !important; }

  /* بطاقة الطفل: تحسينات داخلية */
  .runDetails .pCard { 
    padding: 14px !important; 
    border-radius: 18px !important;
  }
  .runDetails .pName { font-size: 18px !important; }
  .runDetails .pQuickStats { 
    grid-template-columns: repeat(2, 1fr) !important; 
    gap: 8px !important;
    margin-bottom: 14px !important;
  }
  .runDetails .pStatValue { font-size: 16px !important; }
  .runDetails .pStatLabel { font-size: 12px !important; }
  .runDetails .metaItem { font-size: 11px !important; }

  /* --- Session Cards --- */
  .sessionRow { 
    grid-template-columns: 1fr !important; 
    padding: 14px !important; 
    align-items: flex-start !important; 
    gap: 10px !important;
  }
  .sessionList__time {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    width: 100% !important;
    border-bottom: 1px solid rgba(0,0,0,0.06) !important;
    padding-bottom: 8px !important;
  }

  /* أزرار الجلسات في الموبايل */
  .session-actions-desktop { 
    display: flex !important; 
    flex-wrap: wrap !important;
    width: 100% !important;
    justify-content: flex-start !important;
    margin-top: 4px !important;
    gap: 8px !important;
    border-top: 1px solid rgba(0,0,0,0.05) !important;
    padding-top: 10px !important;
  }
  .session-actions-desktop .btn {
    flex: 1 1 auto !important;
    min-width: calc(33.33% - 8px) !important;
    justify-content: center !important;
    font-size: 13px !important;
    min-height: 40px !important;
  }

  /* --- Expenses Tab --- */
  /* بطاقات الإحصاء العلوية في تبويب المصاريف */
  .tab-expenses-summary {
    grid-template-columns: 1fr 1fr 1fr !important;
    gap: 8px !important;
  }
  /* على الشاشات الصغيرة جداً: عمود واحد */
  @media (max-width: 480px) {
    .tab-expenses-summary {
      grid-template-columns: 1fr !important;
    }
  }
  /* نضمن أن الـ gridColumn span لا يتعارض مع الموبايل */
  .tab-expenses-summary > .card {
    grid-column: span 1 !important;
  }

  /* --- Payments & Expenses Row spacing --- */
  .runDetails .card { 
    padding: 14px !important; 
    border-radius: 18px !important;
  }

  /* --- Participant Manage Modal Actions Grid --- */
  .actionSquare { 
    min-height: 70px !important; 
    padding: 10px 6px !important;
  }
  .actionSquare span { font-size: 11px !important; }
  .modal-stats {
    grid-template-columns: 1fr 1fr !important;
  }

  /* --- General Modals --- */
  div.modalOverlay {
    align-items: center !important; 
    padding: 12px !important;
    z-index: 99999 !important;
  }
  div.modalOverlay > div.modalCard {
    border-radius: 22px !important; 
    margin: auto !important; 
    width: 96% !important; 
    max-height: 88vh !important;
    margin-bottom: auto !important;
    overflow: hidden !important;
    display: flex !important;
    flex-direction: column !important;
  }

  /* المحتوى الداخلي للمودال يأخذ باقي المساحة ويتمدد */
  div.modalOverlay > div.modalCard > *:last-child {
    flex: 1 1 auto !important;
    min-height: 0 !important;
    overflow-y: auto !important;
    display: flex !important;
    flex-direction: column !important;
  }

  /* الـ wrapper الداخلي (modal-wide-*) يتمدد بالكامل */
  .modal-wide-1000,
  .modal-wide-900 {
    display: flex !important;
    flex-direction: column !important;
    flex: 1 1 auto !important;
    min-height: 0 !important;
  }

  /* الجدول داخل البالك مودال: ارتفاع محدود ومرن */
  .modal-wide-1000 .card[style*="overflow"],
  .modal-wide-900 .card[style*="overflow"] {
    max-height: clamp(160px, 35vh, 45vh) !important;
  }

  /* أزرار الأسفل: تثبت في الأسفل دائماً */
  .modal-wide-1000 > .row:last-child,
  .modal-wide-900 > .row:last-child {
    flex-shrink: 0 !important;
    margin-top: 12px !important;
    padding-top: 10px !important;
    border-top: 1px solid rgba(15,23,42,0.06) !important;
  }

  /* داخل المودالات: الـ grid يصبح عمود واحد */
  div.modalCard .grid > div[style*="gridColumn: span 6"] {
    grid-column: span 12 !important;
  }

  /* جدول التاريخ داخل المودال */
  .modal-compact-table th { 
    font-size: 13px !important; 
    padding: 12px 8px !important; 
  }
  .modal-compact-table td { 
    font-size: 13px !important; 
    padding: 12px 8px !important; 
  }
}
`;

export default function RunDetails() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const { toast } = useOutletContext();

  const [tab, setTab] = useState("participants");

  const [summary, setSummary] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [children, setChildren] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [expFeatureAvailable, setExpFeatureAvailable] = useState(true);

  const [expQ, setExpQ] = useState("");
  const [expCatFilter, setExpCatFilter] = useState("all");
  const [expPartyFilter, setExpPartyFilter] = useState("all");

  const [expCatOptions, setExpCatOptions] = useState([]);
  const [expPartyOptions, setExpPartyOptions] = useState([]);
  const [expHasPicklists, setExpHasPicklists] = useState(true);

  const [openExpenseModal, setOpenExpenseModal] = useState(false);
  const [expenseEditId, setExpenseEditId] = useState(null);
  const [expDate, setExpDate] = useState(isoDate(new Date()));
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("");
  const [expParty, setExpParty] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expSaving, setExpSaving] = useState(false);

  const [newCatName, setNewCatName] = useState("");
  const [newPartyName, setNewPartyName] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [childSearch, setChildSearch] = useState("");
  const [childStatusFilter, setChildStatusFilter] = useState("all");
  const [childSort, setChildSort] = useState("balance_desc");

  const [openEnroll, setOpenEnroll] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [enrollLocked, setEnrollLocked] = useState(false);
  const [enrollLockedName, setEnrollLockedName] = useState("");

  const [buySessions, setBuySessions] = useState(8);
  const [buyPriceTotal, setBuyPriceTotal] = useState("");
  const [buyUnitPrice, setBuyUnitPrice] = useState("");
  const [buyPriceEditMode, setBuyPriceEditMode] = useState("total");

  const [enrollSaving, setEnrollSaving] = useState(false);

  const [openNewChild, setOpenNewChild] = useState(false);
  const [newChildForm, setNewChildForm] = useState({
    name: "",
    age: "",
    class: "",
    gender: "male",
    country_name: "", // بدل country_id
    mother_name: "",
    mother_phone: "",
    father_name: "",
    father_phone: "",
    notes: "",
  });
  const [newChildSaving, setNewChildSaving] = useState(false);

  const [countries, setCountries] = useState([]);
  const [classes, setClasses] = useState([]); // لخيارات الصف
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [newChildEnrollNow, setNewChildEnrollNow] = useState(false);

  const [pkgInfo, setPkgInfo] = useState(null);
  const [pkgLoading, setPkgLoading] = useState(false);
  const [enrollMode, setEnrollMode] = useState("buy_new");

  // --- Bulk Enroll State ---
  const [openBulk, setOpenBulk] = useState(false);
  const [bulkStep, setBulkStep] = useState(1);
  const [bulkQ, setBulkQ] = useState("");
  const [bulkSelected, setBulkSelected] = useState({});
  const [bulkPerChildSessions, setBulkPerChildSessions] = useState({});
  const [bulkPerChildPrice, setBulkPerChildPrice] = useState({});
  const [bulkPerChildDate, setBulkPerChildDate] = useState({});
  // جديد: للورشات
  const [bulkPerChildPaid, setBulkPerChildPaid] = useState({});
  const [bulkPerChildPayMethod, setBulkPerChildPayMethod] = useState({});
  const [bulkSaving, setBulkSaving] = useState(false);

  const [openHistory, setOpenHistory] = useState(false);
  const [historyEnrollment, setHistoryEnrollment] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [openAttHistory, setOpenAttHistory] = useState(false);
  const [attHistoryRows, setAttHistoryRows] = useState([]);
  const [attHistoryLoading, setAttHistoryLoading] = useState(false);

  const [openPkgHistory, setOpenPkgHistory] = useState(false);
  const [pkgHistoryRows, setPkgHistoryRows] = useState([]);
  const [pkgHistoryLoading, setPkgHistoryLoading] = useState(false);

  const [openEditPkg, setOpenEditPkg] = useState(false);
  const [editPkgData, setEditPkgData] = useState({
    id: null,
    sessions_total: "",
    price_total: "",
    created_at: "", // لحفظ وتعديل تاريخ الباقة
  });
  const [editPkgSaving, setEditPkgSaving] = useState(false);

  const [openPay, setOpenPay] = useState(false);
  const [payEnrollmentId, setPayEnrollmentId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payDate, setPayDate] = useState(isoDate(new Date())); // التاريخ كمدخل منفصل
  const [payNote, setPayNote] = useState("");
  const [paySaving, setPaySaving] = useState(false);
  const [payEditId, setPayEditId] = useState(null);
  const [payLocked, setPayLocked] = useState(false);

  const [shouldReopenManage, setShouldReopenManage] = useState(false);

  const [firstStart, setFirstStart] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [count, setCount] = useState(8);
  const [intervalDays, setIntervalDays] = useState(7);
  const [genLoading, setGenLoading] = useState(false);

  const [openSession, setOpenSession] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    id: null,
    start_at: "",
    end_at: "",
    duration_min: 60,
    status: "scheduled",
  });
  const [sessionSaving, setSessionSaving] = useState(false);

  const [openإدارة, setOpenإدارة] = useState(false);
  const [manageP, setإدارةP] = useState(null);

  const manageHasPayments = useMemo(
    () => Number(manageP?.paid_amount || 0) > 0,
    [manageP],
  );

  const [confirm, setConfirm] = useState({
    open: false,
    type: null,
    id: null,
    text: "",
  });

  const isWorkshop = (() => {
    const raw =
      summary?.course_type ??
      summary?.type ??
      summary?.kind ??
      summary?.course?.course_type ??
      summary?.course?.type ??
      summary?.course?.kind ??
      "";
    const v = String(raw).trim().toLowerCase();
    return (
      v === "workshop" ||
      v === "ws" ||
      v === "one_time" ||
      v === "one-time" ||
      v.includes("workshop") ||
      v.includes("ورشة")
    );
  })();

  const defaultPrice = useMemo(
    () => Number(summary?.default_price ?? 0),
    [summary],
  );

  const defaultSessionsTotal = useMemo(() => {
    const raw = summary?.default_sessions_total ?? summary?.sessions_total ?? 8;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
  }, [summary]);

  async function loadFixed() {
    setLoading(true);
    setError(null);
    try {
      const s = await supabase
        .from("course_runs_summary_view")
        .select("*")
        .eq("run_id", runId)
        .maybeSingle();
      if (s.error) throw s.error;
      if (!s.data) {
        setSummary(null);
        setLoading(false);
        return;
      }
      setSummary(s.data);

      const p = await supabase
        .from("run_participants_view")
        .select("*")
        .eq("run_id", runId)
        .order("child_name", { ascending: true });
      if (p.error) throw p.error;
      setParticipants(p.data ?? []);

      const ses = await supabase
        .from("course_sessions")
        .select("*")
        .eq("run_id", runId)
        .order("start_at", { ascending: true });
      if (ses.error) throw ses.error;
      setSessions(ses.data ?? []);

      const ch = await loadChildrenSafe();
      setChildren(ch);

      const pkgIds = p.data?.map((x) => x.package_id).filter(Boolean) || [];
      const uniqPkgIds = Array.from(new Set(pkgIds));
      if (uniqPkgIds.length > 0) {
        const payRes = await supabase
          .from("payments")
          .select("id,package_id,enrollment_id,amount,method,note,created_at")
          .in("package_id", uniqPkgIds)
          .order("created_at", { ascending: false });
        if (payRes.data) {
          const pkgMap = new Map();
          for (const r of p.data)
            if (r.package_id)
              pkgMap.set(r.package_id, {
                child_id: r.child_id,
                child_name: r.child_name,
              });
          setPayments(
            payRes.data.map((x) => ({
              ...x,
              child_id: pkgMap.get(x.package_id)?.child_id,
              child_name: pkgMap.get(x.package_id)?.child_name ?? "—",
            })),
          );
        }
      } else setPayments([]);

      await loadRunExpensesSafe();
      setLoading(false);
    } catch (e) {
      setError(e);
      setLoading(false);
    }
  }

  async function loadChildrenSafe() {
    const tryView = await supabase
      .from("children_view")
      .select(
        "id,name,age,class,gender,country_id,country_name,mother_name,mother_phone,father_name,father_phone,created_at",
      )
      .order("name", { ascending: true });

    if (!tryView.error) return tryView.data ?? [];
    const tryTable = await supabase
      .from("children")
      .select(
        "id,name,age,class,gender,country_id,mother_name,mother_phone,father_name,father_phone,created_at",
      )
      .order("name", { ascending: true });

    if (tryTable.error) throw tryTable.error;
    return tryTable.data ?? [];
  }

  async function loadFormPicklists() {
    setCountriesLoading(true);
    try {
      const [cRes, clRes] = await Promise.all([
        supabase.from("countries").select("id,name").order("name"),
        supabase.from("child_classes").select("id,name").order("name"),
      ]);
      if (cRes.data) setCountries(cRes.data);
      if (clRes.data) setClasses(clRes.data);
    } catch (e) {
      console.error("Failed to load picklists:", e);
    } finally {
      setCountriesLoading(false);
    }
  }

  async function loadExpensePicklistsSafe() {
    try {
      const cRes = await supabase
        .from("expense_categories")
        .select("name")
        .order("name", { ascending: true });
      const pRes = await supabase
        .from("expense_parties")
        .select("name")
        .order("name", { ascending: true });
      if (cRes.data) setExpCatOptions(cRes.data.map((r) => r.name));
      if (pRes.data) setExpPartyOptions(pRes.data.map((r) => r.name));
      setExpHasPicklists(true);
    } catch {
      setExpHasPicklists(false);
    }
  }

  async function loadRunExpensesSafe() {
    try {
      const res = await supabase
        .from("expenses")
        .select("id,spent_on,amount,category,party,description,created_at")
        .eq("run_id", Number(runId))
        .order("spent_on", { ascending: false });
      if (res.error) throw res.error;
      setExpenses(res.data ?? []);
      setExpFeatureAvailable(true);
    } catch {
      setExpenses([]);
      setExpFeatureAvailable(false);
    }
  }

  // --- Effects ---
  useEffect(() => {
    loadFixed();
  }, [runId]);

  useEffect(() => {
    loadExpensePicklistsSafe();
  }, []);

  useEffect(() => {
    if (!manageP) return;
    const updated = participants.find(
      (x) => Number(x.enrollment_id) === Number(manageP.enrollment_id),
    );
    if (updated) setإدارةP(updated);
  }, [participants]);

  useEffect(() => {
    if (openNewChild) loadFormPicklists();
  }, [openNewChild]);

  useEffect(() => {
    async function fetchPkg() {
      if (!openEnroll || !summary || !selectedChildId) {
        setPkgInfo(null);
        return;
      }
      setPkgLoading(true);
      try {
        const res = await supabase
          .from("package_balance_view")
          .select("package_id,sessions_remaining")
          .eq("course_id", Number(summary.template_id))
          .eq("child_id", Number(selectedChildId));
        const row =
          (res.data ?? []).find((r) => Number(r.sessions_remaining) > 0) ??
          null;
        setPkgInfo(row);
        setEnrollMode(row ? "use_existing" : "buy_new");
      } catch {
        setEnrollMode("buy_new");
      } finally {
        setPkgLoading(false);
      }
    }
    fetchPkg();
  }, [openEnroll, selectedChildId, summary]);

  // --- Memos & Derived State ---
  const expCategories = useMemo(
    () =>
      expHasPicklists && expCatOptions.length
        ? uniqSorted(expCatOptions)
        : uniqSorted(expenses.map((r) => r.category)),
    [expHasPicklists, expCatOptions, expenses],
  );
  const expParties = useMemo(
    () =>
      expHasPicklists && expPartyOptions.length
        ? uniqSorted(expPartyOptions)
        : uniqSorted(expenses.map((r) => r.party)),
    [expHasPicklists, expPartyOptions, expenses],
  );
  const expensesFiltered = useMemo(() => {
    let list = [...expenses];
    const s = expQ.trim().toLowerCase();
    if (s)
      list = list.filter(
        (r) =>
          (r.category || "").toLowerCase().includes(s) ||
          (r.party || "").toLowerCase().includes(s) ||
          (r.description || "").toLowerCase().includes(s),
      );
    if (expCatFilter !== "all")
      list = list.filter((r) => String(r.category || "") === expCatFilter);
    if (expPartyFilter !== "all")
      list = list.filter((r) => String(r.party || "") === expPartyFilter);
    return list;
  }, [expenses, expQ, expCatFilter, expPartyFilter]);

  const runExpensesTotal = useMemo(
    () => expenses.reduce((acc, r) => acc + Number(r.amount || 0), 0),
    [expenses],
  );

  const { upcomingSessions, pastSessions } = useMemo(() => {
    const now = new Date();
    const upcoming = [];
    const past = [];

    sessions.forEach((s) => {
      if (new Date(s.start_at) >= now) {
        upcoming.push(s);
      } else {
        past.push(s);
      }
    });

    upcoming.sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
    past.sort((a, b) => new Date(b.start_at) - new Date(a.start_at));

    return { upcomingSessions: upcoming, pastSessions: past };
  }, [sessions]);

  const scheduleInfo = useMemo(
    () =>
      sessions.length
        ? {
            weekday: fmtWeekday(sessions[0].start_at),
            timeRange: `${fmtTimeHM(sessions[0].start_at)}–${fmtTimeHM(sessions[0].end_at)}`,
          }
        : { weekday: "—", timeRange: "—" },
    [sessions],
  );

  const runHeaderTitle = useMemo(() => {
    const m = String(summary?.title || "").trim();
    const s = String(summary?.label || "").trim();
    return m && s && m !== s ? `${m} - ${s}` : m || s || "—";
  }, [summary]);

  const totals = useMemo(() => {
    const active = participants.filter((p) => p.enrollment_status === "active");
    const agreed = active.reduce(
      (acc, p) => acc + Number(p.agreed_price || 0),
      0,
    );
    const paid = active.reduce((acc, p) => acc + Number(p.paid_amount || 0), 0);
    const balance = active.reduce((acc, p) => acc + Number(p.balance || 0), 0);
    return {
      activeCount: active.length,
      agreed,
      paid,
      balance,
      paidRatio: agreed === 0 ? 0 : paid / agreed,
    };
  }, [participants]);

  const availableChildren = useMemo(() => {
    const enrolledActive = new Set(
      participants
        .filter((p) => p.enrollment_status === "active")
        .map((p) => Number(p.child_id)),
    );
    return children.filter((c) => !enrolledActive.has(c.id));
  }, [children, participants]);

  const participantsFiltered = useMemo(() => {
    let list = [...participants];
    const s = childSearch.trim().toLowerCase();
    if (s)
      list = list.filter((p) =>
        String(p.child_name ?? "")
          .toLowerCase()
          .includes(s),
      );
    list = list.filter((p) => p.enrollment_status !== "withdrawn");
    if (childStatusFilter !== "all")
      list = list.filter((p) =>
        childStatusFilter === "active"
          ? p.enrollment_status === "active"
          : p.enrollment_status !== "active",
      );
    if (childSort === "balance_desc")
      list.sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0));
    else if (childSort === "balance_asc")
      list.sort((a, b) => Number(a.balance || 0) - Number(b.balance || 0));
    else if (childSort === "name_asc")
      list.sort((a, b) =>
        String(a.child_name ?? "").localeCompare(
          String(b.child_name ?? ""),
          "en",
        ),
      );
    else if (childSort === "name_desc")
      list.sort((a, b) =>
        String(b.child_name ?? "").localeCompare(
          String(a.child_name ?? ""),
          "en",
        ),
      );
    return list;
  }, [participants, childSearch, childStatusFilter, childSort]);

  const manageChild = useMemo(
    () =>
      manageP
        ? (children.find((c) => Number(c.id) === Number(manageP.child_id)) ??
          null)
        : null,
    [manageP, children],
  );

  const bulkCandidates = useMemo(() => {
    const s = bulkQ.trim().toLowerCase();
    return s
      ? availableChildren.filter((c) =>
          (c.name ?? "").toLowerCase().includes(s),
        )
      : availableChildren;
  }, [availableChildren, bulkQ]);

  const bulkSelectedIds = useMemo(
    () =>
      Object.keys(bulkSelected)
        .filter((id) => bulkSelected[id])
        .map(Number),
    [bulkSelected],
  );

  const bulkSelectedCount = bulkSelectedIds.length;

  // --- Action Functions ---
  const closeSubModalAndReopen = (setterFunc) => {
    setterFunc(false);
    if (shouldReopenManage && manageP) {
      setTimeout(() => {
        setOpenإدارة(true);
      }, 150);
      setShouldReopenManage(false);
    }
  };

  function openإدارةFor(p) {
    setإدارةP(p);
    setOpenإدارة(true);
  }

  const openCreateEnroll = () => {
    setNewChildForm({
      name: "",
      age: "",
      class: "",
      gender: "male",
      country_name: "",
      mother_name: "",
      mother_phone: "",
      father_name: "",
      father_phone: "",
      notes: "",
    });
    setNewChildEnrollNow(true);
    setOpenNewChild(true);
  };

  function openBulkModal() {
    setOpenBulk(true);
    setBulkStep(1); // إرجاع للخطوة الأولى
    setBulkQ("");
    setBulkSelected({});
    setBulkPerChildSessions({});
    setBulkPerChildPrice({});
    setBulkPerChildDate({});
    setBulkPerChildPaid({});
    setBulkPerChildPayMethod({});
  }

  function toggleBulkChild(childId) {
    setBulkSelected((prev) => {
      const next = { ...prev };
      next[String(childId)] = !next[String(childId)];
      return next;
    });
  }

  function bulkSelectAllFiltered() {
    setBulkSelected((prev) => {
      const next = { ...prev };
      for (const c of bulkCandidates) next[String(c.id)] = true;
      return next;
    });
  }

  function bulkClearSelection() {
    setBulkSelected({});
    setBulkPerChildPrice({});
    setBulkPerChildSessions({});
    setBulkPerChildDate({});
    setBulkPerChildPaid({});
    setBulkPerChildPayMethod({});
  }

  function openNewPaymentModal() {
    setPayEditId(null);
    setPayLocked(false);
    setPayEnrollmentId("");
    setPayAmount("");
    setPayMethod("cash");
    setPayDate(isoDate(new Date()));
    setPayNote("");
    setOpenPay(true);
  }

  function openPaymentModalFor(pRow, mode = "custom") {
    setPayEnrollmentId(String(pRow.enrollment_id));
    setPayLocked(true);
    setPayEditId(null);
    setPayAmount(
      mode === "remaining" && Number(pRow.balance) > 0
        ? String(Number(pRow.balance).toFixed(2))
        : "",
    );
    setPayMethod("cash");
    setPayDate(isoDate(new Date()));
    setPayNote("");
    setOpenPay(true);
  }

  function openEditPayment(r) {
    setPayEditId(r.id);
    setPayEnrollmentId(String(r.enrollment_id ?? ""));
    setPayLocked(true);
    setPayAmount(r.amount ? String(Number(r.amount).toFixed(2)) : "");
    setPayMethod(r.method || "cash");
    setPayDate(isoDate(r.created_at));
    setPayNote(r.note || "");
    setOpenPay(true);
  }

  function paymentMethodLabel(v) {
    if (v === "cash") return "نقداً";
    if (v === "card") return "بطاقة ائتمان";
    if (v === "transfer") return "حوالة بنكية";
    if (v === "other") return "أخرى";
    return v || "-";
  }

  function initEnrollBuyNew({
    childId = "",
    locked = false,
    lockedName = "",
  } = {}) {
    setEnrollLocked(locked);
    setEnrollLockedName(lockedName);
    setSelectedChildId(childId ? String(childId) : "");
    const s0 = defaultSessionsTotal;
    setBuySessions(s0);
    setBuyPriceTotal(String(defaultPrice));
    setBuyUnitPrice(s0 > 0 ? (Number(defaultPrice || 0) / s0).toFixed(2) : "");
    setBuyPriceEditMode("total");
    setPkgInfo(null);
    setEnrollMode("buy_new");
    setOpenEnroll(true);
  }

  function openSingleTopup(participantRow) {
    setEnrollLocked(true);
    setEnrollLockedName(participantRow.child_name);
    setSelectedChildId(String(participantRow.child_id));
    const s1 = 1;
    const u =
      Number(participantRow.sessions_allocated || 0) > 0
        ? Number(participantRow.agreed_price || 0) /
          participantRow.sessions_allocated
        : Number(defaultPrice || 0) / Math.max(1, defaultSessionsTotal);
    setBuySessions(s1);
    setBuyUnitPrice(u > 0 ? u.toFixed(2) : "");
    setBuyPriceTotal(u > 0 ? (s1 * u).toFixed(2) : "");
    setBuyPriceEditMode("unit");
    setEnrollMode("buy_new");
    setOpenEnroll(true);
  }

  async function createChildInline({ enrollNow = false } = {}) {
    const name = (newChildForm.name || "").trim();
    const ageNum = Number(String(newChildForm.age ?? "").trim());
    if (!name || isNaN(ageNum)) {
      toast("الاسم والعمر مطلوبان.", "warn");
      return;
    }

    setNewChildSaving(true);
    try {
      let countryId = null;
      const typedCountry = (newChildForm.country_name || "").trim();
      if (typedCountry) {
        const existingC = countries.find((c) => c.name === typedCountry);
        if (existingC) {
          countryId = existingC.id;
        } else {
          const created = await supabase
            .from("countries")
            .insert([{ name: typedCountry }])
            .select("id")
            .single();
          if (created.data) countryId = created.data.id;
        }
      }

      const typedClass = (newChildForm.class || "").trim();
      if (typedClass) {
        const existingCl = classes.find((c) => c.name === typedClass);
        if (!existingCl) {
          await supabase.from("child_classes").insert([{ name: typedClass }]);
        }
      }

      const payload = {
        name,
        age: ageNum,
        class: typedClass || null,
        gender: newChildForm.gender || "male",
        mother_name: (newChildForm.mother_name || "").trim() || null,
        mother_phone: (newChildForm.mother_phone || "").trim() || null,
        father_name: (newChildForm.father_name || "").trim() || null,
        father_phone: (newChildForm.father_phone || "").trim() || null,
        notes: (newChildForm.notes || "").trim() || null,
        country_id: countryId,
      };

      const ins = await supabase
        .from("children")
        .insert([payload])
        .select("id")
        .single();
      if (ins.error) throw ins.error;

      const newId = ins.data?.id;
      const ch = await loadChildrenSafe();
      setChildren(ch);
      setSelectedChildId(String(newId || ""));
      setOpenNewChild(false);

      if (enrollNow && newId) {
        initEnrollBuyNew({ childId: newId });
        toast("تم إضافة الطفل. حدد الباقة واضغط حفظ للتسجيل.", "ok");
      } else {
        toast("تم إضافة الطفل بنجاح.", "ok");
      }
    } catch (e) {
      toast("فشلت عملية إضافة الطفل.", "danger");
    } finally {
      setNewChildSaving(false);
    }
  }

  async function purchaseAndEnrollSpecificChild(childId) {
    if (!summary) return;
    const sessionsToBuy = Number(buySessions);
    const priceNum = buyPriceTotal === "" ? 0 : Number(buyPriceTotal);

    try {
      const { data: futureSessions } = await supabase
        .from("course_sessions")
        .select("id")
        .eq("run_id", Number(runId))
        .eq("status", "scheduled")
        .gte("start_at", new Date().toISOString());

      const futureCount = futureSessions ? futureSessions.length : 0;
      const alloc = Math.min(sessionsToBuy, futureCount);

      const insPkg = await supabase
        .from("course_packages")
        .insert([
          {
            course_id: summary.template_id,
            child_id: Number(childId),
            sessions_total: sessionsToBuy,
            price_total: priceNum,
            status: "active",
          },
        ])
        .select("id")
        .single();

      if (insPkg.error) throw insPkg.error;

      const insEnroll = await supabase.from("enrollments").insert([
        {
          course_id: summary.template_id,
          run_id: Number(runId),
          child_id: Number(childId),
          package_id: insPkg.data.id,
          sessions_allocated: alloc,
          agreed_price: priceNum,
          status: "active",
        },
      ]);

      if (insEnroll.error) throw insEnroll.error;

      await loadFixed();
      toast("تم التسجيل بنجاح.", "ok");
      closeSubModalAndReopen(setOpenEnroll);
      if (!enrollLocked && !shouldReopenManage) setTab("participants");
    } catch (e) {
      console.error(e);
      if (String(e?.message || e).includes("uq_run_child"))
        toast("الطالب مسجل بالفعل.", "warn");
      else toast("فشلت عملية التسجيل.", "danger");
    }
  }

  async function bumpEnrollmentAllocated(enrollmentId, delta) {
    const id = Number(enrollmentId);
    const d = Number(delta);
    if (!id || !d) return;

    const cur = await supabase
      .from("enrollments")
      .select("sessions_allocated")
      .eq("id", id)
      .maybeSingle();

    const next = Math.max(0, Number(cur.data?.sessions_allocated ?? 0) + d);

    const u = await supabase
      .from("enrollments")
      .update({ sessions_allocated: next })
      .eq("id", id);

    if (u.error) throw u.error;
  }

  async function reactivateWithdrawnEnrollment(childId) {
    const existing = participants.find(
      (p) =>
        Number(p.child_id) === Number(childId) &&
        p.enrollment_status === "withdrawn",
    );
    if (!existing) return false;
    const s = Number(buySessions) || 0;
    const priceTotalNum =
      buyPriceEditMode === "unit"
        ? (Number(buyUnitPrice) || 0) * s
        : Number(buyPriceTotal) || 0;
    try {
      const u1 = await supabase
        .from("enrollments")
        .update({ status: "active" })
        .eq("id", existing.enrollment_id);
      if (u1.error) throw u1.error;

      const insPkg = await supabase
        .from("course_packages")
        .insert([
          {
            course_id: summary.template_id,
            child_id: Number(childId),
            sessions_total: s,
            price_total: priceTotalNum,
            status: "active",
          },
        ])
        .select("id")
        .single();

      if (insPkg.error) throw insPkg.error;

      const newAgreed = Number(existing.agreed_price || 0) + priceTotalNum;
      await supabase
        .from("enrollments")
        .update({
          package_id: insPkg.data.id,
          agreed_price: newAgreed,
        })
        .eq("id", existing.enrollment_id);

      if (s > 0) await bumpEnrollmentAllocated(existing.enrollment_id, s);

      await loadFixed();
      toast("تمت إعادة التسجيل وباقة جديدة بنجاح.", "ok");
      closeSubModalAndReopen(setOpenEnroll);
      if (!enrollLocked && !shouldReopenManage) setTab("participants");
      return true;
    } catch (e) {
      console.error(e);
      toast("فشلت إعادة التسجيل.", "danger");
      return true;
    }
  }

  async function purchaseAndEnrollSingle() {
    if (!summary) return;
    if (!selectedChildId) {
      toast("الرجاء اختيار طفل.", "warn");
      return;
    }
    setEnrollSaving(true);
    try {
      const existing = participants.find(
        (p) => Number(p.child_id) === Number(selectedChildId),
      );

      if (enrollMode === "use_existing") {
        if (Number(pkgInfo?.sessions_remaining ?? 0) <= 0) {
          toast("هذا الطفل لا يملك رصيد كافٍ.", "warn");
          setEnrollSaving(false);
          return;
        }
        const rpc = await supabase.rpc("enroll_from_existing_package", {
          p_run_id: Number(runId),
          p_child_id: Number(selectedChildId),
        });
        if (rpc.error) {
          if (rpc.error.message.includes("uq_run_child")) {
            await reactivateWithdrawnEnrollment(selectedChildId);
            return;
          }
          throw rpc.error;
        }
        await loadFixed();
        toast("تم التسجيل باستخدام الرصيد السابق.", "ok");
        closeSubModalAndReopen(setOpenEnroll);
        if (!enrollLocked && !shouldReopenManage) setTab("participants");
        return;
      }

      if (existing && existing.enrollment_status === "active") {
        const sessionsToAdd = Number(buySessions) || 0;
        const priceToAdd = Number(buyPriceTotal) || 0;

        const insPkg = await supabase
          .from("course_packages")
          .insert([
            {
              course_id: summary.template_id,
              child_id: existing.child_id,
              sessions_total: sessionsToAdd,
              price_total: priceToAdd,
              status: "active",
            },
          ])
          .select("id")
          .single();

        if (insPkg.error) throw insPkg.error;

        const newPkgId = insPkg.data.id;
        const newAgreedPrice = Number(existing.agreed_price || 0) + priceToAdd;

        const uEnroll = await supabase
          .from("enrollments")
          .update({
            package_id: newPkgId,
            agreed_price: newAgreedPrice,
          })
          .eq("id", existing.enrollment_id);

        if (uEnroll.error) throw uEnroll.error;

        await bumpEnrollmentAllocated(existing.enrollment_id, sessionsToAdd);

        await loadFixed();
        toast("تم إضافة الجلسات كباقة جديدة بنجاح.", "ok");
        closeSubModalAndReopen(setOpenEnroll);
        if (!enrollLocked && !shouldReopenManage) setTab("participants");
        return;
      }

      if (
        existing &&
        existing.enrollment_status === "withdrawn" &&
        (await reactivateWithdrawnEnrollment(selectedChildId))
      )
        return;

      await purchaseAndEnrollSpecificChild(selectedChildId);
    } catch (e) {
      console.error("Topup Error:", e);
      if (String(e?.message || e).includes("uq_run_child"))
        toast("مسجل بالفعل.", "warn");
      else toast("فشلت العملية.", "danger");
    } finally {
      setEnrollSaving(false);
    }
  }

  async function bulkPurchaseAndEnroll() {
    if (!summary || bulkSelectedCount === 0) return;
    setBulkSaving(true);
    try {
      let added = 0;
      let failed = 0;

      const { data: futureSessions } = await supabase
        .from("course_sessions")
        .select("id")
        .eq("run_id", Number(runId))
        .eq("status", "scheduled")
        .gte("start_at", new Date().toISOString());

      const futureCount = futureSessions ? futureSessions.length : 0;

      for (const childId of bulkSelectedIds) {
        const cid = Number(childId);

        let sessionsNum = isWorkshop
          ? 1
          : Number(bulkPerChildSessions[cid] ?? defaultSessionsTotal);
        if (isNaN(sessionsNum) || sessionsNum < 0)
          sessionsNum = isWorkshop ? 1 : Number(defaultSessionsTotal) || 0;

        let priceNum = Number(bulkPerChildPrice[cid] ?? defaultPrice);
        if (isNaN(priceNum) || priceNum < 0)
          priceNum = Number(defaultPrice) || 0;

        const dateStr =
          bulkPerChildDate[cid] !== undefined
            ? bulkPerChildDate[cid]
            : isoDate(new Date());

        const isoD = updateDateKeepTime(dateStr);

        const insPkg = await supabase
          .from("course_packages")
          .insert([
            {
              course_id: summary.template_id,
              child_id: cid,
              sessions_total: sessionsNum,
              price_total: priceNum,
              status: "active",
              created_at: isoD,
            },
          ])
          .select("id")
          .single();

        if (insPkg.error) {
          failed += 1;
          continue;
        }

        const alloc = Math.min(sessionsNum, futureCount);

        const insEnroll = await supabase
          .from("enrollments")
          .insert([
            {
              course_id: summary.template_id,
              run_id: Number(runId),
              child_id: cid,
              package_id: insPkg.data.id,
              sessions_allocated: alloc,
              agreed_price: priceNum,
              status: "active",
              created_at: isoD,
            },
          ])
          .select("id")
          .single();

        if (insEnroll.error) {
          failed += 1;
          continue;
        }

        added += 1;
        const enrollData = insEnroll.data;

        if (isWorkshop && bulkPerChildPaid[cid]) {
          await supabase.from("payments").insert([
            {
              enrollment_id: enrollData.id,
              amount: priceNum,
              method: bulkPerChildPayMethod[cid] || "cash",
              created_at: isoD,
              note: "دفع مباشر عند الإضافة للورشة",
            },
          ]);
        }

        if (isWorkshop) {
          const { data: runSessions } = await supabase
            .from("course_sessions")
            .select("id")
            .eq("run_id", Number(runId));
          if (runSessions && runSessions.length > 0) {
            const attPayload = runSessions.map((rs) => ({
              enrollment_id: enrollData.id,
              session_id: rs.id,
              status: "present",
              created_at: isoD,
            }));
            await supabase.from("attendance").insert(attPayload);
          }
        }
      }

      await loadFixed();
      setTab("participants");
      toast(
        `تمت الإضافة: ${added}, فشل: ${failed}`,
        failed > 0 ? "warn" : "ok",
      );
      setOpenBulk(false);
      bulkClearSelection();
    } catch (e) {
      console.error(e);
      toast("فشلت عملية الإضافة.", "danger");
    } finally {
      setBulkSaving(false);
    }
  }

  async function setEnrollmentStatus(enrollmentId, status) {
    const u = await supabase
      .from("enrollments")
      .update({ status })
      .eq("id", enrollmentId);
    if (!u.error) {
      toast("Status updated.", "ok");
      await loadFixed();
    }
  }

  async function deleteEnrollment(enrollmentId, childId, courseId) {
    try {
      const payCheck = await supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("enrollment_id", enrollmentId);
      if ((payCheck.count || 0) > 0) {
        toast("لا يمكن حذفه لوجود دفعات مسجلة.", "warn");
        return;
      }

      if (childId && courseId) {
        await supabase
          .from("course_packages")
          .delete()
          .eq("child_id", childId)
          .eq("course_id", courseId);
      }

      const delRes = await supabase
        .from("enrollments")
        .delete()
        .eq("id", enrollmentId);

      if (delRes.error) {
        await supabase
          .from("enrollments")
          .update({ status: "withdrawn", sessions_allocated: 0 })
          .eq("id", enrollmentId);
      }

      toast("تم الحذف بنجاح.", "ok");

      setOpenإدارة(false);
      setإدارةP(null);

      await loadFixed();
    } catch {
      toast("Failed to remove.", "danger");
    }
  }

  async function generateSessions() {
    if (!firstStart) return;
    setGenLoading(true);
    try {
      const [datePart, timePart] = firstStart.split("T");
      const [y, m, d] = datePart.split("-");
      const [hh, mm] = timePart.split(":");
      const baseYear = parseInt(y, 10);
      const baseMonth = parseInt(m, 10) - 1;
      const baseDay = parseInt(d, 10);
      const baseHours = parseInt(hh, 10);
      const baseMins = parseInt(mm, 10);

      const sessionsToInsert = [];
      const c = Number(count) || 1;
      const interval = Number(intervalDays) || 7;
      const dur = Number(durationMinutes) || 60;

      for (let i = 0; i < c; i++) {
        const start = new Date(
          baseYear,
          baseMonth,
          baseDay + i * interval,
          baseHours,
          baseMins,
        );
        const end = new Date(start.getTime() + dur * 60000);

        sessionsToInsert.push({
          run_id: Number(runId),
          course_id: Number(summary.template_id),
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          status: "scheduled",
        });
      }

      const { error } = await supabase
        .from("course_sessions")
        .insert(sessionsToInsert);
      if (error) throw error;

      toast("تم إنشاء الجلسات بنجاح.", "ok");
      await loadFixed();
      setTab("sessions");
    } catch (e) {
      console.error("Generate Sessions Error:", e);
      toast("فشل إنشاء الجلسات.", "danger");
    } finally {
      setGenLoading(false);
    }
  }

  function openCreateSession() {
    setSessionForm({
      id: null,
      start_at: "",
      end_at: "",
      duration_min: Number(durationMinutes) || 60,
      status: "scheduled",
    });
    setOpenSession(true);
  }

  function openEditSession(s) {
    const toLocal = (d) => {
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setSessionForm({
      id: s.id,
      start_at: toLocal(new Date(s.start_at)),
      end_at: toLocal(new Date(s.end_at)),
      duration_min:
        Math.max(
          1,
          Math.round(
            (new Date(s.end_at).getTime() - new Date(s.start_at).getTime()) /
              60000,
          ),
        ) || 60,
      status: s.status,
    });
    setOpenSession(true);
  }

  async function saveSession() {
    if (!sessionForm.start_at) return;
    setSessionSaving(true);
    try {
      const startLocal = new Date(sessionForm.start_at);
      const endLocal = new Date(
        startLocal.getTime() + (Number(sessionForm.duration_min) || 60) * 60000,
      );
      const payload = {
        run_id: Number(runId),
        course_id: Number(summary.template_id),
        start_at: startLocal.toISOString(),
        end_at: endLocal.toISOString(),
        status: sessionForm.status,
      };
      if (sessionForm.id)
        await supabase
          .from("course_sessions")
          .update(payload)
          .eq("id", sessionForm.id);
      else await supabase.from("course_sessions").insert([payload]);
      setOpenSession(false);
      await loadFixed();
      setTab("sessions");
    } catch {
      toast("Failed.", "danger");
    } finally {
      setSessionSaving(false);
    }
  }

  async function setSessionStatus(sessionId, status) {
    await supabase
      .from("course_sessions")
      .update({ status })
      .eq("id", sessionId);
    await loadFixed();
  }

  async function deleteSession(sessionId) {
    await supabase.from("course_sessions").delete().eq("id", sessionId);
    await loadFixed();
  }

  async function addPayment() {
    if (!payEnrollmentId || !payAmount) return;
    setPaySaving(true);
    try {
      const p = {
        amount: Number(payAmount),
        method: payMethod,
        note: payNote.trim() || null,
      };

      if (payDate) {
        p.created_at = updateDateKeepTime(payDate);
      }

      if (payEditId)
        await supabase.from("payments").update(p).eq("id", payEditId);
      else
        await supabase
          .from("payments")
          .insert([{ enrollment_id: Number(payEnrollmentId), ...p }]);

      setPayEditId(null);
      setPayLocked(false);
      await loadFixed();
      closeSubModalAndReopen(setOpenPay);
    } catch {
      toast("Failed.", "danger");
    } finally {
      setPaySaving(false);
    }
  }

  async function deletePayment(id) {
    await supabase.from("payments").delete().eq("id", id);
    await loadFixed();
  }

  async function openPaymentHistory(pRow) {
    setHistoryEnrollment(pRow);
    setOpenHistory(true);
    setHistoryLoading(true);

    const { data } = await supabase
      .from("payments")
      .select("id,enrollment_id,amount,method,note,created_at")
      .eq("enrollment_id", pRow.enrollment_id)
      .order("created_at", { ascending: false });

    setHistoryRows(data ?? []);
    setHistoryLoading(false);
  }

  async function fetchAttHistory(pRow) {
    setHistoryEnrollment(pRow);
    setOpenAttHistory(true);
    setAttHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select("id, status, note, created_at, course_sessions(start_at)")
        .eq("enrollment_id", pRow.enrollment_id);
      if (error) throw error;
      const formatted = (data || [])
        .map((r) => ({
          id: r.id,
          status: r.status,
          note: r.note,
          start_at: r.course_sessions?.start_at,
          created_at: r.created_at,
        }))
        .sort((a, b) => new Date(b.start_at || 0) - new Date(a.start_at || 0));
      setAttHistoryRows(formatted);
    } catch {
      toast("فشل تحميل سجل الحضور", "danger");
    } finally {
      setAttHistoryLoading(false);
    }
  }

  async function fetchPkgHistory(pRow) {
    setHistoryEnrollment(pRow);
    setOpenPkgHistory(true);
    setPkgHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("course_packages")
        .select("*")
        .eq("child_id", pRow.child_id)
        .eq("course_id", summary.template_id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPkgHistoryRows(data || []);
    } catch {
      toast("فشل تحميل سجل الباقات", "danger");
    } finally {
      setPkgHistoryLoading(false);
    }
  }

  async function savePkgEdit() {
    setEditPkgSaving(true);
    try {
      const { error } = await supabase.rpc("edit_course_package", {
        p_package_id: editPkgData.id,
        p_enrollment_id: historyEnrollment.enrollment_id,
        p_new_price: Number(editPkgData.price_total),
        p_new_sessions: Number(editPkgData.sessions_total),
      });
      if (error) throw error;

      if (editPkgData.created_at) {
        await supabase
          .from("course_packages")
          .update({
            created_at: updateDateKeepTime(editPkgData.created_at),
          })
          .eq("id", editPkgData.id);
      }

      toast("تم التعديل", "ok");

      setOpenEditPkg(false);
      fetchPkgHistory(historyEnrollment);
      loadFixed();
    } catch {
      toast("فشل التعديل. تأكد من إضافة دالة الـ SQL أولاً.", "danger");
    } finally {
      setEditPkgSaving(false);
    }
  }

  async function doAdjustPackageTotal(packageId, delta) {
    try {
      const { data: pkg } = await supabase
        .from("course_packages")
        .select("sessions_total")
        .eq("id", packageId)
        .single();
      const newTotal = Math.max(
        0,
        Number(pkg?.sessions_total || 0) + Number(delta),
      );

      const u = await supabase
        .from("course_packages")
        .update({ sessions_total: newTotal })
        .eq("id", packageId);
      if (u.error) throw u.error;

      toast(
        delta > 0
          ? `تم إضافة ${Math.abs(delta)} جلسة.`
          : `تم خصم ${Math.abs(delta)} جلسة.`,
        "ok",
      );
      await loadFixed();
    } catch (e) {
      console.error(e);
      toast("فشل التعديل.", "danger");
    }
  }

  function resetExpenseForm() {
    setExpenseEditId(null);
    setExpDate(isoDate(new Date()));
    setExpAmount("");
    setExpCategory("");
    setExpParty("");
    setExpDesc("");
  }

  function openAddExpense() {
    resetExpenseForm();
    setOpenExpenseModal(true);
  }

  function openEditExpense(row) {
    setExpenseEditId(row.id);
    setExpDate(row.spent_on ? String(row.spent_on) : isoDate(new Date()));
    setExpAmount(String(row.amount ?? ""));
    setExpCategory(String(row.category ?? ""));
    setExpParty(String(row.party ?? ""));
    setExpDesc(String(row.description ?? ""));
    setOpenExpenseModal(true);
  }

  async function saveExpense() {
    if (!expAmount) {
      toast("يرجى إدخال المبلغ.", "warn");
      return;
    }
    setExpSaving(true);
    try {
      const payload = {
        run_id: Number(runId),
        spent_on: expDate || isoDate(new Date()),
        amount: Number(expAmount),
        category: expCategory.trim() || null,
        party: expParty.trim() || null,
        description: expDesc.trim() || null,
      };

      if (expenseEditId) {
        const { error } = await supabase
          .from("expenses")
          .update(payload)
          .eq("id", expenseEditId);
        if (error) throw error;
        toast("تم تعديل المصروف بنجاح", "ok");
      } else {
        const { error } = await supabase.from("expenses").insert([payload]);
        if (error) throw error;
        toast("تم إضافة المصروف بنجاح", "ok");
      }

      setOpenExpenseModal(false);
      resetExpenseForm();
      await loadFixed();
    } catch (e) {
      console.error("Error saving expense:", e);
      toast("حدث خطأ أثناء حفظ المصروف", "danger");
    } finally {
      setExpSaving(false);
    }
  }

  async function deleteExpense(id) {
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
      toast("تم حذف المصروف بنجاح", "ok");
      await loadFixed();
    } catch (e) {
      console.error("Error deleting expense:", e);
      toast("حدث خطأ أثناء حذف المصروف", "danger");
    }
  }

  // --- EARLY RETURNS ---
  if (loading)
    return (
      <div className="page page--runs" dir="rtl">
        <div className="container runDetails">
          <div className="card">جاري التحميل...</div>
        </div>
      </div>
    );
  if (!summary)
    return (
      <div className="page page--runs" dir="rtl">
        <div className="container runDetails">
          <div className="card">لم يتم العثور على الدورة.</div>
        </div>
      </div>
    );

  // --- Helpers for Step 2 ---
  const selectedChildrenForStep2 = bulkCandidates.filter(
    (c) => bulkSelected[String(c.id)],
  );

  // --- MAIN RETURN ---
  return (
    <div
      className="page page--runs page--run-details"
      dir="rtl"
      lang="ar"
      style={{
        background:
          "linear-gradient(180deg, rgba(0,172,71,0.06) 0%, rgba(255,255,255,0) 320px)",
      }}
    >
      <style>{RUN_DETAILS_SOFT_UI_STYLES}</style>
      <div className="container runDetails">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div
              className="runHeroTitle"
              style={{
                margin: 0,
                padding: "10px 24px",
                borderRadius: "999px",
                background: "#fff",
                fontSize: "24px",
                fontWeight: 900,
              }}
            >
              {runHeaderTitle}
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <span
                className="heroMiniChip"
                style={{
                  borderRadius: "999px",
                  padding: "8px 16px",
                  fontWeight: 800,
                  fontSize: 14,
                  border: "none",
                  background: "#fff",
                }}
              >
                <Clock
                  size={16}
                  className="ico"
                  style={{ marginLeft: 6, color: "#000" }}
                />
                <span className="ltrIso">{scheduleInfo.timeRange}</span>{" "}
                {scheduleInfo.weekday}
              </span>
              <span
                className="heroMiniChip"
                style={{
                  borderRadius: "999px",
                  padding: "8px 16px",
                  fontWeight: 800,
                  fontSize: 14,
                  border: "none",
                  background: "#fff",
                }}
              >
                <Users
                  size={16}
                  className="ico"
                  style={{ marginLeft: 6, color: "#000" }}
                />
                {fmtNum(totals.activeCount)}
              </span>
              <span
                className="heroMiniChip"
                style={{
                  borderRadius: "999px",
                  padding: "8px 16px",
                  fontWeight: 800,
                  fontSize: 14,
                  border: "none",
                  background: "#fff",
                }}
              >
                <CalendarDays
                  size={16}
                  className="ico"
                  style={{ marginLeft: 6, color: "#000" }}
                />
                {fmtNum(summary.sessions_count)}
              </span>
            </div>
          </div>

          <div className="run-header-actions">
            <button
              type="button"
              className="btn"
              style={{
                borderRadius: "999px",
                background: "#fff",
                border: "none",
                fontWeight: "bold",
                padding: "8px 24px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              }}
              onClick={() => navigate(`/courses/${summary.template_id}`)}
            >
              {summary.title || "رجوع"}
            </button>
          </div>
        </div>

        {error ? <ErrorBanner error={error} /> : null}

        <div className="summaryGridSoft">
          <div className="card summaryCardSoft is-agreed">
            <div className="summaryCardTop">
              <span className="summaryLabel">المتفق عليه</span>
              <span className="summaryIcon" aria-hidden="true">
                <Tag size={18} />
              </span>
            </div>
            <div className="summaryValue">
              <span className="ltrIso">{fmtILS(totals.agreed, 2)}</span>
            </div>
            <div className="summaryNote">إجمالي المبلغ المتفق عليه.</div>
          </div>
          <div className="card summaryCardSoft is-paid">
            <div className="summaryCardTop">
              <span className="summaryLabel">المدفوع</span>
              <span className="summaryIcon" aria-hidden="true">
                <CreditCard size={18} />
              </span>
            </div>
            <div className="summaryValue">
              <span className="ltrIso">{fmtILS(totals.paid, 2)}</span>
            </div>
            <div className="summaryNote">
              نسبة الدفع الحالية{" "}
              <b className="ltrIso">
                {fmtNum((totals.paidRatio * 100).toFixed(0))}%
              </b>
            </div>
          </div>
          <div className="card summaryCardSoft is-expenses">
            <div className="summaryCardTop">
              <span className="summaryLabel">المصاريف</span>
              <span className="summaryIcon" aria-hidden="true">
                <Receipt size={18} />
              </span>
            </div>
            <div className="summaryValue">
              <span className="ltrIso">{fmtILS(runExpensesTotal, 2)}</span>
            </div>
            <div className="summaryNote">
              {expFeatureAvailable
                ? `عدد العمليات ${fmtNum(expenses.length)}`
                : "ميزة المصاريف غير مفعّلة"}
            </div>
          </div>
          <div
            className={`card summaryCardSoft is-balance ${totals.balance <= 0 ? "is-good" : ""}`}
          >
            <div className="summaryCardTop">
              <span className="summaryLabel">المتبقي</span>
              <span className="summaryIcon" aria-hidden="true">
                <Hourglass size={18} />
              </span>
            </div>
            <div className="summaryValue">
              <span className="ltrIso">{fmtILS(totals.balance, 2)}</span>
            </div>
            <div className="summaryNote">
              الصافي بعد المصاريف{" "}
              <b className="ltrIso">
                {fmtILS(totals.paid - runExpensesTotal, 0)}
              </b>
            </div>
          </div>
        </div>

        <div className="tabs" style={{ marginBottom: 10 }}>
          <button
            type="button"
            className={`tab ${tab === "participants" ? "active" : ""}`}
            onClick={() => setTab("participants")}
          >
            الأطفال
          </button>
          <button
            type="button"
            className={`tab ${tab === "sessions" ? "active" : ""}`}
            onClick={() => setTab("sessions")}
          >
            الجلسات
          </button>
          <button
            type="button"
            className={`tab ${tab === "payments" ? "active" : ""}`}
            onClick={() => setTab("payments")}
          >
            المدفوعات
          </button>
          <button
            type="button"
            className={`tab ${tab === "expenses" ? "active" : ""}`}
            onClick={() => setTab("expenses")}
          >
            المصاريف
          </button>
        </div>

        {tab === "participants" && (
          <div className="card pCard-wrapper">
            <div
              className="pToolbar"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div className="pTitle">
                <h2>الأطفال</h2>
                <div className="muted small">
                  {participantsFiltered.length} من {participants.length}
                </div>
              </div>

              <div
                className="pControls"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  flex: "1 1 640px",
                  minWidth: 320,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "nowrap",
                    alignItems: "center",
                    width: "100%",
                    overflowX: "auto",
                  }}
                  className="pControls-filters"
                >
                  <div
                    style={{
                      position: "relative",
                      flex: "1 1 0px",
                      minWidth: 0,
                    }}
                  >
                    <Search
                      size={16}
                      style={{
                        position: "absolute",
                        left: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                        opacity: 0.7,
                      }}
                    />
                    <input
                      className="input"
                      value={childSearch}
                      onChange={(e) => setChildSearch(e.target.value)}
                      placeholder="ابحث عن طفل..."
                      style={{ width: "100%", paddingLeft: 38 }}
                    />
                  </div>
                  <div style={{ minWidth: 130 }}>
                    <ModernSelect
                      value={childStatusFilter}
                      onChange={setChildStatusFilter}
                      options={[
                        { value: "all", label: "الكل" },
                        { value: "active", label: "نشط" },
                        { value: "inactive", label: "غير نشط" },
                      ]}
                    />
                  </div>
                  <div style={{ minWidth: 200 }}>
                    <ModernSelect
                      value={childSort}
                      onChange={setChildSort}
                      options={[
                        { value: "balance_desc", label: "المتبقي: من الأعلى للأقل" },
                        { value: "balance_asc", label: "المتبقي: من الأقل للأعلى" },
                        { value: "name_asc", label: "الاسم: أ-ي" },
                        { value: "name_desc", label: "الاسم: ي-أ" },
                      ]}
                    />
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    className="btn tab-add-btn"
                    onClick={openBulkModal}
                  >
                    + إضافة طفل للدورة
                  </button>
                  <button
                    type="button"
                    className="btn primary tab-add-btn"
                    onClick={openCreateEnroll}
                  >
                    <Plus size={16} /> إضافة وتسجيل
                  </button>
                </div>
              </div>
            </div>

            <hr className="sep" />

            {participantsFiltered.length === 0 ? (
              <div className="muted">لا يوجد عناصر.</div>
            ) : (
              <div
                className="pGrid"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 16,
                  alignItems: "stretch",
                  justifyContent: "flex-start",
                }}
              >
                {participantsFiltered.map((p) => {
                  const agreed = Number(p.agreed_price || 0);
                  const paid = Number(p.paid_amount || 0);
                  const balance = Number(p.balance || 0);
                  const attended = Number(p.sessions_attended_in_run || 0);
                  const pkgRemain = Number(p.package_sessions_remaining || 0);
                  const pct =
                    agreed > 0 ? clamp((paid / agreed) * 100, 0, 100) : 0;
                  const status = p.payment_status || "free";
                  const barClass =
                    status === "paid"
                      ? "pBar pBarPaid"
                      : status === "partial"
                        ? "pBar pBarPartial"
                        : status === "unpaid"
                          ? "pBar pBarUnpaid"
                          : "pBar pBarFree";
                  let balClass = "stat-gray";
                  if (agreed === 0 || balance <= 0) balClass = "stat-green";
                  else if (paid > 0) balClass = "stat-yellow";
                  else balClass = "stat-red";

                  return (
                    <div
                      key={p.enrollment_id}
                      className="pCard participantList__item"
                      style={{
                        width: 380,
                        maxWidth: "100%",
                        cursor: "pointer",
                      }}
                      onClick={() => openإدارةFor(p)}
                    >
                      <div className="pHead" style={{ marginBottom: "20px" }}>
                        <div style={{ minWidth: 0 }}>
                          <div className="pName participantList__name">
                            {p.child_name}
                          </div>
                          <div className="pMeta">
                            <span className="metaItem" title="الصف">
                              <GraduationCap size={14} className="ico" />
                              <span>{p.class ?? "-"}</span>
                            </span>
                            <span className="metaItem" title="العمر">
                              <Cake size={14} className="ico" />
                              <span className="ltrIso">
                                {p.age == null ? "—" : fmtNum(p.age)}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pQuickStats">
                        <div
                          className={`pStatBlock ${balClass} participantList__balance`}
                        >
                          <div className="pStatLabel">
                            <Hourglass size={14} />
                            <span className="participantList__balance-label">
                              المتبقي
                            </span>
                          </div>
                          <div
                            className="pStatValue ltrIso participantList__balance-value"
                            dir="ltr"
                          >
                            {fmtILS(balance)}
                          </div>
                        </div>
                        <div className="pStatBlock">
                          <div className="pStatLabel">
                            <CreditCard size={14} />
                            <span>المدفوع</span>
                          </div>
                          <div className="pStatValue ltrIso" dir="ltr">
                            {fmtILS(paid)}
                          </div>
                        </div>
                        <div
                          className={`pStatBlock ${pkgRemain < 0 ? "stat-red" : ""}`}
                        >
                          <div className="pStatLabel">
                            <Ticket size={14} />
                            <span
                              style={pkgRemain < 0 ? { color: "#dc2626" } : {}}
                            >
                              رصيد الجلسات
                            </span>
                          </div>
                          <div
                            className="pStatValue ltrIso"
                            dir="ltr"
                            style={pkgRemain < 0 ? { color: "#dc2626" } : {}}
                          >
                            {fmtNum(pkgRemain)}
                          </div>
                        </div>
                        <div className="pStatBlock">
                          <div className="pStatLabel">
                            <CalendarDays size={14} />
                            <span>حضر</span>
                          </div>
                          <div className="pStatValue ltrIso" dir="ltr">
                            {fmtNum(attended)}
                          </div>
                        </div>
                      </div>

                      <div className="pProgressWrap">
                        <div className="pProgressHead">
                          <span className="muted">
                            المتفق عليه:{" "}
                            <b
                              style={{ color: "#0f172a", fontSize: "15px" }}
                              className="ltrIso"
                            >
                              {fmtILS(agreed)}
                            </b>
                          </span>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <span className="muted">نسبة الدفع</span>
                            <b className="ltrIso" style={{ fontSize: "15px" }}>
                              {fmtNum(pct.toFixed(0))}%
                            </b>
                          </div>
                        </div>
                        <div className={barClass} aria-hidden="true">
                          <span style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "sessions" && (
          <div className="grid">
            <div className="card" style={{ gridColumn: "span 4" }}>
              <div className="h1">إعداد الجلسات</div>
              <div className="muted" style={{ marginTop: 6 }}>
                حدد التكرار ثم أنشئ قائمة الجلسات. الأوقات حسب توقيتك المحلي.
              </div>
              <hr className="sep" />
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <div className="muted">أول جلسة</div>
                  <input
                    className="input"
                    type="datetime-local"
                    value={firstStart}
                    onChange={(e) => setFirstStart(e.target.value)}
                  />
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "grid", gap: 6 }}>
                    <div className="muted">المدة (د)</div>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                    />
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    <div className="muted">العدد</div>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      value={count}
                      onChange={(e) => setCount(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <div className="muted">التكرار كل (أيام)</div>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={intervalDays}
                    onChange={(e) => setIntervalDays(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="btn primary tab-add-btn"
                  disabled={genLoading || !firstStart}
                  onClick={generateSessions}
                >
                  {genLoading ? "جاري الإنشاء..." : "إنشاء الجلسات"}
                </button>
                <hr className="sep" />
                <button
                  type="button"
                  className="btn tab-add-btn"
                  onClick={openCreateSession}
                >
                  <Plus size={16} /> إضافة جلسة واحدة
                </button>
              </div>
            </div>

            <div className="card" style={{ gridColumn: "span 8" }}>
              {!sessions?.length ? (
                <>
                  <div className="h1">قائمة الجلسات</div>
                  <hr className="sep" />
                  <div className="muted">لا توجد جلسات بعد.</div>
                </>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 20 }}
                >
                  {/* زر عرض الجلسات السابقة */}
                  {pastSessions.length > 0 && (
                    <div>
                      <button
                        className="btn tab-add-btn"
                        style={{
                          width: "100%",
                          minHeight: 54,
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          gap: 10,
                          fontSize: 16,
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          color: "#475569",
                        }}
                        onClick={() => navigate(`/runs/${runId}/past-sessions`)}
                      >
                        <History size={20} />
                        عرض الجلسات السابقة ({pastSessions.length})
                      </button>
                    </div>
                  )}

                  {/* الجلسات القادمة والحالية */}
                  <div>
                    <h2 className="sectionHeader" style={{ color: "#00ac47" }}>
                      <CalendarClock size={20} /> الجلسات
                    </h2>
                    {upcomingSessions.length === 0 ? (
                      <div className="muted" style={{ padding: "10px 0" }}>
                        لا يوجد جلسات حالية أو قادمة.
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                        }}
                      >
                        {upcomingSessions.map((s) => {
                          let rowBg = "#fff";
                          let rowBorder = "1px solid rgba(15, 23, 42, 0.08)";

                          if (s.status === "done") {
                            rowBg = "rgba(0, 172, 71, 0.08)";
                            rowBorder = "1px solid rgba(0, 172, 71, 0.25)";
                          } else if (s.status === "canceled") {
                            rowBg = "rgba(239, 68, 68, 0.06)";
                            rowBorder = "1px solid rgba(239, 68, 68, 0.25)";
                          } else {
                            rowBg = "rgba(14, 165, 233, 0.06)";
                            rowBorder = "1px solid rgba(14, 165, 233, 0.25)";
                          }

                          return (
                            <div
                              key={s.id}
                              className="sessionRow sessionList__item"
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "minmax(120px, 1fr) minmax(140px, 1fr) auto",
                                gap: 12,
                                padding: "12px 14px",
                                alignItems: "center",
                                background: rowBg,
                                border: rowBorder,
                                borderRight:
                                  s.status === "done"
                                    ? "4px solid #00ac47"
                                    : s.status === "canceled"
                                      ? "4px solid #ef4444"
                                      : "4px solid #0ea5e9",
                              }}
                            >
                              <div className="sessionList__time">
                                <div style={{ fontWeight: 700 }}>
                                  {fmtDate(s.start_at)}
                                </div>
                                <div className="muted">
                                  {fmtWeekday(s.start_at)}
                                </div>
                              </div>
                              <div className="sessionList__main">
                                <div style={{ fontWeight: 600 }}>
                                  <span dir="ltr">
                                    {fmtTimeHM(s.start_at)} →{" "}
                                    {fmtTimeHM(s.end_at)}
                                  </span>
                                </div>
                              </div>

                              <div className="session-actions-desktop">
                                <button
                                  className="btn primary"
                                  title="تسجيل الحضور"
                                  onClick={() =>
                                    navigate(`/sessions/${s.id}/attendance`)
                                  }
                                >
                                  <Settings2 size={16} /> <span>الحضور</span>
                                </button>
                                <button
                                  className="btn"
                                  title="تعديل الجلسة"
                                  onClick={() => openEditSession(s)}
                                >
                                  <Pencil size={16} />
                                </button>
                                {s.status === "scheduled" && (
                                  <>
                                    <button
                                      className="btn"
                                      title="إنهاء الجلسة"
                                      onClick={() =>
                                        setSessionStatus(s.id, "done")
                                      }
                                    >
                                      <CheckCircle2 size={16} />
                                    </button>
                                    <button
                                      className="btn danger"
                                      title="إلغاء الجلسة"
                                      onClick={() =>
                                        setSessionStatus(s.id, "canceled")
                                      }
                                    >
                                      <XCircle size={16} />
                                    </button>
                                  </>
                                )}
                                <button
                                  className="btn danger iconOnly"
                                  title="حذف الجلسة"
                                  onClick={() =>
                                    setConfirm({
                                      open: true,
                                      type: "deleteSession",
                                      id: s.id,
                                      text: "هل تريد حذف هذه الجلسة؟",
                                    })
                                  }
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "payments" && (
          <div className="grid">
            <div className="card" style={{ gridColumn: "span 12" }}>
              <div className="row space">
                <div>
                  <div className="h1">المدفوعات</div>
                </div>
                <button
                  type="button"
                  className="btn primary tab-add-btn"
                  onClick={openNewPaymentModal}
                >
                  + إضافة دفعة
                </button>
              </div>
              <hr className="sep" />
              {payments.length === 0 ? (
                <div className="muted">لا يوجد عناصر.</div>
              ) : (
                <>
                  <div className="tableWrap inCard desktop-only">
                    <table className="table modal-compact-table">
                      <thead>
                        <tr>
                          <th>الطفل</th>
                          <th>المبلغ (₪)</th>
                          <th>الطريقة</th>
                          <th>التاريخ</th>
                          <th>ملاحظة</th>
                          <th style={{ textAlign: "center" }}>الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p) => (
                          <tr key={p.id}>
                            <td style={{ fontWeight: 800 }}>{p.child_name}</td>
                            <td style={{ fontWeight: 900, color: "#0f172a" }}>
                              <span dir="ltr">
                                {Number(p.amount).toFixed(2)}
                              </span>
                            </td>
                            <td className="muted">
                              <Badge variant="default">
                                {paymentMethodLabel(p.method)}
                              </Badge>
                            </td>
                            <td className="muted">{fmtDate(p.created_at)}</td>
                            <td className="muted">{p.note ?? "-"}</td>
                            <td style={{ textAlign: "center" }}>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "8px",
                                  justifyContent: "center",
                                  alignItems: "center",
                                }}
                              >
                                <button
                                  className="btn iconOnly"
                                  onClick={() => openEditPayment(p)}
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  className="btn danger iconOnly"
                                  onClick={() =>
                                    setConfirm({
                                      open: true,
                                      type: "deletePayment",
                                      id: p.id,
                                      text: "حذف دفعة",
                                    })
                                  }
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile view for Payments */}
                  <div className="mobile-only">
                    {payments.map((p) => (
                      <div
                        key={p.id}
                        className="mobile-card"
                        style={{ borderRight: "4px solid #16a34a" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <strong style={{ fontSize: 16 }}>
                            {p.child_name}
                          </strong>
                          <span
                            style={{
                              fontWeight: 900,
                              color: "#16a34a",
                              fontSize: 16,
                            }}
                            dir="ltr"
                          >
                            {Number(p.amount).toFixed(2)} ₪
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: 13,
                            color: "#64748b",
                          }}
                        >
                          <span>
                            <Badge variant="neutral">
                              {paymentMethodLabel(p.method)}
                            </Badge>
                          </span>
                          <span>{fmtDate(p.created_at)}</span>
                        </div>
                        {p.note && (
                          <div style={{ fontSize: 13, color: "#64748b" }}>
                            {p.note}
                          </div>
                        )}
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            justifyContent: "flex-end",
                            marginTop: 8,
                            borderTop: "1px solid #f1f5f9",
                            paddingTop: 8,
                          }}
                        >
                          <button
                            className="btn iconOnly"
                            onClick={() => openEditPayment(p)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="btn danger iconOnly"
                            onClick={() =>
                              setConfirm({
                                open: true,
                                type: "deletePayment",
                                id: p.id,
                                text: "حذف دفعة",
                              })
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {tab === "expenses" && (
          <div className="card">
            <div className="row space">
              <h2 style={{ marginBottom: 4 }}>المصاريف</h2>
              <button
                type="button"
                className="btn primary tab-add-btn"
                onClick={openAddExpense}
              >
                + إضافة مصروف
              </button>
            </div>
            {!expFeatureAvailable ? (
              <div style={{ marginTop: 14 }} className="muted">
                ميزة ربط المصاريف بالـ Run غير مفعّلة بعد.
              </div>
            ) : (
              <>
                <div
                  className="grid tab-expenses-summary"
                  style={{ marginTop: 14, marginBottom: 12 }}
                >
                  <div className="card" style={{ gridColumn: "span 4" }}>
                    <div className="muted">المجموع</div>
                    <div style={{ fontSize: 22, fontWeight: 900 }}>
                      <span className="ltrIso">
                        {fmtILS(runExpensesTotal, 2)}
                      </span>
                    </div>
                  </div>
                  <div className="card" style={{ gridColumn: "span 4" }}>
                    <div className="muted">عدد المصاريف</div>
                    <div style={{ fontSize: 22, fontWeight: 900 }}>
                      <span className="ltrIso">{fmtNum(expenses.length)}</span>
                    </div>
                  </div>
                  <div className="card" style={{ gridColumn: "span 4" }}>
                    <div className="muted">الصافي</div>
                    <div style={{ fontSize: 22, fontWeight: 900 }}>
                      <span className="ltrIso">
                        {fmtILS(totals.paid - runExpensesTotal, 2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className="pControls pControls-filters"
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "nowrap",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      flex: "1 1 0px",
                      minWidth: 220,
                    }}
                  >
                    <Search
                      size={16}
                      style={{
                        position: "absolute",
                        left: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                        opacity: 0.7,
                      }}
                    />
                    <input
                      className="input"
                      value={expQ}
                      onChange={(e) => setExpQ(e.target.value)}
                      placeholder="ابحث..."
                      style={{ width: "100%", paddingLeft: 38 }}
                    />
                  </div>
                  <div style={{ width: 220, minWidth: 170 }}>
                    <ModernSelect
                      value={expCatFilter}
                      onChange={setExpCatFilter}
                      options={[
                        { value: "all", label: "كل التصنيفات" },
                        ...expCategories.map((x) => ({ value: x, label: x })),
                      ]}
                    />
                  </div>
                  <div style={{ width: 220, minWidth: 170 }}>
                    <ModernSelect
                      value={expPartyFilter}
                      onChange={setExpPartyFilter}
                      options={[
                        { value: "all", label: "كل الأشخاص" },
                        ...expParties.map((x) => ({ value: x, label: x })),
                      ]}
                    />
                  </div>
                </div>

                <div style={{ height: 10 }} />

                {expensesFiltered.length === 0 ? (
                  <div className="muted">ما في مصاريف.</div>
                ) : (
                  <>
                    <div className="tableWrap inCard desktop-only">
                      <table className="table modal-compact-table">
                        <thead>
                          <tr>
                            <th style={{ width: 140 }}>التاريخ</th>
                            <th>التصنيف</th>
                            <th style={{ width: 180 }}>الشخص</th>
                            <th>الوصف</th>
                            <th style={{ width: 140 }}>المبلغ</th>
                            <th style={{ textAlign: "center" }}>الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expensesFiltered.map((r) => (
                            <tr key={r.id}>
                              <td className="muted">
                                <span className="ltrIso">
                                  {fmtDate(r.spent_on)}
                                </span>
                              </td>
                              <td style={{ fontWeight: 800 }}>
                                {r.category || "—"}
                              </td>
                              <td className="muted">{r.party || "—"}</td>
                              <td className="muted">{r.description || "—"}</td>
                              <td style={{ fontWeight: 900, color: "#0f172a" }}>
                                <span dir="ltr">{fmtILS(r.amount, 2)}</span>
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <div
                                  className="tableActions"
                                  style={{
                                    display: "flex",
                                    gap: "8px",
                                    justifyContent: "center",
                                    alignItems: "center",
                                  }}
                                >
                                  <IconButton
                                    title="تعديل"
                                    onClick={() => openEditExpense(r)}
                                  >
                                    <Pencil size={16} />
                                  </IconButton>
                                  <IconButton
                                    title="حذف"
                                    danger
                                    onClick={() =>
                                      setConfirm({
                                        open: true,
                                        type: "deleteExpense",
                                        id: r.id,
                                        text: "هل تريد حذف هذا المصروف؟",
                                      })
                                    }
                                  >
                                    <Trash2 size={16} />
                                  </IconButton>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile view for Expenses */}
                    <div className="mobile-only">
                      {expensesFiltered.map((r) => (
                        <div
                          key={r.id}
                          className="mobile-card"
                          style={{ borderRight: "4px solid #ef4444" }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <strong style={{ fontSize: 16 }}>
                              {r.category || "—"}
                            </strong>
                            <span
                              style={{
                                fontWeight: 900,
                                color: "#0f172a",
                                fontSize: 16,
                              }}
                              dir="ltr"
                            >
                              {fmtILS(r.amount, 2)}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              fontSize: 13,
                              color: "#64748b",
                            }}
                          >
                            <span>{r.party || "—"}</span>
                            <span className="ltrIso">
                              {fmtDate(r.spent_on)}
                            </span>
                          </div>
                          {r.description && (
                            <div style={{ fontSize: 13, color: "#64748b" }}>
                              {r.description}
                            </div>
                          )}
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              justifyContent: "flex-end",
                              marginTop: 8,
                              borderTop: "1px solid #f1f5f9",
                              paddingTop: 8,
                            }}
                          >
                            <button
                              className="btn iconOnly"
                              onClick={() => openEditExpense(r)}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              className="btn danger iconOnly"
                              onClick={() =>
                                setConfirm({
                                  open: true,
                                  type: "deleteExpense",
                                  id: r.id,
                                  text: "هل تريد حذف هذا المصروف؟",
                                })
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------------------------------------ */}
        {/* نافذة إدارة الطالب */}
        {/* ------------------------------------------------------------------------------------------------ */}
        <Modal open={openإدارة} title="" onClose={() => setOpenإدارة(false)}>
          {!manageP ? (
            <div className="muted">—</div>
          ) : (
            <div style={{ padding: "8px 0" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 24,
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: 24,
                      fontWeight: 900,
                      marginBottom: 8,
                      color: "#0f172a",
                    }}
                  >
                    {manageP.child_name}
                  </h2>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <Badge
                      variant={
                        manageP.enrollment_status === "active" ? "ok" : "warn"
                      }
                    >
                      {manageP.enrollment_status === "active"
                        ? "نشط"
                        : "غير نشط"}
                    </Badge>
                    {manageP.is_free && <Badge variant="info">مجاني</Badge>}
                  </div>
                </div>
                <IconButton
                  icon={<ExternalLink size={18} />}
                  onClick={() => navigate(`/children/${manageP.child_id}`)}
                  title="ملف الطالب"
                  variant="ghost"
                />
              </div>

              <div
                className="summaryGridSoft modal-stats"
                style={{
                  background: "#f8fafc",
                  padding: "20px",
                  borderRadius: "20px",
                  marginBottom: 32,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#64748b",
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    المتفق عليه
                  </div>
                  <div
                    style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}
                    className="ltrIso"
                  >
                    {fmtILS(manageP.agreed_price)}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#64748b",
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    المدفوع
                  </div>
                  <div
                    style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}
                    className="ltrIso"
                  >
                    {fmtILS(manageP.paid_amount)}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#64748b",
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    المتبقي
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 900,
                      color: manageP.balance <= 0 ? "#16a34a" : "#dc2626",
                    }}
                    className="ltrIso"
                  >
                    {fmtILS(manageP.balance)}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#64748b",
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    الباقة (حصة)
                  </div>
                  <div
                    style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}
                    className="ltrIso"
                  >
                    {fmtNum(manageP.package_sessions_total)}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#64748b",
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    الرصيد المتبقي
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 900,
                      color:
                        manageP.package_sessions_remaining < 0
                          ? "#dc2626"
                          : "#0f172a",
                    }}
                    className="ltrIso"
                  >
                    {fmtNum(manageP.package_sessions_remaining)}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#64748b",
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    حضر بالدورة
                  </div>
                  <div
                    style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}
                    className="ltrIso"
                  >
                    {fmtNum(manageP.sessions_attended_in_run)}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 32,
                  marginBottom: 32,
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: "#334155",
                      marginBottom: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <CreditCard size={18} style={{ color: "#16a34a" }} />{" "}
                    الإدارة المالية
                  </h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(90px, 1fr))",
                      gap: 12,
                    }}
                  >
                    <button
                      className="actionSquare"
                      disabled={Number(manageP.balance || 0) <= 0}
                      onClick={() => {
                        const currentP = manageP;
                        if (!currentP) return;
                        setOpenإدارة(false);
                        setShouldReopenManage(true);
                        setTimeout(() => {
                          openPaymentModalFor(currentP, "remaining");
                        }, 150);
                      }}
                    >
                      <Banknote
                        size={26}
                        style={{
                          color:
                            Number(manageP.balance || 0) > 0
                              ? "#16a34a"
                              : "#94a3b8",
                        }}
                      />
                      <span>دفع المتبقي</span>
                    </button>
                    <button
                      className="actionSquare"
                      onClick={() => {
                        const currentP = manageP;
                        if (!currentP) return;
                        setOpenإدارة(false);
                        setShouldReopenManage(true);
                        setTimeout(() => {
                          openPaymentModalFor(currentP, "custom");
                        }, 150);
                      }}
                    >
                      <PlusCircle size={26} style={{ color: "#16a34a" }} />
                      <span>إضافة دفعة</span>
                    </button>
                    <button
                      className="actionSquare"
                      onClick={() => {
                        const currentP = manageP;
                        if (!currentP) return;
                        setOpenإدارة(false);
                        setShouldReopenManage(true);
                        setTimeout(() => {
                          openPaymentHistory(currentP);
                        }, 150);
                      }}
                    >
                      <History size={26} style={{ color: "#475569" }} />
                      <span>سجل الدفعات</span>
                    </button>
                  </div>
                </div>

                <div>
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: "#334155",
                      marginBottom: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Ticket size={18} style={{ color: "#7a5cff" }} /> الجلسات
                    والحساب
                  </h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(90px, 1fr))",
                      gap: 12,
                    }}
                  >
                    <button
                      className="actionSquare"
                      disabled={
                        Number(manageP?.package_sessions_remaining ?? 0) > 0
                      }
                      title={
                        Number(manageP?.package_sessions_remaining ?? 0) > 0
                          ? "الطفل لديه رصيد جلسات متبقٍ"
                          : ""
                      }
                      onClick={() => {
                        const currentP = manageP;
                        if (!currentP) return;
                        setOpenإدارة(false);
                        setShouldReopenManage(true);
                        setTimeout(() => {
                          openSingleTopup(currentP);
                        }, 150);
                      }}
                    >
                      <ShoppingCart size={26} style={{ color: "#7a5cff" }} />
                      <span>شراء جلسات</span>
                    </button>
                    <button
                      className="actionSquare"
                      onClick={() => {
                        const currentP = manageP;
                        if (!currentP) return;
                        setOpenإدارة(false);
                        setShouldReopenManage(true);
                        setTimeout(() => {
                          fetchPkgHistory(currentP);
                        }, 150);
                      }}
                    >
                      <List size={26} style={{ color: "#475569" }} />
                      <span>سجل الباقات</span>
                    </button>
                    <button
                      className="actionSquare"
                      onClick={() => {
                        const currentP = manageP;
                        if (!currentP) return;
                        setOpenإدارة(false);
                        setShouldReopenManage(true);
                        setTimeout(() => {
                          fetchAttHistory(currentP);
                        }, 150);
                      }}
                    >
                      <CalendarCheck size={26} style={{ color: "#475569" }} />
                      <span>سجل الحضور</span>
                    </button>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  flexWrap: "wrap",
                  gap: 20,
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: 20,
                }}
              >
                <div style={{ display: "flex", gap: 10 }}>
                  <IconButton
                    title="حذف التسجيل"
                    danger
                    disabled={manageHasPayments}
                    variant="ghost"
                    onClick={() => {
                      if (manageHasPayments) {
                        toast("لا يمكن حذفه لوجود دفعات مسجلة.", "warn");
                        return;
                      }
                      setConfirm({
                        open: true,
                        type: "deleteEnroll",
                        id: {
                          enrollmentId: manageP.enrollment_id,
                          childId: manageP.child_id,
                          courseId: summary.template_id,
                        },
                        text: `هل أنت متأكد من حذف الاشتراك نهائياً؟ سيتم حذف كافة باقات هذا الطفل المرتبطة بهذه الدورة.`,
                      });
                    }}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* -------------------- جداول النوافذ المنبثقة (العريضة) -------------------- */}

        <Modal
          open={openPkgHistory}
          title="سجل الباقات"
          onClose={() => closeSubModalAndReopen(setOpenPkgHistory)}
        >
          <div className="modal-wide-1000">
            <div className="muted" style={{ marginBottom: 16 }}>
              {historyEnrollment && `الطالب: ${historyEnrollment.child_name}`}
            </div>
            {pkgHistoryLoading ? (
              <div className="card">جاري التحميل...</div>
            ) : pkgHistoryRows.length === 0 ? (
              <div className="card">لا يوجد باقات.</div>
            ) : (
              <div className="tableWrap inCard">
                <table className="table modal-compact-table">
                  <thead>
                    <tr>
                      <th>تاريخ الشراء</th>
                      <th>عدد الجلسات</th>
                      <th>السعر (₪)</th>
                      <th style={{ textAlign: "center" }}>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pkgHistoryRows.map((pkg) => (
                      <tr key={pkg.id}>
                        <td className="muted">{fmtDate(pkg.created_at)}</td>
                        <td style={{ fontWeight: 800 }}>
                          {pkg.sessions_total}
                        </td>
                        <td
                          style={{
                            fontWeight: 900,
                            color: "#0f172a",
                          }}
                        >
                          <span dir="ltr">
                            {Number(pkg.price_total).toFixed(2)}
                          </span>
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <button
                              className="btn iconOnly"
                              title="تعديل الباقة"
                              onClick={() => {
                                setEditPkgData({
                                  id: pkg.id,
                                  sessions_total: pkg.sessions_total,
                                  price_total: pkg.price_total,
                                  created_at: isoDate(pkg.created_at),
                                });
                                setOpenEditPkg(true);
                              }}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              className="btn danger iconOnly"
                              title="حذف الباقة"
                              onClick={() =>
                                setConfirm({
                                  open: true,
                                  type: "deletePackage",
                                  id: {
                                    packageId: pkg.id,
                                    enrollmentId:
                                      historyEnrollment.enrollment_id,
                                  },
                                  text: "هل أنت متأكد من حذف هذه الباقة؟ سيتم خصم جلساتها من رصيد الطالب.",
                                })
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>

        <Modal
          open={openEditPkg}
          title="تعديل الباقة"
          onClose={() => setOpenEditPkg(false)}
        >
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <div className="muted" style={{ marginBottom: 4 }}>
                عدد الجلسات الكلي للباقة
              </div>
              <input
                className="input"
                type="number"
                min="0"
                value={editPkgData.sessions_total}
                onChange={(e) =>
                  setEditPkgData((p) => ({
                    ...p,
                    sessions_total: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <div className="muted" style={{ marginBottom: 4 }}>
                سعر الباقة الإجمالي (₪)
              </div>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={editPkgData.price_total}
                onChange={(e) =>
                  setEditPkgData((p) => ({
                    ...p,
                    price_total: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <div className="muted" style={{ marginBottom: 4 }}>
                تاريخ الشراء
              </div>
              <input
                className="input"
                type="date"
                value={editPkgData.created_at}
                onChange={(e) =>
                  setEditPkgData((p) => ({
                    ...p,
                    created_at: e.target.value,
                  }))
                }
              />
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <button
                type="button"
                className="btn primary"
                disabled={editPkgSaving}
                onClick={savePkgEdit}
              >
                {editPkgSaving ? "جاري الحفظ..." : "حفظ التعديلات"}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setOpenEditPkg(false)}
              >
                إلغاء
              </button>
            </div>
          </div>
        </Modal>

        <Modal
          open={openAttHistory}
          title="سجل الحضور"
          onClose={() => closeSubModalAndReopen(setOpenAttHistory)}
        >
          <div className="modal-wide-900">
            <div className="muted" style={{ marginBottom: 16 }}>
              {historyEnrollment && `الطالب: ${historyEnrollment.child_name}`}
            </div>
            {attHistoryLoading ? (
              <div className="card">جاري التحميل...</div>
            ) : attHistoryRows.length === 0 ? (
              <div className="card">لا يوجد سجل حضور.</div>
            ) : (
              <div className="tableWrap inCard">
                <table className="table modal-compact-table">
                  <thead>
                    <tr>
                      <th>تاريخ الجلسة</th>
                      <th>الحالة</th>
                      <th>تاريخ التسجيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attHistoryRows.map((att) => {
                      const statusAr =
                        att.status === "present"
                          ? "حاضر"
                          : att.status === "absent"
                            ? "غائب"
                            : "بعذر";
                      const badgeVar =
                        att.status === "present"
                          ? "ok"
                          : att.status === "absent"
                            ? "danger"
                            : "warn";
                      return (
                        <tr key={att.id}>
                          <td style={{ fontWeight: 800 }}>
                            {fmtDT(att.start_at)}
                          </td>
                          <td>
                            <Badge variant={badgeVar}>{statusAr}</Badge>
                          </td>
                          <td className="muted" style={{ fontSize: 12 }}>
                            {fmtDT(att.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>

        <Modal
          open={openHistory}
          title="سجل الدفعات"
          onClose={() => closeSubModalAndReopen(setOpenHistory)}
        >
          <div className="modal-wide-1000">
            <div className="muted" style={{ marginBottom: 10 }}>
              {historyEnrollment
                ? `سجل العمليات لـ: ${historyEnrollment.child_name}`
                : ""}
            </div>
            {historyLoading ? (
              <div className="card">جاري التحميل...</div>
            ) : historyRows.length === 0 ? (
              <div className="card">لا يوجد دفعات.</div>
            ) : (
              <div className="tableWrap inCard">
                <table className="table modal-compact-table">
                  <thead>
                    <tr>
                      <th>المبلغ (₪)</th>
                      <th>الطريقة</th>
                      <th>التاريخ</th>
                      <th>ملاحظة</th>
                      <th style={{ textAlign: "center" }}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map((x) => (
                      <tr key={x.id}>
                        <td
                          style={{
                            fontWeight: 900,
                            color: "#0f172a",
                          }}
                        >
                          <span dir="ltr">{Number(x.amount).toFixed(2)}</span>
                        </td>
                        <td className="muted">
                          <Badge variant="default">
                            {paymentMethodLabel(x.method)}
                          </Badge>
                        </td>
                        <td className="muted">{fmtDate(x.created_at)}</td>
                        <td className="muted">{x.note ?? "-"}</td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <button
                              className="btn iconOnly"
                              title="تعديل الدفعة"
                              onClick={() => {
                                setOpenHistory(false);
                                setShouldReopenManage(true);
                                setTimeout(() => {
                                  openEditPayment(x);
                                }, 50);
                              }}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              className="btn danger iconOnly"
                              onClick={() =>
                                setConfirm({
                                  open: true,
                                  type: "deletePayment",
                                  id: x.id,
                                  text: "حذف دفعة",
                                })
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>

        <Modal
          open={openEnroll}
          title={
            enrollLocked ? `إضافة جلسات — ${enrollLockedName}` : "تسجيل طفل"
          }
          onClose={() => closeSubModalAndReopen(setOpenEnroll)}
        >
          <div className="muted">
            إذا كان الطفل يملك رصيدًا مسبقًا، يمكنك اختيار "استخدام الرصيد
            السابق".
          </div>
          <hr className="sep" />
          <div className="grid">
            <div style={{ gridColumn: "span 12" }}>
              <div className="muted">الطفل</div>
              <ModernSelect
                value={selectedChildId}
                onChange={setSelectedChildId}
                disabled={enrollLocked}
                placeholder="— اختر طفل —"
                options={[
                  { value: "", label: "— اختر طفل —" },
                  ...((enrollLocked ? children : availableChildren) || []).map(
                    (c) => ({
                      value: String(c.id),
                      label: `${c.name} — ${c.class ?? "-"} — العمر: ${c.age ?? "-"}`,
                    }),
                  ),
                ]}
              />
            </div>
            <div style={{ gridColumn: "span 12" }}>
              <div className="muted">طريقة التسجيل</div>
              <ModernSelect
                value={enrollMode}
                onChange={setEnrollMode}
                disabled={enrollLocked}
                options={[
                  { value: "use_existing", label: "استخدام الرصيد السابق" },
                  { value: "buy_new", label: "إضافة جلسات (شراء/شحن)" },
                ]}
              />
            </div>
            {(enrollMode === "buy_new" || enrollLocked) && (
              <>
                <div style={{ gridColumn: "span 4" }}>
                  <div className="muted">الجلسات المضافة</div>
                  <input
                    className="input"
                    type="number"
                    value={buySessions}
                    onChange={(e) => {
                      const v = e.target.value;
                      setBuySessions(v);
                      const s = Number(v);
                      if (buyPriceEditMode === "unit") {
                        const u = Number(buyUnitPrice || 0);
                        if (s > 0 && u > 0)
                          setBuyPriceTotal((s * u).toFixed(2));
                      } else {
                        const t = Number(buyPriceTotal || 0);
                        if (s > 0) setBuyUnitPrice((t / s).toFixed(2));
                      }
                    }}
                  />
                </div>
                <div style={{ gridColumn: "span 4" }}>
                  <div className="muted">سعر الجلسة</div>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={buyUnitPrice}
                    onChange={(e) => {
                      const v = e.target.value;
                      setBuyUnitPrice(v);
                      setBuyPriceEditMode("unit");
                      const s = Number(buySessions || 0);
                      const u = Number(v || 0);
                      if (s > 0) setBuyPriceTotal((s * u).toFixed(2));
                    }}
                  />
                </div>
                <div style={{ gridColumn: "span 4" }}>
                  <div className="muted">المبلغ الإجمالي</div>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={buyPriceTotal}
                    onChange={(e) => {
                      const v = e.target.value;
                      setBuyPriceTotal(v);
                      setBuyPriceEditMode("total");
                      const s = Number(buySessions || 0);
                      const t = Number(v || 0);
                      if (s > 0) setBuyUnitPrice((t / s).toFixed(2));
                    }}
                  />
                </div>
              </>
            )}
            <div className="row" style={{ gridColumn: "span 12" }}>
              <button
                type="button"
                className="btn primary"
                disabled={enrollSaving || !selectedChildId}
                onClick={purchaseAndEnrollSingle}
              >
                {enrollSaving ? " جاري الحفظ..." : "حفظ"}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => closeSubModalAndReopen(setOpenEnroll)}
              >
                إلغاء
              </button>
            </div>
          </div>
        </Modal>

        <Modal
          open={openNewChild}
          title={newChildEnrollNow ? "إضافة طفل وتسجيله" : "إضافة طفل جديد"}
          onClose={() => setOpenNewChild(false)}
        >
          <div className="grid" style={{ gap: "24px", padding: "10px 0" }}>
            {/* معلومات الطفل */}
            <div style={{ gridColumn: "span 12" }}>
              <h4 className="form-section-title">
                <Users size={18} color="#64748b" /> البيانات الأساسية
              </h4>
              <div className="grid">
                <div style={{ gridColumn: "span 12" }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    الاسم *
                  </div>
                  <input
                    className="input"
                    value={newChildForm.name}
                    onChange={(e) =>
                      setNewChildForm((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="مثال: أحمد محمد علي"
                  />
                </div>
                <div style={{ gridColumn: "span 6" }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    العمر *
                  </div>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={120}
                    value={newChildForm.age}
                    onChange={(e) =>
                      setNewChildForm((p) => ({ ...p, age: e.target.value }))
                    }
                    placeholder="بالسنوات"
                  />
                </div>
                <div style={{ gridColumn: "span 6" }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    الجنس
                  </div>
                  <ModernSelect
                    value={newChildForm.gender}
                    onChange={(v) =>
                      setNewChildForm((p) => ({ ...p, gender: v }))
                    }
                    options={[
                      { value: "male", label: "ذكر" },
                      { value: "female", label: "أنثى" },
                    ]}
                  />
                </div>
                <div style={{ gridColumn: "span 6" }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    الصف
                  </div>
                  <CustomCombobox
                    value={newChildForm.class}
                    onChange={(v) =>
                      setNewChildForm((p) => ({ ...p, class: v }))
                    }
                    options={classes.map((c) => ({
                      value: c.name,
                      label: c.name,
                    }))}
                    placeholder="اختر أو اكتب صفاً..."
                  />
                </div>
                <div style={{ gridColumn: "span 6" }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    البلد / المدينة
                  </div>
                  <CustomCombobox
                    value={newChildForm.country_name}
                    onChange={(v) =>
                      setNewChildForm((p) => ({ ...p, country_name: v }))
                    }
                    options={countries.map((c) => ({
                      value: c.name,
                      label: c.name,
                    }))}
                    placeholder="اختر أو اكتب بلداً..."
                    disabled={countriesLoading}
                  />
                </div>
              </div>
            </div>

            {/* معلومات الأهل */}
            <div style={{ gridColumn: "span 12" }}>
              <h4 className="form-section-title">
                <Phone size={18} color="#64748b" /> معلومات التواصل (الأهل)
              </h4>
              <div className="grid">
                <div style={{ gridColumn: "span 6" }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    اسم الأم
                  </div>
                  <input
                    className="input"
                    value={newChildForm.mother_name}
                    onChange={(e) =>
                      setNewChildForm((p) => ({
                        ...p,
                        mother_name: e.target.value,
                      }))
                    }
                    placeholder="اختياري"
                  />
                </div>
                <div style={{ gridColumn: "span 6" }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    هاتف الأم
                  </div>
                  <input
                    className="input"
                    value={newChildForm.mother_phone}
                    onChange={(e) =>
                      setNewChildForm((p) => ({
                        ...p,
                        mother_phone: e.target.value,
                      }))
                    }
                    placeholder="اختياري"
                    dir="ltr"
                    style={{ textAlign: "right" }}
                  />
                </div>
                <div style={{ gridColumn: "span 6" }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    اسم الأب
                  </div>
                  <input
                    className="input"
                    value={newChildForm.father_name}
                    onChange={(e) =>
                      setNewChildForm((p) => ({
                        ...p,
                        father_name: e.target.value,
                      }))
                    }
                    placeholder="اختياري"
                  />
                </div>
                <div style={{ gridColumn: "span 6" }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    هاتف الأب
                  </div>
                  <input
                    className="input"
                    value={newChildForm.father_phone}
                    onChange={(e) =>
                      setNewChildForm((p) => ({
                        ...p,
                        father_phone: e.target.value,
                      }))
                    }
                    placeholder="اختياري"
                    dir="ltr"
                    style={{ textAlign: "right" }}
                  />
                </div>
              </div>
            </div>

            {/* ملاحظات إضافية */}
            <div style={{ gridColumn: "span 12" }}>
              <div className="muted" style={{ marginBottom: 6 }}>
                ملاحظات إضافية
              </div>
              <textarea
                className="input"
                rows={3}
                value={newChildForm.notes}
                onChange={(e) =>
                  setNewChildForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="أي تفاصيل طبية أو ملاحظات أخرى..."
                style={{ resize: "vertical" }}
              />
            </div>

            <div
              style={{
                gridColumn: "span 12",
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                paddingTop: 8,
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={() => setOpenNewChild(false)}
                disabled={newChildSaving}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  createChildInline({ enrollNow: newChildEnrollNow })
                }
                disabled={newChildSaving}
              >
                {newChildSaving
                  ? "جاري الحفظ..."
                  : newChildEnrollNow
                    ? "حفظ وتسجيل بالدورة"
                    : "حفظ الطالب"}
              </button>
            </div>
          </div>
        </Modal>

        <Modal
          open={openBulk}
          title="إضافة أطفال للدورة"
          onClose={() => setOpenBulk(false)}
        >
          <div
            dir="rtl"
            lang="ar"
            className="modal-wide-1000"
            style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
          >
            {bulkStep === 1 && (
              <>
                <div className="muted" style={{ lineHeight: 1.5 }}>
                  <strong>الخطوة 1:</strong> اختر الأطفال من القائمة ثم اضغط{" "}
                  <b>التالي</b> لإدخال تفاصيل الدفع.
                </div>
                <hr className="sep" />
                <div
                  className="row"
                  style={{
                    gap: 10,
                    flexWrap: "wrap",
                    justifyContent: "flex-start",
                    alignItems: "center",
                  }}
                >
                  <input
                    className="input"
                    style={{ width: 280 }}
                    placeholder="ابحث عن طفل..."
                    value={bulkQ}
                    onChange={(e) => setBulkQ(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn"
                    onClick={bulkSelectAllFiltered}
                  >
                    تحديد الكل
                  </button>
                  <button
                    type="button"
                    className="btn danger"
                    onClick={bulkClearSelection}
                  >
                    إلغاء التحديد
                  </button>
                  <div className="muted" style={{ marginInlineStart: "auto" }}>
                    المحدد: <b>{bulkSelectedCount}</b>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 12,
                    minHeight: 0,
                    flex: "1 1 auto",
                    overflow: "hidden",
                  }}
                >
                  {bulkCandidates.length === 0 ? (
                    <div className="card">لا يوجد أطفال.</div>
                  ) : (
                    <div
                      className="card"
                      style={{
                        padding: 0,
                        overflow: "auto",
                        maxHeight: "clamp(180px, 38vh, 50vh)",
                        direction: "rtl",
                      }}
                    >
                      <table
                        className="table"
                        style={{ margin: 0, minWidth: 600 }}
                      >
                        <thead
                          style={{
                            position: "sticky",
                            top: 0,
                            background: "white",
                            zIndex: 2,
                          }}
                        >
                          <tr>
                            <th style={{ width: 70, textAlign: "right" }}>
                              اختيار
                            </th>
                            <th style={{ textAlign: "right" }}>الاسم</th>
                            <th style={{ textAlign: "right" }}>العمر</th>
                            <th style={{ textAlign: "right" }}>الصف</th>
                            <th style={{ textAlign: "right" }}>الجنس</th>
                            <th style={{ textAlign: "right" }}>هاتف الأم</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkCandidates.map((c) => {
                            const checked = !!bulkSelected[String(c.id)];
                            const genderLabel =
                              c.gender === "male"
                                ? "ذكر"
                                : c.gender === "female"
                                  ? "أنثى"
                                  : (c.gender ?? "-");

                            return (
                              <tr key={c.id}>
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleBulkChild(c.id)}
                                  />
                                </td>
                                <td style={{ fontWeight: 850 }}>{c.name}</td>
                                <td className="muted">{c.age ?? "-"}</td>
                                <td className="muted">{c.class ?? "-"}</td>
                                <td className="muted">{genderLabel}</td>
                                <td className="muted">
                                  <span
                                    style={{
                                      direction: "ltr",
                                      unicodeBidi: "embed",
                                    }}
                                  >
                                    {c.mother_phone ?? "-"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div
                  className="row"
                  style={{
                    justifyContent: "flex-end",
                    gap: 10,
                    marginTop: 16,
                  }}
                >
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setOpenBulk(false)}
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={bulkSelectedCount === 0}
                    onClick={() => setBulkStep(2)}
                  >
                    التالي (تفاصيل الدفع)
                  </button>
                </div>
              </>
            )}

            {bulkStep === 2 && (
              <>
                <div className="muted" style={{ lineHeight: 1.5 }}>
                  <strong>الخطوة 2:</strong> قم بتحديد السعر{" "}
                  {!isWorkshop && "وعدد الحصص "}
                  لكل طفل.
                  {isWorkshop && " تفاصيل الدفع تضاف مباشرة لحساب الطالب."}
                </div>
                <hr className="sep" />
                <div style={{ marginTop: 12 }}>
                  <div
                    className="card"
                    style={{
                      padding: 0,
                      overflow: "auto",
                      maxHeight: "55vh",
                      direction: "rtl",
                    }}
                  >
                    <table
                      className="table"
                      style={{ margin: 0, minWidth: 600 }}
                    >
                      <thead
                        style={{
                          position: "sticky",
                          top: 0,
                          background: "white",
                          zIndex: 2,
                        }}
                      >
                        <tr>
                          <th style={{ textAlign: "right" }}>الاسم</th>
                          <th style={{ textAlign: "right", width: 140 }}>
                            تاريخ الإضافة
                          </th>
                          {!isWorkshop && (
                            <th style={{ width: 100, textAlign: "center" }}>
                              الحصص
                            </th>
                          )}
                          <th style={{ width: 120, textAlign: "center" }}>
                            السعر
                          </th>
                          {isWorkshop && (
                            <>
                              <th style={{ width: 80, textAlign: "center" }}>
                                دفع؟
                              </th>
                              <th style={{ width: 150, textAlign: "center" }}>
                                طريقة الدفع
                              </th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedChildrenForStep2.map((c) => {
                          const isPaid = !!bulkPerChildPaid[c.id];
                          return (
                            <tr key={c.id}>
                              <td style={{ fontWeight: 850 }}>{c.name}</td>
                              <td>
                                <input
                                  className="input"
                                  style={{
                                    width: "100%",
                                    minWidth: 130,
                                    height: 38,
                                    textAlign: "center",
                                    fontSize: 13,
                                  }}
                                  type="date"
                                  value={
                                    bulkPerChildDate[c.id] !== undefined
                                      ? bulkPerChildDate[c.id]
                                      : isoDate(new Date())
                                  }
                                  onChange={(e) =>
                                    setBulkPerChildDate((prev) => ({
                                      ...prev,
                                      [c.id]: e.target.value,
                                    }))
                                  }
                                />
                              </td>
                              {!isWorkshop && (
                                <td>
                                  <input
                                    className="input"
                                    style={{
                                      width: "100%",
                                      minWidth: 70,
                                      height: 38,
                                      textAlign: "center",
                                    }}
                                    type="number"
                                    min="0"
                                    value={
                                      bulkPerChildSessions[c.id] !== undefined
                                        ? bulkPerChildSessions[c.id]
                                        : defaultSessionsTotal
                                    }
                                    onChange={(e) =>
                                      setBulkPerChildSessions((prev) => ({
                                        ...prev,
                                        [c.id]: e.target.value,
                                      }))
                                    }
                                  />
                                </td>
                              )}
                              <td>
                                <input
                                  className="input"
                                  style={{
                                    width: "100%",
                                    minWidth: 90,
                                    height: 38,
                                    textAlign: "center",
                                  }}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={
                                    bulkPerChildPrice[c.id] !== undefined
                                      ? bulkPerChildPrice[c.id]
                                      : defaultPrice
                                  }
                                  onChange={(e) =>
                                    setBulkPerChildPrice((prev) => ({
                                      ...prev,
                                      [c.id]: e.target.value,
                                    }))
                                  }
                                />
                              </td>
                              {isWorkshop && (
                                <>
                                  <td style={{ textAlign: "center" }}>
                                    <input
                                      type="checkbox"
                                      checked={isPaid}
                                      style={{ transform: "scale(1.2)" }}
                                      onChange={(e) =>
                                        setBulkPerChildPaid((prev) => ({
                                          ...prev,
                                          [c.id]: e.target.checked,
                                        }))
                                      }
                                    />
                                  </td>
                                  <td>
                                    {isPaid ? (
                                      <select
                                        className="input"
                                        style={{ height: 38, fontSize: 13 }}
                                        value={
                                          bulkPerChildPayMethod[c.id] || "cash"
                                        }
                                        onChange={(e) =>
                                          setBulkPerChildPayMethod((prev) => ({
                                            ...prev,
                                            [c.id]: e.target.value,
                                          }))
                                        }
                                      >
                                        <option value="cash">نقداً</option>
                                        <option value="card">
                                          بطاقة ائتمان
                                        </option>
                                        <option value="transfer">
                                          حوالة بنكية
                                        </option>
                                        <option value="other">أخرى</option>
                                      </select>
                                    ) : (
                                      <span
                                        className="muted"
                                        style={{ display: "block" }}
                                      >
                                        -
                                      </span>
                                    )}
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div
                  className="row"
                  style={{
                    justifyContent: "flex-start",
                    gap: 10,
                    marginTop: 16,
                  }}
                >
                  <button
                    type="button"
                    className="btn primary"
                    disabled={bulkSaving || bulkSelectedCount === 0}
                    onClick={bulkPurchaseAndEnroll}
                  >
                    {bulkSaving
                      ? "جارٍ الإضافة..."
                      : `إضافة (${bulkSelectedCount})`}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setBulkStep(1)}
                  >
                    رجوع للأسماء
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>

        <Modal
          open={openSession}
          title={sessionForm.id ? "تعديل الجلسة" : "إضافة جلسة"}
          onClose={() => setOpenSession(false)}
        >
          <div className="grid">
            <div style={{ gridColumn: "span 6" }}>
              <div className="muted">
                {isWorkshop ? "تاريخ الورشة" : "تاريخ ووقت الجلسة"}
              </div>
              <input
                className="input"
                type="datetime-local"
                value={sessionForm.start_at}
                onChange={(e) =>
                  setSessionForm((p) => ({ ...p, start_at: e.target.value }))
                }
              />
            </div>
            {isWorkshop && (
              <div style={{ gridColumn: "span 6" }}>
                <div className="muted">المدة (دقائق)</div>
                <input
                  className="input"
                  type="number"
                  min={1}
                  step={5}
                  value={sessionForm.duration_min ?? 60}
                  onChange={(e) =>
                    setSessionForm((p) => ({
                      ...p,
                      duration_min: Number(e.target.value),
                    }))
                  }
                />
              </div>
            )}
            <div style={{ gridColumn: "span 12" }}>
              <div className="muted">الحالة</div>
              <ModernSelect
                value={sessionForm.status}
                onChange={(v) => setSessionForm((p) => ({ ...p, status: v }))}
                menuWidth="trigger"
                options={[
                  { value: "scheduled", label: "مجدولة" },
                  { value: "done", label: "مكتملة" },
                  { value: "canceled", label: "ملغاة" },
                ]}
              />
            </div>
            <div className="row" style={{ gridColumn: "span 12" }}>
              <button
                type="button"
                className="btn primary"
                disabled={sessionSaving}
                onClick={saveSession}
              >
                {sessionSaving ? "جاري الحفظ..." : "حفظ"}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setOpenSession(false)}
              >
                إلغاء
              </button>
            </div>
          </div>
        </Modal>

        {/* =========================================================================
            نافذة الدفع المضافة لتفعيل أزرار (دفع المتبقي / إضافة دفعة) 
        ========================================================================= */}
        <Modal
          open={openPay}
          title={payEditId ? "تعديل دفعة" : "إضافة دفعة"}
          onClose={() => closeSubModalAndReopen(setOpenPay)}
        >
          <div className="grid">
            {!payLocked && (
              <div style={{ gridColumn: "span 12" }}>
                <div className="muted" style={{ marginBottom: 4 }}>
                  الطفل
                </div>
                <ModernSelect
                  value={payEnrollmentId}
                  onChange={setPayEnrollmentId}
                  options={[
                    { value: "", label: "— اختر طفل —" },
                    ...participants.map((p) => ({
                      value: String(p.enrollment_id),
                      label: p.child_name,
                    })),
                  ]}
                  placeholder="— اختر طفل —"
                />
              </div>
            )}
            <div style={{ gridColumn: "span 6" }}>
              <div className="muted" style={{ marginBottom: 4 }}>
                المبلغ (₪)
              </div>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>
            <div style={{ gridColumn: "span 6" }}>
              <div className="muted" style={{ marginBottom: 4 }}>
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
            <div style={{ gridColumn: "span 6" }}>
              <div className="muted" style={{ marginBottom: 4 }}>
                تاريخ الدفع
              </div>
              <input
                className="input"
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
              />
            </div>
            <div style={{ gridColumn: "span 12" }}>
              <div className="muted" style={{ marginBottom: 4 }}>
                ملاحظة
              </div>
              <input
                className="input"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="اختياري..."
              />
            </div>
            <div
              className="row"
              style={{ gridColumn: "span 12", marginTop: 10 }}
            >
              <button
                type="button"
                className="btn primary"
                disabled={
                  paySaving || !payAmount || (!payEnrollmentId && !payLocked)
                }
                onClick={addPayment}
              >
                {paySaving ? "جاري الحفظ..." : "حفظ"}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => closeSubModalAndReopen(setOpenPay)}
              >
                إلغاء
              </button>
            </div>
          </div>
        </Modal>

        {/* =========================================================================
            نافذة المصاريف 
        ========================================================================= */}
        <Modal
          open={openExpenseModal}
          title={expenseEditId ? "تعديل مصروف" : "إضافة مصروف"}
          onClose={() => {
            setOpenExpenseModal(false);
            resetExpenseForm();
          }}
        >
          <div className="grid">
            <div style={{ gridColumn: "span 6" }}>
              <div className="muted" style={{ marginBottom: 6 }}>
                التاريخ
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
                المبلغ
              </div>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                placeholder="مثال: 50"
              />
            </div>
            <div style={{ gridColumn: "span 6" }}>
              <div className="muted" style={{ marginBottom: 6 }}>
                التصنيف
              </div>
              <CustomCombobox
                value={expCategory}
                onChange={(v) => setExpCategory(v)}
                options={expCategories.map((x) => ({
                  value: x,
                  label: x,
                }))}
                placeholder="اختر أو اكتب تصنيفاً..."
              />
            </div>
            <div style={{ gridColumn: "span 6" }}>
              <div className="muted" style={{ marginBottom: 6 }}>
                الشخص
              </div>
              <CustomCombobox
                value={expParty}
                onChange={(v) => setExpParty(v)}
                options={expParties.map((x) => ({
                  value: x,
                  label: x,
                }))}
                placeholder="اختر أو اكتب شخصاً..."
              />
            </div>
            <div style={{ gridColumn: "span 12" }}>
              <div className="muted" style={{ marginBottom: 6 }}>
                الوصف
              </div>
              <input
                className="input"
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                placeholder="اختياري..."
              />
            </div>
            <div
              className="row"
              style={{ gridColumn: "span 12", marginTop: 20 }}
            >
              <button
                type="button"
                className="btn primary"
                onClick={saveExpense}
                disabled={expSaving}
              >
                {expSaving ? "جاري الحفظ..." : "حفظ"}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setOpenExpenseModal(false);
                  resetExpenseForm();
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </Modal>
        {/* ========================================================================= */}

        <ConfirmDialog
          open={confirm.open}
          title=""
          message={confirm.text}
          confirmText="نعم"
          cancelText="إلغاء"
          danger
          onCancel={() =>
            setConfirm({ open: false, type: null, id: null, text: "" })
          }
          onConfirm={async () => {
            const { type, id } = confirm;
            setConfirm({ open: false, type: null, id: null, text: "" });

            if (type === "pkgDelta")
              await doAdjustPackageTotal(id.packageId, id.delta);
            if (type === "inactive") await setEnrollmentStatus(id, "inactive");
            if (type === "active") await setEnrollmentStatus(id, "active");

            // Delete Full Enrollment
            if (type === "deleteEnroll") {
              await deleteEnrollment(id.enrollmentId, id.childId, id.courseId);
            }

            // Delete specific package
            if (type === "deletePackage") {
              const { error } = await supabase.rpc("delete_course_package", {
                p_package_id: id.packageId,
                p_enrollment_id: id.enrollmentId,
              });
              if (error) {
                toast(error.message, "danger");
              } else {
                toast("تم حذف الباقة بنجاح", "ok");
                fetchPkgHistory(historyEnrollment);
                loadFixed();
              }
            }

            if (type === "deleteSession") await deleteSession(id);
            if (type === "deletePayment") {
              await deletePayment(id);
              if (openHistory && historyEnrollment) {
                openPaymentHistory(historyEnrollment);
              }
            }
            if (type === "deleteExpense") await deleteExpense(id);
          }}
        />
      </div>
    </div>
  );
}
