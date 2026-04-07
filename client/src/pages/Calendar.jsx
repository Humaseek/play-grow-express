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
// CSS Styles المخصصة للتقويم (مع تجاوب الموبايل)
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
  padding-bottom: 24px;
  margin-bottom: 20px;
}

.cal-title {
  font-size: 28px;
  font-weight: 900;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
}

.cal-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  background: white;
  padding: 8px 16px;
  border-radius: 100px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.03);
  border: 1px solid rgba(15, 23, 42, 0.05);
}

.cal-btn {
  background: #f1f5f9;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #475569;
  transition: all 0.2s;
}
.cal-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
  transform: scale(1.05);
}

.cal-month-label {
  font-size: 18px;
  font-weight: 800;
  color: #1e293b;
  min-width: 140px;
  text-align: center;
}

.cal-summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.cal-summary-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  padding: 16px 20px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 20px rgba(0,0,0,0.03);
  display: flex;
  align-items: center;
  gap: 16px;
}

/* حاوية السحب المريحة للجدول (مهمة للموبايل) */
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
  background: transparent;
}

.cal-weekday {
  text-align: center;
  font-weight: 800;
  color: #64748b;
  padding: 10px 0;
  font-size: 14px;
}

.cal-day-cell {
  background: white;
  border-radius: 20px;
  min-height: 140px;
  padding: 12px;
  border: 1px solid rgba(15, 23, 42, 0.05);
  box-shadow: 0 2px 10px rgba(0,0,0,0.02);
  display: flex;
  flex-direction: column;
  transition: all 0.2s;
  cursor: pointer;
}

.cal-day-cell:hover {
  box-shadow: 0 10px 25px rgba(0,0,0,0.06);
  transform: translateY(-2px);
  border-color: #cbd5e1;
}

.cal-day-cell.is-empty {
  background: transparent;
  border: none;
  box-shadow: none;
  cursor: default;
}

.cal-day-cell.is-today {
  border: 2px solid #3b82f6;
  background: #eff6ff;
}

.cal-day-number {
  font-size: 18px;
  font-weight: 900;
  color: #0f172a;
  margin-bottom: 12px;
  display: inline-block;
}

.cal-day-cell.is-today .cal-day-number {
  background: #3b82f6;
  color: white;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.cal-stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 4px;
  background: #f8fafc;
}

.cal-stat-row.income { color: #10b981; background: #f0fdf4; }
.cal-stat-row.expense { color: #ef4444; background: #fef2f2; }
.cal-stat-row.sessions { color: #3b82f6; background: #eff6ff; }
.cal-stat-row.attendance { color: #8b5cf6; background: #faf5ff; }

.cal-stat-icon {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* تنسيق زر العودة */
.back-btn {
  background: white;
  border: 1px solid rgba(15, 23, 42, 0.1);
  padding: 10px 20px;
  border-radius: 999px;
  font-weight: 800;
  color: #334155;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}
.back-btn:hover {
  background: #f8fafc;
  color: #0f172a;
  transform: translateX(4px);
  box-shadow: 0 6px 15px rgba(0,0,0,0.05);
}

/* =========================================
   📱 تجاوب الموبايل
========================================= */
@media (max-width: 980px) {
  .page--calendar {
    padding-bottom: 40px;
  }

  /* --- زر العودة --- */
  .back-btn {
    width: 100%;
    justify-content: center;
    padding: 12px 20px !important;
    border-radius: 16px !important;
    font-size: 14px;
  }

  /* --- الهيدر --- */
  .cal-header-container {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding-bottom: 12px;
    padding-top: 8px !important;
  }
  .cal-title {
    font-size: 20px;
    justify-content: center;
  }
  .cal-title > div:first-child {
    padding: 8px !important;
    border-radius: 12px !important;
  }
  .cal-controls {
    justify-content: space-between;
    padding: 6px 12px;
    border-radius: 16px !important;
  }
  .cal-month-label {
    font-size: 15px !important;
    min-width: unset;
    flex: 1;
  }

  /* --- كروت الملخص (2×2) --- */
  .cal-summary-cards {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 16px;
  }
  .cal-summary-card {
    flex-direction: column;
    align-items: flex-start;
    padding: 12px 14px;
    gap: 8px;
    border-radius: 16px;
  }
  .cal-summary-card > div:first-child {
    padding: 8px !important;
    border-radius: 10px !important;
  }
  .cal-summary-card > div:last-child > div:first-child {
    font-size: 11px !important;
    line-height: 1.3;
  }
  .cal-summary-card > div:last-child > div:last-child {
    font-size: 17px !important;
    font-weight: 900 !important;
  }

  /* --- منطقة التقويم: بدون سكرول أفقي على الموبايل --- */
  .cal-scroll-area {
    overflow-x: visible;
    padding-bottom: 0;
  }

  /* --- شبكة التقويم المضغوطة --- */
  .cal-grid {
    min-width: 0 !important;
    gap: 4px;
  }

  /* --- أيام الأسبوع --- */
  .cal-weekday {
    font-size: 10px;
    padding: 6px 2px;
    font-weight: 900;
  }

  /* --- خلية اليوم --- */
  .cal-day-cell {
    min-height: 68px;
    padding: 6px 5px;
    border-radius: 12px;
    gap: 0;
    justify-content: space-between;
  }
  .cal-day-cell:hover {
    transform: none;
  }

  /* --- رقم اليوم --- */
  .cal-day-number {
    font-size: 13px;
    font-weight: 900;
    margin-bottom: 0;
  }
  .cal-day-cell.is-today .cal-day-number {
    width: 22px;
    height: 22px;
    font-size: 11px;
  }

  /* --- مؤشرات النشاط: نقاط ملونة مرتبة --- */
  .cal-day-cell > div:last-child:not(.no-activity-label) {
    display: flex !important;
    flex-direction: column !important;
    gap: 3px !important;
    width: 100% !important;
  }

  .cal-stat-row {
    padding: 0 !important;
    margin-bottom: 0 !important;
    height: 7px !important;
    min-height: 7px !important;
    border-radius: 4px !important;
    font-size: 0 !important;
    width: 100% !important;
  }
  .cal-stat-row span { display: none !important; }
  .cal-stat-row.income  { background: #10b981 !important; opacity: 0.85; }
  .cal-stat-row.expense { background: #ef4444 !important; opacity: 0.85; }
  .cal-stat-row.sessions { background: #3b82f6 !important; opacity: 0.85; }
  .cal-stat-row.attendance { background: #8b5cf6 !important; opacity: 0.85; }

  /* لا نشاط */
  .cal-day-cell .no-activity-label {
    display: none !important;
  }
}

/* =========================================
   Bottom Sheet للموبايل
========================================= */
.cal-sheet-overlay {
  display: none;
}

@media (max-width: 980px) {
  .cal-sheet-overlay {
    display: flex;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    z-index: 9999;
    align-items: flex-end;
    justify-content: center;
    animation: cal-fade-in 0.2s ease;
  }

  @keyframes cal-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .cal-sheet {
    background: #ffffff;
    border-radius: 28px 28px 0 0;
    width: 100%;
    max-width: 520px;
    padding: 0 0 32px 0;
    box-shadow: 0 -8px 40px rgba(0,0,0,0.12);
    animation: cal-slide-up 0.28s cubic-bezier(0.34, 1.2, 0.64, 1);
  }

  @keyframes cal-slide-up {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }

  /* شريط السحب */
  .cal-sheet-handle {
    width: 40px;
    height: 4px;
    background: #e2e8f0;
    border-radius: 99px;
    margin: 14px auto 20px;
  }

  .cal-sheet-header {
    padding: 0 20px 16px;
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .cal-sheet-date {
    font-size: 20px;
    font-weight: 900;
    color: #0f172a;
  }

  .cal-sheet-weekday {
    font-size: 13px;
    color: #94a3b8;
    font-weight: 700;
    margin-top: 2px;
  }

  .cal-sheet-close {
    background: #f1f5f9;
    border: none;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    font-size: 18px;
    cursor: pointer;
    color: #64748b;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    line-height: 1;
  }

  .cal-sheet-stats {
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .cal-sheet-stat {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-radius: 16px;
    font-weight: 800;
  }

  .cal-sheet-stat .stat-left {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
  }

  .cal-sheet-stat .stat-val {
    font-size: 18px;
    font-weight: 900;
  }

  .cal-sheet-stat.income   { background: #f0fdf4; color: #16a34a; }
  .cal-sheet-stat.expense  { background: #fef2f2; color: #ef4444; }
  .cal-sheet-stat.sessions { background: #eff6ff; color: #3b82f6; }
  .cal-sheet-stat.attendance { background: #faf5ff; color: #8b5cf6; }

  .cal-sheet-empty {
    padding: 32px 20px;
    text-align: center;
    color: #94a3b8;
    font-size: 15px;
    font-weight: 700;
  }

  .cal-sheet-open-btn {
    margin: 4px 20px 0;
    width: calc(100% - 40px);
    background: #0f172a;
    color: #fff;
    border: none;
    border-radius: 16px;
    padding: 16px;
    font-size: 15px;
    font-weight: 900;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: background 0.2s;
  }

  .cal-sheet-open-btn:hover {
    background: #1e293b;
  }
}
`;

// ============================================================================
// Component المكون الرئيسي
// ============================================================================
export default function CalendarPage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState({});
  const [loading, setLoading] = useState(true);
  const [monthTotals, setMonthTotals] = useState({
    income: 0,
    expense: 0,
    sessions: 0,
    attendance: 0,
  });

  // Bottom Sheet للموبايل
  const [sheet, setSheet] = useState(null); // { dateStr, data }

  const isMobile = () => window.innerWidth <= 980;

  const handleDayClick = (dateStr, data) => {
    if (isMobile()) {
      setSheet({ dateStr, data });
    } else {
      navigate(`/calendar/${dateStr}`);
    }
  };

  const weekDays = [
    "الأحد",
    "الإثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
  ];

  const fmtMoney = (n) => Number(n || 0).toLocaleString("en-US");

  const getLocalYMD = (dateObj) => {
    if (!dateObj) return null;
    const d = new Date(dateObj);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const fetchMonthData = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
      const daysInMonth = endOfMonth.getDate();

      const startIso = startOfMonth.toISOString();
      const endIso = endOfMonth.toISOString();
      const startYMD = getLocalYMD(startOfMonth);
      const endYMD = getLocalYMD(endOfMonth);

      const dayMap = {};
      for (let i = 1; i <= daysInMonth; i++) {
        const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
          i,
        ).padStart(2, "0")}`;
        dayMap[dStr] = { income: 0, expense: 0, sessions: 0, attendance: 0 };
      }

      const { data: pays } = await supabase
        .from("payments")
        .select("amount, paid_at")
        .gte("paid_at", startIso)
        .lte("paid_at", endIso);

      const { data: exps } = await supabase
        .from("expenses")
        .select("amount, spent_on")
        .gte("spent_on", startYMD)
        .lte("spent_on", endYMD);

      const { data: sess } = await supabase
        .from("course_sessions")
        .select("id, start_at")
        .gte("start_at", startIso)
        .lte("start_at", endIso);

      let att = [];
      if (sess && sess.length > 0) {
        const sessIds = sess.map((s) => s.id);
        const { data: attData } = await supabase
          .from("attendance")
          .select("session_id, status")
          .in("session_id", sessIds)
          .eq("status", "present");
        att = attData || [];
      }

      let mIncome = 0,
        mExpense = 0,
        mSessions = 0,
        mAttendance = 0;

      pays?.forEach((p) => {
        const d = getLocalYMD(p.paid_at);
        if (dayMap[d]) {
          dayMap[d].income += Number(p.amount || 0);
          mIncome += Number(p.amount || 0);
        }
      });

      exps?.forEach((e) => {
        const d = e.spent_on;
        if (dayMap[d]) {
          dayMap[d].expense += Number(e.amount || 0);
          mExpense += Number(e.amount || 0);
        }
      });

      const sessionDateMap = {};
      sess?.forEach((s) => {
        const d = getLocalYMD(s.start_at);
        if (dayMap[d]) {
          dayMap[d].sessions += 1;
          mSessions += 1;
        }
        sessionDateMap[s.id] = d;
      });

      att?.forEach((a) => {
        const d = sessionDateMap[a.session_id];
        if (d && dayMap[d]) {
          dayMap[d].attendance += 1;
          mAttendance += 1;
        }
      });

      setCalendarData(dayMap);
      setMonthTotals({
        income: mIncome,
        expense: mExpense,
        sessions: mSessions,
        attendance: mAttendance,
      });
    } catch (err) {
      console.error("Error fetching calendar data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthData();
  }, [currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const renderCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const todayYMD = getLocalYMD(new Date());

    let cells = [];

    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(
        <div key={`empty-${i}`} className="cal-day-cell is-empty"></div>,
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        day,
      ).padStart(2, "0")}`;
      const isToday = dateStr === todayYMD;
      const data = calendarData[dateStr] || {
        income: 0,
        expense: 0,
        sessions: 0,
        attendance: 0,
      };

      const hasActivity =
        data.income > 0 ||
        data.expense > 0 ||
        data.sessions > 0 ||
        data.attendance > 0;

      cells.push(
        <div
          key={dateStr}
          className={`cal-day-cell ${isToday ? "is-today" : ""}`}
          onClick={() => handleDayClick(dateStr, data)}
        >
          <span className="cal-day-number">{day}</span>

          {loading ? (
            <div style={{ opacity: 0.3, fontSize: 12 }}>جاري التحميل...</div>
          ) : hasActivity ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "2px" }}
            >
              {data.income > 0 && (
                <div className="cal-stat-row income">
                  <span className="cal-stat-icon">
                    <TrendingUp size={14} /> إيراد
                  </span>
                  <span>{fmtMoney(data.income)} ₪</span>
                </div>
              )}
              {data.expense > 0 && (
                <div className="cal-stat-row expense">
                  <span className="cal-stat-icon">
                    <TrendingDown size={14} /> مصروف
                  </span>
                  <span>{fmtMoney(data.expense)} ₪</span>
                </div>
              )}
              {data.sessions > 0 && (
                <div className="cal-stat-row sessions">
                  <span className="cal-stat-icon">
                    <CheckCircle2 size={14} /> جلسات
                  </span>
                  <span>{data.sessions}</span>
                </div>
              )}
              {data.attendance > 0 && (
                <div className="cal-stat-row attendance">
                  <span className="cal-stat-icon">
                    <Users size={14} /> حضور
                  </span>
                  <span>{data.attendance} طفل</span>
                </div>
              )}
            </div>
          ) : (
            <div
              className="no-activity-label"
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#cbd5e1",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              لا يوجد نشاط
            </div>
          )}
        </div>,
      );
    }

    return cells;
  };

  const monthLabel = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(currentDate);

  return (
    <div className="page page--calendar" dir="rtl" lang="ar">
      <style>{CALENDAR_STYLES}</style>
      <div className="container" style={{ maxWidth: 1440 }}>
        {/* زر العودة للوحة التحكم */}
        <div style={{ paddingTop: "24px" }}>
          <button onClick={() => navigate("/")} className="back-btn">
            العودة للوحة التحكم <ArrowRight size={18} />
          </button>
        </div>

        {/* Header */}
        <div className="cal-header-container" style={{ paddingTop: "16px" }}>
          <h1 className="cal-title">
            <div
              style={{
                background: "white",
                padding: "10px",
                borderRadius: "16px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                display: "flex",
              }}
            >
              <CalendarIcon size={28} color="#8b5cf6" />
            </div>
            التقويم والنشاط اليومي
          </h1>

          <div className="cal-controls">
            <button className="cal-btn" onClick={handleNextMonth}>
              <ChevronRight size={20} />
            </button>
            <div
              className="cal-month-label"
              dir="ltr"
              style={{
                fontFamily: "system-ui",
                letterSpacing: "0.5px",
                color: "#3b82f6",
              }}
            >
              {monthLabel}
            </div>
            <button className="cal-btn" onClick={handlePrevMonth}>
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleToday}
              style={{
                border: "none",
                background: "transparent",
                color: "#3b82f6",
                fontWeight: 800,
                cursor: "pointer",
                padding: "0 10px",
                borderRight: "1px solid #e2e8f0",
              }}
            >
              العودة لليوم
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="cal-summary-cards">
          <div className="cal-summary-card">
            <div
              style={{ background: "#f0fdf4", padding: 12, borderRadius: 14 }}
            >
              <TrendingUp size={24} color="#10b981" />
            </div>
            <div>
              <div style={{ fontSize: 13, color: "#64748b", fontWeight: 800 }}>
                إجمالي دخل الشهر
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>
                {loading ? "..." : fmtMoney(monthTotals.income)} ₪
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
                إجمالي مصاريف الشهر
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>
                {loading ? "..." : fmtMoney(monthTotals.expense)} ₪
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
                إجمالي حضور الاطفال
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>
                {loading ? "..." : monthTotals.attendance} طفل
              </div>
            </div>
          </div>
        </div>

        {/* حاوية السحب المريحة للجدول */}
        <div className="cal-scroll-area">
          {/* Calendar Grid */}
          <div className="cal-grid">
            {weekDays.map((d) => (
              <div key={d} className="cal-weekday">
                {d}
              </div>
            ))}
            {renderCalendarGrid()}
          </div>
        </div>
      </div>

      {/* ===== Bottom Sheet للموبايل ===== */}
      {sheet && (
        <div className="cal-sheet-overlay" onClick={() => setSheet(null)}>
          <div className="cal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="cal-sheet-handle" />

            <div className="cal-sheet-header">
              <div>
                <div className="cal-sheet-date">
                  {new Intl.DateTimeFormat("ar", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }).format(new Date(sheet.dateStr + "T12:00:00"))}
                </div>
                <div className="cal-sheet-weekday">
                  {new Intl.DateTimeFormat("ar", { weekday: "long" }).format(
                    new Date(sheet.dateStr + "T12:00:00"),
                  )}
                </div>
              </div>
              <button
                className="cal-sheet-close"
                onClick={() => setSheet(null)}
              >
                ✕
              </button>
            </div>

            {sheet.data.income === 0 &&
            sheet.data.expense === 0 &&
            sheet.data.sessions === 0 &&
            sheet.data.attendance === 0 ? (
              <div className="cal-sheet-empty">لا يوجد نشاط في هذا اليوم</div>
            ) : (
              <div className="cal-sheet-stats">
                {sheet.data.income > 0 && (
                  <div className="cal-sheet-stat income">
                    <span className="stat-left">
                      <TrendingUp size={20} /> دخل
                    </span>
                    <span className="stat-val">
                      {fmtMoney(sheet.data.income)} ₪
                    </span>
                  </div>
                )}
                {sheet.data.expense > 0 && (
                  <div className="cal-sheet-stat expense">
                    <span className="stat-left">
                      <TrendingDown size={20} /> مصاريف
                    </span>
                    <span className="stat-val">
                      {fmtMoney(sheet.data.expense)} ₪
                    </span>
                  </div>
                )}
                {sheet.data.sessions > 0 && (
                  <div className="cal-sheet-stat sessions">
                    <span className="stat-left">
                      <CheckCircle2 size={20} /> جلسات
                    </span>
                    <span className="stat-val">{sheet.data.sessions}</span>
                  </div>
                )}
                {sheet.data.attendance > 0 && (
                  <div className="cal-sheet-stat attendance">
                    <span className="stat-left">
                      <Users size={20} /> حضور الاطفال
                    </span>
                    <span className="stat-val">
                      {sheet.data.attendance} طفل
                    </span>
                  </div>
                )}
              </div>
            )}

            <button
              className="cal-sheet-open-btn"
              onClick={() => navigate(`/calendar/${sheet.dateStr}`)}
            >
              عرض التفاصيل الكاملة <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
