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
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import Badge from "../components/Badge";
import EmptyState from "../components/EmptyState";

// ============================================================================
// CSS Styles
// ============================================================================
const DAY_DETAILS_STYLES = `
.page--day-details {
  background: #f8fafc;
  min-height: 100vh;
  padding-bottom: 60px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  direction: rtl;
}

.dd-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
}

.dd-card {
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.03);
  padding: 24px;
  grid-column: span 12;
}

@media (min-width: 1024px) {
  .dd-col-main { grid-column: span 8; }
  .dd-col-side { grid-column: span 4; }
}

.dd-section-title {
  font-size: 18px;
  font-weight: 900;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 0;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px dashed #e2e8f0;
}

/* Timeline */
.tl-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}
.tl-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 20px;
  flex-shrink: 0;
}
.tl-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  border: 4px solid #cbd5e1;
  margin-top: 6px;
}
.tl-line {
  flex: 1;
  width: 2px;
  background: #e2e8f0;
  margin-top: 4px;
  margin-bottom: -6px;
}
.tl-row:last-child .tl-line { display: none; }
.status-done .tl-dot { border-color: #10b981; }
.status-scheduled .tl-dot { border-color: #3b82f6; }
.status-canceled .tl-dot { border-color: #ef4444; }

.tl-card {
  flex: 1;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 16px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}
.tl-card:hover {
  background: #fff;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  border-color: #e2e8f0;
}

/* Lists */
.dd-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.dd-list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8fafc;
  border-radius: 16px;
  border: 1px solid #f1f5f9;
}
.dd-li-info { display: flex; align-items: center; gap: 12px; }
.dd-li-avatar {
  width: 42px; height: 42px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800;
}
.dd-li-title { font-weight: 800; color: #0f172a; font-size: 15px; margin-bottom: 4px; }
.dd-li-sub { font-size: 13px; color: #64748b; font-weight: 600; }
.dd-li-val { font-weight: 900; font-size: 16px; direction: ltr; }

/* Summary Widgets */
.dd-summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.dd-sum-card {
  background: white;
  border: 1px solid rgba(15,23,42,0.06);
  border-radius: 20px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.02);
}
`;

function fmtMoney(n) {
  return Number(n || 0).toLocaleString("en-US");
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
          .gte("paid_at", startIso)
          .lte("paid_at", endIso);

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

        const [
          { data: pays },
          { data: exps },
          { data: sess },
          { data: runsSummary },
        ] = await Promise.all([qPays, qExps, qSess, qRuns]);

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

  // تنسيق التاريخ للعرض
  const dateFormatted = new Intl.DateTimeFormat("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));

  if (loading) {
    return (
      <div
        className="page page--day-details"
        style={{ padding: 40, textAlign: "center" }}
      >
        جاري تحميل تفاصيل اليوم...
      </div>
    );
  }

  return (
    <div className="page page--day-details" dir="rtl" lang="ar">
      <style>{DAY_DETAILS_STYLES}</style>
      <div className="container" style={{ maxWidth: 1200 }}>
        {/* Header */}
        <PageHeader
          title={`تفاصيل يوم: ${dateFormatted}`}
          subtitle="ملخص النشاطات المالية والإدارية لهذا اليوم"
          icon={<CalendarDays size={28} color="#3b82f6" />}
          actions={
            <button
              onClick={() => navigate("/calendar")}
              style={{
                background: "white",
                border: "1px solid #e2e8f0",
                padding: "8px 16px",
                borderRadius: "999px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
              }}
            >
              العودة للتقويم <ArrowRight size={16} />
            </button>
          }
        />

        {/* Summary Widgets */}
        <div className="dd-summary-cards">
          <div className="dd-sum-card">
            <div
              style={{ background: "#f0fdf4", padding: 12, borderRadius: 14 }}
            >
              <TrendingUp size={24} color="#10b981" />
            </div>
            <div>
              <div style={{ fontSize: 13, color: "#64748b", fontWeight: 800 }}>
                إيرادات اليوم
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>
                {fmtMoney(data.totals.income)} ₪
              </div>
            </div>
          </div>
          <div className="dd-sum-card">
            <div
              style={{ background: "#fef2f2", padding: 12, borderRadius: 14 }}
            >
              <TrendingDown size={24} color="#ef4444" />
            </div>
            <div>
              <div style={{ fontSize: 13, color: "#64748b", fontWeight: 800 }}>
                مصاريف اليوم
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>
                {fmtMoney(data.totals.expense)} ₪
              </div>
            </div>
          </div>
          <div className="dd-sum-card">
            <div
              style={{ background: "#eff6ff", padding: 12, borderRadius: 14 }}
            >
              <Clock size={24} color="#3b82f6" />
            </div>
            <div>
              <div style={{ fontSize: 13, color: "#64748b", fontWeight: 800 }}>
                الجلسات
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>
                {data.sessions.length} جلسة
              </div>
            </div>
          </div>
          <div className="dd-sum-card">
            <div
              style={{ background: "#faf5ff", padding: 12, borderRadius: 14 }}
            >
              <Users size={24} color="#8b5cf6" />
            </div>
            <div>
              <div style={{ fontSize: 13, color: "#64748b", fontWeight: 800 }}>
                الحضور الفعلي
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>
                {data.attendanceCount} طالب
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="dd-grid">
          {/* العمود الأيمن (الجلسات) */}
          <div className="dd-card dd-col-main">
            <h2 className="dd-section-title">
              <Clock size={20} color="#3b82f6" /> جلسات هذا اليوم
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
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: 15,
                                fontWeight: 900,
                                color: "#0f172a",
                                marginBottom: 6,
                              }}
                            >
                              <span dir="ltr">
                                {formatTime(s.start_at)} -{" "}
                                {formatTime(s.end_at)}
                              </span>
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 900 }}>
                              {s.course_title}
                            </div>
                            <div
                              style={{
                                fontSize: 13,
                                color: "#64748b",
                                fontWeight: 700,
                                marginTop: 4,
                              }}
                            >
                              <Layers
                                size={14}
                                style={{
                                  display: "inline",
                                  marginRight: 4,
                                  verticalAlign: "middle",
                                }}
                              />
                              الفوج: {s.run_label}
                            </div>
                          </div>
                          <div>
                            {s.status === "done" && (
                              <Badge variant="ok">مكتملة</Badge>
                            )}
                            {s.status === "canceled" && (
                              <Badge variant="danger">ملغاة</Badge>
                            )}
                            {s.status === "scheduled" && (
                              <Badge variant="info">مجدولة</Badge>
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
            {/* بطاقة الإيرادات */}
            <div className="dd-card" style={{ padding: "20px" }}>
              <h2
                className="dd-section-title"
                style={{ color: "#10b981", borderColor: "#bbf7d0" }}
              >
                <CreditCard size={20} color="#10b981" /> الإيرادات (الدفعات)
              </h2>
              {data.payments.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    color: "#94a3b8",
                    padding: "20px 0",
                    fontSize: 14,
                  }}
                >
                  لا توجد إيرادات
                </div>
              ) : (
                <div className="dd-list">
                  {data.payments.map((p) => (
                    <div
                      key={p.id}
                      className="dd-list-item"
                      style={{ background: "#f0fdf4", borderColor: "#dcfce7" }}
                    >
                      <div className="dd-li-info">
                        <div
                          className="dd-li-avatar"
                          style={{ background: "#dcfce7", color: "#16a34a" }}
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
            <div className="dd-card" style={{ padding: "20px" }}>
              <h2
                className="dd-section-title"
                style={{ color: "#ef4444", borderColor: "#fecaca" }}
              >
                <Receipt size={20} color="#ef4444" /> المصاريف
              </h2>
              {data.expenses.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    color: "#94a3b8",
                    padding: "20px 0",
                    fontSize: 14,
                  }}
                >
                  لا توجد مصاريف
                </div>
              ) : (
                <div className="dd-list">
                  {data.expenses.map((e) => (
                    <div
                      key={e.id}
                      className="dd-list-item"
                      style={{ background: "#fef2f2", borderColor: "#fee2e2" }}
                    >
                      <div className="dd-li-info">
                        <div
                          className="dd-li-avatar"
                          style={{ background: "#fee2e2", color: "#dc2626" }}
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
          </div>
        </div>
      </div>
    </div>
  );
}
