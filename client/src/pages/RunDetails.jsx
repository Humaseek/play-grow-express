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

const LOCALE_LATN = "ar-IL-u-nu-latn";

function fmtDT(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtTimeHM(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtWeekday(dt) {
  if (!dt) return "-";
  return new Intl.DateTimeFormat("ar-IL", { weekday: "long" }).format(
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

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function badgePayment(status) {
  if (status === "paid") return <Badge variant="ok">שולם</Badge>;
  if (status === "partial") return <Badge variant="warn">חלקי</Badge>;
  if (status === "unpaid") return <Badge variant="danger">לא משלם</Badge>;
  return <Badge variant="info">חינם</Badge>;
}

function rowClassByPayment(status) {
  if (status === "paid") return "rowPaid";
  if (status === "partial") return "rowPartial";
  if (status === "unpaid") return "rowUnpaid";
  return "";
}

function calcAge(birthDate) {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [q, setQ] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [sortBy, setSortBy] = useState("balance_desc");

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

  // Package info + mode
  const [pkgInfo, setPkgInfo] = useState(null);
  const [pkgLoading, setPkgLoading] = useState(false);
  const [enrollMode, setEnrollMode] = useState("auto"); // auto | use_existing | buy_new

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
    status: "scheduled",
  });
  const [sessionSaving, setSessionSaving] = useState(false);

  // Adjust Sessions modal
  const [openAdjust, setOpenAdjust] = useState(false);
  const [adjEnrollmentId, setAdjEnrollmentId] = useState(null);
  const [adjPackageId, setAdjPackageId] = useState(null);
  const [adjChildName, setAdjChildName] = useState("");
  const [adjAllocatedNow, setAdjAllocatedNow] = useState(0);
  const [adjAttended, setAdjAttended] = useState(0);
  const [adjPkgRemaining, setAdjPkgRemaining] = useState(0);
  const [adjRunFuture, setAdjRunFuture] = useState(0);
  const [adjMaxAllowed, setAdjMaxAllowed] = useState(0);
  const [adjNewAllocated, setAdjNewAllocated] = useState(0);
  const [adjPkgDelta, setAdjPkgDelta] = useState(0);
  const [adjSaving, setAdjSaving] = useState(false);

  // ✅ Manage Enrollment (single child in this run) — بدل 8 أزرار بالجدول
  const [openManage, setOpenManage] = useState(false);
  const [manageP, setManageP] = useState(null);

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

  async function loadChildrenSafe() {
    const tryView = await supabase
      .from("children_view")
      .select(
        "id,name,age,class,gender,country,mother_name,mother_phone,father_name,father_phone,birth_date",
      )
      .order("name", { ascending: true });

    if (!tryView.error) return tryView.data ?? [];

    const tryTable = await supabase
      .from("children")
      .select(
        "id,name,birth_date,class,gender,country,mother_name,mother_phone,father_name,father_phone",
      )
      .order("name", { ascending: true });

    if (tryTable.error) throw tryTable.error;

    return (tryTable.data ?? []).map((r) => ({
      ...r,
      age: calcAge(r.birth_date),
    }));
  }
  // ========= load الصحيح =========
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

      // Payments related to packages of kids in this run
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

  // ✅ إذا جدول משתתפים اتحدث (بعد מחזור/עריכה) نحدّث manageP حتى ما يصير stale
  useEffect(() => {
    if (!openManage || !manageP) return;
    const updated = participants.find(
      (x) => Number(x.enrollment_id) === Number(manageP.enrollment_id),
    );
    if (updated) setManageP(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants]);

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
    const enrolled = new Set(participants.map((p) => p.child_id));
    return children.filter((c) => !enrolled.has(c.id));
  }, [children, participants]);

  const participantsFiltered = useMemo(() => {
    let list = [...participants];
    const s = q.trim().toLowerCase();
    if (s)
      list = list.filter((p) => (p.child_name ?? "").toLowerCase().includes(s));
    if (paymentFilter !== "all")
      list = list.filter((p) => p.payment_status === paymentFilter);

    if (sortBy === "balance_desc") {
      list.sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0));
    } else if (sortBy === "name_asc") {
      list.sort((a, b) =>
        String(a.child_name).localeCompare(String(b.child_name), "ar"),
      );
    }
    return list;
  }, [participants, q, paymentFilter, sortBy]);

  // ✅ כרטיס הילד: نجيب بيانات التواصل מ children
  const manageChild = useMemo(() => {
    if (!manageP) return null;
    return (
      children.find((c) => Number(c.id) === Number(manageP.child_id)) ?? null
    );
  }, [manageP, children]);

  function openManageFor(p) {
    setManageP(p);
    setOpenManage(true);
  }

  // ============================
  // Enroll modal: pkg balance fetch
  // ============================
  useEffect(() => {
    async function fetchPkg() {
      if (!openEnroll || !summary) return;

      if (!selectedChildId) {
        setPkgInfo(null);
        setEnrollMode("auto");
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

  function openSingleEnrollNew() {
    setEnrollLocked(false);
    setEnrollLockedName("");
    setSelectedChildId("");
    const s0 = 8;
    setBuySessions(s0);
    setBuyPriceTotal(String(defaultPrice));
    setBuyUnitPrice(s0 > 0 ? (Number(defaultPrice || 0) / s0).toFixed(2) : "");
    setBuyPriceEditMode("total");
    setPkgInfo(null);
    setEnrollMode("auto");
    setOpenEnroll(true);
  }

  // + sessions: always buy new for same child
  function openSingleTopup(participantRow) {
    setEnrollLocked(true);
    setEnrollLockedName(participantRow.child_name);
    setSelectedChildId(String(participantRow.child_id));
    const s1 = 1;
    const alloc = Number(participantRow.sessions_allocated || 0);
    const agreed = Number(participantRow.agreed_price || 0);
    const u = alloc > 0 ? agreed / alloc : Number(defaultPrice || 0) / 8;
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
    setBulkSessions(8);
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

  async function purchaseAndEnrollSingle() {
    if (!summary) return;
    if (!selectedChildId) {
      toast("בחר ילד.", "warn");
      return;
    }

    setEnrollSaving(true);
    setError(null);

    try {
      // If auto: decide
      let mode = enrollMode;
      if (mode === "auto") {
        if (pkgInfo && Number(pkgInfo.sessions_remaining) > 0)
          mode = "use_existing";
        else mode = "buy_new";
      }

      if (mode === "use_existing") {
        const rpc = await supabase.rpc("enroll_from_existing_package", {
          p_run_id: Number(runId),
          p_child_id: Number(selectedChildId),
        });

        if (rpc.error) {
          const msg = String(rpc.error.message || "");
          const isNoPkg = msg.includes(
            "no existing package with remaining sessions",
          );

          // ✅ لو Auto → כןل fallback אוטומטי لـ buy_new
          if (enrollMode === "auto" && isNoPkg) {
            setEnrollMode("buy_new");
            toast("אין יתרת שיעורים קודמת — נרכוש שיעורים חדשים.", "warn");
            // نكمّل للـ buy_new تحت
          } else {
            // ✅ لو المستخدم اختار use_existing يدويًا → نوقف ونخليه يغيّر
            toast("ما ב יתרה שיעורים سابق لזה הילד.", "warn");
            setError(rpc.error);
            return;
          }
        } else {
          toast("ההרשמה בוצעה מהיתרה.", "ok");
          setOpenEnroll(false);
          await loadFixed();
          setTab("participants");
          return;
        }
      }

      // buy_new
      const sessionsToBuy = Number(buySessions);
      if (!Number.isFinite(sessionsToBuy) || sessionsToBuy <= 0) {
        toast("מספר השיעורים חייב להיות גדול מ‑0.", "warn");
        return;
      }

      const priceNum = buyPriceTotal === "" ? 0 : Number(buyPriceTotal);

      const rpc2 = await supabase.rpc("purchase_sessions_and_enroll", {
        p_run_id: Number(runId),
        p_child_id: Number(selectedChildId),
        p_sessions: sessionsToBuy,
        p_price_total: Number.isFinite(priceNum) ? priceNum : 0,
      });

      if (rpc2.error) throw rpc2.error;

      toast("הילד נרשם/נרכש.", "ok");
      setOpenEnroll(false);
      await loadFixed();
      setTab("participants");
    } catch (e) {
      const msg = String(e?.message || e || "");
      // ✅ إذا حاول يسجل طفل موجود بنفس מחזור
      if (msg.includes("uq_run_child") || msg.includes("duplicate key value")) {
        toast("הילד כבר רשום במחזור הזה.", "warn");

        // اפתח כרטיס الניהול مباشرة (إذا موجود ضמ participants)
        const existing = participants.find(
          (x) => Number(x.child_id) === Number(selectedChildId),
        );
        if (existing) {
          setOpenEnroll(false);
          openManageFor(existing);
          return;
        }
      }

      setError(e);
      toast("فشل العملية.", "danger");
    } finally {
      setEnrollSaving(false);
    }
  }

  async function bulkPurchaseAndEnroll() {
    if (!summary) return;
    if (bulkSelectedCount === 0) {
      toast("בחר ילדים קודם.", "warn");
      return;
    }

    const sessionsToBuy = Number(bulkSessions);
    if (!Number.isFinite(sessionsToBuy) || sessionsToBuy <= 0) {
      toast("מספר השיעורים חייב להיות גדול מ‑0.", "warn");
      return;
    }

    setBulkSaving(true);
    setError(null);

    try {
      const balRes = await supabase
        .from("package_balance_view")
        .select("child_id,sessions_remaining")
        .eq("course_id", Number(summary.template_id))
        .in("child_id", bulkSelectedIds);

      if (balRes.error) throw balRes.error;

      const balMap = new Map();
      for (const row of balRes.data ?? []) {
        balMap.set(Number(row.child_id), Number(row.sessions_remaining || 0));
      }

      for (const childId of bulkSelectedIds) {
        const remaining = balMap.get(childId) ?? 0;

        // if has remaining, use existing
        if (remaining > 0) {
          const rpc = await supabase.rpc("enroll_from_existing_package", {
            p_run_id: Number(runId),
            p_child_id: Number(childId),
          });
          if (rpc.error) throw rpc.error;
          continue;
        }

        // otherwise buy + enroll
        let priceNum = 0;
        if (bulkPriceMode === "unified") {
          priceNum = bulkUnifiedPrice === "" ? 0 : Number(bulkUnifiedPrice);
        } else {
          const v = bulkPerChildPrice[childId];
          priceNum = v === undefined || v === null || v === "" ? 0 : Number(v);
        }

        const rpc2 = await supabase.rpc("purchase_sessions_and_enroll", {
          p_run_id: Number(runId),
          p_child_id: Number(childId),
          p_sessions: sessionsToBuy,
          p_price_total: Number.isFinite(priceNum) ? priceNum : 0,
        });

        if (rpc2.error) throw rpc2.error;
      }

      toast(`تمت הוספה ${bulkSelectedCount} طفل/ילדים.`, "ok");

      setOpenBulk(false);
      setBulkQ("");
      setBulkSelected({});
      setBulkSessions(8);
      setBulkPriceMode("unified");
      setBulkUnifiedPrice(String(defaultPrice));
      setBulkPerChildPrice({});

      await loadFixed();
      setTab("participants");
    } catch (e) {
      setError(e);
      toast("הוספה קבוצתית נכשלה.", "danger");
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

      toast("מחיר החבילה עודכן.", "ok");
      setOpenPrice(false);
      setPricePackageId(null);
      setPriceValue("");
      await loadFixed();
    } catch (e) {
      setError(e);
      toast("עדכון המחיר נכשל.", "danger");
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
      toast("עדכון סטטוס ההרשמה נכשל.", "danger");
      return;
    }
    toast("סטטוס ההרשמה עודכן.", "ok");
    await loadFixed();
  }

  async function deleteEnrollment(enrollmentId) {
    setError(null);
    const d = await supabase
      .from("enrollments")
      .delete()
      .eq("id", enrollmentId);
    if (d.error) {
      setError(d.error);
      toast("מחיקת ההרשמה נכשלה.", "danger");
      return;
    }
    toast("ההרשמה למחזור הזה נמחקה.", "ok");
    await loadFixed();
  }

  async function generateSessions() {
    if (!firstStart) {
      toast("בחר שיעור ראשון.", "warn");
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

      toast("השיעורים הופקו.", "ok");
      await loadFixed();
      setTab("sessions");
    } catch (e) {
      setError(e);
      toast("הפקת השיעורים נכשלה.", "danger");
    } finally {
      setGenLoading(false);
    }
  }

  function openCreateSession() {
    setSessionForm({ id: null, start_at: "", end_at: "", status: "scheduled" });
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
      status: s.status,
    });
    setOpenSession(true);
  }

  async function saveSession() {
    if (!summary) return;
    if (!sessionForm.start_at || !sessionForm.end_at) {
      toast("קבע שעת התחלה וסיום.", "warn");
      return;
    }

    setSessionSaving(true);
    setError(null);
    try {
      const payload = {
        run_id: Number(runId),
        course_id: Number(summary.template_id),
        start_at: new Date(sessionForm.start_at).toISOString(),
        end_at: new Date(sessionForm.end_at).toISOString(),
        status: sessionForm.status,
      };

      if (sessionForm.id) {
        const u = await supabase
          .from("course_sessions")
          .update(payload)
          .eq("id", sessionForm.id);
        if (u.error) throw u.error;
        toast("השיעור עודכן.", "ok");
      } else {
        const ins = await supabase.from("course_sessions").insert([payload]);
        if (ins.error) throw ins.error;
        toast("השיעור נוסף.", "ok");
      }

      setOpenSession(false);
      await loadFixed();
      setTab("sessions");
    } catch (e) {
      setError(e);
      toast("שמירת השיעור נכשלה.", "danger");
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
      toast("עדכון סטטוס השיעור נכשל.", "danger");
      return;
    }
    toast("סטטוס השיעור עודכן.", "ok");
    await loadFixed();
  }

  async function deleteSession(sessionId) {
    const d = await supabase
      .from("course_sessions")
      .delete()
      .eq("id", sessionId);
    if (d.error) {
      setError(d.error);
      toast("מחיקת השיעור נכשלה.", "danger");
      return;
    }
    toast("השיעור נמחק.", "ok");
    await loadFixed();
  }

  function openPaymentModalFor(participantRow, mode = "remaining") {
    setPayEnrollmentId(String(participantRow.enrollment_id));
    const remaining = Number(participantRow.balance || 0);
    if (mode === "remaining")
      setPayAmount(remaining > 0 ? String(remaining.toFixed(2)) : "");
    else setPayAmount("");
    setPayMethod("cash");
    setPayNote("");
    setOpenPay(true);
  }

  async function addPayment() {
    if (!payEnrollmentId || !payAmount) return;

    setPaySaving(true);
    setError(null);
    try {
      const ins = await supabase.from("payments").insert([
        {
          enrollment_id: Number(payEnrollmentId),
          amount: Number(payAmount),
          method: payMethod,
          note: payNote.trim() || null,
        },
      ]);

      if (ins.error) throw ins.error;

      toast("המחזור נרשם.", "ok");
      setOpenPay(false);
      setPayEnrollmentId("");
      setPayAmount("");
      setPayMethod("cash");
      setPayNote("");
      await loadFixed();
      setTab("participants");
    } catch (e) {
      setError(e);
      toast("רישום המחזור נכשל.", "danger");
    } finally {
      setPaySaving(false);
    }
  }

  async function deletePayment(paymentId) {
    const d = await supabase.from("payments").delete().eq("id", paymentId);
    if (d.error) {
      setError(d.error);
      toast("מחיקת המחזור נכשלה.", "danger");
      return;
    }
    toast("המחזור נמחק.", "ok");
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
    setAdjAttended(attended);
    setAdjPkgRemaining(pkgRemain);
    setAdjRunFuture(runFuture);
    setAdjMaxAllowed(maxAllowed);
    setAdjNewAllocated(alloc);
    setAdjPkgDelta(0);
    setOpenAdjust(true);
  }

  // ✅ עריכה سريع لיתרת שיעורים (+/-) بدون פתח مودال الشراء
  async function doAdjustPackageTotal(packageId, delta) {
    try {
      setError(null);
      const rpc = await supabase.rpc("adjust_package_sessions_total", {
        p_package_id: Number(packageId),
        p_delta: Number(delta),
      });
      if (rpc.error) throw rpc.error;

      toast(
        delta > 0
          ? `تمت הוספה ${Math.abs(delta)} שיעור.`
          : `تم خصم ${Math.abs(delta)} שיעור.`,
        "ok",
      );

      await loadFixed();
    } catch (e) {
      setError(e);
      toast("עדכון השיעורים נכשל.", "danger");
    }
  }

  function quickAdjustFromManage(delta) {
    if (!manageP) return;

    // إذا ما ב باقة: الהוספה تكون عبر "شراء שיעורים" وليس עריכה مباشر
    if (!manageP.package_id) {
      if (delta > 0)
        toast("לא יש יתרה سابق — استخدم شراء שיעורים אולאً.", "warn");
      else toast("אין יתרה להורדה.", "warn");
      return;
    }

    // خصم: نطلب אישור
    if (delta < 0) {
      setConfirm({
        open: true,
        type: "pkgDelta",
        id: { packageId: manageP.package_id, delta },
        text: `خصم ${Math.abs(delta)} שיעור מ יתרה ${manageP.child_name}؟`,
      });
      return;
    }

    // הוספה سريعة
    doAdjustPackageTotal(manageP.package_id, delta);
  }

  async function saveAdjustments() {
    if (!adjEnrollmentId) return;

    setAdjSaving(true);
    setError(null);

    try {
      if (Number(adjNewAllocated) !== Number(adjAllocatedNow)) {
        const rpc = await supabase.rpc("adjust_enrollment_allocated_sessions", {
          p_enrollment_id: Number(adjEnrollmentId),
          p_new_allocated: Number(adjNewAllocated),
        });
        if (rpc.error) throw rpc.error;
      }

      if (adjPackageId && Number(adjPkgDelta) !== 0) {
        const rpc2 = await supabase.rpc("adjust_package_sessions_total", {
          p_package_id: Number(adjPackageId),
          p_delta: Number(adjPkgDelta),
        });
        if (rpc2.error) throw rpc2.error;
      }

      toast("השיעורים עודכנו בהצלחה.", "ok");
      setOpenAdjust(false);
      await loadFixed();
      setTab("participants");
    } catch (e) {
      setError(e);
      toast("עדכון השיעורים נכשל.", "danger");
    } finally {
      setAdjSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page page--runs">
        <div className="container runDetails" dir="rtl">
          
          <div className="card">טוען...</div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="page page--runs">
        <div className="container runDetails" dir="rtl">
          
          <div className="card">لم يتم العثور على מחזור.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page page--runs">
      <div className="container runDetails" dir="rtl">
        
      <div className="topbar">
        <div>
          <div className="h1">
            {summary.title} —{" "}
            <span className="muted" style={{ fontWeight: 700 }}>
              {summary.label}
            </span>
          </div>

          <div className="statRow" style={{ marginTop: 10 }}>
            <span className="statChip" title="משתתפים">
              <Users size={16} className="ico" />
              <span className="statLabel">משתתפים</span>
              <b className="ltrIso">{fmtNum(totals.activeCount)}</b>
            </span>
            <span className="statChip" title="שיעורים">
              <CalendarDays size={16} className="ico" />
              <span className="statLabel">שיעורים</span>
              <b className="ltrIso">{fmtNum(summary.sessions_count)}</b>
            </span>
            <span className="statChip" title="אחוז תשלום">
              <CreditCard size={16} className="ico" />
              <span className="statLabel">אחוז תשלום</span>
              <b className="ltrIso">{fmtNum((totals.paidRatio * 100).toFixed(0))}%</b>
            </span>
          </div>
        </div>

        <div className="topActions">
          <button
            type="button"
            className="btn"
            onClick={() => navigate(`/courses/${summary.template_id}`)}
          >
            חזרה للقالب
          </button>

          {nextSession && (
            <button
              type="button"
              className="btn primary"
              onClick={() => navigate(`/sessions/${nextSession.id}/attendance`)}
            >
              حضور השיעור הקרוב
            </button>
          )}

          <button type="button" className="btn" onClick={loadFixed}>
            רענן
          </button>
        </div>
      </div>

      <ErrorBanner error={error} />

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="runStrip">
          <div className="runItem">
            <div className="runIcon" aria-hidden="true">
              <Tag />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="runLabel">קורס</div>
              <div className="runValue">{summary.label || "—"}</div>
            </div>
          </div>

          <div className="runItem">
            <div className="runIcon" aria-hidden="true">
              <Clock />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="runLabel">היום / الساعة</div>
              <div className="runValue">
                {scheduleInfo.weekday}{" "}
                <span className="ltrIso">{scheduleInfo.timeRange}</span>
              </div>
            </div>
          </div>

          <div className="runItem">
            <div className="runIcon" aria-hidden="true">
              <CalendarClock />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="runLabel">השיעור הקרוב</div>
              <div className="runValue">
                <span className="ltrIso">{fmtDT(summary.next_session_at)}</span>
              </div>
            </div>
          </div>

          <div className="runItem">
            <div className="runIcon" aria-hidden="true">
              <CalendarPlus />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="runLabel">שיעורים קרובים</div>
              <div className="runValue">
                <span className="ltrIso">{fmtNum(runFutureSessionsCount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid" style={{ marginBottom: 12 }}>
        <div className="card" style={{ gridColumn: "span 4" }}>
          <div className="muted">סה"כ قيمة الباقات</div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>
            <span className="ltrIso">{fmtILS(totals.agreed,2)}</span>
          </div>
        </div>
        <div className="card" style={{ gridColumn: "span 4" }}>
          <div className="muted">סה"כ الשולם</div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>
            <span className="ltrIso">{fmtILS(totals.paid,2)}</span>
          </div>
        </div>
        <div className="card" style={{ gridColumn: "span 4" }}>
          <div className="muted">סה"כ المتبقي</div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>
            {totals.balance.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 10 }}>
        <button
          type="button"
          className={`tab ${tab === "participants" ? "active" : ""}`}
          onClick={() => setTab("participants")}
        >
          ילדים
        </button>
        <button
          type="button"
          className={`tab ${tab === "sessions" ? "active" : ""}`}
          onClick={() => setTab("sessions")}
        >
          שיעורים
        </button>
        <button
          type="button"
          className={`tab ${tab === "payments" ? "active" : ""}`}
          onClick={() => setTab("payments")}
        >
          תשלומים
        </button>
      </div>

      {/* ===================== PARTICIPANTS ===================== */}
      {tab === "participants" && (
        <div className="card">
          <div className="pToolbar">
            <div className="pTitle">
              <div className="h1">ילדים المسجلين</div>
              <div className="pTitleHint muted">
                اضغط على الكرت لפתח الניהול — والأزرار بالأسفل لלאختصارات.
              </div>
            </div>

            <div className="pControls">
              <div className="pSearchWrap">
                <span className="pSearchIcon" aria-hidden="true">
                  <Search size={16} className="ico" />
                </span>
                <input
                  className="input pSearch"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="חיפוש לפי שם הילד…"
                />
                {q ? (
                  <span className="pClearBtn">
                    <IconButton
                      icon={<XCircle size={16} className="ico" />}
                      title="נקה חיפוש"
                      size="sm"
                      variant="ghost"
                      onClick={() => setQ("")}
                    />
                  </span>
                ) : null}
              </div>

              <ModernSelect
                className="pSelect"
                value={paymentFilter}
                onChange={setPaymentFilter}
                menuWidth="trigger"
                options={[
                  { value: "all", label: "כל המצבים" },
                  { value: "paid", label: "שולם" },
                  { value: "partial", label: "חלקי" },
                  { value: "unpaid", label: "לא משלם" },
                  { value: "free", label: "חינם" },
                ]}
/>

              <ModernSelect
                className="pSelect"
                value={sortBy}
                onChange={setSortBy}
                menuWidth="trigger"
                options={[
                  { value: "balance_desc", label: "מיון: יתרה (גבוה לנמוך)" },
                  { value: "balance_asc", label: "מיון: יתרה (נמוך לגבוה)" },
                  { value: "name_asc", label: "מיון: שם (א-ת)" },
                  { value: "name_desc", label: "מיון: שם (ת-א)" },
                ]}
/>

              <div className="pAddGroup">
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    setEnrollLocked(false);
                    setEnrollLockedName("");
                    setSelectedChildId("");
                    setOpenEnroll(true);
                  }}
                >
                  <Plus size={16} className="ico" /> طفل
                </button>

                <button
                  type="button"
                  className="btn soft"
                  onClick={() => setOpenBulk(true)}
                >
                  <Plus size={16} className="ico" /> مجموعة
                </button>
              </div>
            </div>
          </div>

          <hr className="sep" />

          {participantsFiltered.length === 0 ? (
            <div className="muted">לא יש نتائج.</div>
          ) : (
            <div className="pGrid">
              {participantsFiltered.map((p) => {
                const agreed = Number(p.agreed_price || 0);
                const paid = Number(p.paid_amount || 0);
                const balance = Number(p.balance || 0);

                const attended = Number(p.sessions_attended_in_run || 0);

                const pkgRemain = Number(p.package_sessions_remaining || 0);
                const pkgTotal = Number(p.package_sessions_total || 0);
                const pkgUsed = Math.max(0, pkgTotal - pkgRemain);

                const runSessions = Number(
                  summary?.sessions_count || sessions.length || 0,
                );

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
                    role="button"
                    tabIndex={0}
                    onClick={() => openManageFor(p)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") openManageFor(p);
                    }}
                  >
                    <div className="pHead">
                      <div style={{ minWidth: 0 }}>
                        <div className="pName">{p.child_name}</div>
                        <div className="pMeta">
                          <span className="metaItem" title="כיתה/רמה">
                            <GraduationCap size={14} className="ico" />
                            <span>{p.class ?? "-"}</span>
                          </span>
                          <span className="metaItem" title="גיל">
                            <Cake size={14} className="ico" />
                            <span className="ltrIso">
                              {p.age == null ? "—" : fmtNum(p.age)}
                            </span>
                          </span>
                        </div>
                      </div>

                      <div>{badgePayment(p.payment_status)}</div>
                    </div>

                    <div className="pMain">
                      <div className="pBig" title="יתרה">
                        <div className="pBigTop">
                          <div className="pBigValue" dir="ltr">
                            {fmtILS(balance)}
                          </div>
                          <div className="pBigLabel">
                            <Hourglass size={14} className="ico" />{" "}
                            <span>متبقي</span>
                          </div>
                        </div>

                        <div className={barClass} aria-hidden="true">
                          <span style={{ width: `${pct}%` }} />
                        </div>

                        <div className="muted" style={{ fontSize: 12 }}>
                          <CreditCard size={14} className="ico" />{" "}
                          <span dir="ltr">{fmtILS(paid)}</span>{" "}
                          <span style={{ opacity: 0.6 }}>מ</span>{" "}
                          <span dir="ltr">{fmtILS(agreed)}</span>
                        </div>
                      </div>

                      <div className="pBig" title="יתרת שיעורים">
                        <div className="pBigTop">
                          <div className="pBigValue" dir="ltr">
                            {fmtNum(pkgRemain)}
                          </div>
                          <div className="pBigLabel">
                            <Ticket size={14} className="ico" />{" "}
                            <span>יתרה שיעורים</span>
                          </div>
                        </div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          <CheckCircle2 size={14} className="ico" />{" "}
                          <span style={{ opacity: 0.75 }}>تم استخدامها</span>{" "}
                          <b dir="ltr">{fmtNum(pkgUsed)}</b>{' '}
                          <span style={{ opacity: 0.55 }}> / </span>
                          <b dir="ltr">{fmtNum(pkgTotal)}</b>
                        </div>

                        <div className="muted" style={{ fontSize: 12 }}>
                          <CalendarDays size={14} className="ico" /> נוכח{" "}
                          <b dir="ltr">{fmtNum(attended)}</b>
                          <span style={{ opacity: 0.6 }}> / </span>
                          <b dir="ltr">{fmtNum(runSessions)}</b>{" "}
                          <span style={{ opacity: 0.65 }}>שיעורים بקורס</span>
                        </div>
                      </div>
                    </div>

                    <div
                      className="pActions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="pActionsLeft">
                        <IconButton
                          icon={<CreditCard size={16} className="ico" />}
                          title="הוסף מחזור"
                          variant="soft"
                          size="sm"
                          onClick={() => openPaymentModalFor(p, "remaining")}
                        />
                        <IconButton
                          icon={<Receipt size={16} className="ico" />}
                          title="יומן תשלומים"
                          variant="soft"
                          size="sm"
                          onClick={() => openPaymentHistory(p)}
                        />
                        <IconButton
                          icon={<Plus size={16} className="ico" />}
                          title="הוסף שיעורים"
                          variant="soft"
                          size="sm"
                          onClick={() => {
                            setEnrollLocked(true);
                            setEnrollLockedName(p.child_name);
                            setSelectedChildId(String(p.child_id));
                            setOpenEnroll(true);
                          }}
                        />
                        <IconButton
                          icon={<Settings2 size={16} className="ico" />}
                          title="ניהול"
                          variant="solid"
                          size="sm"
                          onClick={() => openManageFor(p)}
                        />
                      </div>

                      <div className="pActionHint muted">
                        تفاصيل أكثر داخل “ניהול”
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!nextSession && (
            <div className="muted" style={{ marginTop: 12 }}>
              אין שיעורים מתוזמנים بعد — اפתח تبويب “שיעורים” وولّد שיעורים.
            </div>
          )}
        </div>
      )}

      {/* ===================== SESSIONS ===================== */}
      {tab === "sessions" && (
        <div className="grid">
          <div className="card" style={{ gridColumn: "span 5" }}>
            <div className="h1">הפקה שיעורים</div>
            <div className="muted" style={{ marginTop: 6 }}>
              أسبوعي: كل 7 أيام (قابل للتغيير).
            </div>

            <hr className="sep" />

            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <div className="muted">אוل שיעור (تاريخ/זמן)</div>
                <input
                  className="input"
                  type="datetime-local"
                  value={firstStart}
                  onChange={(e) => setFirstStart(e.target.value)}
                />
              </div>

              <div className="row">
                <div style={{ flex: 1 }}>
                  <div className="muted">المدة (دقائق)</div>
                  <input
                    className="input"
                    type="number"
                    min="15"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="muted">מספר השיעורים</div>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <div className="muted">كل كم يوم؟</div>
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
                {genLoading ? "מפיק..." : "הפקה"}
              </button>

              <hr className="sep" />

              <button type="button" className="btn" onClick={openCreateSession}>
                + הוסף שיעור يدويًا
              </button>
            </div>
          </div>

          <div className="card" style={{ gridColumn: "span 7" }}>
            <div className="h1">قائمة שיעורים</div>
            <div className="muted" style={{ marginTop: 6 }}>
              اضغط “حضور” للהתחברות بسرعة.
            </div>

            <hr className="sep" />

            {sessions.length === 0 ? (
              <div className="muted">לא توجد שיעורים.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>الזמן</th>
                    <th>סטטוס</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td>
                        {fmtDT(s.start_at)} → {fmtDT(s.end_at)}
                      </td>
                      <td className="muted">{s.status}</td>
                      <td>
                        <div className="topActions">
                          <button
                            type="button"
                            className="btn primary"
                            onClick={() =>
                              navigate(`/sessions/${s.id}/attendance`)
                            }
                          >
                            حضور
                          </button>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => openEditSession(s)}
                          >
                            <Pencil size={16} className="ico" /> עריכה
                          </button>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => setSessionStatus(s.id, "done")}
                          >
                            <CheckCircle2 size={16} className="ico" /> סיום
                          </button>
                          <button
                            type="button"
                            className="btn danger"
                            onClick={() => setSessionStatus(s.id, "canceled")}
                          >
                            <XCircle size={16} className="ico" /> ביטול
                          </button>
                          <button
                            type="button"
                            className="btn danger"
                            onClick={() =>
                              setConfirm({
                                open: true,
                                type: "deleteSession",
                                id: s.id,
                                text: "למחוק את השיעור סופית?",
                              })
                            }
                          >
                            <Trash2 size={16} className="ico" /> מחיקה
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ===================== PAYMENTS TAB ===================== */}
      {tab === "payments" && (
        <div className="grid">
          <div className="card" style={{ gridColumn: "span 5" }}>
            <div className="h1">רישום מחזור</div>
            <div className="muted" style={{ marginTop: 6 }}>
              תשלומים مربوطة بחבילה (تستمر عبر מחזורים مختلفة).
            </div>

            <hr className="sep" />

            <button
              type="button"
              className="btn primary"
              onClick={() => setOpenPay(true)}
            >
              + רישום מחזור
            </button>
          </div>

          <div className="card" style={{ gridColumn: "span 7" }}>
            <div className="h1">מחזורים ילדים זו מחזור</div>
            <div className="muted" style={{ marginTop: 6 }}>
              זו القائمة تהצגה מחזורים الباقات الخاصة بילדים זו מחזור.
            </div>

            <hr className="sep" />

            {payments.length === 0 ? (
              <div className="muted">לא توجد מחזורים بعد.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>ילד</th>
                    <th>סכום</th>
                    <th>الשיטה</th>
                    <th>תאריך</th>
                    <th>مלאحظة</th>
                    <th></th>
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
                            onClick={() => navigate(`/children/${p.child_id}`)}
                          >
                            {p.child_name}
                          </button>
                        ) : (
                          p.child_name
                        )}
                      </td>
                      <td>{Number(p.amount).toFixed(2)}</td>
                      <td className="muted">{p.method}</td>
                      <td className="muted">{fmtDT(p.created_at)}</td>
                      <td className="muted">{p.note ?? "-"}</td>
                      <td>
                        <button
                          type="button"
                          className="btn danger"
                          onClick={() =>
                            setConfirm({
                              open: true,
                              type: "deletePayment",
                              id: p.id,
                              text: "למחוק את המחזור הזה?",
                            })
                          }
                        >
                          <Trash2 size={16} className="ico" /> מחיקה
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ===================== MODALS ===================== */}

      {/* ✅ כרטיס ניהול הילד داخل מחזור */}
      <Modal
        open={openManage}
        title={manageP ? `ניהול — ${manageP.child_name}` : "ניהול"}
        onClose={() => setOpenManage(false)}
      >
        {!manageP ? (
          <div className="card">—</div>
        ) : (
          <div className="grid">
            <div style={{ gridColumn: "span 12" }} className="card">
              <div style={{ fontSize: 18, fontWeight: 900 }}>
                {manageP.child_name}{" "}
                <span className="muted" style={{ fontWeight: 700 }}>
                  — {manageP.class ?? "-"} — גיל: {manageP.age ?? "-"}
                </span>
              </div>

              <div className="muted" style={{ marginTop: 8 }}>
                حالة الدفع: {badgePayment(manageP.payment_status)} — قيمة
                חבילה: <b>{Number(manageP.agreed_price || 0).toFixed(2)}</b> —
                שולם: <b>{Number(manageP.paid_amount || 0).toFixed(2)}</b> —
                متبقي: <b>{Number(manageP.balance || 0).toFixed(2)}</b>
              </div>

              <div className="muted" style={{ marginTop: 8 }}>
                <Ticket size={14} className="ico" />{" "}
                <span style={{ opacity: 0.75 }}>שיעורים</span>{" "}
                <b dir="ltr">{fmtNum(manageP.package_sessions_remaining ?? 0)}</b>{" "}
                <span style={{ opacity: 0.6 }}>متبقي</span>
                <span style={{ opacity: 0.6 }}> — </span>
                <CheckCircle2 size={14} className="ico" />{" "}
                <span style={{ opacity: 0.75 }}>تم استخدامها</span>{" "}
                <b dir="ltr">
                  {fmtNum(
                    Math.max(
                      0,
                      (manageP.package_sessions_total ?? 0) -
                        (manageP.package_sessions_remaining ?? 0),
                    ),
                  )}
                </b>
                <span style={{ opacity: 0.6 }}> / </span>
                <b dir="ltr">{fmtNum(manageP.package_sessions_total ?? 0)}</b>
                <span style={{ opacity: 0.6 }}> — </span>
                <CalendarDays size={14} className="ico" />{" "}
                <span style={{ opacity: 0.75 }}>حضر</span>{" "}
                <b dir="ltr">{fmtNum(manageP.sessions_attended_in_run ?? 0)}</b>
              </div>
            </div>

            {/* Contact */}
            <div style={{ gridColumn: "span 12" }} className="card">
              <div style={{ fontWeight: 900, marginBottom: 8 }}>التواصل</div>

              <div className="grid">
                <div style={{ gridColumn: "span 6" }}>
                  <div className="muted">שם האם</div>
                  <div style={{ fontWeight: 800 }}>
                    {manageChild?.mother_name ?? "-"}
                  </div>
                </div>
                <div style={{ gridColumn: "span 6" }}>
                  <div className="muted">טלפון האם</div>
                  <div className="row" style={{ gap: 10 }}>
                    <div style={{ fontWeight: 800 }}>
                      {manageChild?.mother_phone ?? "-"}
                    </div>
                    {manageChild?.mother_phone ? (
                      <button
                        type="button"
                        className="iconBtn"
                        onClick={async () => {
                          const ok = await copyText(manageChild.mother_phone);
                          toast(
                            ok ? "הועתק." : "ההעתקה נכשלה.",
                            ok ? "ok" : "danger",
                          );
                        }}
                        title="העתק"
                      >
                        <Copy size={16} className="ico" />
                      </button>
                    ) : null}
                  </div>
                </div>

                <div style={{ gridColumn: "span 6" }}>
                  <div className="muted">שם האב</div>
                  <div style={{ fontWeight: 800 }}>
                    {manageChild?.father_name ?? "-"}
                  </div>
                </div>
                <div style={{ gridColumn: "span 6" }}>
                  <div className="muted">טלפון האב</div>
                  <div className="row" style={{ gap: 10 }}>
                    <div style={{ fontWeight: 800 }}>
                      {manageChild?.father_phone ?? "-"}
                    </div>
                    {manageChild?.father_phone ? (
                      <button
                        type="button"
                        className="iconBtn"
                        onClick={async () => {
                          const ok = await copyText(manageChild.father_phone);
                          toast(
                            ok ? "הועתק." : "ההעתקה נכשלה.",
                            ok ? "ok" : "danger",
                          );
                        }}
                        title="העתק"
                      >
                        <Copy size={16} className="ico" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <IconButton
                  icon={<ExternalLink size={16} className="ico" />}
                  title="פתח את קובץ הילד המלא"
                  variant="ghost"
                  size="sm"
                  style={{ marginInlineStart: 8 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/children/${manageP.child_id}`);
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ gridColumn: "span 12" }} className="card">
              <div style={{ fontWeight: 900, marginBottom: 10 }}>שיעורים</div>

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
                  <div className="muted">סה"כ חבילה</div>
                  <div style={{ fontWeight: 900, fontSize: 18 }} dir="ltr">
                    {fmtNum(manageP.package_sessions_total ?? 0)}
                  </div>
                </div>

                <div>
                  <div className="muted">متبقي</div>
                  <div style={{ fontWeight: 900, fontSize: 18 }} dir="ltr">
                    {fmtNum(manageP.package_sessions_remaining ?? 0)}
                  </div>
                </div>

                <div>
                  <div className="muted">حضر ב זו מחזור</div>
                  <div style={{ fontWeight: 900, fontSize: 18 }} dir="ltr">
                    {fmtNum(manageP.sessions_attended_in_run ?? 0)}
                  </div>
                </div>

                <div>
                  <div className="muted">متوسط מחיר الשיעור</div>
                  <div style={{ fontWeight: 900, fontSize: 18 }} dir="ltr">
                    {(() => {
                      const total = Number(manageP.agreed_price || 0);
                      const s = Number(manageP.package_sessions_total || 0);
                      return fmtILS(s > 0 ? total / s : 0);
                    })()}
                  </div>
                </div>

                <div className="row" style={{ gap: 10 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setOpenManage(false);
                        setEnrollLocked(true);
                        setEnrollLockedName(manageP.child_name);
                        setSelectedChildId(String(manageP.child_id));
                        setOpenEnroll(true);
                      }}
                    >
                      <ShoppingCart size={16} className="ico" /> شراء שיעורים
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
                      title="עריכה מהירה ליתרה (ללא תשלום)"
                    >
                      <button
                        type="button"
                        className="btn"
                        style={{ padding: "8px 12px" }}
                        onClick={() => quickAdjustFromManage(-1)}
                        title="הורד שיעור"
                      >
                        ➖
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{ padding: "8px 12px" }}
                        onClick={() => quickAdjustFromManage(1)}
                        title="הוסף שיעור"
                      >
                        ➕
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <hr className="sep" />

              <div style={{ fontWeight: 900, marginBottom: 10 }}>الשולםات</div>
              <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
                <button
                  type="button"
                  className="btn primary"
                  disabled={Number(manageP.balance || 0) <= 0}
                  onClick={() => {
                    setOpenManage(false);
                    openPaymentModalFor(manageP, "remaining");
                  }}
                >
                  دفع المتبقي
                </button>

                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setOpenManage(false);
                    openPaymentModalFor(manageP, "custom");
                  }}
                >
                  רישום מחזור
                </button>

                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setOpenManage(false);
                    openPaymentHistory(manageP);
                  }}
                >
                  יומן תשלומים
                </button>

                <button
                  type="button"
                  className="btn"
                  disabled={!manageP.package_id}
                  onClick={() => {
                    setOpenManage(false);
                    setPricePackageId(manageP.package_id);
                    setPriceValue(String(Number(manageP.agreed_price || 0)));
                    setOpenPrice(true);
                  }}
                >
                  עריכה الמחיר
                </button>
              </div>

              <hr className="sep" />

              <div style={{ fontWeight: 900, marginBottom: 10 }}>
                الרישום ב מחזור
              </div>
              <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
                {manageP.enrollment_status === "active" ? (
                  <button
                    type="button"
                    className="btn danger"
                    onClick={() => {
                      setOpenManage(false);
                      setConfirm({
                        open: true,
                        type: "inactive",
                        id: manageP.enrollment_id,
                        text: `إيقاف רישום: ${manageP.child_name}`,
                      });
                    }}
                  >
                    إيقاف
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => {
                      setOpenManage(false);
                      setConfirm({
                        open: true,
                        type: "active",
                        id: manageP.enrollment_id,
                        text: `הפעל מחדש: ${manageP.child_name}`,
                      });
                    }}
                  >
                    تفعيل
                  </button>
                )}

                <button
                  type="button"
                  className="btn danger"
                  onClick={() => {
                    setOpenManage(false);
                    setConfirm({
                      open: true,
                      type: "deleteEnroll",
                      id: manageP.enrollment_id,
                      text: `מחיקה רישום מ זו מחזור: ${manageP.child_name}`,
                    });
                  }}
                >
                  מחיקה الרישום
                </button>

                <button
                  type="button"
                  className="btn"
                  onClick={() => setOpenManage(false)}
                >
                  סגור
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ✅ مودال רישום طفل */}
      <Modal
        open={openEnroll}
        title={enrollLocked ? `הוסף שיעורים — ${enrollLockedName}` : "רישום طفل"}
        onClose={() => setOpenEnroll(false)}
      >
        <div className="muted">
          إذا للطفل יתרה שיעורים سابق، تقدر تختار “استخدم الיתרה”.
        </div>

        <hr className="sep" />

        <div className="grid">
          <div style={{ gridColumn: "span 12" }}>
            <div className="muted">הילד</div>
            <ModernSelect
              value={selectedChildId}
              onChange={setSelectedChildId}
              menuWidth="trigger"
              disabled={enrollLocked}
              placeholder="— בחר ילד —"
              options={[
                { value: "", label: "— בחר ילד —" },
                ...((enrollLocked ? children : availableChildren) || []).map((c) => ({
                  value: c.id,
                  label: `${c.name} — ${c.class ?? "-"} — גיל: ${c.age ?? "-"}`,
                })),
              ]}
/>
          </div>

          <div style={{ gridColumn: "span 12" }} className="card">
            {pkgLoading ? (
              <div>جاري فحص יתרה חבילה...</div>
            ) : pkgInfo ? (
              <div className="muted">
                יתרה שיעורים سابق: <b>{Number(pkgInfo.sessions_remaining || 0)}</b>{" "}
                — المتبقي للدفع:{" "}
                <b>{Number(pkgInfo.balance_amount || 0).toFixed(2)}</b>
              </div>
            ) : (
              <div className="muted">
                לא יש יתרה سابق لזה القالب (או لم يتم فحصه بعد).
              </div>
            )}

            <div className="muted" style={{ marginTop: 8 }}>
              שיעורים קרובים ב זו מחזור: <b>{singlePreview.runFuture}</b> — הקצאה
              الآن: <b>{singlePreview.allocNow}</b> — ترحيل:{" "}
              <b>{singlePreview.carry}</b>
            </div>
          </div>

          <div style={{ gridColumn: "span 12" }}>
            <div className="muted">שיטה الרישום</div>
            <ModernSelect
              value={enrollMode}
              onChange={setEnrollMode}
              menuWidth="trigger"
              disabled={enrollLocked}
              options={[
                { value: "auto", label: "אוטומטי" },
                { value: "use_existing", label: "השתמש ביתרה הקיימת" },
                { value: "buy_new", label: "רכישת שיעורים חדשים" },
              ]}
/>
          </div>
          {(enrollMode === "use_existing" ||
            (enrollMode === "auto" &&
              pkgInfo &&
              Number(pkgInfo.sessions_remaining || 0) > 0)) && (
            <div style={{ gridColumn: "span 12" }} className="card">
              <div className="muted">
                عند <b>استخدام الיתרה الموجود</b>، מחיר/مبلغ חבילה يأتي מ
                חבילה السابقة لذلك לא نُعدّل الסה"כ هنا. إذا بدك تحدد مبلغ
                جديد، غيّر “שיטה الרישום” إلى <b>רכישת שיעורים חדשים</b>.
              </div>
            </div>
          )}

          {(enrollMode === "buy_new" ||
            (enrollMode === "auto" &&
              (!pkgInfo || Number(pkgInfo.sessions_remaining || 0) <= 0)) ||
            enrollLocked) && (
            <>
              <div style={{ gridColumn: "span 4" }}>
                <div className="muted">מספר השיעורים للشراء</div>
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
                <div className="muted">מחיר الשיעור</div>
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
                <div className="muted">סכום الסה"כ</div>
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
                  غيّر الסה"כ או מחיר الשיעור — رح يتحدث الثاني אוטומטיًا.
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
              {enrollSaving ? "שומר..." : "שמור"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setOpenEnroll(false)}
            >
              ביטול
            </button>
          </div>
        </div>
      </Modal>

      {/* ✅ مودال רישום مجموعة */}
      <Modal
        open={openBulk}
        title="רישום مجموعة ילדים"
        onClose={() => setOpenBulk(false)}
      >
        <div className="muted">
          اختَر عدة ילדים מ الجدول ثم اضغط “הוספה”. إذا طفل عنده יתרה שיעורים سابق
          سيتم استخدامه אוטומטיًا.
        </div>

        <hr className="sep" />

        <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
          <input
            className="input"
            style={{ width: 260 }}
            placeholder="חיפוש לפי שם הילד..."
            value={bulkQ}
            onChange={(e) => setBulkQ(e.target.value)}
          />
          <button type="button" className="btn" onClick={bulkSelectAllFiltered}>
            تحديد הכול
          </button>
          <button
            type="button"
            className="btn danger"
            onClick={bulkClearSelection}
          >
            נקה التحديد
          </button>

          <div className="muted" style={{ alignSelf: "center" }}>
            المحدد: <b>{bulkSelectedCount}</b>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          {bulkCandidates.length === 0 ? (
            <div className="card">לא יש ילדים متاحين.</div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: 60 }}></th>
                    <th>اלאسم</th>
                    <th>כיתה</th>
                    <th>גיל</th>
                    <th>جنس</th>
                    <th>טלפון האם</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkCandidates.map((c) => {
                    const checked = !!bulkSelected[String(c.id)];
                    return (
                      <tr key={c.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleBulkChild(c.id)}
                          />
                        </td>
                        <td style={{ fontWeight: 800 }}>{c.name}</td>
                        <td className="muted">{c.class ?? "-"}</td>
                        <td className="muted">{c.age ?? "-"}</td>
                        <td className="muted">{c.gender ?? "-"}</td>
                        <td className="muted">{c.mother_phone ?? "-"}</td>
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
            <div className="muted">מספר השיעורים (للילדים بدون יתרה سابق)</div>
            <input
              className="input"
              type="number"
              min="1"
              value={bulkSessions}
              onChange={(e) => setBulkSessions(e.target.value)}
            />
          </div>

          <div style={{ gridColumn: "span 4" }}>
            <div className="muted">تسعير</div>
            <ModernSelect
              value={bulkPriceMode}
              onChange={setBulkPriceMode}
              menuWidth="trigger"
              options={[
                { value: "unified", label: "מחיר אחיד" },
                { value: "perChild", label: "מחיר לכל ילד" },
              ]}
/>
          </div>

          <div style={{ gridColumn: "span 4" }}>
            <div className="muted">الמחיר</div>
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
                * الמחיר לכל ילד (إن احتجته) نطوره بالخطوة القادمة.
              </div>
            )}
          </div>

          <div className="row" style={{ gridColumn: "span 12" }}>
            <button
              type="button"
              className="btn primary"
              disabled={bulkSaving || bulkSelectedCount === 0}
              onClick={bulkPurchaseAndEnroll}
            >
              {bulkSaving ? "מוסיף..." : `הוספה (${bulkSelectedCount})`}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setOpenBulk(false)}
            >
              ביטול
            </button>
          </div>
        </div>
      </Modal>

      {/* עריכה الמחיר */}
      <Modal
        open={openPrice}
        title="עריכה מחיר חבילה"
        onClose={() => setOpenPrice(false)}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <div className="muted">מחיר חבילה (סה"כ)</div>
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
              שמור
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setOpenPrice(false)}
            >
              ביטול
            </button>
          </div>
        </div>
      </Modal>

      {/* רישום מחזור */}
      <Modal
        open={openPay}
        title="רישום מחזור"
        onClose={() => setOpenPay(false)}
      >
        <div className="grid">
          <div style={{ gridColumn: "span 12" }}>
            <div className="muted">בחר הילד (מ זו מחזור)</div>
            <ModernSelect
              value={payEnrollmentId}
              onChange={setPayEnrollmentId}
              menuWidth="trigger"
              options={[
                { value: "", label: "—" },
                ...participants
                  .filter((p) => p.enrollment_status === "active")
                  .map((p) => ({
                    value: p.enrollment_id,
                    label: `${p.child_name} — יתרה ${Number(p.balance).toFixed(2)}`,
                  })),
              ]}
/>
          </div>

          <div style={{ gridColumn: "span 6" }}>
            <div className="muted">סכום</div>
            <input
              className="input"
              type="number"
              min="0.01"
              step="0.01"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
          </div>

          <div style={{ gridColumn: "span 6" }}>
            <div className="muted">الשיטה</div>
            <ModernSelect
              value={payMethod}
              onChange={setPayMethod}
              menuWidth="trigger"
              options={[
                { value: "cash", label: "במזומן" },
                { value: "card", label: "כרטיס" },
                { value: "transfer", label: "העברה" },
                { value: "other", label: "אחר" },
              ]}
/>
          </div>

          <div style={{ gridColumn: "span 12" }}>
            <div className="muted">مלאحظة</div>
            <input
              className="input"
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
              {paySaving ? "שומר..." : "שמור"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setOpenPay(false)}
            >
              ביטול
            </button>
          </div>
        </div>
      </Modal>

      {/* יומן תשלומים */}
      <Modal
        open={openHistory}
        title="יומן מחזורי חבילה"
        onClose={() => setOpenHistory(false)}
      >
        <div className="muted" style={{ marginBottom: 10 }}>
          {historyEnrollment
            ? `${historyEnrollment.child_name} — متبقي: ${Number(historyEnrollment.balance).toFixed(2)}`
            : ""}
        </div>

        {historyLoading ? (
          <div className="card">טוען...</div>
        ) : historyRows.length === 0 ? (
          <div className="card">לא توجد מחזורים.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>סכום</th>
                <th>الשיטה</th>
                <th>תאריך</th>
                <th>مלאحظة</th>
                <th></th>
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
                  <td>
                    <button
                      type="button"
                      className="btn danger"
                      onClick={() =>
                        setConfirm({
                          open: true,
                          type: "deletePayment",
                          id: x.id,
                          text: "למחוק את המחזור הזה?",
                        })
                      }
                    >
                      <Trash2 size={16} className="ico" /> מחיקה
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>

      {/* עריכה/הוסף שיעור */}
      <Modal
        open={openSession}
        title={sessionForm.id ? "עריכת שיעור" : "הוסף שיעור"}
        onClose={() => setOpenSession(false)}
      >
        <div className="grid">
          <div style={{ gridColumn: "span 6" }}>
            <div className="muted">البداية</div>
            <input
              className="input"
              type="datetime-local"
              value={sessionForm.start_at}
              onChange={(e) =>
                setSessionForm((p) => ({ ...p, start_at: e.target.value }))
              }
            />
          </div>

          <div style={{ gridColumn: "span 6" }}>
            <div className="muted">النهاية</div>
            <input
              className="input"
              type="datetime-local"
              value={sessionForm.end_at}
              onChange={(e) =>
                setSessionForm((p) => ({ ...p, end_at: e.target.value }))
              }
            />
          </div>

          <div style={{ gridColumn: "span 12" }}>
            <div className="muted">الحالة</div>
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
              {sessionSaving ? "שומר..." : "שמור"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setOpenSession(false)}
            >
              ביטול
            </button>
          </div>
        </div>
      </Modal>

      {/* עריכה שיעורים */}
      <Modal
        open={openAdjust}
        title={`עריכה שיעורים — ${adjChildName}`}
        onClose={() => setOpenAdjust(false)}
      >
        <div className="muted">
          تقدر تنقص/تزيد:
          <br />
          1) שיעורים מוקצהة لזו מחזור
          <br />
          2) יתרה חבילה نفسه (إذا الشراء غلط)
        </div>

        <hr className="sep" />

        <div className="grid">
          <div style={{ gridColumn: "span 12" }} className="card">
            <div className="muted">
              حضر: <b>{adjAttended}</b> — שיעורים קרובים بמחזור:{" "}
              <b>{adjRunFuture}</b> — יתרה חבילה المتبقي:{" "}
              <b>{adjPkgRemaining}</b>
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              أقصى הקצאה مسموح الآن: <b>{adjMaxAllowed}</b>
            </div>
          </div>

          <div style={{ gridColumn: "span 6" }}>
            <div className="muted">שיעורים מחזור (הקצאה)</div>
            <input
              className="input"
              type="number"
              min={adjAttended}
              max={adjMaxAllowed}
              value={adjNewAllocated}
              onChange={(e) => setAdjNewAllocated(e.target.value)}
            />
          </div>

          <div style={{ gridColumn: "span 6" }}>
            <div className="muted">עריכה יתרה חבילה (Δ שיעורים)</div>
            <input
              className="input"
              type="number"
              step="1"
              value={adjPkgDelta}
              onChange={(e) => setAdjPkgDelta(e.target.value)}
              disabled={!adjPackageId}
              placeholder="לדוגמה: ‎-3 או +2"
            />
          </div>

          <div className="row" style={{ gridColumn: "span 12" }}>
            <button
              type="button"
              className="btn primary"
              disabled={adjSaving}
              onClick={saveAdjustments}
            >
              {adjSaving ? "שומר..." : "שמור"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setOpenAdjust(false)}
            >
              ביטול
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm */}
      <ConfirmDialog
        open={confirm.open}
        title="אישור"
        message={confirm.text}
        confirmText="כן"
        cancelText="ביטול"
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
          if (type === "deleteEnroll") await deleteEnrollment(id);

          if (type === "deleteSession") await deleteSession(id);
          if (type === "deletePayment") await deletePayment(id);
        }}
      />
      </div>
    </div>
  );
}
