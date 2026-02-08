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
  RefreshCw,
  CheckCircle2,
  Ban,
  RotateCcw,
  Trash2,
  Plus,
} from "lucide-react";

function runBadge(status) {
  if (status === "active") return <Badge variant="ok">Active</Badge>;
  if (status === "done") return <Badge variant="info">Completed</Badge>;
  return <Badge variant="danger">Canceled</Badge>;
}

export default function CourseDetails() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useOutletContext();

  const [course, setCourse] = useState(null);
  const [runs, setRuns] = useState([]);
  const [activeRuns, setActiveRuns] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Create run modal
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [firstStart, setFirstStart] = useState("");
  const [createSessions, setCreateSessions] = useState(true);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [count, setCount] = useState(8);
  const [intervalDays, setIntervalDays] = useState(7);

  const [confirm, setConfirm] = useState({
    open: false,
    type: null,
    runId: null,
    text: "",
  });

  const fmtDT = (v) => (v ? fmtDateTime24(v) : "-");

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
    // mark it as done (meaning the last scheduled session already passed/ended).
    const autoDoneIds = (rr.data ?? [])
      .filter(
        (x) =>
          x.status === "active" &&
          Number(x.sessions_count ?? 0) > 0 &&
          !x.next_session_at,
      )
      .map((x) => x.run_id);

    if (autoDoneIds.length) {
      await supabase
        .from("course_runs")
        .update({ status: "done" })
        .in("id", autoDoneIds);

      const rr2 = await fetchRuns();
      if (rr2.error) {
        setError(rr2.error);
        setLoading(false);
        return;
      }
      setRuns(rr2.data ?? []);
      setActiveRuns((rr2.data ?? []).filter((x) => x.status === "active"));
      setLoading(false);
      return;
    }

    setRuns(rr.data ?? []);
    setActiveRuns((rr.data ?? []).filter((x) => x.status === "active"));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

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
      // 1) Active first
      const as = a.status === "active" ? 0 : 1;
      const bs = b.status === "active" ? 0 : 1;
      if (as !== bs) return as - bs;

      // 2) For active: sort by next session ASC
      if (a.status === "active" && b.status === "active") {
        const ad = a.next_session_at
          ? new Date(a.next_session_at).getTime()
          : 9e15;
        const bd = b.next_session_at
          ? new Date(b.next_session_at).getTime()
          : 9e15;
        return ad - bd;
      }

      // 3) Else newest first
      const ac = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bc = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bc - ac;
    });
    return list;
  }, [runs]);

  async function setRunStatus(runId, status) {
    const { error: e } = await supabase
      .from("course_runs")
      .update({ status })
      .eq("id", runId);

    if (e) {
      setError(e);
      toast("Failed to update run status.", "danger");
      return;
    }

    toast("Run updated.", "ok");
    await load();
  }

  async function deleteRun(runId) {
    const { error: e } = await supabase
      .from("course_runs")
      .delete()
      .eq("id", runId);

    if (e) {
      setError(e);
      toast("Failed to delete run.", "danger");
      return;
    }

    toast("Run deleted.", "ok");
    await load();
  }

  async function autoEnrollPackages(runId) {
    // existing logic in your file (kept untouched)
    try {
      const res = await supabase.rpc("auto_enroll_packages_to_run", {
        p_run_id: runId,
      });
      if (res.error) throw res.error;
      toast("Auto-enroll completed.", "ok");
      await load();
    } catch (e) {
      setError(e);
      toast("Auto-enroll failed.", "danger");
    }
  }

  async function createRun() {
    setSaving(true);
    setError(null);

    try {
      const finalLabel = label.trim()
        ? label.trim()
        : firstStart
          ? ` ${new Date(firstStart).toLocaleDateString("en-US")}`
          : " ";

      const ins = await supabase.from("course_runs").insert([
        {
          template_id: Number(courseId),
          label: finalLabel,
          status: "active",
        },
      ]);

      if (ins.error) throw ins.error;

      // Fetch last inserted run
      const r = await supabase
        .from("course_runs_summary_view")
        .select("*")
        .eq("template_id", courseId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (r.error) throw r.error;

      const runId = r.data?.run_id;
      if (!runId) throw new Error("Missing run id.");

      // Optionally generate sessions
      if (createSessions && firstStart) {
        const base = new Date(firstStart);
        const cnt = Number(count || 0);
        const step = Number(intervalDays || 0);
        const dur = Number(durationMinutes || 0);

        const rows = [];
        for (let i = 0; i < cnt; i++) {
          const start = new Date(base.getTime());
          start.setDate(start.getDate() + i * step);
          const end = new Date(start.getTime() + dur * 60 * 1000);

          rows.push({
            run_id: runId,
            start_at: start.toISOString(),
            end_at: end.toISOString(),
          });
        }

        if (rows.length) {
          const s = await supabase.from("sessions").insert(rows);
          if (s.error) throw s.error;
        }
      }

      // Reset form
      setOpen(false);
      setLabel("");
      setFirstStart("");
      setCount(8);
      setIntervalDays(7);
      setCreateSessions(true);

      await load();
      navigate(`/runs/${runId}`);
    } catch (e) {
      setError(e);
      toast("Failed to create the run.", "danger");
    } finally {
      setSaving(false);
    }
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
        subtitle={`Capacity: ${course.capacity} — Default price: ${Number(
          course.default_price,
        ).toFixed(2)}`}
        actions={
          <>
            <button className="btn" onClick={() => navigate("/courses")}>
              Back
            </button>
            <button className="btn primary" onClick={() => setOpen(true)}>
              <Plus size={18} /> New run
            </button>
          </>
        }
      />

      <ErrorBanner error={error} />

      {/* KPI summary */}
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
            value={stats.nextSessionAt ? fmtDT(stats.nextSessionAt) : "—"}
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
            variant={stats.totalSessions ? "neutral" : "neutral"}
            label="Total sessions"
            value={stats.totalSessions}
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
          <button className="btn primary" onClick={() => setOpen(true)}>
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
              <button className="btn primary" onClick={() => setOpen(true)}>
                <Plus size={18} /> New run
              </button>
            }
          />
        </div>
      ) : (
        <div className="cardsGrid" style={{ marginTop: 12 }}>
          {sortedRuns.map((r) => {
            const title = r.label || `#${r.run_id}`;
            const isActive = r.status === "active";

            return (
              <div
                key={r.run_id}
                className="runCard"
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

                  <div className="statsRow">
                    <div className="stat">
                      <span className="muted">Sessions</span>
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
                      icon={RefreshCw}
                      title="Auto-enroll"
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
                          text: `Mark as completed: ${title}`,
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
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} title="Create run" onClose={() => setOpen(false)}>
        <div className="muted">
          Create a new run (batch) for this course. Optionally generate sessions
          starting from a date.
        </div>

        <hr className="sep" />

        <div className="grid">
          <div style={{ gridColumn: "span 12" }}>
            <div className="muted">Run label (optional)</div>
            <input
              className="input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Summer 2026"
            />
          </div>

          <div style={{ gridColumn: "span 6" }}>
            <div className="muted">First session start</div>
            <input
              className="input"
              type="datetime-local"
              value={firstStart}
              onChange={(e) => setFirstStart(e.target.value)}
            />
          </div>

          <div style={{ gridColumn: "span 6" }}>
            <div className="muted">Generate sessions</div>
            <ModernSelect
              value={createSessions ? "1" : "0"}
              onChange={(v) => setCreateSessions(v === "1")}
              menuWidth="trigger"
              options={[
                { value: "1", label: "Yes" },
                { value: "0", label: "No" },
              ]}
            />
          </div>

          {createSessions && (
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
                  Default: 7 days
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

      <ConfirmDialog
        open={confirm.open}
        title={
          confirm.type === "delete"
            ? "Delete run"
            : confirm.type === "canceled"
              ? "Cancel run"
              : confirm.type === "done"
                ? "Mark completed"
                : confirm.type === "reactivate"
                  ? "Reactivate run"
                  : "Confirm"
        }
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
