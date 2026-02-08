import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router";
import { supabase } from "../supabaseClient";

import PageHeader from "../components/PageHeader";
import ErrorBanner from "../components/ErrorBanner";
import KpiCard from "../components/KpiCard";
import EmptyState from "../components/EmptyState";
import Badge from "../components/Badge";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import IconButton from "../components/IconButton";
import Control from "../components/Control";
import ModernSelect from "../components/ModernSelect";
import { fmtDateTime24, fmtTime24, fmtWeekdayAr } from "../utils/datetime";

import {
  CreditCard,
  Banknote,
  CalendarDays,
  UserRound,
  Plus,
  Trash2,
  Search,
  Filter,
  Link as LinkIcon,
} from "lucide-react";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function toInputDatetimeLocal() {
  const d = new Date();
  const pad = (x) => String(x).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function parseInputDatetimeLocal(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function fmtMoney(n) {
  const x = Number(n || 0);
  return x.toLocaleString("en", { maximumFractionDigits: 2 });
}

function methodLabel(m) {
  if (m === "cash") return "Cash";
  if (m === "card") return "Card";
  if (m === "transfer") return "Bank transfer";
  if (m === "other") return "Other";
  return String(m || "—");
}

function fmtDT(iso) {
  if (!iso) return "—";
  return fmtDateTime24(iso);
}

function fmtSessionLabel(startAt, endAt) {
  if (!startAt) return "—";
  const d = new Date(startAt);
  const day = fmtWeekdayAr(d); // keep logic as-is
  const start = fmtTime24(startAt);
  const end = endAt ? fmtTime24(endAt) : "";
  return `${day} • ${start}${end ? ` - ${end}` : ""}`;
}

function statusFromEnrollment(enr) {
  const key = enr?.status_key ?? enr?.enrollment_status ?? "unknown";

  if (key === "paid") {
    return { key: "paid", label: "Paid", variant: "ok", rowClass: "row--ok" };
  }
  if (key === "partial") {
    return {
      key: "partial",
      label: "Partial",
      variant: "warn",
      rowClass: "row--warn",
    };
  }
  if (key === "unpaid") {
    return {
      key: "unpaid",
      label: "Unpaid",
      variant: "danger",
      rowClass: "row--danger",
    };
  }
  if (key === "free") {
    return {
      key: "free",
      label: "Free",
      variant: "neutral",
      rowClass: "row--neutral",
    };
  }

  return {
    key: "unknown",
    label: "Unknown",
    variant: "neutral",
    rowClass: "row--neutral",
  };
}

export default function Payments() {
  const navigate = useNavigate();
  const { toast } = useOutletContext();

  const [payments, setPayments] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [sessions, setSessions] = useState([]);

  const [supportsDetailsView, setSupportsDetailsView] = useState(true);
  const [supportsSessionId, setSupportsSessionId] = useState(true);

  const [loading, setLoading] = useState(true);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [rangePreset, setRangePreset] = useState("90d"); // 30d | 90d | this_month | custom
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [openAdd, setOpenAdd] = useState(false);

  const [payEnrollmentId, setPayEnrollmentId] = useState("");
  const [paySessionId, setPaySessionId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payAt, setPayAt] = useState(toInputDatetimeLocal());
  const [payNote, setPayNote] = useState("");

  const [confirm, setConfirm] = useState({ open: false, id: null });

  const enrollMap = useMemo(() => {
    const m = new Map();
    for (const e of enrollments || []) m.set(e.enrollment_id, e);
    return m;
  }, [enrollments]);

  async function loadPayments() {
    setLoading(true);
    setError(null);

    // Try rich view (new)
    let res = await supabase
      .from("payments_details_view")
      .select("*")
      .order("paid_at", { ascending: false });

    // Fallback to old view
    if (res.error) {
      setSupportsDetailsView(false);

      res = await supabase
        .from("payments_view")
        .select("*")
        .order("paid_at", { ascending: false });
    } else {
      setSupportsDetailsView(true);
    }

    if (res.error) {
      setError(res.error);
      setPayments([]);
      setLoading(false);
      return;
    }

    const rows = res.data ?? [];

    // Detect column support by trying a lightweight select from payments.
    // If DB isn't upgraded, session_id may not exist.
    const test = await supabase
      .from("payments")
      .select("id, session_id")
      .limit(1);
    if (
      test.error &&
      String(test.error.message || "")
        .toLowerCase()
        .includes("session_id")
    ) {
      setSupportsSessionId(false);
    } else {
      setSupportsSessionId(true);
    }

    setPayments(rows);
    setLoading(false);

    // Keep enrollments in sync for status badges / picker
    await loadEnrollmentsPicker();
  }

  async function loadEnrollmentsPicker() {
    setPickerLoading(true);
    setError(null);

    // Enrich with run -> course info
    const { data, error: err } = await supabase
      .from("run_participants_view")
      .select("*")
      .order("enrollment_status", { ascending: true });

    if (err) {
      // Fallback: try child_enrollments_view + children_view
      setError(err);
      setEnrollments([]);
      setPickerLoading(false);
      return;
    }

    setEnrollments(data ?? []);
    setPickerLoading(false);
  }

  async function loadSessionsForEnrollment(enrollmentId) {
    setSessions([]);
    if (!enrollmentId) return;

    const row = enrollments.find(
      (x) => String(x.enrollment_id) === String(enrollmentId),
    );
    const runId = row?.run_id;
    if (!runId) return;

    const { data, error: err } = await supabase
      .from("course_sessions")
      .select("id, run_id, start_at, end_at, status")
      .eq("run_id", runId)
      .order("start_at", { ascending: true });

    if (err) {
      setError(err);
      setSessions([]);
      return;
    }

    setSessions(data ?? []);
  }

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let list = [...payments];

    // Date range filter
    if (
      rangePreset === "30d" ||
      rangePreset === "90d" ||
      rangePreset === "this_month"
    ) {
      const now = new Date();
      let from = null;

      if (rangePreset === "30d") {
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (rangePreset === "90d") {
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      } else if (rangePreset === "this_month") {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      if (from) {
        list = list.filter((p) => {
          const d = p.paid_at ? new Date(p.paid_at) : null;
          return d && d >= from && d <= now;
        });
      }
    }

    if (rangePreset === "custom") {
      const a = fromDate ? new Date(fromDate) : null;
      const b = toDate ? new Date(toDate) : null;

      list = list.filter((p) => {
        if (!p.paid_at) return false;
        const d = new Date(p.paid_at);
        if (a && d < a) return false;
        if (b) {
          const end = new Date(b);
          end.setHours(23, 59, 59, 999);
          if (d > end) return false;
        }
        return true;
      });
    }

    const s = search.trim().toLowerCase();
    if (s) {
      list = list.filter((p) => {
        const child = String(p.child_name ?? "").toLowerCase();
        const course = String(p.course_title ?? "").toLowerCase();
        const note = String(p.note ?? "").toLowerCase();
        return child.includes(s) || course.includes(s) || note.includes(s);
      });
    }

    if (method !== "all") list = list.filter((p) => p.method === method);

    if (statusFilter !== "all") {
      list = list.filter((p) => {
        const st = statusFromEnrollment(enrollMap.get(p.enrollment_id));
        return st.key === statusFilter;
      });
    }

    return list;
  }, [
    payments,
    search,
    method,
    statusFilter,
    enrollMap,
    rangePreset,
    fromDate,
    toDate,
  ]);

  const kpis = useMemo(() => {
    const total = filtered.reduce((acc, x) => acc + Number(x.amount || 0), 0);
    const count = filtered.length;
    const cash = filtered
      .filter((x) => x.method === "cash")
      .reduce((acc, x) => acc + Number(x.amount || 0), 0);
    const uniqChildren = new Set(
      filtered.map((x) => x.child_id).filter(Boolean),
    ).size;
    const avg = count === 0 ? 0 : total / count;

    return { total, count, cash, uniqChildren, avg };
  }, [filtered]);

  const pickerFiltered = useMemo(() => {
    const list = [...enrollments];
    list.sort((a, b) => {
      const ax = a.enrollment_status === "active" ? 0 : 1;
      const bx = b.enrollment_status === "active" ? 0 : 1;
      if (ax !== bx) return ax - bx;
      return String(a.child_name).localeCompare(String(b.child_name), "en");
    });
    return list;
  }, [enrollments]);

  const selectedEnrollment = useMemo(
    () =>
      enrollments.find(
        (x) => String(x.enrollment_id) === String(payEnrollmentId),
      ) ?? null,
    [enrollments, payEnrollmentId],
  );

  async function openAddModal() {
    setOpenAdd(true);
    setPayEnrollmentId("");
    setPaySessionId("");
    setPayAmount("");
    setPayMethod("cash");
    setPayAt(toInputDatetimeLocal());
    setPayNote("");
    setSessions([]);

    if (enrollments.length === 0) await loadEnrollmentsPicker();
  }

  async function createPayment() {
    if (!payEnrollmentId) {
      toast("Please choose an enrollment.", "warn");
      return;
    }

    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      toast("Please enter a valid amount.", "warn");
      return;
    }

    const paidAtIso =
      parseInputDatetimeLocal(payAt) ?? new Date().toISOString();

    const payload = {
      enrollment_id: Number(payEnrollmentId),
      amount,
      method: payMethod,
      note: payNote ? String(payNote) : null,
      paid_at: paidAtIso,
    };

    const sessionId = paySessionId ? Number(paySessionId) : null;
    if (sessionId) payload.session_id = sessionId;

    let ins = await supabase.from("payments").insert([payload]);

    if (
      ins.error &&
      String(ins.error.message || "")
        .toLowerCase()
        .includes("session_id")
    ) {
      setSupportsSessionId(false);
      const { session_id, ...payload2 } = payload;
      ins = await supabase.from("payments").insert([payload2]);
    }

    if (ins.error) {
      setError(ins.error);
      toast("Failed to create payment.", "danger");
      return;
    }

    toast(
      supportsSessionId || !sessionId
        ? "Payment saved."
        : "Payment saved (session link not stored).",
      "ok",
    );

    setOpenAdd(false);
    await loadPayments();
  }

  async function deletePayment(id) {
    const d = await supabase.from("payments").delete().eq("id", id);
    if (d.error) {
      setError(d.error);
      toast("Failed to delete payment.", "danger");
      return;
    }
    toast("Payment deleted.", "ok");
    await loadPayments();
  }

  const rangeHint = useMemo(() => {
    if (rangePreset === "custom") {
      const a = fromDate ? new Date(fromDate).toLocaleDateString("en") : "—";
      const b = toDate ? new Date(toDate).toLocaleDateString("en") : "—";
      return `${a} → ${b}`;
    }
    if (rangePreset === "30d") return "Last 30 days";
    if (rangePreset === "90d") return "Last 90 days";
    if (rangePreset === "this_month") return "This month";
    return "All time";
  }, [rangePreset, fromDate, toDate]);

  return (
    <div className="container page page--payments">
      <PageHeader
        title="Payments"
        subtitle={`Range: ${rangeHint}`}
        actions={
          <div className="toolbar">
            <button className="btn" onClick={loadPayments}>
              Refresh
            </button>
            <button className="btn primary" onClick={openAddModal}>
              <Plus size={18} /> Add payment
            </button>
          </div>
        }
      />

      <ErrorBanner error={error} />

      {/* KPI Row */}
      <div className="kpiGrid4" style={{ marginBottom: 14 }}>
        <KpiCard
          icon={Banknote}
          label="Total received"
          value={`${fmtMoney(kpis.total)}₪`}
          hint="Sum of payments in the current view"
          variant={kpis.total === 0 ? "neutral" : "info"}
          className="kpi--accent"
        />

        <KpiCard
          icon={CreditCard}
          label="Payments"
          value={kpis.count}
          hint="Number of payments in the current view"
          variant={kpis.count === 0 ? "neutral" : "info"}
          className="kpi--accent"
        />

        <KpiCard
          icon={Banknote}
          label="Cash total"
          value={`${fmtMoney(kpis.cash)}₪`}
          hint="Sum of cash payments"
          variant={kpis.cash === 0 ? "neutral" : "ok"}
          className="kpi--accent"
        />

        <KpiCard
          icon={UserRound}
          label="Unique payers"
          value={kpis.uniqChildren}
          hint={`Average payment: ${fmtMoney(kpis.avg)}₪`}
          variant={kpis.uniqChildren === 0 ? "neutral" : "info"}
          className="kpi--accent"
        />
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div
          className="toolbar"
          style={{ justifyContent: "flex-start", gap: 10 }}
        >
          <div
            className="filtersBar filtersBar--oneLine"
            style={{ width: "100%" }}
          >
            <Control
              icon={Search}
              className="filtersBar__search"
              style={{ minWidth: 260, width: "auto" }}
            >
              <input
                placeholder="Search payments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Control>

            <Control
              icon={Filter}
              className="filtersBar__select"
              style={{ minWidth: 160, width: "auto" }}
            >
              <ModernSelect
                bare
                value={method}
                onChange={setMethod}
                placeholder="All methods"
                options={[
                  { value: "all", label: "All methods" },
                  { value: "cash", label: "Cash" },
                  { value: "card", label: "Card" },
                  { value: "transfer", label: "Bank transfer" },
                  { value: "other", label: "Other" },
                ]}
              />
            </Control>

            <Control
              icon={Filter}
              className="filtersBar__select"
              style={{ minWidth: 170, width: "auto" }}
            >
              <ModernSelect
                bare
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="All statuses"
                options={[
                  { value: "all", label: "All statuses" },
                  { value: "paid", label: "Paid" },
                  { value: "partial", label: "Partial" },
                  { value: "unpaid", label: "Unpaid" },
                  { value: "free", label: "Free" },
                ]}
              />
            </Control>

            <Control
              icon={CalendarDays}
              className="filtersBar__select"
              style={{ minWidth: 150, width: "auto" }}
            >
              <ModernSelect
                bare
                value={rangePreset}
                onChange={setRangePreset}
                placeholder="Last 90 days"
                options={[
                  { value: "30d", label: "Last 30 days" },
                  { value: "90d", label: "Last 90 days" },
                  { value: "this_month", label: "This month" },
                  { value: "custom", label: "Custom range" },
                ]}
              />
            </Control>

            {rangePreset === "custom" ? (
              <>
                <div className="filtersBar__date" style={{ minWidth: 160 }}>
                  <div className="label">From</div>
                  <input
                    className="input"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>

                <div className="filtersBar__date" style={{ minWidth: 160 }}>
                  <div className="label">To</div>
                  <input
                    className="input"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card">Loading...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payments found"
          description="Try adjusting filters, or add a new payment."
          actionLabel="Add payment"
          onAction={openAddModal}
          secondaryLabel="Reset filters"
          onSecondary={() => {
            setSearch("");
            setMethod("all");
            setStatusFilter("all");
            setRangePreset("90d");
            setFromDate("");
            setToDate("");
          }}
        />
      ) : (
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Paid at</th>
                <th>Child</th>
                <th>Course</th>
                <th>Run</th>
                <th>Session</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Note</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const enr = enrollMap.get(p.enrollment_id);
                const st = statusFromEnrollment(enr);

                return (
                  <tr key={p.id} className={st.rowClass}>
                    <td>{fmtDT(p.paid_at)}</td>

                    <td>
                      {p.child_id ? (
                        <button
                          className="linkBtn"
                          onClick={() => navigate(`/children/${p.child_id}`)}
                        >
                          {p.child_name}
                        </button>
                      ) : (
                        <span>{p.child_name ?? "—"}</span>
                      )}
                    </td>

                    <td>
                      {p.course_id ? (
                        <button
                          className="linkBtn"
                          onClick={() => navigate(`/courses/${p.course_id}`)}
                        >
                          {p.course_title}
                        </button>
                      ) : (
                        <span>{p.course_title ?? "—"}</span>
                      )}
                    </td>

                    <td>
                      {p.run_id ? (
                        <button
                          className="linkBtn"
                          onClick={() => navigate(`/runs/${p.run_id}`)}
                        >
                          {p.run_label ?? `#${p.run_id}`}
                        </button>
                      ) : (
                        <span>{p.run_label ?? "—"}</span>
                      )}
                    </td>

                    <td>
                      {p.session_id ? (
                        <button
                          className="linkBtn"
                          onClick={() =>
                            navigate(`/sessions/${p.session_id}/attendance`)
                          }
                          title="Open session attendance"
                        >
                          <span className="row" style={{ gap: 6 }}>
                            <LinkIcon size={16} />
                            {fmtSessionLabel(
                              p.session_start_at,
                              p.session_end_at,
                            )}
                          </span>
                        </button>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>

                    <td style={{ fontWeight: 950 }}>{fmtMoney(p.amount)}₪</td>
                    <td>{methodLabel(p.method)}</td>

                    <td>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </td>

                    <td style={{ maxWidth: 260 }}>
                      <span
                        style={{
                          display: "inline-block",
                          maxWidth: 260,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.note ?? "—"}
                      </span>
                    </td>

                    <td style={{ width: 1 }}>
                      <IconButton
                        icon={Trash2}
                        label=""
                        title="Delete"
                        iconOnly
                        onClick={() => setConfirm({ open: true, id: p.id })}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Payment Modal */}
      <Modal
        open={openAdd}
        title="Add payment"
        onClose={() => setOpenAdd(false)}
      >
        <div style={{ padding: 16 }}>
          {pickerLoading ? (
            <div className="card">Loading...</div>
          ) : (
            <>
              <div className="grid" style={{ marginBottom: 12 }}>
                <div style={{ gridColumn: "span 6" }}>
                  <div
                    className="muted"
                    style={{ fontWeight: 900, marginBottom: 6 }}
                  >
                    Enrollment
                  </div>
                  <ModernSelect
                    value={payEnrollmentId}
                    onChange={async (v) => {
                      setPayEnrollmentId(v);
                      setPaySessionId("");
                      await loadSessionsForEnrollment(v);
                    }}
                    menuWidth="trigger"
                    placeholder="Select enrollment..."
                    options={[
                      { value: "", label: "Select enrollment..." },
                      ...pickerFiltered.map((x) => {
                        const st = statusFromEnrollment(x);
                        const label = `${x.child_name} — ${x.course_title} — ${x.run_label}`;
                        const hint =
                          Number(x.agreed_price || 0) > 0
                            ? ` (Balance: ${fmtMoney(x.balance)}₪)`
                            : " (Free)";
                        return {
                          value: x.enrollment_id,
                          label: `${label}${hint}`,
                          disabled: st !== "active",
                        };
                      }),
                    ]}
                  />
                </div>

                <div style={{ gridColumn: "span 6" }}>
                  <div
                    className="muted"
                    style={{ fontWeight: 900, marginBottom: 6 }}
                  >
                    Session (optional)
                  </div>
                  <ModernSelect
                    value={paySessionId}
                    onChange={setPaySessionId}
                    menuWidth="trigger"
                    disabled={!supportsSessionId}
                    placeholder={
                      supportsSessionId
                        ? "No session"
                        : "Session linking not supported"
                    }
                    options={[
                      { value: "", label: "No session" },
                      ...(sessions || []).map((s) => ({
                        value: s.id,
                        label: `${fmtDateTime24(s.start_at)} — ${s.status}`,
                      })),
                    ]}
                  />
                </div>
              </div>

              <div className="grid" style={{ marginBottom: 12 }}>
                <div style={{ gridColumn: "span 4" }}>
                  <div
                    className="muted"
                    style={{ fontWeight: 900, marginBottom: 6 }}
                  >
                    Amount
                  </div>
                  <div className="input">
                    <input
                      type="number"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="e.g. 120"
                    />
                    <span className="muted" style={{ fontWeight: 950 }}>
                      ₪
                    </span>
                  </div>

                  {selectedEnrollment ? (
                    <div
                      className="muted"
                      style={{ marginTop: 6, fontWeight: 850 }}
                    >
                      Balance:{" "}
                      <span style={{ fontWeight: 950 }}>
                        {fmtMoney(selectedEnrollment.balance)}₪
                      </span>
                      {Number(selectedEnrollment.balance || 0) > 0 ? (
                        <button
                          className="linkBtn"
                          style={{ marginInlineStart: 10 }}
                          onClick={() =>
                            setPayAmount(
                              String(Number(selectedEnrollment.balance || 0)),
                            )
                          }
                          type="button"
                        >
                          Use balance
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <div
                    className="muted"
                    style={{ fontWeight: 900, marginBottom: 6 }}
                  >
                    Payment method
                  </div>
                  <ModernSelect
                    value={payMethod}
                    onChange={setPayMethod}
                    menuWidth="trigger"
                    options={[
                      { value: "cash", label: "Cash" },
                      { value: "card", label: "Card" },
                      { value: "transfer", label: "Bank transfer" },
                      { value: "other", label: "Other" },
                    ]}
                  />
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <div
                    className="muted"
                    style={{ fontWeight: 900, marginBottom: 6 }}
                  >
                    Paid at
                  </div>
                  <div className="input">
                    <input
                      type="datetime-local"
                      value={payAt}
                      onChange={(e) => setPayAt(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div
                  className="muted"
                  style={{ fontWeight: 900, marginBottom: 6 }}
                >
                  Note (optional)
                </div>
                <div className="input">
                  <input
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                    placeholder="e.g. partial payment, discount, etc."
                  />
                </div>
              </div>

              <div className="row" style={{ gap: 10 }}>
                <button className="btn primary" onClick={createPayment}>
                  <Plus size={18} /> Save
                </button>
                <button className="btn" onClick={() => setOpenAdd(false)}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        title="Delete payment"
        message="Are you sure you want to delete this payment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        danger
        onCancel={() => setConfirm({ open: false, id: null })}
        onConfirm={async () => {
          const id = confirm.id;
          setConfirm({ open: false, id: null });
          if (id) await deletePayment(id);
        }}
      />
    </div>
  );
}
