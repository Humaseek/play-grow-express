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
import { fmtDateTime24 } from "../utils/datetime";

function fmtDT(dt) {
  if (!dt) return "—";
  return fmtDateTime24(dt);
}

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

      // --- الميزة السحرية: تحديث حالة الجلسة إلى "مكتملة" تلقائياً ---
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
      <div className="container page page--runs" dir="rtl">
        <div className="card" style={{ padding: 20, textAlign: "center" }}>
          جاري التحميل...
        </div>
      </div>
    );

  return (
    <div className="container" dir="rtl" lang="ar">
      <PageHeader
        title="سجل الحضور"
        subtitle={
          session
            ? `${summary?.title ?? ""} — ${summary?.label ?? ""} • ${fmtDT(session.start_at)} ← ${fmtDT(session.end_at)}`
            : `${summary?.title ?? ""} — ${summary?.label ?? ""}`
        }
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
            <button
              className="btn primary"
              disabled={saving || !dirty}
              onClick={saveAll}
              title={dirty ? "حفظ التغييرات" : "لا توجد تغييرات"}
              aria-label="حفظ"
            >
              <Save size={18} />{" "}
              {saving ? "جاري الحفظ..." : dirty ? "حفظ" : "محفوظ"}
            </button>
          </div>
        }
      />

      <ErrorBanner error={error} />

      {/* شريط الإحصائيات */}
      <div
        className="row"
        style={{ flexWrap: "wrap", gap: 8, marginBottom: 14 }}
      >
        <Badge variant="info">المتوقع: {stats.expected}</Badge>
        <Badge variant="ok">حاضر: {stats.present}</Badge>
        <Badge variant="danger">غائب: {stats.absent}</Badge>
        <Badge variant="warn">معذور: {stats.excused}</Badge>
        <Badge variant="default">غير مسجل: {stats.none}</Badge>
      </div>

      {/* أزرار التحكم السريع (الجميع) */}
      <div className="toolbar" style={{ marginBottom: 16, gap: 8 }}>
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
                      style={{ textAlign: "center", verticalAlign: "middle" }}
                    >
                      {statusBadge(v)}
                    </td>
                    <td
                      style={{ textAlign: "center", verticalAlign: "middle" }}
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
                                setAtt((p) => ({ ...p, [r.enrollment_id]: s }))
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
  );
}
