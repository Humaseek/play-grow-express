import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Receipt,
  CreditCard,
  Layers,
  CalendarDays,
  UserRound,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import Badge from "../components/Badge";
import EmptyState from "../components/EmptyState";

// ============================================================================
// CSS Styles - نسخة محسنة ومطورة
// ============================================================================
const DAY_DETAILS_STYLES = `
.page--day-details {
  background: #f8fafc;
  background-image: 
    radial-gradient(at 0% 0%, hsla(217,100%,94%,0.6) 0px, transparent 50%),
    radial-gradient(at 100% 0%, hsla(160,100%,94%,0.5) 0px, transparent 50%),
    radial-gradient(at 100% 100%, hsla(280,100%,94%,0.4) 0px, transparent 50%);
  background-attachment: fixed;
  min-height: 100vh;
  padding-bottom: 60px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  direction: rtl;
}

.dd-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
  margin-top: 24px;
}

.dd-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 28px;
  box-shadow: 0 4px 24px -4px rgba(15, 23, 42, 0.03);
  padding: 28px;
  grid-column: span 12;
  transition: all 0.3s ease;
}

@media (min-width: 1024px) {
  .dd-col-main { grid-column: span 8; }
  .dd-col-side { grid-column: span 4; }
}

.dd-section-title {
  font-size: 19px;
  font-weight: 900;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 0;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px dashed rgba(226, 232, 240, 0.8);
}

.dd-section-icon-wrapper {
  padding: 8px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Timeline Enhancements */
.tl-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}
.tl-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 24px;
  flex-shrink: 0;
}
.tl-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  border: 4px solid #cbd5e1;
  margin-top: 6px;
  box-shadow: 0 0 0 4px rgba(255,255,255,0.8);
  transition: all 0.3s ease;
}
.tl-line {
  flex: 1;
  width: 3px;
  background: #e2e8f0;
  margin-top: 8px;
  margin-bottom: -8px;
  border-radius: 3px;
}
.tl-row:last-child .tl-line { display: none; }

/* Status Colors for Timeline */
.status-done .tl-dot { border-color: #10b981; }
.status-scheduled .tl-dot { border-color: #3b82f6; }
.status-canceled .tl-dot { border-color: #ef4444; }

.tl-card {
  flex: 1;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.05);
  border-radius: 20px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 10px rgba(0,0,0,0.01);
  position: relative;
  overflow: hidden;
}
.tl-card::before {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: #cbd5e1;
  transition: all 0.3s ease;
}
.status-done .tl-card::before { background: #10b981; }
.status-scheduled .tl-card::before { background: #3b82f6; }
.status-canceled .tl-card::before { background: #ef4444; }

.tl-card:hover {
  box-shadow: 0 12px 25px -5px rgba(0,0,0,0.05);
  transform: translateY(-2px);
}

/* Lists Enhancements */
.dd-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.dd-list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #ffffff;
  border-radius: 18px;
  border: 1px solid rgba(15, 23, 42, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0,0,0,0.01);
}
.dd-list-item:hover {
  transform: translateX(-6px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.04);
}
.dd-li-info { display: flex; align-items: center; gap: 14px; }
.dd-li-avatar {
  width: 46px; height: 46px;
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 900;
  font-size: 16px;
}
.dd-li-title { font-weight: 900; color: #0f172a; font-size: 15px; margin-bottom: 4px; }
.dd-li-sub { font-size: 13px; color: #64748b; font-weight: 700; }
.dd-li-val { font-weight: 900; font-size: 17px; direction: ltr; }

/* Summary Widgets Enhancements */
.dd-summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-top: 10px;
}
.dd-sum-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 1);
  border-radius: 24px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 18px;
  box-shadow: 0 4px 20px -4px rgba(15, 23, 42, 0.04);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease;
}
.dd-sum-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 14px 30px -4px rgba(15, 23, 42, 0.08);
}

/* Button Hover */
.back-btn {
  background: white;
  border: 1px solid rgba(15, 23, 42, 0.1);
  padding: 10px 20px;
  border-radius: 999px;
  font-weight: 800;
  color: #334155;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}
.back-btn:hover {
  background: #f8fafc;
  color: #0f172a;
  transform: translateX(-4px);
  box-shadow: 0 6px 15px rgba(0,0,0,0.05);
}

/* =========================================
   📱 موبايل
========================================= */
@media (max-width: 980px) {
  .page--day-details {
    padding-bottom: 40px;
  }

  /* --- زر العودة --- */
  .back-btn {
    width: 100%;
    justify-content: center;
    border-radius: 16px !important;
    padding: 12px 20px !important;
  }

  /* --- كروت الملخص العلوية: 2×2 --- */
  .dd-summary-cards {
    grid-template-columns: 1fr 1fr !important;
    gap: 12px !important;
    margin-top: 6px;
  }
  .dd-sum-card {
    padding: 14px !important;
    border-radius: 18px !important;
    gap: 10px !important;
    flex-direction: column !important;
    align-items: flex-start !important;
  }
  .dd-sum-card > div:first-child {
    padding: 10px !important;
    border-radius: 12px !important;
  }
  .dd-sum-card > div:last-child > div:first-child {
    font-size: 11px !important;
  }
  .dd-sum-card > div:last-child > div:last-child {
    font-size: 20px !important;
  }

  /* --- الـ Grid الرئيسي: عمود واحد --- */
  .dd-grid {
    grid-template-columns: 1fr !important;
    gap: 16px !important;
    margin-top: 16px;
  }
  .dd-col-main, .dd-col-side {
    grid-column: span 1 !important;
  }

  /* --- بطاقات الأقسام --- */
  .dd-card {
    padding: 18px !important;
    border-radius: 20px !important;
  }
  .dd-section-title {
    font-size: 16px !important;
    margin-bottom: 16px !important;
    padding-bottom: 12px !important;
  }

  /* --- Timeline: إزالة overflow:hidden وتعديل التخطيط --- */
  .tl-row {
    gap: 12px !important;
  }
  .tl-card {
    overflow: visible !important;
    padding: 14px !important;
    border-radius: 16px !important;
  }
  .tl-card:hover {
    transform: none !important;
  }

  /* الصف الداخلي في الجلسة: يتحول لعمود */
  .tl-card > div {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 10px !important;
  }

  /* --- قوائم الدفعات والمصاريف --- */
  .dd-list-item {
    padding: 12px !important;
    border-radius: 14px !important;
    flex-wrap: nowrap !important;
  }
  .dd-li-avatar {
    width: 38px !important;
    height: 38px !important;
    border-radius: 10px !important;
    font-size: 14px !important;
    flex-shrink: 0 !important;
  }
  .dd-li-title { font-size: 13px !important; }
  .dd-li-sub   { font-size: 11px !important; }
  .dd-li-val   { font-size: 15px !important; white-space: nowrap !important; }
  .dd-li-info  { gap: 10px !important; }
  .dd-list-item:hover { transform: none !important; }
}
`;

function fmtMoney(n) {
  return Number(n || 0).toLocaleString("en-US");
}

function calcHours(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? diff / 60 : 0;
}

function formatTime(dt) {
  if (!dt) return "—";
  const d = new Date(dt);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function DayDetails() {
  const { date } = useParams(); // يقرأ التاريخ من الرابط مثل "2026-03-24"
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    sessions: [],
    payments: [],
    expenses: [],
    staffHours: [],
    attendanceCount: 0,
    totals: { income: 0, expense: 0 },
  });

  useEffect(() => {
    async function loadDayDetails() {
      setLoading(true);
      try {
        // تحضير تواريخ البداية والنهاية لليوم المحدد
        const [y, m, d] = date.split("-");
        const targetDate = new Date(y, m - 1, d);

        const startIso = new Date(
          targetDate.setHours(0, 0, 0, 0),
        ).toISOString();
        const endIso = new Date(
          targetDate.setHours(23, 59, 59, 999),
        ).toISOString();

        // 1. جلب الدفعات
        const qPays = supabase
          .from("payments_details_view")
          .select("*")
          .gte("created_at", startIso)
          .lte("created_at", endIso);

        // 2. جلب المصاريف
        const qExps = supabase
          .from("expenses")
          .select("*")
          .eq("spent_on", date);

        // 3. جلب الجلسات
        const qSess = supabase
          .from("course_sessions")
          .select("*")
          .gte("start_at", startIso)
          .lte("start_at", endIso)
          .order("start_at", { ascending: true });

        // 4. جلب أسماء الدورات لربطها بالجلسات
        const qRuns = supabase
          .from("course_runs_summary_view")
          .select("run_id, title, label");

        // 5. جلب ساعات العمل لهذا اليوم
        const qStaffHours = supabase
          .from("staff_hours")
          .select("*, staff(name, role)")
          .eq("work_date", date)
          .order("start_time");

        const [
          { data: pays },
          { data: exps },
          { data: sess },
          { data: runsSummary },
          { data: staffHrs },
        ] = await Promise.all([qPays, qExps, qSess, qRuns, qStaffHours]);

        // دمج أسماء الدورات مع الجلسات
        const enrichedSessions = (sess || []).map((s) => {
          const runInfo = (runsSummary || []).find(
            (r) => r.run_id === s.run_id,
          );
          return {
            ...s,
            course_title: runInfo?.title || "دورة غير محددة",
            run_label: runInfo?.label || "فوج غير محدد",
          };
        });

        // جلب الحضور لتلك الجلسات
        let attCount = 0;
        if (sess && sess.length > 0) {
          const sessIds = sess.map((s) => s.id);
          const { count } = await supabase
            .from("attendance")
            .select("id", { count: "exact", head: true })
            .in("session_id", sessIds)
            .eq("status", "present");
          attCount = count || 0;
        }

        // الحسابات النهائية
        const tIncome = (pays || []).reduce(
          (sum, p) => sum + Number(p.amount),
          0,
        );
        const tExpense = (exps || []).reduce(
          (sum, e) => sum + Number(e.amount),
          0,
        );

        setData({
          sessions: enrichedSessions,
          payments: pays || [],
          expenses: exps || [],
          staffHours: staffHrs || [],
          attendanceCount: attCount,
          totals: { income: tIncome, expense: tExpense },
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (date) loadDayDetails();
  }, [date]);

  // ============================================================================
  // تنسيق التاريخ المُحسن (يوم بالعربي، وتاريخ بالإنجليزي)
  // ============================================================================
  const targetDateObj = new Date(date);

  // استخراج اليوم بالعربي (مثل: الثلاثاء)
  const arabicDay = new Intl.DateTimeFormat("ar-EG", {
    weekday: "long",
  }).format(targetDateObj);

  // استخراج التاريخ بالإنجليزي (مثل: 24 March 2026)
  const englishDate = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(targetDateObj);

  if (loading) {
    return (
      <div
        className="page page--day-details"
        style={{ display: "grid", placeItems: "center" }}
      >
        <div style={{ color: "#64748b", fontWeight: 800 }}>
          جاري تحميل تفاصيل اليوم...
        </div>
      </div>
    );
  }

  return (
    <div className="page page--day-details" dir="rtl" lang="ar">
      <style>{DAY_DETAILS_STYLES}</style>
      <div className="container" style={{ maxWidth: 1240 }}>
        {/* Header */}
        <PageHeader
          title={
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              يوم {arabicDay}
              <span
                style={{ color: "#cbd5e1", fontWeight: 300, fontSize: "24px" }}
              >
                |
              </span>
              <span
                dir="ltr"
                style={{
                  color: "#3b82f6",
                  fontFamily: "system-ui",
                  letterSpacing: "0.5px",
                }}
              >
                {englishDate}
              </span>
            </span>
          }
          icon={<CalendarDays size={28} color="#3b82f6" />}
          actions={
            <button onClick={() => navigate("/calendar")} className="back-btn">
              العودة للتقويم <ArrowRight size={18} />
            </button>
          }
        />

        {/* Summary Widgets */}
        <div className="dd-summary-cards">
          <div className="dd-sum-card">
            <div
              style={{
                background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
                padding: 14,
                borderRadius: 16,
                boxShadow: "0 4px 10px rgba(22, 163, 74, 0.15)",
              }}
            >
              <TrendingUp size={28} color="#16a34a" />
            </div>
            <div>
              <div style={{ fontSize: 14, color: "#64748b", fontWeight: 800 }}>
                دخل اليوم
              </div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  color: "#0f172a",
                  letterSpacing: "-0.02em",
                }}
              >
                {fmtMoney(data.totals.income)} ₪
              </div>
            </div>
          </div>
          <div className="dd-sum-card">
            <div
              style={{
                background: "linear-gradient(135deg, #fef2f2, #fee2e2)",
                padding: 14,
                borderRadius: 16,
                boxShadow: "0 4px 10px rgba(220, 38, 38, 0.15)",
              }}
            >
              <TrendingDown size={28} color="#dc2626" />
            </div>
            <div>
              <div style={{ fontSize: 14, color: "#64748b", fontWeight: 800 }}>
                مصاريف اليوم
              </div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  color: "#0f172a",
                  letterSpacing: "-0.02em",
                }}
              >
                {fmtMoney(data.totals.expense)} ₪
              </div>
            </div>
          </div>
          <div className="dd-sum-card">
            <div
              style={{
                background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
                padding: 14,
                borderRadius: 16,
                boxShadow: "0 4px 10px rgba(37, 99, 235, 0.15)",
              }}
            >
              <Clock size={28} color="#2563eb" />
            </div>
            <div>
              <div style={{ fontSize: 14, color: "#64748b", fontWeight: 800 }}>
                الجلسات
              </div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  color: "#0f172a",
                  letterSpacing: "-0.02em",
                }}
              >
                {data.sessions.length} جلسة
              </div>
            </div>
          </div>
          <div className="dd-sum-card">
            <div
              style={{
                background: "linear-gradient(135deg, #faf5ff, #f3e8ff)",
                padding: 14,
                borderRadius: 16,
                boxShadow: "0 4px 10px rgba(139, 92, 246, 0.15)",
              }}
            >
              <Users size={28} color="#7c3aed" />
            </div>
            <div>
              <div style={{ fontSize: 14, color: "#64748b", fontWeight: 800 }}>
                الحضور الفعلي
              </div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  color: "#0f172a",
                  letterSpacing: "-0.02em",
                }}
              >
                {data.attendanceCount} طفل
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="dd-grid">
          {/* العمود الأيمن (الجلسات) */}
          <div className="dd-card dd-col-main">
            <h2 className="dd-section-title">
              <div
                className="dd-section-icon-wrapper"
                style={{ background: "#eff6ff" }}
              >
                <Clock size={22} color="#3b82f6" />
              </div>
              جلسات هذا اليوم
            </h2>
            {data.sessions.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="لا توجد جلسات"
                description="لم يتم تسجيل أي جلسات لهذا اليوم."
              />
            ) : (
              <div>
                {data.sessions.map((s) => {
                  const statusClass =
                    s.status === "done"
                      ? "status-done"
                      : s.status === "canceled"
                        ? "status-canceled"
                        : "status-scheduled";
                  return (
                    <div key={s.id} className={`tl-row ${statusClass}`}>
                      <div className="tl-indicator">
                        <div className="tl-dot"></div>
                        <div className="tl-line"></div>
                      </div>
                      <div
                        className="tl-card"
                        onClick={() => navigate(`/runs/${s.run_id}`)}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 10,
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: 16,
                                fontWeight: 900,
                                color: "#0f172a",
                                marginBottom: 6,
                              }}
                            >
                              <span dir="ltr" style={{ color: "#475569" }}>
                                {formatTime(s.start_at)} -{" "}
                                {formatTime(s.end_at)}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: 18,
                                fontWeight: 900,
                                color: "#1e293b",
                              }}
                            >
                              {s.course_title}
                            </div>
                            <div
                              style={{
                                fontSize: 14,
                                color: "#64748b",
                                fontWeight: 800,
                                marginTop: 6,
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <Layers size={16} />
                              الفوج: {s.run_label}
                            </div>
                          </div>
                          <div>
                            {s.status === "done" && (
                              <Badge
                                variant="ok"
                                style={{ fontSize: 13, padding: "6px 12px" }}
                              >
                                مكتملة
                              </Badge>
                            )}
                            {s.status === "canceled" && (
                              <Badge
                                variant="danger"
                                style={{ fontSize: 13, padding: "6px 12px" }}
                              >
                                ملغاة
                              </Badge>
                            )}
                            {s.status === "scheduled" && (
                              <Badge
                                variant="info"
                                style={{ fontSize: 13, padding: "6px 12px" }}
                              >
                                مجدولة
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* العمود الأيسر (الماليات) */}
          <div
            className="dd-card dd-col-side"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              background: "transparent",
              border: "none",
              boxShadow: "none",
              padding: 0,
            }}
          >
            {/* بطاقة الدخل */}
            <div className="dd-card" style={{ padding: "28px" }}>
              <h2
                className="dd-section-title"
                style={{ borderColor: "rgba(16, 185, 129, 0.2)" }}
              >
                <div
                  className="dd-section-icon-wrapper"
                  style={{ background: "#f0fdf4" }}
                >
                  <CreditCard size={22} color="#10b981" />
                </div>
                الدخل (الدفعات)
              </h2>
              {data.payments.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    color: "#94a3b8",
                    padding: "30px 0",
                    fontSize: 14,
                    fontWeight: 700,
                    background: "#f8fafc",
                    borderRadius: 16,
                  }}
                >
                  لا توجد دخل مسجلة
                </div>
              ) : (
                <div className="dd-list">
                  {data.payments.map((p) => (
                    <div
                      key={p.id}
                      className="dd-list-item"
                      style={{ borderLeft: "4px solid #10b981" }}
                    >
                      <div className="dd-li-info">
                        <div
                          className="dd-li-avatar"
                          style={{ background: "#f0fdf4", color: "#16a34a" }}
                        >
                          ₪
                        </div>
                        <div>
                          <div className="dd-li-title">{p.child_name}</div>
                          <div className="dd-li-sub">
                            {p.method === "cash"
                              ? "كاش"
                              : p.method === "card"
                                ? "بطاقة"
                                : "تحويل"}
                          </div>
                        </div>
                      </div>
                      <div className="dd-li-val" style={{ color: "#16a34a" }}>
                        +{fmtMoney(p.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* بطاقة المصاريف */}
            <div className="dd-card" style={{ padding: "28px" }}>
              <h2
                className="dd-section-title"
                style={{ borderColor: "rgba(239, 68, 68, 0.2)" }}
              >
                <div
                  className="dd-section-icon-wrapper"
                  style={{ background: "#fef2f2" }}
                >
                  <Receipt size={22} color="#ef4444" />
                </div>
                المصاريف
              </h2>
              {data.expenses.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    color: "#94a3b8",
                    padding: "30px 0",
                    fontSize: 14,
                    fontWeight: 700,
                    background: "#f8fafc",
                    borderRadius: 16,
                  }}
                >
                  لا توجد مصاريف مسجلة
                </div>
              ) : (
                <div className="dd-list">
                  {data.expenses.map((e) => (
                    <div
                      key={e.id}
                      className="dd-list-item"
                      style={{ borderLeft: "4px solid #ef4444" }}
                    >
                      <div className="dd-li-info">
                        <div
                          className="dd-li-avatar"
                          style={{ background: "#fef2f2", color: "#dc2626" }}
                        >
                          ₪
                        </div>
                        <div>
                          <div className="dd-li-title">
                            {e.category || "أخرى"}
                          </div>
                          <div className="dd-li-sub">{e.party || "—"}</div>
                        </div>
                      </div>
                      <div className="dd-li-val" style={{ color: "#dc2626" }}>
                        -{fmtMoney(e.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* بطاقة ساعات العمل */}
            {data.staffHours.length > 0 && (() => {
              const totalHours = data.staffHours.reduce((s, r) => s + calcHours(r.start_time, r.end_time), 0);
              const totalCost  = data.staffHours.reduce((s, r) => s + calcHours(r.start_time, r.end_time) * Number(r.hourly_rate || 0), 0);
              return (
                <div className="dd-card" style={{
                  padding: 0,
                  overflow: "hidden",
                  border: "1.5px solid rgba(245,158,11,0.25)",
                }}>
                  {/* Header strip */}
                  <div style={{
                    padding: "18px 22px 14px",
                    background: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.07))",
                    borderBottom: "1px solid rgba(245,158,11,0.14)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}>
                    <div style={{
                      width: 38, height: 38,
                      background: "rgba(245,158,11,0.12)",
                      border: "1.5px solid rgba(245,158,11,0.22)",
                      borderRadius: 12,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#b45309", flexShrink: 0,
                    }}>
                      <UserRound size={20} />
                    </div>
                    <span style={{ fontSize: 17, fontWeight: 900, color: "#92400e" }}>ساعات العمل</span>
                  </div>

                  {/* Items */}
                  <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {data.staffHours.map(r => {
                      const h = calcHours(r.start_time, r.end_time);
                      const amount = h * Number(r.hourly_rate || 0);
                      return (
                        <div key={r.id} style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: "#fff",
                          border: "1px solid rgba(245,158,11,0.13)",
                          borderRadius: 14,
                          padding: "11px 14px",
                          boxShadow: "0 2px 6px rgba(245,158,11,0.04)",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{
                              width: 42, height: 42,
                              background: "rgba(245,158,11,0.09)",
                              border: "1.5px solid rgba(245,158,11,0.16)",
                              borderRadius: "50%",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: "#b45309", flexShrink: 0,
                            }}>
                              <UserRound size={18} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 900, color: "#1e293b", fontSize: 15, marginBottom: 3 }}>{r.staff?.name || "—"}</div>
                              <div style={{ fontSize: 13, color: "#64748b", fontWeight: 700 }} dir="ltr">
                                {r.start_time?.slice(0,5)} – {r.end_time?.slice(0,5)}
                                &nbsp;·&nbsp;
                                <span style={{ color: "#b45309", fontWeight: 900 }}>{h.toFixed(1)} س</span>
                              </div>
                            </div>
                          </div>
                          <div style={{ fontWeight: 900, fontSize: 17, color: "#1e293b", direction: "ltr" }}>
                            {fmtMoney(amount)} ₪
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Total footer */}
                  <div style={{
                    margin: "0 18px 16px",
                    padding: "10px 16px",
                    background: "rgba(245,158,11,0.06)",
                    borderRadius: 12,
                    border: "1px solid rgba(245,158,11,0.13)",
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: 800,
                    fontSize: 14,
                  }}>
                    <span style={{ color: "#b45309", fontWeight: 900 }}>{totalHours.toFixed(1)} ساعة إجمالية</span>
                    <span style={{ color: "#1e293b", fontWeight: 900 }}>{fmtMoney(totalCost)} ₪</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
