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

function fmtMoney(n, digits = 2) {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return (0).toFixed(digits);
  return new Intl.NumberFormat(LOCALE_LATN, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
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
  // YYYY-MM-DD (for <input type="date" />)
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const da = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
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

function badgePayment(status) {
  if (status === "paid") return <Badge variant="ok">مدفوع</Badge>;
  if (status === "partial") return <Badge variant="warn">جزئي</Badge>;
  if (status === "unpaid") return <Badge variant="danger">غير مدفوع</Badge>;
  return <Badge variant="info">مجاني</Badge>;
}

function rowClassByPayment(status) {
  if (status === "paid") return "rowمدفوع";
  if (status === "partial") return "rowPartial";
  if (status === "unpaid") return "rowUnpaid";
  return "";
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const RUN_DETAILS_SOFT_UI_STYLES = `
.page.page--runs {
  background: linear-gradient(180deg, rgba(0, 172, 71, 0.08) 0%, #f7faf8 240px, #f4f6f8 100%) !important;
}

.runDetails {
  padding-block: 22px 40px;
}

.runDetails .card {
  background: #ffffff !important;
  border: 1px solid rgba(15, 23, 42, 0.08) !important;
  border-radius: 22px !important;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04) !important;
}

.runHero {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: 14px 20px;
  margin-bottom: 16px;
}

.runHeroMain {
  grid-column: 2;
  min-width: 0;
}

.runHeroHeaderBar {
  display: flex;
  flex-direction: row-reverse;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  width: 100%;
}

.runHeroTitleGroup {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex: 0 0 auto;
  min-width: 0;
}

.runHeroEyebrow {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  color: rgb(0, 172, 71);
  opacity: 0.95;
}

.runHeroTitleWrap {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  max-width: 100%;
}

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

.runHeroMetaCompact {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: center;
  align-content: flex-start;
  gap: 8px;
  min-width: 0;
  padding-top: 8px;
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

.heroMiniText {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.08;
}

.heroMiniLabel {
  color: rgb(82, 82, 82);
  font-size: 11px;
  font-weight: 700;
}

.heroMiniValue {
  color: rgb(24, 24, 24);
  font-size: 14px;
  font-weight: 900;
  line-height: 1.15;
}

.runHeroSubtext,
.runDetails .statRow {
  display: none !important;
}

.runHeroActions,
.runDetails .topActions {
  grid-column: 1;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  padding-top: 2px;
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

.runInfoGrid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.runInfoItemSoft {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 88px;
}

.runInfoIcon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 172, 71, 0.10);
  border: 1px solid rgba(0, 172, 71, 0.14);
  color: rgb(0, 172, 71);
  flex: 0 0 auto;
}

.runInfoLabel {
  color: rgb(82, 82, 82);
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 6px;
}

.runInfoValue {
  font-size: 21px;
  font-weight: 900;
  line-height: 1.2;
  color: rgb(24, 24, 24);
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

/* التعديل الجديد على الإحصائيات السريعة لتصبح 2x2 ومريحة */
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
  gap: 8px; /* تباعد واضح بين الكلمة والرقم */
}

.runDetails .pStatBlock.primary {
  background: rgba(0, 172, 71, 0.06);
}

.runDetails .pStatLabel {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: rgb(100, 116, 139);
  font-size: 13px;
  font-weight: 700;
  margin: 0;
  white-space: nowrap; /* يمنع الكلمات من النزول لسطر جديد */
}

.runDetails .pStatValue {
  font-size: 18px;
  font-weight: 900;
  line-height: 1;
  color: rgb(15, 23, 42);
}

.runDetails .pStatBlock.primary .pStatValue {
  color: rgb(0, 172, 71);
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

.runDetails .pBar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: rgb(0, 172, 71);
}

.runDetails .pBarPartial span {
  background: rgb(245, 158, 11);
}

.runDetails .pBarUnpaid span {
  background: rgb(239, 68, 68);
}

.runDetails .pBarFree span {
  background: rgb(148, 163, 184);
}

.runDetails .pActions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
}

.runDetails .pActionsLeft {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.runDetails .pActionHint {
  font-size: 12px;
}

.runDetails .sessionRow {
  border-radius: 18px !important;
  border: 1px solid rgba(15, 23, 42, 0.08) !important;
  background: rgba(255, 255, 255, 0.94);
}

.runDetails .tableWrap.inCard {
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 18px;
  overflow: hidden;
}

.runDetails .table thead th {
  background: rgba(248, 250, 252, 1);
  color: rgb(82, 82, 82);
  font-weight: 800;
}

.runDetails .table tbody tr:hover {
  background: rgba(248, 250, 252, 0.75);
}

@media (max-width: 1100px) {
  .runInfoGrid,
  .summaryGridSoft {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .runHero {
    grid-template-columns: 1fr;
  }

  .runHeroMain,
  .runHeroActions,
  .runDetails .topActions {
    grid-column: auto;
  }

  .runHeroHeaderBar {
    flex-direction: column;
    align-items: stretch;
  }

  .runHeroTitleGroup {
    align-items: flex-start;
  }

  .runHeroTitleWrap {
    justify-content: flex-start;
  }

  .runHeroTitle {
    white-space: normal;
    font-size: 24px;
    min-height: 48px;
    padding: 10px 14px;
  }

  .runHeroMetaCompact {
    padding-top: 0;
  }
}

@media (max-width: 820px) {
  .runHeroActions,
  .runDetails .topActions {
    width: 100%;
    justify-content: stretch;
  }

  .runHeroActions .btn,
  .runDetails .topActions .btn {
    flex: 1 1 0;
  }

  .runInfoGrid,
  .summaryGridSoft,
  .runDetails .pQuickStats {
    grid-template-columns: 1fr;
  }

  .runDetails .sessionRow {
    grid-template-columns: 1fr !important;
    justify-items: stretch;
  }

  .runDetails .sessionActions {
    justify-items: stretch !important;
    justify-self: stretch !important;
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
  // ✅ Run expenses (linked to this run)
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

  // Filters
  // Children filters
  const [childSearch, setChildSearch] = useState("");
  const [childStatusFilter, setChildStatusFilter] = useState("all"); // all | active | inactive
  const [childSort, setChildSort] = useState("balance_desc"); // balance_desc | balance_asc | name_asc | name_desc

  // Enroll modal (single)
  const [openEnroll, setOpenEnroll] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [enrollLocked, setEnrollLocked] = useState(false);
  const [enrollLockedName, setEnrollLockedName] = useState("");

  const [buySessions, setBuySessions] = useState(8);
  const [buyPriceTotal, setBuyPriceTotal] = useState("");
  const [buyUnitPrice, setBuyUnitPrice] = useState("");
  const [buyPriceEditMode, setBuyPriceEditMode] = useState("total"); // total | unit

  const [enrollSaving, setEnrollSaving] = useState(false);

  // Create child (inline from this run)
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

  // Quick action: open "Add child" modal and auto-enroll into this run
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
      // non-blocking: we can still create a child without country_id
      setCountries([]);
    } finally {
      setCountriesLoading(false);
    }
  }

  useEffect(() => {
    if (openNewChild) loadCountriesSafe();
  }, [openNewChild]);

  // Package info + mode
  const [pkgInfo, setPkgInfo] = useState(null);
  const [pkgLoading, setPkgLoading] = useState(false);
  const [enrollMode, setEnrollMode] = useState("buy_new"); // use_existing | buy_new

  // Bulk enroll
  const [openBulk, setOpenBulk] = useState(false);
  const [bulkQ, setBulkQ] = useState("");
  const [bulkSelected, setBulkSelected] = useState({});
  const [bulkSessions, setBulkSessions] = useState(8);

  const [bulkPriceMode, setBulkPriceMode] = useState("unified"); // unified | perChild
  const [bulkUnifiedPrice, setBulkUnifiedPrice] = useState("");
  const [bulkPerChildPrice, setBulkPerChildPrice] = useState({});
  const [bulkSaving, setBulkSaving] = useState(false);

  // Edit package price modal
  const [openPrice, setOpenPrice] = useState(false);
  const [pricePackageId, setPricePackageId] = useState(null);
  const [priceValue, setPriceValue] = useState("");

  // Payments modal
  const [openPay, setOpenPay] = useState(false);
  const [payEnrollmentId, setPayEnrollmentId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payNote, setPayNote] = useState("");
  const [paySaving, setPaySaving] = useState(false);
  const [payEditId, setPayEditId] = useState(null);
  const [payLocked, setPayLocked] = useState(false);

  // Payment history modal
  const [openHistory, setOpenHistory] = useState(false);
  const [historyEnrollment, setHistoryEnrollment] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Sessions generator
  const [firstStart, setFirstStart] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [count, setCount] = useState(8);
  const [intervalDays, setIntervalDays] = useState(7);
  const [genLoading, setGenLoading] = useState(false);

  // Create/edit session modal
  const [openSession, setOpenSession] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    id: null,
    start_at: "",
    end_at: "",
    // For workshop: duration can be set per session in the modal.
    duration_min: 60,
    status: "scheduled",
  });
  const [sessionSaving, setSessionSaving] = useState(false);

  // Adjust Sessions modal
  const [openAdjust, setOpenAdjust] = useState(false);
  const [adjEnrollmentId, setAdjEnrollmentId] = useState(null);
  const [adjPackageId, setAdjPackageId] = useState(null);
  const [adjChildName, setAdjChildName] = useState("");
  const [adjAllocatedNow, setAdjAllocatedNow] = useState(0);
  const [adjحضر, setAdjحضر] = useState(0);
  const [adjPkgالمتبقي, setAdjPkgالمتبقي] = useState(0);
  const [adjRunFuture, setAdjRunFuture] = useState(0);
  const [adjMaxAllowed, setAdjMaxAllowed] = useState(0);
  const [adjNewAllocated, setAdjNewAllocated] = useState(0);
  const [adjPkgDelta, setAdjPkgDelta] = useState(0);
  const [adjSaving, setAdjSaving] = useState(false);

  // ✅ إدارة Enrollment (single child in this run) — 8
  const [openإدارة, setOpenإدارة] = useState(false);
  const [manageP, setإدارةP] = useState(null);

  const manageHasPayments = useMemo(
    () => Number(manageP?.paid_amount || 0) > 0,
    [manageP],
  );

  // Confirm
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

  // Default sessions to add when enrolling (prefer run's configured default, then sessions_count)
  const defaultSessionsTotal = useMemo(() => {
    const raw =
      summary?.default_sessions_total ??
      summary?.default_sessions ??
      summary?.sessions_total ??
      summary?.package_sessions_total ??
      summary?.sessions_count ??
      null;

    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);

    // Fallback: if sessions already exist, use their count
    if (Array.isArray(sessions) && sessions.length > 0) return sessions.length;

    return 8;
  }, [summary, sessions]);

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

  async function createChildInline({ enrollNow = false } = {}) {
    const name = (newChildForm.name || "").trim();
    const ageNum = Number(String(newChildForm.age ?? "").trim());
    const hasAge = Number.isFinite(ageNum) && ageNum >= 0 && ageNum <= 120;
    if (!name || !hasAge) {
      toast("Name and age are required.", "warn");
      return;
    }

    setNewChildSaving(true);
    setError(null);

    try {
      let countryId = newChildForm.country_id
        ? Number(newChildForm.country_id)
        : null;

      // If user typed a new country/city name, create (or reuse) it and use its id.
      const newCountryName = (newChildForm.new_country_name || "").trim();
      if (newCountryName) {
        // Try find existing
        const existing = await supabase
          .from("countries")
          .select("id")
          .eq("name", newCountryName)
          .maybeSingle();
        if (existing.error && existing.status !== 406) throw existing.error;

        if (existing.data?.id) {
          countryId = existing.data.id;
        } else {
          const created = await supabase
            .from("countries")
            .insert([{ name: newCountryName }])
            .select("id")
            .single();
          if (created.error) throw created.error;
          countryId = created.data?.id ?? countryId;
        }

        // refresh dropdown list (best-effort)
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
      // refresh children list
      const ch = await loadChildrenSafe();
      setChildren(ch);

      setSelectedChildId(String(newId || ""));
      setOpenNewChild(false);

      // If user wants immediate enroll, keep the enroll modal open.
      if (enrollNow && newId) {
        initEnrollBuyNew({ childId: newId });
        toast("Child created. Set sessions and click Save to enroll.", "ok");
      } else {
        toast("Child created.", "ok");
      }

      // reset
      setNewChildForm({
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
    } catch (e) {
      setError(e);
      toast("Failed to create child.", "danger");
    } finally {
      setNewChildSaving(false);
    }
  }

  async function purchaseAndEnrollSpecificChild(childId) {
    if (!summary) return;
    const sessionsToBuy = Number(buySessions);
    if (!Number.isFinite(sessionsToBuy) || sessionsToBuy <= 0) {
      toast("Sessions must be greater than 0.", "warn");
      return;
    }
    const priceNum = buyPriceTotal === "" ? 0 : Number(buyPriceTotal);
    const rpc2 = await supabase.rpc("purchase_sessions_and_enroll", {
      p_run_id: Number(runId),
      p_child_id: Number(childId),
      p_sessions: sessionsToBuy,
      p_price_total: Number.isFinite(priceNum) ? priceNum : 0,
    });
    if (rpc2.error) throw rpc2.error;

    toast("Child enrolled successfully.", "ok");
    setOpenEnroll(false);
    await loadFixed();
    setTab("participants");
  }

  // ============================
  // Run expenses
  // ============================
  function resetExpenseForm() {
    setExpenseEditId(null);
    setExpDate(isoDate(new Date()));
    setExpAmount("");
    setExpCategory("");
    setExpParty("");
    setExpDesc("");
    setNewCatName("");
    setNewPartyName("");
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

      if (cRes.error) throw cRes.error;

      const pRes = await supabase
        .from("expense_parties")
        .select("name")
        .order("name", { ascending: true });

      if (pRes.error) throw pRes.error;

      setExpCatOptions((cRes.data ?? []).map((r) => r.name));
      setExpPartyOptions((pRes.data ?? []).map((r) => r.name));
      setExpHasPicklists(true);
    } catch (e) {
      const msg = String(e?.message || "").toLowerCase();
      if (msg.includes("does not exist")) setExpHasPicklists(false);
    }
  }

  async function loadRunExpensesSafe() {
    try {
      const res = await supabase
        .from("expenses")
        .select("id,spent_on,amount,category,party,description,created_at")
        .eq("run_id", Number(runId))
        .order("spent_on", { ascending: false })
        .order("id", { ascending: false });

      if (res.error) throw res.error;

      setExpenses(res.data ?? []);
      setExpFeatureAvailable(true);
    } catch (e) {
      const msg = String(e?.message || "").toLowerCase();

      // If migration not applied yet, don't fail the whole screen
      if (msg.includes("column") && msg.includes("run_id")) {
        setExpFeatureAvailable(false);
        setExpenses([]);
        return;
      }

      setExpFeatureAvailable(true);
      setExpenses([]);
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
      const ins = await supabase.from(table).insert({ name: clean });
      if (ins.error) {
        // Ignore duplicates
        const m = String(ins.error.message || "").toLowerCase();
        if (!m.includes("duplicate") && !m.includes("unique")) throw ins.error;
      }
      setter(clean);
      inputSetter("");
      await loadExpensePicklistsSafe();
      toast("Saved.", "ok");
    } catch (e) {
      toast("Failed to save.", "danger");
    }
  }

  async function saveExpense() {
    if (!expFeatureAvailable) {
      toast("Please apply the DB migration first.", "danger");
      return;
    }

    const amt = Number(expAmount);
    if (!expDate || !Number.isFinite(amt) || amt <= 0) {
      toast("Please enter a valid date and amount.", "danger");
      return;
    }

    setExpSaving(true);
    setError(null);

    const payload = {
      spent_on: expDate,
      amount: amt,
      category: expCategory?.trim() || null,
      party: expParty?.trim() || null,
      description: expDesc?.trim() || null,
      run_id: Number(runId),
    };

    try {
      if (expenseEditId) {
        const up = await supabase
          .from("expenses")
          .update(payload)
          .eq("id", expenseEditId);
        if (up.error) throw up.error;
        toast("Saved.", "ok");
      } else {
        const ins = await supabase.from("expenses").insert(payload);
        if (ins.error) throw ins.error;
        toast("Added.", "ok");
      }

      setOpenExpenseModal(false);
      resetExpenseForm();
      await loadRunExpensesSafe();
    } catch (e) {
      setError(e);
      toast("Failed to save.", "danger");
    } finally {
      setExpSaving(false);
    }
  }

  async function deleteExpense(id) {
    try {
      const del = await supabase.from("expenses").delete().eq("id", id);
      if (del.error) throw del.error;
      toast("Deleted.", "ok");
      await loadRunExpensesSafe();
    } catch (e) {
      toast("Failed to delete.", "danger");
    }
  }

  // ========= load =========
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
        setParticipants([]);
        setSessions([]);
        setChildren([]);
        setPayments([]);
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
      const part = p.data ?? [];
      setParticipants(part);

      const ses = await supabase
        .from("course_sessions")
        .select("*")
        .eq("run_id", runId)
        .order("start_at", { ascending: true });
      if (ses.error) throw ses.error;
      setSessions(ses.data ?? []);

      const ch = await loadChildrenSafe();
      setChildren(ch);

      // Payments related to packages من kids in this run
      const pkgMap = new Map();
      const pkgIds = [];
      for (const r of part) {
        if (r.package_id) {
          pkgMap.set(r.package_id, {
            child_id: r.child_id,
            child_name: r.child_name,
          });
          pkgIds.push(r.package_id);
        }
      }
      const uniqPkgIds = Array.from(new Set(pkgIds));

      if (uniqPkgIds.length === 0) {
        setPayments([]);
      } else {
        const payRes = await supabase
          .from("payments")
          .select("id,package_id,enrollment_id,amount,method,note,created_at")
          .in("package_id", uniqPkgIds)
          .order("created_at", { ascending: false });

        if (payRes.error) throw payRes.error;

        const enriched = (payRes.data ?? []).map((x) => ({
          ...x,
          child_id: pkgMap.get(x.package_id)?.child_id ?? null,
          child_name: pkgMap.get(x.package_id)?.child_name ?? "—",
        }));
        setPayments(enriched);
      }

      await loadRunExpensesSafe();

      setLoading(false);
    } catch (e) {
      setError(e);
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFixed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  useEffect(() => {
    loadExpensePicklistsSafe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ ( /Edit) manageP stale
  useEffect(() => {
    if (!openإدارة || !manageP) return;
    const updated = participants.find(
      (x) => Number(x.enrollment_id) === Number(manageP.enrollment_id),
    );
    if (updated) setإدارةP(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants]);

  const expCategories = useMemo(() => {
    if (expHasPicklists && expCatOptions.length)
      return uniqSorted(expCatOptions);
    return uniqSorted(expenses.map((r) => r.category));
  }, [expHasPicklists, expCatOptions, expenses]);

  const expParties = useMemo(() => {
    if (expHasPicklists && expPartyOptions.length)
      return uniqSorted(expPartyOptions);
    return uniqSorted(expenses.map((r) => r.party));
  }, [expHasPicklists, expPartyOptions, expenses]);

  const expensesFiltered = useMemo(() => {
    let list = [...expenses];
    const s = expQ.trim().toLowerCase();
    if (s) {
      list = list.filter((r) => {
        const a = String(r.category || "").toLowerCase();
        const b = String(r.party || "").toLowerCase();
        const c = String(r.description || "").toLowerCase();
        return a.includes(s) || b.includes(s) || c.includes(s);
      });
    }
    if (expCatFilter !== "all")
      list = list.filter((r) => String(r.category || "") === expCatFilter);
    if (expPartyFilter !== "all")
      list = list.filter((r) => String(r.party || "") === expPartyFilter);
    return list;
  }, [expenses, expQ, expCatFilter, expPartyFilter]);

  const runExpensesTotal = useMemo(() => {
    return expenses.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  }, [expenses]);

  const runFutureSessionsCount = useMemo(() => {
    const now = new Date();
    return sessions.filter(
      (s) => s.status === "scheduled" && new Date(s.start_at) >= now,
    ).length;
  }, [sessions]);

  const nextSession = useMemo(() => {
    const now = new Date();
    const upcoming = sessions.find(
      (s) => s.status === "scheduled" && new Date(s.start_at) >= now,
    );
    return upcoming || sessions.find((s) => s.status === "scheduled") || null;
  }, [sessions]);

  const scheduleInfo = useMemo(() => {
    if (!sessions || sessions.length === 0) {
      return { weekday: "—", timeRange: "—" };
    }
    const s0 = sessions[0];
    return {
      weekday: fmtWeekday(s0.start_at),
      timeRange: `${fmtTimeHM(s0.start_at)}–${fmtTimeHM(s0.end_at)}`,
    };
  }, [sessions]);

  const runHeaderTitle = useMemo(() => {
    const main = String(summary?.title || "").trim();
    const sub = String(summary?.label || "").trim();
    if (main && sub && main !== sub) return `${main} - ${sub}`;
    return main || sub || "—";
  }, [summary]);

  const totals = useMemo(() => {
    const active = participants.filter((p) => p.enrollment_status === "active");
    const agreed = active.reduce(
      (acc, p) => acc + Number(p.agreed_price || 0),
      0,
    );
    const paid = active.reduce((acc, p) => acc + Number(p.paid_amount || 0), 0);
    const balance = active.reduce((acc, p) => acc + Number(p.balance || 0), 0);
    const paidRatio = agreed === 0 ? 0 : paid / agreed;
    return { activeCount: active.length, agreed, paid, balance, paidRatio };
  }, [participants]);

  const availableChildren = useMemo(() => {
    // Allow re-enrolling kids that were previously withdrawn from this run:
    // only treat ACTIVE enrollments as "enrolled".
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
    if (s) {
      list = list.filter((p) =>
        String(p.child_name ?? "")
          .toLowerCase()
          .includes(s),
      );
    }

    // Hide withdrawn enrollments by default
    list = list.filter((p) => p.enrollment_status !== "withdrawn");

    if (childStatusFilter !== "all") {
      list = list.filter((p) => {
        const isActive = p.enrollment_status === "active";
        return childStatusFilter === "active" ? isActive : !isActive;
      });
    }

    if (childSort === "balance_desc") {
      list.sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0));
    } else if (childSort === "balance_asc") {
      list.sort((a, b) => Number(a.balance || 0) - Number(b.balance || 0));
    } else if (childSort === "name_asc") {
      list.sort((a, b) =>
        String(a.child_name ?? "").localeCompare(
          String(b.child_name ?? ""),
          "en",
        ),
      );
    } else if (childSort === "name_desc") {
      list.sort((a, b) =>
        String(b.child_name ?? "").localeCompare(
          String(a.child_name ?? ""),
          "en",
        ),
      );
    }
    return list;
  }, [participants, childSearch, childStatusFilter, childSort]);

  // ✅ Child: children
  const manageChild = useMemo(() => {
    if (!manageP) return null;
    return (
      children.find((c) => Number(c.id) === Number(manageP.child_id)) ?? null
    );
  }, [manageP, children]);

  function openإدارةFor(p) {
    setإدارةP(p);
    setOpenإدارة(true);
  }

  // ============================
  // Enroll modal: pkg balance fetch
  // ============================
  useEffect(() => {
    async function fetchPkg() {
      if (!openEnroll || !summary) return;

      if (!selectedChildId) {
        setPkgInfo(null);
        // setEnrollMode("auto");
        return;
      }

      setPkgLoading(true);
      try {
        const res = await supabase
          .from("package_balance_view")
          .select(
            "package_id,course_id,child_id,sessions_total,price_total,paid_amount,balance_amount,sessions_remaining",
          )
          .eq("course_id", Number(summary.template_id))
          .eq("child_id", Number(selectedChildId))
          .limit(1);

        if (res.error) throw res.error;

        const row = res.data?.[0] ?? null;
        setPkgInfo(row);

        if (row && Number(row.sessions_remaining) > 0)
          setEnrollMode("use_existing");
        else setEnrollMode("buy_new");
      } catch {
        setPkgInfo(null);
        setEnrollMode("buy_new");
      } finally {
        setPkgLoading(false);
      }
    }

    fetchPkg();
  }, [openEnroll, selectedChildId, summary]);

  const singlePreview = useMemo(() => {
    const runFuture = runFutureSessionsCount;

    if (enrollMode === "use_existing" && pkgInfo) {
      const rem = Number(pkgInfo.sessions_remaining || 0);
      const allocNow = Math.min(rem, runFuture);
      const carry = Math.max(0, rem - allocNow);
      return { runFuture, allocNow, carry, mode: "existing" };
    }

    const s = Number(buySessions || 0);
    const allocNow = Math.min(s, runFuture);
    const carry = Math.max(0, s - allocNow);
    return { runFuture, allocNow, carry, mode: "buy" };
  }, [enrollMode, pkgInfo, buySessions, runFutureSessionsCount]);

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

  // + sessions: always buy new for same child
  function openSingleTopup(participantRow) {
    setEnrollLocked(true);
    setEnrollLockedName(participantRow.child_name);
    setSelectedChildId(String(participantRow.child_id));
    const s1 = 1;
    const alloc = Number(participantRow.sessions_allocated || 0);
    const agreed = Number(participantRow.agreed_price || 0);
    const u =
      alloc > 0
        ? agreed / alloc
        : Number(defaultPrice || 0) /
          Math.max(1, Number(defaultSessionsTotal || 0));
    setBuySessions(s1);
    setBuyUnitPrice(Number.isFinite(u) && u > 0 ? u.toFixed(2) : "");
    setBuyPriceTotal(Number.isFinite(u) && u > 0 ? (s1 * u).toFixed(2) : "");
    setBuyPriceEditMode("unit");
    setEnrollMode("buy_new");
    setOpenEnroll(true);
  }

  const bulkCandidates = useMemo(() => {
    const s = bulkQ.trim().toLowerCase();
    if (!s) return availableChildren;
    return availableChildren.filter((c) =>
      (c.name ?? "").toLowerCase().includes(s),
    );
  }, [availableChildren, bulkQ]);

  const bulkSelectedIds = useMemo(() => {
    return Object.keys(bulkSelected)
      .filter((id) => bulkSelected[id])
      .map(Number);
  }, [bulkSelected]);

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
      const key = String(childId);
      next[key] = !next[key];
      if (!next[key]) {
        setBulkPerChildPrice((p) => {
          const nn = { ...p };
          delete nn[childId];
          delete nn[key];
          return nn;
        });
      }
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

  // Some environments don't have the RPC `adjust_enrollment_allocated_sessions`.
  // We try RPC first, and if it's missing we fall back to a direct update.
  async function bumpEnrollmentAllocated(enrollmentId, delta) {
    const id = Number(enrollmentId);
    const d = Number(delta);
    if (!Number.isFinite(id) || !Number.isFinite(d) || d === 0) return;

    // Read once so we can pass the correct RPC parameter (p_new_allocated)
    const cur = await supabase
      .from("enrollments")
      .select("sessions_allocated")
      .eq("id", id)
      .maybeSingle();

    if (cur.error) throw cur.error;

    const current = Number(cur.data?.sessions_allocated ?? 0);
    const next = Math.max(0, current + d);

    // 1) Try RPC (if exists)
    const rpc = await supabase.rpc("adjust_enrollment_allocated_sessions", {
      p_enrollment_id: id,
      p_new_allocated: next,
    });

    if (!rpc.error) return;

    // If RPC is missing / signature mismatch, fall back to direct update.
    const msg = String(rpc.error?.message ?? "");
    const shouldFallback =
      msg.includes("Could not find the function") ||
      msg.includes("schema cache") ||
      msg.includes("No function matches") ||
      msg.includes("does not exist");

    if (!shouldFallback) throw rpc.error;

    const upd = await supabase
      .from("enrollments")
      .update({ sessions_allocated: next })
      .eq("id", id);

    if (upd.error) throw upd.error;
  }

  async function reactivateWithdrawnEnrollment(childId) {
    // If the child was previously removed (withdrawn) from this run,
    // we "reactivate" the SAME enrollment (unique constraint uq_run_child),
    // but we still allow setting a NEW price and "fresh" add-sessions inputs.
    const existing = participants.find(
      (p) =>
        Number(p.child_id) === Number(childId) &&
        p.enrollment_status === "withdrawn",
    );
    if (!existing) return false;

    const sessionsToBuyRaw = Number(buySessions);
    const sessionsToBuy = Number.isFinite(sessionsToBuyRaw)
      ? sessionsToBuyRaw
      : 0;

    const priceTotalNum = (() => {
      const s =
        Number.isFinite(sessionsToBuy) && sessionsToBuy > 0 ? sessionsToBuy : 0;

      if (buyPriceEditMode === "unit") {
        const u = buyUnitPrice === "" ? 0 : Number(buyUnitPrice);
        return Number.isFinite(u) ? u * s : 0;
      }

      const t = buyPriceTotal === "" ? 0 : Number(buyPriceTotal);
      return Number.isFinite(t) ? t : 0;
    })();

    try {
      setError(null);

      // 1) Reactivate enrollment
      const upd = await supabase
        .from("enrollments")
        .update({ status: "active" })
        .eq("id", existing.enrollment_id);
      if (upd.error) throw upd.error;

      // 2) Re-open + UPDATE package price (so re-enroll can have a NEW price)
      if (existing.package_id) {
        const pkgUpd = await supabase
          .from("course_packages")
          .update({ status: "active", price_total: priceTotalNum })
          .eq("id", existing.package_id);
        if (pkgUpd.error) throw pkgUpd.error;

        // إضافة جلسةs back to the package total (keeps sessions_used consistent)
        if (sessionsToBuy > 0) {
          const rpcPkg = await supabase.rpc("adjust_package_sessions_total", {
            p_package_id: Number(existing.package_id),
            p_delta: Number(sessionsToBuy),
          });
          if (rpcPkg.error) throw rpcPkg.error;
        }
      }

      // 3) Allocate sessions for THIS run enrollment (so run balance matches)
      if (sessionsToBuy > 0) {
        await bumpEnrollmentAllocated(existing.enrollment_id, sessionsToBuy);
        toast("Child re-enrolled successfully.", "ok");
      } else {
        toast("Enrollment re-activated. إضافة جلسةs then click Save.", "ok");
      }

      setOpenEnroll(false);
      await loadFixed();
      setTab("participants");
      return true;
    } catch (e) {
      setError(e);
      toast("Failed to re-enroll child.", "danger");
      return true;
    }
  }

  async function reactivateWithdrawnEnrollmentBulk(
    childId,
    sessionsToBuy,
    priceTotalNum,
  ) {
    // Bulk-safe variant من reactivateWithdrawnEnrollment:
    // uses explicit sessions/price (does NOT depend on the single-enroll modal state).
    const existing = participants.find(
      (p) =>
        Number(p.child_id) === Number(childId) &&
        p.enrollment_status === "withdrawn",
    );
    if (!existing) return false;

    const sRaw = Number(sessionsToBuy);
    const s = Number.isFinite(sRaw) ? sRaw : 0;
    const priceRaw = Number(priceTotalNum);
    const priceTotal = Number.isFinite(priceRaw) ? priceRaw : 0;

    try {
      // 1) Reactivate enrollment row
      const upd = await supabase
        .from("enrollments")
        .update({ status: "active" })
        .eq("id", existing.enrollment_id);
      if (upd.error) throw upd.error;

      // 2) Reactivate + update package (optional)
      if (existing.package_id) {
        const pkgUpd = await supabase
          .from("course_packages")
          .update({ status: "active", price_total: priceTotal })
          .eq("id", existing.package_id);
        if (pkgUpd.error) throw pkgUpd.error;

        if (s > 0) {
          const rpcPkg = await supabase.rpc("adjust_package_sessions_total", {
            p_package_id: Number(existing.package_id),
            p_delta: Number(s),
          });
          if (rpcPkg.error) throw rpcPkg.error;
        }
      }

      // 3) Allocate sessions on the enrollment
      if (s > 0) {
        await bumpEnrollmentAllocated(existing.enrollment_id, s);
      }

      return true;
    } catch (e) {
      // Don't toast here (bulk flow will summarize). Bubble a boolean + let caller setError if needed.
      console.error("Bulk reactivation failed:", e);
      return false;
    }
  }

  async function purchaseAndEnrollSingle() {
    if (!summary) return;
    if (!selectedChildId) {
      toast("Select a child.", "warn");
      return;
    }

    setEnrollSaving(true);
    setError(null);

    try {
      if (enrollMode === "use_existing") {
        const remaining = Number(pkgInfo?.sessions_remaining ?? 0);
        if (remaining <= 0) {
          toast(
            "This child has no existing credits. Please choose ‘Buy new sessions’.",
            "warn",
          );
          setEnrollSaving(false);
          return;
        }
        const rpc = await supabase.rpc("enroll_from_existing_package", {
          p_run_id: Number(runId),
          p_child_id: Number(selectedChildId),
        });

        if (rpc.error) {
          const msg = String(rpc.error?.message || rpc.error || "");
          // If the child has a withdrawn enrollment, we can't insert a new row
          // due to uq_run_child. Reactivate instead.
          if (msg.includes("uq_run_child") || msg.includes("duplicate key")) {
            await reactivateWithdrawnEnrollment(selectedChildId);
            return;
          }

          toast("No remaining sessions found for this child.", "warn");
          setError(rpc.error);
          return;
        } else {
          toast("Enrolled using existing balance.", "ok");
          setOpenEnroll(false);
          await loadFixed();
          setTab("participants");
          return;
        }
      }
      // buy_new
      // If previously removed (withdrawn), re-activate instead من inserting a new enrollment.
      const handled = await reactivateWithdrawnEnrollment(selectedChildId);
      if (handled) return;

      await purchaseAndEnrollSpecificChild(selectedChildId);
    } catch (e) {
      const msg = String(e?.message || e || "");
      // ✅
      if (msg.includes("uq_run_child") || msg.includes("duplicate key value")) {
        const existing = participants.find(
          (x) => Number(x.child_id) === Number(selectedChildId),
        );

        // If the existing enrollment is withdrawn, allow re-enroll
        if (existing?.enrollment_status === "withdrawn") {
          await reactivateWithdrawnEnrollment(selectedChildId);
          return;
        }

        toast("This child is already enrolled in this run.", "warn");

        if (existing) {
          setOpenEnroll(false);
          openإدارةFor(existing);
          return;
        }

        // Local list may be stale; refresh and stop here (avoid generic failure toast)
        setOpenEnroll(false);
        await loadFixed();
        return;
      }

      setError(e);
      toast("Operation failed.", "danger");
    } finally {
      setEnrollSaving(false);
    }
  }

  function isDuplicateRunChildError(err) {
    const code = String(err?.code ?? "");
    const msg = String(err?.message ?? err ?? "");
    // Postgres unique violation is 23505
    if (code === "23505") return true;
    return msg.includes("uq_run_child") || msg.includes("duplicate key");
  }

  async function bulkPurchaseAndEnroll() {
    if (!summary) return;
    if (bulkSelectedCount === 0) {
      toast("Select children first.", "warn");
      return;
    }

    const sessionsToBuy = Number(bulkSessions);
    if (!Number.isFinite(sessionsToBuy) || sessionsToBuy <= 0) {
      toast("Sessions must be greater than 0.", "warn");
      return;
    }

    setBulkSaving(true);
    setError(null);

    try {
      // Build a quick lookup for existing run enrollment status per child
      const statusByChild = new Map();
      for (const p of participants || []) {
        const cid = Number(p.child_id);
        if (!Number.isFinite(cid)) continue;
        statusByChild.set(cid, p.enrollment_status);
      }

      let added = 0;
      let reactivated = 0;
      let skipped = 0;
      let failed = 0;

      for (const childId of bulkSelectedIds) {
        const cid = Number(childId);
        if (!Number.isFinite(cid)) continue;

        // compute price per child
        let priceNum = 0;
        if (bulkPriceMode === "unified") {
          priceNum = bulkUnifiedPrice === "" ? 0 : Number(bulkUnifiedPrice);
        } else {
          const v = bulkPerChildPrice[cid];
          priceNum = v === undefined || v === null || v === "" ? 0 : Number(v);
        }
        priceNum = Number.isFinite(priceNum) ? priceNum : 0;

        const existingStatus = statusByChild.get(cid);

        // Already enrolled (active/pending/etc) -> skip silently (avoid uq_run_child)
        if (existingStatus && existingStatus !== "withdrawn") {
          skipped += 1;
          continue;
        }

        // Withdrawn -> reactivate instead من inserting a new row
        if (existingStatus === "withdrawn") {
          const ok = await reactivateWithdrawnEnrollmentBulk(
            cid,
            sessionsToBuy,
            priceNum,
          );
          if (ok) {
            reactivated += 1;
          } else {
            failed += 1;
          }
          continue;
        }

        // Not enrolled -> attempt normal purchase+enroll
        const rpc2 = await supabase.rpc("purchase_sessions_and_enroll", {
          p_run_id: Number(runId),
          p_child_id: cid,
          p_sessions: sessionsToBuy,
          p_price_total: priceNum,
        });

        if (rpc2.error) {
          // If we raced with another request, handle duplicate gracefully
          if (isDuplicateRunChildError(rpc2.error)) {
            // Try to reactivate if it was withdrawn, otherwise skip
            const ok = await reactivateWithdrawnEnrollmentBulk(
              cid,
              sessionsToBuy,
              priceNum,
            );
            if (ok) reactivated += 1;
            else skipped += 1;
          } else {
            failed += 1;
            // Keep the first error for debugging
            setError((prev) => prev || rpc2.error);
          }
          continue;
        }

        added += 1;
      }

      // تحديث run state
      await loadFixed();
      setTab("participants");

      // Toast summary
      if (failed > 0) {
        toast(
          `Bulk enroll finished: added ${added}, reactivated ${reactivated}, skipped ${skipped}, failed ${failed}.`,
          "danger",
        );
        // keep modal open so user can retry / adjust selections
        return;
      }

      const level = skipped > 0 ? "warn" : "ok";
      toast(
        `Bulk enroll finished: added ${added}, reactivated ${reactivated}, skipped ${skipped}.`,
        level,
      );

      setOpenBulk(false);
      setBulkQ("");
      setBulkSelected({});
      setBulkSessions(defaultSessionsTotal);
      setBulkPriceMode("unified");
      setBulkUnifiedPrice(String(defaultPrice));
      setBulkPerChildPrice({});
    } catch (e) {
      setError(e);
      toast("Bulk enroll failed.", "danger");
    } finally {
      setBulkSaving(false);
    }
  }

  async function updatePackagePrice() {
    setError(null);
    try {
      const u = await supabase
        .from("course_packages")
        .update({ price_total: Number(priceValue) })
        .eq("id", pricePackageId);

      if (u.error) throw u.error;

      toast("تم تحديث الاشتراك.", "ok");
      setOpenPrice(false);
      setPricePackageId(null);
      setPriceValue("");
      await loadFixed();
    } catch (e) {
      setError(e);
      toast("فشل تعديل الاشتراك.", "danger");
    }
  }

  async function setEnrollmentStatus(enrollmentId, status) {
    setError(null);
    const u = await supabase
      .from("enrollments")
      .update({ status })
      .eq("id", enrollmentId);
    if (u.error) {
      setError(u.error);
      toast("Failed to update enrollment status.", "danger");
      return;
    }
    toast("Session status updated.", "ok");
    await loadFixed();
  }

  async function deleteEnrollment(enrollmentId, childName, packageId) {
    // Remove the child from this run without deleting the child record or payments.
    setError(null);

    try {
      // ✅ منع حذف/سحب اشتراك إذا فيه دفعات مرتبطة
      const payCheck = await supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("enrollment_id", enrollmentId);

      if (!payCheck.error && (payCheck.count || 0) > 0) {
        toast(
          "لا يمكن حذف هذا الطفل من الدورة لأنه توجد له دفعات مسجّلة داخل هذه الدورة.",
          "warn",
        );
        return;
      }
      // 1) Mark enrollment as withdrawn (so it disappears from active participants)
      const updEnroll = await supabase
        .from("enrollments")
        .update({ status: "withdrawn", sessions_allocated: 0 })
        .eq("id", enrollmentId);

      if (updEnroll.error) throw updEnroll.error;

      // 2) Close the package by setting sessions_total = sessions_used (remaining becomes 0)
      if (packageId) {
        const bal = await supabase
          .from("package_balance_view")
          .select("sessions_used")
          .eq("package_id", packageId)
          .maybeSingle();

        if (!bal.error) {
          const used = Number(bal.data?.sessions_used ?? 0);
          await supabase
            .from("course_packages")
            .update({ sessions_total: used, status: "closed" })
            .eq("id", packageId);
        }
      }

      toast(
        `Removed ${childName} from this course. المتبقي sessions set to 0.`,
        "ok",
      );
      await loadFixed();
    } catch (e) {
      setError(e);
      toast("Failed to remove enrollment.", "danger");
    }
  }

  async function generateSessions() {
    if (!firstStart) {
      toast("Please choose a first session date/time.", "warn");
      return;
    }

    setGenLoading(true);
    setError(null);
    try {
      const iso = new Date(firstStart).toISOString();
      const rpc = await supabase.rpc("generate_weekly_sessions_for_run", {
        p_run_id: Number(runId),
        p_first_start: iso,
        p_duration_minutes: Number(durationMinutes),
        p_count: Number(count),
        p_interval_days: Number(intervalDays),
      });
      if (rpc.error) throw rpc.error;

      toast("Sessions generated.", "ok");
      await loadFixed();
      setTab("sessions");
    } catch (e) {
      setError(e);
      toast("Failed to generate sessions.", "danger");
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
    const startLocal = new Date(s.start_at);
    const endLocal = new Date(s.end_at);

    const toLocalInput = (d) => {
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours(),
      )}:${pad(d.getMinutes())}`;
    };

    setSessionForm({
      id: s.id,
      start_at: toLocalInput(startLocal),
      end_at: toLocalInput(endLocal),
      duration_min:
        Math.max(
          1,
          Math.round((endLocal.getTime() - startLocal.getTime()) / 60000),
        ) ||
        Number(durationMinutes) ||
        60,
      status: s.status,
    });
    setOpenSession(true);
  }

  async function saveSession() {
    if (!summary) return;
    if (!sessionForm.start_at) {
      toast("Please choose a session date/time.", "warn");
      return;
    }

    const startLocal = new Date(sessionForm.start_at);
    // If date-only (YYYY-MM-DD), set local midnight.
    if (String(sessionForm.start_at).length === 10)
      startLocal.setHours(0, 0, 0, 0);

    const durationMin = isWorkshop
      ? Number(sessionForm.duration_min) || Number(durationMinutes) || 60
      : Number(durationMinutes) || 60;
    const endLocal = new Date(startLocal.getTime() + durationMin * 60 * 1000);

    setSessionSaving(true);
    setError(null);
    try {
      const payload = {
        run_id: Number(runId),
        course_id: Number(summary.template_id),
        start_at: startLocal.toISOString(),
        end_at: endLocal.toISOString(),
        status: sessionForm.status,
      };

      if (sessionForm.id) {
        const u = await supabase
          .from("course_sessions")
          .update(payload)
          .eq("id", sessionForm.id);
        if (u.error) throw u.error;
        toast("تم تحديث الاشتراك.", "ok");
      } else {
        const ins = await supabase.from("course_sessions").insert([payload]);
        if (ins.error) throw ins.error;
        toast("Session added.", "ok");
      }

      setOpenSession(false);
      await loadFixed();
      setTab("sessions");
    } catch (e) {
      setError(e);
      toast("Failed to save session.", "danger");
    } finally {
      setSessionSaving(false);
    }
  }

  async function setSessionStatus(sessionId, status) {
    const u = await supabase
      .from("course_sessions")
      .update({ status })
      .eq("id", sessionId);
    if (u.error) {
      setError(u.error);
      toast("Failed to update session status.", "danger");
      return;
    }
    toast("Session status updated.", "ok");
    await loadFixed();
  }

  async function deleteSession(sessionId) {
    const d = await supabase
      .from("course_sessions")
      .delete()
      .eq("id", sessionId);
    if (d.error) {
      setError(d.error);
      toast("Failed to delete payment.", "danger");
      return;
    }
    toast("Session deleted.", "ok");
    await loadFixed();
  }

  function openPaymentModalFor(participantRow, mode = "remaining") {
    setPayEnrollmentId(String(participantRow.enrollment_id));
    setPayLocked(true);
    setPayEditId(null);
    const remaining = Number(participantRow.balance || 0);
    if (mode === "remaining")
      setPayAmount(remaining > 0 ? String(remaining.toFixed(2)) : "");
    else setPayAmount("");
    setPayMethod("cash");
    setPayNote("");
    setOpenPay(true);
  }

  function openNewPaymentModal() {
    setPayEditId(null);
    setPayLocked(false);
    setPayEnrollmentId("");
    setPayAmount("");
    setPayMethod("cash");
    setPayNote("");
    setOpenPay(true);
  }

  function openEditPayment(paymentRow) {
    setPayEditId(paymentRow.id);
    setPayEnrollmentId(String(paymentRow.enrollment_id ?? ""));
    setPayLocked(true);
    const amt = paymentRow.amount != null ? Number(paymentRow.amount) : 0;
    setPayAmount(amt ? String(amt.toFixed(2)) : "");
    setPayMethod(paymentRow.method || "cash");
    setPayNote(paymentRow.note || "");
    setOpenPay(true);
  }

  function paymentMethodLabel(v) {
    switch (v) {
      case "cash":
        return "Cash";
      case "card":
        return "Card";
      case "transfer":
        return "Bank transfer";
      case "other":
        return "Other";
      default:
        return v || "-";
    }
  }

  async function addPayment() {
    if (!payEnrollmentId || !payAmount) return;

    setPaySaving(true);
    setError(null);
    try {
      if (payEditId) {
        const upd = await supabase
          .from("payments")
          .update({
            amount: Number(payAmount),
            method: payMethod,
            note: payNote.trim() || null,
          })
          .eq("id", payEditId);

        if (upd.error) throw upd.error;
        toast("Payment updated.", "ok");
      } else {
        const ins = await supabase.from("payments").insert([
          {
            enrollment_id: Number(payEnrollmentId),
            amount: Number(payAmount),
            method: payMethod,
            note: payNote.trim() || null,
          },
        ]);

        if (ins.error) throw ins.error;
        toast("Payment added.", "ok");
      }

      setOpenPay(false);
      setPayEditId(null);
      setPayEnrollmentId("");
      setPayAmount("");
      setPayMethod("cash");
      setPayNote("");
      await loadFixed();
      setTab("payments");
    } catch (e) {
      setError(e);
      toast(
        payEditId ? "Failed to update payment." : "Failed to add payment.",
        "danger",
      );
    } finally {
      setPaySaving(false);
    }
  }

  async function deletePayment(paymentId) {
    const d = await supabase.from("payments").delete().eq("id", paymentId);
    if (d.error) {
      setError(d.error);
      toast("Failed to delete payment.", "danger");
      return;
    }
    toast("Payment deleted.", "ok");
    await loadFixed();
  }

  async function openPaymentHistory(participantRow) {
    setHistoryEnrollment(participantRow);
    setOpenHistory(true);
    setHistoryLoading(true);
    setError(null);

    if (!participantRow.package_id) {
      setHistoryRows([]);
      setHistoryLoading(false);
      return;
    }

    const res = await supabase
      .from("payments")
      .select("id,amount,method,note,created_at")
      .eq("package_id", participantRow.package_id)
      .order("created_at", { ascending: false });

    if (res.error) {
      setError(res.error);
      setHistoryRows([]);
    } else {
      setHistoryRows(res.data ?? []);
    }
    setHistoryLoading(false);
  }

  function openAdjustModal(p) {
    const alloc = Number(p.sessions_allocated || 0);
    const attended = Number(p.sessions_attended_in_run || 0);
    const pkgRemain = Number(p.package_sessions_remaining || 0);
    const runFuture = runFutureSessionsCount;
    const maxAllowed = attended + Math.min(runFuture, pkgRemain);

    setAdjEnrollmentId(p.enrollment_id);
    setAdjPackageId(p.package_id ?? null);
    setAdjChildName(p.child_name);
    setAdjAllocatedNow(alloc);
    setAdjحضر(attended);
    setAdjPkgالمتبقي(pkgRemain);
    setAdjRunFuture(runFuture);
    setAdjMaxAllowed(maxAllowed);
    setAdjNewAllocated(alloc);
    setAdjPkgDelta(0);
    setOpenAdjust(true);
  }

  // ✅ Edit (+/-)
  async function doAdjustPackageTotal(packageId, delta) {
    try {
      setError(null);
      const rpc = await supabase.rpc("adjust_package_sessions_total", {
        p_package_id: Number(packageId),
        p_delta: Number(delta),
      });
      if (rpc.error) throw rpc.error;

      toast(
        delta > 0 ? ` Add ${Math.abs(delta)} .` : ` ${Math.abs(delta)} .`,
        "ok",
      );

      await loadFixed();
    } catch (e) {
      setError(e);
      toast("فشل تعديل الاشتراك.", "danger");
    }
  }

  function quickAdjustFromإدارة(delta) {
    if (!manageP) return;

    // : Add " " Edit
    if (!manageP.package_id) {
      if (delta > 0)
        toast(
          "No package linked. Use “Buy new sessions” to add sessions.",
          "warn",
        );
      else toast("No package linked to adjust.", "warn");
      return;
    }

    // :
    if (delta < 0) {
      setConfirm({
        open: true,
        type: "pkgDelta",
        id: { packageId: manageP.package_id, delta },
        text: ` ${Math.abs(delta)} ${manageP.child_name}`,
      });
      return;
    }

    // Add
    doAdjustPackageTotal(manageP.package_id, delta);
  }

  async function saveAdjustments() {
    if (!adjEnrollmentId) return;

    setAdjSaving(true);
    setError(null);

    try {
      if (Number(adjNewAllocated) !== Number(adjAllocatedNow)) {
        const delta = Number(adjNewAllocated) - Number(adjAllocatedNow);
        await bumpEnrollmentAllocated(adjEnrollmentId, delta);
      }

      if (adjPackageId && Number(adjPkgDelta) !== 0) {
        const rpc2 = await supabase.rpc("adjust_package_sessions_total", {
          p_package_id: Number(adjPackageId),
          p_delta: Number(adjPkgDelta),
        });
        if (rpc2.error) throw rpc2.error;
      }

      toast("تم تحديث الاشتراك.", "ok");
      setOpenAdjust(false);
      await loadFixed();
      setTab("participants");
    } catch (e) {
      setError(e);
      toast("فشل تعديل الاشتراك.", "danger");
    } finally {
      setAdjSaving(false);
    }
  }

  if (loading) {
    return (
      <div
        className="page page--runs"
        dir="rtl"
        lang="ar"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,172,71,0.10) 0%, rgba(255,255,255,0) 320px)",
        }}
      >
        <div className="container runDetails">
          <div className="card">جاري التحميل...</div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div
        className="page page--runs"
        dir="rtl"
        lang="ar"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,172,71,0.10) 0%, rgba(255,255,255,0) 320px)",
        }}
      >
        <div className="container runDetails">
          <div className="card"> .</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="page page--runs"
      dir="rtl"
      lang="ar"
      style={{
        background:
          "linear-gradient(180deg, rgba(0,172,71,0.10) 0%, rgba(255,255,255,0) 320px)",
      }}
    >
      <style>{RUN_DETAILS_SOFT_UI_STYLES}</style>
      <div className="container runDetails">
        {/* Header Section Modified to match user request and image */}
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
          {/* اليمين: العنوان والمعطيات */}
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
                <CreditCard
                  size={16}
                  className="ico"
                  style={{ marginLeft: 6, color: "#000" }}
                />
                {fmtNum((totals.paidRatio * 100).toFixed(0))}%
              </span>
            </div>
          </div>

          {/* اليسار: الأزرار */}
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
              onClick={loadFixed}
            >
              تحديث
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
            <div className="summaryNote">
              إجمالي المبلغ المتفق عليه للمشاركين النشطين.
            </div>
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

        {/* ===================== PARTICIPANTS ===================== */}
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
                {/* Filters */}
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

                {/* Actions */}
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

                  return (
                    <div
                      key={p.enrollment_id}
                      className="pCard"
                      style={{ width: 380, maxWidth: "100%" }}
                      role="button"
                      tabIndex={0}
                      onClick={() => openإدارةFor(p)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") openإدارةFor(p);
                      }}
                    >
                      <div className="pHead">
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

                        <div>{badgePayment(p.payment_status)}</div>
                      </div>

                      <div className="pQuickStats">
                        <div className="pStatBlock primary">
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

                        <div className="pStatBlock">
                          <div className="pStatLabel">
                            <Ticket size={14} />
                            <span>رصيد الجلسات</span>
                          </div>
                          <div className="pStatValue ltrIso" dir="ltr">
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

                      <div
                        className="pActions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="pActionsLeft">
                          <IconButton
                            icon={<CreditCard size={16} className="ico" />}
                            title="إضافة دفعة"
                            variant="soft"
                            size="sm"
                            onClick={() => openPaymentModalFor(p, "remaining")}
                          />
                          <IconButton
                            icon={<Receipt size={16} className="ico" />}
                            title="سجل الدفعات"
                            variant="soft"
                            size="sm"
                            onClick={() => openPaymentHistory(p)}
                          />
                          <IconButton
                            icon={<Plus size={16} className="ico" />}
                            title="إضافة جلسات"
                            variant="soft"
                            size="sm"
                            onClick={() => openSingleTopup(p)}
                          />
                          <IconButton
                            icon={<Settings2 size={16} className="ico" />}
                            title="إدارة"
                            variant="solid"
                            size="sm"
                            onClick={() => openإدارةFor(p)}
                          />
                        </div>

                        <div className="pActionHint muted">
                          اضغط للإدارة والتفاصيل
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!nextSession && (
              <div className="muted" style={{ marginTop: 12 }}>
                لا توجد جلسات قادمة.
              </div>
            )}
          </div>
        )}

        {/* ===================== SESSIONS ===================== */}
        {tab === "sessions" && (
          <div className="grid">
            {/* LEFT: generator + quick add */}
            <div className="card" style={{ gridColumn: "span 4" }}>
              <div className="h1">الجلسات</div>
              <div className="muted" style={{ marginTop: 6 }}>
                حدد التكرار ثم أنشئ قائمة الجلسات. الأوقات حسب توقيتك المحلي.
              </div>

              <hr className="sep" />

              {isWorkshop ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <div className="muted">
                    الورشات غالبًا تكون جلسة واحدة. أنشئها مرة واحدة، ثم قم
                    بإدارتها من القائمة.
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: "100%" }}
                    onClick={openCreateSession}
                    disabled={(sessions || []).length > 0}
                    title={
                      (sessions || []).length > 0
                        ? "الجلسة موجودة بالفعل"
                        : "إنشاء جلسة الورشة"
                    }
                  >
                    {(sessions || []).length > 0
                      ? "تم إنشاء الجلسة"
                      : "+ إنشاء جلسة"}
                  </button>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <div className="muted">أول جلسة (تاريخ/وقت)</div>
                    <input
                      className="input"
                      type={isWorkshop ? "date" : "datetime-local"}
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
                      <div className="muted">المدة (دقائق)</div>
                      <input
                        className="input"
                        type="number"
                        min="1"
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(e.target.value)}
                      />
                    </div>

                    <div style={{ display: "grid", gap: 6 }}>
                      <div className="muted">عدد الجلسات</div>
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
                    <div className="muted" style={{ marginTop: -2 }}>
                      الجدول الحالي: كل <b>{intervalDays}</b> أيام
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn primary"
                    style={{ width: "100%" }}
                    disabled={genLoading || !firstStart}
                    onClick={generateSessions}
                  >
                    {genLoading ? "جاري الإنشاء..." : "إنشاء الجلسات"}
                  </button>

                  <hr className="sep" />

                  <button
                    type="button"
                    className="btn"
                    style={{ width: "100%" }}
                    onClick={openCreateSession}
                  >
                    <Plus size={16} className="ico" /> إضافة جلسة واحدة
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT: list */}
            <div
              className="card"
              style={{ gridColumn: "span 8", overflow: "hidden" }}
            >
              <div className="h1">قائمة الجلسات</div>
              <div className="muted" style={{ marginTop: 6 }}>
                إدارة جلسات هذه الدفعة وتعديل مواعيدها أو حالتها أو حذفها.
              </div>

              <hr className="sep" />

              {!sessions?.length ? (
                <div className="muted">لا توجد جلسات بعد.</div>
              ) : (
                <div style={{ width: "100%" }}>
                  <div
                    className="sessionList"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    {sessions.map((s) => {
                      const isDone = s.status === "done";
                      const isCanceled = s.status === "canceled";
                      return (
                        <div
                          key={s.id}
                          className="sessionRow"
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "minmax(120px, 1fr) minmax(140px, 1fr) minmax(110px, 140px) auto",
                            gap: 12,
                            alignItems: "center",
                            overflow: "hidden",
                            maxWidth: "100%",
                            padding: "12px 14px",
                            border: "1px solid rgba(0,0,0,0.08)",
                            borderRadius: 14,
                          }}
                        >
                          {/* Date */}
                          <div style={{ lineHeight: 1.15 }}>
                            <div style={{ fontWeight: 700 }}>
                              {fmtDate(s.start_at)}
                            </div>
                            <div className="muted">
                              {fmtWeekday(s.start_at)}
                            </div>
                          </div>

                          {/* Time */}
                          <div style={{ lineHeight: 1.15 }}>
                            <div style={{ fontWeight: 600 }}>
                              {fmtTimeHM(s.start_at)} → {fmtTimeHM(s.end_at)}
                            </div>
                            <div className="muted">{fmtDT(s.start_at)}</div>
                          </div>

                          {/* Status */}
                          <div>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "6px 10px",
                                borderRadius: 999,
                                background: isDone
                                  ? "rgba(34,197,94,0.12)"
                                  : isCanceled
                                    ? "rgba(239,68,68,0.10)"
                                    : "rgba(0,0,0,0.06)",
                                border: "1px solid rgba(0,0,0,0.08)",
                                fontSize: 12,
                                textTransform: "capitalize",
                                fontWeight: 600,
                              }}
                            >
                              {s.status}
                            </span>
                          </div>

                          {/* Actions */}
                          <div
                            className="sessionActions"
                            style={{
                              display: "grid",
                              gap: 8,
                              justifyItems: "end",
                              minWidth: 96,
                              justifySelf: "end",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                                justifyContent: "flex-end",
                              }}
                            >
                              <button
                                type="button"
                                className="btn primary"
                                title="إدارة"
                                aria-label="إدارة"
                                style={{
                                  width: 36,
                                  height: 36,
                                  padding: 0,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                                onClick={() =>
                                  navigate(`/sessions/${s.id}/attendance`)
                                }
                              >
                                <Settings2 size={16} className="ico" />
                              </button>

                              <button
                                type="button"
                                className="btn"
                                title="تعديل"
                                aria-label="تعديل"
                                style={{
                                  width: 36,
                                  height: 36,
                                  padding: 0,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                                onClick={() => openEditSession(s)}
                              >
                                <Pencil size={16} className="ico" />
                              </button>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                                justifyContent: "flex-end",
                              }}
                            >
                              <button
                                type="button"
                                className="btn"
                                title={isDone ? "إعادة فتح" : "تعيين كمكتملة"}
                                aria-label={
                                  isDone ? "إعادة فتح" : "تعيين كمكتملة"
                                }
                                style={{
                                  width: 36,
                                  height: 36,
                                  padding: 0,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                                onClick={() =>
                                  setSessionStatus(
                                    s.id,
                                    isDone ? "scheduled" : "done",
                                  )
                                }
                              >
                                {isDone ? (
                                  <>
                                    <CheckCircle2 size={16} className="ico" />
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 size={16} className="ico" />
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                className="btn danger"
                                title={isCanceled ? "استعادة" : "إلغاء"}
                                aria-label={isCanceled ? "استعادة" : "إلغاء"}
                                style={{
                                  width: 36,
                                  height: 36,
                                  padding: 0,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                                onClick={() =>
                                  setSessionStatus(
                                    s.id,
                                    isCanceled ? "scheduled" : "canceled",
                                  )
                                }
                              >
                                {isCanceled ? (
                                  <>
                                    <CheckCircle2 size={16} className="ico" />
                                  </>
                                ) : (
                                  <>
                                    <XCircle size={16} className="ico" />
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                className="btn danger"
                                title="حذف"
                                aria-label="حذف"
                                style={{
                                  width: 36,
                                  height: 36,
                                  padding: 0,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                                onClick={() => deleteSession(s.id)}
                              >
                                <Trash2 size={16} className="ico" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== PAYMENTS TAB ===================== */}
        {tab === "payments" && (
          <div className="grid">
            <div className="card" style={{ gridColumn: "span 12" }}>
              <div className="row space" style={{ alignItems: "flex-start" }}>
                <div>
                  <div className="h1">المدفوعات</div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    عرض وإدارة المدفوعات لهذه الدفعة.
                  </div>
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
                  <table className="table">
                    <thead>
                      <tr>
                        <th>الطفل</th>
                        <th>المبلغ (₪)</th>
                        <th style={{ width: 140 }}>الطريقة</th>
                        <th style={{ width: 170 }}>التاريخ</th>
                        <th>ملاحظة</th>
                        <th style={{ width: 92, textAlign: "center" }}></th>
                      </tr>
                    </thead>

                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 800 }}>
                            {p.child_id ? (
                              <button
                                type="button"
                                className="linkBtn"
                                onClick={() =>
                                  navigate(`/children/${p.child_id}`)
                                }
                              >
                                {p.child_name}
                              </button>
                            ) : (
                              p.child_name
                            )}
                          </td>

                          <td>{Number(p.amount).toFixed(2)}</td>
                          <td className="muted">
                            {paymentMethodLabel(p.method)}
                          </td>
                          <td className="muted">{fmtDT(p.created_at)}</td>
                          <td className="muted">{p.note ?? "-"}</td>

                          <td style={{ textAlign: "center" }}>
                            <div className="tableActions">
                              <button
                                type="button"
                                className="btn iconOnly"
                                title="تعديل دفعة"
                                aria-label="تعديل دفعة"
                                onClick={() => openEditPayment(p)}
                              >
                                <Pencil size={16} className="ico" />
                              </button>

                              <button
                                type="button"
                                className="btn danger iconOnly"
                                title="حذف دفعة"
                                aria-label="حذف دفعة"
                                onClick={() =>
                                  setConfirm({
                                    open: true,
                                    type: "deletePayment",
                                    id: p.id,
                                    text: "حذف دفعة",
                                  })
                                }
                              >
                                <Trash2 size={16} className="ico" />
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

        {/* ===================== EXPENSES ===================== */}
        {tab === "expenses" && (
          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2 style={{ marginBottom: 4 }}>المصاريف</h2>
                <div className="muted small">
                  مصاريف مرتبطة بهذه الدفعة (Run)
                </div>
              </div>

              <button
                type="button"
                className="btn primary"
                onClick={openAddExpense}
                disabled={!expFeatureAvailable}
              >
                + إضافة مصروف
              </button>
            </div>

            {!expFeatureAvailable ? (
              <div style={{ marginTop: 14 }} className="muted">
                ميزة ربط المصاريف بالـ Run غير مفعّلة بعد. شغّل ملف الـ SQL الذي
                يضيف <b>run_id</b> لجدول <b>expenses</b>.
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
                    <div className="muted">الصافي (المدفوع - المصاريف)</div>
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
                    <table className="table">
                      <thead>
                        <tr>
                          <th style={{ width: 140 }}>التاريخ</th>
                          <th>التصنيف</th>
                          <th style={{ width: 180 }}>الشخص</th>
                          <th>الوصف</th>
                          <th style={{ width: 140 }}>المبلغ</th>
                          <th style={{ width: 92, textAlign: "center" }} />
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
                            <td>
                              <span className="ltrIso">
                                {fmtILS(r.amount, 2)}
                              </span>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <div className="tableActions">
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

        {/* ===================== MODALS ===================== */}

        {/* ✅ Child */}
        <Modal
          open={openإدارة}
          title={manageP ? `إدارة — ${manageP.child_name}` : "إدارة"}
          onClose={() => setOpenإدارة(false)}
        >
          {!manageP ? (
            <div className="muted">—</div>
          ) : (
            <div className="grid">
              {/* Summary */}
              <div style={{ gridColumn: "span 12" }} className="card">
                <div
                  className="row"
                  style={{
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>
                      {manageP.child_name}{" "}
                      <span className="muted" style={{ fontWeight: 700 }}>
                        — {manageP.class ?? "-"} — Age: {manageP.age ?? "-"}
                      </span>
                    </div>

                    <div
                      className="row"
                      style={{ gap: 10, marginTop: 8, flexWrap: "wrap" }}
                    >
                      {badgePayment(manageP.payment_status)}
                      {manageP.enrollment_status === "active" ? (
                        <Badge variant="ok">نشط</Badge>
                      ) : (
                        <Badge variant="warn">غير نشط</Badge>
                      )}
                      {manageP.is_free ? (
                        <Badge variant="info">Free</Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="row" style={{ gap: 18, flexWrap: "wrap" }}>
                    <div>
                      <div className="muted">المتفق عليه</div>
                      <div style={{ fontWeight: 900 }} dir="ltr">
                        {fmtILS(manageP.agreed_price || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="muted">المدفوع</div>
                      <div style={{ fontWeight: 900 }} dir="ltr">
                        {fmtILS(manageP.paid_amount || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="muted">المتبقي</div>
                      <div style={{ fontWeight: 900 }} dir="ltr">
                        {fmtILS(manageP.balance || 0)}
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="sep" />

                <div className="row" style={{ gap: 14, flexWrap: "wrap" }}>
                  <div className="row" style={{ gap: 8 }}>
                    <Ticket size={14} className="ico" />
                    <span className="muted">Total</span>
                    <b dir="ltr">
                      {fmtNum(manageP.package_sessions_total ?? 0)}
                    </b>
                  </div>

                  <div className="row" style={{ gap: 8 }}>
                    <Hourglass size={14} className="ico" />
                    <span className="muted">المتبقي</span>
                    <b dir="ltr">
                      {fmtNum(manageP.package_sessions_remaining ?? 0)}
                    </b>
                  </div>

                  <div className="row" style={{ gap: 8 }}>
                    <CheckCircle2 size={14} className="ico" />
                    <span className="muted">مستخدم</span>
                    <b dir="ltr">
                      {fmtNum(
                        Math.max(
                          0,
                          (manageP.package_sessions_total ?? 0) -
                            (manageP.package_sessions_remaining ?? 0),
                        ),
                      )}
                    </b>
                  </div>

                  <div className="row" style={{ gap: 8 }}>
                    <CalendarDays size={14} className="ico" />
                    <span className="muted">حضر in run</span>
                    <b dir="ltr">
                      {fmtNum(manageP.sessions_attended_in_run ?? 0)}
                    </b>
                  </div>
                </div>
              </div>

              {/* Contact + quick link */}
              <div style={{ gridColumn: "span 12" }} className="card">
                <div
                  className="row"
                  style={{
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontWeight: 900 }}>Contact</div>

                  <div className="row" style={{ gap: 10 }}>
                    <IconButton
                      icon={<ExternalLink size={16} className="ico" />}
                      title="Open child profile"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/children/${manageP.child_id}`);
                      }}
                    />
                  </div>
                </div>

                <hr className="sep" />

                <div className="grid">
                  <div style={{ gridColumn: "span 6" }}>
                    <div className="muted">Mother name</div>
                    <div style={{ fontWeight: 800 }}>
                      {manageChild?.mother_name ?? "-"}
                    </div>
                  </div>

                  <div style={{ gridColumn: "span 6" }}>
                    <div className="muted">Mother phone</div>
                    <div className="row" style={{ gap: 10 }}>
                      <div style={{ fontWeight: 800 }} dir="ltr">
                        {manageChild?.mother_phone ?? "-"}
                      </div>
                      {manageChild?.mother_phone ? (
                        <button
                          type="button"
                          className="iconBtn"
                          onClick={async () => {
                            const ok = await copyText(manageChild.mother_phone);
                            toast(
                              ok ? "Copied" : "Copy failed",
                              ok ? "ok" : "danger",
                            );
                          }}
                          title="Copy"
                        >
                          <Copy size={16} className="ico" />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div style={{ gridColumn: "span 6" }}>
                    <div className="muted">Father name</div>
                    <div style={{ fontWeight: 800 }}>
                      {manageChild?.father_name ?? "-"}
                    </div>
                  </div>

                  <div style={{ gridColumn: "span 6" }}>
                    <div className="muted">Father phone</div>
                    <div className="row" style={{ gap: 10 }}>
                      <div style={{ fontWeight: 800 }} dir="ltr">
                        {manageChild?.father_phone ?? "-"}
                      </div>
                      {manageChild?.father_phone ? (
                        <button
                          type="button"
                          className="iconBtn"
                          onClick={async () => {
                            const ok = await copyText(manageChild.father_phone);
                            toast(
                              ok ? "Copied" : "Copy failed",
                              ok ? "ok" : "danger",
                            );
                          }}
                          title="Copy"
                        >
                          <Copy size={16} className="ico" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ gridColumn: "span 12" }} className="card">
                <div style={{ fontWeight: 900, marginBottom: 10 }}>Actions</div>

                <div
                  className="row"
                  style={{
                    justifyContent: "space-between",
                    gap: 14,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div className="muted">Unit price</div>
                    <div style={{ fontWeight: 900, fontSize: 18 }} dir="ltr">
                      {(() => {
                        const total = Number(manageP.agreed_price || 0);
                        const s = Number(manageP.package_sessions_total || 0);
                        return fmtILS(s > 0 ? total / s : 0);
                      })()}
                    </div>
                  </div>

                  <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setOpenإدارة(false);
                        openSingleTopup(manageP);
                      }}
                      title="إضافة جلسةs"
                    >
                      <ShoppingCart size={16} className="ico" /> إضافة جلسةs
                    </button>

                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        alignItems: "center",
                        padding: 6,
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,.08)",
                        background: "rgba(0,0,0,.02)",
                      }}
                      title="Adjust remaining sessions"
                    >
                      <button
                        type="button"
                        className="btn"
                        style={{ padding: "8px 12px" }}
                        onClick={() => quickAdjustFromإدارة(-1)}
                        title="Decrease"
                      >
                        <Minus size={16} className="ico" />
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{ padding: "8px 12px" }}
                        onClick={() => quickAdjustFromإدارة(1)}
                        title="Increase"
                      >
                        <Plus size={16} className="ico" />
                      </button>
                    </div>
                  </div>
                </div>

                <hr className="sep" />

                <div style={{ fontWeight: 900, marginBottom: 10 }}>
                  المدفوعات
                </div>
                <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={Number(manageP.balance || 0) <= 0}
                    onClick={() => {
                      setOpenإدارة(false);
                      openPaymentModalFor(manageP, "remaining");
                    }}
                  >
                    <CreditCard size={16} className="ico" /> Pay remaining
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setOpenإدارة(false);
                      openPaymentModalFor(manageP, "custom");
                    }}
                  >
                    <Receipt size={16} className="ico" /> إضافة دفعة
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setOpenإدارة(false);
                      openPaymentHistory(manageP);
                    }}
                  >
                    <CalendarClock size={16} className="ico" /> History
                  </button>

                  <button
                    type="button"
                    className="btn"
                    disabled={!manageP.package_id}
                    onClick={() => {
                      setOpenإدارة(false);
                      setPricePackageId(manageP.package_id);
                      setPriceValue(String(Number(manageP.agreed_price || 0)));
                      setOpenPrice(true);
                    }}
                  >
                    <Pencil size={16} className="ico" /> Edit price
                  </button>
                </div>

                <hr className="sep" />

                <div style={{ fontWeight: 900, marginBottom: 10 }}>
                  Enrollment
                </div>
                <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
                  {manageP.enrollment_status === "active" ? (
                    <button
                      type="button"
                      className="btn danger"
                      onClick={() => {
                        setOpenإدارة(false);
                        setConfirm({
                          open: true,
                          type: "inactive",
                          id: manageP.enrollment_id,
                          text: `Deactivate enrollment: ${manageP.child_name}`,
                        });
                      }}
                    >
                      <XCircle size={16} className="ico" /> Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => {
                        setOpenإدارة(false);
                        setConfirm({
                          open: true,
                          type: "active",
                          id: manageP.enrollment_id,
                          text: `Activate enrollment: ${manageP.child_name}`,
                        });
                      }}
                    >
                      <CheckCircle2 size={16} className="ico" /> Activate
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn danger"
                    disabled={manageHasPayments}
                    title={
                      manageHasPayments
                        ? "لا يمكن حذف الاشتراك لأن هناك دفعات مسجلة."
                        : "حذف الاشتراك"
                    }
                    onClick={() => {
                      if (manageHasPayments) {
                        toast(
                          "لا يمكن حذف هذا الطفل من الدورة لأنه توجد له دفعات مسجّلة داخل هذه الدورة.",
                          "warn",
                        );
                        return;
                      }
                      setOpenإدارة(false);
                      setConfirm({
                        open: true,
                        type: "deleteEnroll",
                        id: {
                          enrollmentId: manageP.enrollment_id,
                          packageId: manageP.package_id,
                          childName: manageP.child_name,
                        },
                        text: `حذف الاشتراك: ${manageP.child_name}`,
                      });
                    }}
                  >
                    <Trash2 size={16} className="ico" /> Delete enroll
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={() => setOpenإدارة(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* ✅ Enroll */}
        <Modal
          open={openEnroll}
          title={
            enrollLocked ? `إضافة جلسةs — ${enrollLockedName}` : "Enroll child"
          }
          onClose={() => setOpenEnroll(false)}
        >
          <div className="muted">
            If the child has an existing balance, you can choose “Use existing
            balance”.
          </div>

          <hr className="sep" />

          <div className="grid">
            <div style={{ gridColumn: "span 12" }}>
              <div className="muted">Child</div>
              <ModernSelect
                value={selectedChildId}
                onChange={setSelectedChildId}
                menuWidth="trigger"
                disabled={enrollLocked}
                placeholder="— Select child —"
                options={[
                  { value: "", label: "— Select child —" },
                  ...((enrollLocked ? children : availableChildren) || []).map(
                    (c) => ({
                      value: c.id,
                      label: `${c.name} — ${c.class ?? "-"} — Age: ${c.age ?? "-"}`,
                    }),
                  ),
                ]}
              />
            </div>

            <div style={{ gridColumn: "span 12" }} className="card">
              {pkgLoading ? (
                <div>Checking existing balance...</div>
              ) : pkgInfo ? (
                <div className="muted">
                  Existing sessions balance:{" "}
                  <b>{Number(pkgInfo.sessions_remaining || 0)}</b> — المتبقي to
                  pay: <b>{Number(pkgInfo.balance_amount || 0).toFixed(2)}</b>
                </div>
              ) : (
                <div className="muted">
                  No existing balance found (or not checked yet).
                </div>
              )}

              <div className="muted" style={{ marginTop: 8 }}>
                Upcoming sessions in this run: <b>{singlePreview.runFuture}</b>{" "}
                — Allocated now: <b>{singlePreview.allocNow}</b> — Carry:{" "}
                <b>{singlePreview.carry}</b>
              </div>
            </div>

            <div style={{ gridColumn: "span 12" }}>
              <div className="muted">Enrollment method</div>
              <ModernSelect
                value={enrollMode}
                onChange={setEnrollMode}
                menuWidth="trigger"
                disabled={enrollLocked}
                options={[
                  { value: "use_existing", label: "Use existing balance" },
                  { value: "buy_new", label: "إضافة جلسةs (new)" },
                ]}
              />
            </div>
            {enrollMode === "use_existing" && (
              <div style={{ gridColumn: "span 12" }} className="card">
                <div className="muted">
                  <b>Use existing balance</b> / No . “Enrollment method”{" "}
                  <b>Buy new sessions</b>.
                </div>
              </div>
            )}

            {(enrollMode === "buy_new" || enrollLocked) && (
              <>
                <div style={{ gridColumn: "span 4" }}>
                  <div className="muted">Sessions to add</div>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={buySessions}
                    onChange={(e) => {
                      const v = e.target.value;
                      setBuySessions(v);

                      const s = Number(v);
                      if (!Number.isFinite(s) || s <= 0) return;

                      if (buyPriceEditMode === "unit") {
                        const u = Number(buyUnitPrice || 0);
                        if (Number.isFinite(u))
                          setBuyPriceTotal((s * u).toFixed(2));
                      } else {
                        const t =
                          buyPriceTotal === "" ? 0 : Number(buyPriceTotal);
                        if (Number.isFinite(t))
                          setBuyUnitPrice((t / s).toFixed(2));
                      }
                    }}
                  />
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <div className="muted">Unit price</div>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={buyUnitPrice}
                    onChange={(e) => {
                      const v = e.target.value;
                      setBuyUnitPrice(v);
                      setBuyPriceEditMode("unit");

                      const s = Number(buySessions || 0);
                      const u = v === "" ? 0 : Number(v);
                      if (Number.isFinite(s) && s > 0 && Number.isFinite(u))
                        setBuyPriceTotal((s * u).toFixed(2));
                    }}
                    placeholder={
                      Number(buySessions || 0) > 0
                        ? (
                            Number(defaultPrice || 0) / Number(buySessions || 1)
                          ).toFixed(2)
                        : "0.00"
                    }
                  />
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <div className="muted">Total price</div>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={buyPriceTotal}
                    onChange={(e) => {
                      const v = e.target.value;
                      setBuyPriceTotal(v);
                      setBuyPriceEditMode("total");

                      const s = Number(buySessions || 0);
                      const t = v === "" ? 0 : Number(v);
                      if (Number.isFinite(s) && s > 0 && Number.isFinite(t))
                        setBuyUnitPrice((t / s).toFixed(2));
                    }}
                    placeholder={String(defaultPrice)}
                  />
                  <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                    Unit price — .
                  </div>
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
                {enrollSaving ? " Save..." : "Save"}
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

        {/* New child (inline) */}
        <Modal
          open={openNewChild}
          title={newChildEnrollNow ? "Create child & enroll" : "Add child"}
          onClose={() => setOpenNewChild(false)}
        >
          <div className="grid">
            <div style={{ gridColumn: "span 12" }}>
              <div className="muted">Name *</div>
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
              <div className="muted">Age *</div>
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
              <div className="muted">Gender</div>
              <select
                className="input"
                value={newChildForm.gender}
                onChange={(e) =>
                  setNewChildForm((p) => ({ ...p, gender: e.target.value }))
                }
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div style={{ gridColumn: "span 4" }}>
              <div className="muted">Class</div>
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
              <div className="muted">City</div>
              <select
                className="input"
                value={newChildForm.country_id ?? ""}
                onChange={(e) =>
                  setNewChildForm((p) => ({ ...p, country_id: e.target.value }))
                }
                disabled={countriesLoading}
              >
                <option value="">
                  {countriesLoading ? "جاري التحميل..." : "Select a country..."}
                </option>
                {(countries ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: "span 6" }}>
              <div className="muted">New country (optional)</div>
              <input
                className="input"
                value={newChildForm.new_country_name}
                onChange={(e) =>
                  setNewChildForm((p) => ({
                    ...p,
                    new_country_name: e.target.value,
                  }))
                }
                placeholder="e.g. Israel"
              />
            </div>

            <div style={{ gridColumn: "span 6" }}>
              <div className="muted">Mother name</div>
              <input
                className="input"
                value={newChildForm.mother_name}
                onChange={(e) =>
                  setNewChildForm((p) => ({
                    ...p,
                    mother_name: e.target.value,
                  }))
                }
                placeholder="e.g. Sarah"
              />
            </div>

            <div style={{ gridColumn: "span 6" }}>
              <div className="muted">Mother phone</div>
              <input
                className="input"
                value={newChildForm.mother_phone}
                onChange={(e) =>
                  setNewChildForm((p) => ({
                    ...p,
                    mother_phone: e.target.value,
                  }))
                }
                placeholder="e.g. 050-1234567"
              />
            </div>

            <div style={{ gridColumn: "span 6" }}>
              <div className="muted">Father name</div>
              <input
                className="input"
                value={newChildForm.father_name}
                onChange={(e) =>
                  setNewChildForm((p) => ({
                    ...p,
                    father_name: e.target.value,
                  }))
                }
                placeholder="e.g. Ahmad"
              />
            </div>

            <div style={{ gridColumn: "span 6" }}>
              <div className="muted">Father phone</div>
              <input
                className="input"
                value={newChildForm.father_phone}
                onChange={(e) =>
                  setNewChildForm((p) => ({
                    ...p,
                    father_phone: e.target.value,
                  }))
                }
                placeholder="e.g. 052-1234567"
              />
            </div>

            <div style={{ gridColumn: "span 12" }}>
              <div className="muted">Notes (optional)</div>
              <textarea
                className="input"
                rows={4}
                value={newChildForm.notes}
                onChange={(e) =>
                  setNewChildForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="Optional notes..."
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
                  ? "Saving..."
                  : newChildEnrollNow
                    ? "Create & enroll"
                    : "Save"}
              </button>
            </div>
          </div>
        </Modal>

        {/* ✅ إضافة مجموعة (تسجيل جماعي) */}
        <Modal
          open={openBulk}
          title="إضافة مجموعة"
          onClose={() => setOpenBulk(false)}
        >
          <div dir="rtl" lang="ar">
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
                  min="1"
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

        {/* Edit */}
        <Modal
          open={openPrice}
          title="Edit "
          onClose={() => setOpenPrice(false)}
        >
          <div style={{ display: "grid", gap: 10 }}>
            <div className="muted">المدة (دقائق)</div>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={priceValue}
              onChange={(e) => setPriceValue(e.target.value)}
            />
            <div className="row">
              <button
                type="button"
                className="btn primary"
                onClick={updatePackagePrice}
              >
                Save
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setOpenPrice(false)}
              >
                إلغاء
              </button>
            </div>
          </div>
        </Modal>

        {/* Payment */}
        <Modal
          open={openPay}
          title={payEditId ? "تعديل دفعة" : "Record payment"}
          onClose={() => {
            setOpenPay(false);
            setPayEditId(null);
            setPayLocked(false);
          }}
        >
          <div className="grid">
            <div style={{ gridColumn: "span 12" }}>
              <div className="muted">Child</div>
              <ModernSelect
                value={payEnrollmentId}
                onChange={setPayEnrollmentId}
                menuWidth="trigger"
                disabled={paySaving || !!payEditId || payLocked}
                placeholder="— Select child —"
                options={[
                  { value: "", label: "— Select child —" },
                  ...participants
                    .filter((p) => p.enrollment_status === "active")
                    .map((p) => ({
                      value: p.enrollment_id,
                      label: `${p.child_name} — balance: ₪${Number(p.balance).toFixed(2)}`,
                    })),
                ]}
              />
            </div>

            <div style={{ gridColumn: "span 6" }}>
              <div className="muted">Amount (₪)</div>
              <input
                className="input"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>

            <div style={{ gridColumn: "span 6" }}>
              <div className="muted">Payment method</div>
              <ModernSelect
                value={payMethod}
                onChange={setPayMethod}
                menuWidth="trigger"
                placeholder="— Select method —"
                options={[
                  { value: "cash", label: "Cash" },
                  { value: "card", label: "Card" },
                  { value: "transfer", label: "Bank transfer" },
                  { value: "other", label: "Other" },
                ]}
              />
            </div>

            <div style={{ gridColumn: "span 12" }}>
              <div className="muted">Note</div>
              <input
                className="input"
                placeholder="Optional"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
              />
            </div>

            <div className="row" style={{ gridColumn: "span 12" }}>
              <button
                type="button"
                className="btn primary"
                disabled={paySaving || !payEnrollmentId || !payAmount}
                onClick={addPayment}
              >
                {paySaving ? "Saving..." : payEditId ? "Update" : "Save"}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setOpenPay(false);
                  setPayEditId(null);
                  setPayLocked(false);
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </Modal>

        {/* */}
        <Modal
          open={openHistory}
          title=" "
          onClose={() => setOpenHistory(false)}
        >
          <div className="muted" style={{ marginBottom: 10 }}>
            {historyEnrollment
              ? `${historyEnrollment.child_name} — balance: ₪${Number(historyEnrollment.balance).toFixed(2)}`
              : ""}
          </div>

          {historyLoading ? (
            <div className="card">جاري التحميل...</div>
          ) : historyRows.length === 0 ? (
            <div className="card">No children found.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>المبلغ (₪)</th>
                  <th style={{ width: 140 }}>الطريقة</th>
                  <th style={{ width: 170 }}>التاريخ</th>
                  <th>ملاحظة</th>
                  <th style={{ width: 72, textAlign: "center" }}></th>
                </tr>
              </thead>
              <tbody>
                {historyRows.map((x) => (
                  <tr key={x.id}>
                    <td style={{ fontWeight: 800 }}>
                      {Number(x.amount).toFixed(2)}
                    </td>
                    <td className="muted">{x.method}</td>
                    <td className="muted">{fmtDT(x.created_at)}</td>
                    <td className="muted">{x.note ?? "-"}</td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="btn danger iconOnly"
                        title="حذف دفعة"
                        aria-label="حذف دفعة"
                        onClick={() =>
                          setConfirm({
                            open: true,
                            type: "deletePayment",
                            id: x.id,
                            text: "حذف دفعة",
                          })
                        }
                      >
                        <Trash2 size={16} className="ico" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal>

        {/* Edit/Add */}
        <Modal
          open={openSession}
          title={sessionForm.id ? "Edit " : "Add "}
          onClose={() => setOpenSession(false)}
        >
          <div className="grid">
            <div style={{ gridColumn: "span 6" }}>
              <div className="muted">
                {isWorkshop ? "Session date" : "Session date/time"}
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
              <div className="muted">Status</div>
              <ModernSelect
                value={sessionForm.status}
                onChange={(v) => setSessionForm((p) => ({ ...p, status: v }))}
                menuWidth="trigger"
                options={[
                  { value: "scheduled", label: "scheduled" },
                  { value: "done", label: "done" },
                  { value: "canceled", label: "canceled" },
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
                {sessionSaving ? " Save..." : "Save"}
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

        {/* Edit */}
        <Modal
          open={openAdjust}
          title={`Edit — ${adjChildName}`}
          onClose={() => setOpenAdjust(false)}
        >
          <div className="muted">
            /:
            <br />
            1)
            <br />
            2) ( )
          </div>

          <hr className="sep" />

          <div className="grid">
            <div style={{ gridColumn: "span 12" }} className="card">
              <div className="muted">
                : <b>{adjحضر}</b> — : <b>{adjRunFuture}</b> — :{" "}
                <b>{adjPkgالمتبقي}</b>
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                : <b>{adjMaxAllowed}</b>
              </div>
            </div>

            <div style={{ gridColumn: "span 6" }}>
              <div className="muted">المدة (دقائق)</div>
              <input
                className="input"
                type="number"
                min={adjحضر}
                max={adjMaxAllowed}
                value={adjNewAllocated}
                onChange={(e) => setAdjNewAllocated(e.target.value)}
              />
            </div>

            <div style={{ gridColumn: "span 6" }}>
              <div className="muted">Edit (Δ )</div>
              <input
                className="input"
                type="number"
                step="1"
                value={adjPkgDelta}
                onChange={(e) => setAdjPkgDelta(e.target.value)}
                disabled={!adjPackageId}
                placeholder=": -3 +2"
              />
            </div>

            <div className="row" style={{ gridColumn: "span 12" }}>
              <button
                type="button"
                className="btn primary"
                disabled={adjSaving}
                onClick={saveAdjustments}
              >
                {adjSaving ? "جاري الحفظ..." : "حفظ"}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setOpenAdjust(false)}
              >
                إلغاء
              </button>
            </div>
          </div>
        </Modal>

        {/* Expense modal */}
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
              <div className="muted">التاريخ</div>
              <input
                className="input"
                type="date"
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
              />
            </div>

            <div style={{ gridColumn: "span 6" }}>
              <div className="muted">المبلغ</div>
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
              <div className="muted">التصنيف</div>
              {expHasPicklists ? (
                <ModernSelect
                  value={expCategory || ""}
                  onChange={(v) => setExpCategory(v)}
                  options={[
                    { value: "", label: "—" },
                    ...expCategories.map((x) => ({ value: x, label: x })),
                  ]}
                />
              ) : (
                <input
                  className="input"
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  placeholder="مثال: معاشات"
                />
              )}

              {expHasPicklists && (
                <div className="row" style={{ marginTop: 8, gap: 8 }}>
                  <input
                    className="input"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="إضافة تصنيف جديد..."
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn"
                    onClick={() => addPicklistValue("category", newCatName)}
                  >
                    إضافة
                  </button>
                </div>
              )}
            </div>

            <div style={{ gridColumn: "span 6" }}>
              <div className="muted">الشخص</div>
              {expHasPicklists ? (
                <ModernSelect
                  value={expParty || ""}
                  onChange={(v) => setExpParty(v)}
                  options={[
                    { value: "", label: "—" },
                    ...expParties.map((x) => ({ value: x, label: x })),
                  ]}
                />
              ) : (
                <input
                  className="input"
                  value={expParty}
                  onChange={(e) => setExpParty(e.target.value)}
                  placeholder="مثال: سامر"
                />
              )}

              {expHasPicklists && (
                <div className="row" style={{ marginTop: 8, gap: 8 }}>
                  <input
                    className="input"
                    value={newPartyName}
                    onChange={(e) => setNewPartyName(e.target.value)}
                    placeholder="إضافة شخص جديد..."
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn"
                    onClick={() => addPicklistValue("party", newPartyName)}
                  >
                    إضافة
                  </button>
                </div>
              )}
            </div>

            <div style={{ gridColumn: "span 12" }}>
              <div className="muted">الوصف</div>
              <input
                className="input"
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                placeholder="اختياري..."
              />
            </div>

            <div className="row" style={{ gridColumn: "span 12" }}>
              <button
                type="button"
                className="btn primary"
                onClick={saveExpense}
                disabled={expSaving}
              >
                {expSaving ? "حفظ..." : "حفظ"}
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

        {/* Confirm */}
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
            if (type === "deleteEnroll") {
              const enrollmentId = id?.enrollmentId ?? id;
              const childName = id?.childName ?? "";
              const packageId = id?.packageId ?? null;
              await deleteEnrollment(enrollmentId, childName, packageId);
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
