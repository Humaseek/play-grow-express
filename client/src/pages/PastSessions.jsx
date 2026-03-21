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
  Pencil,
  Settings2,
  Trash2,
  ArrowRight,
} from "lucide-react";

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
        <div className="card" style={{ padding: 20, textAlign: "center" }}>
          جاري تحميل الجلسات السابقة...
        </div>
      </div>
    );
  }

  return (
    <div className="container" dir="rtl" lang="ar">
      <PageHeader
        title="الجلسات السابقة"
        subtitle={summary ? `${summary.title} - ${summary.label}` : ""}
        actions={
          <button className="btn" onClick={() => navigate(`/runs/${runId}`)}>
            العودة للدورة <ArrowRight size={18} style={{ marginRight: 6 }} />
          </button>
        }
      />

      <ErrorBanner error={error} />

      <div className="card" style={{ marginTop: 24 }}>
        <h2
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 20,
            fontSize: 20,
          }}
        >
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
            {pastSessions.map((s) => (
              <div
                key={s.id}
                className="card"
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(120px, 1fr) minmax(140px, 1fr) minmax(110px, 140px) auto",
                  gap: 12,
                  padding: "16px",
                  alignItems: "center",
                  background: s.status === "canceled" ? "#f8fafc" : "#ffffff",
                  opacity: s.status === "canceled" ? 0.7 : 1,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>
                    {fmtDate(s.start_at)}
                  </div>
                  <div className="muted">{fmtWeekday(s.start_at)}</div>
                </div>
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
                    <span dir="ltr">
                      {fmtTimeHM(s.start_at)} → {fmtTimeHM(s.end_at)}
                    </span>
                  </div>
                </div>
                <div>
                  <Badge
                    variant={
                      s.status === "done"
                        ? "ok"
                        : s.status === "canceled"
                          ? "danger"
                          : "default"
                    }
                  >
                    {sessionStatusLabel(s.status)}
                  </Badge>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    className="btn primary iconOnly"
                    title="عرض الحضور"
                    onClick={() => navigate(`/sessions/${s.id}/attendance`)}
                  >
                    <Settings2 size={16} />
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
            ))}
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
  );
}
