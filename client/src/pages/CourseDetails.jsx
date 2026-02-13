import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router";
import { supabase } from "../supabaseClient";
import ErrorBanner from "../components/ErrorBanner";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import Badge from "../components/Badge";
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
  Ban,
  Trash2,
  Plus,
  RefreshCw,
  RotateCcw,
  Pencil,
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

  // Create Run modal
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [firstStart, setFirstStart] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [count, setCount] = useState(8);
  const [intervalDays, setIntervalDays] = useState(7);
  const [createsessions, setCreatesessions] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit Run modal
  const [editOpen, setEditOpen] = useState(false);
  const [editRunId, setEditRunId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editDefaultSessionsTotal, setEditDefaultSessionsTotal] = useState("0");

  const [confirm, setConfirm] = useState({
    open: false,
    type: null,
    runId: null,
    text: "",
  });

  const isWorkshop = useMemo(() => {
    return (course?.kind || "").toLowerCase() === "workshop";
  }, [course]);

  function openCreateRunModal() {
    // For workshops, create exactly 1 session (no weekly repeat).
    if ((course?.kind || "").toLowerCase() === "workshop") {
      setCreatesessions(true);
      setCount(1);
      setIntervalDays(1);
    } else {
      setCreatesessions(true);
      setCount(isWorkshop ? 1 : 8);
      setIntervalDays(isWorkshop ? 1 : 7);
    }
    setOpen(true);
  }

  function openEditRunModal(r) {
    setEditRunId(r.run_id);
    setEditLabel(r.label ?? "");
    setEditDefaultSessionsTotal(String(r.default_sessions_total ?? 0));
    setEditOpen(true);
  }

  async function updateRun() {
    if (!editRunId) return;

    setSaving(true);
    setError(null);

    try {
      const nextDefault = Math.max(0, parseInt(editDefaultSessionsTotal, 10) || 0);

      const u = await supabase
        .from("course_runs")
        .update({
          label: (editLabel ?? "").trim(),
          default_sessions_total: nextDefault,
        })
        .eq("id", editRunId);

      if (u.error) throw u.error;

      toast("Run updated successfully.", "ok");
      setEditOpen(false);
      await load();
    } catch (e) {
      setError(e);
      toast("Failed to update run.", "danger");
    } finally {
      setSaving(false);
    }
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

    // 1) Fetch runs
    const rr = await fetchRuns();
    if (rr.error) {
      setError(rr.error);
      setLoading(false);
      return;
    }

    // 2) Auto-finish runs: if a run is active, has sessions, and there is no upcoming session,
    //    mark it as done (meaning the last scheduled session already passed/ended).
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
        // Don't block the page if auto-update fails; just show error and continue with current data.
        setError(u.error);
        setRuns(rr.data ?? []);
        setLoading(false);
        return;
      }

      // re-fetch after auto-update
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

  const activeRuns = useMemo(
    () => runs.filter((r) => r.status === "active"),
    [runs],
  );

  const stats = useMemo(() => {
    const totalRuns = runs.length;
    const activeCount = activeRuns.length;
    let totalParticipants = 0;
    let totalsessions = 0;
    let next = null;

    for (const r of runs) {
      totalParticipants += Number(r.participants_count ?? 0);
      totalsessions += Number(r.sessions_count ?? 0);
      if (r.status === "active" && r.next_session_at) {
        const dt = new Date(r.next_session_at);
        if (!Number.isNaN(dt.getTime()) && (!next || dt < next)) next = dt;
      }
    }

    return {
      totalRuns,
      activeCount,
      totalParticipants,
      totalsessions,
      nextSessionAt: next ? next.toISOString() : null,
    };
  }, [runs, activeRuns]);

  const sortedRuns = useMemo(() => {
    const list = [...runs];
    list.sort((a, b) => {
      // 1) Active first
      const as = a.status === "active" ? 0 : 1;
      const bs = b.status === "active" ? 0 : 1;
      if (as !== bs) return as - bs;

      // 2) For active: sort by next session ASC
      if (a.status === "active" && b.status === "active") {
        const ad = a.next_session_at ? new Date(a.next_session_at) : null;
        const bd = b.next_session_at ? new Date(b.next_session_at) : null;
        if (ad && bd) return ad - bd;
        if (ad && !bd) return -1;
        if (!ad && bd) return 1;
      }

      // 3) fallback: newest first
      return Number(b.run_id) - Number(a.run_id);
    });
    return list;
  }, [runs]);

  function runBadge(status) {
    if (status === "active") return <Badge variant="ok">Active</Badge>;
    if (status === "done") return <Badge variant="info">Completed</Badge>;
    return <Badge variant="danger">Canceled</Badge>;
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

      toast(
        `Synced: inserted/updated ${insertedCount ?? 0} auto-enrollments based on package session balance.`,
        "ok",
      );

      await load();
    } catch (e) {
      setError(e);
      toast("Auto-sync failed.", "danger");
    }
  }

  async function createRun() {
    setSaving(true);
    setError(null);

    try {
      const finalLabel = label.trim()
        ? label.trim()
        : firstStart
          ? `Run ${new Date(firstStart).toLocaleDateString("en-US")}`
          : "New run";

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
      if (createsessions && firstStart) {
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
      } else {
        toast(
          "Run created. After adding/generating sessions, use to auto-enroll children who have remaining package sessions.",
          "info",
        );
      }

      toast("Run created successfully.", "ok");

      setOpen(false);
      setLabel("");
      setFirstStart("");
      setDurationMinutes(60);
      setCount(isWorkshop ? 1 : 8);
      setIntervalDays(isWorkshop ? 1 : 7);
      setCreatesessions(true);

      await load();
      navigate(`/runs/${runId}`);
    } catch (e) {
      setError(e);
      toast("Failed to create run.", "danger");
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
      toast("Failed to update run status.", "danger");
      return;
    }

    toast("Run status updated.", "ok");
    await load();
  }

  async function deleteRun(runId) {
    setError(null);
    const d = await supabase.from("course_runs").delete().eq("id", runId);

    if (d.error) {
      setError(d.error);
      toast("Failed to delete run.", "danger");
      return;
    }

    toast("Run deleted.", "ok");
    await load();
  }

  if (loading) {
    return (
      <div className="container page page--courses">
        <div className="card">Loading...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container">
        <div className="card">Course not found.</div>
      </div>
    );
  }

  return (
    <div className="container page page--courses">
      <PageHeader
        title={course.title}
        subtitle={`Capacity: ${course.capacity} — Default price: ${Number(course.default_price).toFixed(2)}`}
        actions={
          <>
            <button className="btn" onClick={() => navigate("/courses")}>
              Back
            </button>
            <button className="btn primary" onClick={openCreateRunModal}>
              <Plus size={18} /> New run
            </button>
          </>
        }
      />

      <ErrorBanner error={error} />

      {/* KPI row */}
      <div className="grid" style={{ marginTop: 10 }}>
        <div style={{ gridColumn: "span 3" }}>
          <KpiCard
            variant={stats.activeCount ? "ok" : "neutral"}
            label="Active runs"
            value={stats.activeCount}
            hint={
              stats.totalRuns ? `of ${stats.totalRuns} total` : "No runs yet"
            }
            icon={Layers}
          />
        </div>

        <div style={{ gridColumn: "span 3" }}>
          <KpiCard
            variant={stats.totalParticipants ? "info" : "neutral"}
            label="Participants"
            value={stats.totalParticipants}
            hint="Across all runs"
            icon={Users}
          />
        </div>

        <div style={{ gridColumn: "span 3" }}>
          <KpiCard
            variant={stats.nextSessionAt ? "warn" : "neutral"}
            label="Next session"
            value={stats.nextSessionAt ? fmtDT(stats.nextSessionAt) : "-"}
            hint={
              stats.nextSessionAt
                ? "Earliest upcoming session"
                : "No upcoming sessions"
            }
            icon={CalendarClock}
          />
        </div>

        <div style={{ gridColumn: "span 3" }}>
          <KpiCard
            variant={stats.totalsessions ? "neutral" : "neutral"}
            label="Total sessions"
            value={stats.totalsessions}
            hint="Across all runs"
            icon={CalendarClock}
          />
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div
          className="row"
          style={{ justifyContent: "space-between", alignItems: "center" }}
        >
          <div>
            <div className="cardTitle">Runs</div>
          </div>
          <button className="btn primary" onClick={openCreateRunModal}>
            <Plus size={18} /> New run
          </button>
        </div>
      </div>

      {sortedRuns.length === 0 ? (
        <div className="card" style={{ marginTop: 12 }}>
          <EmptyState
            title="No runs yet"
            description="Create the first run for this course."
            icon={Layers}
            actions={
              <button className="btn primary" onClick={openCreateRunModal}>
                <Plus size={18} /> New run
              </button>
            }
          />
        </div>
      ) : (
        <div className="cardsGrid" style={{ marginTop: 12 }}>
          {sortedRuns.map((r) => {
            const title = r.label || `Run #${r.run_id}`;
            const isActive = r.status === "active";
            return (
              <div
                key={r.run_id}
                className="card runCard"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/runs/${r.run_id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    navigate(`/runs/${r.run_id}`);
                }}
              >
                <div className="runCard__top">
                  <div>
                    <div className="metaRow">
                      {runBadge(r.status)}
                      <span className="pill" style={{ padding: "6px 10px" }}>
                        <Layers size={16} />
                        <b>{title}</b>
                      </span>
                    </div>
                    <div className="muted" style={{ marginTop: 6 }}>
                      Next session:{" "}
                      <span className="ltrIso">{fmtDT(r.next_session_at)}</span>
                    </div>
                    <div className="muted" style={{ marginTop: 4 }}>
                      Capacity:{" "}
                      <span className="ltrIso">{course.capacity}</span> •
                      Default price:{" "}
                      <span className="ltrIso">
                        {Number(course.default_price).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="statsRow">
                  <div className="stat">
                    <span className="muted">sessions</span>
                    <b>{r.sessions_count ?? 0}</b>
                  </div>
                  <div className="stat">
                    <span className="muted">Participants</span>
                    <b>{r.participants_count ?? 0}</b>
                  </div>
                  <div className="stat">
                    <span className="muted">Next session</span>
                    <b className="ltrIso" style={{ fontSize: 14 }}>
                      {fmtDT(r.next_session_at)}
                    </b>
                  </div>
                  <div className="stat">
                    <span className="muted">Status</span>
                    <b>
                      {r.status === "active"
                        ? "Active"
                        : r.status === "done"
                          ? "Completed"
                          : "Canceled"}
                    </b>
                  </div>
                </div>

                <div
                  className="runCard__actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconButton
                    icon={Pencil}
                    title="Edit run"
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditRunModal(r)}
                  />

                  <IconButton
                     icon={RefreshCw}
                    title="Sync enrollments from packages"
                    variant="soft"
                    size="sm"
                    disabled={!isActive}
                    onClick={() => autoEnrollPackages(r.run_id)}
                  />
                  <IconButton
                    icon={CheckCircle2}
                    title="Mark completed"
                    variant="soft"
                    size="sm"
                    disabled={!isActive}
                    onClick={() =>
                      setConfirm({
                        open: true,
                        type: "done",
                        runId: r.run_id,
                        text: `Mark completed: ${title}`,
                      })
                    }
                  />
                  <IconButton
                    icon={Ban}
                    title="Cancel run"
                    variant="danger"
                    size="sm"
                    disabled={!isActive}
                    onClick={() =>
                      setConfirm({
                        open: true,
                        type: "canceled",
                        runId: r.run_id,
                        text: `Cancel run: ${title}`,
                      })
                    }
                  />
                  {r.status !== "active" ? (
                    <IconButton
                      icon={RotateCcw}
                      title="Reactivate run"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setConfirm({
                          open: true,
                          type: "reactivate",
                          runId: r.run_id,
                          text: `Reactivate run: ${title}`,
                        })
                      }
                    />
                  ) : null}
                  <IconButton
                    icon={Trash2}
                    title="Delete run"
                    variant="danger"
                    size="sm"
                    onClick={() =>
                      setConfirm({
                        open: true,
                        type: "delete",
                        runId: r.run_id,
                        text: `Delete run: ${title}`,
                      })
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} title="Create run" onClose={() => setOpen(false)}>
        <div className="muted">
          This course template stays the same; each run is a new batch with its
          own dates.
        </div>

        <hr className="sep" />

        <div className="grid">
          <div style={{ gridColumn: "span 12" }}>
            <div className="muted">Run label (optional)</div>
            <input
              className="input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Sunday Club - Feb 2026"
            />
          </div>

          <div style={{ gridColumn: "span 6" }}>
            <div className="muted">First session start (date/time)</div>
            <input
              className="input"
              type="datetime-local"
              value={firstStart}
              onChange={(e) => setFirstStart(e.target.value)}
            />
          </div>

          {!isWorkshop && (
            <div style={{ gridColumn: "span 6" }}>
              <div className="muted">Generate sessions automatically?</div>
              <ModernSelect
                value={createsessions ? "1" : "0"}
                onChange={(v) => setCreatesessions(v === "1")}
                menuWidth="trigger"
                options={[
                  { value: "1", label: "Yes" },
                  { value: "0", label: "No" },
                ]}
              />
            </div>
          )}

          {isWorkshop && (
            <>
              <div style={{ gridColumn: "span 6" }}>
                <div className="muted">Session duration (minutes)</div>
                <input
                  className="input"
                  type="number"
                  min="15"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                />
              </div>
            </>
          )}

          {!isWorkshop && createsessions && (
            <>
              <div style={{ gridColumn: "span 4" }}>
                <div className="muted">Session duration (minutes)</div>
                <input
                  className="input"
                  type="number"
                  min="15"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                />
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="muted">Number of sessions</div>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                />
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="muted">Repeat every (days)</div>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={intervalDays}
                  onChange={(e) => setIntervalDays(e.target.value)}
                />
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  Weekly: use 7
                </div>
              </div>
            </>
          )}

          <div className="row" style={{ gridColumn: "span 12", marginTop: 6 }}>
            <button
              className="btn primary"
              disabled={saving}
              onClick={createRun}
            >
              {saving ? "Creating..." : "Create run"}
            </button>
            <button className="btn" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={editOpen} title="Edit run" onClose={() => setEditOpen(false)}>
        <div className="muted">
          Update the run label and the default sessions used when enrolling a new
          child.
        </div>

        <hr className="sep" />

        <div className="grid">
          <div style={{ gridColumn: "span 12" }}>
            <div className="muted">Run label</div>
            <input
              className="input"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              placeholder="e.g. Sunday Club - Feb 2026"
            />
          </div>

          <div style={{ gridColumn: "span 6" }}>
            <div className="muted">Default sessions to add</div>
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
            <div className="muted">Note</div>
            <div style={{ fontSize: 12 }} className="muted">
              This only changes the default "Sessions to add" for new enrollments.
              It does not change existing enrollments.
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
            Cancel
          </button>
          <button
            className="btn primary"
            type="button"
            onClick={updateRun}
            disabled={saving || !editRunId}
          >
            Save changes
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        title="Confirm"
        message={confirm.text}
        confirmText="Yes"
        cancelText="Cancel"
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
