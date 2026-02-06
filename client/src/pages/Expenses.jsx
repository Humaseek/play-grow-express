import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
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

import {
  Receipt,
  CalendarDays,
  Banknote,
  Layers,
  Plus,
  Trash2,
  Pencil,
  Search,
  Filter,
  AlertTriangle,
} from "lucide-react";

function fmtMoney(n) {
  const x = Number(n || 0);
  return x.toLocaleString("ar", { maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("ar", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function isoDate(d) {
  // YYYY-MM-DD
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const da = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function startOfMonth(d = new Date()) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export default function Expenses() {
  const { toast } = useOutletContext();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasTable, setHasTable] = useState(true);

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [rangePreset, setRangePreset] = useState("this_month");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [openAdd, setOpenAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [expDate, setExpDate] = useState(isoDate(new Date()));
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("");
  const [expDesc, setExpDesc] = useState("");

  const [confirm, setConfirm] = useState({ open: false, id: null });

  function computeRange() {
    if (rangePreset === "all") return { from: null, to: null };
    const now = new Date();

    if (rangePreset === "this_month") {
      const from = startOfMonth(now);
      const to = addDays(new Date(from), 32);
      to.setDate(1);
      to.setHours(0, 0, 0, 0);
      return { from: isoDate(from), to: isoDate(addDays(to, -1)) };
    }

    if (rangePreset === "30d") {
      const from = addDays(now, -30);
      return { from: isoDate(from), to: isoDate(now) };
    }

    if (rangePreset === "custom") {
      if (!fromDate || !toDate) return { from: null, to: null };
      return { from: fromDate, to: toDate };
    }

    return { from: null, to: null };
  }

  async function load() {
    setLoading(true);
    setError(null);

    const { from, to } = computeRange();

    let query = supabase
      .from("expenses")
      .select("id,spent_on,amount,category,description,created_at")
      .order("spent_on", { ascending: false })
      .order("id", { ascending: false });

    if (from) query = query.gte("spent_on", from);
    if (to) query = query.lte("spent_on", to);

    const res = await query;

    if (res.error) {
      // table missing?
      const msg = String(res.error.message || "");
      if (msg.toLowerCase().includes("does not exist")) {
        setHasTable(false);
      }
      setError(res.error);
      setRows([]);
      setLoading(false);
      return;
    }

    setHasTable(true);
    setRows(res.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangePreset]);

  const categories = useMemo(() => {
    const s = new Set();
    for (const r of rows) {
      const c = (r.category || "").trim();
      if (c) s.add(c);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, "ar"));
  }, [rows]);

  const filtered = useMemo(() => {
    let list = [...rows];
    const s = q.trim().toLowerCase();
    if (s) {
      list = list.filter((r) => {
        const a = String(r.category || "").toLowerCase();
        const b = String(r.description || "").toLowerCase();
        return a.includes(s) || b.includes(s);
      });
    }
    if (cat !== "all") {
      list = list.filter((r) => String(r.category || "") === cat);
    }
    return list;
  }, [rows, q, cat]);

  const stats = useMemo(() => {
    const total = filtered.reduce((acc, r) => acc + Number(r.amount || 0), 0);
    const count = filtered.length;
    const avg = count === 0 ? 0 : total / count;
    const max = filtered.reduce((m, r) => Math.max(m, Number(r.amount || 0)), 0);

    const byCat = new Map();
    for (const r of filtered) {
      const c = (r.category || "ללא קטגוריה").trim() || "ללא קטגוריה";
      byCat.set(c, (byCat.get(c) || 0) + Number(r.amount || 0));
    }
    const top = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1])[0];

    return {
      total,
      count,
      avg,
      max,
      topCat: top ? top[0] : "—",
      topCatTotal: top ? top[1] : 0,
    };
  }, [filtered]);

  function resetForm() {
    setExpDate(isoDate(new Date()));
    setExpAmount("");
    setExpCategory("");
    setExpDesc("");
    setEditId(null);
  }

  function openCreate() {
    resetForm();
    setOpenAdd(true);
  }

  function openEdit(row) {
    setEditId(row.id);
    setExpDate(row.spent_on ? String(row.spent_on) : isoDate(new Date()));
    setExpAmount(String(row.amount ?? ""));
    setExpCategory(String(row.category ?? ""));
    setExpDesc(String(row.description ?? ""));
    setOpenAdd(true);
  }

  async function saveExpense() {
    const amount = Number(expAmount);
    if (!expDate) {
      toast("בחר תאריך הוצאה.", "warn");
      return;
    }
    if (!amount || amount <= 0) {
      toast("הזן סכום תקין.", "warn");
      return;
    }

    const payload = {
      spent_on: expDate,
      amount,
      category: expCategory?.trim() || null,
      description: expDesc?.trim() || null,
    };

    if (editId) {
      const up = await supabase.from("expenses").update(payload).eq("id", editId);
      if (up.error) {
        setError(up.error);
        toast("עדכון ההוצאה נכשל.", "danger");
        return;
      }
      toast("ההוצאה עודכנה.", "ok");
    } else {
      const ins = await supabase.from("expenses").insert([payload]);
      if (ins.error) {
        setError(ins.error);
        toast("רישום ההוצאה נכשל.", "danger");
        return;
      }
      toast("ההוצאה נרשמה.", "ok");
    }

    setOpenAdd(false);
    await load();
  }

  async function deleteExpense(id) {
    const d = await supabase.from("expenses").delete().eq("id", id);
    if (d.error) {
      setError(d.error);
      toast("מחיקת ההוצאה נכשלה.", "danger");
      return;
    }
    toast("ההוצאה נמחקה.", "ok");
    await load();
  }

  return (
    <div className="container page page--expenses">
      <PageHeader
        title="הוצאות"
        subtitle="רישום ומעקב אחר הוצאות תפעול"
        actions={
          <div className="toolbar">
            <button className="btn" onClick={load}>
              רענן
            </button>
            <button className="btn primary" onClick={openCreate}>
              <Plus size={18} /> רישום הוצאה
            </button>
          </div>
        }
      />

      <ErrorBanner error={error} />

      {!hasTable ? (
        <div className="card">
          <EmptyState
            icon={AlertTriangle}
            title="טבלת הוצאות לא מוכנה"
            description="הפעל את מיגרציית בסיס הנתונים פעם אחת, ואז ההוצאות יופיעו כאן."
          />
</div>
      ) : (
        <>
          <div className="kpiGrid4" style={{ marginBottom: 14 }}>
            <KpiCard
              icon={Receipt}
              label="סה"כ הוצאות"
              value={`${fmtMoney(stats.total)} ₪`}
              hint={stats.count ? `عدد القيود: ${stats.count}` : "לא توجد قيود"}
              variant={stats.total === 0 ? "neutral" : "warn"}
              className="kpi--accent"
            />

            <KpiCard
              icon={Layers}
              label="קטגוריה מובילה"
              value={stats.topCat}
              hint={stats.topCat !== "—" ? `${fmtMoney(stats.topCatTotal)} ₪` : "—"}
              variant={stats.topCat !== "—" ? "info" : "neutral"}
              className="kpi--accent"
            />

            <KpiCard
              icon={Banknote}
              label="ממוצע הוצאה"
              value={`${fmtMoney(stats.avg)} ₪`}
              hint={stats.count ? "לכל רשומה" : "—"}
              variant={stats.avg === 0 ? "neutral" : "info"}
              className="kpi--accent"
            />

            <KpiCard
              icon={Banknote}
              label="ההוצאה הגדולה ביותר"
              value={`${fmtMoney(stats.max)} ₪`}
              hint={stats.max === 0 ? "—" : "ערך מקסימלי במסנן הנוכחי"}
              variant={stats.max === 0 ? "neutral" : "danger"}
              className="kpi--accent"
            />
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            <div className="toolbar" style={{ justifyContent: "space-between" }}>
              <div className="filtersBar">
                <Control icon={Search} className="" style={{ minWidth: 260, width: "auto", flex: "1 1 320px" }}>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="חיפוש (תיאור / קטגוריה)"
                  />
                </Control>

                <Control icon={Filter} style={{ minWidth: 180, width: "auto", flex: "0 0 auto" }}>
                  <ModernSelect
                    bare
                    value={cat}
                    onChange={setCat}
                    placeholder="כל הקטגוריות"
                    options={[
                      { value: "all", label: "כל הקטגוריות" },
                      ...categories.map((c) => ({ value: c, label: c })),
                    ]}
                  />
                </Control>

                <Control icon={CalendarDays} style={{ minWidth: 180, width: "auto", flex: "0 0 auto" }}>
                  <ModernSelect
                    bare
                    value={rangePreset}
                    onChange={setRangePreset}
                    placeholder="החודש"
                    options={[
                      { value: "this_month", label: "החודש" },
                      { value: "30d", label: "30 הימים האחרונים" },
                      { value: "custom", label: "מוקצה" },
                      { value: "all", label: "הכול" },
                    ]}
                  />
                </Control>

                {rangePreset === "custom" ? (
                  <div className="filtersBar" style={{ justifyContent: "flex-start" }}>
                    <div className="input">
                      <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                    </div>
                    <div className="input">
                      <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                    </div>
                    <button className="btn" onClick={load}>تطبيق</button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="card">טוען...</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={rows.length === 0 ? "אין הוצאות עדיין" : "אין תוצאות"}
              description={
                rows.length === 0
                  ? "התחל ברישום הוצאות תפעול (שכירות, נסיעות, ציוד, שיווק...)."
                  : "נסה לשנות את המסננים או את החיפוש."
              }
              actionLabel={rows.length === 0 ? "רשום הוצאה ראשונה" : "רשום הוצאה"}
              onAction={openCreate}
            />
          ) : (
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>תאריך</th>
                    <th>التصنيف</th>
                    <th>الوصف</th>
                    <th>סכום</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td style={{ whiteSpace: "nowrap" }}>{fmtDate(r.spent_on)}</td>
                      <td>{r.category || <span className="muted">—</span>}</td>
                      <td style={{ minWidth: 260 }}>
                        {r.description || <span className="muted">—</span>}
                      </td>
                      <td style={{ fontWeight: 950, whiteSpace: "nowrap" }}>
                        {fmtMoney(r.amount)} ₪
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <div className="row" style={{ justifyContent: "flex-end" }}>
                          <IconButton
                            title="עריכה"
                            onClick={() => openEdit(r)}
                            icon={Pencil}
                            variant="soft"
                          />
                          <IconButton
                            title="מחיקה"
                            onClick={() => setConfirm({ open: true, id: r.id })}
                            icon={Trash2}
                            variant="danger"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <Modal
        open={openAdd}
        title={editId ? "עריכת הוצאה" : "רישום הוצאה"}
        onClose={() => setOpenAdd(false)}
      >
        <div className="card" style={{ border: "none", boxShadow: "none" }}>
          <div className="grid" style={{ marginBottom: 12 }}>
            <div style={{ gridColumn: "span 4" }}>
              <div className="label">תאריך</div>
              <div className="input">
                <input
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                />
              </div>
            </div>

            <div style={{ gridColumn: "span 4" }}>
              <div className="label">סכום (₪)</div>
              <div className="input">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  placeholder="לדוגמה: 120"
                />
              </div>
            </div>

            <div style={{ gridColumn: "span 4" }}>
              <div className="label">التصنيف</div>
              <div className="input">
                <input
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  placeholder="לדוגמה: שכירות / נסיעות / ציוד"
                />
              </div>
            </div>

            <div style={{ gridColumn: "span 12" }}>
              <div className="label">الوصف</div>
              <div className="input">
                <input
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  placeholder="פרטי הוצאה"
                />
              </div>
            </div>
          </div>

          <div className="row" style={{ gap: 10 }}>
            <button className="btn primary" onClick={saveExpense}>
              <Plus size={18} /> שמור
            </button>
            <button className="btn" onClick={() => setOpenAdd(false)}>
              ביטול
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        title="מחיקת הוצאה"
        message="האם אתה בטוח שברצונך למחוק הוצאה זו?"
        confirmText="מחיקה"
        cancelText="ביטול"
        danger
        onCancel={() => setConfirm({ open: false, id: null })}
        onConfirm={async () => {
          const id = confirm.id;
          setConfirm({ open: false, id: null });
          if (id) await deleteExpense(id);
        }}
      />
    </div>
  );
}
