import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { fmtTime24 } from "../utils/datetime";

import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Users,
  CalendarClock,
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
  Activity,
  RefreshCcw,
  Sparkles,
  History,
  BellRing,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  BadgeDollarSign,
} from "lucide-react";

import ErrorBanner from "../components/ErrorBanner";
import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";
import Badge from "../components/Badge";

// ============================================================================
// الدوال المساعدة الأساسية
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

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "صباح الخير";
  if (hour < 18) return "مساء الخير";
  return "طاب مساؤك";
}

// ============================================================================
// مكونات الرسوم البيانية المبرمجة يدوياً (SVG Charts) - خفيفة وسريعة جداً
// ============================================================================

// 1. Sparkline (للبطاقات العلوية)
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
              rx="1.5"
              opacity={0.85}
            />
          );
        })}
      </svg>
    );
  }

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 30 - ((d - min) / range) * 26;
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
        <linearGradient
          id={`grad-${color.replace("#", "")}`}
          x1="0"
          x2="0"
          y1="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={fillPoints}
        fill={`url(#grad-${color.replace("#", "")})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// 2. Dual Bar Chart (للمقارنة بين الدخل والمصروف لآخر 7 أيام)
const DualBarChart = ({ incomeData, expenseData, labels }) => {
  const maxVal = Math.max(...incomeData, ...expenseData) || 1;

  return (
    <div
      style={{
        width: "100%",
        height: "220px",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        paddingTop: 20,
        position: "relative",
      }}
    >
      {/* خطوط الخلفية (Grid lines) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 25,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          zIndex: 0,
        }}
      >
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            style={{
              borderTop: "1px dashed #e2e8f0",
              width: "100%",
              height: 0,
            }}
          ></div>
        ))}
      </div>

      {labels.map((label, i) => {
        const incHeight = (incomeData[i] / maxVal) * 100;
        const expHeight = (expenseData[i] / maxVal) * 100;

        return (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flex: 1,
              zIndex: 1,
              height: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: "4px",
                height: "calc(100% - 25px)",
                width: "100%",
                justifyContent: "center",
              }}
            >
              {/* عامود الإيرادات */}
              <div
                title={`الإيرادات: ${fmtMoney(incomeData[i])} ₪`}
                style={{
                  width: "25%",
                  maxWidth: "20px",
                  height: `${incHeight}%`,
                  background:
                    "linear-gradient(180deg, #10b981 0%, #059669 100%)",
                  borderRadius: "4px 4px 0 0",
                  transition: "height 0.5s ease-out",
                }}
              />
              {/* عامود المصاريف */}
              <div
                title={`المصاريف: ${fmtMoney(expenseData[i])} ₪`}
                style={{
                  width: "25%",
                  maxWidth: "20px",
                  height: `${expHeight}%`,
                  background:
                    "linear-gradient(180deg, #ef4444 0%, #dc2626 100%)",
                  borderRadius: "4px 4px 0 0",
                  transition: "height 0.5s ease-out",
                }}
              />
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "#64748b",
                fontWeight: 700,
                marginTop: "8px",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// CSS Styles (Enterprise Dashboard UI)
// ============================================================================
const DASHBOARD_STYLES = `
.page--dashboard {
  background: #f4f7f9;
  background-image: 
    radial-gradient(at 0% 0%, hsla(217,100%,94%,1) 0, transparent 40%), 
    radial-gradient(at 100% 0%, hsla(160,100%,94%,1) 0, transparent 40%);
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
  font-size: 36px;
  font-weight: 900;
  color: #0f172a;
  margin-bottom: 10px;
  letter-spacing: -0.02em;
}

.dash-meta-pills {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.dash-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  color: #334155;
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 800;
  box-shadow: 0 4px 6px rgba(0,0,0,0.02);
}

.dash-btn-refresh {
  background: #fff;
  border: 1px solid #cbd5e1;
  color: #334155;
  padding: 12px 24px;
  border-radius: 16px;
  font-weight: 900;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.dash-btn-refresh:hover {
  background: #f8fafc;
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.08);
  border-color: #94a3b8;
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
  border-radius: 28px;
  border: 1px solid rgba(15, 23, 42, 0.04);
  box-shadow: 0 4px 20px -4px rgba(15, 23, 42, 0.03), 0 1px 4px -1px rgba(15, 23, 42, 0.02);
  padding: 24px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.bento-item:hover {
  box-shadow: 0 10px 30px -4px rgba(15, 23, 42, 0.06);
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
  font-size: 15px;
  font-weight: 800;
  color: #64748b;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.kpi-value {
  font-size: 38px;
  font-weight: 900;
  color: #0f172a;
  line-height: 1.1;
  margin-bottom: 16px;
  letter-spacing: -0.02em;
}
.kpi-chart-wrapper {
  height: 45px;
  width: 100%;
  margin-top: auto;
}

/* Section Titles inside Cards */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.section-title {
  font-size: 19px;
  font-weight: 900;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Timeline Design */
.timeline-container {
  position: relative;
  padding-right: 28px; /* RTL */
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.timeline-container::before {
  content: '';
  position: absolute;
  top: 10px; bottom: 10px; right: 9px;
  width: 3px;
  background: #f1f5f9;
  border-radius: 3px;
}

.timeline-item {
  position: relative;
  background: #fff;
  border: 1px solid #f1f5f9;
  border-radius: 20px;
  padding: 20px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 10px rgba(0,0,0,0.01);
}
.timeline-item:hover {
  border-color: #e2e8f0;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
  transform: translateX(-4px);
}

.timeline-dot {
  position: absolute;
  right: -28px;
  top: 24px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  border: 5px solid #cbd5e1;
  z-index: 2;
  box-shadow: 0 0 0 4px #fff;
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
  font-size: 19px;
  font-weight: 900;
  color: #1e293b;
  margin-bottom: 8px;
}
.tl-run {
  font-size: 14px;
  color: #64748b;
  font-weight: 800;
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
  padding: 12px;
  border-radius: 14px;
  font-weight: 800;
  font-size: 14px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-tl-main { background: #eff6ff; color: #2563eb; }
.btn-tl-main:hover { background: #dbeafe; transform: translateY(-1px); }
.btn-tl-done { background: #f0fdf4; color: #16a34a; }
.btn-tl-done:hover { background: #dcfce7; transform: translateY(-1px); }
.btn-tl-cancel { background: #fef2f2; color: #dc2626; flex: 0.4; }
.btn-tl-cancel:hover { background: #fee2e2; transform: translateY(-1px); }
.btn-tl:disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(1); transform: none; }

/* Quick Actions Grid */
.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
.qa-btn {
  background: #fff;
  border: 1px solid #f1f5f9;
  padding: 20px 16px;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #334155;
  font-weight: 800;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;
  box-shadow: 0 4px 6px rgba(0,0,0,0.02);
}
.qa-btn:hover {
  border-color: #cbd5e1;
  color: #0f172a;
  transform: translateY(-4px);
  box-shadow: 0 14px 25px -5px rgba(0,0,0,0.08);
}
.qa-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.qa-btn.primary .qa-icon-wrap { background: #eff6ff; color: #3b82f6; }
.qa-btn.success .qa-icon-wrap { background: #f0fdf4; color: #10b981; }
.qa-btn.danger .qa-icon-wrap { background: #fef2f2; color: #ef4444; }
.qa-btn.purple .qa-icon-wrap { background: #faf5ff; color: #8b5cf6; }

/* List Widgets (Debtors, Recent Transactions) */
.list-widget {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8fafc;
  border-radius: 20px;
  border: 1px solid transparent;
  transition: all 0.2s;
  text-decoration: none;
}
.list-item:hover {
  background: #fff;
  border-color: #e2e8f0;
  box-shadow: 0 4px 14px rgba(0,0,0,0.04);
  transform: translateX(-4px);
}
.li-info {
  display: flex;
  align-items: center;
  gap: 14px;
}
.li-avatar {
  width: 44px; height: 44px;
  border-radius: 14px;
  background: #e2e8f0;
  display: flex; align-items: center; justify-content: center;
  color: #64748b; font-weight: 900;
}
.li-title { font-weight: 800; color: #0f172a; font-size: 15px; margin-bottom: 4px; }
.li-sub { font-size: 13px; color: #64748b; font-weight: 700; }
.li-value { font-weight: 900; font-size: 16px; text-align: left; direction: ltr; }
.li-value.danger { color: #ef4444; }
.li-value.success { color: #10b981; }
.li-value.neutral { color: #64748b; }

.chart-legend {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  font-size: 13px;
  font-weight: 800;
  color: #64748b;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.legend-color {
  width: 12px; height: 12px; border-radius: 4px;
}
`;

export default function Dashboard() {
  const { toast } = useOutletContext();
  const navigate = useNavigate();

  // ============================================================================
  // States
  // ============================================================================
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Real-time clock state
  const [time, setTime] = useState(new Date());

  const [dashData, setDashData] = useState({
    incomeMonth: 0,
    expenseMonth: 0,
    netMonth: 0,
    activeStudents: 0,
    sessionsCountToday: 0,
    incomeTrend: [], // لآخر 7 أيام
    expenseTrend: [],
    chartLabels: [], // أسماء الأيام للرسم البياني
    todaySessions: [],
    debtors: [],
    recentTransactions: [], // دمج المدفوعات والمصاريف
  });

  const [confirm, setConfirm] = useState({
    open: false,
    action: null,
    sessionId: null,
  });

  // تحديث الساعة الحية
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ============================================================================
  // Data Fetching Engine (Enterprise Level Data Aggregation)
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
          label: new Intl.DateTimeFormat("ar-EG", { weekday: "short" }).format(
            d,
          ),
          dateObj: d,
        };
      });
      const weekStart = last7Days[0].start;

      // 1. Fetch Financials for the month
      const { data: paymentsMonth } = await supabase
        .from("payments")
        .select("amount, created_at")
        .gte("created_at", monthStart);

      const { data: expensesMonth } = await supabase
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

      // 4. Fetch Today's Sessions & Run Info
      const { data: sessionsToday } = await supabase
        .from("course_sessions")
        .select("*")
        .gte("start_at", dayStart)
        .lte("start_at", dayEnd)
        .order("start_at", { ascending: true });

      const { data: runsSummary } = await supabase
        .from("course_runs_summary_view")
        .select("run_id, title, label");

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

      // 5. Fetch Debtors (Students with balance > 0)
      const { data: debtorsData } = await supabase
        .from("run_participants_view")
        .select("child_name, child_id, balance")
        .eq("enrollment_status", "active")
        .gt("balance", 0)
        .order("balance", { ascending: false })
        .limit(5);

      // 6. Fetch Recent Transactions (Payments + Expenses Combined)
      const { data: recentPays } = await supabase
        .from("payments_details_view")
        .select("id, amount, child_name, method, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: recentExps } = await supabase
        .from("expenses")
        .select("id, amount, category, party, created_at, spent_on")
        .order("created_at", { ascending: false })
        .limit(5);

      // دمج وتصنيف الحركات الأخيرة
      let combinedTx = [];
      if (recentPays) {
        combinedTx = [
          ...combinedTx,
          ...recentPays.map((p) => ({
            type: "income",
            id: `p_${p.id}`,
            title: p.child_name || "دفعة طالب",
            subtitle:
              p.method === "cash"
                ? "كاش"
                : p.method === "card"
                  ? "بطاقة"
                  : "تحويل",
            amount: p.amount,
            date: p.created_at,
          })),
        ];
      }
      if (recentExps) {
        combinedTx = [
          ...combinedTx,
          ...recentExps.map((e) => ({
            type: "expense",
            id: `e_${e.id}`,
            title: e.category || "مصروف عام",
            subtitle: e.party || "—",
            amount: e.amount,
            date: e.created_at, // Or spent_on
          })),
        ];
      }
      // ترتيب حسب الأحدث وأخذ أول 6 حركات
      combinedTx.sort((a, b) => new Date(b.date) - new Date(a.date));
      combinedTx = combinedTx.slice(0, 6);

      // --- Processing the Data ---

      const totalIncome = (paymentsMonth || []).reduce(
        (sum, p) => sum + Number(p.amount || 0),
        0,
      );
      const totalExpense = (expensesMonth || []).reduce(
        (sum, e) => sum + Number(e.amount || 0),
        0,
      );
      const netProfit = totalIncome - totalExpense;

      const incTrendArr = last7Days.map((day) => {
        return (paymentsWeek || [])
          .filter((p) => p.created_at >= day.start && p.created_at <= day.end)
          .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      });

      const expTrendArr = last7Days.map((day) => {
        return (expensesWeek || [])
          .filter((e) => {
            const eDate = new Date(e.spent_on).toISOString();
            return eDate >= day.start && eDate <= day.end;
          })
          .reduce((sum, e) => sum + Number(e.amount || 0), 0);
      });

      const labelsArr = last7Days.map((day) => day.label);

      setDashData({
        incomeMonth: totalIncome,
        expenseMonth: totalExpense,
        netMonth: netProfit,
        activeStudents: activeStudentsCount || 0,
        sessionsCountToday: enrichedSessions.length,
        incomeTrend: incTrendArr,
        expenseTrend: expTrendArr,
        chartLabels: labelsArr,
        todaySessions: enrichedSessions,
        debtors: debtorsData || [],
        recentTransactions: combinedTx,
      });
    } catch (err) {
      console.error("Dashboard Load Error:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  // تغيير حالة الجلسة
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
    loadDashboard();
  }

  // تنسيقات النصوص والأوقات
  const todayFormatted = useMemo(() => {
    return new Intl.DateTimeFormat("ar-EG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(time);
  }, []); // Using initial time for date is fine

  const currentTimeStr = new Intl.DateTimeFormat("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(time);

  return (
    <div className="page page--dashboard" dir="rtl" lang="ar">
      <style>{DASHBOARD_STYLES}</style>
      <div className="container" style={{ maxWidth: 1440 }}>
        {/* ==================== Header Section ==================== */}
        <div className="dash-header">
          <div>
            <h1 className="dash-greeting">{getGreeting()}، جيمي 👋</h1>
            <div className="dash-meta-pills">
              <div className="dash-pill">
                <CalendarDays size={16} color="#3b82f6" />
                {todayFormatted}
              </div>
              <div className="dash-pill" style={{ color: "#8b5cf6" }}>
                <Clock size={16} color="#8b5cf6" />
                <span dir="ltr">{currentTimeStr}</span>
              </div>
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

        {/* ==================== ROW 1: Enterprise KPIs ==================== */}
        <div className="bento-grid">
          <div className="bento-item span-3">
            <div className="kpi-title">
              <div
                style={{ background: "#f0fdf4", padding: 8, borderRadius: 10 }}
              >
                <TrendingUp size={20} color="#10b981" />
              </div>
              إيرادات الشهر
            </div>
            <div className="kpi-value">
              {fmtMoney(dashData.incomeMonth)}{" "}
              <span style={{ fontSize: 20, color: "#94a3b8" }}>₪</span>
            </div>
            <div className="kpi-chart-wrapper">
              <Sparkline
                data={dashData.incomeTrend}
                color="#10b981"
                type="line"
              />
            </div>
          </div>

          <div className="bento-item span-3">
            <div className="kpi-title">
              <div
                style={{ background: "#fef2f2", padding: 8, borderRadius: 10 }}
              >
                <TrendingDown size={20} color="#ef4444" />
              </div>
              مصاريف الشهر
            </div>
            <div className="kpi-value">
              {fmtMoney(dashData.expenseMonth)}{" "}
              <span style={{ fontSize: 20, color: "#94a3b8" }}>₪</span>
            </div>
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
            style={
              dashData.netMonth >= 0
                ? { background: "#f0fdf4", borderColor: "#bbf7d0" }
                : { background: "#fef2f2", borderColor: "#fecaca" }
            }
          >
            <div
              className="kpi-title"
              style={{ color: dashData.netMonth >= 0 ? "#059669" : "#dc2626" }}
            >
              <div
                style={{
                  background: "#fff",
                  padding: 8,
                  borderRadius: 10,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                }}
              >
                <BadgeDollarSign
                  size={20}
                  color={dashData.netMonth >= 0 ? "#10b981" : "#ef4444"}
                />
              </div>
              صافي أرباح الشهر
            </div>
            <div
              className="kpi-value"
              style={{ color: dashData.netMonth >= 0 ? "#047857" : "#b91c1c" }}
            >
              <span dir="ltr">
                {dashData.netMonth > 0 ? "+" : ""}
                {fmtMoney(dashData.netMonth)}
              </span>{" "}
              <span style={{ fontSize: 20, opacity: 0.5 }}>₪</span>
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                marginTop: "auto",
                color: dashData.netMonth >= 0 ? "#10b981" : "#ef4444",
                opacity: 0.8,
              }}
            >
              {dashData.netMonth >= 0
                ? "أداء مالي إيجابي هذا الشهر"
                : "المصاريف تتجاوز الإيرادات"}
            </div>
          </div>

          <div className="bento-item span-3">
            <div className="kpi-title">
              <div
                style={{ background: "#eff6ff", padding: 8, borderRadius: 10 }}
              >
                <Users size={20} color="#3b82f6" />
              </div>
              الطلاب النشطين
            </div>
            <div className="kpi-value" style={{ fontSize: 44 }}>
              {dashData.activeStudents}
            </div>
            <div
              style={{
                color: "#64748b",
                fontSize: 13,
                fontWeight: 800,
                marginTop: "auto",
              }}
            >
              إجمالي الاشتراكات الفعالة بالمركز
            </div>
          </div>
        </div>

        {/* ==================== ROW 2: Main Content Split ==================== */}
        <div className="bento-grid">
          {/* Left: Timeline (Span 8) */}
          <div className="bento-item span-8" style={{ minHeight: 450 }}>
            <div className="section-header">
              <h2 className="section-title">
                <Clock size={24} color="#3b82f6" /> جدول اليوم
              </h2>
              <Badge
                variant="info"
                style={{ fontSize: 14, padding: "6px 12px" }}
              >
                {dashData.sessionsCountToday} جلسات
              </Badge>
            </div>

            {loading ? (
              <div
                style={{
                  padding: 60,
                  textAlign: "center",
                  color: "#64748b",
                  fontWeight: 800,
                }}
              >
                جاري بناء الجدول...
              </div>
            ) : dashData.todaySessions.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="يوم راحة!"
                description="لا توجد أي جلسات مبرمجة في جدولك لهذا اليوم. استمتع بوقتك."
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
                              style={{ color: "#64748b", fontSize: 15 }}
                            >
                              {fmtTime24(s.end_at)}
                            </span>
                            {s.status === "done" && (
                              <Badge variant="ok" style={{ marginLeft: 8 }}>
                                مكتملة
                              </Badge>
                            )}
                            {s.status === "canceled" && (
                              <Badge variant="danger" style={{ marginLeft: 8 }}>
                                ملغاة
                              </Badge>
                            )}
                          </div>
                          <div className="tl-course">{s.course_title}</div>
                          <div className="tl-run">
                            <Layers size={16} /> الفوج: {s.run_label}
                          </div>
                        </div>

                        <div
                          style={{
                            minWidth: 220,
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "flex-end",
                          }}
                        >
                          <div className="tl-actions">
                            <button
                              className="btn-tl btn-tl-main"
                              disabled={s.status === "canceled"}
                              onClick={() =>
                                navigate(`/sessions/${s.id}/attendance`)
                              }
                            >
                              <ClipboardList size={18} /> أخذ الحضور
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
                              <CheckCircle2 size={18} />
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
                              <XCircle size={18} />
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

          {/* Right: Financial Flow Chart (Span 4) */}
          <div className="bento-item span-4" style={{ minHeight: 450 }}>
            <div className="section-header">
              <h2 className="section-title">
                <PieChart size={24} color="#8b5cf6" /> التدفق المالي
              </h2>
            </div>
            <div
              style={{
                color: "#64748b",
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 20,
              }}
            >
              مقارنة بين الإيرادات والمصاريف لآخر 7 أيام.
            </div>

            <div className="chart-legend">
              <div className="legend-item">
                <div
                  className="legend-color"
                  style={{ background: "#10b981" }}
                ></div>{" "}
                الإيرادات
              </div>
              <div className="legend-item">
                <div
                  className="legend-color"
                  style={{ background: "#ef4444" }}
                ></div>{" "}
                المصاريف
              </div>
            </div>

            {loading ? (
              <div
                style={{
                  height: 220,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#94a3b8",
                  fontWeight: 800,
                }}
              >
                جاري تحليل البيانات...
              </div>
            ) : (
              <DualBarChart
                incomeData={dashData.incomeTrend}
                expenseData={dashData.expenseTrend}
                labels={dashData.chartLabels}
              />
            )}
          </div>
        </div>

        {/* ==================== ROW 3: Alerts & Transactions ==================== */}
        <div className="bento-grid">
          {/* Left: Quick Actions + Debtors (Span 6) */}
          <div
            className="span-6"
            style={{ display: "flex", flexDirection: "column", gap: 24 }}
          >
            {/* Quick Actions */}
            <div className="bento-item" style={{ padding: "24px 24px 16px" }}>
              <div className="quick-actions-grid">
                <Link to="/payments" className="qa-btn success">
                  <div className="qa-icon-wrap">
                    <CreditCard size={28} />
                  </div>
                  قبض دفعة
                </Link>
                <Link to="/expenses" className="qa-btn danger">
                  <div className="qa-icon-wrap">
                    <Receipt size={28} />
                  </div>
                  صرف مبلغ
                </Link>
                <Link to="/children" className="qa-btn primary">
                  <div className="qa-icon-wrap">
                    <UserPlus size={28} />
                  </div>
                  إضافة طالب
                </Link>
                <Link to="/calendar" className="qa-btn purple">
                  <div className="qa-icon-wrap">
                    <CalendarClock size={28} />
                  </div>
                  التقويم
                </Link>
              </div>
            </div>

            {/* Debtors */}
            <div className="bento-item" style={{ flex: 1 }}>
              <div className="section-header" style={{ marginBottom: 20 }}>
                <h2 className="section-title" style={{ color: "#ef4444" }}>
                  <BellRing size={22} color="#ef4444" /> رادار الديون
                </h2>
                <Badge variant="danger" style={{ fontSize: 14 }}>
                  يوجد {dashData.debtors.length} طلاب
                </Badge>
              </div>

              {dashData.debtors.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: 30,
                    color: "#10b981",
                    fontSize: 15,
                    fontWeight: 800,
                    background: "#f0fdf4",
                    borderRadius: 16,
                  }}
                >
                  <CheckCircle2 size={32} style={{ margin: "0 auto 10px" }} />
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
                          <AlertOctagon size={20} />
                        </div>
                        <div>
                          <div className="li-title">{d.child_name}</div>
                          <div className="li-sub">حساب متأخر للدفع</div>
                        </div>
                      </div>
                      <div className="li-value danger">
                        {fmtMoney(d.balance)} ₪
                      </div>
                    </Link>
                  ))}
                  <Link
                    to="/children"
                    style={{
                      textAlign: "center",
                      fontSize: 14,
                      fontWeight: 900,
                      color: "#3b82f6",
                      marginTop: 12,
                      textDecoration: "none",
                    }}
                  >
                    عرض كل الطلاب والديون ←
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Right: Recent Unified Transactions (Span 6) */}
          <div className="bento-item span-6">
            <div className="section-header" style={{ marginBottom: 20 }}>
              <h2 className="section-title">
                <History size={22} color="#0f172a" /> أحدث الحركات المالية
              </h2>
            </div>

            {dashData.recentTransactions.length === 0 ? (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  color: "#94a3b8",
                  fontWeight: 800,
                }}
              >
                لا توجد حركات مالية مسجلة مؤخراً.
              </div>
            ) : (
              <div className="list-widget">
                {dashData.recentTransactions.map((tx) => {
                  const isIncome = tx.type === "income";
                  const Icon = isIncome ? ArrowDownRight : ArrowUpRight;
                  const colorClass = isIncome ? "success" : "danger";
                  const bgClass = isIncome ? "#f0fdf4" : "#fef2f2";
                  const iconColor = isIncome ? "#10b981" : "#ef4444";

                  return (
                    <div key={tx.id} className="list-item">
                      <div className="li-info">
                        <div
                          className="li-avatar"
                          style={{ background: bgClass, color: iconColor }}
                        >
                          <Icon size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                          <div className="li-title">{tx.title}</div>
                          <div className="li-sub">
                            {tx.subtitle} •{" "}
                            <span dir="ltr">{fmtTime24(tx.date)}</span>
                          </div>
                        </div>
                      </div>
                      <div className={`li-value ${colorClass}`}>
                        <span dir="ltr">
                          {isIncome ? "+" : "-"}
                          {fmtMoney(tx.amount)} ₪
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ============================================================================ */}
        {/* حوار التأكيد لإدارة الجلسات */}
        {/* ============================================================================ */}
        <ConfirmDialog
          open={confirm.open}
          title="تأكيد الإجراء"
          message={
            confirm.action === "done"
              ? "هل أنت متأكد من تعليم هذه الجلسة كمكتملة؟ سيتم إغلاقها ولن تظهر كمجدولة."
              : "هل أنت متأكد من إلغاء هذه الجلسة؟ لن يتم احتسابها من أرصدة الطلاب."
          }
          confirmText="نعم، تأكيد الإجراء"
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
