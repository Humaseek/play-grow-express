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
  if (!dt) return "-";
  return new Intl.DateTimeFormat("en-IL", { weekday: "long" }).format(
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
  if (status === "paid") return <Badge variant="ok">Paid</Badge>;
  if (status === "partial") return <Badge variant="warn">Partial</Badge>;
  if (status === "unpaid") return <Badge variant="danger">Unpaid</Badge>;
  return <Badge variant="info">Free</Badge>;
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
    birth_date: "",
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

  // Payment history modal
  const [openHistory, setOpenHistory] = useState(false);
  const [historyEnrollment, setHistoryEnrollment] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Sessions generator
  const [firstStart, setFirstStart] = useState("");
  const [durationMinutes, setDurationMinutesutes] = useState(60);
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

  // ✅ Manage Enrollment (single child in this run) — 8
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
        "id,name,age,class,gender,mother_name,mother_phone,father_name,father_phone,birth_date",
      )
      .order("name", { ascending: true });

    if (!tryView.error) return tryView.data ?? [];

    const tryTable = await supabase
      .from("children")
      .select(
        "id,name,birth_date,class,gender,mother_name,mother_phone,father_name,father_phone",
      )
      .order("name", { ascending: true });

    if (tryTable.error) throw tryTable.error;

    return (tryTable.data ?? []).map((r) => ({
      ...r,
      age: calcAge(r.birth_date),
    }));
  }

  async function createChildInline({ enrollNow = false } = {}) {
    const name = (newChildForm.name || "").trim();
    const birth = (newChildForm.birth_date || "").trim();
    if (!name || !birth) {
      toast("Name and birth date are required.", "warn");
      return;
    }

    setNewChildSaving(true);
    setError(null);

    try {
      let countryId = newChildForm.country_id ? Number(newChildForm.country_id) : null;

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
        birth_date: birth,
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
        setOpenEnroll(true);
        setEnrollMode("buy_new");
        toast("Child created. Set sessions and click Save to enroll.", "ok");
      } else {
        toast("Child created.", "ok");
      }

      // reset
      setNewChildForm({
        name: "",
        birth_date: "",
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

  // ✅ ( /Edit) manageP stale
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
    // setEnrollMode("auto");
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
  const sessionsToBuy = Number.isFinite(sessionsToBuyRaw) ? sessionsToBuyRaw : 0;

  const priceTotalNum = (() => {
    const s = Number.isFinite(sessionsToBuy) && sessionsToBuy > 0
      ? sessionsToBuy
      : 0;

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

      // Add sessions back to the package total (keeps sessions_used consistent)
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
      toast("Enrollment re-activated. Add sessions then click Save.", "ok");
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


async function reactivateWithdrawnEnrollmentBulk(childId, sessionsToBuy, priceTotalNum) {
  // Bulk-safe variant of reactivateWithdrawnEnrollment:
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
      // If previously removed (withdrawn), re-activate instead of inserting a new enrollment.
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
          openManageFor(existing);
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

        // Withdrawn -> reactivate instead of inserting a new row
        if (existingStatus === "withdrawn") {
          const ok = await reactivateWithdrawnEnrollmentBulk(cid, sessionsToBuy, priceNum);
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
            const ok = await reactivateWithdrawnEnrollmentBulk(cid, sessionsToBuy, priceNum);
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

      // Refresh run state
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
      setBulkSessions(8);
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

      toast("Enrollment updated.", "ok");
      setOpenPrice(false);
      setPricePackageId(null);
      setPriceValue("");
      await loadFixed();
    } catch (e) {
      setError(e);
      toast("Failed to edit enrollment.", "danger");
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
        `Removed ${childName} from this course. Remaining sessions set to 0.`,
        "ok",
      );
      await loadFixed();
    } catch (e) {
      setError(e);
      toast("Failed to remove enrollment.", "danger");
    }
  }

  // (Removed stray block that was outside an async function and broke Vite build.)

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
      toast("Please choose a first session date/time.", "warn");
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
        toast("Enrollment updated.", "ok");
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

      toast("Payment added.", "ok");
      setOpenPay(false);
      setPayEnrollmentId("");
      setPayAmount("");
      setPayMethod("cash");
      setPayNote("");
      await loadFixed();
      setTab("participants");
    } catch (e) {
      setError(e);
      toast("Failed to add payment.", "danger");
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
    setAdjAttended(attended);
    setAdjPkgRemaining(pkgRemain);
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
      toast("Failed to edit enrollment.", "danger");
    }
  }

  function quickAdjustFromManage(delta) {
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

      toast("Enrollment updated.", "ok");
      setOpenAdjust(false);
      await loadFixed();
      setTab("participants");
    } catch (e) {
      setError(e);
      toast("Failed to edit enrollment.", "danger");
    } finally {
      setAdjSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page page--runs">
        <div className="container runDetails">
          <div className="card">Loading...</div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="page page--runs">
        <div className="container runDetails">
          <div className="card"> .</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page page--runs">
      <div className="container runDetails">
        <div className="topbar">
          <div>
            <div className="h1">
              {summary.title} —{" "}
              <span className="muted" style={{ fontWeight: 700 }}>
                {summary.label}
              </span>
            </div>

            <div className="statRow" style={{ marginTop: 10 }}>
              <span className="statChip" title="">
                <Users size={16} className="ico" />
                <span className="statLabel">Participants</span>
                <b className="ltrIso">{fmtNum(totals.activeCount)}</b>
              </span>
              <span className="statChip" title="">
                <CalendarDays size={16} className="ico" />
                <span className="statLabel">Sessions</span>
                <b className="ltrIso">{fmtNum(summary.sessions_count)}</b>
              </span>
              <span className="statChip" title=" ">
                <CreditCard size={16} className="ico" />
                <span className="statLabel">Payment rate</span>
                <b className="ltrIso">
                  {fmtNum((totals.paidRatio * 100).toFixed(0))}%
                </b>
              </span>
            </div>
          </div>

          <div className="topActions">
            <button
              type="button"
              className="btn"
              onClick={() => navigate(`/courses/${summary.template_id}`)}
            >
              Back
            </button>

            {nextSession && (
              <button
                type="button"
                className="btn primary"
                onClick={() =>
                  navigate(`/sessions/${nextSession.id}/attendance`)
                }
              >
                Attendance
              </button>
            )}

            <button type="button" className="btn" onClick={loadFixed}>
              Refresh
            </button>
          </div>
        </div>
        {error ? <ErrorBanner error={error} /> : null}

        <div className="card" style={{ marginBottom: 12 }}>
          <div className="runStrip">
            <div className="runItem">
              <div className="runIcon" aria-hidden="true">
                <Tag />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="runLabel">Loading...</div>
                <div className="runValue">{summary.label || "—"}</div>
              </div>
            </div>

            <div className="runItem">
              <div className="runIcon" aria-hidden="true">
                <Clock />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="runLabel">Schedule</div>
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
                <div className="runLabel">Next session</div>
                <div className="runValue">
                  <span className="ltrIso">
                    {fmtDT(summary.next_session_at)}
                  </span>
                </div>
              </div>
            </div>

            <div className="runItem">
              <div className="runIcon" aria-hidden="true">
                <CalendarPlus />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="runLabel">Course</div>
                <div className="runValue">
                  <span className="ltrIso">
                    {fmtNum(runFutureSessionsCount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid" style={{ marginBottom: 12 }}>
          <div className="card" style={{ gridColumn: "span 4" }}>
            <div className="muted">Agreed</div>
            <div style={{ fontSize: 26, fontWeight: 900 }}>
              <span className="ltrIso">{fmtILS(totals.agreed, 2)}</span>
            </div>
          </div>
          <div className="card" style={{ gridColumn: "span 4" }}>
            <div className="muted">Paid</div>
            <div style={{ fontSize: 26, fontWeight: 900 }}>
              <span className="ltrIso">{fmtILS(totals.paid, 2)}</span>
            </div>
          </div>
          <div className="card" style={{ gridColumn: "span 4" }}>
            <div className="muted">Balance</div>
            <div style={{ fontSize: 26, fontWeight: 900 }}>
              <span className="ltrIso">{fmtILS(totals.balance, 2)}</span>
            </div>
          </div>
        </div>

        <div className="tabs" style={{ marginBottom: 10 }}>
          <button
            type="button"
            className={`tab ${tab === "participants" ? "active" : ""}`}
            onClick={() => setTab("participants")}
          >
            Children
          </button>
          <button
            type="button"
            className={`tab ${tab === "sessions" ? "active" : ""}`}
            onClick={() => setTab("sessions")}
          >
            Sessions
          </button>
          <button
            type="button"
            className={`tab ${tab === "payments" ? "active" : ""}`}
            onClick={() => setTab("payments")}
          >
            Payments
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
                <h2>Children</h2>
                <div className="muted small">
                  {participantsFiltered.length} of {participants.length}
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
                      placeholder="Search Child..."
                      style={{ width: "100%", paddingLeft: 38 }}
                    />
                  </div>

                  <select
                    className="input"
                    value={childStatusFilter}
                    onChange={(e) => setChildStatusFilter(e.target.value)}
                    style={{ flex: "0 1 150px", minWidth: 130 }}
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>

                  <select
                    className="input"
                    value={childSort}
                    onChange={(e) => setChildSort(e.target.value)}
                    style={{ flex: "0 1 210px", minWidth: 170 }}
                  >
                    <option value="balance_desc">Balance: high to low</option>
                    <option value="balance_asc">Balance: low to high</option>
                    <option value="name_asc">Name: A to Z</option>
                    <option value="name_desc">Name: Z to A</option>
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
                    onClick={() => {
                      setEnrollLocked(false);
                      setOpenEnroll(true);
                    }}
                  >
                    + Add child to course
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={() => setOpenBulk(true)}
                  >
                    + Add multiple
                  </button>

                  <button
                    type="button"
                    className="btn primary"
                    onClick={openCreateEnroll}
                  >
                    <Plus size={16} /> Add &amp; Enroll
                  </button>
                </div>
              </div>
            </div>

            <hr className="sep" />

            {participantsFiltered.length === 0 ? (
              <div className="muted">No items found.</div>
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
                      style={{ width: 380, maxWidth: "100%" }}
                      role="button"
                      tabIndex={0}
                      onClick={() => openManageFor(p)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          openManageFor(p);
                      }}
                    >
                      <div className="pHead">
                        <div style={{ minWidth: 0 }}>
                          <div className="pName">{p.child_name}</div>
                          <div className="pMeta">
                            <span className="metaItem" title="/">
                              <GraduationCap size={14} className="ico" />
                              <span>{p.class ?? "-"}</span>
                            </span>
                            <span className="metaItem" title="">
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
                        <div className="pBig" title="Amount ">
                          <div className="pBigTop">
                            <div className="pBigValue" dir="ltr" style={{ overflow: "visible", textOverflow: "clip", whiteSpace: "nowrap" }} title={fmtILS(balance)}>
                              {fmtILS(balance)}
                            </div>
                            <div className="pBigLabel">
                              <Hourglass size={14} className="ico" />{" "}
                              <span>Remaining</span>
                            </div>
                          </div>

                          <div className={barClass} aria-hidden="true">
                            <span style={{ width: `${pct}%` }} />
                          </div>

                          <div className="muted" style={{ fontSize: 12, display: "grid", gap: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <CreditCard size={14} className="ico" />
                              <span style={{ opacity: 0.75 }}>Paid</span>
                              <b dir="ltr">{fmtILS(paid)}</b>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Tag size={14} className="ico" />
                              <span style={{ opacity: 0.75 }}>Agreed</span>
                              <b dir="ltr">{fmtILS(agreed)}</b>
                            </div>
                          </div>
                        </div>

                        <div className="pBig" title=" ">
                          <div className="pBigTop">
                            <div className="pBigValue" dir="ltr">
                              {fmtNum(pkgRemain)}
                            </div>
                            <div className="pBigLabel">
                              <Ticket size={14} className="ico" />{" "}
                              <span>Session balance</span>
                            </div>
                          </div>
                          <div className="muted" style={{ fontSize: 12, display: "grid", gap: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <CheckCircle2 size={14} className="ico" />
                              <span style={{ opacity: 0.75 }}>Used</span>
                              <b dir="ltr">{fmtNum(pkgUsed)}</b>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Ticket size={14} className="ico" />
                              <span style={{ opacity: 0.75 }}>In this run</span>
                              <b dir="ltr">{fmtNum(pkgTotal)}</b>
                            </div>
                          </div>

                          <div className="muted" style={{ fontSize: 12, display: "grid", gap: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <CalendarDays size={14} className="ico" />
                              <span style={{ opacity: 0.75 }}>Attended</span>
                              <b dir="ltr">{fmtNum(attended)}</b>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Hourglass size={14} className="ico" />
                              <span style={{ opacity: 0.75 }}>Remaining</span>
                              <b dir="ltr">{fmtNum(runSessions)}</b>
                            </div>
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
                            title="Add "
                            variant="soft"
                            size="sm"
                            onClick={() => openPaymentModalFor(p, "remaining")}
                          />
                          <IconButton
                            icon={<Receipt size={16} className="ico" />}
                            title=" "
                            variant="soft"
                            size="sm"
                            onClick={() => openPaymentHistory(p)}
                          />
                          <IconButton
                            icon={<Plus size={16} className="ico" />}
                            title="Add "
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
                            title=""
                            variant="solid"
                            size="sm"
                            onClick={() => openManageFor(p)}
                          />
                        </div>

                        <div className="pActionHint muted">
                          More details inside "Manage"
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!nextSession && (
              <div className="muted" style={{ marginTop: 12 }}>
                No upcoming sessions.
              </div>
            )}
          </div>
        )}

        {/* ===================== SESSIONS ===================== */}
        {tab === "sessions" && (
          <div className="grid">
            {/* LEFT: generator + quick add */}
            <div className="card" style={{ gridColumn: "span 5" }}>
              <div className="h1">Sessions</div>
              <div className="muted" style={{ marginTop: 6 }}>
                Set the recurrence, then generate a session list. Times are in your local timezone.
              </div>

              <hr className="sep" />

              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <div className="muted">First session (date/time)</div>
                  <input
                    className="input"
                    type="datetime-local"
                    value={firstStart}
                    onChange={(e) => setFirstStart(e.target.value)}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <div className="muted">Duration (minutes)</div>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                    />
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <div className="muted">Number of sessions</div>
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
                  <div className="muted">Repeat every (days)</div>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={intervalDays}
                    onChange={(e) => setIntervalDays(e.target.value)}
                  />
                  <div className="muted" style={{ marginTop: -2 }}>
                    Current schedule: every <b>{intervalDays}</b> days
                  </div>
                </div>

                <button
                  type="button"
                  className="btn primary"
                  style={{ width: "100%" }}
                  disabled={genLoading || !firstStart}
                  onClick={generateSessions}
                >
                  {genLoading ? "Generating..." : "Generate sessions"}
                </button>

                <hr className="sep" />

                <button
                  type="button"
                  className="btn"
                  style={{ width: "100%" }}
                  onClick={openCreateSession}
                >
                  <Plus size={16} className="ico" /> Add single session
                </button>
              </div>
            </div>

            {/* RIGHT: list */}
            <div className="card" style={{ gridColumn: "span 7" }}>
              <div className="h1">Session list</div>
              <div className="muted" style={{ marginTop: 6 }}>
                Manage sessions for this run. Edit times, mark done/cancelled, or delete.
              </div>

              <hr className="sep" />

              {!sessions?.length ? (
                <div className="muted">No sessions yet.</div>
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
                      const isCancelled = s.status === "cancelled";
                      return (
                        <div
                          key={s.id}
                          className="sessionRow"
                          style={{
                            display: "grid",
                            gridTemplateColumns:
"minmax(140px, 1fr) minmax(170px, 1fr) minmax(120px, 140px) minmax(260px, 1.2fr)",
                            gap: 16,
                            alignItems: "center",
                            padding: 12,
                            border: "1px solid rgba(0,0,0,0.06)",
                            borderRadius: 14,
                            background: "#fff",
                            padding: "12px 14px",
                            border: "1px solid rgba(0,0,0,0.08)",
                            borderRadius: 14,
                          }}
                        >
                          {/* Date */}
                          <div style={{ lineHeight: 1.15 }}>
                            <div style={{ fontWeight: 700 }}>{fmtDate(s.start_at)}</div>
                            <div className="muted">{fmtWeekday(s.start_at)}</div>
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
                            padding: 12,
                            border: "1px solid rgba(0,0,0,0.06)",
                            borderRadius: 14,
                            background: "#fff",
                                padding: "6px 10px",
                                borderRadius: 999,
                                background:
                                  isDone
                                    ? "rgba(34,197,94,0.12)"
                                    : isCancelled
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
                                title="Manage"
                                aria-label="Manage"
                                style={{ width: 36, height: 36, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                                onClick={() => navigate(`/sessions/${s.id}/attendance`)}
                              >
                                <Settings2 size={16} className="ico" />
                              </button>

                              <button
                                type="button"
                                className="btn"
                                title="Edit"
                                aria-label="Edit"
                                style={{ width: 36, height: 36, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
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
                                title={isDone ? "Reopen" : "Mark done"}
                                aria-label={isDone ? "Reopen" : "Mark done"}
                                style={{ width: 36, height: 36, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                                onClick={() =>
                                  setSessionStatus(
                                    s.id,
                                    isDone ? "scheduled" : "done"
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
                                title={isCancelled ? "Restore" : "Cancel"}
                                aria-label={isCancelled ? "Restore" : "Cancel"}
                                style={{ width: 36, height: 36, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                                onClick={() =>
                                  setSessionStatus(
                                    s.id,
                                    isCancelled ? "scheduled" : "cancelled"
                                  )
                                }
                              >
                                {isCancelled ? (
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
                                title="Delete"
                                aria-label="Delete"
                                style={{ width: 36, height: 36, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
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
            <div className="card" style={{ gridColumn: "span 5" }}>
              <div className="h1">Record payment</div>
              <div className="muted" style={{ marginTop: 6 }}>
                Add and track payments for children in this run.
              </div>

              <hr className="sep" />

              <button
                type="button"
                className="btn primary"
                onClick={() => setOpenPay(true)}
              >
                + Add payment
              </button>
            </div>

            <div className="card" style={{ gridColumn: "span 7" }}>
              <div className="h1">Payments</div>
              <div className="muted" style={{ marginTop: 6 }}>
                View and manage payments for this run.
              </div>

              <hr className="sep" />

              {payments.length === 0 ? (
                <div className="muted">No items found.</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Child</th>
                      <th>Amount (₪)</th>
                      <th style={{ width: 120 }}>Method</th>
                      <th style={{ width: 170 }}>Date</th>
                      <th>Note</th>
                      <th style={{ width: 90 }}></th>
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
                                text: "Delete payment",
                              })
                            }
                          >
                            <Trash2 size={16} className="ico" /> Delete
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

                {/* ✅ Child */}
        <Modal
          open={openManage}
          title={manageP ? `Manage — ${manageP.child_name}` : "Manage"}
          onClose={() => setOpenManage(false)}
        >
          {!manageP ? (
            <div className="muted">—</div>
          ) : (
            <div className="grid">
              {/* Summary */}
              <div style={{ gridColumn: "span 12" }} className="card">
                <div
                  className="row"
                  style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}
                >
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>
                      {manageP.child_name}{" "}
                      <span className="muted" style={{ fontWeight: 700 }}>
                        — {manageP.class ?? "-"} — Age: {manageP.age ?? "-"}
                      </span>
                    </div>

                    <div className="row" style={{ gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                      {badgePayment(manageP.payment_status)}
                      {manageP.enrollment_status === "active" ? (
                        <Badge variant="ok">Active</Badge>
                      ) : (
                        <Badge variant="warn">Inactive</Badge>
                      )}
                      {manageP.is_free ? <Badge variant="info">Free</Badge> : null}
                    </div>
                  </div>

                  <div className="row" style={{ gap: 18, flexWrap: "wrap" }}>
                    <div>
                      <div className="muted">Agreed</div>
                      <div style={{ fontWeight: 900 }} dir="ltr">
                        {fmtILS(manageP.agreed_price || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="muted">Paid</div>
                      <div style={{ fontWeight: 900 }} dir="ltr">
                        {fmtILS(manageP.paid_amount || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="muted">Balance</div>
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
                    <b dir="ltr">{fmtNum(manageP.package_sessions_total ?? 0)}</b>
                  </div>

                  <div className="row" style={{ gap: 8 }}>
                    <Hourglass size={14} className="ico" />
                    <span className="muted">Remaining</span>
                    <b dir="ltr">{fmtNum(manageP.package_sessions_remaining ?? 0)}</b>
                  </div>

                  <div className="row" style={{ gap: 8 }}>
                    <CheckCircle2 size={14} className="ico" />
                    <span className="muted">Used</span>
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
                    <span className="muted">Attended in run</span>
                    <b dir="ltr">{fmtNum(manageP.sessions_attended_in_run ?? 0)}</b>
                  </div>
                </div>
              </div>

              {/* Contact + quick link */}
              <div style={{ gridColumn: "span 12" }} className="card">
                <div
                  className="row"
                  style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}
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
                    <div style={{ fontWeight: 800 }}>{manageChild?.mother_name ?? "-"}</div>
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
                            toast(ok ? "Copied" : "Copy failed", ok ? "ok" : "danger");
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
                    <div style={{ fontWeight: 800 }}>{manageChild?.father_name ?? "-"}</div>
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
                            toast(ok ? "Copied" : "Copy failed", ok ? "ok" : "danger");
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
                        setOpenManage(false);
                        setEnrollLocked(true);
                        setEnrollLockedName(manageP.child_name);
                        setSelectedChildId(String(manageP.child_id));
                        setOpenEnroll(true);
                      }}
                      title="Add sessions"
                    >
                      <ShoppingCart size={16} className="ico" /> Add sessions
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
                        onClick={() => quickAdjustFromManage(-1)}
                        title="Decrease"
                      >
                        <Minus size={16} className="ico" />
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{ padding: "8px 12px" }}
                        onClick={() => quickAdjustFromManage(1)}
                        title="Increase"
                      >
                        <Plus size={16} className="ico" />
                      </button>
                    </div>
                  </div>
                </div>

                <hr className="sep" />

                <div style={{ fontWeight: 900, marginBottom: 10 }}>Payments</div>
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
                    <CreditCard size={16} className="ico" /> Pay remaining
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setOpenManage(false);
                      openPaymentModalFor(manageP, "custom");
                    }}
                  >
                    <Receipt size={16} className="ico" /> Add payment
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setOpenManage(false);
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
                      setOpenManage(false);
                      setPricePackageId(manageP.package_id);
                      setPriceValue(String(Number(manageP.agreed_price || 0)));
                      setOpenPrice(true);
                    }}
                  >
                    <Pencil size={16} className="ico" /> Edit price
                  </button>
                </div>

                <hr className="sep" />

                <div style={{ fontWeight: 900, marginBottom: 10 }}>Enrollment</div>
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
                        setOpenManage(false);
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
                    onClick={() => {
                      setOpenManage(false);
                      setConfirm({
                        open: true,
                        type: "deleteEnroll",
                        id: {
                          enrollmentId: manageP.enrollment_id,
                          packageId: manageP.package_id,
                          childName: manageP.child_name,
                        },
                        text: `Delete enrollment: ${manageP.child_name}`,
                      });
                    }}
                  >
                    <Trash2 size={16} className="ico" /> Delete enroll
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={() => setOpenManage(false)}
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
            enrollLocked ? `Add sessions — ${enrollLockedName}` : "Enroll child"
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
                  <b>{Number(pkgInfo.sessions_remaining || 0)}</b> — Remaining
                  to pay:{" "}
                  <b>{Number(pkgInfo.balance_amount || 0).toFixed(2)}</b>
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
                  { value: "buy_new", label: "Add sessions (new)" },
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
                Cancel
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
      <div className="muted">Birth date *</div>
      <input
        className="input"
        type="date"
        value={newChildForm.birth_date}
        onChange={(e) =>
          setNewChildForm((p) => ({ ...p, birth_date: e.target.value }))
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
        <option value="">{countriesLoading ? "Loading..." : "Select a country..."}</option>
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
          setNewChildForm((p) => ({ ...p, new_country_name: e.target.value }))
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
          setNewChildForm((p) => ({ ...p, mother_name: e.target.value }))
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
          setNewChildForm((p) => ({ ...p, mother_phone: e.target.value }))
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
          setNewChildForm((p) => ({ ...p, father_name: e.target.value }))
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
          setNewChildForm((p) => ({ ...p, father_phone: e.target.value }))
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
        Cancel
      </button>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => createChildInline({ enrollNow: newChildEnrollNow })}
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

        {/* ✅ Bulk enroll */}
        <Modal
          open={openBulk}
          title="Enroll children"
          onClose={() => setOpenBulk(false)}
        >
          <div className="muted">
            Select the children you want to enroll, then click “Enroll
            selected”.
          </div>

          <hr className="sep" />

          <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
            <input
              className="input"
              style={{ width: 260 }}
              placeholder="Search child…"
              value={bulkQ}
              onChange={(e) => setBulkQ(e.target.value)}
            />
            <button
              type="button"
              className="btn"
              onClick={bulkSelectAllFiltered}
            >
              Select all
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={bulkClearSelection}
            >
              Clear
            </button>

            <div className="muted" style={{ alignSelf: "center" }}>
              Selected: <b>{bulkSelectedCount}</b>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            {bulkCandidates.length === 0 ? (
              <div className="card">No children found.</div>
            ) : (
              <div className="card" style={{ padding: 0 }}>
                <table className="table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>Select</th>
                      <th>Name</th>
                      <th>Class</th>
                      <th>Age</th>
                      <th>Gender</th>
                      <th>Phone</th>
                      {bulkPriceMode === "perChild" && (
                        <th style={{ width: 140 }}>Price</th>
                      )}
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
                          <td className="muted">
                            <span style={{ direction: "ltr", unicodeBidi: "embed" }}>
                              {c.mother_phone ?? "-"}
                            </span>
                          </td>
                          {bulkPriceMode === "perChild" && (
                            <td>
                              <input
                                className="input"
                                style={{ minWidth: 110 }}
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
              <div className="muted">Total sessions (package)</div>
              <input
                className="input"
                type="number"
                min="1"
                value={bulkSessions}
                onChange={(e) => setBulkSessions(e.target.value)}
              />
            </div>

            <div style={{ gridColumn: "span 4" }}>
              <div className="muted">Pricing mode</div>
              <ModernSelect
                value={bulkPriceMode}
                onChange={(v) => {
                  setBulkPriceMode(v);
                  if (v === "unified") setBulkPerChildPrice({});
                }}
                menuWidth="trigger"
                options={[
                  { value: "unified", label: "Unified (same price for all)" },
                  { value: "perChild", label: "Per child (set in table)" },
                ]}
              />
            </div>

            <div style={{ gridColumn: "span 4" }}>
              <div className="muted">
                {bulkPriceMode === "unified" ? "Package price" : "Per-child prices"}
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
                  Enter a price for each selected child in the table above.
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
                {bulkSaving ? " Add..." : `Add (${bulkSelectedCount})`}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setOpenBulk(false)}
              >
                Cancel
              </button>
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
            <div className="muted">Duration (minutes)</div>
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
                Cancel
              </button>
            </div>
          </div>
        </Modal>

        {/* Enroll */}
        <Modal
          open={openPay}
          title="Enroll children"
          onClose={() => setOpenPay(false)}
        >
          <div className="grid">
            <div style={{ gridColumn: "span 12" }}>
              <div className="muted"> Child ( )</div>
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
                      label: `${p.child_name} — ${Number(p.balance).toFixed(2)}`,
                    })),
                ]}
              />
            </div>

            <div style={{ gridColumn: "span 6" }}>
              <div className="muted">Amount</div>
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
              <div className="muted">Click “Attend” for quick check-in.</div>
              <ModernSelect
                value={payMethod}
                onChange={setPayMethod}
                menuWidth="trigger"
                options={[
                  { value: "cash", label: "" },
                  { value: "card", label: "" },
                  { value: "transfer", label: "" },
                  { value: "other", label: "" },
                ]}
              />
            </div>

            <div style={{ gridColumn: "span 12" }}>
              <div className="muted">No</div>
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
                {paySaving ? " Save..." : "Save"}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setOpenPay(false)}
              >
                Cancel
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
              ? `${historyEnrollment.child_name} — : ${Number(historyEnrollment.balance).toFixed(2)}`
              : ""}
          </div>

          {historyLoading ? (
            <div className="card">Loading...</div>
          ) : historyRows.length === 0 ? (
            <div className="card">No children found.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Amount</th>
                  <th>Age</th>
                  <th>Date</th>
                  <th>No</th>
                  <th>Gender</th>
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
                            text: "Delete payment",
                          })
                        }
                      >
                        <Trash2 size={16} className="ico" /> Delete
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
              <div className="muted">No sessions.</div>
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
              <div className="muted">Record payment</div>
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
                Cancel
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
                : <b>{adjAttended}</b> — : <b>{adjRunFuture}</b> — :{" "}
                <b>{adjPkgRemaining}</b>
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                : <b>{adjMaxAllowed}</b>
              </div>
            </div>

            <div style={{ gridColumn: "span 6" }}>
              <div className="muted">Duration (minutes)</div>
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
                {adjSaving ? " Save..." : "Save"}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setOpenAdjust(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>

        {/* Confirm */}
        <ConfirmDialog
          open={confirm.open}
          title=""
          message={confirm.text}
          confirmText="Yes"
          cancelText="Cancel"
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
          }}
        />
      </div>
    </div>
  );
}