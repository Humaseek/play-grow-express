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
 const c = (r.category || " ").trim() || " ";
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
 toast(" .", "warn");
 return;
 }
 if (!amount || amount <= 0) {
 toast(" .", "warn");
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
 toast("Failed Edit .", "danger");
 return;
 }
 toast(" Edit .", "ok");
 } else {
 const ins = await supabase.from("expenses").insert([payload]);
 if (ins.error) {
 setError(ins.error);
 toast("Failed Enroll .", "danger");
 return;
 }
 toast(" Enroll .", "ok");
 }

 setOpenAdd(false);
 await load();
 }

 async function deleteExpense(id) {
 const d = await supabase.from("expenses").delete().eq("id", id);
 if (d.error) {
 setError(d.error);
 toast("Failed Delete .", "danger");
 return;
 }
 toast(" Delete .", "ok");
 await load();
 }

 return (
 <div className="container page page--expenses">
 <PageHeader
 title=""
 subtitle="Enroll "
 actions={
 <div className="toolbar">
 <button className="btn" onClick={load}>
 Refresh
 </button>
 <button className="btn primary" onClick={openCreate}>
 <Plus size={18} /> Enroll 
 </button>
 </div>
 }
 />

 <ErrorBanner error={error} />

 {!hasTable ? (
 <div className="card">
 <EmptyState
 icon={AlertTriangle}
 title=" "
 description=" ."
 />
</div>
 ) : (
 <>
 <div className="kpiGrid4" style={{ marginBottom: 14 }}>
 <KpiCard
 icon={Receipt}
 label=" "
 value={`${fmtMoney(stats.total)} ₪`}
 hint={stats.count ? ` : ${stats.count}` : "No "}
 variant={stats.total === 0 ? "neutral" : "warn"}
 className="kpi--accent"
 />

 <KpiCard
 icon={Layers}
 label=" "
 value={stats.topCat}
 hint={stats.topCat !== "—" ? `${fmtMoney(stats.topCatTotal)} ₪` : "—"}
 variant={stats.topCat !== "—" ? "info" : "neutral"}
 className="kpi--accent"
 />

 <KpiCard
 icon={Banknote}
 label=" "
 value={`${fmtMoney(stats.avg)} ₪`}
 hint={stats.count ? " " : "—"}
 variant={stats.avg === 0 ? "neutral" : "info"}
 className="kpi--accent"
 />

 <KpiCard
 icon={Banknote}
 label=" "
 value={`${fmtMoney(stats.max)} ₪`}
 hint={stats.max === 0 ? "—" : " "}
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
 placeholder="Search ( / )"
 />
 </Control>

 <Control icon={Filter} style={{ minWidth: 180, width: "auto", flex: "0 0 auto" }}>
 <ModernSelect
 bare
 value={cat}
 onChange={setCat}
 placeholder=" "
 options={[
 { value: "all", label: " " },
 ...categories.map((c) => ({ value: c, label: c })),
 ]}
 />
 </Control>

 <Control icon={CalendarDays} style={{ minWidth: 180, width: "auto", flex: "0 0 auto" }}>
 <ModernSelect
 bare
 value={rangePreset}
 onChange={setRangePreset}
 placeholder=" "
 options={[
 { value: "this_month", label: " " },
 { value: "30d", label: " 30 " },
 { value: "custom", label: "" },
 { value: "all", label: "" },
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
 <button className="btn" onClick={load}></button>
 </div>
 ) : null}
 </div>
 </div>
 </div>

 {loading ? (
 <div className="card">Loading...</div>
 ) : filtered.length === 0 ? (
 <EmptyState
 icon={Receipt}
 title={rows.length === 0 ? "No " : "No "}
 description={
 rows.length === 0
 ? " Enroll ( No ...)."
 : " No Search."
 }
 actionLabel={rows.length === 0 ? " " : " "}
 onAction={openCreate}
 />
 ) : (
 <div className="tableWrap">
 <table className="table">
 <thead>
 <tr>
 <th>Date</th>
 <th></th>
 <th></th>
 <th>Amount</th>
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
 title="Edit"
 onClick={() => openEdit(r)}
 icon={Pencil}
 variant="soft"
 />
 <IconButton
 title="Delete"
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
 title={editId ? "Edit " : "Enroll "}
 onClose={() => setOpenAdd(false)}
 >
 <div className="card" style={{ border: "none", boxShadow: "none" }}>
 <div className="grid" style={{ marginBottom: 12 }}>
 <div style={{ gridColumn: "span 4" }}>
 <div className="label">Date</div>
 <div className="input">
 <input
 type="date"
 value={expDate}
 onChange={(e) => setExpDate(e.target.value)}
 />
 </div>
 </div>

 <div style={{ gridColumn: "span 4" }}>
 <div className="label">Amount (₪)</div>
 <div className="input">
 <input
 type="number"
 min="0"
 step="0.01"
 value={expAmount}
 onChange={(e) => setExpAmount(e.target.value)}
 placeholder=": 120"
 />
 </div>
 </div>

 <div style={{ gridColumn: "span 4" }}>
 <div className="label"></div>
 <div className="input">
 <input
 value={expCategory}
 onChange={(e) => setExpCategory(e.target.value)}
 placeholder=": / No / "
 />
 </div>
 </div>

 <div style={{ gridColumn: "span 12" }}>
 <div className="label"></div>
 <div className="input">
 <input
 value={expDesc}
 onChange={(e) => setExpDesc(e.target.value)}
 placeholder="Details "
 />
 </div>
 </div>
 </div>

 <div className="row" style={{ gap: 10 }}>
 <button className="btn primary" onClick={saveExpense}>
 <Plus size={18} /> Save
 </button>
 <button className="btn" onClick={() => setOpenAdd(false)}>
 Cancel
 </button>
 </div>
 </div>
 </Modal>

 <ConfirmDialog
 open={confirm.open}
 title="Delete "
 message=" Delete "
 confirmText="Delete"
 cancelText="Cancel"
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
