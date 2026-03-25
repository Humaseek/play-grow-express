import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import {
  ChevronRight,
  ChevronLeft,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

// ============================================================================
// CSS Styles المخصصة للتقويم (مع تجاوب الموبايل الاحترافي)
// ============================================================================
const CALENDAR_STYLES = `
.page--calendar {
  background: #f8fafc;
  background-image: 
    radial-gradient(at 0% 0%, hsla(217,100%,94%,0.7) 0px, transparent 50%),
    radial-gradient(at 100% 0%, hsla(160,100%,94%,0.7) 0px, transparent 50%);
  background-attachment: fixed;
  min-height: 100vh;
  padding-bottom: 60px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  direction: rtl;
}

.cal-header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 10px;
}

.cal-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 16px 24px;
  border-radius: 20px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
  margin-bottom: 24px;
}

.cal-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.cal-summary-card {
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 20px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
  transition: transform 0.2s ease;
}

.cal-summary-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.05);
}

/* حاوية السحب المريحة للجدول */
.cal-scroll-area {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 12px;
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 12px;
  margin-top: 10px;
}

.cal-weekday {
  text-align: center;
  font-weight: 900;
  color: #64748b;
  padding: 14px;
  background: #fff;
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.05);
  box-shadow: 0 2px 10px rgba(0,0,0,0.01);
  font-size: 15px;
}

.cal-day-box {
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 18px;
  min-height: 130px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 15px rgba(0,0,0,0.01);
  transition: all 0.2s ease;
}

.cal-day-box:hover {
  border-color: #cbd5e1;
  box-shadow: 0 8px 25px rgba(0,0,0,0.04);
}

.cal-day-box.empty {
  background: rgba(248, 250, 252, 0.5);
  border: 1px dashed #e2e8f0;
  box-shadow: none;
}

.cal-day-box.today {
  border: 2px solid #3b82f6;
  background: #f0f9ff;
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.1);
}

.cal-day-number {
  font-size: 18px;
  font-weight: 900;
  color: #0f172a;
  margin-bottom: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.cal-day-box.today .cal-day-number {
  background: #3b82f6;
  color: #fff;
  width: 28px;
  height: 28px;
  border-radius: 50%;
}

.cal-stat-pill {
  font-size: 12px;
  font-weight: 800;
  padding: 6px 10px;
  border-radius: 8px;
  margin-bottom: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8fafc;
}

.cal-stat-pill.income { color: #10b981; background: #f0fdf4; border: 1px solid #bbf7d0; }
.cal-stat-pill.expense { color: #ef4444; background: #fef2f2; border: 1px solid #fecaca; }
.cal-stat-pill.sessions { color: #3b82f6; background: #eff6ff; border: 1px solid #bfdbfe; }
.cal-stat-pill.attendance { color: #8b5cf6; background: #faf5ff; border: 1px solid #e9d5ff; }

/* =========================================
   📱 تجاوب الموبايل الخرافي والمضبوط (Mobile Pro Fixes)
========================================= */
@media (max-width: 980px) {
  /* 1. ترتيب الهيدر */
  .cal-header-container {
    flex-direction: column;
    align-items: stretch !important;
    gap: 16px;
  }
  .cal-header-container h1 { font-size: 24px !important; }
  .cal-header-container p { font-size: 13px !important; line-height: 1.5; }
  .cal-header-container .btn {
    width: 100%;
    justify-content: center;
  }

  /* 2. أزرار التحكم في الشهر */
  .cal-controls {
    flex-wrap: wrap;
    gap: 12px;
    padding: 16px;
  }
  .cal-controls h2 {
    width: 100%;
    text-align: center;
    order: -1; /* رفع اسم الشهر للأعلى */
    font-size: 20px !important;
    margin-bottom: 8px;
  }
  .cal-controls .btn {
    flex: 1;
    justify-content: center;
    font-size: 13px;
    padding: 10px;
  }

  /* 3. كروت الإحصائيات (تحويلها لشبكة 2x2) */
  .cal-summary-grid {
    grid-template-columns: 1fr 1fr !important;
    gap: 10px !important;
  }
  .cal-summary-card {
    padding: 12px !important;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    border-radius: 16px !important;
  }
  .cal-summary-card > div:first-child {
    padding: 8px !important;
    border-radius: 10px !important;
  }
  .cal-summary-card svg {
    width: 20px;
    height: 20px;
  }
  .cal-summary-card div > div:nth-child(1) { font-size: 11.5px !important; }
  .cal-summary-card div > div:nth-child(2) { font-size: 18px !important; }

  /* 4. التقويم القابل للسحب أفقياً (Swipeable) */
  .cal-grid {
    min-width: 850px; /* إجبار الجدول على الاحتفاظ بحجمه وعدم الانضغاط */
    gap: 8px !important;
  }
  .cal-weekday {
    font-size: 13px !important;
    padding: 10px 4px !important;
  }
  .cal-day-box {
    min-height: 100px !important;
    padding: 8px !important;
    border-radius: 14px !important;
  }
  .cal-day-number {
    font-size: 16px !important;
    margin-bottom: 6px !important;
  }
  .cal-stat-pill {
    padding: 4px 6px !important;
    font-size: 11.5px !important;
    margin-bottom: 4px !important;
  }
}
`;

export default function Calendar() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Data States
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [attendance, setAttendance] = useState([]);

  // Load Data for the current month
  useEffect(() => {
    async function loadMonthData() {
      setLoading(true);

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      // Start and End of the current month
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

      const startIso = startOfMonth.toISOString();
      const endIso = endOfMonth.toISOString();

      try {
        const [payRes, expRes, sesRes, attRes] = await Promise.all([
          supabase
            .from("payments")
            .select("amount, created_at")
            .gte("created_at", startIso)
            .lte("created_at", endIso),
          supabase
            .from("expenses")
            .select("amount, spent_on")
            .gte("spent_on", startIso.split("T")[0])
            .lte("spent_on", endIso.split("T")[0]),
          supabase
            .from("course_sessions")
            .select("id, start_at")
            .gte("start_at", startIso)
            .lte("start_at", endIso),
          supabase
            .from("attendance")
            .select("status, created_at")
            .gte("created_at", startIso)
            .lte("created_at", endIso),
        ]);

        setPayments(payRes.data || []);
        setExpenses(expRes.data || []);
        setSessions(sesRes.data || []);
        setAttendance(attRes.data || []);
      } catch (err) {
        console.error("Error loading calendar data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadMonthData();
  }, [currentDate]);

  // Navigate Months
  const nextMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );
  const prevMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );

  // Calendar Generation Logic
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const weekDays = [
    "الأحد",
    "الإثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
  ];

  // Padding for empty boxes before the 1st of the month
  const paddingDays = Array.from({ length: firstDayIndex }).map((_, i) => i);
  // Actual days
  const monthDays = Array.from({ length: daysInMonth }).map((_, i) => i + 1);

  const isToday = (d) => {
    const today = new Date();
    return (
      today.getDate() === d &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };

  // Group data by day
  const getDayData = (day) => {
    const dayStartStr = new Date(year, month, day).toISOString().split("T")[0];

    // Income
    const dayIncome = payments
      .filter((p) => p.created_at.startsWith(dayStartStr))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // Expenses
    const dayExpense = expenses
      .filter((e) => e.spent_on.startsWith(dayStartStr))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // Sessions
    const daySessions = sessions.filter((s) =>
      s.start_at.startsWith(dayStartStr),
    ).length;

    // Attendance (Present only)
    const dayAttendance = attendance.filter(
      (a) => a.created_at.startsWith(dayStartStr) && a.status === "present",
    ).length;

    return { dayIncome, dayExpense, daySessions, dayAttendance };
  };

  // Totals for Summary Cards
  const monthTotals = {
    income: payments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
    expense: expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    sessions: sessions.length,
    attendance: attendance.filter((a) => a.status === "present").length,
  };

  const monthName = new Intl.DateTimeFormat("ar-EG", { month: "long" }).format(
    currentDate,
  );

  return (
    <div className="page page--calendar" dir="rtl" lang="ar">
      <style>{CALENDAR_STYLES}</style>
      <div className="container" style={{ maxWidth: 1440, paddingTop: 20 }}>
        {/* Header */}
        <div className="cal-header-container" style={{ marginBottom: 24 }}>
          <div>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 900,
                color: "#0f172a",
                margin: 0,
              }}
            >
              التقويم المالي
            </h1>
            <p
              style={{
                color: "#64748b",
                marginTop: 8,
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              نظرة شاملة على الجلسات، الدفعات، والمصاريف اليومية
            </p>
          </div>
          <button
            className="btn"
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
            onClick={() => navigate("/")}
          >
            العودة للرئيسية <ArrowRight size={18} />
          </button>
        </div>

        {/* Controls */}
        <div className="cal-controls">
          <button className="btn" onClick={prevMonth}>
            <ChevronRight size={20} /> الشهر السابق
          </button>
          <h2
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 900,
              color: "#1e293b",
            }}
          >
            {monthName} {year}
          </h2>
          <button className="btn" onClick={nextMonth}>
            الشهر التالي <ChevronLeft size={20} />
          </button>
        </div>

        {/* Summary Grid */}
        <div className="cal-summary-grid">
          <div className="cal-summary-card">
            <div
              style={{ background: "#f0fdf4", padding: 12, borderRadius: 14 }}
            >
              <TrendingUp size={24} color="#10b981" />
            </div>
            <div>
              <div style={{ fontSize: 13, color: "#64748b", fontWeight: 800 }}>
                إجمالي الإيرادات
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>
                <span dir="ltr">{loading ? "..." : monthTotals.income} ₪</span>
              </div>
            </div>
          </div>

          <div className="cal-summary-card">
            <div
              style={{ background: "#fef2f2", padding: 12, borderRadius: 14 }}
            >
              <TrendingDown size={24} color="#ef4444" />
            </div>
            <div>
              <div style={{ fontSize: 13, color: "#64748b", fontWeight: 800 }}>
                إجمالي المصاريف
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>
                <span dir="ltr">{loading ? "..." : monthTotals.expense} ₪</span>
              </div>
            </div>
          </div>

          <div className="cal-summary-card">
            <div
              style={{ background: "#eff6ff", padding: 12, borderRadius: 14 }}
            >
              <CheckCircle2 size={24} color="#3b82f6" />
            </div>
            <div>
              <div style={{ fontSize: 13, color: "#64748b", fontWeight: 800 }}>
                إجمالي الجلسات
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>
                {loading ? "..." : monthTotals.sessions} جلسة
              </div>
            </div>
          </div>

          <div className="cal-summary-card">
            <div
              style={{ background: "#faf5ff", padding: 12, borderRadius: 14 }}
            >
              <Users size={24} color="#8b5cf6" />
            </div>
            <div>
              <div style={{ fontSize: 13, color: "#64748b", fontWeight: 800 }}>
                إجمالي حضور الطلاب
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>
                {loading ? "..." : monthTotals.attendance} طالب
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Grid with Mobile Scroll Wrapper */}
        <div className="cal-scroll-area">
          <div className="cal-grid">
            {weekDays.map((day, idx) => (
              <div key={`wd-${idx}`} className="cal-weekday">
                {day}
              </div>
            ))}

            {paddingDays.map((pad) => (
              <div key={`pad-${pad}`} className="cal-day-box empty"></div>
            ))}

            {monthDays.map((day) => {
              const data = getDayData(day);
              const todayClass = isToday(day) ? "today" : "";

              return (
                <div key={`day-${day}`} className={`cal-day-box ${todayClass}`}>
                  <span className="cal-day-number">{day}</span>

                  {!loading && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      {data.dayIncome > 0 && (
                        <div className="cal-stat-pill income">
                          <span>إيراد:</span>
                          <b dir="ltr">+{data.dayIncome} ₪</b>
                        </div>
                      )}

                      {data.dayExpense > 0 && (
                        <div className="cal-stat-pill expense">
                          <span>مصروف:</span>
                          <b dir="ltr">-{data.dayExpense} ₪</b>
                        </div>
                      )}

                      {data.daySessions > 0 && (
                        <div className="cal-stat-pill sessions">
                          <span>جلسات:</span>
                          <b>{data.daySessions}</b>
                        </div>
                      )}

                      {data.dayAttendance > 0 && (
                        <div className="cal-stat-pill attendance">
                          <span>حضور:</span>
                          <b>{data.dayAttendance}</b>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
