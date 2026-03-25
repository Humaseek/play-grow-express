import React, { useEffect, useState, useRef } from "react";
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
  MoreVertical,
  CalendarDays,
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

// ============================================================================
// 👇 مكونات القائمة المنسدلة للموبايل (Action Menu) 👇
// ============================================================================
function ActionMenu({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      ref={menuRef}
      style={{
        position: "absolute",
        top: "12px",
        left: "12px",
        display: "inline-block",
        zIndex: 10,
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        style={{
          background: "rgba(0,0,0,0.05)",
          border: "none",
          padding: "6px",
          borderRadius: "50%",
          cursor: "pointer",
          color: "#64748b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MoreVertical size={20} />
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            zIndex: 1000,
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: "16px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
            padding: "8px",
            minWidth: "180px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function ActionMenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        width: "100%",
        padding: "10px 14px",
        background: "none",
        border: "none",
        borderRadius: "10px",
        cursor: "pointer",
        textAlign: "right",
        fontSize: "14px",
        fontWeight: 700,
        color: danger ? "#ef4444" : "#1e293b",
        transition: "background 0.2s",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = danger ? "#fef2f2" : "#f1f5f9")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
    >
      {Icon && <Icon size={18} color={danger ? "#ef4444" : "#64748b"} />}
      {label}
    </button>
  );
}

// --- تنسيقات CSS ---
const PAST_SESSIONS_STYLES = `
.page.page--runs {
  background: linear-gradient(180deg, rgba(0, 172, 71, 0.08) 0%, #f7faf8 240px, #f4f6f8 100%) !important;
}
.runDetails {
  padding-block: 22px 40px;
}
.tableWrap.inCard {
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 18px;
  overflow: visible !important; 
  background: #fff;
}
.modal-compact-table {
  width: 100% !important;
  min-width: 100% !important;
  border-collapse: separate !important;
  border-spacing: 0 8px !important;
  table-layout: auto !important; 
}
.modal-compact-table th,
.modal-compact-table td {
  text-align: center !important;
  vertical-align: middle !important;
  white-space: nowrap !important; 
}
.modal-compact-table th {
  background: #f8fafc !important;
  color: #64748b !important;
  font-weight: 800 !important;
  padding: 16px 15px !important;
  font-size: 15px;
  border-bottom: 2px solid #edf2f7;
}
.modal-compact-table td {
  padding: 18px 15px !important;
  background: #fff !important;
  border-top: 1px solid #f1f5f9 !important;
  border-bottom: 1px solid #f1f5f9 !important;
  font-size: 15px;
}
.modal-compact-table tr td:first-child { border-right: 1px solid #f1f5f9; border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
.modal-compact-table tr td:last-child { border-left: 1px solid #f1f5f9; border-top-left-radius: 12px; border-bottom-left-radius: 12px; }

/* تأثير الـ Hover على السطر */
.modal-compact-table tr:hover td {
  background: #f8fafc !important;
}

/* =========================================
   📱 تجاوب الموبايل (Mobile Pro Fixes)
========================================= */
.desktop-only { display: block; }
.mobile-only { display: none; }

@media (max-width: 980px) {
  .desktop-only { display: none !important; }
  .mobile-only { display: flex !important; flex-direction: column; gap: 12px; }

  .mobile-card {
    background: #fff;
    border-radius: 16px;
    padding: 16px;
    border: 1px solid rgba(15,23,42,0.06);
    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    display: flex;
    flex-direction: column;
    gap: 12px;
    position: relative;
  }

  .header-actions { 
    width: 100%; 
    justify-content: flex-end; 
    display: flex; 
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
      <div className="container runDetails">
        <PageHeader
          title={
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <History size={28} color="#0f172a" />
              <span>الجلسات السابقة</span>
            </div>
          }
          subtitle="تاريخ الجلسات التي مر موعدها لهذا الفوج"
          actions={
            <div className="header-actions">
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
            </div>
          }
        />

        <ErrorBanner error={error} />

        {loading ? (
          <div
            className="card"
            style={{ padding: "20px", textAlign: "center" }}
          >
            جارٍ التحميل...
          </div>
        ) : sessions.length === 0 ? (
          <div
            className="card"
            style={{ padding: "20px", textAlign: "center", color: "#64748b" }}
          >
            لا يوجد جلسات سابقة.
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="tableWrap inCard desktop-only">
              <table className="table modal-compact-table">
                <thead>
                  <tr>
                    <th>تاريخ ووقت الجلسة</th>
                    <th>المدة</th>
                    <th>الحالة</th>
                    <th style={{ textAlign: "center" }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 800, color: "#0f172a" }}>
                          {fmtDate(s.start_at)}
                        </div>
                        <div
                          style={{ fontSize: 13, color: "#64748b" }}
                          className="ltrIso"
                        >
                          {fmtTimeHM(s.start_at)} → {fmtTimeHM(s.end_at)}
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: "#475569" }}>
                        {Math.max(
                          1,
                          Math.round(
                            (new Date(s.end_at).getTime() -
                              new Date(s.start_at).getTime()) /
                              60000,
                          ),
                        )}{" "}
                        دقيقة
                      </td>
                      <td>{renderStatusBadge(s.status)}</td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <button
                            className="btn primary iconOnly"
                            title="تسجيل الحضور"
                            style={{
                              background: "#00ac47",
                              borderColor: "#00ac47",
                              color: "white",
                              padding: "8px",
                              borderRadius: "8px",
                              border: "none",
                              cursor: "pointer",
                            }}
                            onClick={() =>
                              navigate(`/sessions/${s.id}/attendance`)
                            }
                          >
                            <Settings2 size={16} />
                          </button>
                          <button
                            className="btn iconOnly"
                            title="تعديل"
                            style={{
                              background: "#f1f5f9",
                              color: "#475569",
                              padding: "8px",
                              borderRadius: "8px",
                              border: "none",
                              cursor: "pointer",
                            }}
                            onClick={() => openEditSession(s)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="btn danger iconOnly"
                            title="حذف"
                            style={{
                              background: "#fef2f2",
                              color: "#ef4444",
                              padding: "8px",
                              borderRadius: "8px",
                              border: "none",
                              cursor: "pointer",
                            }}
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="mobile-only">
              {sessions.map((s) => (
                <div key={s.id} className="mobile-card">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <CalendarDays size={18} color="#64748b" />
                      <strong style={{ fontSize: 16, color: "#0f172a" }}>
                        {fmtDate(s.start_at)}
                      </strong>
                    </div>
                    {renderStatusBadge(s.status)}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 14,
                      color: "#64748b",
                    }}
                  >
                    <span
                      className="ltrIso"
                      style={{ fontWeight: 600, color: "#334155" }}
                    >
                      {fmtTimeHM(s.start_at)} → {fmtTimeHM(s.end_at)}
                    </span>
                    <span>
                      {Math.max(
                        1,
                        Math.round(
                          (new Date(s.end_at).getTime() -
                            new Date(s.start_at).getTime()) /
                            60000,
                        ),
                      )}{" "}
                      دقيقة
                    </span>
                  </div>

                  {/* القائمة المنسدلة للإجراءات (Action Menu) للموبايل */}
                  <ActionMenu>
                    <ActionMenuItem
                      icon={Settings2}
                      label="سجل الحضور"
                      onClick={() => navigate(`/sessions/${s.id}/attendance`)}
                    />
                    <ActionMenuItem
                      icon={Pencil}
                      label="تعديل الموعد"
                      onClick={() => openEditSession(s)}
                    />
                    <ActionMenuItem
                      icon={Trash2}
                      label="حذف الجلسة"
                      danger
                      onClick={() =>
                        setConfirm({
                          open: true,
                          type: "deleteSession",
                          id: s.id,
                          text: "هل أنت متأكد أنك تريد حذف هذه الجلسة نهائياً؟",
                        })
                      }
                    />
                  </ActionMenu>
                </div>
              ))}
            </div>
          </>
        )}

        <Modal
          open={isEditModalOpen}
          title="تعديل الجلسة"
          onClose={() => setIsEditModalOpen(false)}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
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
