import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import PageHeader from "../components/PageHeader";
import ErrorBanner from "../components/ErrorBanner";
import ConfirmDialog from "../components/ConfirmDialog";
import Modal from "../components/Modal"; // تم إضافة استيراد المودال
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
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
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

// دالة مساعدة لتحويل التاريخ لصيغة تناسب حقل الإدخال datetime-local
function toInputDatetimeLocal(dt) {
  const d = dt ? new Date(dt) : new Date();
  const pad = (x) => String(x).padStart(2, "0");
  const y = d.getFullYear();
  const mo = pad(d.getMonth() + 1);
  const da = pad(d.getDate());
  const h = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${y}-${mo}-${da}T${h}:${mi}`;
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
  background: rgba(255, 255, 255, 0.94);
  transition: all 0.2s ease;
}
.pastSessionsPage .sessionRow:hover {
  background: #fff !important;
  box-shadow: 0 6px 16px rgba(0,0,0,0.04);
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

  // حالات نافذة التعديل
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [savingSession, setSavingSession] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    start_at: "",
    end_at: "",
    status: "scheduled",
  });

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

  async function deleteSession(id) {
    try {
      await supabase.from("course_sessions").delete().eq("id", id);
      setPastSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  // دوال فتح وحفظ التعديل
  function openEditModal(session) {
    setEditingSessionId(session.id);
    setSessionForm({
      start_at: toInputDatetimeLocal(session.start_at),
      end_at: toInputDatetimeLocal(session.end_at),
      status: session.status || "scheduled",
    });
    setIsEditModalOpen(true);
  }

  async function handleSaveSession() {
    setSavingSession(true);
    try {
      const updatedData = {
        start_at: new Date(sessionForm.start_at).toISOString(),
        end_at: new Date(sessionForm.end_at).toISOString(),
        status: sessionForm.status,
      };

      const { error } = await supabase
        .from("course_sessions")
        .update(updatedData)
        .eq("id", editingSessionId);

      if (error) throw error;

      // تحديث الجلسات محلياً في الواجهة
      setPastSessions((prev) =>
        prev.map((s) =>
          s.id === editingSessionId ? { ...s, ...updatedData } : s,
        ),
      );

      setIsEditModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء حفظ التعديلات");
    } finally {
      setSavingSession(false);
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
                // تحديد لون الجلسة حسب الحالة
                let rowBg = "#fff";
                let rowBorder = "1px solid rgba(15, 23, 42, 0.08)";

                if (s.status === "done") {
                  rowBg = "rgba(0, 172, 71, 0.08)";
                  rowBorder = "1px solid rgba(0, 172, 71, 0.25)";
                } else if (s.status === "canceled") {
                  rowBg = "rgba(239, 68, 68, 0.06)";
                  rowBorder = "1px solid rgba(239, 68, 68, 0.25)";
                } else {
                  // scheduled
                  rowBg = "rgba(14, 165, 233, 0.06)";
                  rowBorder = "1px solid rgba(14, 165, 233, 0.25)";
                }

                return (
                  <div
                    key={s.id}
                    className="sessionRow"
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "minmax(120px, 1fr) minmax(140px, 1fr) auto",
                      gap: 12,
                      padding: "12px 14px",
                      alignItems: "center",
                      background: rowBg,
                      border: rowBorder,
                      borderRight:
                        s.status === "done"
                          ? "4px solid #00ac47"
                          : s.status === "canceled"
                            ? "4px solid #ef4444"
                            : "4px solid #0ea5e9",
                    }}
                  >
                    {/* عمود التاريخ */}
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

                    {/* عمود الوقت */}
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

                    {/* عمود الإجراءات */}
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        className="btn primary iconOnly"
                        title="تسجيل الحضور"
                        onClick={() => navigate(`/sessions/${s.id}/attendance`)}
                      >
                        <Settings2 size={16} />
                      </button>

                      <button
                        className="btn iconOnly"
                        title="تعديل الجلسة"
                        onClick={() => openEditModal(s)} // التعديل الجديد لفتح المودال بدلاً من الانتقال
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        className="btn danger iconOnly"
                        title="حذف الجلسة"
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

        {/* ============================================================================ */}
        {/* نافذة تعديل الجلسة */}
        {/* ============================================================================ */}
        <Modal
          open={isEditModalOpen}
          title="تعديل الجلسة"
          onClose={() => !savingSession && setIsEditModalOpen(false)}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              padding: "10px 0",
            }}
          >
            <div>
              <div
                style={{
                  marginBottom: 6,
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#64748b",
                }}
              >
                وقت البداية
              </div>
              <input
                type="datetime-local"
                value={sessionForm.start_at}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, start_at: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </div>
            <div>
              <div
                style={{
                  marginBottom: 6,
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#64748b",
                }}
              >
                وقت النهاية
              </div>
              <input
                type="datetime-local"
                value={sessionForm.end_at}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, end_at: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </div>
            <div>
              <div
                style={{
                  marginBottom: 6,
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#64748b",
                }}
              >
                الحالة
              </div>
              <select
                value={sessionForm.status}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, status: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  outline: "none",
                  fontFamily: "inherit",
                  background: "#fff",
                }}
              >
                <option value="scheduled">مجدولة</option>
                <option value="done">مكتملة</option>
                <option value="canceled">ملغاة</option>
              </select>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 10,
              }}
            >
              <button
                style={{
                  padding: "10px 24px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  background: "white",
                  cursor: "pointer",
                  fontWeight: 800,
                  color: "#0f172a",
                }}
                onClick={() => setIsEditModalOpen(false)}
                disabled={savingSession}
              >
                إلغاء
              </button>
              <button
                style={{
                  background: "#00ac47",
                  color: "white",
                  padding: "10px 24px",
                  borderRadius: "12px",
                  border: "none",
                  fontWeight: "800",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(0, 172, 71, 0.25)",
                }}
                onClick={handleSaveSession}
                disabled={savingSession}
              >
                {savingSession ? "جاري الحفظ..." : "حفظ التعديلات"}
              </button>
            </div>
          </div>
        </Modal>

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
