import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router";
import { createPortal } from "react-dom"; // السلاح السري للزر العائم
import { supabase } from "../supabaseClient";
import ErrorBanner from "../components/ErrorBanner";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import KpiCard from "../components/KpiCard";
import IconButton from "../components/IconButton";
import ModernSelect from "../components/ModernSelect";
import { fmtDateTime24 } from "../utils/datetime";

import {
  Layers,
  Users,
  CalendarClock,
  CheckCircle2,
  Trash2,
  Plus,
  RotateCcw,
  Pencil,
  Ban,
  RefreshCw,
  ArrowRight,
} from "lucide-react";

// --- تنسيقات CSS المدمجة للشاشة والمودالات ---
const COURSE_DETAILS_STYLES = `
.btn-add {
  background: #7c3aed !important; /* اللون البنفسجي للدورات */
  color: #fff !important;
  border: none !important;
  border-radius: 14px !important;
  padding: 10px 20px !important;
  font-weight: 800 !important;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.2) !important;
  transition: all 0.2s !important;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-add:hover {
  transform: translateY(-2px);
  background: #6d28d9 !important;
  box-shadow: 0 6px 20px rgba(124, 58, 237, 0.3) !important;
}

/* =========================================
   تنسيقات النموذج (المودال) - ثابتة لجميع الشاشات
========================================= */
.form-section-title {
  margin: 0 0 16px 0;
  color: #0f172a;
  font-size: 16px;
  font-weight: 800;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 8px;
}

.modal-form-scroll-container {
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 8px;
  max-height: 65vh;
}

.modal-form-scroll-container::-webkit-scrollbar {
  width: 5px;
}
.modal-form-scroll-container::-webkit-scrollbar-track {
  background: transparent;
}
.modal-form-scroll-container::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 10px;
}
.modal-form-scroll-container::-webkit-scrollbar-thumb:hover {
  background-color: #94a3b8;
}

.responsive-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  padding-bottom: 16px;
}

.form-col-full { grid-column: span 2; }
.form-col { grid-column: span 1; }

.modal-fixed-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 16px;
  margin-top: 10px;
  border-top: 1px solid #f1f5f9;
}

/* الزر العائم في الموبايل */
.fab-button {
  position: fixed !important;
  bottom: 95px !important;
  right: 20px !important;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #7c3aed; 
  color: white;
  border: none;
  box-shadow: 0 6px 16px rgba(124, 58, 237, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 999999 !important;
}

/* =========================================
   التجاوب الخاص بالموبايل وإلغاء Bottom Sheet
========================================= */
@media (max-width: 980px) {
  .hide-on-mobile { display: none !important; }

  div.modalOverlay {
    align-items: center !important; 
    padding: 16px !important;
  }
  
  div.modalOverlay > div.modalCard {
    border-radius: 24px !important; 
    margin: auto !important; 
    width: 92% !important; 
    max-height: 85vh !important; 
    margin-bottom: auto !important; 
    transform: translateY(-5vh) !important;
  }

  .modal-form-scroll-container {
    max-height: calc(85vh - 140px) !important; 
    padding: 0 5px;
  }
  
  /* ترتيب الفورم (عمودين) على الموبايل */
  .responsive-form-grid {
    grid-template-columns: 1fr 1fr !important;
    gap: 12px;
    padding-bottom: 12px;
  }
  
  .form-col-full { grid-column: span 2 !important; }
  .form-col { grid-column: span 1 !important; }

  .form-section-title { margin: 10px 0 10px 0; font-size: 14px; }
  .input { padding: 10px 14px; font-size: 13px; }
  .modal-fixed-footer { padding-bottom: 10px; margin-top: 5px; }

  /* 👇 تعديل الـ justify-content في الموبايل لتقريب الأزرار 👇 */
  .pageHeader__actions { 
    width: 100%; 
    justify-content: flex-end; /* عشن تصف عالشمال في العربي */
  }
}

@media (min-width: 981px) {
  .fab-button { display: none !important; }
}
`;

function fmtDT(dt) {
  if (!dt) return "-";
  return fmtDateTime24(dt);
}

export default function CourseDetails() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useOutletContext();

  const [course, setCourse] = useState(null);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [firstStart, setFirstStart] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [count, setCount] = useState(8);
  const [intervalDays, setIntervalDays] = useState(7);
  const [createSessions, setCreateSessions] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editRunId, setEditRunId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editDefaultSessionsTotal, setEditDefaultSessionsTotal] = useState("0");
  const [editStatus, setEditStatus] = useState("active");

  const [confirm, setConfirm] = useState({
    open: false,
    type: null,
    runId: null,
    text: "",
  });

  const isWorkshop = useMemo(() => {
    return (course?.kind || "").toLowerCase() === "workshop";
  }, [course]);

  // متغيرات النصوص بناءً على النوع
  const runSingular = isWorkshop ? "جلسة" : "فوج";
  const runPlural = isWorkshop ? "جلسات" : "أفواج";

  const activeRuns = useMemo(
    () => runs.filter((r) => r.status === "active"),
    [runs],
  );

  const stats = useMemo(() => {
    const totalRuns = runs.length;
    const activeCount = activeRuns.length;
    let totalParticipants = 0;
    let totalSessions = 0;
    let next = null;

    for (const r of runs) {
      totalParticipants += Number(r.participants_count ?? 0);
      totalSessions += Number(r.sessions_count ?? 0);
      if (r.status === "active" && r.next_session_at) {
        const dt = new Date(r.next_session_at);
        if (!Number.isNaN(dt.getTime()) && (!next || dt < next)) next = dt;
      }
    }

    return {
      totalRuns,
      activeCount,
      totalParticipants,
      totalSessions,
      nextSessionAt: next ? next.toISOString() : null,
    };
  }, [runs, activeRuns]);

  const sortedRuns = useMemo(() => {
    const list = [...runs];
    list.sort((a, b) => {
      const as = a.status === "active" ? 0 : 1;
      const bs = b.status === "active" ? 0 : 1;
      if (as !== bs) return as - bs;

      if (a.status === "active" && b.status === "active") {
        const ad = a.next_session_at ? new Date(a.next_session_at) : null;
        const bd = b.next_session_at ? new Date(b.next_session_at) : null;
        if (ad && bd) return ad - bd;
        if (ad && !bd) return -1;
        if (!ad && bd) return 1;
      }

      return Number(b.run_id) - Number(a.run_id);
    });
    return list;
  }, [runs]);

  const priceValue = useMemo(
    () => Number(course?.default_price ?? 0).toFixed(2),
    [course],
  );

  function resetCreateForm() {
    setLabel("");
    setFirstStart("");
    setDurationMinutes(60);
    setCount(isWorkshop ? 1 : 8);
    setIntervalDays(isWorkshop ? 1 : 7);
    setCreateSessions(true);
  }

  function openCreateRunModal() {
    if ((course?.kind || "").toLowerCase() === "workshop") {
      setCreateSessions(true);
      setCount(1);
      setIntervalDays(1);
    } else {
      setCreateSessions(true);
      setCount(8);
      setIntervalDays(7);
    }
    setLabel("");
    setFirstStart("");
    setDurationMinutes(60);
    setOpen(true);
  }

  function openEditRunModal(r) {
    setEditRunId(r.run_id);
    setEditLabel(r.label ?? "");
    setEditDefaultSessionsTotal(String(r.default_sessions_total ?? 0));
    setEditStatus(r.status ?? "active");
    setEditOpen(true);
  }

  async function autoEnrollPackages(runId) {
    setError(null);
    try {
      const rpc = await supabase.rpc("auto_enroll_packages_for_run", {
        p_run_id: Number(runId),
      });

      if (rpc.error) throw rpc.error;

      const insertedCount =
        typeof rpc.data === "number"
          ? rpc.data
          : Array.isArray(rpc.data)
            ? rpc.data[0]
            : rpc.data;

      toast(`تمت المزامنة بنجاح. (${insertedCount ?? 0})`, "ok");
      await load();
    } catch (e) {
      setError(e);
      toast("فشلت المزامنة.", "danger");
    }
  }

  async function updateRun() {
    if (!editRunId) return;

    setSaving(true);
    setError(null);

    try {
      const nextDefault = Math.max(
        0,
        parseInt(editDefaultSessionsTotal, 10) || 0,
      );

      const u = await supabase
        .from("course_runs")
        .update({
          label: (editLabel ?? "").trim(),
          default_sessions_total: nextDefault,
          status: editStatus,
        })
        .eq("id", editRunId);

      if (u.error) throw u.error;

      toast(`تم تحديث ال${runSingular}.`, "ok");
      setEditOpen(false);
      await load();
    } catch (e) {
      setError(e);
      toast(`فشل تحديث ال${runSingular}.`, "danger");
    } finally {
      setSaving(false);
    }
  }

  async function createRun() {
    setSaving(true);
    setError(null);

    try {
      const finalLabel = label.trim()
        ? label.trim()
        : firstStart
          ? `${runSingular} ${new Date(firstStart).toLocaleDateString("en-US")}`
          : `${runSingular} جديد`;

      const ins = await supabase
        .from("course_runs")
        .insert([
          {
            template_id: Number(courseId),
            label: finalLabel,
            status: "active",
            default_sessions_total: Number(count) || 0,
          },
        ])
        .select("id")
        .single();

      if (ins.error) throw ins.error;

      const runId = ins.data.id;

      let sessionsGenerated = false;
      if (createSessions && firstStart) {
        const [datePart, timePart] = firstStart.split("T");
        const [y, m, d] = datePart.split("-");
        const [hh, mm] = timePart.split(":");
        const baseYear = parseInt(y, 10);
        const baseMonth = parseInt(m, 10) - 1;
        const baseDay = parseInt(d, 10);
        const baseHours = parseInt(hh, 10);
        const baseMins = parseInt(mm, 10);

        const sessionsToInsert = [];
        const sessionCount = Number(count) || 1;
        const interval = Number(intervalDays) || 7;
        const duration = Number(durationMinutes) || 60;

        for (let i = 0; i < sessionCount; i++) {
          const start = new Date(
            baseYear,
            baseMonth,
            baseDay + i * interval,
            baseHours,
            baseMins,
          );
          const end = new Date(start.getTime() + duration * 60000);

          sessionsToInsert.push({
            run_id: Number(runId),
            course_id: Number(courseId),
            start_at: start.toISOString(),
            end_at: end.toISOString(),
            status: "scheduled",
          });
        }

        const insSessions = await supabase
          .from("course_sessions")
          .insert(sessionsToInsert);
        if (insSessions.error) throw insSessions.error;

        sessionsGenerated = true;
      }

      if (sessionsGenerated) {
        await autoEnrollPackages(runId);
      }

      toast(`تم إنشاء ال${runSingular}.`, "ok");

      setOpen(false);
      resetCreateForm();
      await load();
      navigate(`/runs/${runId}`);
    } catch (e) {
      setError(e);
      toast(`فشل إنشاء ال${runSingular}.`, "danger");
    } finally {
      setSaving(false);
    }
  }

  async function setRunStatus(runId, status) {
    setError(null);

    const u = await supabase
      .from("course_runs")
      .update({ status })
      .eq("id", runId);

    if (u.error) {
      setError(u.error);
      toast(`فشل تحديث حالة ال${runSingular}.`, "danger");
      return;
    }

    toast(`تم تحديث حالة ال${runSingular}.`, "ok");
    await load();
  }

  async function deleteRun(runId) {
    setError(null);
    const d = await supabase.from("course_runs").delete().eq("id", runId);

    if (d.error) {
      setError(d.error);
      toast(`فشل حذف ال${runSingular}.`, "danger");
      return;
    }

    toast(`تم حذف ال${runSingular}.`, "ok");
    await load();
  }

  async function load() {
    setLoading(true);
    setError(null);

    const c = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .single();

    if (c.error) {
      setError(c.error);
      setLoading(false);
      return;
    }
    setCourse(c.data);

    const fetchRuns = async () => {
      const r = await supabase
        .from("course_runs_summary_view")
        .select("*")
        .eq("template_id", courseId)
        .order("created_at", { ascending: false });

      if (r.error) return { error: r.error, data: null };
      return { error: null, data: r.data ?? [] };
    };

    const rr = await fetchRuns();
    if (rr.error) {
      setError(rr.error);
      setLoading(false);
      return;
    }

    const autoDoneIds = (rr.data ?? [])
      .filter(
        (x) =>
          x.status === "active" &&
          Number(x.sessions_count || 0) > 0 &&
          !x.next_session_at,
      )
      .map((x) => x.run_id);

    if (autoDoneIds.length) {
      const u = await supabase
        .from("course_runs")
        .update({ status: "done" })
        .in("id", autoDoneIds);

      if (u.error) {
        setError(u.error);
        setRuns(rr.data ?? []);
        setLoading(false);
        return;
      }

      const rr2 = await fetchRuns();
      if (rr2.error) {
        setError(rr2.error);
        setRuns(rr.data ?? []);
        setLoading(false);
        return;
      }

      setRuns(rr2.data ?? []);
      setLoading(false);
      return;
    }

    setRuns(rr.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [courseId]);

  if (loading) {
    return (
      <div className="container page page--courses" dir="rtl" lang="ar">
        <div className="card">جارٍ التحميل...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container" dir="rtl" lang="ar">
        <div className="card">الدورة غير موجودة.</div>
      </div>
    );
  }

  return (
    <div className="container page page--courses" dir="rtl" lang="ar">
      <style>{COURSE_DETAILS_STYLES}</style>

      <PageHeader
        title={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 32, fontWeight: 950, color: "#22182f" }}>
              {course.title}
            </span>
          </div>
        }
        subtitle={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 2,
            }}
          >
            <span
              style={{
                color: "#7a6d91",
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              السعر
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 12px",
                borderRadius: 999,
                background:
                  "linear-gradient(135deg, rgba(124,58,237,.10), rgba(255,255,255,.96))",
                border: "1px solid rgba(124,58,237,.14)",
                boxShadow: "0 8px 18px rgba(124,58,237,.08)",
              }}
            >
              <span
                className="ltrIso"
                style={{ fontSize: 16, fontWeight: 950, color: "#241a31" }}
              >
                {priceValue}
              </span>
              <span style={{ fontSize: 12, fontWeight: 900, color: "#8a7ca5" }}>
                ₪
              </span>
            </span>
          </div>
        }
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              className="btn btn-add hide-on-mobile"
              onClick={openCreateRunModal}
            >
              <Plus size={18} /> {runSingular} جديد{isWorkshop ? "ة" : ""}
            </button>
            <button
              className="btn"
              onClick={() => navigate("/courses")}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              الدورات <ArrowRight size={18} />
            </button>
          </div>
        }
      />

      <ErrorBanner error={error} />

      {/* 👇 إضافة كلاس hide-on-mobile لإخفاء شبكة الكروت بالموبايل 👇 */}
      <div className="grid hide-on-mobile" style={{ marginTop: 10 }}>
        <div style={{ gridColumn: "span 3" }}>
          <KpiCard
            variant={stats.activeCount ? "ok" : "neutral"}
            label={`ال${runPlural} الفعّالة`}
            value={stats.activeCount}
            hint={stats.totalRuns ? `` : ""}
            icon={Layers}
          />
        </div>

        <div style={{ gridColumn: "span 3" }}>
          <KpiCard
            variant={stats.totalParticipants ? "info" : "neutral"}
            label="المشتركين"
            value={stats.totalParticipants}
            hint=""
            icon={Users}
          />
        </div>

        <div style={{ gridColumn: "span 3" }}>
          <KpiCard
            variant={stats.nextSessionAt ? "warn" : "neutral"}
            label="الجلسة القادمة"
            value={stats.nextSessionAt ? fmtDT(stats.nextSessionAt) : "-"}
            hint={stats.nextSessionAt ? "" : ""}
            icon={CalendarClock}
          />
        </div>

        <div style={{ gridColumn: "span 3" }}>
          <KpiCard
            variant={stats.totalSessions ? "neutral" : "neutral"}
            label="مجموع الجلسات"
            value={stats.totalSessions}
            hint=""
            icon={CalendarClock}
          />
        </div>
      </div>

      {sortedRuns.length === 0 ? (
        <div className="card" style={{ marginTop: 12 }}>
          <EmptyState
            title={`لا يوجد ${runPlural}`}
            description={`أنشئ أول ${runSingular} للدورة.`}
            icon={Layers}
            actions={
              <button className="btn btn-add" onClick={openCreateRunModal}>
                <Plus size={18} /> {runSingular} جديد{isWorkshop ? "ة" : ""}
              </button>
            }
          />
        </div>
      ) : (
        <div className="cardsGrid" style={{ marginTop: 12 }}>
          {sortedRuns.map((r) => {
            const title = r.label || `${runSingular} #${r.run_id}`;
            const isActive = r.status === "active";

            return (
              <div
                key={r.run_id}
                className="card runCard"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/runs/${r.run_id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/runs/${r.run_id}`);
                  }
                }}
                style={{
                  padding: 16,
                  borderRadius: 22,
                  display: "grid",
                  gap: 12,
                }}
              >
                <div className="runCard__top">
                  <div style={{ width: "100%" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <span className="pill" style={{ padding: "6px 12px" }}>
                        <Layers size={16} />
                        <b>{title}</b>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="statsRow" style={{ marginTop: 0 }}>
                  <div className="stat">
                    <span className="muted">المشتركين</span>
                    <b>{r.participants_count ?? 0}</b>
                  </div>
                  <div className="stat">
                    <span className="muted">الجلسات</span>
                    <b>{r.sessions_count ?? 0}</b>
                  </div>
                </div>

                <div
                  className="runCard__actions"
                  onClick={(e) => e.stopPropagation()}
                  style={{ justifyContent: "flex-start" }}
                >
                  <IconButton
                    icon={Pencil}
                    title={`تعديل ال${runSingular}`}
                    variant="soft"
                    size="sm"
                    onClick={() => openEditRunModal(r)}
                  >
                    تعديل
                  </IconButton>

                  {isActive ? (
                    <IconButton
                      icon={CheckCircle2}
                      title={`إنهاء ال${runSingular}`}
                      variant="soft"
                      size="sm"
                      onClick={() =>
                        setConfirm({
                          open: true,
                          type: "done",
                          runId: r.run_id,
                          text: `إنهاء ال${runSingular}: ${title}`,
                        })
                      }
                    >
                      إنهاء
                    </IconButton>
                  ) : (
                    <IconButton
                      icon={RotateCcw}
                      title={`إعادة تفعيل ال${runSingular}`}
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setConfirm({
                          open: true,
                          type: "reactivate",
                          runId: r.run_id,
                          text: `إعادة تفعيل ال${runSingular}: ${title}`,
                        })
                      }
                    >
                      إعادة تفعيل
                    </IconButton>
                  )}

                  <IconButton
                    icon={Trash2}
                    title={`حذف ال${runSingular}`}
                    variant="danger"
                    size="sm"
                    onClick={() =>
                      setConfirm({
                        open: true,
                        type: "delete",
                        runId: r.run_id,
                        text: `حذف ال${runSingular}: ${title}`,
                      })
                    }
                  >
                    حذف
                  </IconButton>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* الزر العائم للموبايل - يختفي عند فتح المودال */}
      {!open &&
        !editOpen &&
        createPortal(
          <button
            className="fab-button"
            onClick={openCreateRunModal}
            title={`إضافة ${runSingular}`}
          >
            <Plus size={30} strokeWidth={2.5} />
          </button>,
          document.body,
        )}

      {/* نافذة الإنشاء */}
      <Modal
        open={open}
        title={`إنشاء ${runSingular}`}
        onClose={() => setOpen(false)}
      >
        <div className="modal-form-scroll-container">
          <h4 className="form-section-title">
            <Layers size={18} color="#64748b" /> إعدادات ال{runSingular}
          </h4>
          <div className="responsive-form-grid">
            <div className="form-col-full">
              <div className="muted">اسم ال{runSingular} (اختياري)</div>
              <input
                className="input"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={`مثال: ${runSingular} الأحد - شباط 2026`}
              />
            </div>

            <div className={isWorkshop ? "form-col-full" : "form-col"}>
              <div className="muted">
                {isWorkshop
                  ? "موعد الجلسة (تاريخ/وقت)"
                  : "بداية أول جلسة (تاريخ/وقت)"}
              </div>
              <input
                className="input"
                type="datetime-local"
                value={firstStart}
                onChange={(e) => setFirstStart(e.target.value)}
              />
            </div>

            {!isWorkshop && (
              <div className="form-col">
                <div className="muted">إنشاء الجلسات تلقائيًا؟</div>
                <ModernSelect
                  value={createSessions ? "1" : "0"}
                  onChange={(v) => setCreateSessions(v === "1")}
                  options={[
                    { value: "1", label: "نعم" },
                    { value: "0", label: "لا" },
                  ]}
                />
              </div>
            )}

            {((!isWorkshop && createSessions) || isWorkshop) && (
              <>
                <div className="form-col">
                  <div className="muted">مدة الجلسة (دقائق)</div>
                  <input
                    className="input"
                    type="number"
                    min="15"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                  />
                </div>

                {!isWorkshop && (
                  <>
                    <div className="form-col">
                      <div className="muted">عدد الجلسات</div>
                      <input
                        className="input"
                        type="number"
                        min="1"
                        value={count}
                        onChange={(e) => setCount(e.target.value)}
                      />
                    </div>

                    <div className="form-col">
                      <div className="muted">التكرار كل (أيام)</div>
                      <input
                        className="input"
                        type="number"
                        min="1"
                        value={intervalDays}
                        onChange={(e) => setIntervalDays(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div className="modal-fixed-footer">
          <button
            className="btn"
            type="button"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            إلغاء
          </button>
          <button
            className="btn btn-add"
            disabled={saving}
            type="button"
            onClick={createRun}
          >
            {saving ? "جارٍ الإنشاء..." : `إنشاء ${runSingular}`}
          </button>
        </div>
      </Modal>

      {/* نافذة التعديل */}
      <Modal
        open={editOpen}
        title={`تعديل ال${runSingular}`}
        onClose={() => setEditOpen(false)}
      >
        <div className="modal-form-scroll-container">
          <h4 className="form-section-title">
            <Pencil size={18} color="#64748b" /> بيانات ال{runSingular}
          </h4>
          <div className="responsive-form-grid">
            <div className="form-col-full">
              <div className="muted">اسم ال${runSingular}</div>
              <input
                className="input"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                placeholder={`مثال: ${runSingular} الأحد - شباط 2026`}
              />
            </div>

            <div className="form-col">
              <div className="muted">جلسات افتراضية للإضافة</div>
              <input
                className="input"
                type="number"
                min="0"
                step="1"
                value={editDefaultSessionsTotal}
                onChange={(e) => setEditDefaultSessionsTotal(e.target.value)}
              />
            </div>

            <div className="form-col">
              <div className="muted">الحالة</div>
              <ModernSelect
                value={editStatus}
                onChange={setEditStatus}
                options={[
                  { value: "active", label: "فعّال" },
                  { value: "done", label: "مكتمل" },
                  { value: "canceled", label: "ملغى" },
                ]}
              />
            </div>

            <div className="form-col-full">
              <div
                style={{
                  border: "1px solid rgba(0,0,0,.08)",
                  borderRadius: 16,
                  padding: 12,
                  background: "rgba(0,0,0,.02)",
                }}
              >
                <div className="muted" style={{ marginBottom: 10 }}>
                  إجراءات إضافية
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    className="btn"
                    type="button"
                    disabled={!editRunId || editStatus !== "active"}
                    onClick={() => autoEnrollPackages(editRunId)}
                  >
                    <RefreshCw size={16} /> مزامنة المشتركين
                  </button>

                  <button
                    className="btn danger"
                    type="button"
                    disabled={!editRunId || editStatus !== "active"}
                    onClick={() => {
                      setEditOpen(false);
                      setConfirm({
                        open: true,
                        type: "canceled",
                        runId: editRunId,
                        text: `إلغاء ال${runSingular}: ${editLabel || `هذ${isWorkshop ? "ه" : "ا"} ال${runSingular}`}`,
                      });
                    }}
                  >
                    <Ban size={16} /> إلغاء ال{runSingular}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-fixed-footer">
          <button
            className="btn"
            type="button"
            onClick={() => setEditOpen(false)}
            disabled={saving}
          >
            إلغاء
          </button>
          <button
            className="btn btn-add"
            type="button"
            onClick={updateRun}
            disabled={saving || !editRunId}
          >
            حفظ البيانات
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        title="تأكيد"
        message={confirm.text}
        confirmText="نعم"
        cancelText="إلغاء"
        danger={confirm.type === "canceled" || confirm.type === "delete"}
        onCancel={() =>
          setConfirm({ open: false, type: null, runId: null, text: "" })
        }
        onConfirm={async () => {
          const { type, runId } = confirm;
          setConfirm({ open: false, type: null, runId: null, text: "" });

          if (type === "reactivate") await setRunStatus(runId, "active");
          else if (type === "done") await setRunStatus(runId, "done");
          else if (type === "canceled") await setRunStatus(runId, "canceled");
          else if (type === "delete") await deleteRun(runId);
        }}
      />
    </div>
  );
}
