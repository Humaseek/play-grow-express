import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import PageHeader from "../components/PageHeader";
import ErrorBanner from "../components/ErrorBanner";
import ConfirmDialog from "../components/ConfirmDialog";
import Modal from "../components/Modal";
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

const PAST_SESSIONS_STYLES = `
.page.page--runs {
  background: linear-gradient(180deg, rgba(0, 172, 71, 0.08) 0%, #f7faf8 240px, #f4f6f8 100%) !important;
}

/* --- قائمة الجلسات --- */
.pastSessions .sessionList {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pastSessions .sessionRow {
  border-radius: 18px !important;
  background: rgba(255, 255, 255, 0.94);
  transition: all 0.2s ease;
  display: grid;
  grid-template-columns: minmax(120px, 1.2fr) minmax(140px, 1fr) minmax(80px, 0.6fr) auto;
  gap: 12px;
  padding: 14px 16px;
  align-items: center;
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
}

.pastSessions .sessionRow:hover {
  background: #fff !important;
  box-shadow: 0 6px 16px rgba(0,0,0,0.05);
}

.pastSessions .sessionList__time .ps-date {
  font-weight: 700;
  color: #0f172a;
  font-size: 15px;
}
.pastSessions .sessionList__time .ps-weekday {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
}
.pastSessions .sessionList__main .ps-time {
  font-weight: 600;
  color: #334155;
  font-size: 14px;
}
.pastSessions .sessionList__main .ps-duration {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
}

.pastSessions .ps-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  align-items: center;
}

/* --- الكرت العلوي (العنوان والحالة) --- */
.pastSessions .psCard {
  background: #fff;
  border-radius: 22px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
  padding: 20px 24px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.pastSessions .psCard .ps-count {
  font-size: 13px;
  color: #64748b;
  font-weight: 700;
}

/* =========================================
   📱 موبايل
========================================= */
@media (max-width: 980px) {
  .pastSessions .sessionRow {
    grid-template-columns: 1fr !important;
    padding: 14px !important;
    align-items: flex-start !important;
    gap: 10px !important;
  }

  .pastSessions .sessionList__time {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    width: 100% !important;
    border-bottom: 1px solid rgba(0,0,0,0.06) !important;
    padding-bottom: 10px !important;
  }

  .pastSessions .sessionList__main {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    width: 100% !important;
  }

  .pastSessions .sessionList__status {
    display: none !important;
  }

  .pastSessions .ps-actions {
    justify-content: flex-start !important;
    width: 100% !important;
    flex-wrap: wrap !important;
    border-top: 1px solid rgba(0,0,0,0.05) !important;
    padding-top: 10px !important;
    gap: 8px !important;
  }

  .pastSessions .ps-actions .btn {
    flex: 1 !important;
    justify-content: center !important;
    min-height: 42px !important;
    font-size: 13px !important;
  }

  .pastSessions .psCard {
    padding: 14px 16px !important;
    border-radius: 16px !important;
  }

  div.modalOverlay {
    align-items: center !important;
    padding: 16px !important;
  }
  div.modalOverlay > div.modalCard {
    border-radius: 24px !important;
    margin: auto !important;
    width: 95% !important;
    max-height: 88vh !important;
  }
}
`;

export default function PastSessions() {
  const { runId } = useParams();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [confirm, setConfirm] = useState({
    open: false,
    type: null,
    id: null,
    text: "",
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    id: null,
    start_at: "",
    end_at: "",
    duration_min: 60,
    status: "scheduled",
  });
  const [savingSession, setSavingSession] = useState(false);

  useEffect(() => {
    loadPastSessions();
  }, [runId]);

  async function loadPastSessions() {
    setLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const { data, error: err } = await supabase
        .from("course_sessions")
        .select("*")
        .eq("run_id", runId)
        .lt("start_at", now) // فقط الجلسات اللي وقت بدايتها أقدم من الآن
        .order("start_at", { ascending: false });

      if (err) throw err;
      setSessions(data || []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  async function deleteSession(sessionId) {
    try {
      const { error } = await supabase
        .from("course_sessions")
        .delete()
        .eq("id", sessionId);
      if (error) throw error;
      loadPastSessions();
    } catch (e) {
      setError(e);
    }
  }

  function openEditSession(s) {
    const toLocal = (d) => {
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setSessionForm({
      id: s.id,
      start_at: toLocal(new Date(s.start_at)),
      end_at: toLocal(new Date(s.end_at)),
      duration_min:
        Math.max(
          1,
          Math.round(
            (new Date(s.end_at).getTime() - new Date(s.start_at).getTime()) /
              60000,
          ),
        ) || 60,
      status: s.status,
    });
    setIsEditModalOpen(true);
  }

  async function handleSaveSession() {
    if (!sessionForm.start_at) return;
    setSavingSession(true);
    try {
      const startLocal = new Date(sessionForm.start_at);
      const endLocal = new Date(
        startLocal.getTime() + (Number(sessionForm.duration_min) || 60) * 60000,
      );

      const payload = {
        start_at: startLocal.toISOString(),
        end_at: endLocal.toISOString(),
        status: sessionForm.status,
      };

      const { error } = await supabase
        .from("course_sessions")
        .update(payload)
        .eq("id", sessionForm.id);

      if (error) throw error;

      setIsEditModalOpen(false);
      loadPastSessions();
    } catch (e) {
      setError(e);
    } finally {
      setSavingSession(false);
    }
  }

  const renderStatusBadge = (status) => {
    let bg = "#f8fafc";
    let color = "#64748b";
    let label = "غير معروف";

    if (status === "scheduled") {
      bg = "#eff6ff";
      color = "#3b82f6";
      label = "مجدولة";
    } else if (status === "done") {
      bg = "#f0fdf4";
      color = "#16a34a";
      label = "مكتملة";
    } else if (status === "canceled") {
      bg = "#fef2f2";
      color = "#ef4444";
      label = "ملغاة";
    }

    return (
      <span
        style={{
          background: bg,
          color: color,
          padding: "4px 10px",
          borderRadius: "999px",
          fontSize: "12px",
          fontWeight: "bold",
        }}
      >
        {label}
      </span>
    );
  };

  return (
    <div className="page page--runs" dir="rtl" lang="ar">
      <style>{PAST_SESSIONS_STYLES}</style>
      <div className="container pastSessions">
        <PageHeader
          title={
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <History size={28} color="#0f172a" />
              <span>الجلسات السابقة</span>
            </div>
          }
          subtitle="تاريخ الجلسات التي مر موعدها لهذا الفوج"
          actions={
            <button
              className="btn"
              style={{
                borderRadius: "14px",
                background: "#fff",
                border: "none",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
              onClick={() => navigate(`/runs/${runId}`)}
            >
              رجوع <ArrowRight size={18} />
            </button>
          }
        />

        <ErrorBanner error={error} />

        {loading ? (
          <div className="card" style={{ padding: "20px", textAlign: "center" }}>
            جارٍ التحميل...
          </div>
        ) : sessions.length === 0 ? (
          <div className="card" style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>
            لا يوجد جلسات سابقة.
          </div>
        ) : (
          <>
            {/* شريط العنوان مع عدد الجلسات */}
            <div className="psCard">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={18} color="#64748b" />
                <span style={{ fontWeight: 800, color: "#0f172a", fontSize: 15 }}>
                  سجل الجلسات
                </span>
              </div>
              <span className="ps-count">{sessions.length} جلسة</span>
            </div>

            {/* قائمة الجلسات */}
            <div className="sessionList">
              {sessions.map((s) => {
                const duration = Math.max(
                  1,
                  Math.round(
                    (new Date(s.end_at).getTime() - new Date(s.start_at).getTime()) / 60000,
                  ),
                );
                const borderColor =
                  s.status === "done"
                    ? "#00ac47"
                    : s.status === "canceled"
                      ? "#ef4444"
                      : "#0ea5e9";

                return (
                  <div
                    key={s.id}
                    className="sessionRow"
                    style={{ borderRight: `4px solid ${borderColor}` }}
                  >
                    {/* التاريخ واليوم */}
                    <div className="sessionList__time">
                      <div className="ps-date">{fmtDate(s.start_at)}</div>
                      <div className="ps-weekday">{fmtWeekday(s.start_at)}</div>
                    </div>

                    {/* الوقت والمدة */}
                    <div className="sessionList__main">
                      <div className="ps-time" dir="ltr">
                        {fmtTimeHM(s.start_at)} → {fmtTimeHM(s.end_at)}
                      </div>
                      <div className="ps-duration">{duration} دقيقة</div>
                    </div>

                    {/* الحالة */}
                    <div className="sessionList__status">
                      {renderStatusBadge(s.status)}
                    </div>

                    {/* الأزرار */}
                    <div className="ps-actions">
                      <button
                        className="btn primary"
                        title="تسجيل الحضور"
                        onClick={() => navigate(`/sessions/${s.id}/attendance`)}
                      >
                        <Settings2 size={16} /> <span>الحضور</span>
                      </button>
                      <button
                        className="btn"
                        title="تعديل"
                        onClick={() => openEditSession(s)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="btn danger iconOnly"
                        title="حذف"
                        onClick={() =>
                          setConfirm({
                            open: true,
                            type: "deleteSession",
                            id: s.id,
                            text: "هل أنت متأكد أنك تريد حذف هذه الجلسة نهائياً؟",
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
          </>
        )}

        {/* المودال */}
        <Modal
          open={isEditModalOpen}
          title="تعديل الجلسة"
          onClose={() => setIsEditModalOpen(false)}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "bold",
                  color: "#475569",
                  fontSize: "14px",
                }}
              >
                تاريخ ووقت الجلسة
              </label>
              <input
                type="datetime-local"
                value={sessionForm.start_at}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, start_at: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
                  outline: "none",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "bold",
                  color: "#475569",
                  fontSize: "14px",
                }}
              >
                المدة (دقائق)
              </label>
              <input
                type="number"
                min="1"
                value={sessionForm.duration_min}
                onChange={(e) =>
                  setSessionForm({
                    ...sessionForm,
                    duration_min: e.target.value,
                  })
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
                  outline: "none",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "bold",
                  color: "#475569",
                  fontSize: "14px",
                }}
              >
                الحالة
              </label>
              <select
                value={sessionForm.status}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, status: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
                  outline: "none",
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
                gap: "10px",
                marginTop: "10px",
              }}
            >
              <button
                style={{
                  background: "transparent",
                  border: "1px solid #cbd5e1",
                  padding: "10px 24px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontWeight: "bold",
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

        {/* حوار التأكيد الأصلي كما هو */}
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
