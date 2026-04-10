import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import PageHeader from "../components/PageHeader";
import ErrorBanner from "../components/ErrorBanner";
import KpiCard from "../components/KpiCard";
import {
  TrendingUp, TrendingDown, Banknote, Users, BarChart2,
  ShoppingCart, Briefcase, Globe, BookOpen, RefreshCw,
} from "lucide-react";

/* ─────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────── */
function fmtMoney(n) {
  return Number(n || 0).toLocaleString("en", { maximumFractionDigits: 2 });
}
function fmtMoneyShort(n) {
  n = Number(n || 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}م`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return Math.round(n).toString();
}
function fmtDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function monthLabel(iso) {
  const [y, m] = iso.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString("ar", {
    month: "short", year: "2-digit",
  });
}

/* ─────────────────────────────────────────────────
   DATE PRESETS
───────────────────────────────────────────────── */
const PRESETS = [
  { label: "هذا الشهر",    key: "this_month" },
  { label: "الشهر الماضي", key: "last_month" },
  { label: "آخر 3 أشهر",  key: "last_3m" },
  { label: "آخر 6 أشهر",  key: "last_6m" },
  { label: "هذه السنة",    key: "this_year" },
  { label: "السنة الماضية",key: "last_year" },
  { label: "الكل",          key: "all" },
  { label: "مخصص",         key: "custom" },
];

function getPresetRange(key) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const eom = (yr, mo) => {
    const d = new Date(yr, mo + 1, 0);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const som = (yr, mo) => `${yr}-${String(mo+1).padStart(2,"0")}-01`;
  switch (key) {
    case "this_month":  return { from: som(y, m), to: eom(y, m) };
    case "last_month":  { const lm = m===0?11:m-1, ly = m===0?y-1:y; return { from: som(ly,lm), to: eom(ly,lm) }; }
    case "last_3m":     { const s = new Date(y, m-2, 1); return { from: som(s.getFullYear(), s.getMonth()), to: eom(y,m) }; }
    case "last_6m":     { const s = new Date(y, m-5, 1); return { from: som(s.getFullYear(), s.getMonth()), to: eom(y,m) }; }
    case "this_year":   return { from: `${y}-01-01`, to: `${y}-12-31` };
    case "last_year":   return { from: `${y-1}-01-01`, to: `${y-1}-12-31` };
    default:            return { from: "2000-01-01", to: "2099-12-31" };
  }
}

/* ─────────────────────────────────────────────────
   CHART PALETTE
───────────────────────────────────────────────── */
const PALETTE = [
  "#00ac47","#3b82f6","#f59e0b","#ef4444","#8b5cf6",
  "#06b6d4","#ec4899","#14b8a6","#f97316","#84cc16","#64748b","#a855f7",
];

/* ─────────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────────── */

/* ── Card shell ── */
function Card({ children, style }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 20,
      padding: "22px 24px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
      border: "1px solid rgba(15,23,42,0.06)",
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ── Card sub-title ── */
function CardTitle({ children, action }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18, direction:"rtl" }}>
      <span style={{ fontSize:14, fontWeight:800, color:"#475569" }}>{children}</span>
      {action && <span style={{ fontSize:12, color:"#94a3b8", fontWeight:700 }}>{action}</span>}
    </div>
  );
}

/* ── Section header ── */
function SectionHeader({ icon: Icon, children, color = "#00ac47" }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:10, direction:"rtl",
      marginBottom:16, paddingRight:4,
    }}>
      <div style={{
        width:38, height:38, borderRadius:12,
        background:`${color}18`,
        display:"flex", alignItems:"center", justifyContent:"center",
        color, flexShrink:0,
      }}>
        <Icon size={19} />
      </div>
      <h2 style={{ margin:0, fontSize:18, fontWeight:900, color:"#1e293b" }}>{children}</h2>
    </div>
  );
}

/* ── Empty placeholder ── */
function Empty() {
  return (
    <div style={{ textAlign:"center", padding:"28px 0", color:"#cbd5e1", fontWeight:700, fontSize:13 }}>
      لا توجد بيانات للفترة المحددة
    </div>
  );
}

/* ── Horizontal bar chart ── */
function HBar({ data, accentColor = "#00ac47", maxItems = 10 }) {
  if (!data.length) return <Empty />;
  const items = data.slice(0, maxItems);
  const max = Math.max(...items.map(d => d.value), 1);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display:"flex", alignItems:"center", gap:10, direction:"rtl" }}>
          <div style={{
            width:130, fontSize:13, fontWeight:700, color:"#334155",
            textAlign:"right", flexShrink:0,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
          }}>
            {item.label || "غير محدد"}
          </div>
          <div style={{ flex:1, background:"#f1f5f9", borderRadius:7, height:26, overflow:"hidden" }}>
            <div style={{
              width:`${Math.max((item.value / max) * 100, item.value > 0 ? 2 : 0)}%`,
              background:`linear-gradient(90deg, ${accentColor}bb, ${accentColor})`,
              height:"100%", borderRadius:7,
              transition:"width 0.7s cubic-bezier(.4,0,.2,1)",
            }} />
          </div>
          <div style={{
            width:80, fontSize:13, fontWeight:800, color:"#1e293b",
            textAlign:"left", flexShrink:0,
          }}>
            {fmtMoney(item.value)} ₪
          </div>
          {item.pct != null && (
            <div style={{ width:38, fontSize:12, color:"#94a3b8", fontWeight:700, textAlign:"left", flexShrink:0 }}>
              {item.pct}%
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Donut chart (SVG) ── */
function DonutChart({ data, size = 190 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:size }}>
      <Empty />
    </div>
  );

  const cx = size / 2, cy = size / 2;
  const R = size * 0.40, r = size * 0.24;
  const GAP = data.length > 1 ? 0.025 : 0;
  let angle = -Math.PI / 2;

  const slices = data.map((d) => {
    const frac = d.value / total;
    const sweep = frac * 2 * Math.PI - GAP;
    if (sweep <= 0) return null;
    const sA = angle + GAP / 2, eA = sA + sweep;
    angle += frac * 2 * Math.PI;
    const x1 = cx + R*Math.cos(sA), y1 = cy + R*Math.sin(sA);
    const x2 = cx + R*Math.cos(eA), y2 = cy + R*Math.sin(eA);
    const ix1= cx + r*Math.cos(sA), iy1= cy + r*Math.sin(sA);
    const ix2= cx + r*Math.cos(eA), iy2= cy + r*Math.sin(eA);
    const lg = sweep > Math.PI ? 1 : 0;
    const path = `M${x1} ${y1} A${R} ${R} 0 ${lg} 1 ${x2} ${y2} L${ix2} ${iy2} A${r} ${r} 0 ${lg} 0 ${ix1} ${iy1}Z`;
    return { path, color: d.color, label: d.label, value: d.value, pct: (frac*100).toFixed(1) };
  }).filter(Boolean);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color} opacity={0.9}>
          <title>{s.label}: {fmtMoney(s.value)} ₪ ({s.pct}%)</title>
        </path>
      ))}
      <circle cx={cx} cy={cy} r={r - 2} fill="white" />
      <text x={cx} y={cy-9}  textAnchor="middle" fontSize={13} fontWeight={900} fill="#1e293b">{fmtMoneyShort(total)}</text>
      <text x={cx} y={cy+10} textAnchor="middle" fontSize={10} fill="#94a3b8">₪ إجمالي</text>
    </svg>
  );
}

/* ── Area trend chart (SVG) ── */
function TrendChart({ data }) {
  if (!data.length) return <Empty />;
  const W = 620, H = 200;
  const pad = { top:20, right:20, bottom:36, left:58 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top  - pad.bottom;
  const n = data.length;
  const allVals = data.flatMap(d => [d.income, d.expense]);
  const maxVal  = Math.max(...allVals, 1);

  const xAt = i => pad.left + (n===1 ? cW/2 : (i/(n-1))*cW);
  const yAt = v => pad.top  + cH - (v/maxVal)*cH;

  const lineStr  = pts => pts.map((p,i) => `${i===0?"M":"L"}${xAt(i)} ${yAt(p)}`).join(" ");
  const areaStr  = (pts) => `${lineStr(pts)} L${xAt(n-1)} ${pad.top+cH} L${xAt(0)} ${pad.top+cH}Z`;

  const incPts = data.map(d => d.income);
  const expPts = data.map(d => d.expense);
  const hasExp = expPts.some(v => v > 0);

  const gridLevels = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:"auto", maxHeight:200, display:"block" }}>
      <defs>
        <linearGradient id="an-g-inc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#00ac47" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#00ac47" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="an-g-exp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ef4444" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* grid */}
      {gridLevels.map((f, i) => {
        const gv = maxVal * (1 - f);
        const gy = yAt(gv);
        return (
          <g key={i}>
            <line x1={pad.left} y1={gy} x2={W-pad.right} y2={gy}
              stroke="#f1f5f9" strokeWidth={f===0 ? 1.5 : 1} />
            <text x={pad.left-5} y={gy} textAnchor="end" dominantBaseline="middle"
              fontSize={9} fill="#94a3b8">{fmtMoneyShort(gv)}</text>
          </g>
        );
      })}

      {/* income area + line */}
      {n > 1 && <path d={areaStr(incPts)} fill="url(#an-g-inc)" />}
      {n > 1 && <path d={lineStr(incPts)} fill="none" stroke="#00ac47" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}

      {/* expense area + line */}
      {hasExp && n > 1 && <path d={areaStr(expPts)} fill="url(#an-g-exp)" />}
      {hasExp && n > 1 && <path d={lineStr(expPts)} fill="none" stroke="#ef4444" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray="5 3" />}

      {/* dots */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={xAt(i)} cy={yAt(d.income)} r={4} fill="#fff" stroke="#00ac47" strokeWidth={2}>
            <title>{monthLabel(d.month)}: دخل {fmtMoney(d.income)} ₪</title>
          </circle>
          {d.expense > 0 && (
            <circle cx={xAt(i)} cy={yAt(d.expense)} r={3.5} fill="#fff" stroke="#ef4444" strokeWidth={2}>
              <title>{monthLabel(d.month)}: مصاريف {fmtMoney(d.expense)} ₪</title>
            </circle>
          )}
        </g>
      ))}

      {/* x labels */}
      {data.map((d, i) => (
        <text key={i} x={xAt(i)} y={H-5} textAnchor="middle" fontSize={9} fill="#94a3b8">
          {monthLabel(d.month)}
        </text>
      ))}

      {/* legend */}
      <g transform={`translate(${W - pad.right - 115}, ${pad.top - 4})`}>
        <circle cx={7} cy={7} r={4} fill="#00ac47" />
        <text x={15} y={11} fontSize={10} fill="#334155">دخل</text>
        <circle cx={60} cy={7} r={4} fill="#ef4444" />
        <text x={68} y={11} fontSize={10} fill="#334155">مصاريف</text>
      </g>
    </svg>
  );
}

/* ── Ranked list ── */
function RankedList({ data }) {
  if (!data.length) return <Empty />;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6, direction:"rtl" }}>
      {data.slice(0, 10).map((item, i) => (
        <div key={i} style={{
          display:"flex", alignItems:"center", gap:12,
          padding:"8px 12px",
          background: i % 2 === 0 ? "#f8fafc" : "#fff",
          borderRadius:10,
        }}>
          <span style={{
            width:24, height:24, borderRadius:"50%",
            background: i < 3 ? "#00ac47" : "#e2e8f0",
            color: i < 3 ? "#fff" : "#64748b",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:11, fontWeight:900, flexShrink:0,
          }}>{i + 1}</span>
          <span style={{ flex:1, fontSize:13, fontWeight:700, color:"#334155" }}>
            {item.label || "غير محدد"}
          </span>
          <span style={{ fontSize:13, fontWeight:800, color:"#1e293b" }}>
            {fmtMoney(item.value)} ₪
          </span>
          {item.pct != null && (
            <span style={{ fontSize:12, color:"#94a3b8", fontWeight:700, minWidth:36, textAlign:"left" }}>
              {item.pct}%
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   CSS
───────────────────────────────────────────────── */
const CSS = `
.an-page { direction: rtl; }

/* filter bar */
.an-filter-bar {
  display: flex; flex-wrap: wrap;
  align-items: center; gap: 8px;
  padding: 4px 0 26px;
}
.an-preset {
  padding: 7px 15px; border-radius: 10px;
  border: 1.5px solid #e2e8f0; background: #fff;
  font-size: 13px; font-weight: 700; color: #475569;
  cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.an-preset:hover { border-color: #00ac47; color: #00ac47; }
.an-preset.an-active { background: #00ac47; color: #fff; border-color: #00ac47; }

.an-custom-dates {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 14px; background: #fff;
  border: 1.5px solid #e2e8f0; border-radius: 10px;
}
.an-custom-dates input {
  border: none; outline: none; background: transparent;
  font-size: 13px; color: #334155; font-weight: 700; cursor: pointer;
}

/* grids */
.an-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 14px; margin-bottom: 28px;
}
.an-section { margin-bottom: 30px; }
.an-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.an-3col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 18px; }

/* donut layout */
.an-donut-row {
  display: flex; align-items: flex-start; gap: 20px; direction: rtl;
}
.an-legend {
  flex: 1; display: flex; flex-direction: column; gap: 9px; direction: rtl;
}
.an-legend-item {
  display: flex; align-items: center; gap: 8px;
  font-size: 12.5px; font-weight: 700; color: #334155;
}
.an-legend-pct { margin-right: auto; font-size:12px; color:#94a3b8; }
.an-legend-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }

/* P&L table */
.an-pl-table { width:100%; border-collapse:collapse; direction:rtl; font-size:13px; }
.an-pl-table th {
  background:#f8fafc; color:#64748b; font-weight:800; font-size:12px;
  padding:10px 14px; border-bottom:2px solid #f1f5f9; text-align:right; white-space:nowrap;
}
.an-pl-table td { padding:11px 14px; border-bottom:1px solid #f8fafc; color:#334155; text-align:right; }
.an-pl-table tr:last-child td { border-bottom:none; }
.an-pl-table tr:hover td { background:#fafafa; }
.an-pos { color:#00ac47; font-weight:800; }
.an-neg { color:#ef4444; font-weight:800; }

/* progress mini bar */
.an-mini-bar { display:flex; align-items:center; gap:8px; }
.an-mini-track { flex:1; background:#f1f5f9; border-radius:5px; height:7px; overflow:hidden; }
.an-mini-fill  { height:100%; border-radius:5px; }

/* net badge */
.an-net-badge {
  display:inline-flex; align-items:center; gap:5px;
  padding:4px 10px; border-radius:8px;
  font-size:12px; font-weight:800;
}

@media (max-width: 720px) {
  .an-2col, .an-3col { grid-template-columns:1fr; }
  .an-donut-row { flex-direction:column; align-items:center; }
}
`;

let _styleInjected = false;
function injectStyles() {
  if (_styleInjected) return;
  const el = document.createElement("style");
  el.textContent = CSS;
  document.head.appendChild(el);
  _styleInjected = true;
}

/* ─────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────── */
export default function Analytics() {
  injectStyles();

  /* ── state ── */
  const [preset, setPreset]       = useState("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");
  const [loading, setLoading]     = useState(true);
  const [err,     setErr]         = useState(null);

  const [payments,      setPayments]      = useState([]);
  const [expenses,      setExpenses]      = useState([]);
  const [staffPayments, setStaffPayments] = useState([]);
  const [childMap,      setChildMap]      = useState({}); // child_id → country

  /* ── resolved date range ── */
  const dateRange = useMemo(() => {
    if (preset === "custom") return { from: customFrom, to: customTo };
    return getPresetRange(preset);
  }, [preset, customFrom, customTo]);
  const { from, to } = dateRange;

  /* ── load ── */
  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [
        { data: pays,  error: e1 },
        { data: exps,  error: e2 },
        { data: staff, error: e3 },
        { data: kids,  error: e4 },
      ] = await Promise.all([
        supabase.from("payments_details_view")
          .select("amount, paid_at, child_id, course_id, course_title, run_id"),
        supabase.from("expenses")
          .select("id, spent_on, amount, category, party, item, run_id"),
        supabase.from("staff_salary_payments")
          .select("total_amount, date_to, expense_id"),
        supabase.from("children_view")
          .select("id, country"),
      ]);
      if (e1 || e2 || e3) throw e1 || e2 || e3;
      setPayments(pays  || []);
      setExpenses(exps  || []);
      setStaffPayments(staff || []);
      const cmap = {};
      for (const c of kids || []) { if (c.id) cmap[c.id] = c.country || "غير محدد"; }
      setChildMap(cmap);
    } catch (e) {
      setErr(e?.message || "حدث خطأ أثناء تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  /* ── filtered slices ── */
  const fPays = useMemo(() => {
    if (!from || !to) return payments;
    return payments.filter(p => { const d = p.paid_at?.slice(0,10); return d && d >= from && d <= to; });
  }, [payments, from, to]);

  const fExps = useMemo(() => {
    if (!from || !to) return expenses;
    return expenses.filter(e => e.spent_on && e.spent_on >= from && e.spent_on <= to);
  }, [expenses, from, to]);

  const fStaff = useMemo(() => {
    if (!from || !to) return staffPayments;
    return staffPayments.filter(s => s.date_to && s.date_to >= from && s.date_to <= to);
  }, [staffPayments, from, to]);

  /* ── KPIs ── */
  const kpi = useMemo(() => {
    const totalIncome   = fPays.reduce((s, p) => s + Number(p.amount || 0), 0);
    const staffExpIds   = new Set(staffPayments.map(s => s.expense_id).filter(Boolean));
    const totalExpenses = fExps.reduce((s, e) => s + Number(e.amount || 0), 0);
    const staffCost     = fStaff.reduce((s, p) => s + Number(p.total_amount || 0), 0);
    const nonStaffExp   = fExps.filter(e => !staffExpIds.has(e.id))
                               .reduce((s, e) => s + Number(e.amount || 0), 0);
    const netProfit     = totalIncome - nonStaffExp - staffCost;
    const activeStudents = new Set(fPays.map(p => p.child_id).filter(Boolean)).size;
    return { totalIncome, totalExpenses, staffCost, nonStaffExp, netProfit, activeStudents };
  }, [fPays, fExps, fStaff, staffPayments]);

  /* ── monthly trend ── */
  const monthlyTrend = useMemo(() => {
    const inc = {}, exp = {};
    for (const p of fPays) { const mo = p.paid_at?.slice(0,7); if (mo) inc[mo] = (inc[mo]||0) + Number(p.amount||0); }
    for (const e of fExps) { const mo = e.spent_on?.slice(0,7); if (mo) exp[mo] = (exp[mo]||0) + Number(e.amount||0); }
    const months = Array.from(new Set([...Object.keys(inc), ...Object.keys(exp)])).sort();
    return months.map(mo => ({ month: mo, income: inc[mo]||0, expense: exp[mo]||0 }));
  }, [fPays, fExps]);

  /* ── income by course ── */
  const incomeByCourse = useMemo(() => {
    const map = {};
    for (const p of fPays) {
      const k = p.course_title || "غير مصنف";
      map[k] = (map[k]||0) + Number(p.amount||0);
    }
    const total = Object.values(map).reduce((s,v)=>s+v,0);
    return Object.entries(map)
      .map(([label, value]) => ({ label, value, pct: total ? ((value/total)*100).toFixed(1) : 0 }))
      .sort((a,b) => b.value - a.value);
  }, [fPays]);

  /* ── income by country ── */
  const incomeByCountry = useMemo(() => {
    const map = {};
    for (const p of fPays) {
      const k = childMap[p.child_id] || "غير محدد";
      map[k] = (map[k]||0) + Number(p.amount||0);
    }
    const total = Object.values(map).reduce((s,v)=>s+v,0);
    return Object.entries(map)
      .map(([label, value]) => ({ label, value, pct: total ? ((value/total)*100).toFixed(1) : 0 }))
      .sort((a,b) => b.value - a.value);
  }, [fPays, childMap]);

  /* ── expenses by category ── */
  const expByCategory = useMemo(() => {
    const map = {};
    for (const e of fExps) { const k = e.category||"غير مصنف"; map[k] = (map[k]||0)+Number(e.amount||0); }
    const total = Object.values(map).reduce((s,v)=>s+v,0);
    return Object.entries(map)
      .map(([label, value], i) => ({
        label, value, color: PALETTE[i % PALETTE.length],
        pct: total ? ((value/total)*100).toFixed(1) : 0,
      }))
      .sort((a,b) => b.value - a.value);
  }, [fExps]);

  /* ── top parties ── */
  const topParties = useMemo(() => {
    const map = {};
    for (const e of fExps) { const k = e.party||"غير محدد"; map[k] = (map[k]||0)+Number(e.amount||0); }
    const total = Object.values(map).reduce((s,v)=>s+v,0);
    return Object.entries(map)
      .map(([label, value]) => ({ label, value, pct: total ? ((value/total)*100).toFixed(1) : 0 }))
      .sort((a,b) => b.value - a.value);
  }, [fExps]);

  /* ── top items ── */
  const topItems = useMemo(() => {
    const map = {};
    for (const e of fExps) { if (e.item) map[e.item] = (map[e.item]||0)+Number(e.amount||0); }
    const total = Object.values(map).reduce((s,v)=>s+v,0);
    return Object.entries(map)
      .map(([label, value]) => ({ label, value, pct: total ? ((value/total)*100).toFixed(1) : 0 }))
      .sort((a,b) => b.value - a.value);
  }, [fExps]);

  /* ── course P&L ── */
  const coursePL = useMemo(() => {
    // map run_id → course_id from all payments (not just filtered)
    const runCourse = {};
    for (const p of payments) { if (p.run_id && p.course_id) runCourse[p.run_id] = p.course_id; }

    const courseNames = {};
    const incMap = {}, expMap = {};
    for (const p of fPays) {
      if (!p.course_id) continue;
      incMap[p.course_id] = (incMap[p.course_id]||0) + Number(p.amount||0);
      courseNames[p.course_id] = p.course_title || `دورة #${p.course_id}`;
    }
    for (const e of fExps) {
      if (!e.run_id) continue;
      const cid = runCourse[e.run_id];
      if (!cid) continue;
      expMap[cid] = (expMap[cid]||0) + Number(e.amount||0);
    }
    const ids = new Set([...Object.keys(incMap), ...Object.keys(expMap)]);
    return Array.from(ids).map(cid => {
      const income  = incMap[cid]  || 0;
      const expense = expMap[cid]  || 0;
      const net     = income - expense;
      return { id: cid, name: courseNames[cid] || `دورة #${cid}`, income, expense, net };
    }).sort((a,b) => b.income - a.income);
  }, [fPays, fExps, payments]);

  /* ─── RENDER ─── */
  return (
    <div className="container an-page">
      <PageHeader
        title="التحليل المالي"
        subtitle="نظرة شاملة على الدخل والمصاريف والأداء المالي"
        actions={
          <button className="btn" onClick={load} disabled={loading}
            style={{ display:"flex", alignItems:"center", gap:6 }}>
            <RefreshCw size={15} style={loading ? { animation:"spin 1s linear infinite" } : {}} />
            {loading ? "جار التحميل..." : "تحديث"}
          </button>
        }
      />

      {err && <ErrorBanner message={err} onClose={() => setErr(null)} />}

      {/* ══ FILTER BAR ══ */}
      <div className="an-filter-bar">
        {PRESETS.map(p => (
          <button
            key={p.key}
            className={`an-preset${preset === p.key ? " an-active" : ""}`}
            onClick={() => setPreset(p.key)}
          >
            {p.label}
          </button>
        ))}
        {preset === "custom" && (
          <div className="an-custom-dates">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            <span style={{ color:"#cbd5e1", fontWeight:700 }}>—</span>
            <input type="date" value={customTo}   onChange={e => setCustomTo(e.target.value)} />
          </div>
        )}
        {from && to && preset !== "all" && preset !== "custom" && (
          <span style={{ fontSize:12, color:"#94a3b8", fontWeight:700, marginRight:"auto" }}>
            {fmtDate(from)} — {fmtDate(to)}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:"100px 0", color:"#94a3b8", fontWeight:800, fontSize:15 }}>
          جار تحميل البيانات...
        </div>
      ) : (
        <>
          {/* ══ 1. KPI SUMMARY ══ */}
          <div className="an-kpi-grid">
            <KpiCard icon={TrendingUp}   label="إجمالي الدخل"       value={`${fmtMoney(kpi.totalIncome)} ₪`}   hint="المبالغ المدفوعة" variant="ok" />
            <KpiCard icon={TrendingDown} label="المصاريف التشغيلية" value={`${fmtMoney(kpi.nonStaffExp)} ₪`}   hint="مصاريف المشغّل"   variant="warn" />
            <KpiCard icon={Briefcase}    label="تكاليف الموظفين"    value={`${fmtMoney(kpi.staffCost)} ₪`}     hint="رواتب مدفوعة"     variant="info" />
            <KpiCard icon={Banknote}     label="صافي الربح"         value={`${fmtMoney(kpi.netProfit)} ₪`}     hint="دخل − مصاريف − رواتب" variant={kpi.netProfit >= 0 ? "ok" : "danger"} />
            <KpiCard icon={Users}        label="طلاب نشطون"         value={kpi.activeStudents}                  hint="دفعوا خلال الفترة" variant="info" />
          </div>

          {/* ══ 2. MONTHLY TREND ══ */}
          <div className="an-section">
            <Card>
              <CardTitle action={`${monthlyTrend.length} شهر`}>التطور الشهري — الدخل مقابل المصاريف</CardTitle>
              <TrendChart data={monthlyTrend} />
            </Card>
          </div>

          {/* ══ 3. INCOME BREAKDOWN ══ */}
          <div className="an-section">
            <SectionHeader icon={BookOpen} color="#00ac47">تحليل الدخل</SectionHeader>
            <div className="an-2col">
              <Card>
                <CardTitle action={`${incomeByCourse.length} دورة`}>الدخل حسب الدورة</CardTitle>
                <HBar data={incomeByCourse} accentColor="#00ac47" />
              </Card>
              <Card>
                <CardTitle action={`${incomeByCountry.length} دولة`}>الدخل حسب الدولة</CardTitle>
                <HBar data={incomeByCountry} accentColor="#3b82f6" />
              </Card>
            </div>
          </div>

          {/* ══ 4. EXPENSE BREAKDOWN ══ */}
          <div className="an-section">
            <SectionHeader icon={ShoppingCart} color="#f59e0b">تحليل المصاريف</SectionHeader>
            <div className="an-2col" style={{ marginBottom:18 }}>

              {/* Donut */}
              <Card>
                <CardTitle>المصاريف حسب الفئة</CardTitle>
                <div className="an-donut-row">
                  <DonutChart data={expByCategory} size={180} />
                  <div className="an-legend">
                    {expByCategory.map((item, i) => (
                      <div key={i} className="an-legend-item">
                        <div className="an-legend-dot" style={{ background: item.color }} />
                        <span style={{ flex:1 }}>{item.label}</span>
                        <span className="an-legend-pct">{item.pct}%</span>
                      </div>
                    ))}
                    {!expByCategory.length && <Empty />}
                  </div>
                </div>
              </Card>

              {/* Top parties */}
              <Card>
                <CardTitle action="أعلى 10">أكثر الأشخاص والمتاجر إنفاقاً</CardTitle>
                <HBar data={topParties} accentColor="#f59e0b" />
              </Card>
            </div>

            {/* Top items */}
            <Card>
              <CardTitle action="أعلى 10">أكثر المنتجات والخدمات</CardTitle>
              <RankedList data={topItems} />
            </Card>
          </div>

          {/* ══ 5. COURSE P&L ══ */}
          {coursePL.length > 0 && (
            <div className="an-section">
              <SectionHeader icon={BarChart2} color="#8b5cf6">ربحية الدورات</SectionHeader>
              <Card>
                <div style={{ overflowX:"auto" }}>
                  <table className="an-pl-table">
                    <thead>
                      <tr>
                        <th>الدورة</th>
                        <th>الدخل</th>
                        <th>المصاريف</th>
                        <th>صافي الربح</th>
                        <th>هامش الربح</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coursePL.map(c => {
                        const margin = c.income > 0 ? (c.net / c.income) * 100 : 0;
                        const isPos  = c.net >= 0;
                        return (
                          <tr key={c.id}>
                            <td style={{ fontWeight:800 }}>{c.name}</td>
                            <td style={{ color:"#00ac47", fontWeight:800 }}>{fmtMoney(c.income)} ₪</td>
                            <td style={{ color:"#ef4444", fontWeight:700 }}>{fmtMoney(c.expense)} ₪</td>
                            <td>
                              <span className={`an-net-badge ${isPos ? "an-pos" : "an-neg"}`}
                                style={{ background: isPos ? "rgba(0,172,71,0.08)" : "rgba(239,68,68,0.08)" }}>
                                {isPos ? "+" : ""}{fmtMoney(c.net)} ₪
                              </span>
                            </td>
                            <td>
                              <div className="an-mini-bar">
                                <div className="an-mini-track">
                                  <div className="an-mini-fill" style={{
                                    width:`${Math.max(0, Math.min(100, Math.abs(margin)))}%`,
                                    background: isPos ? "#00ac47" : "#ef4444",
                                  }} />
                                </div>
                                <span style={{ fontSize:12, fontWeight:800, minWidth:44, textAlign:"left", color: isPos ? "#00ac47" : "#ef4444" }}>
                                  {margin.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ══ 6. STAFF COSTS ══ */}
          <div className="an-section">
            <SectionHeader icon={Briefcase} color="#06b6d4">تكاليف الموظفين</SectionHeader>
            <div className="an-2col">
              <Card>
                <CardTitle>الرواتب المدفوعة في الفترة</CardTitle>
                {fStaff.length === 0 ? <Empty /> : (
                  <div style={{ display:"flex", flexDirection:"column", gap:8, direction:"rtl" }}>
                    {fStaff.map((s, i) => (
                      <div key={i} style={{
                        display:"flex", justifyContent:"space-between", alignItems:"center",
                        padding:"8px 12px", background: i%2===0 ? "#f8fafc" : "#fff", borderRadius:10,
                      }}>
                        <span style={{ fontSize:12, color:"#64748b", fontWeight:700 }}>
                          حتى {fmtDate(s.date_to)}
                        </span>
                        <span style={{ fontSize:14, fontWeight:800, color:"#1e293b" }}>
                          {fmtMoney(s.total_amount)} ₪
                        </span>
                      </div>
                    ))}
                    <div style={{
                      display:"flex", justifyContent:"space-between", padding:"10px 12px",
                      borderTop:"2px solid #f1f5f9", marginTop:4,
                    }}>
                      <span style={{ fontSize:13, fontWeight:800, color:"#475569" }}>الإجمالي</span>
                      <span style={{ fontSize:15, fontWeight:900, color:"#06b6d4" }}>
                        {fmtMoney(kpi.staffCost)} ₪
                      </span>
                    </div>
                  </div>
                )}
              </Card>

              <Card>
                <CardTitle>نسبة تكاليف الموظفين من الدخل</CardTitle>
                {kpi.totalIncome > 0 ? (() => {
                  const pct = Math.min(100, (kpi.staffCost / kpi.totalIncome) * 100);
                  const expPct = Math.min(100 - pct, (kpi.nonStaffExp / kpi.totalIncome) * 100);
                  const netPct = Math.max(0, 100 - pct - expPct);
                  return (
                    <div style={{ direction:"rtl" }}>
                      {[
                        { label:"رواتب الموظفين", pct: pct.toFixed(1), color:"#06b6d4" },
                        { label:"مصاريف تشغيل",   pct: expPct.toFixed(1), color:"#f59e0b" },
                        { label:"صافي الربح",     pct: netPct.toFixed(1), color:kpi.netProfit>=0?"#00ac47":"#ef4444" },
                      ].map((row, i) => (
                        <div key={i} style={{ marginBottom:12 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                            <span style={{ fontSize:13, fontWeight:700, color:"#334155" }}>{row.label}</span>
                            <span style={{ fontSize:13, fontWeight:800, color: row.color }}>{row.pct}%</span>
                          </div>
                          <div style={{ background:"#f1f5f9", borderRadius:8, height:10, overflow:"hidden" }}>
                            <div style={{
                              width:`${row.pct}%`, height:"100%", borderRadius:8,
                              background: row.color,
                              transition:"width 0.6s cubic-bezier(.4,0,.2,1)",
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })() : <Empty />}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
