import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router";
import {
  Banknote,
  CalendarDays,
  ClipboardList,
  CheckCircle2,
  LayoutTemplate,
  Layers,
  RefreshCcw,
  Sparkles,
  XCircle,
  Users,
  Clock,
  BookOpen,
  CalendarCheck,
  ChevronLeft,
} from "lucide-react";

import { supabase } from "../supabaseClient";
import Badge from "../components/Badge";
import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import IconButton from "../components/IconButton";
import KpiCard from "../components/KpiCard";
import { fmtTime24, fmtDayLabelAr } from "../utils/datetime";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function normalizeRatio(v) {
  if (v == null) return 0;
  if (typeof v === "number") {
    const n = Number.isFinite(v) ? v : 0;
    const asRatio = n > 1.5 ? n / 100 : n;
    return clamp(asRatio, 0, 1);
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return 0;
    const hasPct = s.endsWith("%");
    const num = Number.parseFloat(hasPct ? s.slice(0, -1) : s);
    if (!Number.isFinite(num)) return 0;
    const asRatio = hasPct ? num / 100 : num > 1.5 ? num / 100 : num;
    return clamp(asRatio, 0, 1);
  }
  return 0;
}

// --- CSS Styles ---
const TODAY_STYLES = `
.page--today {
  /* ثيم أزرق سماوي يعطي طاقة وحيوية للـ Dashboard */
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.06) 0%, #f4f6f8 350px);
  min-height: 100vh;
  padding-bottom: 40px;
}

.today-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.today-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.today-title {
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 54px;
  padding: 10px 24px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
  font-size: 24px;
  font-weight: 900;
  color: #0f172a;
}

.today-date {
  font-size: 15px;
  font-weight: 700;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.04);
}

.btn-refresh {
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  color: #475569;
  border-radius: 14px;
  padding: 10px 20px;
  font-weight: 800;
  box-shadow: 0 2px 10px rgba(0,0,0,0.02);
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.btn-refresh:hover {
  background: #f8fafc;
  color: #0f172a;
  box-shadow: 0 4px 14px rgba(0,0,0,0.04);
}

.section-heading {
  font-size: 20px;
  font-weight: 900;
  color: #1e293b;
  margin-top: 32px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.sessions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

/* تصميم بطاقة الجلسة (Widget) */
.session-widget {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid rgba(15,23,42,0.06);
  border-radius: 22px;
  padding: 20px;
  box-shadow: 0 10px 30px rgba(15,23,42,0.03);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  overflow: hidden;
}

.session-widget:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 34px rgba(15,23,42,0.06);
}

/* شريط جانبي يعبر عن الحالة */
.session-widget::before {
  content: '';
  position: absolute;
  top: 0; right: 0; bottom: 0;
  width: 6px;
  background: #3b82f6; /* أزرق للمجدولة */
  border-radius: 0 22px 22px 0;
}
.session-widget.status-done::before { background: #16a34a; }
.session-widget.status-canceled::before { background: #ef4444; }

.sw-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.sw-time-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sw-time {
  font-size: 24px;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: -0.5px;
}

.sw-course {
  font-size: 18px;
  font-weight: 900;
  color: #1e293b;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sw-run {
  font-size: 14px;
  color: #64748b;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 20px;
}

.sw-footer {
  display: flex;
  gap: 10px;
  border-top: 1px solid #f1f5f9;
  padding-top: 16px;
  margin-top: auto;
}

.btn-take-att {
  flex: 2;
  background: #eff6ff;
  color: #2563eb;
  border: none;
  border-radius: 14px;
  padding: 10px;
  font-weight: 800;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  cursor: pointer;
  text-decoration: none;
}
.btn-take-att:hover:not(:disabled) {
  background: #dbeafe;
  color: #1d4ed8;
}
.btn-take-att:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f1f5f9;
  color: #94a3b8;
}

.btn-sw-action {
  flex: 1;
  border: none;
  border-radius: 14px;
  padding: 10px;
  font-weight: 800;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-sw-done { background: #f0fdf4; color: #16a34a; }
.btn-sw-done:hover:not(:disabled) { background: #dcfce7; }
.btn-sw-cancel { background: #fef2f2; color: #dc2626; }
.btn-sw-cancel:hover:not(:disabled) { background: #fee2e2; }

.btn-sw-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: #f8fafc;
  color: #cbd5e1;
}
`;

export default function Today() {
  const { toast } = useOutletContext();
  const navigate = useNavigate();

  const [kpi, setKpi] = useState({
    sessions_today: 0,
    active_runs: 0,
    active_students: 0,
    attendance_ratio: 0,
  });
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [confirm, setConfirm] = useState({
    open: false,
    action: null,
    sessionId: null,
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // 1. KPIs
      const { data: kpiData, error: kpiErr } = await supabase
        .from("today_kpis_view")
        .select("*")
        .maybeSingle();

      if (kpiErr) {
        if (!kpiErr.message.includes("does not exist")) throw kpiErr;
      }
      if (kpiData) {
        setKpi({
          sessions_today: Number(kpiData.sessions_today || 0),
          active_runs: Number(kpiData.active_runs || 0),
          active_students: Number(kpiData.active_students || 0),
          attendance_ratio: normalizeRatio(kpiData.attendance_ratio),
        });
      }

      // 2. Sessions
      const { data: sData, error: sErr } = await supabase
        .from("today_sessions_view")
        .select("*")
        .order("start_at", { ascending: true });

      if (sErr) {
        if (!sErr.message.includes("does not exist")) throw sErr;
      }
      if (sData) setSessions(sData);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function changeSessionStatus(id, newStatus) {
    const { error: upErr } = await supabase
      .from("course_sessions")
      .update({ status: newStatus })
      .eq("id", id);
    if (upErr) {
      toast("حدث خطأ أثناء تحديث حالة الجلسة.", "danger");
      return;
    }
    toast("تم تحديث حالة الجلسة بنجاح.", "ok");
    load();
  }

  const currentDateFormatted = useMemo(() => {
    const today = new Date();
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return today.toLocaleDateString("ar-EG", options);
  }, []);

  return (
    <div className="page page--today" dir="rtl" lang="ar">
      <style>{TODAY_STYLES}</style>
      <div className="container">
        {/* Header */}
        <div className="today-header">
          <div className="today-title-group">
            <div className="today-title">اليوم</div>
            <div className="today-date">
              <CalendarDays size={16} />
              {currentDateFormatted}
            </div>
          </div>
          <button className="btn-refresh" onClick={load} disabled={loading}>
            <RefreshCcw size={18} className={loading ? "spin" : ""} />
            تحديث البيانات
          </button>
        </div>

        {error && <ErrorBanner error={error} />}

        {/* KPIs */}
        <div className="kpiGrid4" style={{ marginBottom: 32 }}>
          <KpiCard
            icon={ClipboardList}
            label="جلسات اليوم"
            value={kpi.sessions_today}
            variant="info"
            className="kpi--accent"
          />
          <KpiCard
            icon={CheckCircle2}
            label="نسبة الحضور"
            value={`${Math.round(kpi.attendance_ratio * 100)}%`}
            hint="معدل الحضور لجلسات اليوم"
            variant={
              kpi.attendance_ratio >= 0.8
                ? "ok"
                : kpi.attendance_ratio > 0
                  ? "warn"
                  : "neutral"
            }
            className="kpi--accent"
          />
          <KpiCard
            icon={LayoutTemplate}
            label="الأفواج النشطة"
            value={kpi.active_runs}
            variant="neutral"
            className="kpi--accent"
          />
          <KpiCard
            icon={Users}
            label="الطلاب النشطين"
            value={kpi.active_students}
            variant="neutral"
            className="kpi--accent"
          />
        </div>

        <div className="section-heading">
          <CalendarCheck size={24} color="#3b82f6" /> قائمة جلسات اليوم
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
            جاري تحميل جلسات اليوم...
          </div>
        ) : sessions.length === 0 ? (
          <div
            style={{
              background: "#fff",
              borderRadius: 22,
              border: "1px solid rgba(15,23,42,0.06)",
              padding: 40,
            }}
          >
            <EmptyState
              icon={Sparkles}
              title="يوم هادئ!"
              description="لا توجد أي جلسات مبرمجة في جدولك لهذا اليوم."
            />
          </div>
        ) : (
          <div className="sessions-grid">
            {sessions.map((r) => {
              const startDT = r.start_at ? new Date(r.start_at) : null;
              const endDT = r.end_at ? new Date(r.end_at) : null;

              let badgeVar = "neutral";
              let statusAr = "غير معروف";
              let widgetClass = "session-widget";

              if (r.status === "scheduled") {
                badgeVar = "info";
                statusAr = "مجدولة";
              } else if (r.status === "done") {
                badgeVar = "ok";
                statusAr = "مكتملة";
                widgetClass += " status-done";
              } else if (r.status === "canceled") {
                badgeVar = "danger";
                statusAr = "ملغاة";
                widgetClass += " status-canceled";
              }

              const isDisabled = r.status !== "scheduled";

              return (
                <div key={r.session_id} className={widgetClass}>
                  <div className="sw-header">
                    <div className="sw-time-box">
                      <Clock size={20} color="#64748b" />
                      <div className="sw-time" dir="ltr">
                        {startDT ? fmtTime24(startDT) : "—"}
                        <span style={{ color: "#cbd5e1", margin: "0 4px" }}>
                          -
                        </span>
                        <span style={{ fontSize: 16, color: "#64748b" }}>
                          {endDT ? fmtTime24(endDT) : "—"}
                        </span>
                      </div>
                    </div>
                    <Badge variant={badgeVar}>{statusAr}</Badge>
                  </div>

                  <div className="sw-body">
                    <div className="sw-course">
                      <BookOpen size={18} color="#3b82f6" />
                      {r.course_title || "دورة غير معروفة"}
                    </div>
                    <div className="sw-run">
                      <Layers size={16} />
                      فوج: {r.run_label || "—"}
                    </div>
                  </div>

                  <div className="sw-footer">
                    <button
                      className="btn-take-att"
                      disabled={r.status === "canceled"}
                      onClick={() =>
                        navigate(`/sessions/${r.session_id}/attendance`)
                      }
                      title="سجل حضور وغياب الطلاب"
                    >
                      <ClipboardList size={18} />
                      أخذ الحضور
                    </button>

                    <button
                      className="btn-sw-action btn-sw-done"
                      disabled={isDisabled}
                      onClick={() =>
                        setConfirm({
                          open: true,
                          action: "done",
                          sessionId: r.session_id,
                        })
                      }
                      title="تأكيد إكمال الجلسة"
                    >
                      <CheckCircle2 size={18} />
                    </button>

                    <button
                      className="btn-sw-action btn-sw-cancel"
                      disabled={isDisabled}
                      onClick={() =>
                        setConfirm({
                          open: true,
                          action: "canceled",
                          sessionId: r.session_id,
                        })
                      }
                      title="إلغاء الجلسة"
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <ConfirmDialog
          open={confirm.open}
          title="تأكيد حالة الجلسة"
          message={
            confirm.action === "done"
              ? "هل أنت متأكد من تعليم هذه الجلسة كمكتملة؟"
              : "هل أنت متأكد من إلغاء هذه الجلسة؟"
          }
          confirmText="نعم، بالتأكيد"
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
