import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router";
import { supabase } from "../supabaseClient";

import PageHeader from "../components/PageHeader";
import ErrorBanner from "../components/ErrorBanner";
import KpiCard from "../components/KpiCard";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import IconButton from "../components/IconButton";
import Control from "../components/Control";
import ModernSelect from "../components/ModernSelect";
import { fmtDateTime24 } from "../utils/datetime";

import {
  CreditCard,
  Banknote,
  CalendarDays,
  UserRound,
  Plus,
  Trash2,
  Search,
  Filter,
} from "lucide-react";

function fmtMoney(n) {
  const x = Number(n || 0);
  return x.toLocaleString("en", { maximumFractionDigits: 2 });
}

function fmtDT(dt) {
  if (!dt) return "—";
  return fmtDateTime24(dt);
}

function methodLabel(m) {
  if (m === "cash") return "كاش";
  if (m === "card") return "بطاقة";
  if (m === "transfer") return "تحويل بنكي";
  if (m === "other") return "أخرى";
  return "—";
}

function toInputDatetimeLocal(dt) {
  const d = dt ? new Date(dt) : new Date();
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

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function rangeFromPreset(preset) {
  const now = new Date();
  const end = endOfDay(now);

  if (preset === "30d") {
    const start = startOfDay(
      new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000),
    );
    return { start, end };
  }
  if (preset === "90d") {
    const start = startOfDay(
      new Date(now.getTime() - 89 * 24 * 60 * 60 * 1000),
    );
    return { start, end };
  }
  if (preset === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: startOfDay(start), end };
  }
  return { start: null, end: null };
}

export default function Payments() {
  const navigate = useNavigate();
  const { toast } = useOutletContext();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [payments, setPayments] = useState([]);

  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("all");

  const [rangePreset, setRangePreset] = useState("90d");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [openAdd, setOpenAdd] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [enrollments, setEnrollments] = useState([]);

  // Add payment form
  const [payChildId, setPayChildId] = useState("");
  const [payEnrollmentId, setPayEnrollmentId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payAt, setPayAt] = useState(toInputDatetimeLocal());
  const [payNote, setPayNote] = useState("");

  const [confirm, setConfirm] = useState({ open: false, id: null });

  const activeRange = useMemo(() => {
    if (rangePreset === "custom") {
      const f = fromDate ? startOfDay(new Date(fromDate)) : null;
      const t = toDate ? endOfDay(new Date(toDate)) : null;
      return { start: f, end: t };
    }
    return rangeFromPreset(rangePreset);
  }, [rangePreset, fromDate, toDate]);

  async function loadPayments() {
    setLoading(true);
    setError(null);

    try {
      let rows = [];

      // Prefer rich view if exists
      const baseSelect =
        "id,enrollment_id,amount,method,paid_at,note,created_at,run_id,child_id,child_name,course_id,course_title,run_label";

      let q = supabase
        .from("payments_details_view")
        .select(baseSelect)
        .order("paid_at", { ascending: false });

      if (activeRange.start)
        q = q.gte("paid_at", activeRange.start.toISOString());
      if (activeRange.end) q = q.lte("paid_at", activeRange.end.toISOString());

      const r = await q;

      if (r.error) {
        // Fallback to old view
        const legacySelect =
          "id,enrollment_id,amount,method,paid_at,note,created_at,run_id,child_id,child_name";

        let q2 = supabase
          .from("payments_view")
          .select(legacySelect)
          .order("paid_at", { ascending: false });

        if (activeRange.start)
          q2 = q2.gte("paid_at", activeRange.start.toISOString());
        if (activeRange.end)
          q2 = q2.lte("paid_at", activeRange.end.toISOString());

        const r2 = await q2;
        if (r2.error) throw r2.error;

        // Enrich with run -> course info (for nice table)
        const runIds = Array.from(
          new Set((r2.data ?? []).map((x) => x.run_id).filter(Boolean)),
        );
        const runMap = new Map();
        if (runIds.length) {
          const rs = await supabase
            .from("course_runs_summary_view")
            .select("run_id,template_id,title,kind,label")
            .in("run_id", runIds);
          if (!rs.error) {
            for (const x of rs.data ?? []) runMap.set(x.run_id, x);
          }
        }

        rows = (r2.data ?? []).map((x) => {
          const run = runMap.get(x.run_id);
          return {
            ...x,
            course_id: run?.template_id ?? null,
            course_title: run?.title ?? "—",
            run_label: run?.label ?? "—",
          };
        });
      } else {
        rows = r.data ?? [];
      }

      setPayments(rows);
      setLoading(false);
    } catch (e) {
      setError(e);
      setLoading(false);
    }
  }

  async function loadEnrollmentsPicker() {
    setPickerLoading(true);
    try {
      const r = await supabase
        .from("enrollments_finance_view")
        .select(
          "enrollment_id,child_id,child_name,run_id,course_id,course_title,run_label,enrollment_status,agreed_price,paid_amount,balance",
        )
        .order("child_name", { ascending: true })
        .limit(2000);

      if (r.error) {
        // Fallback: try child_enrollments_view + children_view
        const ce = await supabase
          .from("child_enrollments_view")
          .select(
            "enrollment_id,child_id,run_id,enrollment_status,agreed_price,paid_amount,balance,title,label",
          )
          .order("enrollment_id", { ascending: false })
          .limit(2000);
        if (ce.error) throw r.error;

        const childIds = Array.from(
          new Set((ce.data ?? []).map((x) => x.child_id).filter(Boolean)),
        );
        const cm = new Map();
        if (childIds.length) {
          const ch = await supabase
            .from("children_view")
            .select("id,name")
            .in("id", childIds);
          if (!ch.error) for (const c of ch.data ?? []) cm.set(c.id, c.name);
        }

        setEnrollments(
          (ce.data ?? []).map((x) => ({
            enrollment_id: x.enrollment_id,
            child_id: x.child_id,
            child_name: cm.get(x.child_id) ?? "—",
            run_id: x.run_id,
            course_id: null,
            course_title: x.title ?? "—",
            run_label: x.label ?? "—",
            enrollment_status: x.enrollment_status,
            agreed_price: x.agreed_price,
            paid_amount: x.paid_amount,
            balance: x.balance,
          })),
        );
      } else {
        setEnrollments(r.data ?? []);
      }

      setPickerLoading(false);
    } catch (e) {
      setPickerLoading(false);
      setError(e);
    }
  }

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangePreset, fromDate, toDate]);

  const filtered = useMemo(() => {
    let list = [...payments];

    const s = search.trim().toLowerCase();
    if (s) {
      list = list.filter((p) => {
        const child = String(p.child_name ?? "").toLowerCase();
        const course = String(p.course_title ?? "").toLowerCase();
        const run = String(p.run_label ?? "").toLowerCase();
        const note = String(p.note ?? "").toLowerCase();
        return (
          child.includes(s) ||
          course.includes(s) ||
          run.includes(s) ||
          note.includes(s)
        );
      });
    }

    if (method !== "all") list = list.filter((p) => p.method === method);

    return list;
  }, [payments, search, method]);

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

  const rangeHint = useMemo(() => {
    if (rangePreset === "custom") {
      const a = fromDate ? new Date(fromDate).toLocaleDateString("en") : "—";
      const b = toDate ? new Date(toDate).toLocaleDateString("en") : "—";
      return `${a} → ${b}`;
    }
    if (rangePreset === "30d") return "آخر 30 يوم";
    if (rangePreset === "90d") return "آخر 90 يوم";
    if (rangePreset === "this_month") return "هذا الشهر";
    return "كل الوقت";
  }, [rangePreset, fromDate, toDate]);

  const childOptions = useMemo(() => {
    const byId = new Map();
    for (const e of enrollments) {
      if (!e?.child_id) continue;
      if (!byId.has(e.child_id)) byId.set(e.child_id, e.child_name ?? "—");
    }

    const list = Array.from(byId.entries()).map(([id, name]) => ({
      value: String(id),
      label: name,
    }));
    list.sort((a, b) => String(a.label).localeCompare(String(b.label), "en"));
    return [{ value: "", label: "Select child..." }, ...list];
  }, [enrollments]);

  const enrollmentsForChild = useMemo(() => {
    if (!payChildId) return [];
    return enrollments
      .filter((e) => String(e.child_id) === String(payChildId))
      .sort((a, b) =>
        String(a.course_title).localeCompare(String(b.course_title), "en"),
      );
  }, [enrollments, payChildId]);

  const enrollmentOptions = useMemo(() => {
    if (!payChildId) {
      return [{ value: "", label: "اختر الطفل أولاً" }];
    }

    const list = enrollmentsForChild.map((x) => {
      const agreed = Number(x.agreed_price || 0);
      const bal = Number(x.balance || 0);
      const hint = agreed > 0 ? ` (المتبقي: ${fmtMoney(bal)}₪)` : "";
      const label = `${x.course_title} — ${x.run_label}${hint}`;
      return {
        value: String(x.enrollment_id),
        label,
        disabled: x.enrollment_status !== "active",
      };
    });

    return [{ value: "", label: "اختر اشتراكًا..." }, ...list];
  }, [payChildId, enrollmentsForChild]);

  const selectedEnrollment = useMemo(() => {
    return (
      enrollments.find(
        (x) => String(x.enrollment_id) === String(payEnrollmentId),
      ) ?? null
    );
  }, [enrollments, payEnrollmentId]);

  async function openAddModal() {
    setOpenAdd(true);

    setPayChildId("");
    setPayEnrollmentId("");
    setPayAmount("");
    setPayMethod("cash");
    setPayAt(toInputDatetimeLocal());
    setPayNote("");

    if (enrollments.length === 0) await loadEnrollmentsPicker();
  }

  async function createPayment() {
    if (!payEnrollmentId) {
      toast("اختر اشتراكًا.", "warn");
      return;
    }

    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      toast("أدخل مبلغًا صحيحًا.", "warn");
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

    const ins = await supabase.from("payments").insert([payload]);

    if (ins.error) {
      setError(ins.error);
      toast("فشل حفظ الدفعة.", "danger");
      return;
    }

    toast("تم حفظ الدفعة.", "ok");
    setOpenAdd(false);
    await loadPayments();
  }

  async function deletePayment(id) {
    const d = await supabase.from("payments").delete().eq("id", id);
    if (d.error) {
      setError(d.error);
      toast("فشل حذف الدفعة.", "danger");
      return;
    }
    toast("تم حذف الدفعة.", "ok");
    await loadPayments();
  }

  return (
    <div className="container page page--payments" dir="rtl" lang="ar">
      <PageHeader
        title="المدفوعات"
        subtitle={`الفترة: ${rangeHint}`}
        actions={
          <div className="toolbar">
            <button className="btn" onClick={loadPayments}>
              تحديث
            </button>
            <button className="btn primary" onClick={openAddModal}>
              <Plus size={18} /> إضافة دفعة
            </button>
          </div>
        }
      />

      <ErrorBanner error={error} />

      {/* KPI Row */}
      <div className="kpiGrid4" style={{ marginBottom: 14 }}>
        <KpiCard
          icon={Banknote}
          label="إجمالي المقبوضات"
          value={`${fmtMoney(kpis.total)}₪`}
          hint="مجموع الدفعات في العرض الحالي"
          variant={kpis.total === 0 ? "neutral" : "info"}
          className="kpi--accent"
        />

        <KpiCard
          icon={CreditCard}
          label="عدد الدفعات"
          value={kpis.count}
          hint="عدد الدفعات في العرض الحالي"
          variant={kpis.count === 0 ? "neutral" : "info"}
          className="kpi--accent"
        />

        <KpiCard
          icon={Banknote}
          label="إجمالي الكاش"
          value={`${fmtMoney(kpis.cash)}₪`}
          hint="مجموع دفعات الكاش"
          variant={kpis.cash === 0 ? "neutral" : "ok"}
          className="kpi--accent"
        />

        <KpiCard
          icon={UserRound}
          label="عدد الدافعين"
          value={kpis.uniqChildren}
          hint={`متوسط الدفعة: ${fmtMoney(kpis.avg)}₪`}
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
                placeholder="ابحث عن دفعة..."
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
                placeholder="كل الطرق"
                options={[
                  { value: "all", label: "كل الطرق" },
                  { value: "cash", label: "كاش" },
                  { value: "card", label: "بطاقة" },
                  { value: "transfer", label: "تحويل بنكي" },
                  { value: "other", label: "أخرى" },
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
                placeholder="آخر 90 يوم"
                options={[
                  { value: "30d", label: "آخر 30 يوم" },
                  { value: "90d", label: "آخر 90 يوم" },
                  { value: "this_month", label: "هذا الشهر" },
                  { value: "custom", label: "مخصص" },
                ]}
              />
            </Control>

            {rangePreset === "custom" ? (
              <>
                <div className="filtersBar__date" style={{ minWidth: 160 }}>
                  <div className="label">من</div>
                  <input
                    className="input"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>

                <div className="filtersBar__date" style={{ minWidth: 160 }}>
                  <div className="label">إلى</div>
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
        <div className="card">جارٍ التحميل...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="لا توجد دفعات"
          description="غيّر الفلاتر أو أضف دفعة جديدة."
          actionLabel="إضافة دفعة"
          onAction={openAddModal}
          secondaryLabel="تصفير الفلاتر"
          onSecondary={() => {
            setSearch("");
            setMethod("all");
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
                <th>وقت الدفع</th>
                <th>الطفل</th>
                <th>الدورة</th>
                <th>المجموعة</th>
                <th>المبلغ</th>
                <th>الطريقة</th>
                <th>ملاحظة</th>
                <th style={{ width: 1 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
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
                        {p.run_label ?? `مجموعة #${p.run_id}`}
                      </button>
                    ) : (
                      <span>{p.run_label ?? "—"}</span>
                    )}
                  </td>

                  <td style={{ fontWeight: 950 }}>{fmtMoney(p.amount)}₪</td>
                  <td>{methodLabel(p.method)}</td>

                  <td style={{ maxWidth: 320 }}>
                    <span
                      style={{
                        display: "inline-block",
                        maxWidth: 320,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={p.note ?? ""}
                    >
                      {p.note ?? "—"}
                    </span>
                  </td>

                  <td style={{ width: 1 }}>
                    <IconButton
                      icon={Trash2}
                      label=""
                      title="حذف"
                      iconOnly
                      onClick={() => setConfirm({ open: true, id: p.id })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Payment Modal */}
      <Modal
        open={openAdd}
        title="إضافة دفعة"
        onClose={() => setOpenAdd(false)}
      >
        <div style={{ padding: 16 }}>
          {pickerLoading ? (
            <div className="card">جارٍ التحميل...</div>
          ) : (
            <>
              <div className="grid" style={{ marginBottom: 12 }}>
                <div style={{ gridColumn: "span 6" }}>
                  <div
                    className="muted"
                    style={{ fontWeight: 900, marginBottom: 6 }}
                  >
                    الطفل
                  </div>
                  <ModernSelect
                    value={payChildId}
                    onChange={(v) => {
                      setPayChildId(v);
                      setPayEnrollmentId("");

                      // Auto-select if only one active enrollment
                      const opts = enrollments
                        .filter((e) => String(e.child_id) === String(v))
                        .filter((e) => e.enrollment_status === "active");
                      if (opts.length === 1)
                        setPayEnrollmentId(String(opts[0].enrollment_id));
                    }}
                    menuWidth="trigger"
                    placeholder="اختر طفلاً..."
                    options={childOptions}
                  />
                </div>

                <div style={{ gridColumn: "span 6" }}>
                  <div
                    className="muted"
                    style={{ fontWeight: 900, marginBottom: 6 }}
                  >
                    الاشتراك
                  </div>
                  <ModernSelect
                    value={payEnrollmentId}
                    onChange={setPayEnrollmentId}
                    menuWidth="trigger"
                    disabled={!payChildId}
                    placeholder={
                      payChildId ? "اختر اشتراكًا..." : "اختر الطفل أولاً"
                    }
                    options={enrollmentOptions}
                  />
                </div>
              </div>

              <div className="grid" style={{ marginBottom: 12 }}>
                <div style={{ gridColumn: "span 4" }}>
                  <div
                    className="muted"
                    style={{ fontWeight: 900, marginBottom: 6 }}
                  >
                    المبلغ
                  </div>
                  <Control>
                    <input
                      type="number"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="120"
                    />
                    <span className="muted" style={{ fontWeight: 950 }}>
                      ₪
                    </span>
                  </Control>

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
                      { value: "cash", label: "كاش" },
                      { value: "card", label: "بطاقة" },
                      { value: "transfer", label: "تحويل بنكي" },
                      { value: "other", label: "أخرى" },
                    ]}
                  />
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <div
                    className="muted"
                    style={{ fontWeight: 900, marginBottom: 6 }}
                  >
                    وقت الدفع
                  </div>
                  <Control>
                    <input
                      type="datetime-local"
                      value={payAt}
                      onChange={(e) => setPayAt(e.target.value)}
                    />
                  </Control>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div
                  className="muted"
                  style={{ fontWeight: 900, marginBottom: 6 }}
                >
                  ملاحظة (اختياري)
                </div>
                <Control>
                  <input
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                    placeholder=""
                  />
                </Control>
              </div>

              <div className="row" style={{ gap: 10 }}>
                <button className="btn primary" onClick={createPayment}>
                  <Plus size={18} /> حفظ
                </button>
                <button className="btn" onClick={() => setOpenAdd(false)}>
                  إلغاء
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        title="حذف الدفعة"
        message="متأكد بدك تحذف الدفعة؟ ما في رجعة."
        confirmText="حذف"
        cancelText="إلغاء"
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
