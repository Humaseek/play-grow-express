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
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDate(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtMoney(n) {
  const x = Number(n || 0);
  return x.toLocaleString("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Custom Combobox
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

export default function RunDetails() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const { toast } = useOutletContext();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Core Data
  const [run, setRun] = useState(null);
  const [course, setCourse] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [expenses, setExpenses] = useState([]);

  // Active Tab
  const [activeTab, setActiveTab] = useState("participants"); // "participants", "sessions", "expenses"

  // Modals & Forms
  const [confirm, setConfirm] = useState({
    open: false,
    type: null,
    id: null,
    text: "",
  });
  const [saving, setSaving] = useState(false);

  // --- Add/Edit Payment ---
  const [openPayModal, setOpenPayModal] = useState(false);
  const [payEnrollment, setPayEnrollment] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payNote, setPayNote] = useState("");
  // New field to link payment to a session
  const [paySessionId, setPaySessionId] = useState("");

  // --- Add Expense ---
  const [openExpModal, setOpenExpModal] = useState(false);
  const [expDate, setExpDate] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("");
  const [expParty, setExpParty] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expCats, setExpCats] = useState([]);
  const [expParties, setExpParties] = useState([]);

  // --- Payment History ---
  const [openHistoryModal, setOpenHistoryModal] = useState(false);
  const [historyEnrollment, setHistoryEnrollment] = useState(null);
  const [payHistory, setPayHistory] = useState([]);

  // --- Package History ---
  const [openPkgModal, setOpenPkgModal] = useState(false);
  const [pkgHistory, setPkgHistory] = useState([]);

  // Add Child (Enrollment)
  const [openAddChild, setOpenAddChild] = useState(false);
  const [allChildren, setAllChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [enrollAgreedPrice, setEnrollAgreedPrice] = useState("");
  const [enrollSessionsAllocated, setEnrollSessionsAllocated] = useState("");

  // Add Session
  const [openAddSession, setOpenAddSession] = useState(false);
  const [sessionStart, setSessionStart] = useState("");
  const [sessionEnd, setSessionEnd] = useState("");

  const [qP, setQP] = useState("");

  async function loadFixed() {
    setLoading(true);
    setError(null);
    try {
      const runRes = await supabase
        .from("course_runs")
        .select("*")
        .eq("id", runId)
        .single();
      if (runRes.error) throw runRes.error;
      setRun(runRes.data);

      const crsRes = await supabase
        .from("courses")
        .select("*")
        .eq("id", runRes.data.course_id)
        .single();
      if (!crsRes.error) setCourse(crsRes.data);

      const partRes = await supabase
        .from("run_participants_view")
        .select("*")
        .eq("run_id", runId)
        .order("child_name", { ascending: true });
      if (partRes.data) setParticipants(partRes.data);

      const sessRes = await supabase
        .from("course_sessions")
        .select("*")
        .eq("run_id", runId)
        .order("start_at", { ascending: true });
      if (sessRes.data) setSessions(sessRes.data);

      const expRes = await supabase
        .from("expenses")
        .select("*")
        .eq("run_id", runId)
        .order("spent_on", { ascending: false });
      if (expRes.data) setExpenses(expRes.data);

      // Load Expense Picklists
      const [cRes, pRes] = await Promise.all([
        supabase.from("expense_categories").select("name").order("name"),
        supabase.from("expense_parties").select("name").order("name"),
      ]);
      if (cRes.data) setExpCats(cRes.data.map((r) => r.name));
      if (pRes.data) setExpParties(pRes.data.map((r) => r.name));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFixed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  // Derived Stats
  const stats = useMemo(() => {
    let totalAgreed = 0;
    let totalPaid = 0;
    let activeCount = 0;
    participants.forEach((p) => {
      totalAgreed += Number(p.agreed_price || 0);
      totalPaid += Number(p.paid_amount || 0);
      if (p.enrollment_status === "active") activeCount++;
    });

    const totalExp = expenses.reduce(
      (acc, curr) => acc + Number(curr.amount || 0),
      0,
    );
    const balance = totalAgreed - totalPaid;
    const isLoss = totalPaid < totalExp;

    return { totalAgreed, totalPaid, balance, activeCount, totalExp, isLoss };
  }, [participants, expenses]);

  const filteredParticipants = useMemo(() => {
    if (!qP.trim()) return participants;
    const lower = qP.toLowerCase();
    return participants.filter((p) =>
      (p.child_name || "").toLowerCase().includes(lower),
    );
  }, [participants, qP]);

  // =============== Actions: Sessions ===============

  async function handleAddSession() {
    if (!sessionStart || !sessionEnd) {
      toast("الرجاء تحديد وقت البداية والنهاية", "warn");
      return;
    }
    setSaving(true);
    const payload = {
      run_id: runId,
      start_at: new Date(sessionStart).toISOString(),
      end_at: new Date(sessionEnd).toISOString(),
      status: "scheduled",
    };
    const { error } = await supabase.from("course_sessions").insert([payload]);
    if (error) toast(error.message, "danger");
    else {
      toast("تمت إضافة الجلسة", "ok");
      setOpenAddSession(false);
      loadFixed();
    }
    setSaving(false);
  }

  async function deleteSession(id) {
    const { error } = await supabase
      .from("course_sessions")
      .delete()
      .eq("id", id);
    if (error) toast(error.message, "danger");
    else {
      toast("تم الحذف", "ok");
      loadFixed();
    }
  }

  // =============== Actions: Enrollments ===============

  async function loadChildrenForEnroll() {
    setSaving(true);
    const { data } = await supabase
      .from("children")
      .select("id, name")
      .order("name");
    setAllChildren(data || []);
    setSaving(false);
    setOpenAddChild(true);
    setSelectedChildId("");
    setEnrollAgreedPrice("");
    setEnrollSessionsAllocated(course?.sessions_count || "");
  }

  async function handleEnrollChild() {
    if (!selectedChildId) {
      toast("اختر طالباً", "warn");
      return;
    }
    setSaving(true);
    const payload = {
      run_id: runId,
      child_id: selectedChildId,
      status: "active",
      agreed_price: enrollAgreedPrice ? Number(enrollAgreedPrice) : 0,
      sessions_allocated: enrollSessionsAllocated
        ? Number(enrollSessionsAllocated)
        : null,
    };
    const { error } = await supabase.from("enrollments").insert([payload]);
    if (error) {
      if (error.code === "23505")
        toast("الطالب مسجل بالفعل في هذا الفوج", "warn");
      else toast(error.message, "danger");
    } else {
      toast("تم التسجيل بنجاح", "ok");
      setOpenAddChild(false);
      loadFixed();
    }
    setSaving(false);
  }

  async function setEnrollmentStatus(id, newStatus) {
    const { error } = await supabase
      .from("enrollments")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) toast(error.message, "danger");
    else {
      toast(`تم تغيير الحالة إلى ${newStatus}`, "ok");
      loadFixed();
    }
  }

  async function deleteEnrollment(enrollmentId, childId, courseId) {
    // Requires RPC if we want to bypass complex cascades, or just use normal delete if cascades are setup.
    // Given the triggers, we might just try standard delete:
    const { error } = await supabase
      .from("enrollments")
      .delete()
      .eq("id", enrollmentId);
    if (error) {
      toast("لا يمكن الحذف لوجود مدفوعات أو حضور مرتبط", "danger");
    } else {
      toast("تم حذف التسجيل بالكامل", "ok");
      loadFixed();
    }
  }

  // =============== Actions: Payments ===============

  function openReceivePay(enr) {
    setPayEnrollment(enr);
    setPayAmount(enr.balance > 0 ? String(enr.balance) : "");
    setPayMethod("cash");
    setPayNote("");
    setPaySessionId(""); // Reset session linkage
    setOpenPayModal(true);
  }

  async function handleSavePayment() {
    const val = Number(payAmount);
    if (!val || val <= 0) {
      toast("مبلغ غير صحيح", "warn");
      return;
    }
    setSaving(true);
    const payload = {
      enrollment_id: payEnrollment.enrollment_id,
      amount: val,
      method: payMethod,
      note: payNote || null,
      session_id: paySessionId || null,
    };
    const { error } = await supabase.from("payments").insert([payload]);
    if (error) toast(error.message, "danger");
    else {
      toast("تم تسجيل الدفعة", "ok");
      setOpenPayModal(false);
      loadFixed();
    }
    setSaving(false);
  }

  async function fetchPayHistory(enr) {
    const { data } = await supabase
      .from("payments_details_view")
      .select("*")
      .eq("enrollment_id", enr.enrollment_id)
      .order("created_at", { ascending: false });
    setPayHistory(data || []);
  }

  function openPayHistory(enr) {
    setHistoryEnrollment(enr);
    fetchPayHistory(enr);
    setOpenHistoryModal(true);
  }

  async function deletePayment(id) {
    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (error) {
      toast("فشل حذف الدفعة", "danger");
    } else {
      toast("تم حذف الدفعة", "ok");
      if (historyEnrollment) fetchPayHistory(historyEnrollment);
      loadFixed();
    }
  }

  // =============== Actions: Packages ===============

  async function fetchPkgHistory(enr) {
    const { data } = await supabase
      .from("course_packages")
      .select("*")
      .eq("enrollment_id", enr.enrollment_id)
      .order("created_at", { ascending: false });
    setPkgHistory(data || []);
  }

  function openPackageHistory(enr) {
    setHistoryEnrollment(enr);
    fetchPkgHistory(enr);
    setOpenPkgModal(true);
  }

  async function doAdjustPackageTotal(packageId, delta) {
    const { error } = await supabase.rpc("adjust_package_total", {
      p_package_id: packageId,
      p_delta: delta,
    });
    if (error) {
      toast(error.message, "danger");
    } else {
      fetchPkgHistory(historyEnrollment);
      loadFixed();
    }
  }

  // =============== Actions: Expenses ===============

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

  async function handleSaveExpense() {
    const amount = Number(expAmount);
    if (!expDate) {
      toast("الرجاء تحديد التاريخ", "warn");
      return;
    }
    if (!amount || amount <= 0) {
      toast("مبلغ غير صحيح", "warn");
      return;
    }
    setSaving(true);
    try {
      if (expCategory?.trim())
        await safeInsertPicklist("expense_categories", expCategory);
      if (expParty?.trim())
        await safeInsertPicklist("expense_parties", expParty);

      const payload = {
        run_id: runId, // Link expense to this run
        spent_on: expDate,
        amount,
        category: expCategory?.trim() || null,
        party: expParty?.trim() || null,
        description: expDesc?.trim() || null,
      };

      const { error } = await supabase.from("expenses").insert([payload]);
      if (error) throw error;
      toast("تم حفظ المصروف", "ok");
      setOpenExpModal(false);
      loadFixed();
    } catch (e) {
      toast("فشل حفظ المصروف", "danger");
    } finally {
      setSaving(false);
    }
  }

  async function deleteExpense(id) {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) toast("فشل حذف المصروف", "danger");
    else {
      toast("تم الحذف", "ok");
      loadFixed();
    }
  }

  // =============== Renders ===============

  if (loading && !run) {
    return (
      <div className="page" style={{ padding: 40, textAlign: "center" }}>
        جاري التحميل...
      </div>
    );
  }
  if (error || !run) {
    return (
      <div className="page" style={{ padding: 20 }}>
        <ErrorBanner error={error || "الفوج غير موجود"} />
      </div>
    );
  }

  const runBadge =
    run.status === "active" ? (
      <Badge variant="ok">نشط</Badge>
    ) : run.status === "done" ? (
      <Badge variant="info">مكتمل</Badge>
    ) : (
      <Badge variant="danger">ملغاة</Badge>
    );

  const doneSessions = sessions.filter((s) => s.status === "done").length;

  return (
    <div className="page page--run-details" dir="rtl" lang="ar">
      {/* =====================================================================
        INLINE CSS 
        =====================================================================
      */}
      <style>{`
        .page--run-details {
          background: #f8fafc;
          min-height: 100vh;
          padding-bottom: 60px;
        }
        .rd-header-wrap {
          background: #fff;
          border-bottom: 1px solid #e2e8f0;
          padding: 30px 0;
          margin-bottom: 30px;
        }
        .rd-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 20px;
        }
        .rd-title {
          font-size: 28px;
          font-weight: 900;
          color: #0f172a;
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .rd-subtitle {
          font-size: 15px;
          font-weight: 600;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .rd-subtitle-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .rd-tabs {
          display: flex;
          gap: 8px;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 24px;
        }
        .rd-tab {
          padding: 12px 24px;
          font-size: 15px;
          font-weight: 700;
          color: #64748b;
          background: transparent;
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .rd-tab:hover {
          color: #0f172a;
          background: #f1f5f9;
        }
        .rd-tab.active {
          color: #2563eb;
          border-bottom-color: #2563eb;
          background: #eff6ff;
        }
        .rd-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          overflow: hidden;
          margin-bottom: 24px;
        }
        .rd-card-header {
          padding: 20px 24px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8fafc;
        }
        .rd-card-title {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0;
        }
        .rd-card-body {
          padding: 0;
        }
        .rd-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .rd-stat-box {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .rd-stat-label {
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .rd-stat-val {
          font-size: 28px;
          font-weight: 900;
          color: #0f172a;
        }
        .modern-table {
          width: 100%;
          border-collapse: collapse;
        }
        .modern-table th {
          background: #f8fafc;
          padding: 14px 20px;
          font-size: 13px;
          font-weight: 800;
          color: #475569;
          text-align: right;
          border-bottom: 1px solid #e2e8f0;
        }
        .modern-table td {
          padding: 16px 20px;
          font-size: 14px;
          font-weight: 600;
          color: #334155;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        .modern-table tr:hover td {
          background: #f8fafc;
        }
        .btn-add {
          background: #2563eb;
          color: #fff;
          border: none;
          padding: 10px 16px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 14px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-add:hover {
          background: #1d4ed8;
        }
        .actions-cell {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .pay-btn-sm {
          background: #10b981;
          color: #fff;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
        }
        .pay-btn-sm:hover { background: #059669; }
        
        .history-btn-sm {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
          padding: 6px 12px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
        }
        .history-btn-sm:hover { background: #e2e8f0; color: #0f172a; }

        .search-input {
          padding: 10px 16px;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          outline: none;
          width: 250px;
          font-family: inherit;
        }
        .search-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
        }
      `}</style>

      {/* ================= HEADER ================= */}
      <div className="rd-header-wrap">
        <div className="container">
          <div className="rd-header">
            <div>
              <h1 className="rd-title">
                <Layers size={28} color="#3b82f6" />
                {run.label}
                {runBadge}
              </h1>
              <div className="rd-subtitle">
                <div className="rd-subtitle-item">
                  <BookOpen size={16} /> {course?.title || "دورة محذوفة"}
                </div>
                <div className="rd-subtitle-item">
                  <Users size={16} /> {stats.activeCount} طلاب نشطين
                </div>
                <div className="rd-subtitle-item">
                  <CheckCircle2 size={16} /> {doneSessions} /{" "}
                  {sessions.length || course?.sessions_count || 0} جلسات منجزة
                </div>
              </div>
            </div>
            <div>
              <button
                className="btn-add"
                onClick={() =>
                  navigate(`/attendance?course=${run.course_id}&run=${run.id}`)
                }
              >
                <List size={18} /> سجلات الحضور
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        {/* ================= STATS ================= */}
        <div className="rd-stats-grid">
          <div className="rd-stat-box">
            <div className="rd-stat-label">
              <Banknote size={16} color="#64748b" /> إجمالي المتوقع
            </div>
            <div className="rd-stat-val">{fmtMoney(stats.totalAgreed)} ₪</div>
          </div>
          <div className="rd-stat-box">
            <div className="rd-stat-label">
              <CreditCard size={16} color="#10b981" /> المحصل (الإيرادات)
            </div>
            <div className="rd-stat-val" style={{ color: "#10b981" }}>
              {fmtMoney(stats.totalPaid)} ₪
            </div>
          </div>
          <div className="rd-stat-box">
            <div className="rd-stat-label">
              <AlertOctagon size={16} color="#ef4444" /> الديون المتبقية
            </div>
            <div className="rd-stat-val" style={{ color: "#ef4444" }}>
              {fmtMoney(stats.balance)} ₪
            </div>
          </div>
          <div className="rd-stat-box">
            <div className="rd-stat-label">
              <Receipt size={16} color="#f59e0b" /> إجمالي المصروفات
            </div>
            <div className="rd-stat-val" style={{ color: "#f59e0b" }}>
              {fmtMoney(stats.totalExp)} ₪
            </div>
          </div>
        </div>

        {stats.isLoss && (
          <div style={{ marginBottom: 24 }}>
            <ErrorBanner error="تنبيه: المصروفات على هذا الفوج تجاوزت الإيرادات المحصلة حتى الآن!" />
          </div>
        )}

        {/* ================= TABS ================= */}
        <div className="rd-tabs">
          <button
            className={`rd-tab ${activeTab === "participants" ? "active" : ""}`}
            onClick={() => setActiveTab("participants")}
          >
            <Users size={18} /> المشتركين والمالية
          </button>
          <button
            className={`rd-tab ${activeTab === "sessions" ? "active" : ""}`}
            onClick={() => setActiveTab("sessions")}
          >
            <CalendarClock size={18} /> الجلسات ({sessions.length})
          </button>
          <button
            className={`rd-tab ${activeTab === "expenses" ? "active" : ""}`}
            onClick={() => setActiveTab("expenses")}
          >
            <Receipt size={18} /> المصروفات ({expenses.length})
          </button>
        </div>

        {/* ================= TAB 1: PARTICIPANTS ================= */}
        {activeTab === "participants" && (
          <div className="rd-card">
            <div className="rd-card-header">
              <h2 className="rd-card-title">قائمة المشتركين</h2>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  type="text"
                  className="search-input"
                  placeholder="ابحث عن طالب..."
                  value={qP}
                  onChange={(e) => setQP(e.target.value)}
                />
                <button className="btn-add" onClick={loadChildrenForEnroll}>
                  <UserPlus size={18} /> إضافة طالب
                </button>
              </div>
            </div>
            <div className="rd-card-body" style={{ overflowX: "auto" }}>
              {filteredParticipants.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="لا يوجد طلاب"
                  description="لم يتم تسجيل أي طلاب في هذا الفوج بعد."
                />
              ) : (
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>الطالب</th>
                      <th>حالة الاشتراك</th>
                      <th>المطلوب</th>
                      <th>المدفوع</th>
                      <th>المتبقي</th>
                      <th>الرصيد / الدفع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParticipants.map((p) => {
                      const isDebt = p.balance > 0;
                      return (
                        <tr key={p.enrollment_id}>
                          <td style={{ fontWeight: 800, color: "#0f172a" }}>
                            {p.child_name}
                          </td>
                          <td>
                            {p.enrollment_status === "active" ? (
                              <Badge variant="ok">نشط</Badge>
                            ) : p.enrollment_status === "withdrawn" ? (
                              <Badge variant="danger">منسحب</Badge>
                            ) : (
                              <Badge variant="info">مكتمل</Badge>
                            )}
                          </td>
                          <td>{fmtMoney(p.agreed_price)} ₪</td>
                          <td style={{ color: "#10b981", fontWeight: 700 }}>
                            {fmtMoney(p.paid_amount)} ₪
                          </td>
                          <td
                            style={{
                              color: isDebt ? "#ef4444" : "#64748b",
                              fontWeight: isDebt ? 900 : 600,
                            }}
                          >
                            {fmtMoney(p.balance)} ₪
                          </td>
                          <td>
                            <div className="actions-cell">
                              <button
                                className="pay-btn-sm"
                                onClick={() => openReceivePay(p)}
                              >
                                + قبض
                              </button>
                              <button
                                className="history-btn-sm"
                                onClick={() => openPayHistory(p)}
                              >
                                سجل الدفعات
                              </button>
                              <button
                                className="history-btn-sm"
                                onClick={() => openPackageHistory(p)}
                                title="إدارة الباقات"
                              >
                                <Tag size={14} />
                              </button>
                              <div
                                style={{
                                  width: 1,
                                  height: 20,
                                  background: "#cbd5e1",
                                  margin: "0 6px",
                                }}
                              ></div>
                              {/* Enrollment Actions */}
                              {p.enrollment_status === "active" ? (
                                <IconButton
                                  title="سحب الطالب"
                                  onClick={() =>
                                    setConfirm({
                                      open: true,
                                      type: "inactive",
                                      id: p.enrollment_id,
                                      text: `متأكد من سحب الطالب ${p.child_name}؟`,
                                    })
                                  }
                                >
                                  <Minus size={16} />
                                </IconButton>
                              ) : (
                                <IconButton
                                  title="تنشيط الطالب"
                                  onClick={() =>
                                    setConfirm({
                                      open: true,
                                      type: "active",
                                      id: p.enrollment_id,
                                      text: `تنشيط الطالب ${p.child_name}؟`,
                                    })
                                  }
                                >
                                  <Plus size={16} />
                                </IconButton>
                              )}
                              <IconButton
                                danger
                                title="حذف التسجيل"
                                onClick={() =>
                                  setConfirm({
                                    open: true,
                                    type: "deleteEnroll",
                                    id: {
                                      enrollmentId: p.enrollment_id,
                                      childId: p.child_id,
                                      courseId: course?.id,
                                    },
                                    text: `حذف تسجيل ${p.child_name} نهائياً؟`,
                                  })
                                }
                              >
                                <Trash2 size={16} />
                              </IconButton>
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
        )}

        {/* ================= TAB 2: SESSIONS ================= */}
        {activeTab === "sessions" && (
          <div className="rd-card">
            <div className="rd-card-header">
              <h2 className="rd-card-title">جدول الجلسات</h2>
              <button
                className="btn-add"
                onClick={() => {
                  setSessionStart("");
                  setSessionEnd("");
                  setOpenAddSession(true);
                }}
              >
                <Plus size={18} /> إضافة جلسة
              </button>
            </div>
            <div className="rd-card-body" style={{ overflowX: "auto" }}>
              {sessions.length === 0 ? (
                <EmptyState
                  icon={CalendarClock}
                  title="لا يوجد جلسات"
                  description="قم بجدولة جلسات لهذا الفوج للبدء بأخذ الحضور."
                />
              ) : (
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>#</th>
                      <th>موعد الجلسة</th>
                      <th>الحالة</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s, idx) => (
                      <tr key={s.id}>
                        <td style={{ color: "#64748b", fontWeight: 800 }}>
                          {idx + 1}
                        </td>
                        <td dir="ltr" style={{ textAlign: "right" }}>
                          <span style={{ fontWeight: 800, color: "#0f172a" }}>
                            {fmtDT(s.start_at)}
                          </span>
                          <span style={{ color: "#94a3b8", margin: "0 6px" }}>
                            إلى
                          </span>
                          <span style={{ fontWeight: 600, color: "#475569" }}>
                            {s.end_at ? fmtDT(s.end_at).split(" ")[1] : "-"}
                          </span>
                        </td>
                        <td>
                          {s.status === "done" ? (
                            <Badge variant="ok">مكتملة</Badge>
                          ) : s.status === "canceled" ? (
                            <Badge variant="danger">ملغاة</Badge>
                          ) : (
                            <Badge variant="info">مجدولة</Badge>
                          )}
                        </td>
                        <td>
                          <div className="actions-cell">
                            <button
                              className="history-btn-sm"
                              onClick={() =>
                                navigate(`/sessions/${s.id}/attendance`)
                              }
                            >
                              <ClipboardList
                                size={14}
                                style={{ marginLeft: 4 }}
                              />
                              أخذ الحضور
                            </button>
                            <IconButton
                              danger
                              title="حذف"
                              onClick={() =>
                                setConfirm({
                                  open: true,
                                  type: "deleteSession",
                                  id: s.id,
                                  text: "متأكد من حذف الجلسة؟ سيتم حذف سجلات الحضور المرتبطة.",
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
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 3: EXPENSES ================= */}
        {activeTab === "expenses" && (
          <div className="rd-card">
            <div className="rd-card-header">
              <h2 className="rd-card-title">المصروفات التشغيلية للفوج</h2>
              <button
                className="btn-add"
                onClick={() => {
                  setExpDate(new Date().toISOString().split("T")[0]);
                  setExpAmount("");
                  setExpCategory("");
                  setExpParty("");
                  setExpDesc("");
                  setOpenExpModal(true);
                }}
              >
                <Plus size={18} /> إضافة مصروف
              </button>
            </div>
            <div className="rd-card-body" style={{ overflowX: "auto" }}>
              {expenses.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="لا يوجد مصروفات"
                  description="لم يتم تسجيل أي مصروفات خاصة بهذا الفوج."
                />
              ) : (
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>التاريخ</th>
                      <th>الفئة</th>
                      <th>شخص/متجر</th>
                      <th>الوصف</th>
                      <th>المبلغ</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((ex) => (
                      <tr key={ex.id}>
                        <td dir="ltr" style={{ textAlign: "right" }}>
                          {fmtDate(ex.spent_on)}
                        </td>
                        <td style={{ fontWeight: 800 }}>
                          {ex.category || "-"}
                        </td>
                        <td>{ex.party || "-"}</td>
                        <td style={{ color: "#64748b" }}>
                          {ex.description || "-"}
                        </td>
                        <td style={{ fontWeight: 900, color: "#f59e0b" }}>
                          {fmtMoney(ex.amount)} ₪
                        </td>
                        <td>
                          <IconButton
                            danger
                            onClick={() =>
                              setConfirm({
                                open: true,
                                type: "deleteExpense",
                                id: ex.id,
                                text: "حذف المصروف؟",
                              })
                            }
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ================= MODALS ================= */}

        {/* Enroll Child Modal */}
        <Modal
          open={openAddChild}
          title="تسجيل طالب جديد في الفوج"
          onClose={() => !saving && setOpenAddChild(false)}
        >
          <div className="grid" style={{ gap: "20px", padding: "10px 0" }}>
            <div style={{ gridColumn: "span 12" }}>
              <div className="muted" style={{ marginBottom: 6 }}>
                اختر الطالب *
              </div>
              <ModernSelect
                value={selectedChildId}
                onChange={setSelectedChildId}
                options={[
                  { value: "", label: "-- اختر طالباً --" },
                  ...allChildren.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            </div>
            <div style={{ gridColumn: "span 6" }}>
              <div className="muted" style={{ marginBottom: 6 }}>
                المبلغ المتفق عليه (₪)
              </div>
              <input
                className="input"
                type="number"
                value={enrollAgreedPrice}
                onChange={(e) => setEnrollAgreedPrice(e.target.value)}
                placeholder="مثال: 500"
              />
            </div>
            <div style={{ gridColumn: "span 6" }}>
              <div className="muted" style={{ marginBottom: 6 }}>
                عدد اللقاءات
              </div>
              <input
                className="input"
                type="number"
                value={enrollSessionsAllocated}
                onChange={(e) => setEnrollSessionsAllocated(e.target.value)}
                placeholder="افتراضي من الدورة"
              />
            </div>
            <div
              style={{
                gridColumn: "span 12",
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 10,
              }}
            >
              <button
                className="btn"
                onClick={() => setOpenAddChild(false)}
                disabled={saving}
              >
                إلغاء
              </button>
              <button
                className="btn-add"
                onClick={handleEnrollChild}
                disabled={saving}
              >
                {saving ? "جاري التسجيل..." : "تسجيل الطالب"}
              </button>
            </div>
          </div>
        </Modal>

        {/* Add Session Modal */}
        <Modal
          open={openAddSession}
          title="جدولة جلسة جديدة"
          onClose={() => !saving && setOpenAddSession(false)}
        >
          <div className="grid" style={{ gap: "20px", padding: "10px 0" }}>
            <div style={{ gridColumn: "span 12" }}>
              <div className="muted" style={{ marginBottom: 6 }}>
                تاريخ ووقت البداية *
              </div>
              <input
                className="input"
                type="datetime-local"
                value={sessionStart}
                onChange={(e) => setSessionStart(e.target.value)}
              />
            </div>
            <div style={{ gridColumn: "span 12" }}>
              <div className="muted" style={{ marginBottom: 6 }}>
                تاريخ ووقت النهاية *
              </div>
              <input
                className="input"
                type="datetime-local"
                value={sessionEnd}
                onChange={(e) => setSessionEnd(e.target.value)}
              />
            </div>
            <div
              style={{
                gridColumn: "span 12",
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 10,
              }}
            >
              <button
                className="btn"
                onClick={() => setOpenAddSession(false)}
                disabled={saving}
              >
                إلغاء
              </button>
              <button
                className="btn-add"
                onClick={handleAddSession}
                disabled={saving}
              >
                {saving ? "جاري الحفظ..." : "حفظ الجلسة"}
              </button>
            </div>
          </div>
        </Modal>

        {/* Receive Payment Modal */}
        <Modal
          open={openPayModal}
          title={`قبض دفعة من: ${payEnrollment?.child_name || ""}`}
          onClose={() => !saving && setOpenPayModal(false)}
        >
          <div className="grid" style={{ gap: "20px", padding: "10px 0" }}>
            <div style={{ gridColumn: "span 6" }}>
              <div className="muted" style={{ marginBottom: 6 }}>
                المبلغ (₪) *
              </div>
              <input
                className="input"
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ gridColumn: "span 6" }}>
              <div className="muted" style={{ marginBottom: 6 }}>
                طريقة الدفع
              </div>
              <ModernSelect
                value={payMethod}
                onChange={setPayMethod}
                options={[
                  { value: "cash", label: "كاش" },
                  { value: "card", label: "بطاقة" },
                  { value: "transfer", label: "تحويل" },
                  { value: "other", label: "أخرى" },
                ]}
              />
            </div>

            {/* ربط الدفعة بجلسة (اختياري) - ميزة جديدة من الـ Enterprise Upgrade */}
            <div style={{ gridColumn: "span 12" }}>
              <div className="muted" style={{ marginBottom: 6 }}>
                ربط الدفعة بجلسة معينة (اختياري)
              </div>
              <ModernSelect
                value={paySessionId}
                onChange={setPaySessionId}
                options={[
                  { value: "", label: "-- بدون ربط --" },
                  ...sessions.map((s, idx) => ({
                    value: String(s.id),
                    label: `الجلسة #${idx + 1} (${fmtDate(s.start_at)})`,
                  })),
                ]}
              />
            </div>

            <div style={{ gridColumn: "span 12" }}>
              <div className="muted" style={{ marginBottom: 6 }}>
                ملاحظات
              </div>
              <input
                className="input"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="مثال: دفعة أولى..."
              />
            </div>
            <div
              style={{
                gridColumn: "span 12",
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 10,
              }}
            >
              <button
                className="btn"
                onClick={() => setOpenPayModal(false)}
                disabled={saving}
              >
                إلغاء
              </button>
              <button
                className="btn-add"
                onClick={handleSavePayment}
                disabled={saving}
              >
                {saving ? "جاري الحفظ..." : "حفظ الدفعة"}
              </button>
            </div>
          </div>
        </Modal>

        {/* Payment History Modal */}
        <Modal
          open={openHistoryModal}
          title={`سجل الدفعات: ${historyEnrollment?.child_name || ""}`}
          onClose={() => setOpenHistoryModal(false)}
        >
          <div style={{ padding: "10px 0" }}>
            {payHistory.length === 0 ? (
              <div className="muted text-center" style={{ padding: 20 }}>
                لا يوجد دفعات مسجلة
              </div>
            ) : (
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>المبلغ</th>
                    <th>الطريقة</th>
                    <th>مرتبطة بجلسة</th>
                    <th>حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {payHistory.map((p) => (
                    <tr key={p.id}>
                      <td dir="ltr" style={{ textAlign: "right" }}>
                        {fmtDT(p.created_at)}
                      </td>
                      <td style={{ fontWeight: 800, color: "#10b981" }}>
                        {fmtMoney(p.amount)} ₪
                      </td>
                      <td>
                        {p.method === "cash"
                          ? "كاش"
                          : p.method === "card"
                            ? "بطاقة"
                            : p.method === "transfer"
                              ? "تحويل"
                              : "أخرى"}
                      </td>
                      <td style={{ fontSize: 13 }}>
                        {p.session_id ? (
                          <Badge variant="info">نعم</Badge>
                        ) : (
                          <span className="muted">-</span>
                        )}
                      </td>
                      <td>
                        <IconButton
                          danger
                          onClick={() =>
                            setConfirm({
                              open: true,
                              type: "deletePayment",
                              id: p.id,
                              text: "حذف هذه الدفعة نهائياً؟",
                            })
                          }
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 20,
              }}
            >
              <button
                className="btn"
                onClick={() => setOpenHistoryModal(false)}
              >
                إغلاق
              </button>
            </div>
          </div>
        </Modal>

        {/* Package History Modal */}
        <Modal
          open={openPkgModal}
          title={`إدارة باقات: ${historyEnrollment?.child_name || ""}`}
          onClose={() => setOpenPkgModal(false)}
        >
          <div style={{ padding: "10px 0", minWidth: 400 }}>
            {pkgHistory.length === 0 ? (
              <div className="muted text-center" style={{ padding: 20 }}>
                لا يوجد باقات مسجلة
              </div>
            ) : (
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>سعر الباقة</th>
                    <th>عدد اللقاءات</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {pkgHistory.map((pkg) => (
                    <tr key={pkg.id}>
                      <td style={{ fontWeight: 800 }}>
                        {fmtMoney(pkg.price_total)} ₪
                      </td>
                      <td>{pkg.sessions_total}</td>
                      <td>
                        <div className="actions-cell">
                          <button
                            className="history-btn-sm"
                            onClick={() =>
                              setConfirm({
                                open: true,
                                type: "pkgDelta",
                                id: { packageId: pkg.id, delta: -1 },
                                text: "خصم لقاء واحد من هذه الباقة؟",
                              })
                            }
                          >
                            <Minus size={14} />
                          </button>
                          <button
                            className="history-btn-sm"
                            onClick={() =>
                              setConfirm({
                                open: true,
                                type: "pkgDelta",
                                id: { packageId: pkg.id, delta: 1 },
                                text: "إضافة لقاء واحد لهذه الباقة؟",
                              })
                            }
                          >
                            <Plus size={14} />
                          </button>
                          <IconButton
                            danger
                            onClick={() =>
                              setConfirm({
                                open: true,
                                type: "deletePackage",
                                id: {
                                  packageId: pkg.id,
                                  enrollmentId: pkg.enrollment_id,
                                },
                                text: "حذف هذه الباقة بالكامل؟",
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
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 20,
              }}
            >
              <button className="btn" onClick={() => setOpenPkgModal(false)}>
                إغلاق
              </button>
            </div>
          </div>
        </Modal>

        {/* Add Expense Modal */}
        <Modal
          open={openExpModal}
          title="إضافة مصروف للفوج"
          onClose={() => !saving && setOpenExpModal(false)}
        >
          <div className="grid" style={{ gap: "20px", padding: "10px 0" }}>
            <div style={{ gridColumn: "span 6" }}>
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
            <div style={{ gridColumn: "span 6" }}>
              <div className="muted" style={{ marginBottom: 6 }}>
                المبلغ (₪) *
              </div>
              <input
                className="input"
                type="number"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
              />
            </div>
            <div style={{ gridColumn: "span 6" }}>
              <div className="muted" style={{ marginBottom: 6 }}>
                الفئة
              </div>
              <CustomCombobox
                value={expCategory}
                onChange={setExpCategory}
                options={expCats.map((c) => ({ value: c, label: c }))}
                placeholder="اختر أو اكتب فئة..."
              />
            </div>
            <div style={{ gridColumn: "span 6" }}>
              <div className="muted" style={{ marginBottom: 6 }}>
                الجهة/الشخص
              </div>
              <CustomCombobox
                value={expParty}
                onChange={setExpParty}
                options={expParties.map((c) => ({ value: c, label: c }))}
                placeholder="اختر أو اكتب..."
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
                placeholder="تفاصيل إضافية..."
              />
            </div>
            <div
              style={{
                gridColumn: "span 12",
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 10,
              }}
            >
              <button
                className="btn"
                onClick={() => setOpenExpModal(false)}
                disabled={saving}
              >
                إلغاء
              </button>
              <button
                className="btn-add"
                onClick={handleSaveExpense}
                disabled={saving}
              >
                {saving ? "جاري الحفظ..." : "حفظ المصروف"}
              </button>
            </div>
          </div>
        </Modal>

        {/* Confirmation Dialog */}
        <ConfirmDialog
          open={confirm.open}
          title="تأكيد الإجراء"
          message={confirm.text}
          confirmText="نعم، متأكد"
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
                if (historyEnrollment) fetchPkgHistory(historyEnrollment);
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
