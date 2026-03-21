import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router";
import { supabase } from "../supabaseClient";
import ErrorBanner from "../components/ErrorBanner";
import Badge from "../components/Badge";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import {
  Users,
  RefreshCw,
  Save,
  ArrowRight,
  CheckCircle2,
  XCircle,
  CircleSlash2,
  MinusCircle,
  MousePointerClick,
} from "lucide-react";

// --- دوال تنسيق التاريخ والوقت لتنظيف العنوان ---
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
// ------------------------------------------------

// توحيد الحالات
const STATUS = ["present", "absent", "excused", "none"];

function statusMeta(s) {
  if (s === "present") return { label: "حاضر", className: "att-btn-present" };
  if (s === "absent") return { label: "غائب", className: "att-btn-absent" };
  if (s === "excused") return { label: "معذور", className: "att-btn-excused" };
  return { label: "تصفير", className: "att-btn-none" };
}

const ATTENDANCE_STYLES = `
.page.page--runs {
  background: linear-gradient(180deg, rgba(0, 172, 71, 0.08) 0%, #f7faf8 240px, #f4f6f8 100%) !important;
}

.attendancePage {
  padding-block: 22px 40px;
}

.attendancePage .mainCard {
  background: #ffffff !important;
  border: 1px solid rgba(15, 23, 42, 0.08) !important;
  border-radius: 22px !important;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04) !important;
}

/* --- ملخص الحضور --- */
.att-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 16px;
}
.att-stat-card {
  background: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 10px rgba(0,0,0,0.02);
  transition: transform 0.2s ease;
}
.att-stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.04);
}
.att-stat-val { 
  font-size: 26px; 
  font-weight: 900; 
  color: #0f172a; 
  line-height: 1; 
  margin-top: 6px; 
}
.att-stat-label { 
  font-size: 13px; 
  font-weight: 800; 
  color: #64748b; 
}

/* --- أزرار التحكم السريع --- */
.att-quick-btn {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
  border-radius: 999px;
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.att-quick-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

/* --- أزرار الحضور بالجدول (هدوء بصري) --- */
.att-action-btn {
  display: inline-flex; 
  align-items: center; 
  justify-content: center;
  padding: 8px 22px; 
  border-radius: 999px;
  font-size: 13px; 
  font-weight: 800; 
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); 
  
  /* الوضع الافتراضي الهادي (محايد) */
  background: #f8fafc;
  color: #64748b;
  border: 1px solid #e2e8f0;
  min-width: 80px;
}
.att-action-btn:hover {
  background: #f1f5f9;
  color: #334155;
  border-color: #cbd5e1;
}

/* الألوان تظهر فقط عندما يكون الزر نشط (Active) */
.att-btn-present.active { 
  background: #16a34a; 
  color: #fff; 
  border-color: #16a34a; 
  box-shadow: 0 4px 12px rgba(22, 163, 74, 0.25); 
}

.att-btn-absent.active { 
  background: #dc2626; 
  color: #fff; 
  border-color: #dc2626; 
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25); 
}

.att-btn-excused.active { 
  background: #f59e0b; 
  color: #fff; 
  border-color: #f59e0b; 
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25); 
}

.att-btn-none.active { 
  background: #64748b; 
  color: #fff; 
  border-color: #64748b; 
  box-shadow: 0 4px 12px rgba(100, 116, 139, 0.2); 
}

/* --- الجدول --- */
.attendancePage .tableWrap {
  border-radius: 0 0 22px 22px;
  overflow: visible !important; 
  background: #fff;
}

.attendancePage .table th,
.attendancePage .table td {
  vertical-align: middle !important;
}

.attendancePage .table th {
  background: #f8fafc !important;
  color: #64748b !important;
  font-weight: 800 !important;
  padding: 16px 24px !important;
  font-size: 14px;
  border-bottom: 2px solid #edf2f7;
}

.attendancePage .table td {
  padding: 14px 24px !important;
  background: #fff !important;
  border-bottom: 1px solid #f1f5f9 !important;
  font-size: 15px;
}

.attendancePage .table tr:hover td {
  background: #f8fafc !important;
}

.attendancePage .table tr:last-child td {
  border-bottom: none !important;
}

.attendancePage .btn.primary {
  background: rgb(0, 172, 71) !important;
  border-color: rgb(0, 172, 71) !important;
  opacity: 1 !important;
  border-radius: 14px !important;
  min-height: 42px;
  padding-inline: 16px !important;
}
.attendancePage .btn.primary:disabled {
  opacity: 0.7 !important;
  cursor: not-allowed;
}
`;

export default function Attendance() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useOutletContext();

  const [session, setSession] = useState(null);
  const [summary, setSummary] = useState(null);

  const [rows, setRows] = useState([]); // الطلاب المسموح لهم
  const [att, setAtt] = useState({});
  const [initialAtt, setInitialAtt] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);

    // 1. جلب بيانات الجلسة الحالية
    const s = await supabase
      .from("course_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (s.error) {
      setError(s.error);
      setLoading(false);
      return;
    }
    setSession(s.data);

    if (!s.data.run_id) {
      setError({ message: "معرّف الدورة غير موجود (run_id)." });
      setLoading(false);
      return;
    }

    // 2. جلب بيانات الدورة للعنوان
    const sum = await supabase
      .from("course_runs_summary_view")
      .select("*")
      .eq("run_id", s.data.run_id)
      .single();

    if (sum.error) {
      setError(sum.error);
      setLoading(false);
      return;
    }
    setSummary(sum.data);

    // 3. جلب جميع الطلاب المسجلين (نشط)
    const p = await supabase
      .from("run_participants_view")
      .select("*")
      .eq("run_id", s.data.run_id)
      .eq("enrollment_status", "active")
      .order("child_name", { ascending: true });

    if (p.error) {
      setError(p.error);
      setLoading(false);
      return;
    }

    const participantsData = p.data || [];

    // --- الفلترة الذكية ---
    const sessionDate = new Date(s.data.start_at);
    sessionDate.setHours(23, 59, 59, 999);

    const pkgIds = participantsData.map((x) => x.package_id).filter(Boolean);
    const { data: pkgs } =
      pkgIds.length > 0
        ? await supabase
            .from("course_packages")
            .select("id, created_at")
            .in("id", pkgIds)
        : { data: [] };

    const pkgDates = {};
    (pkgs || []).forEach((pkg) => {
      pkgDates[pkg.id] = new Date(pkg.created_at);
    });

    const enrollIds = participantsData
      .map((x) => x.enrollment_id)
      .filter(Boolean);
    const { data: enrolls } =
      enrollIds.length > 0
        ? await supabase
            .from("enrollments")
            .select("id, created_at")
            .in("id", enrollIds)
        : { data: [] };

    const enrollDates = {};
    (enrolls || []).forEach((e) => {
      enrollDates[e.id] = new Date(e.created_at);
    });

    const validParticipants = participantsData.filter((row) => {
      const joinDate =
        row.package_id && pkgDates[row.package_id]
          ? pkgDates[row.package_id]
          : enrollDates[row.enrollment_id];

      if (joinDate) {
        return joinDate <= sessionDate;
      }
      return true;
    });

    setRows(validParticipants);

    // 4. جلب الحضور المسجل سابقاً
    const a = await supabase
      .from("attendance")
      .select("enrollment_id,status")
      .eq("session_id", sessionId);

    if (a.error) {
      setError(a.error);
      setLoading(false);
      return;
    }

    const map = {};
    (a.data ?? []).forEach((x) => {
      map[x.enrollment_id] = x.status;
    });

    const final = {};
    validParticipants.forEach((r) => {
      final[r.enrollment_id] = map[r.enrollment_id] ?? "none";
    });

    setAtt(final);
    setInitialAtt(final);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [sessionId]);

  const stats = useMemo(() => {
    const list = Object.values(att);
    const expected = list.length;
    const present = list.filter((x) => x === "present").length;
    const absent = list.filter((x) => x === "absent").length;
    const excused = list.filter((x) => x === "excused").length;
    const none = list.filter((x) => x === "none").length;
    return { expected, present, absent, excused, none };
  }, [att]);

  const dirty = useMemo(() => {
    try {
      return JSON.stringify(att) !== JSON.stringify(initialAtt);
    } catch {
      return true;
    }
  }, [att, initialAtt]);

  function setAll(value) {
    const next = {};
    rows.forEach((r) => {
      next[r.enrollment_id] = value;
    });
    setAtt(next);
  }

  async function saveAll() {
    setSaving(true);
    setError(null);
    try {
      const payload = rows.map((r) => ({
        session_id: Number(sessionId),
        enrollment_id: Number(r.enrollment_id),
        status: att[r.enrollment_id] === "none" ? null : att[r.enrollment_id],
      }));

      const toUpsert = payload.filter((x) => x.status !== null);
      if (toUpsert.length) {
        const up = await supabase
          .from("attendance")
          .upsert(toUpsert, { onConflict: "session_id,enrollment_id" });
        if (up.error) throw up.error;
      }

      const toDelete = payload
        .filter((x) => x.status === null)
        .map((x) => x.enrollment_id);
      if (toDelete.length) {
        const del = await supabase
          .from("attendance")
          .delete()
          .eq("session_id", sessionId)
          .in("enrollment_id", toDelete);
        if (del.error) throw del.error;
      }

      await supabase
        .from("course_sessions")
        .update({ status: "done" })
        .eq("id", sessionId);

      toast("تم حفظ الحضور واعتماد الجلسة بنجاح.", "ok");
      await load();
    } catch (e) {
      setError(e);
      toast("فشل في حفظ الحضور.", "danger");
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="page page--runs" dir="rtl">
        <div className="container attendancePage">
          <div className="card mainCard" style={{ textAlign: "center" }}>
            جاري التحميل...
          </div>
        </div>
      </div>
    );

  const headerSubtitle =
    session && summary
      ? `${summary.title} • تاريخ: ${fmtDate(session.start_at)} • الوقت: ${fmtTimeHM(session.start_at)} - ${fmtTimeHM(session.end_at)}`
      : (summary?.title ?? "");

  return (
    <div className="page page--runs" dir="rtl" lang="ar">
      <style>{ATTENDANCE_STYLES}</style>
      <div className="container attendancePage">
        <PageHeader
          title="تسجيل الحضور"
          subtitle={headerSubtitle}
          actions={
            <div className="toolbar">
              {summary && (
                <button
                  className="btn"
                  style={{
                    borderRadius: "14px",
                    background: "#fff",
                    border: "none",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  }}
                  onClick={() => navigate(`/runs/${summary.run_id}`)}
                >
                  العودة للدورة{" "}
                  <ArrowRight size={18} style={{ marginRight: 6 }} />
                </button>
              )}
              <button
                className="btn"
                style={{
                  borderRadius: "14px",
                  background: "#fff",
                  border: "none",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                }}
                onClick={load}
                aria-label="تحديث"
                title="تحديث البيانات"
              >
                <RefreshCw size={18} /> تحديث
              </button>

              <button
                className="btn primary"
                disabled={saving}
                onClick={saveAll}
                title="حفظ واعتماد الجلسة"
                aria-label="حفظ"
              >
                <Save size={18} /> {saving ? "جاري الحفظ..." : "حفظ الحضور"}
              </button>
            </div>
          }
        />

        <ErrorBanner error={error} />

        {/* --- قسم ملخص الحضور الجميل --- */}
        <div
          className="card mainCard"
          style={{ marginBottom: 20, padding: 24 }}
        >
          <h3
            style={{
              marginTop: 0,
              marginBottom: 16,
              fontSize: 16,
              color: "#0f172a",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            ملخص الحضور
          </h3>
          <div className="att-summary-grid">
            <div className="att-stat-card">
              <div>
                <div className="att-stat-label">مسجل</div>
                <div className="att-stat-val">{stats.expected}</div>
              </div>
              <Users size={28} color="#3b82f6" opacity={0.5} />
            </div>
            <div className="att-stat-card">
              <div>
                <div className="att-stat-label">حاضر</div>
                <div className="att-stat-val" style={{ color: "#16a34a" }}>
                  {stats.present}
                </div>
              </div>
              <CheckCircle2 size={28} color="#16a34a" opacity={0.5} />
            </div>
            <div className="att-stat-card">
              <div>
                <div className="att-stat-label">غائب</div>
                <div className="att-stat-val" style={{ color: "#dc2626" }}>
                  {stats.absent}
                </div>
              </div>
              <XCircle size={28} color="#dc2626" opacity={0.5} />
            </div>
            <div className="att-stat-card">
              <div>
                <div className="att-stat-label">معذور</div>
                <div className="att-stat-val" style={{ color: "#d97706" }}>
                  {stats.excused}
                </div>
              </div>
              <CircleSlash2 size={28} color="#d97706" opacity={0.5} />
            </div>
            <div className="att-stat-card">
              <div>
                <div className="att-stat-label">غير مسجل</div>
                <div className="att-stat-val" style={{ color: "#64748b" }}>
                  {stats.none}
                </div>
              </div>
              <MinusCircle size={28} color="#64748b" opacity={0.5} />
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="لا يوجد طلاب متاحين"
            description="جميع الطلاب المسجلين بالدورة اشتروا باقاتهم بعد تاريخ هذه الجلسة، أو لا يوجد طلاب نشطين."
            actionLabel="العودة للدورة"
            onAction={() => summary && navigate(`/runs/${summary.run_id}`)}
          />
        ) : (
          <div
            className="card mainCard"
            style={{ padding: 0, overflow: "hidden" }}
          >
            {/* --- قسم التحكم السريع فوق الجدول --- */}
            <div
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                background: "#f8fafc",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 16,
                  color: "#0f172a",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <MousePointerClick size={18} color="#64748b" /> التحكم السريع
              </h3>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  className="att-quick-btn"
                  onClick={() => setAll("present")}
                >
                  حاضر للكل
                </button>
                <button
                  className="att-quick-btn"
                  onClick={() => setAll("absent")}
                >
                  غائب للكل
                </button>
                <button
                  className="att-quick-btn"
                  onClick={() => setAll("none")}
                >
                  تصفير للكل
                </button>
              </div>
            </div>

            {/* --- الجدول النظيف الهادي بصرياً --- */}
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th
                      style={{
                        width: "35%",
                        textAlign: "right",
                        paddingRight: "30px",
                      }}
                    >
                      الطفل
                    </th>
                    <th style={{ width: "65%", textAlign: "center" }}>
                      الإجراء
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const v = att[r.enrollment_id] ?? "none";
                    return (
                      <tr key={r.enrollment_id}>
                        <td
                          style={{
                            fontWeight: 800,
                            textAlign: "right",
                            paddingRight: "30px",
                            color: "#0f172a",
                            fontSize: "16px",
                          }}
                        >
                          {r.child_name}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div
                            className="row"
                            style={{
                              flexWrap: "nowrap",
                              gap: 10,
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            {STATUS.map((s) => {
                              const meta = statusMeta(s);
                              const active = v === s;
                              return (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() =>
                                    setAtt((p) => ({
                                      ...p,
                                      [r.enrollment_id]: s,
                                    }))
                                  }
                                  className={`att-action-btn ${meta.className} ${active ? "active" : ""}`}
                                >
                                  {meta.label}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
