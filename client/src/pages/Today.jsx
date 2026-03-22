import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { fmtDateTime24, fmtTime24 } from "../utils/datetime";

// استيراد كمية كبيرة من الأيقونات لتغطية كل احتياجات الـ Dashboard
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Wallet,
  Users,
  CalendarClock,
  CalendarDays, // <-- تم إضافة هذه الأيقونة هنا
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  BookOpen,
  AlertOctagon,
  CreditCard,
  Receipt,
  UserPlus,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  RefreshCcw,
  Sparkles,
  History,
  MoreVertical,
  Banknote,
  BellRing,
} from "lucide-react";

import ErrorBanner from "../components/ErrorBanner";
import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";
import IconButton from "../components/IconButton";
import Badge from "../components/Badge";

// ============================================================================
// الدوال المساعدة والتنسيقات
// ============================================================================

function fmtMoney(n) {
  const x = Number(n || 0);
  return x.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function startOfMonth(d = new Date()) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// مكون رسم بياني مصغر (Sparkline) مبرمج يدوياً بدون مكتبات خارجية
const Sparkline = ({ data, color, type = "line" }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data) || 1;
  const min = Math.min(...data);
  const range = max - min || 1;

  if (type === "bar") {
    return (
      <svg
        viewBox="0 0 100 30"
        preserveAspectRatio="none"
        style={{ width: "100%", height: "100%" }}
      >
        {data.map((d, i) => {
          const h = ((d - Math.min(0, min)) / max) * 30 || 2;
          const w = 100 / data.length - 2;
          const x = i * (100 / data.length);
          return (
            <rect
              key={i}
              x={x}
              y={30 - h}
              width={w}
              height={h}
              fill={color}
              rx="1"
              opacity={0.8}
            />
          );
        })}
      </svg>
    );
  }

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 30 - ((d - min) / range) * 26; // padding for stroke
      return `${x},${y}`;
    })
    .join(" ");

  const fillPoints = `0,30 ${points} 100,30`;

  return (
    <svg
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      style={{ width: "100%", height: "100%", overflow: "visible" }}
    >
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill={`url(#grad-${color})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ============================================================================
// CSS Styles (Bento Grid & Glassmorphism & Enterprise UI)
// ============================================================================
const DASHBOARD_STYLES = `
.page--dashboard {
  background: #f1f5f9; /* Slate 100 - Clean modern background */
  min-height: 100vh;
  padding-bottom: 60px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* Header Area */
.dash-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
  padding-top: 24px;
}

.dash-greeting {
  font-size: 32px;
  font-weight: 900;
  color: #0f172a;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}

.dash-date-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #e2e8f0;
  color: #475569;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
}

.dash-btn-refresh {
  background: #fff;
  border: 1px solid #cbd5e1;
  color: #334155;
  padding: 10px 20px;
  border-radius: 14px;
  font-weight: 800;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}
.dash-btn-refresh:hover {
  background: #f8fafc;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

/* Bento Grid Layout */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
  margin-bottom: 24px;
}

.bento-item {
  background: #fff;
  border-radius: 24px;
  border: 1px solid rgba(15, 23, 42, 0.04);
  box-shadow: 0 4px 20px -4px rgba(15, 23, 42, 0.04), 0 1px 4px -1px rgba(15, 23, 42, 0.02);
  padding: 24px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* Specific Grid Spans */
.span-3 { grid-column: span 3; }
.span-4 { grid-column: span 4; }
.span-6 { grid-column: span 6; }
.span-8 { grid-column: span 8; }
.span-12 { grid-column: span 12; }

@media (max-width: 1200px) {
  .span-3 { grid-column: span 6; }
  .span-4 { grid-column: span 6; }
  .span-8 { grid-column: span 12; }
}
@media (max-width: 768px) {
  .span-3, .span-4, .span-6, .span-8 { grid-column: span 12; }
}

/* KPI Cards */
.kpi-title {
  font-size: 14px;
  font-weight: 800;
  color: #64748b;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.kpi-value {
  font-size: 36px;
  font-weight: 900;
  color: #0f172a;
  line-height: 1.1;
  margin-bottom: 16px;
  letter-spacing: -0.03em;
}
.kpi-chart-wrapper {
  height: 40px;
  width: 100%;
  margin-top: auto;
}

/* Section Titles inside Cards */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.section-title {
  font-size: 18px;
  font-weight: 900;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Timeline Design */
.timeline-container {
  position: relative;
  padding-right: 24px; /* RTL */
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.timeline-container::before {
  content: '';
  position: absolute;
  top: 10px; bottom: 10px; right: 7px;
  width: 2px;
  background: #e2e8f0;
  border-radius: 2px;
}

.timeline-item {
  position: relative;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 20px;
  padding: 20px;
  transition: all 0.2s ease;
}
.timeline-item:hover {
  background: #fff;
  border-color: #e2e8f0;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
}

.timeline-dot {
  position: absolute;
  right: -24px;
  top: 24px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  border: 4px solid #cbd5e1;
  z-index: 2;
}
.timeline-item.status-done .timeline-dot { border-color: #10b981; }
.timeline-item.status-scheduled .timeline-dot { border-color: #3b82f6; }
.timeline-item.status-canceled .timeline-dot { border-color: #ef4444; }

.tl-time {
  font-size: 16px;
  font-weight: 900;
  color: #0f172a;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.tl-course {
  font-size: 18px;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 6px;
}
.tl-run {
  font-size: 14px;
  color: #64748b;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tl-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #e2e8f0;
}

.btn-tl {
  flex: 1;
  padding: 10px;
  border-radius: 12px;
  font-weight: 800;
  font-size: 13px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-tl-main { background: #eff6ff; color: #2563eb; }
.btn-tl-main:hover { background: #dbeafe; }
.btn-tl-done { background: #f0fdf4; color: #16a34a; }
.btn-tl-done:hover { background: #dcfce7; }
.btn-tl-cancel { background: #fef2f2; color: #dc2626; flex: 0.5; }
.btn-tl-cancel:hover { background: #fee2e2; }
.btn-tl:disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(1); }

/* Quick Actions Grid */
.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.qa-btn {
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  padding: 20px 16px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #334155;
  font-weight: 800;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}
.qa-btn:hover {
  background: #fff;
  border-color: #cbd5e1;
  color: #0f172a;
  transform: translateY(-2px);
  box-shadow: 0 10px 20px -5px rgba(0,0,0,0.05);
}
.qa-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.qa-btn.primary .qa-icon-wrap { background: #eff6ff; color: #3b82f6; }
.qa-btn.success .qa-icon-wrap { background: #f0fdf4; color: #10b981; }
.qa-btn.warning .qa-icon-wrap { background: #fffbeb; color: #f59e0b; }
.qa-btn.purple .qa-icon-wrap { background: #faf5ff; color: #8b5cf6; }

/* List Widgets (Debtors, Recent Payments) */
.list-widget {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: #f8fafc;
  border-radius: 16px;
  border: 1px solid transparent;
  transition: all 0.2s;
  text-decoration: none;
}
.list-item:hover {
  background: #fff;
  border-color: #e2e8f0;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}
.li-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.li-avatar {
  width: 40px; height: 40px;
  border-radius: 12px;
  background: #e2e8f0;
  display: flex; align-items: center; justify-content: center;
  color: #64748b; font-weight: 900;
}
.li-title { font-weight: 800; color: #0f172a; font-size: 15px; margin-bottom: 2px; }
.li-sub { font-size: 13px; color: #64748b; font-weight: 600; }
.li-value { font-weight: 900; font-size: 15px; text-align: left; direction: ltr; }
.li-value.danger { color: #ef4444; }
.li-value.success { color: #10b981; }
`;

export default function Dashboard() {
  const { toast } = useOutletContext();
  const navigate = useNavigate();

  // ============================================================================
  // Dashboard State
  // ============================================================================
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [dashData, setDashData] = useState({
    incomeMonth: 0,
    expenseMonth: 0,
    netMonth: 0,
    activeStudents: 0,
    sessionsCountToday: 0,
    incomeTrend: [], // لآخر 7 أيام
    expenseTrend: [],
    todaySessions: [],
    debtors: [],
    recentPayments: [],
  });

  const [confirm, setConfirm] = useState({
    open: false,
    action: null,
    sessionId: null,
  });

  // ============================================================================
  // Data Fetching Engine (The heavy lifting)
  // ============================================================================
  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();
      const dayStart = startOfDay(now).toISOString();
      const dayEnd = endOfDay(now).toISOString();

      // التجهيز لحساب الـ Trends لآخر 7 أيام
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = addDays(now, -6 + i);
        return {
          start: startOfDay(d).toISOString(),
          end: endOfDay(d).toISOString(),
          date: d,
          income: 0,
          expense: 0,
        };
      });
      const weekStart = last7Days[0].start;

      // 1. Fetch Financials (Income & Expense) for the month
      const { data: paymentsMonth, error: pErr } = await supabase
        .from("payments")
        .select("amount, created_at")
        .gte("created_at", monthStart);

      const { data: expensesMonth, error: eErr } = await supabase
        .from("expenses")
        .select("amount, spent_on")
        .gte("spent_on", monthStart);

      // 2. Fetch Financials for the 7-day Trend
      const { data: paymentsWeek } = await supabase
        .from("payments")
        .select("amount, created_at")
        .gte("created_at", weekStart);

      const { data: expensesWeek } = await supabase
        .from("expenses")
        .select("amount, spent_on")
        .gte("spent_on", weekStart);

      // 3. Fetch Active Students
      const { count: activeStudentsCount } = await supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");

      // 4. Fetch Today's Sessions (Safe join via views or separate queries)
      // سنجلب الجلسات ثم ندمجها مع الدورات لضمان عدم حدوث خطأ بالـ Relations
      const { data: sessionsToday } = await supabase
        .from("course_sessions")
        .select("*")
        .gte("start_at", dayStart)
        .lte("start_at", dayEnd)
        .order("start_at", { ascending: true });

      const { data: runsSummary } = await supabase
        .from("course_runs_summary_view")
        .select("run_id, title, label");

      // دمج الجلسات مع أسماء الدورات
      const enrichedSessions = (sessionsToday || []).map((session) => {
        const runInfo = (runsSummary || []).find(
          (r) => r.run_id === session.run_id,
        );
        return {
          ...session,
          course_title: runInfo?.title || "دورة غير محددة",
          run_label: runInfo?.label || "فوج غير محدد",
        };
      });

      // 5. Fetch Alerts/Debtors (Students with balance > 0)
      const { data: debtorsData } = await supabase
        .from("run_participants_view")
        .select(
          "child_name, child_id, balance, package_sessions_remaining, course_title",
        )
        .eq("enrollment_status", "active")
        .gt("balance", 0)
        .order("balance", { ascending: false })
        .limit(5);

      // 6. Fetch Recent Payments
      const { data: recentPays } = await supabase
        .from("payments_details_view")
        .select("id, amount, child_name, child_id, method, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      // --- Processing the Data ---

      // Calculate Month Totals
      const totalIncome = (paymentsMonth || []).reduce(
        (sum, p) => sum + Number(p.amount || 0),
        0,
      );
      const totalExpense = (expensesMonth || []).reduce(
        (sum, e) => sum + Number(e.amount || 0),
        0,
      );

      // Calculate Trends
      const incTrendArr = last7Days.map((day) => {
        return (paymentsWeek || [])
          .filter((p) => p.created_at >= day.start && p.created_at <= day.end)
          .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      });
      const expTrendArr = last7Days.map((day) => {
        return (expensesWeek || [])
          .filter((e) => {
            const eDate = new Date(e.spent_on).toISOString(); // توحيد الصيغة
            return eDate >= day.start && eDate <= day.end;
          })
          .reduce((sum, e) => sum + Number(e.amount || 0), 0);
      });

      setDashData({
        incomeMonth: totalIncome,
        expenseMonth: totalExpense,
        netMonth: totalIncome - totalExpense,
        activeStudents: activeStudentsCount || 0,
        sessionsCountToday: enrichedSessions.length,
        incomeTrend: incTrendArr,
        expenseTrend: expTrendArr,
        todaySessions: enrichedSessions,
        debtors: debtorsData || [],
        recentPayments: recentPays || [],
      });
    } catch (err) {
      console.error(err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // دالة تغيير حالة الجلسة
  async function changeSessionStatus(id, newStatus) {
    const { error: upErr } = await supabase
      .from("course_sessions")
      .update({ status: newStatus })
      .eq("id", id);
    if (upErr) {
      toast("حدث خطأ أثناء تحديث الجلسة.", "danger");
      return;
    }
    toast("تم تحديث الجلسة بنجاح.", "ok");
    loadDashboard(); // تحديث صامت
  }

  // تاريخ اليوم بتنسيق عربي فخم
  const todayFormatted = useMemo(() => {
    const d = new Date();
    return new Intl.DateTimeFormat("ar-EG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d);
  }, []);

  return (
    <div className="page page--dashboard" dir="rtl" lang="ar">
      <style>{DASHBOARD_STYLES}</style>
      <div className="container" style={{ maxWidth: 1400 }}>
        {/* Header Section */}
        <div className="dash-header">
          <div>
            <h1 className="dash-greeting">مرحباً بك في القيادة، جيمي 👋</h1>
            <div className="dash-date-pill">
              <CalendarDays size={16} color="#3b82f6" />
              {todayFormatted}
            </div>
          </div>
          <button
            className="dash-btn-refresh"
            onClick={loadDashboard}
            disabled={loading}
          >
            <RefreshCcw
              size={18}
              className={loading ? "spin" : ""}
              color="#3b82f6"
            />
            {loading ? "جاري التحديث..." : "تحديث اللوحة"}
          </button>
        </div>

        {error && <ErrorBanner error={error} />}

        {/* ==================== ROW 1: Hero KPIs ==================== */}
        <div className="bento-grid">
          <div
            className="bento-item span-3"
            style={{ borderTop: "4px solid #10b981" }}
          >
            <div className="kpi-title">
              <div
                style={{ background: "#f0fdf4", padding: 6, borderRadius: 8 }}
              >
                <TrendingUp size={18} color="#10b981" />
              </div>
              إيرادات الشهر
            </div>
            <div className="kpi-value">{fmtMoney(dashData.incomeMonth)} ₪</div>
            <div className="kpi-chart-wrapper">
              <Sparkline
                data={dashData.incomeTrend}
                color="#10b981"
                type="line"
              />
            </div>
          </div>

          <div
            className="bento-item span-3"
            style={{ borderTop: "4px solid #ef4444" }}
          >
            <div className="kpi-title">
              <div
                style={{ background: "#fef2f2", padding: 6, borderRadius: 8 }}
              >
                <TrendingDown size={18} color="#ef4444" />
              </div>
              مصاريف الشهر
            </div>
            <div className="kpi-value">{fmtMoney(dashData.expenseMonth)} ₪</div>
            <div className="kpi-chart-wrapper">
              <Sparkline
                data={dashData.expenseTrend}
                color="#ef4444"
                type="bar"
              />
            </div>
          </div>

          <div
            className="bento-item span-3"
            style={{ borderTop: "4px solid #3b82f6" }}
          >
            <div className="kpi-title">
              <div
                style={{ background: "#eff6ff", padding: 6, borderRadius: 8 }}
              >
                <Users size={18} color="#3b82f6" />
              </div>
              الطلاب النشطين
            </div>
            <div className="kpi-value" style={{ fontSize: 42 }}>
              {dashData.activeStudents}
            </div>
            <div
              style={{
                color: "#64748b",
                fontSize: 13,
                fontWeight: 700,
                marginTop: "auto",
              }}
            >
              إجمالي الاشتراكات الفعالة بالمركز
            </div>
          </div>

          <div
            className="bento-item span-3"
            style={{ borderTop: "4px solid #f59e0b" }}
          >
            <div className="kpi-title">
              <div
                style={{ background: "#fffbeb", padding: 6, borderRadius: 8 }}
              >
                <CalendarClock size={18} color="#f59e0b" />
              </div>
              جلسات اليوم
            </div>
            <div className="kpi-value" style={{ fontSize: 42 }}>
              {dashData.sessionsCountToday}
            </div>
            <div
              style={{
                color: "#64748b",
                fontSize: 13,
                fontWeight: 700,
                marginTop: "auto",
              }}
            >
              عدد الجلسات المجدولة لهذا اليوم
            </div>
          </div>
        </div>

        {/* ==================== ROW 2: Main Content ==================== */}
        <div className="bento-grid">
          {/* Timeline (Span 8) */}
          <div className="bento-item span-8">
            <div className="section-header">
              <h2 className="section-title">
                <Clock size={22} color="#3b82f6" /> جدول اليوم
              </h2>
              <Badge variant="info">{dashData.sessionsCountToday} جلسات</Badge>
            </div>

            {loading ? (
              <div
                style={{ padding: 40, textAlign: "center", color: "#64748b" }}
              >
                جاري التحميل...
              </div>
            ) : dashData.todaySessions.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="يوم فارغ!"
                description="لا توجد أي جلسات مبرمجة في جدولك لهذا اليوم."
              />
            ) : (
              <div className="timeline-container">
                {dashData.todaySessions.map((s) => {
                  const statusClass =
                    s.status === "done"
                      ? "status-done"
                      : s.status === "canceled"
                        ? "status-canceled"
                        : "status-scheduled";

                  return (
                    <div key={s.id} className={`timeline-item ${statusClass}`}>
                      <div className="timeline-dot"></div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: 16,
                        }}
                      >
                        <div>
                          <div className="tl-time">
                            <span dir="ltr">{fmtTime24(s.start_at)}</span>
                            <span style={{ color: "#cbd5e1" }}>-</span>
                            <span
                              dir="ltr"
                              style={{ color: "#64748b", fontSize: 14 }}
                            >
                              {fmtTime24(s.end_at)}
                            </span>
                          </div>
                          <div className="tl-course">{s.course_title}</div>
                          <div className="tl-run">
                            <Layers size={14} /> الفوج: {s.run_label}
                          </div>
                        </div>

                        <div style={{ minWidth: 200 }}>
                          <div className="tl-actions">
                            <button
                              className="btn-tl btn-tl-main"
                              disabled={s.status === "canceled"}
                              onClick={() =>
                                navigate(`/sessions/${s.id}/attendance`)
                              }
                            >
                              <ClipboardList size={16} /> الحضور
                            </button>
                            <button
                              className="btn-tl btn-tl-done"
                              disabled={s.status !== "scheduled"}
                              onClick={() =>
                                setConfirm({
                                  open: true,
                                  action: "done",
                                  sessionId: s.id,
                                })
                              }
                              title="تأكيد إكمال الجلسة"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <button
                              className="btn-tl btn-tl-cancel"
                              disabled={s.status !== "scheduled"}
                              onClick={() =>
                                setConfirm({
                                  open: true,
                                  action: "canceled",
                                  sessionId: s.id,
                                })
                              }
                              title="إلغاء الجلسة"
                            >
                              <XCircle size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Actions & Alerts (Span 4) */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: 24 }}
            className="span-4"
          >
            {/* Quick Actions */}
            <div className="bento-item" style={{ padding: 20 }}>
              <h2
                className="section-title"
                style={{ fontSize: 16, marginBottom: 16 }}
              >
                <Activity size={20} color="#8b5cf6" /> إجراءات سريعـة
              </h2>
              <div className="quick-actions-grid">
                <Link to="/payments" className="qa-btn success">
                  <div className="qa-icon-wrap">
                    <CreditCard size={24} />
                  </div>
                  قبض دفعة
                </Link>
                <Link to="/expenses" className="qa-btn warning">
                  <div className="qa-icon-wrap">
                    <Receipt size={24} />
                  </div>
                  صرف مبلغ
                </Link>
                <Link to="/children" className="qa-btn primary">
                  <div className="qa-icon-wrap">
                    <UserPlus size={24} />
                  </div>
                  إضافة طالب
                </Link>
                <Link to="/calendar" className="qa-btn purple">
                  <div className="qa-icon-wrap">
                    <CalendarClock size={24} />
                  </div>
                  التقويم
                </Link>
              </div>
            </div>

            {/* Debtors Alerts */}
            <div className="bento-item" style={{ padding: 20, flex: 1 }}>
              <div className="section-header" style={{ marginBottom: 16 }}>
                <h2
                  className="section-title"
                  style={{ fontSize: 16, color: "#ef4444" }}
                >
                  <BellRing size={20} color="#ef4444" /> رادار الديون
                </h2>
                <Badge variant="danger">{dashData.debtors.length}</Badge>
              </div>

              {dashData.debtors.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: 20,
                    color: "#94a3b8",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  الوضع ممتاز! لا توجد ديون مسجلة حالياً.
                </div>
              ) : (
                <div className="list-widget">
                  {dashData.debtors.map((d, i) => (
                    <Link
                      to={`/children/${d.child_id}`}
                      key={i}
                      className="list-item"
                    >
                      <div className="li-info">
                        <div
                          className="li-avatar"
                          style={{ background: "#fee2e2", color: "#ef4444" }}
                        >
                          <AlertOctagon size={18} />
                        </div>
                        <div>
                          <div className="li-title">{d.child_name}</div>
                          <div className="li-sub">متبقي عليه حساب</div>
                        </div>
                      </div>
                      <div className="li-value danger">
                        {fmtMoney(d.balance)} ₪
                      </div>
                    </Link>
                  ))}
                  <Link
                    to="/payments"
                    style={{
                      textAlign: "center",
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#3b82f6",
                      marginTop: 8,
                      textDecoration: "none",
                    }}
                  >
                    عرض كل الديون ←
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ==================== ROW 3: Recent Activity ==================== */}
        <div className="bento-grid">
          <div className="bento-item span-12">
            <div className="section-header">
              <h2 className="section-title">
                <History size={22} color="#10b981" /> أحدث المدفوعات المستلمة
              </h2>
              <Link
                to="/payments"
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: "#3b82f6",
                  textDecoration: "none",
                }}
              >
                إدارة المدفوعات
              </Link>
            </div>

            {dashData.recentPayments.length === 0 ? (
              <div
                style={{ padding: 30, textAlign: "center", color: "#64748b" }}
              >
                لا توجد حركات مالية حديثة.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th style={{ width: 140 }}>التاريخ والوقت</th>
                      <th>الطالب</th>
                      <th>طريقة الدفع</th>
                      <th style={{ width: 120 }}>المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashData.recentPayments.map((p) => (
                      <tr key={p.id}>
                        <td style={{ color: "#64748b", fontWeight: 600 }}>
                          <span dir="ltr">{fmtTime24(p.created_at)}</span> -{" "}
                          <span style={{ fontSize: 12 }}>
                            {new Date(p.created_at).toLocaleDateString("en-GB")}
                          </span>
                        </td>
                        <td style={{ fontWeight: 800, color: "#0f172a" }}>
                          {p.child_name}
                        </td>
                        <td>
                          <Badge variant="neutral">
                            {p.method === "cash"
                              ? "كاش"
                              : p.method === "card"
                                ? "بطاقة"
                                : "تحويل"}
                          </Badge>
                        </td>
                        <td style={{ fontWeight: 900, color: "#10b981" }}>
                          <span dir="ltr">+{fmtMoney(p.amount)} ₪</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* حوار التأكيد لإدارة الجلسات من الـ Timeline */}
        <ConfirmDialog
          open={confirm.open}
          title="تأكيد الإجراء"
          message={
            confirm.action === "done"
              ? "هل أنت متأكد من تعليم هذه الجلسة كمكتملة؟ سيتم إغلاقها."
              : "هل أنت متأكد من إلغاء هذه الجلسة؟ لن يتم احتسابها."
          }
          confirmText="نعم، تأكيد"
          cancelText="تراجع"
          danger={confirm.action === "canceled"}
          onCancel={() =>
            setConfirm({ open: false, action: null, sessionId: null })
          }
          onConfirm={async () => {
            const { sessionId, action } = confirm;
            setConfirm({ open: false, action: null, sessionId: null });
            await changeSessionStatus(sessionId, action);
          }}
        />
      </div>
    </div>
  );
}
