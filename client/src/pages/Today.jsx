import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router";
import {
  Banknote,
  CalendarDays,
  ClipboardList,
  CheckCircle2,
  LayoutTemplate,
  Layers,
  RefreshCcw,
  Sparkles,
  XCircle,
} from "lucide-react";

import { supabase } from "../supabaseClient";
import Badge from "../components/Badge";
import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import IconButton from "../components/IconButton";
import KpiCard from "../components/KpiCard";
import PageHeader from "../components/PageHeader";
import { fmtTime24, fmtDayLabelAr } from "../utils/datetime";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function normalizeRatio(v) {
  if (v == null) return 0;
  if (typeof v === "number") {
    const n = Number.isFinite(v) ? v : 0;
    // ( 38) 0.38
    const asRatio = n > 1.5 ? n / 100 : n;
    return clamp(asRatio, 0, 1);
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return 0;
    const hasPct = s.endsWith("%");
    const num = Number.parseFloat(hasPct ? s.slice(0, -1) : s);
    if (!Number.isFinite(num)) return 0;
    const asRatio = hasPct || num > 1.5 ? num / 100 : num;
    return clamp(asRatio, 0, 1);
  }
  return 0;
}

function fmtTime(ts) {
  if (!ts) return "";
  return fmtTime24(ts);
}

function fmtDay(ts) {
  if (!ts) return "";
  return fmtDayLabelAr(ts);
}

function formatTimeRange(startAt, endAt) {
  return `${fmtTime(startAt)} - ${fmtTime(endAt)}`;
}

function paidVariant(paidRatio) {
  const r = typeof paidRatio === "number" ? paidRatio : 0;
  if (r >= 0.85) return "ok";
  if (r >= 0.4) return "warn";
  return "danger";
}

function pctVariant(pct) {
  const p = typeof pct === "number" ? pct : 0;
  if (p >= 85) return "ok";
  if (p >= 40) return "warn";
  return "danger";
}

export default function Today() {
  const navigate = useNavigate();
  const { toast } = useOutletContext();

  // view = "active" (dashboard ) | "day" ( Today)
  const [view, setView] = useState("active");

  const [activeRuns, setActiveRuns] = useState([]);
  const [todayRows, setTodayRows] = useState([]);
  const [loading, setLoading] = useState({ active: true, day: true });
  const [error, setError] = useState(null);

  const [confirm, setConfirm] = useState({
    open: false,
    action: null,
    sessionId: null,
  });

  async function loadActiveRuns() {
    setLoading((s) => ({ ...s, active: true }));
    setError(null);

    // 1) /Courses ( next_session_at view)
    const { data: runs, error: runsErr } = await supabase
      .from("course_runs_summary_view")
      .select("*")
      .eq("status", "active")
      .not("next_session_at", "is", null);

    if (runsErr) {
      setError(runsErr);
      setLoading((s) => ({ ...s, active: false }));
      return;
    }

    // 2) ( ) → + + id
    const nowIso = new Date().toISOString();
    const { data: upcoming, error: upErr } = await supabase
      .from("course_sessions")
      .select("id, run_id, start_at, end_at")
      .eq("status", "scheduled")
      .gte("start_at", nowIso)
      .order("start_at", { ascending: true });

    if (upErr) {
      setError(upErr);
      setLoading((s) => ({ ...s, active: false }));
      return;
    }

    const byRun = new Map();
    for (const s of upcoming ?? []) {
      const key = String(s.run_id);
      const prev = byRun.get(key);
      if (!prev) {
        byRun.set(key, {
          upcomingCount: 1,
          nextSession: s,
        });
      } else {
        prev.upcomingCount += 1;
      }
    }

    const merged = (runs ?? [])
      .map((r) => {
        const meta = byRun.get(String(r.run_id));
        return {
          ...r,
          upcoming_count: meta?.upcomingCount ?? 0,
          next_session: meta?.nextSession ?? null,
        };
      })
      .filter((r) => (r.upcoming_count ?? 0) > 0)
      .sort(
        (a, b) =>
          new Date(a.next_session?.start_at ?? a.next_session_at) -
          new Date(b.next_session?.start_at ?? b.next_session_at),
      );

    setActiveRuns(merged);
    setLoading((s) => ({ ...s, active: false }));
  }

  async function loadTodayAgenda() {
    setLoading((s) => ({ ...s, day: true }));
    setError(null);

    const { data, error: err } = await supabase
      .from("today_sessions_view")
      .select("*");

    if (err) {
      setError(err);
      setTodayRows([]);
      setLoading((s) => ({ ...s, day: false }));
      return;
    }

    const baseRows = (data ?? [])
      .slice()
      .sort((a, b) => new Date(a.start_at) - new Date(b.start_at));

    // IMPORTANT: today_sessions_view .
    // RunDetails (agreed_price / paid_amount) run_participants_view.
    // RunDetails 1:1 .
    const runIds = Array.from(
      new Set(baseRows.map((r) => r.run_id).filter(Boolean)),
    );

    // Map run_id -> run label (so we can show Run name instead of Course title)
    const runLabelByRun = new Map(); // run_id(string) -> label(string)
    if (runIds.length) {
      const { data: meta, error: metaErr } = await supabase
        .from("course_runs_summary_view")
        .select("run_id,label")
        .in("run_id", runIds);

      if (!metaErr) {
        for (const m of meta ?? []) {
          const rid = String(m.run_id ?? "");
          if (!rid) continue;
          runLabelByRun.set(rid, m.label ?? "");
        }
      }
    }

    const paidByRun = new Map(); // run_id(string) -> ratio(0..1) // run_id(string) -> ratio(0..1)
    if (runIds.length) {
      const { data: parts, error: partErr } = await supabase
        .from("run_participants_view")
        .select("run_id,enrollment_status,agreed_price,paid_amount")
        .in("run_id", runIds);

      if (!partErr) {
        const agg = new Map(); // run_id -> {agreed, paid}
        for (const p of parts ?? []) {
          const rid = String(p.run_id ?? "");
          if (!rid) continue;
          if ((p.enrollment_status ?? "") !== "active") continue;

          const agreed = Number(p.agreed_price ?? 0);
          const paid = Number(p.paid_amount ?? 0);
          const cur = agg.get(rid) ?? { agreed: 0, paid: 0 };
          cur.agreed += agreed;
          cur.paid += paid;
          agg.set(rid, cur);
        }

        for (const [rid, a] of agg.entries()) {
          const ratio = a.agreed <= 0 ? 0 : clamp(a.paid / a.agreed, 0, 1);
          paidByRun.set(rid, ratio);
        }
      }
    }

    const normalized = baseRows.map((r) => {
      const rid = String(r.run_id ?? "");
      const runLabel = runLabelByRun.get(rid) || null;

      const viewPaid = normalizeRatio(r.paid_ratio);
      const fallbackPaid = normalizeRatio(paidByRun.get(rid) ?? 0);

      // If the DB view returns 0 due to missing denominator (legacy agreed_price),
      // but we can compute a real ratio from run_participants_view, prefer the fallback.
      const paid_ratio =
        viewPaid === 0 && fallbackPaid > 0 ? fallbackPaid : viewPaid;

      return {
        ...r,
        title: runLabel || r.title,
        run_label: runLabel,
        paid_ratio,
      };
    });

    setTodayRows(normalized);
    setLoading((s) => ({ ...s, day: false }));
  }

  async function loadAll() {
    await Promise.all([loadActiveRuns(), loadTodayAgenda()]);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeStats = useMemo(() => {
    const runsCount = activeRuns.length;
    const upcomingSum = activeRuns.reduce(
      (acc, r) => acc + Number(r.upcoming_count ?? 0),
      0,
    );
    const participantsSum = activeRuns.reduce(
      (acc, r) => acc + Number(r.participants_count ?? 0),
      0,
    );

    const next = activeRuns[0]?.next_session ?? null;
    const nextLabel = next
      ? `${fmtDay(next.start_at)} • ${formatTimeRange(next.start_at, next.end_at)}`
      : "No upcoming sessions";

    return { runsCount, upcomingSum, participantsSum, next, nextLabel };
  }, [activeRuns]);

  const dayStats = useMemo(() => {
    const count = todayRows.length;

    const scheduled = todayRows.filter((r) => r.status === "scheduled").length;

    const expectedSum = todayRows.reduce(
      (acc, r) => acc + Number(r.expected_count ?? 0),
      0,
    );
    const recordedSum = todayRows.reduce(
      (acc, r) => acc + Number(r.attendance_recorded ?? 0),
      0,
    );
    const presentSum = todayRows.reduce(
      (acc, r) => acc + Number(r.present_count ?? 0),
      0,
    );

    const recordedPct =
      expectedSum === 0 ? 0 : (recordedSum / expectedSum) * 100;
    const presentPct = expectedSum === 0 ? 0 : (presentSum / expectedSum) * 100;

    const avgPaid =
      count === 0
        ? 0
        : todayRows.reduce((acc, r) => acc + Number(r.paid_ratio ?? 0), 0) /
          count;

    const next = todayRows
      .filter((r) => r.status === "scheduled")
      .slice()
      .sort((a, b) => new Date(a.start_at) - new Date(b.start_at))[0];

    return {
      count,
      scheduled,
      expectedSum,
      recordedSum,
      presentSum,
      recordedPct,
      presentPct,
      avgPaid,
      next,
    };
  }, [todayRows]);

  async function changeSessionStatus(sessionId, status) {
    const { error: err } = await supabase
      .from("course_sessions")
      .update({ status })
      .eq("id", sessionId);

    if (err) {
      setError(err);
      toast("Failed to update session status.", "danger");
      return;
    }
    toast("Session status updated.", "ok");
    await loadTodayAgenda();
    await loadActiveRuns();
  }

  const paidPctKpi = dayStats.avgPaid * 100 || 0;

  return (
    <div className="container page page--today">
      <PageHeader
        title="Dashboard"
        subtitle={view === "active" ? "" : ""}
        actions={
          <div className="toolbar" style={{ gap: 10 }}>
            <div className="segmented">
              <button
                className={`segmentedBtn ${view === "active" ? "isActive" : ""}`}
                onClick={() => setView("active")}
                type="button"
              >
                Active Courses
              </button>
              <button
                className={`segmentedBtn ${view === "day" ? "isActive" : ""}`}
                onClick={() => setView("day")}
                type="button"
              >
                Today&apos;s Agenda
              </button>
            </div>

            <IconButton
              title="Refresh"
              variant="soft"
              onClick={loadAll}
              ariaLabel="Refresh"
            >
              <RefreshCcw size={18} />
            </IconButton>

            <button className="btn soft" onClick={() => navigate("/courses")}>
              Courses
            </button>
            <button className="btn soft" onClick={() => navigate("/payments")}>
              Payments
            </button>
            <button className="btn soft" onClick={() => navigate("/expenses")}>
              Expenses
            </button>
          </div>
        }
      />

      <ErrorBanner error={error} />

      {/* ===================== Active Runs Dashboard ===================== */}
      {view === "active" && (
        <>
          <div className="grid" style={{ marginBottom: 14 }}>
            <div style={{ gridColumn: "span 4" }}>
              <KpiCard
                icon={Sparkles}
                label="Active Courses"
                value={activeStats.runsCount}
                hint={
                  activeStats.next
                    ? `Next session: ${activeStats.nextLabel}`
                    : "No upcoming sessions"
                }
                variant={activeStats.runsCount === 0 ? "neutral" : "info"}
              />
            </div>

            <div style={{ gridColumn: "span 4" }}>
              <KpiCard
                icon={CalendarDays}
                label="Upcoming Sessions"
                value={activeStats.upcomingSum}
                hint=""
                variant={activeStats.upcomingSum === 0 ? "neutral" : "info"}
              />
            </div>

            <div style={{ gridColumn: "span 4" }}>
              <KpiCard
                icon={ClipboardList}
                label="Active Participants"
                value={activeStats.participantsSum}
                hint=""
                variant={activeStats.participantsSum === 0 ? "neutral" : "ok"}
              />
            </div>
          </div>

          {loading.active ? (
            <div className="card">Loading...</div>
          ) : activeRuns.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No active courses"
              description=""
              actionLabel="Go to Courses"
              onAction={() => navigate("/courses")}
            />
          ) : (
            <div className="grid">
              {activeRuns.map((r) => {
                const next = r.next_session;
                const when = next
                  ? `${fmtDay(next.start_at)} • ${formatTimeRange(next.start_at, next.end_at)}`
                  : "—";

                return (
                  <div
                    className="card hoverLift"
                    style={{ gridColumn: "span 6" }}
                    key={r.run_id}
                  >
                    <div
                      className="row space"
                      style={{ alignItems: "flex-start" }}
                    >
                      <div>
                        <div className="titleRow">
                          <div className="titleMain">{r.label || r.title}</div>
                          <Badge
                            variant={r.kind === "workshop" ? "info" : "neutral"}
                          >
                            {r.kind === "workshop" ? "Workshop" : "Course"}
                          </Badge>
                        </div>
                        <div className="muted" style={{ marginTop: 6 }}>
                          Participants:{" "}
                          <b>{r.participants_count ?? 0}</b>
                        </div>
                      </div>

                      <div
                        className="stack"
                        style={{ gap: 8, alignItems: "flex-end" }}
                      >
                        <Badge variant="info">Next session</Badge>
                        <div style={{ fontWeight: 950 }}>{when}</div>
                      </div>
                    </div>

                    <hr className="sep" />

                    <div className="row space" style={{ alignItems: "center" }}>
                      <div className="muted">
                        Remaining sessions: <b>{r.upcoming_count}</b>
                      </div>

                      <div className="actionsRow">
                        {next?.id ? (
                          <IconButton
                            title="Open next session (attendance)"
                            variant="primary"
                            onClick={() =>
                              navigate(`/sessions/${next.id}/attendance`)
                            }
                          >
                            <ClipboardList size={18} />
                          </IconButton>
                        ) : null}

                        <IconButton
                          title="Run details"
                          onClick={() => navigate(`/runs/${r.run_id}`)}
                        >
                          <Layers size={18} />
                        </IconButton>

                        <IconButton
                          title="Course template"
                          onClick={() => navigate(`/courses/${r.template_id}`)}
                        >
                          <LayoutTemplate size={18} />
                        </IconButton>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ===================== Day Agenda ===================== */}
      {view === "day" && (
        <>
          <div className="grid" style={{ marginBottom: 14 }}>
            <div style={{ gridColumn: "span 3" }}>
              <KpiCard
                icon={CalendarDays}
                label="Today's Sessions"
                value={dayStats.count}
                hint={
                  dayStats.next
                    ? `Next session: ${formatTimeRange(dayStats.next.start_at, dayStats.next.end_at)}`
                    : "No sessions scheduled"
                }
                variant={dayStats.count === 0 ? "neutral" : "info"}
              />
            </div>

            <div style={{ gridColumn: "span 3" }}>
              <KpiCard
                icon={Sparkles}
                label="Scheduled"
                value={dayStats.scheduled}
                hint="Sessions scheduled for today"
                variant={dayStats.scheduled === 0 ? "neutral" : "info"}
              />
            </div>

            <div style={{ gridColumn: "span 3" }}>
              <KpiCard
                icon={ClipboardList}
                label="Attendance Recorded"
                value={`${dayStats.recordedSum}/${dayStats.expectedSum}`}
                hint={`${dayStats.recordedPct.toFixed(0)}% of expected`}
                variant={pctVariant(dayStats.recordedPct)}
              />
            </div>

            <div style={{ gridColumn: "span 3" }}>
              <KpiCard
                icon={Banknote}
                label="Average Payment"
                value={`${paidPctKpi.toFixed(0)}%`}
                hint="Payment ratio across today's sessions"
                variant={paidVariant(dayStats.avgPaid)}
              />
            </div>
          </div>

          {loading.day ? (
            <div className="card">Loading...</div>
          ) : todayRows.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No sessions today"
              description="Add sessions inside a Run and they will appear here immediately as a one-day agenda."
              actionLabel="Go to Courses"
              onAction={() => navigate("/courses")}
            />
          ) : (
            <div className="dayList">
              {todayRows.map((r) => {
                const expected = r.expected_count ?? 0;
                const present = r.present_count ?? 0;
                const recorded = r.attendance_recorded ?? 0;

                const recordedPct =
                  expected === 0 ? 0 : (recorded / expected) * 100;
                const paidPct = Number(r.paid_ratio ?? 0) * 100;

                return (
                  <div className="dayRow" key={r.session_id}>
                    <div className="dayTime">
                      <div className="timePill">{fmtTime(r.start_at)}</div>
                      <div className="muted" style={{ marginTop: 6 }}>
                        {fmtTime(r.end_at)}
                      </div>
                    </div>

                    <div className="dayCard card hoverLift">
                      <div
                        className="row space"
                        style={{ alignItems: "flex-start" }}
                      >
                        <div>
                          <div className="titleRow">
                            <div className="titleMain">{r.run_label || r.title}</div>
                            <Badge
                              variant={
                                r.kind === "workshop" ? "info" : "neutral"
                              }
                            >
                              {r.kind === "workshop" ? "Workshop" : "Course"}
                            </Badge>
                          </div>
                          <div className="muted" style={{ marginTop: 6 }}>
                            {formatTimeRange(r.start_at, r.end_at)}
                          </div>
                        </div>

                        <Badge
                          variant={
                            r.status === "scheduled"
                              ? "info"
                              : r.status === "done"
                                ? "ok"
                                : "warn"
                          }
                        >
                          {r.status === "scheduled"
                            ? "Scheduled"
                            : r.status === "done"
                              ? "Completed"
                              : "Canceled"}
                        </Badge>
                      </div>

                      <hr className="sep" />

                      <div
                        className="row space"
                        style={{ gap: 10, flexWrap: "wrap" }}
                      >
                        <div className="pill">
                          <span className="muted">Recorded attendance</span>
                          <b>
                            {recorded}/{expected}
                          </b>
                        </div>
                        <div className="pill">
                          <span className="muted">Present</span>
                          <b>
                            {present}/{expected}
                          </b>
                        </div>
                        <div className="pill">
                          <span className="muted">Payment</span>
                          <Badge variant={paidVariant(r.paid_ratio)}>
                            {paidPct.toFixed(0)}%
                          </Badge>
                        </div>
                        <div className="pill">
                          <span className="muted">Attendance rate</span>
                          <Badge variant={pctVariant(recordedPct)}>
                            {recordedPct.toFixed(0)}%
                          </Badge>
                        </div>
                      </div>

                      <div className="actionsRow" style={{ marginTop: 12 }}>
                        <IconButton
                          title="Open attendance"
                          variant="primary"
                          onClick={() =>
                            navigate(`/sessions/${r.session_id}/attendance`)
                          }
                        >
                          <ClipboardList size={18} />
                        </IconButton>

                        <IconButton
                          title="Run details"
                          onClick={() => navigate(`/runs/${r.run_id}`)}
                        >
                          <Layers size={18} />
                        </IconButton>

                        <IconButton
                          title="Course template"
                          onClick={() => navigate(`/courses/${r.course_id}`)}
                        >
                          <LayoutTemplate size={18} />
                        </IconButton>

                        <IconButton
                          title="Complete"
                          onClick={() =>
                            setConfirm({
                              open: true,
                              action: "done",
                              sessionId: r.session_id,
                            })
                          }
                          disabled={r.status !== "scheduled"}
                        >
                          <CheckCircle2 size={18} />
                        </IconButton>

                        <IconButton
                          title="Cancel"
                          variant="danger"
                          onClick={() =>
                            setConfirm({
                              open: true,
                              action: "canceled",
                              sessionId: r.session_id,
                            })
                          }
                          disabled={r.status !== "scheduled"}
                        >
                          <XCircle size={18} />
                        </IconButton>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirm.open}
        title="Confirm"
        message={
          confirm.action === "done"
            ? "Mark this session as completed?"
            : "Cancel this session?"
        }
        confirmText="Yes"
        cancelText="Cancel"
        danger={confirm.action !== "done"}
        onCancel={() =>
          setConfirm({ open: false, action: null, sessionId: null })
        }
        onConfirm={async () => {
          const { sessionId, action } = confirm;
          setConfirm({ open: false, action: null, sessionId: null });
          await changeSessionStatus(sessionId, action);
        }}
      />
    </div>
  );
}
