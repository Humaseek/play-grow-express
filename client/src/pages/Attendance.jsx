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
  Eraser,
  MinusCircle,
  MousePointerClick,
  CalendarDays,
  Clock,
  AlertCircle,
} from "lucide-react";

// --- دوال تنسيق التاريخ والوقت لتنظيف العنوان ---
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
// ------------------------------------------------

// توحيد الحالات
const STATUS = ["present", "absent", "excused", "none"];

function statusMeta(s) {
  if (s === "present")
    return { label: "حاضر", Icon: CheckCircle2, className: "att-btn-present" };
  if (s === "absent")
    return { label: "غائب", Icon: XCircle, className: "att-btn-absent" };
  if (s === "excused")
    return { label: "معذور", Icon: CircleSlash2, className: "att-btn-excused" };
  return { label: "تصفير", Icon: Eraser, className: "att-btn-none" };
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

/* --- العنوان الفرعي --- */
.att-header-subtitle {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 6px;
}
.att-subtitle-sep {
  color: #cbd5e1;
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

/* --- قسم التحكم السريع --- */
.att-quick-controls {
  padding: 16px 24px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  background: #f8fafc;
  border-radius: 22px 22px 0 0;
  border: 1px solid rgba(15, 23, 42, 0.08);
}
.att-quick-controls-title {
  margin: 0;
  font-size: 16px;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 8px;
}
.att-quick-controls-btns {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* --- حاوية أزرار الحضور (إبطال margins السالبة لـ .row) --- */
.att-btn-row {
  margin-left: 0 !important;
  margin-right: 0 !important;
}

/* --- أزرار الحضور بالجدول (دائرية دائماً، بدون نص) --- */
.att-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
}

/* إخفاء النص في الكمبيوتر والموبايل */
.att-action-btn .btn-label {
  display: none !important;
}

/* الوضع غير المفعل (ألوان فاتحة) - Inactive State */
.att-btn-present { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
.att-btn-absent { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
.att-btn-excused { background: #fffbeb; color: #d97706; border-color: #fde68a; }
.att-btn-none { background: #f8fafc; color: #64748b; border-color: #e2e8f0; }

.att-btn-present:hover { background: #dcfce7; }
.att-btn-absent:hover { background: #fee2e2; }
.att-btn-excused:hover { background: #fef3c7; }
.att-btn-none:hover { background: #f1f5f9; }

/* الوضع المفعل (ألوان قوية وصلبة) - Active State */
.att-btn-present.active { background: #16a34a; color: #fff; border-color: #16a34a; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.25); }
.att-btn-absent.active { background: #dc2626; color: #fff; border-color: #dc2626; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25); }
.att-btn-excused.active { background: #f59e0b; color: #fff; border-color: #f59e0b; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25); }
.att-btn-none.active { background: #64748b; color: #fff; border-color: #64748b; box-shadow: 0 4px 12px rgba(100, 116, 139, 0.2); }

/* --- الجدول للديسكتوب --- */
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
  padding: 12px 24px !important;
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

/* تنسيق فواصل أقسام الرصيد للديسكتوب */
.section-title-td-ok {
  background: #f0fdf4 !important;
  color: #16a34a !important;
  font-weight: 900 !important;
  font-size: 15px;
  padding: 14px 30px !important;
  border-bottom: 2px solid #bbf7d0 !important;
}

.section-title-td-danger {
  background: #fef2f2 !important;
  color: #dc2626 !important;
  font-weight: 900 !important;
  font-size: 15px;
  padding: 14px 30px !important;
  border-bottom: 2px solid #fecaca !important;
  border-top: 4px solid #fff !important;
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

@media (min-width: 981px) {
  .desktop-padded-td {
    padding-right: 30px !important;
  }
}

/* =========================================
   📱 تجاوب الموبايل
========================================= */
@media (max-width: 980px) {
  .attendancePage {
    padding-block: 12px 32px;
  }

  /* --- الـ Toolbar --- */
  .attendancePage .toolbar {
    width: 100%;
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-top: 10px;
  }
  .attendancePage .toolbar .btn {
    flex: 1;
    justify-content: center;
    padding: 8px 10px !important;
    font-size: 12px !important;
    min-height: 40px !important;
  }

  /* --- ملخص الحضور --- */
  .att-summary-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 10px !important;
  }
  .att-stat-card {
    padding: 12px !important;
    border-radius: 14px !important;
  }
  .att-stat-val {
    font-size: 22px !important;
  }
  .att-stat-label {
    font-size: 12px !important;
  }

  /* --- العنوان الفرعي --- */
  .att-header-subtitle {
    gap: 6px !important;
    margin-top: 4px !important;
  }
  .att-subtitle-sep {
    display: none !important;
  }

  /* --- قسم التحكم السريع --- */
  .att-quick-controls {
    flex-direction: column !important;
    align-items: stretch !important;
    padding: 14px 16px !important;
    gap: 10px !important;
    border-radius: 22px 22px 0 0 !important;
  }
  .att-quick-controls-btns {
    display: grid !important;
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 8px !important;
  }
  .att-quick-btn {
    justify-content: center !important;
    text-align: center !important;
    padding: 10px 6px !important;
    font-size: 12px !important;
    border-radius: 12px !important;
  }

  /* --- إبطال overflow الجدول --- */
  .attendancePage .tableWrap {
    width: 100% !important;
    overflow: hidden !important;
    overflow-x: hidden !important;
    border: none !important;
    background: transparent !important;
    padding: 10px 0 !important;
  }

  .attendancePage .table {
    display: flex !important;
    flex-direction: column !important;
    width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
    background: transparent !important;
  }

  .attendancePage .table thead {
    display: none !important;
  }

  .attendancePage .table tbody {
    display: flex !important;
    flex-direction: column !important;
    width: 100% !important;
  }

  /* --- الكروت (صفوف الطلاب) --- */
  .attendancePage .table tr {
    display: flex !important;
    flex-direction: column !important;
    margin: 0 12px 12px 12px !important;
    width: calc(100% - 24px) !important;
    box-sizing: border-box !important;
    padding: 14px !important;
    border: 1px solid #e2e8f0 !important;
    border-radius: 16px !important;
    background: #fff !important;
    box-shadow: 0 2px 10px rgba(0,0,0,0.04) !important;
  }

  /* --- صفوف العناوين الفاصلة --- */
  .attendancePage .table tr.section-title-row {
    margin: 8px 12px 4px 12px !important;
    padding: 0 !important;
    border: none !important;
    box-shadow: none !important;
    background: transparent !important;
    width: calc(100% - 24px) !important;
  }

  /* --- خلايا الجدول داخل الكروت --- */
  .attendancePage .table td {
    display: block !important;
    width: 100% !important;
    box-sizing: border-box !important;
    padding: 0 !important;
    border: none !important;
    white-space: normal !important;
    text-align: right !important;
  }

  .section-title-td-ok,
  .section-title-td-danger {
    padding: 10px 14px !important;
    border-radius: 12px !important;
    white-space: normal !important;
    line-height: 1.5 !important;
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    font-size: 14px !important;
  }

  .section-title-td-ok span,
  .section-title-td-danger span {
    white-space: normal !important;
  }

  /* --- خلية اسم الطفل --- */
  .attendancePage .table td:first-child {
    margin-bottom: 14px !important;
    padding-bottom: 14px !important;
    border-bottom: 1px dashed #e2e8f0 !important;
  }

  /* --- الكرت لا يقطع المحتوى --- */
  .attendancePage .table tr {
    overflow: visible !important;
  }

  /* --- خلية الأزرار --- */
  .attendancePage .table td:last-child {
    overflow: visible !important;
    text-align: center !important;
  }

  /* إبطال .table td > div من styles.css العام */
  .attendancePage .table td:last-child > div {
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    width: 100% !important;
    box-sizing: border-box !important;
    gap: 10px !important;
    flex-wrap: nowrap !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
  }

  /* --- الأيقونات الدائرية --- */
  .att-action-btn {
    width: 50px !important;
    height: 50px !important;
    flex-shrink: 0 !important;
    border-radius: 50% !important;
    min-width: 50px !important;
  }

  /* --- صف اسم الطفل والشارة --- */
  .child-name-row {
    display: flex !important;
    flex-direction: row !important;
    justify-content: space-between !important;
    align-items: center !important;
    gap: 8px !important;
    width: 100% !important;
    flex-wrap: nowrap !important;
  }
  .child-name-row > span:first-child {
    font-size: 15px !important;
    flex: 1 !important;
    min-width: 0 !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }
}

/* --- شاشات صغيرة جداً (< 400px) --- */
@media (max-width: 400px) {
  .att-action-btn {
    width: 44px !important;
    height: 44px !important;
    min-width: 44px !important;
  }
  .attendancePage .table td:last-child .row {
    gap: 8px !important;
  }
}

/* --- شاشات صغيرة جداً جداً (< 340px) --- */
@media (max-width: 340px) {
  .att-action-btn {
    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;
  }
  .attendancePage .table td:last-child .row {
    gap: 6px !important;
  }
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

  // دالة مخصصة لعرض سطر الطالب (الأيقونات فقط)
  const renderChildRow = (r) => {
    const v = att[r.enrollment_id] ?? "none";
    const remaining = Number(r.package_sessions_remaining || 0);
    const hasBalance = remaining > 0;

    return (
      <tr key={r.enrollment_id}>
        <td className="desktop-padded-td" style={{ textAlign: "right" }}>
          <div className="child-name-row">
            <span
              style={{ fontWeight: 900, color: "#0f172a", fontSize: "16px" }}
            >
              {r.child_name}
            </span>
            <Badge
              variant={hasBalance ? "ok" : "danger"}
              style={{ whiteSpace: "nowrap" }}
            >
              {hasBalance ? `متبقي: ${remaining}` : "منتهي"}
            </Badge>
          </div>
        </td>
        <td style={{ textAlign: "center" }}>
          <div
            className="row att-btn-row"
            style={{
              flexWrap: "nowrap",
              justifyContent: "center",
              alignItems: "center",
              margin: 0,
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
                  onClick={() =>
                    setAtt((p) => ({
                      ...p,
                      [r.enrollment_id]: s,
                    }))
                  }
                  className={`att-action-btn ${meta.className} ${active ? "active" : ""}`}
                >
                  <ActiveIcon size={22} strokeWidth={active ? 2.5 : 2} />
                  <span className="btn-label">{meta.label}</span>
                </button>
              );
            })}
          </div>
        </td>
      </tr>
    );
  };

  // تقسيم الطلاب بناءً على الرصيد المتبقي
  const hasBalanceRows = rows.filter(
    (r) => Number(r.package_sessions_remaining || 0) > 0,
  );
  const noBalanceRows = rows.filter(
    (r) => Number(r.package_sessions_remaining || 0) <= 0,
  );

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

  // إعداد العنوان الفرعي بشكل احترافي لتجنب مشاكل الاتجاهات (RTL/LTR)
  const headerSubtitle =
    session && summary ? (
      <div className="att-header-subtitle">
        <span style={{ fontWeight: 800, color: "#334155", fontSize: "15px" }}>
          {summary.title}
        </span>
        <span className="att-subtitle-sep">|</span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "#64748b",
            fontSize: "14px",
            direction: "ltr",
          }}
        >
          <CalendarDays size={16} />
          <span style={{ fontWeight: 700 }}>{fmtDate(session.start_at)}</span>
        </span>
        <span className="att-subtitle-sep">|</span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "#64748b",
            fontSize: "14px",
            direction: "ltr",
          }}
        >
          <Clock size={16} />
          <span style={{ fontWeight: 700 }}>
            {fmtTimeHM(session.start_at)} - {fmtTimeHM(session.end_at)}
          </span>
        </span>
      </div>
    ) : (
      (summary?.title ?? "")
    );

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
            style={{
              padding: 0,
              overflow: "hidden",
              background: "transparent",
              border: "none",
              boxShadow: "none",
            }}
          >
            {/* --- قسم التحكم السريع فوق الجدول --- */}
            <div className="att-quick-controls">
              <h3 className="att-quick-controls-title">
                <MousePointerClick size={18} color="#64748b" /> التحكم السريع
              </h3>
              <div className="att-quick-controls-btns">
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

            {/* --- الجدول النظيف بالأيقونات الدائرية --- */}
            <div
              className="tableWrap"
              style={{
                border: "1px solid rgba(15, 23, 42, 0.08)",
                borderTop: "none",
              }}
            >
              <table className="table">
                <thead>
                  <tr>
                    <th
                      style={{
                        width: "40%",
                        textAlign: "right",
                        paddingRight: "30px",
                      }}
                    >
                      الطفل
                    </th>
                    <th style={{ width: "60%", textAlign: "center" }}>
                      الإجراء
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* قسم الطلاب اللي معهم رصيد */}
                  {hasBalanceRows.length > 0 && (
                    <>
                      <tr className="section-title-row">
                        <td colSpan="2" className="section-title-td-ok">
                          <CheckCircle2 size={18} />
                          <span>
                            طلاب لديهم رصيد جلسات ({hasBalanceRows.length})
                          </span>
                        </td>
                      </tr>
                      {hasBalanceRows.map(renderChildRow)}
                    </>
                  )}

                  {/* قسم الطلاب اللي خلص رصيدهم */}
                  {noBalanceRows.length > 0 && (
                    <>
                      <tr className="section-title-row">
                        <td colSpan="2" className="section-title-td-danger">
                          <AlertCircle size={18} />
                          <span>
                            طلاب انتهى رصيدهم ({noBalanceRows.length})
                          </span>
                        </td>
                      </tr>
                      {noBalanceRows.map(renderChildRow)}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
