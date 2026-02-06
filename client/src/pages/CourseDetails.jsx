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
 const [createSessions, setCreateSessions] = useState(true);
 const [saving, setSaving] = useState(false);

 const [confirm, setConfirm] = useState({
 open: false,
 type: null,
 runId: null,
 text: "",
 });

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
 }

 async function createRun() {
 setSaving(true);
 setError(null);

 try {
 const finalLabel = label.trim()
 ? label.trim()
 : firstStart
 ? ` ${new Date(firstStart).toLocaleDateString("ar")}`
 : " ";

 const ins = await supabase
 .from("course_runs")
 .insert([
 {
 template_id: Number(courseId),
 label: finalLabel,
 status: "active",
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

 toast("Run created successfully.", "ok");

 setOpen(false);
 setLabel("");
 setFirstStart("");
 setDurationMinutes(60);
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
 toast("Failed to delete the run.", "danger");
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
 <div className="card"> .</div>
 </div>
 );
 }

 return (
 <div className="container page page--courses" dir="rtl">
 <PageHeader
 title={course.title}
 subtitle={`: ${course.capacity} — : ${Number(course.default_price).toFixed(2)}`}
 actions={
 <>
 <button className="btn" onClick={() => navigate("/courses")}>
 
 </button>
 <button className="btn primary" onClick={() => setOpen(true)}>
 <Plus size={18} /> 
 </button>
 </>
 }
 />

 <ErrorBanner error={error} />

 {/* KPI row – " Today" (Grid 12 columns) */}
 <div className="grid" style={{ marginTop: 10 }}>
 <div style={{ gridColumn: "span 3" }}>
 <KpiCard
 variant={stats.activeCount ? "ok" : "neutral"}
 label=" "
 value={stats.activeCount}
 hint={
 stats.totalRuns ? ` ${stats.totalRuns}` : "No "
 }
 icon={Layers}
 />
 </div>

 <div style={{ gridColumn: "span 3" }}>
 <KpiCard
 variant={stats.totalParticipants ? "info" : "neutral"}
 label=""
 value={stats.totalParticipants}
 hint=" "
 icon={Users}
 />
 </div>

 <div style={{ gridColumn: "span 3" }}>
 <KpiCard
 variant={stats.nextSessionAt ? "warn" : "neutral"}
 label=" "
 value={stats.nextSessionAt ? fmtDT(stats.nextSessionAt) : "-"}
 hint={stats.nextSessionAt ? " " : "No "}
 icon={CalendarClock}
 />
 </div>

 <div style={{ gridColumn: "span 3" }}>
 <KpiCard
 variant={stats.totalSessions ? "neutral" : "neutral"}
 label=" "
 value={stats.totalSessions}
 hint=" "
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
 <div className="cardTitle"></div>
 </div>
 <button className="btn primary" onClick={() => setOpen(true)}>
 <Plus size={18} /> 
 </button>
 </div>
 </div>

 {sortedRuns.length === 0 ? (
 <div className="card" style={{ marginTop: 12 }}>
 <EmptyState
 title="No "
 description=" ( No)."
 icon={Layers}
 actions={
 <button className="btn primary" onClick={() => setOpen(true)}>
 <Plus size={18} /> 
 </button>
 }
 />
 </div>
 ) : (
 <div className="cardsGrid" style={{ marginTop: 12 }}>
 {sortedRuns.map((r) => {
 const title = r.label || ` #${r.run_id}`;
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
 :{" "}
 <span className="ltrIso">{fmtDT(r.next_session_at)}</span>
 </div>
 <div className="muted" style={{ marginTop: 4 }}>
 : <span className="ltrIso">{course.capacity}</span> •
 No:{" "}
 <span className="ltrIso">
 {Number(course.default_price).toFixed(2)}
 </span>
 </div>
 </div>
 </div>

 <div className="statsRow">
 <div className="stat">
 <span className="muted"></span>
 <b>{r.sessions_count ?? 0}</b>
 </div>
 <div className="stat">
 <span className="muted"></span>
 <b>{r.participants_count ?? 0}</b>
 </div>
 <div className="stat">
 <span className="muted"> </span>
 <b className="ltrIso" style={{ fontSize: 14 }}>
 {fmtDT(r.next_session_at)}
 </b>
 </div>
 <div className="stat">
 <span className="muted">Status</span>
 <b>
 {r.status === "active"
 ? ""
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
 title=" Children "
 variant="soft"
 size="sm"
 disabled={!isActive}
 onClick={() => autoEnrollPackages(r.run_id)}
 />
 <IconButton
 icon={CheckCircle2}
 title=" "
 variant="soft"
 size="sm"
 disabled={!isActive}
 onClick={() =>
 setConfirm({
 open: true,
 type: "done",
 runId: r.run_id,
 text: ` : ${title}`,
 })
 }
 />
 <IconButton
 icon={Ban}
 title="Cancel "
 variant="danger"
 size="sm"
 disabled={!isActive}
 onClick={() =>
 setConfirm({
 open: true,
 type: "canceled",
 runId: r.run_id,
 text: `Cancel : ${title}`,
 })
 }
 />
 {r.status !== "active" ? (
 <IconButton
 icon={RotateCcw}
 title=" "
 variant="ghost"
 size="sm"
 onClick={() =>
 setConfirm({
 open: true,
 type: "reactivate",
 runId: r.run_id,
 text: ` "${r.run_title}"`,
 })
 }
 />
 ) : null}
 <IconButton
 icon={Trash2}
 title="Delete "
 variant="danger"
 size="sm"
 onClick={() =>
 setConfirm({
 open: true,
 type: "delete",
 runId: r.run_id,
 text: `Delete : ${title}`,
 })
 }
 />
 </div>
 </div>
 );
 })}
 </div>
 )}

 <Modal open={open} title=" " onClose={() => setOpen(false)}>
 <div className="muted">
 “” .
 </div>

 <hr className="sep" />

 <div className="grid">
 <div style={{ gridColumn: "span 12" }}>
 <div className="muted"> ()</div>
 <input
 className="input"
 value={label}
 onChange={(e) => setLabel(e.target.value)}
 placeholder=": - 2026"
 />
 </div>

 <div style={{ gridColumn: "span 6" }}>
 <div className="muted"> (/)</div>
 <input
 className="input"
 type="datetime-local"
 value={firstStart}
 onChange={(e) => setFirstStart(e.target.value)}
 />
 </div>

 <div style={{ gridColumn: "span 6" }}>
 <div className="muted"> </div>
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
 <div className="muted"> ()</div>
 <input
 className="input"
 type="number"
 min="15"
 value={durationMinutes}
 onChange={(e) => setDurationMinutes(e.target.value)}
 />
 </div>

 <div style={{ gridColumn: "span 4" }}>
 <div className="muted"> </div>
 <input
 className="input"
 type="number"
 min="1"
 value={count}
 onChange={(e) => setCount(e.target.value)}
 />
 </div>

 <div style={{ gridColumn: "span 4" }}>
 <div className="muted"> </div>
 <input
 className="input"
 type="number"
 min="1"
 value={intervalDays}
 onChange={(e) => setIntervalDays(e.target.value)}
 />
 <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
 7
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
 {saving ? " ..." : " "}
 </button>
 <button className="btn" onClick={() => setOpen(false)}>
 Cancel
 </button>
 </div>
 </div>
 </Modal>

 <ConfirmDialog
 open={confirm.open}
 title=""
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
