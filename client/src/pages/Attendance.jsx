import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router";
import { supabase } from "../supabaseClient";
import ErrorBanner from "../components/ErrorBanner";
import Badge from "../components/Badge";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import IconButton from "../components/IconButton";
import { Users, RefreshCw, Save, ArrowRight, CheckCircle2, XCircle, Eraser } from "lucide-react";
import { fmtDateTime24 } from "../utils/datetime";

function fmtDT(dt) {
  return fmtDateTime24(dt);
}

const STATUS = ["present", "absent", "excused", "none"];

function statusLabel(s) {
  if (s === "present") return "حاضر";
  if (s === "absent") return "غائب";
  if (s === "excused") return "معذور";
  return "غير مسجل";
}

function statusBadge(s) {
  if (s === "present") return <Badge variant="ok">حاضر</Badge>;
  if (s === "absent") return <Badge variant="danger">غائب</Badge>;
  if (s === "excused") return <Badge variant="warn">معذور</Badge>;
  return <Badge variant="info">غير مسجل</Badge>;
}

export default function Attendance() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useOutletContext();

  const [session, setSession] = useState(null);
  const [summary, setSummary] = useState(null);

  const [rows, setRows] = useState([]); // participants
  const [att, setAtt] = useState({}); // enrollment_id -> status
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);

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
      setError({
        message:
          "هذه الحصة غير مربوطة بـ Run (run_id). تأكد من توليد الحصص من صفحة الدفعة.",
      });
      setLoading(false);
      return;
    }

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
    setRows(p.data ?? []);

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

    // Default "none" إذا مش موجود
    const final = {};
    (p.data ?? []).forEach((r) => {
      final[r.enrollment_id] = map[r.enrollment_id] ?? "none";
    });
    setAtt(final);

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
      // إذا none نحذفها بدل ما نخزن null
      // 1) Upsert للحالات غير none
      const toUpsert = payload.filter((x) => x.status !== null);
      if (toUpsert.length) {
        const up = await supabase
          .from("attendance")
          .upsert(toUpsert, { onConflict: "session_id,enrollment_id" });
        if (up.error) throw up.error;
      }

      // 2) Delete للحالات none (إذا موجودة سابقاً)
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

      toast("تم حفظ الحضور.", "ok");
      await load();
    } catch (e) {
      setError(e);
      toast("فشل حفظ الحضور.", "danger");
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="container page page--runs">
        <div className="card">جاري التحميل...</div>
      </div>
    );

  return (
    <div className="container">
      <PageHeader
  title="الحضور"
  subtitle={
    session
      ? `${summary?.title ?? ""} — ${summary?.label ?? ""} • ${fmtDT(session.start_at)} → ${fmtDT(session.end_at)}`
      : `${summary?.title ?? ""} — ${summary?.label ?? ""}`
  }
  actions={
    <div className="toolbar">
      {summary && (
        <button className="btn" onClick={() => navigate(`/runs/${summary.run_id}`)}>
          <ArrowRight size={18} /> رجوع للدفعة
        </button>
      )}
      <button className="btn" onClick={load}>
        <RefreshCw size={18} /> تحديث
      </button>
      <button className="btn primary" disabled={saving} onClick={saveAll}>
        <Save size={18} /> {saving ? "جاري الحفظ..." : "حفظ"}
      </button>
    </div>
  }
/>

<ErrorBanner error={error} />

      <div className="row" style={{ flexWrap: "wrap", marginBottom: 10 }}>
        <Badge variant="info">المتوقع: {stats.expected}</Badge>
        <Badge variant="ok">حاضر: {stats.present}</Badge>
        <Badge variant="danger">غائب: {stats.absent}</Badge>
        <Badge variant="warn">معذور: {stats.excused}</Badge>
        <Badge variant="info">غير مسجل: {stats.none}</Badge>
      </div>

      <div className="toolbar" style={{ marginBottom: 10 }}>
        <button className="btn" onClick={() => setAll("present")}>
          <CheckCircle2 size={18} /> كلهم حاضر
        </button>
        <button className="btn" onClick={() => setAll("absent")}>
          <XCircle size={18} /> كلهم غائب
        </button>
        <button className="btn" onClick={() => setAll("none")}>
          <Eraser size={18} /> مسح الكل
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Users} title="لا يوجد أطفال فعالين في هذه الدفعة" description="أضف مشاركين إلى الدفعة أولًا، ثم عد للحضور لتسجيل الحالة." actionLabel="الذهاب للدفعة" onAction={() => summary && navigate(`/runs/${summary.run_id}`)} />
      ) : (
        <div className="tableWrap">
          <table className="table">
          <thead>
            <tr>
              <th>الطفل</th>
              <th>الحالة</th>
              <th>اختيار</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const v = att[r.enrollment_id] ?? "none";
              return (
                <tr key={r.enrollment_id}>
                  <td style={{ fontWeight: 800 }}>{r.child_name}</td>
                  <td>{statusBadge(v)}</td>
                  <td>
                    <div className="row" style={{ flexWrap: "wrap" }}>
                      {STATUS.map((s) => (
                        <button
                          key={s}
                          className={`btn ${v === s ? "primary" : ""}`}
                          onClick={() =>
                            setAtt((p) => ({ ...p, [r.enrollment_id]: s }))
                          }
                          type="button"
                        >
                          {statusLabel(s)}
                        </button>
                      ))}
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
