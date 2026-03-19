import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router";
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
} from "lucide-react";

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
      setCount(isWorkshop ? 1 : 8);
      setIntervalDays(isWorkshop ? 1 : 7);
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

      toast("تم تحديث الفوج.", "ok");
      setEditOpen(false);
      await load();
    } catch (e) {
      setError(e);
      toast("فشل تحديث الفوج.", "danger");
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
          ? `فوج ${new Date(firstStart).toLocaleDateString("en-US")}`
          : "فوج جديد";

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
        const iso = new Date(firstStart).toISOString();
        const rpc = await supabase.rpc("generate_weekly_sessions_for_run", {
          p_run_id: Number(runId),
          p_first_start: iso,
          p_duration_minutes: Number(durationMinutes),
          p_count: Number(count),
          p_interval_days: Number(intervalDays),
        });
        if (rpc.error) throw rpc.error;
        sessionsGenerated = true;
      }

      if (sessionsGenerated) {
        await autoEnrollPackages(runId);
      }

      toast("تم إنشاء الفوج.", "ok");

      setOpen(false);
      resetCreateForm();
      await load();
      navigate(`/runs/${runId}`);
    } catch (e) {
      setError(e);
      toast("فشل إنشاء الفوج.", "danger");
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
      toast("فشل تحديث حالة الفوج.", "danger");
      return;
    }

    toast("تم تحديث حالة الفوج.", "ok");
    await load();
  }

  async function deleteRun(runId) {
    setError(null);
    const d = await supabase.from("course_runs").delete().eq("id", runId);

    if (d.error) {
      setError(d.error);
      toast("فشل حذف الفوج.", "danger");
      return;
    }

    toast("تم حذف الفوج.", "ok");
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
          <>
            <button className="btn" onClick={() => navigate("/courses")}>
              رجوع
            </button>
            <button className="btn primary" onClick={openCreateRunModal}>
              <Plus size={18} /> فوج جديد
            </button>
          </>
        }
      />

      <ErrorBanner error={error} />

      <div className="grid" style={{ marginTop: 10 }}>
        <div style={{ gridColumn: "span 3" }}>
          <KpiCard
            variant={stats.activeCount ? "ok" : "neutral"}
            label="الأفواج الفعّالة"
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
            title="لا يوجد أفواج"
            description="أنشئ أول فوج للدورة."
            icon={Layers}
            actions={
              <button className="btn primary" onClick={openCreateRunModal}>
                <Plus size={18} /> فوج جديد
              </button>
            }
          />
        </div>
      ) : (
        <div className="cardsGrid" style={{ marginTop: 12 }}>
          {sortedRuns.map((r) => {
            const title = r.label || `فوج #${r.run_id}`;
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
                    title="تعديل الفوج"
                    variant="soft"
                    size="sm"
                    onClick={() => openEditRunModal(r)}
                  >
                    تعديل
                  </IconButton>

                  {isActive ? (
                    <IconButton
                      icon={CheckCircle2}
                      title="إنهاء الفوج"
                      variant="soft"
                      size="sm"
                      onClick={() =>
                        setConfirm({
                          open: true,
                          type: "done",
                          runId: r.run_id,
                          text: `إنهاء الفوج: ${title}`,
                        })
                      }
                    >
                      إنهاء
                    </IconButton>
                  ) : (
                    <IconButton
                      icon={RotateCcw}
                      title="إعادة تفعيل الفوج"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setConfirm({
                          open: true,
                          type: "reactivate",
                          runId: r.run_id,
                          text: `إعادة تفعيل الفوج: ${title}`,
                        })
                      }
                    >
                      إعادة تفعيل
                    </IconButton>
                  )}

                  <IconButton
                    icon={Trash2}
                    title="حذف الفوج"
                    variant="danger"
                    size="sm"
                    onClick={() =>
                      setConfirm({
                        open: true,
                        type: "delete",
                        runId: r.run_id,
                        text: `حذف الفوج: ${title}`,
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

      <Modal open={open} title="إنشاء فوج" onClose={() => setOpen(false)}>
        <div className="muted">فوج جديد للدورة.</div>

        <hr className="sep" />

        <div className="grid">
          <div style={{ gridColumn: "span 12" }}>
            <div className="muted">اسم الفوج (اختياري)</div>
            <input
              className="input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="مثال: فوج الأحد - شباط 2026"
            />
          </div>

          <div style={{ gridColumn: isWorkshop ? "span 12" : "span 6" }}>
            <div className="muted">بداية أول جلسة (تاريخ/وقت)</div>
            <input
              className="input"
              type="datetime-local"
              value={firstStart}
              onChange={(e) => setFirstStart(e.target.value)}
            />
          </div>

          {!isWorkshop ? (
            <div style={{ gridColumn: "span 6" }}>
              <div className="muted">إنشاء الجلسات تلقائيًا؟</div>
              <ModernSelect
                value={createSessions ? "1" : "0"}
                onChange={(v) => setCreateSessions(v === "1")}
                menuWidth="trigger"
                options={[
                  { value: "1", label: "نعم" },
                  { value: "0", label: "لا" },
                ]}
              />
            </div>
          ) : null}

          {((!isWorkshop && createSessions) || isWorkshop) && (
            <>
              <div style={{ gridColumn: "span 4" }}>
                <div className="muted">مدة الجلسة (دقائق)</div>
                <input
                  className="input"
                  type="number"
                  min="15"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                />
              </div>

              {!isWorkshop ? (
                <>
                  <div style={{ gridColumn: "span 4" }}>
                    <div className="muted">عدد الجلسات</div>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      value={count}
                      onChange={(e) => setCount(e.target.value)}
                    />
                  </div>

                  <div style={{ gridColumn: "span 4" }}>
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
              ) : null}
            </>
          )}

          <div className="row" style={{ gridColumn: "span 12", marginTop: 6 }}>
            <button
              className="btn primary"
              disabled={saving}
              type="button"
              onClick={createRun}
            >
              {saving ? "جارٍ الإنشاء..." : "إنشاء فوج"}
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => setOpen(false)}
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={editOpen}
        title="تعديل الفوج"
        onClose={() => setEditOpen(false)}
      >
        <div className="muted">تعديل بيانات الفوج وإجراءاته الأساسية.</div>

        <hr className="sep" />

        <div className="grid">
          <div style={{ gridColumn: "span 12" }}>
            <div className="muted">اسم الفوج</div>
            <input
              className="input"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              placeholder="مثال: فوج الأحد - شباط 2026"
            />
          </div>

          <div style={{ gridColumn: "span 6" }}>
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

          <div style={{ gridColumn: "span 6" }}>
            <div className="muted">الحالة</div>
            <ModernSelect
              value={editStatus}
              onChange={setEditStatus}
              menuWidth="trigger"
              options={[
                { value: "active", label: "فعّال" },
                { value: "done", label: "مكتمل" },
                { value: "canceled", label: "ملغى" },
              ]}
            />
          </div>

          <div style={{ gridColumn: "span 12" }}>
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

              <div className="row" style={{ flexWrap: "wrap" }}>
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
                      text: `إلغاء الفوج: ${editLabel || "هذا الفوج"}`,
                    });
                  }}
                >
                  <Ban size={16} /> إلغاء الفوج
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          className="row"
          style={{ justifyContent: "flex-end", gap: 10, marginTop: 14 }}
        >
          <button
            className="btn"
            type="button"
            onClick={() => setEditOpen(false)}
            disabled={saving}
          >
            إلغاء
          </button>
          <button
            className="btn primary"
            type="button"
            onClick={updateRun}
            disabled={saving || !editRunId}
          >
            حفظ
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
