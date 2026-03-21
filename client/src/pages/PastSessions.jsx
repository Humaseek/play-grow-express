import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import PageHeader from "../components/PageHeader";
import Badge from "../components/Badge";
import ErrorBanner from "../components/ErrorBanner";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  Clock,
  History,
  Settings2,
  Pencil,
  Trash2,
  ArrowRight,
} from "lucide-react";

const LOCALE_LATN = "en-IL";

// --- دوال تنسيق التاريخ والوقت ---
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
  if (!dt) return "—";
  return new Intl.DateTimeFormat("ar", { weekday: "long" }).format(
    new Date(dt),
  );
}
// ---------------------------------

const PAST_SESSIONS_SOFT_UI_STYLES = `
.page.page--runs {
  background: linear-gradient(180deg, rgba(0, 172, 71, 0.08) 0%, #f7faf8 240px, #f4f6f8 100%) !important;
}

.pastSessionsPage {
  padding-block: 22px 40px;
}

.pastSessionsPage .mainCard {
  background: #ffffff !important;
  border: 1px solid rgba(15, 23, 42, 0.08) !important;
  border-radius: 22px !important;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04) !important;
  padding: 24px !important;
}

.pastSessionsPage .sessionRow {
  border-radius: 18px !important;
  border: 1px solid rgba(15, 23, 42, 0.08) !important;
  background: rgba(255, 255, 255, 0.94);
  transition: all 0.2s ease;
}
.pastSessionsPage .sessionRow:hover {
  background: #fff;
  border-color: rgba(0, 172, 71, 0.15) !important;
  box-shadow: 0 4px 14px rgba(0,0,0,0.03);
}

.pastSessionsPage .sectionHeader {
  font-size: 20px;
  font-weight: 900;
  color: #0f172a;
  margin-top: 0;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.pastSessionsPage .btn {
  border-radius: 14px !important;
  min-height: 42px;
  padding-inline: 16px !important;
  box-shadow: none !important;
}

.pastSessionsPage .btn.primary {
  background: rgb(0, 172, 71) !important;
  border-color: rgb(0, 172, 71) !important;
}

/* Israeli Latn Locale handling for white-space */
.pastSessionsPage .ltrIso {
  white-space: nowrap !important;
}
`;

export default function PastSessions() {
  const { runId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [pastSessions, setPastSessions] = useState([]);

  const [confirm, setConfirm] = useState({
    open: false,
    type: null,
    id: null,
    text: "",
  });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        // 1. جلب بيانات الدورة
        const sumRes = await supabase
          .from("course_runs_summary_view")
          .select("*")
          .eq("run_id", runId)
          .maybeSingle();

        if (sumRes.error) throw sumRes.error;
        setSummary(sumRes.data);

        // 2. جلب الجلسات السابقة فقط
        const now = new Date().toISOString();
        const sesRes = await supabase
          .from("course_sessions")
          .select("*")
          .eq("run_id", runId)
          .lt("start_at", now) // فقط اللي تاريخهم بالماضي
          .order("start_at", { ascending: false }); // من الأحدث للأقدم

        if (sesRes.error) throw sesRes.error;
        setPastSessions(sesRes.data || []);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    if (runId) loadData();
  }, [runId]);

  function sessionStatusLabel(st) {
    if (st === "scheduled") return "مجدولة";
    if (st === "done") return "مكتملة";
    if (st === "canceled") return "ملغاة";
    return st;
  }

  async function deleteSession(id) {
    try {
      await supabase.from("course_sessions").delete().eq("id", id);
      setPastSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="container page page--runs" dir="rtl">
        <style>{PAST_SESSIONS_SOFT_UI_STYLES}</style>
        <div
          className="card mainCard pastSessionsPage"
          style={{ textAlign: "center" }}
        >
          جاري تحميل الجلسات السابقة...
        </div>
      </div>
    );
  }

  return (
    <div className="page page--runs" dir="rtl" lang="ar">
      <style>{PAST_SESSIONS_SOFT_UI_STYLES}</style>
      <div className="container pastSessionsPage">
        <PageHeader
          title="الجلسات السابقة"
          subtitle={summary ? `${summary.title} - ${summary.label}` : ""}
          actions={
            <button
              className="btn"
              style={{
                borderRadius: "999px",
                background: "#fff",
                border: "none",
                fontWeight: "bold",
                padding: "8px 24px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              }}
              onClick={() => navigate(`/runs/${runId}`)}
            >
              العودة للدورة <ArrowRight size={18} style={{ marginRight: 6 }} />
            </button>
          }
        />

        <ErrorBanner error={error} />

        <div className="card mainCard" style={{ marginTop: 24 }}>
          <h2 className="sectionHeader">
            <History size={24} color="#475569" /> قائمة الجلسات السابقة (
            {pastSessions.length})
          </h2>

          {pastSessions.length === 0 ? (
            <div
              className="muted"
              style={{ textAlign: "center", padding: "40px 0" }}
            >
              لا يوجد أي جلسات سابقة مسجلة.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pastSessions.map((s) => {
                const isCanceled = s.status === "canceled";

                return (
                  <div
                    key={s.id}
                    className="sessionRow"
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "minmax(120px, 1fr) minmax(140px, 1fr) minmax(110px, 140px) auto",
                      gap: 12,
                      // exact replica of RunDetails padding
                      padding: "12px 14px",
                      alignItems: "center",
                      // Canceled session styling
                      background: isCanceled
                        ? "rgba(239, 68, 68, 0.08)"
                        : "rgba(255, 255, 255, 0.94)",
                      borderColor: isCanceled
                        ? "rgba(239, 68, 68, 0.15)"
                        : "rgba(15, 23, 42, 0.08)",
                      opacity: isCanceled ? 0.75 : 1,
                    }}
                  >
                    {/* Column 1: Date - With RTL alignment fix */}
                    <div style={{ textAlign: "right", paddingRight: 8 }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 16,
                          color: "#0f172a",
                        }}
                      >
                        {fmtDate(s.start_at)}
                      </div>
                      <div className="muted">{fmtWeekday(s.start_at)}</div>
                    </div>
                    {/* Column 2: Time */}
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Clock size={16} color="#64748b" />
                        <span dir="ltr" className="ltrIso">
                          {fmtTimeHM(s.start_at)} → {fmtTimeHM(s.end_at)}
                        </span>
                      </div>
                    </div>
                    {/* Column 3: Badge */}
                    <div>
                      <Badge
                        variant={
                          s.status === "done"
                            ? "ok"
                            : isCanceled
                              ? "danger"
                              : "default"
                        }
                      >
                        {sessionStatusLabel(s.status)}
                      </Badge>
                    </div>
                    {/* Column 4: Actions - Exact Replica of RunDetails */}
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        justifyContent: "flex-end",
                      }}
                    >
                      {/* Attendance button: Settings2 */}
                      <button
                        className="btn primary iconOnly"
                        title="تسجيل الحضور" // consistent title
                        onClick={() => navigate(`/sessions/${s.id}/attendance`)}
                      >
                        <Settings2 size={16} />
                      </button>

                      {/* Edit button: Pencil */}
                      <button
                        className="btn iconOnly"
                        title="تعديل الجلسة" // User might need this
                        onClick={() => navigate(`/runs/${runId}`)} // Just navigate back to main page
                      >
                        <Pencil size={16} />
                      </button>

                      {/* Delete button: Trash2 */}
                      <button
                        className="btn danger iconOnly"
                        title="حذف الجلسة" // consistent title
                        onClick={() =>
                          setConfirm({
                            open: true,
                            type: "deleteSession",
                            id: s.id,
                            text: "هل تريد حذف هذه الجلسة؟",
                          })
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <ConfirmDialog
          open={confirm.open}
          title=""
          message={confirm.text}
          confirmText="نعم"
          cancelText="إلغاء"
          danger
          onCancel={() =>
            setConfirm({ open: false, type: null, id: null, text: "" })
          }
          onConfirm={async () => {
            const { type, id } = confirm;
            setConfirm({ open: false, type: null, id: null, text: "" });

            if (type === "deleteSession") {
              await deleteSession(id);
            }
          }}
        />
      </div>
    </div>
  );
}
