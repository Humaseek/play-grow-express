import React, { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";

const LOCALE_LATN = "en-IL";

function fmtDT(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDate(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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

// دالة لتحديث التاريخ مع الحفاظ على وقت النظام
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

const RUN_DETAILS_SOFT_UI_STYLES = `
.page.page--runs {
  background: linear-gradient(180deg, rgba(0, 172, 71, 0.08) 0%, #f7faf8 240px, #f4f6f8 100%) !important;
}

.runDetails {
  padding-block: 22px 40px;
}

/* --- التحكم بحجم المودال الفردي --- */
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

/* المحاذاة الإجبارية للمنتصف بخط مستقيم */
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

.summaryCardSoft.is-agreed .summaryIcon {
  background: rgba(122, 92, 255, 0.10);
  color: rgb(122, 92, 255);
}

.summaryCardSoft.is-paid .summaryIcon {
  background: rgba(0, 172, 71, 0.10);
  color: rgb(0, 172, 71);
}

.summaryCardSoft.is-expenses .summaryIcon {
  background: rgba(255, 153, 0, 0.12);
  color: rgb(255, 153, 0);
}

.summaryCardSoft.is-balance .summaryIcon {
  background: rgba(239, 68, 68, 0.10);
  color: rgb(239, 68, 68);
}

.summaryCardSoft.is-balance.is-good .summaryIcon {
  background: rgba(0, 172, 71, 0.10);
  color: rgb(0, 172, 71);
}

.summaryValue {
  font-size: clamp(28px, 2vw, 34px);
  font-weight: 900;
  line-height: 1.1;
  margin-bottom: 8px;
}

.summaryNote {
  color: rgb(82, 82, 82);
  font-size: 12px;
  line-height: 1.5;
}

.runDetails .tabs {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 6px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.8);
  margin-bottom: 12px !important;
}

.runDetails .tab {
  border-radius: 999px !important;
  min-height: 40px;
  padding-inline: 16px !important;
  font-weight: 800;
  color: rgb(82, 82, 82);
}

.runDetails .tab.active {
  background: rgba(0, 172, 71, 0.12) !important;
  border-color: rgba(0, 172, 71, 0.18) !important;
  color: rgb(0, 172, 71) !important;
}

.runDetails .pToolbar {
  gap: 20px !important;
}

.runDetails .pTitle h2,
.runDetails .h1 {
  font-size: 28px;
  line-height: 1.2;
}

.runDetails .input,
.runDetails select.input {
  min-height: 46px;
  border-radius: 14px !important;
  border: 1px solid rgba(15, 23, 42, 0.10) !important;
  background: #fff !important;
}

.runDetails .pGrid {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px !important;
  align-items: stretch !important;
}

.runDetails .pCard {
  width: 100% !important;
  border: 1px solid rgba(15, 23, 42, 0.08) !important;
  border-radius: 22px !important;
  padding: 18px !important;
  background: #fff !important;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.runDetails .pCard:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
  border-color: rgba(0, 172, 71, 0.18) !important;
}

.runDetails .pHead {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.runDetails .pName {
  font-size: 21px;
  font-weight: 900;
  line-height: 1.2;
  margin-bottom: 6px;
}

.runDetails .pMeta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.runDetails .metaItem {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(248, 250, 252, 1);
  border: 1px solid rgba(15, 23, 42, 0.06);
  color: rgb(82, 82, 82);
  font-size: 12px;
  font-weight: 700;
}

.runDetails .pQuickStats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.runDetails .pStatBlock {
  padding: 14px 10px;
  border-radius: 16px;
  background: rgba(248, 250, 252, 0.8);
  border: 1px solid rgba(15, 23, 42, 0.04);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 8px; 
  transition: all 0.2s ease;
}

.runDetails .pStatBlock.stat-green {
  background: rgba(0, 172, 71, 0.08);
  border-color: rgba(0, 172, 71, 0.15);
}
.runDetails .pStatBlock.stat-green .pStatValue { color: rgb(0, 172, 71); }
.runDetails .pStatBlock.stat-yellow { background: rgba(245, 158, 11, 0.08); border-color: rgba(245, 158, 11, 0.15); }
.runDetails .pStatBlock.stat-yellow .pStatValue { color: rgb(217, 119, 6); }
.runDetails .pStatBlock.stat-red { background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.15); }
.runDetails .pStatBlock.stat-red .pStatValue { color: rgb(220, 38, 38) !important; }

.runDetails .pStatLabel {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: rgb(100, 116, 139);
  font-size: 13px;
  font-weight: 700;
  margin: 0;
  white-space: nowrap; 
}

.runDetails .pStatValue {
  font-size: 18px;
  font-weight: 900;
  line-height: 1;
  color: rgb(15, 23, 42);
}

.runDetails .pProgressWrap {
  padding: 12px 0 0;
  margin-top: 2px;
}

.runDetails .pProgressHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: rgb(82, 82, 82);
  margin-bottom: 8px;
}

.runDetails .pBar {
  height: 8px !important;
  border-radius: 999px !important;
  background: rgba(15, 23, 42, 0.08) !important;
  overflow: hidden;
}
.runDetails .pBar span { display: block; height: 100%; border-radius: inherit; background: rgb(0, 172, 71); }
.runDetails .pBarPartial span { background: rgb(245, 158, 11); }
.runDetails .pBarUnpaid span { background: rgb(239, 68, 68); }
.runDetails .pBarFree span { background: rgb(148, 163, 184); }

.runDetails .sessionRow {
  border-radius: 18px !important;
  background: rgba(255, 255, 255, 0.94);
  transition: all 0.2s ease;
  border-left: 1px solid transparent;
  border-top: 1px solid transparent;
  border-bottom: 1px solid transparent;
}
.runDetails .sessionRow:hover {
  background: #fff !important;
  box-shadow: 0 6px 16px rgba(0,0,0,0.04);
}

.runDetails .sectionHeader {
  font-size: 18px;
  font-weight: 900;
  color: #0f172a;
  margin-top: 10px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 1100px) {
  .runInfoGrid, .summaryGridSoft { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 980px) {
  .runDetails .pQuickStats { grid-template-columns: 1fr; }
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
    country_id: 1,
    new_country_name: "",
    mother_name: "",
    mother_phone: "",
    father_name: "",
    father_phone: "",
    notes: "",
  });
  const [newChildSaving, setNewChildSaving] = useState(false);

  const [countries, setCountries] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [newChildEnrollNow, setNewChildEnrollNow] = useState(false);

  const openCreateEnroll = () => {
    setNewChildEnrollNow(true);
    setOpenNewChild(true);
  };

  async function loadCountriesSafe() {
    setCountriesLoading(true);
    try {
      const res = await supabase
        .from("countries")
        .select("id,name")
        .order("name", { ascending: true });
      if (res.error) throw res.error;
      setCountries(res.data ?? []);
    } catch (e) {
      setCountries([]);
    } finally {
      setCountriesLoading(false);
    }
  }

  useEffect(() => {
    if (openNewChild) loadCountriesSafe();
  }, [openNewChild]);

  const [pkgInfo, setPkgInfo] = useState(null);
  const [pkgLoading, setPkgLoading] = useState(false);
  const [enrollMode, setEnrollMode] = useState("buy_new");

  const [openBulk, setOpenBulk] = useState(false);
  const [bulkQ, setBulkQ] = useState("");
  const [bulkSelected, setBulkSelected] = useState({});
  const [bulkSessions, setBulkSessions] = useState(8);

  const [bulkPriceMode, setBulkPriceMode] = useState("unified");
  const [bulkUnifiedPrice, setBulkUnifiedPrice] = useState("");
  const [bulkPerChildPrice, setBulkPerChildPrice] = useState({});
  const [bulkSaving, setBulkSaving] = useState(false);

  // السجلات الجديدة
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

  // لحفظ حالة العودة لإدارة الطالب بعد إغلاق مودال فرعي
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

  const defaultPrice = useMemo(
    () => Number(summary?.default_price ?? 0),
    [summary],
  );

  const defaultSessionsTotal = useMemo(() => {
    const raw = summary?.default_sessions_total ?? summary?.sessions_total ?? 8;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
  }, [summary]);

  async function loadChildrenSafe() {
    const tryView = await supabase
      .from("children_view")
      .select(
        "id,name,age,class,gender,country_id,country_name,mother_name,mother_phone,father_name,father_phone",
      )
      .order("name", { ascending: true });

    if (!tryView.error) return tryView.data ?? [];
    const tryTable = await supabase
      .from("children")
      .select(
        "id,name,age,class,gender,country_id,mother_name,mother_phone,father_name,father_phone",
      )
      .order("name", { ascending: true });

    if (tryTable.error) throw tryTable.error;
    return tryTable.data ?? [];
  }

  const closeSubModalAndReopen = (setterFunc) => {
    setterFunc(false);
    if (shouldReopenManage && manageP) {
      setTimeout(() => {
        setOpenإدارة(true);
      }, 150);
      setShouldReopenManage(false);
    }
  };

  async function createChildInline({ enrollNow = false } = {}) {
    const name = (newChildForm.name || "").trim();
    const ageNum = Number(String(newChildForm.age ?? "").trim());
    if (!name || isNaN(ageNum)) {
      toast("Name and age are required.", "warn");
      return;
    }

    setNewChildSaving(true);
    try {
      let countryId = newChildForm.country_id
        ? Number(newChildForm.country_id)
        : null;
      const newCountryName = (newChildForm.new_country_name || "").trim();
      if (newCountryName) {
        const existing = await supabase
          .from("countries")
          .select("id")
          .eq("name", newCountryName)
          .maybeSingle();
        if (existing.data?.id) countryId = existing.data.id;
        else {
          const created = await supabase
            .from("countries")
            .insert([{ name: newCountryName }])
            .select("id")
            .single();
          if (created.data) countryId = created.data.id;
        }
        loadCountriesSafe();
      }

      const payload = {
        name,
        age: ageNum,
        class: (newChildForm.class || "").trim() || null,
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
        toast("Child created. Set sessions and click Save to enroll.", "ok");
      } else {
        toast("Child created.", "ok");
      }
    } catch (e) {
      toast("Failed to create child.", "danger");
    } finally {
      setNewChildSaving(false);
    }
  }

  async function purchaseAndEnrollSpecificChild(childId) {
    if (!summary) return;
    const sessionsToBuy = Number(buySessions);
    const priceNum = buyPriceTotal === "" ? 0 : Number(buyPriceTotal);
    const rpc2 = await supabase.rpc("purchase_sessions_and_enroll", {
      p_run_id: Number(runId),
      p_child_id: Number(childId),
      p_sessions: sessionsToBuy,
      p_price_total: Number.isFinite(priceNum) ? priceNum : 0,
    });
    if (rpc2.error) throw rpc2.error;
    toast("تم التسجيل بنجاح.", "ok");
    closeSubModalAndReopen(setOpenEnroll);
    await loadFixed();
    if (!enrollLocked && !shouldReopenManage) setTab("participants");
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

  async function addPicklistValue(kind, name) {
    const clean = String(name || "").trim();
    if (!clean) return;
    const table =
      kind === "category" ? "expense_categories" : "expense_parties";
    const setter = kind === "category" ? setExpCategory : setExpParty;
    const inputSetter = kind === "category" ? setNewCatName : setNewPartyName;
    try {
      await supabase.from(table).insert({ name: clean });
      setter(clean);
      inputSetter("");
      await loadExpensePicklistsSafe();
      toast("Saved.", "ok");
    } catch {
      toast("Failed to save.", "danger");
    }
  }

  async function saveExpense() {
    const amt = Number(expAmount);
    if (!expDate || isNaN(amt) || amt <= 0) {
      toast("Please enter a valid date and amount.", "danger");
      return;
    }
    setExpSaving(true);
    const payload = {
      spent_on: expDate,
      amount: amt,
      category: expCategory?.trim() || null,
      party: expParty?.trim() || null,
      description: expDesc?.trim() || null,
      run_id: Number(runId),
    };
    try {
      if (expenseEditId)
        await supabase.from("expenses").update(payload).eq("id", expenseEditId);
      else await supabase.from("expenses").insert(payload);
      setOpenExpenseModal(false);
      resetExpenseForm();
      await loadRunExpensesSafe();
    } catch {
      toast("Failed to save.", "danger");
    } finally {
      setExpSaving(false);
    }
  }

  async function deleteExpense(id) {
    try {
      await supabase.from("expenses").delete().eq("id", id);
      toast("Deleted.", "ok");
      await loadRunExpensesSafe();
    } catch {
      toast("Failed to delete.", "danger");
    }
  }

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

  useEffect(() => {
    loadFixed();
  }, [runId]);
  useEffect(() => {
    loadExpensePicklistsSafe();
  }, []);

  useEffect(() => {
    if (!openإدارة || !manageP) return;
    const updated = participants.find(
      (x) => Number(x.enrollment_id) === Number(manageP.enrollment_id),
    );
    if (updated) setإدارةP(updated);
  }, [participants]);

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

  // تقسيم الجلسات إلى قادمة وسابقة
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

    // ترتيب القادمة من الأقرب للأبعد
    upcoming.sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
    // ترتيب السابقة من الأحدث للأقدم
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

  function openإدارةFor(p) {
    setإدارةP(p);
    setOpenإدارة(true);
  }

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
          .eq("child_id", Number(selectedChildId))
          .limit(1);
        const row = res.data?.[0] ?? null;
        setPkgInfo(row);
        setEnrollMode(
          row && Number(row.sessions_remaining) > 0
            ? "use_existing"
            : "buy_new",
        );
      } catch {
        setEnrollMode("buy_new");
      } finally {
        setPkgLoading(false);
      }
    }
    fetchPkg();
  }, [openEnroll, selectedChildId, summary]);

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

  function openSingleEnrollNew() {
    initEnrollBuyNew();
  }
  function openSingleTopup(participantRow) {
    const remaining = Number(participantRow.package_sessions_remaining || 0);
    if (remaining > 0) {
      toast("لا يمكن إضافة جلسات جديدة حتى يتم إنهاء الجلسات الحالية.", "warn");
      return;
    }

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

  function openBulkModal() {
    setOpenBulk(true);
    setBulkQ("");
    setBulkSelected({});
    setBulkSessions(defaultSessionsTotal);
    setBulkPriceMode("unified");
    setBulkUnifiedPrice(String(defaultPrice));
    setBulkPerChildPrice({});
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
    const rpc = await supabase.rpc("adjust_enrollment_allocated_sessions", {
      p_enrollment_id: id,
      p_new_allocated: next,
    });
    if (rpc.error && !rpc.error.message.includes("Could not find the function"))
      throw rpc.error;
    if (rpc.error)
      await supabase
        .from("enrollments")
        .update({ sessions_allocated: next })
        .eq("id", id);
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
      await supabase
        .from("enrollments")
        .update({ status: "active" })
        .eq("id", existing.enrollment_id);
      if (existing.package_id) {
        await supabase
          .from("course_packages")
          .update({ status: "active", price_total: priceTotalNum })
          .eq("id", existing.package_id);
        if (s > 0)
          await supabase.rpc("adjust_package_sessions_total", {
            p_package_id: Number(existing.package_id),
            p_delta: s,
          });
      }
      if (s > 0) await bumpEnrollmentAllocated(existing.enrollment_id, s);
      toast("تمت إعادة التسجيل بنجاح.", "ok");
      closeSubModalAndReopen(setOpenEnroll);
      await loadFixed();
      if (!enrollLocked && !shouldReopenManage) setTab("participants");
      return true;
    } catch {
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
        toast("تم التسجيل باستخدام الرصيد السابق.", "ok");
        closeSubModalAndReopen(setOpenEnroll);
        await loadFixed();
        if (!enrollLocked && !shouldReopenManage) setTab("participants");
        return;
      }

      if (existing && existing.enrollment_status === "active") {
        const remaining = Number(existing.package_sessions_remaining || 0);
        if (remaining > 0) {
          toast(
            "لا يمكن إضافة جلسات. الطالب يمتلك رصيد جلسات حالي غير منتهي.",
            "warn",
          );
          setEnrollSaving(false);
          return;
        }

        const sessionsToAdd = Number(buySessions) || 0;
        await bumpEnrollmentAllocated(existing.enrollment_id, sessionsToAdd);
        if (existing.package_id) {
          await supabase
            .from("course_packages")
            .update({
              price_total:
                Number(existing.agreed_price || 0) +
                (Number(buyPriceTotal) || 0),
            })
            .eq("id", existing.package_id);
          await supabase.rpc("adjust_package_sessions_total", {
            p_package_id: Number(existing.package_id),
            p_delta: sessionsToAdd,
          });
        }
        toast("تم شحن رصيد الجلسات.", "ok");
        closeSubModalAndReopen(setOpenEnroll);
        await loadFixed();
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
      for (const childId of bulkSelectedIds) {
        const cid = Number(childId);
        let priceNum =
          bulkPriceMode === "unified"
            ? Number(bulkUnifiedPrice)
            : Number(bulkPerChildPrice[cid]);
        const rpc2 = await supabase.rpc("purchase_sessions_and_enroll", {
          p_run_id: Number(runId),
          p_child_id: cid,
          p_sessions: Number(bulkSessions),
          p_price_total: Number(priceNum) || 0,
        });
        if (rpc2.error) failed += 1;
        else added += 1;
      }
      await loadFixed();
      setTab("participants");
      toast(
        `تمت الإضافة: ${added}, فشل: ${failed}`,
        failed > 0 ? "warn" : "ok",
      );
      setOpenBulk(false);
      bulkClearSelection();
    } catch {
      toast("Bulk enroll failed.", "danger");
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
      await loadFixed();
    } catch {
      toast("Failed to remove.", "danger");
    }
  }

  async function generateSessions() {
    if (!firstStart) return;
    setGenLoading(true);
    try {
      await supabase.rpc("generate_weekly_sessions_for_run", {
        p_run_id: Number(runId),
        p_first_start: new Date(firstStart).toISOString(),
        p_duration_minutes: Number(durationMinutes),
        p_count: Number(count),
        p_interval_days: Number(intervalDays),
      });
      toast("Sessions generated.", "ok");
      await loadFixed();
      setTab("sessions");
    } catch {
      toast("Failed.", "danger");
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

      setOpenPay(false);
      await loadFixed();
      if (shouldReopenManage && manageP) {
        openPaymentHistory(manageP);
      }
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
    if (!pRow.package_id) {
      setHistoryRows([]);
      setHistoryLoading(false);
      return;
    }
    const { data } = await supabase
      .from("payments")
      .select("id,enrollment_id,amount,method,note,created_at")
      .eq("package_id", pRow.package_id)
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

  function quickAdjustFromإدارة(delta) {
    if (!manageP) return;
    if (!manageP.package_id) {
      toast("No package linked.", "warn");
      return;
    }
    if (delta < 0) {
      setConfirm({
        open: true,
        type: "pkgDelta",
        id: { packageId: manageP.package_id, delta },
        text: `تأكيد خصم ${Math.abs(delta)} جلسة من باقة ${manageP.child_name}`,
      });
      return;
    }
    doAdjustPackageTotal(manageP.package_id, delta);
  }

  async function doAdjustPackageTotal(packageId, delta) {
    try {
      await supabase.rpc("adjust_package_sessions_total", {
        p_package_id: Number(packageId),
        p_delta: Number(delta),
      });
      toast(
        delta > 0 ? ` Add ${Math.abs(delta)} .` : ` ${Math.abs(delta)} .`,
        "ok",
      );
      await loadFixed();
    } catch {
      toast("فشل التعديل.", "danger");
    }
  }

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

  return (
    <div
      className="page page--runs"
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

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
              رجوع
            </button>
            <button
              type="button"
              className="btn primary"
              style={{
                borderRadius: "999px",
                fontWeight: "bold",
                padding: "8px 24px",
                border: "none",
                boxShadow: "0 2px 8px rgba(0,172,71,0.2)",
              }}
              onClick={() => setTab("sessions")}
            >
              الحضور
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
          <div className="card">
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
                  <select
                    className="input"
                    value={childStatusFilter}
                    onChange={(e) => setChildStatusFilter(e.target.value)}
                    style={{ flex: "0 1 150px", minWidth: 130 }}
                  >
                    <option value="all">الكل</option>
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                  </select>
                  <select
                    className="input"
                    value={childSort}
                    onChange={(e) => setChildSort(e.target.value)}
                    style={{ flex: "0 1 210px", minWidth: 170 }}
                  >
                    <option value="balance_desc">
                      المتبقي: من الأعلى للأقل
                    </option>
                    <option value="balance_asc">
                      المتبقي: من الأقل للأعلى
                    </option>
                    <option value="name_asc">الاسم: أ-ي</option>
                    <option value="name_desc">الاسم: ي-أ</option>
                  </select>
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
                    className="btn"
                    onClick={openSingleEnrollNew}
                  >
                    + إضافة طفل للدورة
                  </button>
                  <button type="button" className="btn" onClick={openBulkModal}>
                    + إضافة مجموعة
                  </button>
                  <button
                    type="button"
                    className="btn primary"
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
                      className="pCard"
                      style={{
                        width: 380,
                        maxWidth: "100%",
                        cursor: "pointer",
                      }}
                      onClick={() => openإدارةFor(p)}
                    >
                      <div className="pHead" style={{ marginBottom: "20px" }}>
                        <div style={{ minWidth: 0 }}>
                          <div className="pName">{p.child_name}</div>
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
                        <div className={`pStatBlock ${balClass}`}>
                          <div className="pStatLabel">
                            <Hourglass size={14} />
                            <span>المتبقي</span>
                          </div>
                          <div className="pStatValue ltrIso" dir="ltr">
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
                  className="btn primary"
                  disabled={genLoading || !firstStart}
                  onClick={generateSessions}
                >
                  {genLoading ? "جاري الإنشاء..." : "إنشاء الجلسات"}
                </button>
                <hr className="sep" />
                <button
                  type="button"
                  className="btn"
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
                  {/* زر عرض الجلسات السابقة (المنقول لأعلى) */}
                  {pastSessions.length > 0 && (
                    <div>
                      <button
                        className="btn"
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
                          // تحديد لون الجلسة حسب الحالة (بدون كلمات)
                          let rowBg = "#fff";
                          let rowBorder = "1px solid rgba(15, 23, 42, 0.08)";

                          if (s.status === "done") {
                            rowBg = "rgba(0, 172, 71, 0.08)";
                            rowBorder = "1px solid rgba(0, 172, 71, 0.25)";
                          } else if (s.status === "canceled") {
                            rowBg = "rgba(239, 68, 68, 0.06)";
                            rowBorder = "1px solid rgba(239, 68, 68, 0.25)";
                          } else {
                            // scheduled
                            rowBg = "rgba(14, 165, 233, 0.06)";
                            rowBorder = "1px solid rgba(14, 165, 233, 0.25)";
                          }

                          return (
                            <div
                              key={s.id}
                              className="sessionRow"
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "minmax(120px, 1fr) minmax(140px, 1fr) auto",
                                gap: 12,
                                padding: "12px 14px",
                                alignItems: "center",
                                background: rowBg,
                                border: rowBorder,
                                // إضافة خط ملون جانبي عشان يبين الحالة بوضوح أكبر
                                borderRight:
                                  s.status === "done"
                                    ? "4px solid #00ac47"
                                    : s.status === "canceled"
                                      ? "4px solid #ef4444"
                                      : "4px solid #0ea5e9",
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 700 }}>
                                  {fmtDate(s.start_at)}
                                </div>
                                <div className="muted">
                                  {fmtWeekday(s.start_at)}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontWeight: 600 }}>
                                  <span dir="ltr">
                                    {fmtTimeHM(s.start_at)} →{" "}
                                    {fmtTimeHM(s.end_at)}
                                  </span>
                                </div>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 8,
                                  justifyContent: "flex-end",
                                }}
                              >
                                <button
                                  className="btn primary iconOnly"
                                  title="تسجيل الحضور"
                                  onClick={() =>
                                    navigate(`/sessions/${s.id}/attendance`)
                                  }
                                >
                                  <Settings2 size={16} />
                                </button>
                                <button
                                  className="btn iconOnly"
                                  title="تعديل الجلسة"
                                  onClick={() => openEditSession(s)}
                                >
                                  <Pencil size={16} />
                                </button>
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
                  className="btn primary"
                  onClick={openNewPaymentModal}
                >
                  + إضافة دفعة
                </button>
              </div>
              <hr className="sep" />
              {payments.length === 0 ? (
                <div className="muted">لا يوجد عناصر.</div>
              ) : (
                <div className="tableWrap inCard">
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
                            <span dir="ltr">{Number(p.amount).toFixed(2)}</span>
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
                className="btn primary"
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
                  className="grid"
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
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
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
                  <div className="tableWrap inCard">
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
                                {r.spent_on || "-"}
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
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
                  gap: 16,
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
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 12,
                    }}
                  >
                    <button
                      className="actionSquare"
                      disabled={Number(manageP.balance || 0) <= 0}
                      onClick={() => {
                        setOpenإدارة(false);
                        setShouldReopenManage(true);
                        setTimeout(() => {
                          openPaymentModalFor(manageP, "remaining");
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
                        setOpenإدارة(false);
                        setShouldReopenManage(true);
                        setTimeout(() => {
                          openPaymentModalFor(manageP, "custom");
                        }, 150);
                      }}
                    >
                      <PlusCircle size={26} style={{ color: "#16a34a" }} />
                      <span>إضافة دفعة</span>
                    </button>
                    <button
                      className="actionSquare"
                      onClick={() => {
                        setOpenإدارة(false);
                        setShouldReopenManage(true);
                        setTimeout(() => {
                          openPaymentHistory(manageP);
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
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 12,
                    }}
                  >
                    <button
                      className="actionSquare"
                      onClick={() => {
                        setOpenإدارة(false);
                        setShouldReopenManage(true);
                        setTimeout(() => {
                          openSingleTopup(manageP);
                        }, 150);
                      }}
                    >
                      <ShoppingCart size={26} style={{ color: "#7a5cff" }} />
                      <span>شراء جلسات</span>
                    </button>
                    <button
                      className="actionSquare"
                      onClick={() => {
                        setOpenإدارة(false);
                        setShouldReopenManage(true);
                        setTimeout(() => {
                          fetchPkgHistory(manageP);
                        }, 150);
                      }}
                    >
                      <List size={26} style={{ color: "#475569" }} />
                      <span>سجل الباقات</span>
                    </button>
                    <button
                      className="actionSquare"
                      onClick={() => {
                        setOpenإدارة(false);
                        setShouldReopenManage(true);
                        setTimeout(() => {
                          fetchAttHistory(manageP);
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
          onClose={() => setOpenEnroll(false)}
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
                      value: c.id,
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
                onClick={() => setOpenEnroll(false)}
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
          <div className="grid">
            <div style={{ gridColumn: "span 12" }}>
              <div className="muted">الاسم *</div>
              <input
                className="input"
                value={newChildForm.name}
                onChange={(e) =>
                  setNewChildForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder=""
              />
            </div>
            <div style={{ gridColumn: "span 4" }}>
              <div className="muted">العمر *</div>
              <input
                className="input"
                type="number"
                min={0}
                max={120}
                value={newChildForm.age}
                onChange={(e) =>
                  setNewChildForm((p) => ({ ...p, age: e.target.value }))
                }
              />
            </div>
            <div style={{ gridColumn: "span 4" }}>
              <div className="muted">الجنس</div>
              <select
                className="input"
                value={newChildForm.gender}
                onChange={(e) =>
                  setNewChildForm((p) => ({ ...p, gender: e.target.value }))
                }
              >
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </div>
            <div style={{ gridColumn: "span 4" }}>
              <div className="muted">الصف</div>
              <input
                className="input"
                value={newChildForm.class}
                onChange={(e) =>
                  setNewChildForm((p) => ({ ...p, class: e.target.value }))
                }
                placeholder=""
              />
            </div>
            <div style={{ gridColumn: "span 6" }}>
              <div className="muted">البلد/المدينة</div>
              <select
                className="input"
                value={newChildForm.country_id ?? ""}
                onChange={(e) =>
                  setNewChildForm((p) => ({ ...p, country_id: e.target.value }))
                }
                disabled={countriesLoading}
              >
                <option value="">
                  {countriesLoading ? "جاري التحميل..." : "اختر البلد..."}
                </option>
                {(countries ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: "span 6" }}>
              <div className="muted">بلد جديدة (اختياري)</div>
              <input
                className="input"
                value={newChildForm.new_country_name}
                onChange={(e) =>
                  setNewChildForm((p) => ({
                    ...p,
                    new_country_name: e.target.value,
                  }))
                }
                placeholder="مثال: الطيبة"
              />
            </div>
            <div style={{ gridColumn: "span 6" }}>
              <div className="muted">اسم الأم</div>
              <input
                className="input"
                value={newChildForm.mother_name}
                onChange={(e) =>
                  setNewChildForm((p) => ({
                    ...p,
                    mother_name: e.target.value,
                  }))
                }
              />
            </div>
            <div style={{ gridColumn: "span 6" }}>
              <div className="muted">هاتف الأم</div>
              <input
                className="input"
                value={newChildForm.mother_phone}
                onChange={(e) =>
                  setNewChildForm((p) => ({
                    ...p,
                    mother_phone: e.target.value,
                  }))
                }
              />
            </div>
            <div style={{ gridColumn: "span 6" }}>
              <div className="muted">اسم الأب</div>
              <input
                className="input"
                value={newChildForm.father_name}
                onChange={(e) =>
                  setNewChildForm((p) => ({
                    ...p,
                    father_name: e.target.value,
                  }))
                }
              />
            </div>
            <div style={{ gridColumn: "span 6" }}>
              <div className="muted">هاتف الأب</div>
              <input
                className="input"
                value={newChildForm.father_phone}
                onChange={(e) =>
                  setNewChildForm((p) => ({
                    ...p,
                    father_phone: e.target.value,
                  }))
                }
              />
            </div>
            <div style={{ gridColumn: "span 12" }}>
              <div className="muted">ملاحظات (اختياري)</div>
              <textarea
                className="input"
                rows={4}
                value={newChildForm.notes}
                onChange={(e) =>
                  setNewChildForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="أضف ملاحظاتك هنا..."
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
                    ? "إضافة وتسجيل"
                    : "حفظ"}
              </button>
            </div>
          </div>
        </Modal>

        <Modal
          open={openBulk}
          title="إضافة مجموعة"
          onClose={() => setOpenBulk(false)}
        >
          <div dir="rtl" lang="ar" className="modal-wide-1000">
            <div className="muted" style={{ lineHeight: 1.5 }}>
              اختر الأطفال ثم اضغط <b>إضافة</b>.
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
            <div style={{ marginTop: 12 }}>
              {bulkCandidates.length === 0 ? (
                <div className="card">لا يوجد أطفال.</div>
              ) : (
                <div
                  className="card"
                  style={{
                    padding: 0,
                    overflow: "auto",
                    maxHeight: "55vh",
                    direction: "rtl",
                  }}
                >
                  <table className="table" style={{ margin: 0, minWidth: 720 }}>
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
                        {bulkPriceMode === "perChild" && (
                          <th style={{ width: 150, textAlign: "right" }}>
                            السعر
                          </th>
                        )}
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
                            {bulkPriceMode === "perChild" && (
                              <td>
                                <input
                                  className="input"
                                  style={{ minWidth: 120 }}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={bulkPerChildPrice[c.id] ?? ""}
                                  onChange={(e) =>
                                    setBulkPerChildPrice((prev) => ({
                                      ...prev,
                                      [c.id]: e.target.value,
                                    }))
                                  }
                                  placeholder={String(defaultPrice)}
                                  disabled={!checked}
                                />
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <hr className="sep" />
            <div className="grid">
              <div style={{ gridColumn: "span 4" }}>
                <div className="muted">عدد الحصص (الباقة)</div>
                <input
                  className="input"
                  type="number"
                  value={bulkSessions}
                  onChange={(e) => setBulkSessions(e.target.value)}
                />
              </div>
              <div style={{ gridColumn: "span 4" }}>
                <div className="muted">طريقة التسعير</div>
                <ModernSelect
                  value={bulkPriceMode}
                  onChange={(v) => {
                    setBulkPriceMode(v);
                    if (v === "unified") setBulkPerChildPrice({});
                  }}
                  menuWidth="trigger"
                  options={[
                    { value: "unified", label: "سعر موحّد للجميع" },
                    { value: "perChild", label: "سعر لكل طفل" },
                  ]}
                />
              </div>
              <div style={{ gridColumn: "span 4" }}>
                <div className="muted">
                  {bulkPriceMode === "unified" ? "سعر الباقة" : "الأسعار"}
                </div>
                {bulkPriceMode === "unified" ? (
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={bulkUnifiedPrice}
                    onChange={(e) => setBulkUnifiedPrice(e.target.value)}
                    placeholder={String(defaultPrice)}
                  />
                ) : (
                  <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                    اكتب السعر لكل طفل داخل الجدول.
                  </div>
                )}
              </div>
              <div
                className="row"
                style={{
                  gridColumn: "span 12",
                  justifyContent: "flex-start",
                  gap: 10,
                  marginTop: 4,
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
                  onClick={() => setOpenBulk(false)}
                >
                  إغلاق
                </button>
              </div>
            </div>
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
            if (type === "deletePayment") await deletePayment(id);
            if (type === "deleteExpense") await deleteExpense(id);
          }}
        />
      </div>
    </div>
  );
}
