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
  Eraser,
  CircleSlash2,
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

// توحيد الألوان والحالات لتكون واضحة
const STATUS = ["present", "absent", "excused", "none"];

function statusMeta(s) {
  if (s === "present")
    return { label: "حاضر", Icon: CheckCircle2, color: "#00ac47" };
  if (s === "absent") return { label: "غائب", Icon: XCircle, color: "#dc2626" };
  if (s === "excused")
    return { label: "معذور", Icon: CircleSlash2, color: "#f59e0b" };
  return { label: "مسح التحديد", Icon: Eraser, color: "#64748b" };
}

function statusBadge(s) {
  if (s === "present") return <Badge variant="ok">حاضر</Badge>;
  if (s === "absent") return <Badge variant="danger">غائب</Badge>;
  if (s === "excused") return <Badge variant="warn">معذور</Badge>;
  return <Badge variant="default">غير مسجل</Badge>;
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
  padding: 24px !important;
}

.attendancePage .tableWrap.inCard {
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 18px;
  overflow: visible !important; 
  background: #fff;
}

.attendancePage .table th,
.attendancePage .table td {
  text-align: center !important;
  vertical-align: middle !important;
}

.attendancePage .table th {
  background: #f8fafc !important;
  color: #64748b !important;
  font-weight: 800 !important;
  padding: 16px 15px !important;
  font-size: 15px;
  border-bottom: 2px solid #edf2f7;
}

.attendancePage .table td {
  padding: 18px 15px !important;
  background: #fff !important;
  border-top: 1px solid #f1f5f9 !important;
  border-bottom: 1px solid #f1f5f9 !important;
  font-size: 15px;
}

.attendancePage .table tr td:first-child { border-right: 1px solid #f1f5f9; border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
.attendancePage .table tr td:last-child { border-left: 1px solid #f1f5f9; border-top-left-radius: 12px; border-bottom-left-radius: 12px; }

.attendancePage .btn {
  border-radius: 14px !important;
  min-height: 42px;
  padding-inline: 16px !important;
  box-shadow: none !important;
}

.attendancePage .btn.primary {
  background: rgb(0, 172, 71) !important;
  border-color: rgb(0, 172, 71) !important;
  opacity: 1 !important; /* منع الزر من أن يكون شفافاً */
}
.attendancePage .btn.primary:disabled {
  opacity: 0.7 !important;
  cursor: not-allowed;
}

.attendancePage .statBadge {
  font-size: 14px;
  padding: 8px 12px;
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

    // --- الفلترة الذكية: استبعاد الطلاب الذين اشتروا الباقة بعد تاريخ هذه الجلسة ---
    const sessionDate = new Date(s.data.start_at);
    sessionDate.setHours(23, 59, 59, 999); // نعتمد نهاية اليوم للمقارنة لضمان الدقة

    // جلب تواريخ الباقات
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

    // جلب تواريخ التسجيل الأساسية (احتياطياً لمن ليس لديه باقة)
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

    // تطبيق الفلتر
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

    // 4. جلب الحضور المسجل سابقاً في قاعدة البيانات
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

    // تجهيز حالة الحضور النهائية للطلاب المسموح لهم فقط
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

      // تحديث حالة الجلسة إلى "مكتملة" تلقائياً
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

  // إعداد العنوان الفرعي بشكل مرتب
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
                  onClick={() => navigate(`/runs/${summary.run_id}`)}
                >
                  العودة للدورة{" "}
                  <ArrowRight size={18} style={{ marginRight: 6 }} />
                </button>
              )}
              <button
                className="btn"
                onClick={load}
                aria-label="تحديث"
                title="تحديث البيانات"
              >
                <RefreshCw size={18} /> تحديث
              </button>

              {/* زر الحفظ معدل ليكون دائماً واضح (غير شفاف) ومكتوب عليه كلام منطقي */}
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

        {/* شريط الإحصائيات */}
        <div
          className="row"
          style={{ flexWrap: "wrap", gap: 10, marginBottom: 16 }}
        >
          <Badge variant="info" className="statBadge">
            المتوقع: {stats.expected}
          </Badge>
          <Badge variant="ok" className="statBadge">
            حاضر: {stats.present}
          </Badge>
          <Badge variant="danger" className="statBadge">
            غائب: {stats.absent}
          </Badge>
          <Badge variant="warn" className="statBadge">
            معذور: {stats.excused}
          </Badge>
          <Badge variant="default" className="statBadge">
            غير مسجل: {stats.none}
          </Badge>
        </div>

        {/* أزرار التحكم السريع (الجميع) */}
        <div className="toolbar" style={{ marginBottom: 20, gap: 10 }}>
          <button
            className="btn"
            title="تعيين الجميع: حاضر"
            aria-label="تعيين الجميع: حاضر"
            onClick={() => setAll("present")}
          >
            <CheckCircle2 size={18} color="#00ac47" /> حاضر للكل
          </button>
          <button
            className="btn"
            title="تعيين الجميع: غائب"
            aria-label="تعيين الجميع: غائب"
            onClick={() => setAll("absent")}
          >
            <XCircle size={18} color="#dc2626" /> غائب للكل
          </button>
          <button
            className="btn"
            title="مسح الجميع"
            aria-label="مسح الجميع"
            onClick={() => setAll("none")}
          >
            <Eraser size={18} color="#64748b" /> تصفير
          </button>
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
          <div className="tableWrap inCard">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ textAlign: "center", width: "30%" }}>الطفل</th>
                  <th style={{ textAlign: "center", width: "20%" }}>الحالة</th>
                  <th style={{ textAlign: "center", width: "50%" }}>
                    تسجيل الحضور
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
                          textAlign: "center",
                          verticalAlign: "middle",
                          fontSize: "15px",
                        }}
                      >
                        {r.child_name}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          verticalAlign: "middle",
                        }}
                      >
                        {statusBadge(v)}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          verticalAlign: "middle",
                        }}
                      >
                        <div
                          className="row"
                          style={{
                            flexWrap: "nowrap",
                            gap: 12,
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          {STATUS.map((s) => {
                            const meta = statusMeta(s);
                            const ActiveIcon = meta.Icon;
                            const active = v === s;
                            return (
                              <button
                                key={s}
                                type="button"
                                title={meta.label}
                                aria-label={meta.label}
                                onClick={() =>
                                  setAtt((p) => ({
                                    ...p,
                                    [r.enrollment_id]: s,
                                  }))
                                }
                                className="btn"
                                style={{
                                  width: 44,
                                  height: 44,
                                  padding: 0,
                                  borderRadius: 14,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: active ? meta.color : "#fff",
                                  color: active ? "#fff" : "#64748b",
                                  border: active
                                    ? `1px solid ${meta.color}`
                                    : "1px solid rgba(0,0,0,0.12)",
                                  boxShadow: active
                                    ? `0 4px 12px ${meta.color}40`
                                    : "0 2px 4px rgba(0,0,0,0.02)",
                                  transition: "all 0.15s ease",
                                  opacity: active ? 1 : 0.8,
                                }}
                              >
                                <ActiveIcon size={20} />
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
        )}
      </div>
    </div>
  );
}
