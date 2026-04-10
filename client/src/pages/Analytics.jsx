import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { supabase } from "../supabaseClient";
import PageHeader from "../components/PageHeader";
import ErrorBanner from "../components/ErrorBanner";
import KpiCard from "../components/KpiCard";
import {
  TrendingUp, TrendingDown, Banknote, Users, BarChart2,
  ShoppingCart, Briefcase, BookOpen, RefreshCw,
  ArrowUpRight, ArrowDownRight, ChevronDown, Check, X,
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
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return Math.round(n).toString();
}
function fmtDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function monthLabel(iso) {
  const [y, m] = iso.split("-");
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleString("ar", { month: "short", year: "2-digit" });
}

/* ─────────────────────────────────────────────────
   SMOOTH PATH HELPERS (Bezier curves for TrendChart)
───────────────────────────────────────────────── */
function smoothPath(pts, xAt, yAt) {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${xAt(0)} ${yAt(pts[0])}`;
  let d = `M${xAt(0)} ${yAt(pts[0])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const x0 = xAt(i),   y0 = yAt(pts[i]);
    const x1 = xAt(i+1), y1 = yAt(pts[i+1]);
    const cpx = (x0 + x1) / 2;
    d += ` C${cpx} ${y0} ${cpx} ${y1} ${x1} ${y1}`;
  }
  return d;
}
function smoothArea(pts, xAt, yAt, padTop, cH) {
  if (pts.length < 2) return "";
  const n   = pts.length;
  const bot = padTop + cH;
  return `${smoothPath(pts, xAt, yAt)} L${xAt(n-1)} ${bot} L${xAt(0)} ${bot}Z`;
}

/* ─────────────────────────────────────────────────
   DATE PRESETS
───────────────────────────────────────────────── */
const PRESETS = [
  { label: "هذا الشهر",     key: "this_month" },
  { label: "الشهر الماضي",  key: "last_month"  },
  { label: "آخر 3 أشهر",   key: "last_3m"     },
  { label: "آخر 6 أشهر",   key: "last_6m"     },
  { label: "هذه السنة",     key: "this_year"   },
  { label: "السنة الماضية", key: "last_year"   },
  { label: "الكل",           key: "all"         },
  { label: "مخصص",          key: "custom"      },
];

function getPresetRange(key) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const eom = (yr, mo) => {
    const d = new Date(yr, mo + 1, 0);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const som = (yr, mo) => `${yr}-${String(mo+1).padStart(2,"0")}-01`;
  switch (key) {
    case "this_month":  return { from: som(y,m), to: eom(y,m) };
    case "last_month":  { const lm=m===0?11:m-1, ly=m===0?y-1:y; return { from: som(ly,lm), to: eom(ly,lm) }; }
    case "last_3m":     { const s=new Date(y,m-2,1); return { from: som(s.getFullYear(),s.getMonth()), to: eom(y,m) }; }
    case "last_6m":     { const s=new Date(y,m-5,1); return { from: som(s.getFullYear(),s.getMonth()), to: eom(y,m) }; }
    case "this_year":   return { from:`${y}-01-01`, to:`${y}-12-31` };
    case "last_year":   return { from:`${y-1}-01-01`, to:`${y-1}-12-31` };
    default:            return { from:"2000-01-01", to:"2099-12-31" };
  }
}

/* Red shades — used for expense donut */
const RED_PALETTE = [
  "#ef4444","#b91c1c","#f87171","#7f1d1d",
  "#fca5a5","#dc2626","#991b1b","#c2410c",
];

/* ─────────────────────────────────────────────────
   CSS
───────────────────────────────────────────────── */
const CSS = `
.an-page { direction: rtl; }

/* ── Shimmer skeleton ── */
@keyframes an-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
.an-skeleton {
  background: linear-gradient(90deg, #f1f5f9 25%, #e8edf4 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: an-shimmer 1.6s infinite linear;
  border-radius: 12px;
}

/* ── Bento card ── */
.an-card {
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 1px solid rgba(255,255,255,0.95);
  box-shadow: 0 4px 24px -4px rgba(15,23,42,0.05),
              0 1px 4px -1px rgba(15,23,42,0.03),
              inset 0 0 0 1px rgba(255,255,255,0.4);
  padding: 24px 26px;
  transition: transform 0.22s cubic-bezier(.4,0,.2,1), box-shadow 0.22s ease;
}
.an-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 40px -4px rgba(15,23,42,0.09),
              inset 0 0 0 1px rgba(255,255,255,0.5);
}

/* ── Filter panel ── */
.an-filter-bar { display: none; } /* legacy, unused */
.an-filter-panel {
  position: sticky; top: 0; z-index: 50;
  background: rgba(255,255,255,0.96);
  backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.95);
  box-shadow: 0 2px 16px rgba(15,23,42,0.06), inset 0 0 0 1px rgba(255,255,255,0.4);
  padding: 18px 22px;
  margin-bottom: 28px;
  display: flex; flex-direction: column; gap: 14px;
  direction: rtl;
}
.an-filter-row {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.an-filter-label {
  font-size: 11px; font-weight: 900; color: #94a3b8;
  letter-spacing: 0.05em; min-width: 46px; flex-shrink: 0;
}
.an-filter-divider { width: 1px; height: 18px; background: #e2e8f0; flex-shrink:0; margin: 0 4px; }

/* ── Pills ── */
.an-preset {
  padding: 7px 16px; border-radius: 999px;
  border: 1.5px solid rgba(0,0,0,0.1);
  background: rgba(255,255,255,0.82);
  font-size: 13px; font-weight: 700; color: #475569;
  cursor: pointer; white-space: nowrap;
  transition: background .18s, border-color .18s, color .18s, box-shadow .18s;
}
.an-preset:hover { border-color: #00ac47; color: #00ac47; background: rgba(0,172,71,0.06); }
.an-preset.an-active {
  background: #00ac47; color: #fff; border-color: #00ac47;
  box-shadow: 0 4px 14px rgba(0,172,71,0.3);
}
.an-custom-dates {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 16px;
  background: rgba(255,255,255,0.82);
  border: 1.5px solid rgba(0,0,0,0.1); border-radius: 999px;
}
.an-custom-dates input {
  border: none; outline: none; background: transparent;
  font-size: 13px; color: #334155; font-weight: 700; cursor: pointer;
}

/* ── Dropdown ── */
.an-dropdown { position: relative; display: inline-block; }
.an-dropdown-trigger {
  display: flex; align-items: center; gap: 7px;
  padding: 7px 16px; border-radius: 999px;
  border: 1.5px solid rgba(0,0,0,0.1);
  background: rgba(255,255,255,0.82);
  font-size: 13px; font-weight: 700; color: #475569;
  cursor: pointer; white-space: nowrap;
  transition: border-color .15s, color .15s, background .15s;
}
.an-dropdown-trigger:hover  { border-color: #00ac47; color: #00ac47; background: rgba(0,172,71,0.04); }
.an-dropdown-trigger.an-open { border-color: #00ac47; color: #00ac47; background: rgba(0,172,71,0.06); }
.an-dropdown-menu {
  position: absolute; top: calc(100% + 8px); right: 0; z-index: 300;
  background: #fff; border-radius: 16px; padding: 6px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06);
  border: 1px solid rgba(0,0,0,0.06);
  min-width: 210px; max-height: 300px; overflow-y: auto;
  direction: rtl;
  animation: an-drop-in .14s cubic-bezier(.4,0,.2,1);
}
@keyframes an-drop-in {
  from { opacity:0; transform: translateY(-8px) scale(0.97); }
  to   { opacity:1; transform: translateY(0)    scale(1); }
}
.an-dropdown-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 12px; border-radius: 10px; cursor: pointer;
  font-size: 13px; font-weight: 700; color: #334155;
  transition: background .1s;
}
.an-dropdown-item:hover { background: #f1f5f9; }
.an-dropdown-item.an-sel { background: rgba(0,172,71,0.09); color: #00ac47; }

/* Active filter chip */
.an-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 12px; border-radius: 999px;
  background: rgba(0,172,71,0.1); color: #00ac47;
  font-size: 12.5px; font-weight: 800;
  border: 1.5px solid rgba(0,172,71,0.22);
}
.an-chip-clear {
  background: none; border: none; cursor: pointer; color: inherit;
  display: flex; align-items: center; padding: 0; opacity: 0.7;
  transition: opacity .12s;
}
.an-chip-clear:hover { opacity: 1; }

/* ── Section ── */
.an-section { margin-bottom: 36px; }
.an-section-header {
  display: flex; align-items: center; gap: 10px;
  direction: rtl; margin-bottom: 18px;
  padding-right: 14px;
  border-right: 4px solid;
  border-image: linear-gradient(180deg, #00ac47, rgba(0,172,71,0.2)) 1;
}
.an-section-header h2 { margin: 0; font-size: 18px; font-weight: 900; color: #1e293b; }

/* ── Grids ── */
.an-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px; margin-bottom: 32px;
}
.an-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.an-3col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }

/* ── Card title ── */
.an-card-title {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 18px; direction: rtl;
}
.an-card-title-text   { font-size: 14px; font-weight: 800; color: #475569; }
.an-card-title-action { font-size: 12px; color: #94a3b8; font-weight: 700; }

/* ── Donut layout ── */
.an-donut-row { display: flex; align-items: flex-start; gap: 20px; direction: rtl; }
.an-legend { flex: 1; display: flex; flex-direction: column; gap: 8px; direction: rtl; }
.an-legend-item {
  display: flex; align-items: center; gap: 9px;
  font-size: 12.5px; font-weight: 700; color: #334155;
  padding: 5px 8px; border-radius: 8px; cursor: default;
  transition: background .15s;
}
.an-legend-item:hover { background: rgba(0,0,0,0.04); }
.an-legend-pct { margin-right: auto; font-size: 12px; color: #94a3b8; }
.an-legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

/* ── HBar row ── */
.an-hbar-row {
  display: flex; align-items: center; gap: 10px; direction: rtl;
  border-radius: 10px; padding: 5px 6px;
  transition: background .15s; cursor: default;
}
.an-hbar-row:hover { background: rgba(0,0,0,0.025); }

/* ── Tooltip ── */
.an-tooltip {
  position: fixed; z-index: 9999; pointer-events: none;
  background: rgba(15,23,42,0.93);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #f8fafc; border-radius: 13px;
  padding: 11px 15px;
  font-size: 12.5px; font-weight: 700;
  min-width: 150px; max-width: 240px;
  box-shadow: 0 10px 32px rgba(0,0,0,0.25);
  border: 1px solid rgba(255,255,255,0.09);
  direction: rtl;
  transition: opacity .1s;
}
.an-tooltip-title { font-weight: 900; font-size: 13px; color: #fff; margin-bottom: 8px; }
.an-tooltip-row   { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 2px 0; }
.an-tooltip-left  { display: flex; align-items: center; gap: 6px; }
.an-tooltip-dot   { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.an-tooltip-label { color: #94a3b8; font-size: 12px; }
.an-tooltip-val   { color: #f1f5f9; font-size: 12.5px; font-variant-numeric: tabular-nums; }

/* ── P&L table ── */
.an-pl-table { width: 100%; border-collapse: collapse; direction: rtl; font-size: 13px; }
.an-pl-table th {
  background: #f8fafc; color: #64748b; font-weight: 800; font-size: 12px;
  padding: 12px 16px; border-bottom: 2px solid #f1f5f9;
  text-align: right; white-space: nowrap;
  cursor: pointer; user-select: none;
  transition: color .15s;
}
.an-pl-table th:hover    { color: #00ac47; }
.an-sort-active           { color: #00ac47 !important; }
.an-pl-table td {
  padding: 13px 16px; border-bottom: 1px solid #f8fafc;
  color: #334155; text-align: right;
}
.an-pl-table tr:nth-child(even) td { background: #fafbfd; }
.an-pl-table tr:last-child td      { border-bottom: none; }
.an-pl-table tr:hover td           { background: rgba(0,172,71,0.03) !important; }
.an-pl-table td:first-child        { font-weight: 800; }
.an-pos { color: #00ac47; font-weight: 800; }
.an-neg { color: #ef4444; font-weight: 800; }

/* ── Mini bar ── */
.an-mini-bar   { display: flex; align-items: center; gap: 8px; }
.an-mini-track { flex: 1; background: #f1f5f9; border-radius: 5px; height: 7px; overflow: hidden; }
.an-mini-fill  { height: 100%; border-radius: 5px; transition: width .6s cubic-bezier(.4,0,.2,1); }

/* ── Net badge ── */
.an-net-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 8px;
  font-size: 12px; font-weight: 800;
}

/* ── Responsive ── */
@media (max-width: 720px) {
  .an-2col, .an-3col { grid-template-columns: 1fr; }
  .an-donut-row      { flex-direction: column; align-items: center; }
}
@media (max-width: 480px) {
  .an-kpi-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 360px) {
  .an-kpi-grid { grid-template-columns: 1fr; }
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
   SUB-COMPONENTS
───────────────────────────────────────────────── */

/* ── Tooltip — uses transform:translate so RTL direction never affects physical position ── */
function Tooltip({ visible, x, y, children }) {
  if (typeof document === "undefined") return null;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const dx = x > vw - 240 ? -216 : 20;
  const dy = y > vh - 220 ? -195 : -75;
  return ReactDOM.createPortal(
    <div
      className="an-tooltip"
      style={{
        top: 0, left: 0,
        transform: `translate(${x + dx}px, ${y + dy}px)`,
        opacity: visible ? 1 : 0,
      }}
    >
      {children}
    </div>,
    document.body
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

/* ── Card shell ── */
function Card({ children, style }) {
  return <div className="an-card" style={style}>{children}</div>;
}

/* ── Card title ── */
function CardTitle({ children, action }) {
  return (
    <div className="an-card-title">
      <span className="an-card-title-text">{children}</span>
      {action && <span className="an-card-title-action">{action}</span>}
    </div>
  );
}

/* ── Section header ── */
function SectionHeader({ icon: Icon, children, color }) {
  return (
    <div className="an-section-header" style={color ? { borderImage: `linear-gradient(180deg, ${color}, ${color}33) 1` } : undefined}>
      <h2>{children}</h2>
    </div>
  );
}

/* ── Horizontal bar chart (no tooltip — just highlight on hover) ── */
function HBar({ data, accentColor = "#00ac47", maxItems = 10 }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const [barsReady, setBarsReady] = useState(false);

  useEffect(() => {
    setBarsReady(false);
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setBarsReady(true))
    );
    return () => cancelAnimationFrame(id);
  }, [data]);

  if (!data.length) return <Empty />;
  const items = data.slice(0, maxItems);
  const max   = Math.max(...items.map(d => d.value), 1);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
      {items.map((item, i) => (
        <div
          key={i}
          className="an-hbar-row"
          onMouseEnter={() => setHoverIdx(i)}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <div style={{
            width:130, fontSize:13, fontWeight:700,
            color: hoverIdx === i ? "#1e293b" : "#475569",
            textAlign:"right", flexShrink:0,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
            borderRight: hoverIdx === i ? `3px solid ${accentColor}` : "3px solid transparent",
            paddingRight:6, transition:"color .15s, border-color .15s",
          }}>
            {item.label || "غير محدد"}
          </div>
          <div style={{ flex:1, background:"#f1f5f9", borderRadius:7, height:26, overflow:"hidden" }}>
            <div style={{
              width: barsReady
                ? `${Math.max((item.value / max) * 100, item.value > 0 ? 2 : 0)}%`
                : "0%",
              background:`linear-gradient(90deg, ${accentColor}aa, ${accentColor})`,
              height:"100%", borderRadius:7,
              opacity: hoverIdx === null || hoverIdx === i ? 1 : 0.55,
              transition:"width .7s cubic-bezier(.4,0,.2,1), opacity .15s",
            }} />
          </div>
          <div style={{ width:88, fontSize:13, fontWeight:800, color:"#1e293b", textAlign:"left", flexShrink:0 }}>
            {fmtMoney(item.value)} ₪
          </div>
          {item.pct != null && (
            <div style={{ width:40, fontSize:12, color:"#94a3b8", fontWeight:700, textAlign:"left", flexShrink:0 }}>
              {item.pct}%
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Donut chart (SVG) ── */
function DonutChart({ data, size = 190, onSliceHover, setTooltipPos: setExtTPos }) {
  const [hoverSlice, setHoverSlice] = useState(null);
  const [mounted,    setMounted]    = useState(false);

  useEffect(() => {
    setMounted(false);
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setMounted(true))
    );
    return () => cancelAnimationFrame(id);
  }, [data]);

  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:size }}>
      <Empty />
    </div>
  );

  const cx = size / 2, cy = size / 2;
  const R  = size * 0.40, r = size * 0.24;
  const GAP = data.length > 1 ? 0.025 : 0;
  let angle = -Math.PI / 2;

  // Build arc path — handles the full-circle case (single slice = 100%)
  function buildArc(ro, ri, sA, sweep) {
    if (sweep >= 2 * Math.PI - 0.001) {
      // Full circle: split into two semicircles (SVG can't draw a 360° arc in one command)
      const midA = sA + Math.PI;
      const x1o = cx + ro*Math.cos(sA),  y1o = cy + ro*Math.sin(sA);
      const x2o = cx + ro*Math.cos(midA), y2o = cy + ro*Math.sin(midA);
      const x1i = cx + ri*Math.cos(sA),  y1i = cy + ri*Math.sin(sA);
      const x2i = cx + ri*Math.cos(midA), y2i = cy + ri*Math.sin(midA);
      return `M${x1o} ${y1o} A${ro} ${ro} 0 1 1 ${x2o} ${y2o} A${ro} ${ro} 0 1 1 ${x1o} ${y1o} ` +
             `M${x1i} ${y1i} A${ri} ${ri} 0 1 0 ${x2i} ${y2i} A${ri} ${ri} 0 1 0 ${x1i} ${y1i}Z`;
    }
    const eA  = sA + sweep;
    const lg  = sweep > Math.PI ? 1 : 0;
    const x1  = cx + ro*Math.cos(sA), y1 = cy + ro*Math.sin(sA);
    const x2  = cx + ro*Math.cos(eA), y2 = cy + ro*Math.sin(eA);
    const ix1 = cx + ri*Math.cos(sA), iy1= cy + ri*Math.sin(sA);
    const ix2 = cx + ri*Math.cos(eA), iy2= cy + ri*Math.sin(eA);
    return `M${x1} ${y1} A${ro} ${ro} 0 ${lg} 1 ${x2} ${y2} L${ix2} ${iy2} A${ri} ${ri} 0 ${lg} 0 ${ix1} ${iy1}Z`;
  }

  const slices = data.map((d, i) => {
    const frac  = d.value / total;
    const sweep = frac * 2 * Math.PI - GAP;
    if (sweep <= 0) return null;
    const sA  = angle + GAP / 2;
    angle += frac * 2 * Math.PI;
    const hov = hoverSlice === i;
    const ro  = hov ? R + 6 : R;
    const ri  = hov ? r + 2 : r;
    const path = buildArc(ro, ri, sA, sweep);
    return { path, color: d.color, label: d.label, value: d.value, pct: (frac*100).toFixed(1) };
  }).filter(Boolean);

  const hovData    = hoverSlice !== null ? data[hoverSlice] : null;
  const centerVal  = hovData ? fmtMoneyShort(hovData.value) : fmtMoneyShort(total);
  const centerLbl  = hovData ? hovData.label : "إجمالي";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ overflow:"visible", flexShrink:0 }}>
      {slices.map((s, i) => (
        <path
          key={i} d={s.path} fill={s.color}
          opacity={!mounted ? 0 : (hoverSlice === null || hoverSlice === i ? 0.92 : 0.45)}
          style={{ transition:"opacity .18s", cursor:"pointer" }}
          onMouseMove={e => {
            setHoverSlice(i);
            setExtTPos && setExtTPos({ x: e.clientX, y: e.clientY });
            onSliceHover && onSliceHover(i);
          }}
          onMouseLeave={() => {
            setHoverSlice(null);
            onSliceHover && onSliceHover(null);
          }}
        >
        </path>
      ))}
      <circle cx={cx} cy={cy} r={r - 2} fill="white" />
      <text x={cx} y={cy - 10} textAnchor="middle" fontSize={13} fontWeight={900} fill="#1e293b">
        {centerVal}
      </text>
      <text x={cx} y={cy + 7}  textAnchor="middle" fontSize={9}  fill="#94a3b8">₪</text>
      <text x={cx} y={cy + 19} textAnchor="middle" fontSize={9}  fill="#64748b"
        style={{ maxWidth: r * 2, overflow: "hidden" }}>
        {centerLbl.length > 8 ? centerLbl.slice(0,8) + "…" : centerLbl}
      </text>
    </svg>
  );
}

/* ── Expense category card (owns donut hover state) ── */
function ExpenseCategoryCard({ data }) {
  const [donutHoverIdx,   setDonutHoverIdx]   = useState(null);
  const [donutTooltipPos, setDonutTooltipPos] = useState({ x:0, y:0 });

  return (
    <Card>
      <CardTitle>المصاريف حسب الفئة</CardTitle>

      {!data.length ? <Empty /> : (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20 }}>
          {/* Donut — centered */}
          <DonutChart
            data={data}
            size={200}
            onSliceHover={setDonutHoverIdx}
            setTooltipPos={setDonutTooltipPos}
          />

          {/* Legend rows */}
          <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:4, direction:"rtl" }}>
            {data.map((item, i) => (
              <div
                key={i}
                style={{
                  display:"flex", alignItems:"center", gap:10, padding:"8px 10px",
                  borderRadius:10, transition:"background .15s", cursor:"default",
                  background: donutHoverIdx === i ? `${item.color}18` : "transparent",
                }}
              >
                {/* Colored dot */}
                <div style={{
                  width:11, height:11, borderRadius:"50%",
                  background: item.color, flexShrink:0,
                  boxShadow: `0 0 0 3px ${item.color}28`,
                }} />
                {/* Label */}
                <span style={{ flex:1, fontSize:13, fontWeight:700, color:"#334155" }}>
                  {item.label}
                </span>
                {/* Mini progress bar */}
                <div style={{ width:72, height:5, borderRadius:4, background:"#f1f5f9", overflow:"hidden", flexShrink:0 }}>
                  <div style={{
                    width:`${item.pct}%`, height:"100%",
                    background: item.color, borderRadius:4,
                  }} />
                </div>
                {/* Amount */}
                <span style={{
                  fontSize:12.5, fontWeight:800, color:"#475569",
                  minWidth:68, textAlign:"left", direction:"ltr", flexShrink:0,
                }}>
                  {fmtMoney(item.value)} ₪
                </span>
                {/* Percentage */}
                <span style={{
                  fontSize:11.5, fontWeight:700, color: item.color,
                  minWidth:38, textAlign:"center", flexShrink:0,
                }}>
                  {item.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Tooltip visible={donutHoverIdx !== null} x={donutTooltipPos.x} y={donutTooltipPos.y}>
        {donutHoverIdx !== null && data[donutHoverIdx] && (
          <>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:8 }}>
              <span className="an-tooltip-dot" style={{ background: data[donutHoverIdx].color }} />
              <span className="an-tooltip-title" style={{ margin:0 }}>{data[donutHoverIdx].label}</span>
            </div>
            <div className="an-tooltip-row">
              <span className="an-tooltip-label">المبلغ</span>
              <span className="an-tooltip-val">{fmtMoney(data[donutHoverIdx].value)} ₪</span>
            </div>
            <div className="an-tooltip-row">
              <span className="an-tooltip-label">النسبة</span>
              <span className="an-tooltip-val">{data[donutHoverIdx].pct}%</span>
            </div>
          </>
        )}
      </Tooltip>
    </Card>
  );
}

/* ── Area / Line chart (SVG) — smooth bezier + crosshair ── */
function TrendChart({ data }) {
  const svgRef       = useRef(null);
  const [hoverIdx,   setHoverIdx]   = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x:0, y:0 });
  const [isHovering, setIsHovering] = useState(false);

  if (!data.length) return <Empty />;

  const W = 700, H = 310;
  const pad = { top:32, right:32, bottom:52, left:72 };
  const cW  = W - pad.left - pad.right;
  const cH  = H - pad.top  - pad.bottom;
  const n   = data.length;
  const allV = data.flatMap(d => [d.income, d.expense]);
  const maxV = Math.max(...allV, 1);

  const xAt = i => pad.left + (n === 1 ? cW/2 : (i / (n-1)) * cW);
  const yAt = v => pad.top  + cH - (v / maxV) * cH;

  const incPts = data.map(d => d.income);
  const expPts = data.map(d => d.expense);
  const hasExp = expPts.some(v => v > 0);

  const incLine = smoothPath(incPts, xAt, yAt);
  const incArea = smoothArea(incPts, xAt, yAt, pad.top, cH);
  const expLine = smoothPath(expPts, xAt, yAt);
  const expArea = smoothArea(expPts, xAt, yAt, pad.top, cH);

  function handleMouseMove(e) {
    if (!svgRef.current) return;
    // Use getScreenCTM — browser-native SVG→screen matrix, exact in any layout direction
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return;
    const pt  = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgX   = pt.matrixTransform(ctm.inverse()).x;
    const rawIdx = (svgX - pad.left) / (cW / Math.max(n - 1, 1));
    const idx    = Math.max(0, Math.min(n - 1, Math.round(rawIdx)));
    // Distance in SVG units → screen pixels using CTM scale factor
    const pxPerUnit = Math.sqrt(ctm.a * ctm.a + ctm.b * ctm.b);
    const distPx    = Math.abs(svgX - xAt(idx)) * pxPerUnit;
    if (distPx > 40) {
      setHoverIdx(null);
    } else {
      setHoverIdx(idx);
      setTooltipPos({ x: e.clientX, y: e.clientY });
    }
  }

  const showHover = isHovering && hoverIdx !== null;
  const hov = showHover ? data[hoverIdx] : null;

  return (
    <>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width:"100%", height:"auto", display:"block", cursor:"crosshair" }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setIsHovering(false); setHoverIdx(null); }}
      >
        <defs>
          <linearGradient id="an-g-inc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#00ac47" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#00ac47" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="an-g-exp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#ef4444" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
          const gv = maxV * (1 - f);
          const gy = yAt(gv);
          return (
            <g key={i}>
              <line x1={pad.left} y1={gy} x2={W-pad.right} y2={gy}
                stroke="#f1f5f9" strokeWidth={f === 0 ? 1.5 : 1} />
              <text x={pad.left - 6} y={gy} textAnchor="end" dominantBaseline="middle"
                fontSize={9} fill="#94a3b8">{fmtMoneyShort(gv)}</text>
            </g>
          );
        })}

        {/* Income area + smooth line */}
        {n > 1 && <path d={incArea} fill="url(#an-g-inc)" />}
        {n > 1 && <path d={incLine} fill="none" stroke="#00ac47" strokeWidth={2.5}
          strokeLinejoin="round" strokeLinecap="round" />}

        {/* Expense area + smooth line */}
        {hasExp && n > 1 && <path d={expArea} fill="url(#an-g-exp)" />}
        {hasExp && n > 1 && <path d={expLine} fill="none" stroke="#ef4444" strokeWidth={2}
          strokeLinejoin="round" strokeLinecap="round" strokeDasharray="5 3" />}

        {/* Vertical crosshair — only on hover */}
        {showHover && (
          <line
            x1={xAt(hoverIdx)} y1={pad.top}
            x2={xAt(hoverIdx)} y2={pad.top + cH}
            stroke="rgba(0,0,0,0.12)" strokeWidth={1.5} strokeDasharray="4 3"
          />
        )}

        {/* Horizontal dotted line to y-axis at hovered income — only on hover */}
        {showHover && hov && (
          <line
            x1={pad.left} y1={yAt(hov.income)}
            x2={xAt(hoverIdx)} y2={yAt(hov.income)}
            stroke="#00ac47" strokeWidth={1} strokeDasharray="3 3" opacity={0.45}
          />
        )}

        {/* Dots */}
        {data.map((d, i) => {
          const isHov = showHover && hoverIdx === i;
          return (
            <g key={i}>
              {isHov && <circle cx={xAt(i)} cy={yAt(d.income)} r={12} fill="rgba(0,172,71,0.1)" />}
              <circle cx={xAt(i)} cy={yAt(d.income)} r={isHov ? 6 : 4.5}
                fill="#fff" stroke="#00ac47" strokeWidth={2.5} />
              {d.expense > 0 && <>
                {isHov && <circle cx={xAt(i)} cy={yAt(d.expense)} r={10} fill="rgba(239,68,68,0.08)" />}
                <circle cx={xAt(i)} cy={yAt(d.expense)} r={isHov ? 5.5 : 4}
                  fill="#fff" stroke="#ef4444" strokeWidth={2} />
              </>}
            </g>
          );
        })}

        {/* X-axis labels */}
        {data.map((d, i) => (
          <text key={i} x={xAt(i)} y={H - 10} textAnchor="middle"
            fontSize={10}
            fill={showHover && hoverIdx === i ? "#334155" : "#94a3b8"}
            fontWeight={showHover && hoverIdx === i ? 800 : 400}>
            {monthLabel(d.month)}
          </text>
        ))}

      </svg>

      {/* Legend — outside SVG so it has proper space and isn't clipped */}
      <div style={{ display:"flex", justifyContent:"center", gap:28, marginTop:14, direction:"ltr" }}>
        {[
          { color:"#00ac47", label:"دخل" },
          { color:"#ef4444", label:"مصاريف", dashed:true },
        ].map(item => (
          <div key={item.label} style={{ display:"flex", alignItems:"center", gap:7 }}>
            {item.dashed
              ? <svg width={20} height={10} style={{ flexShrink:0 }}>
                  <line x1={0} y1={5} x2={20} y2={5} stroke={item.color} strokeWidth={2} strokeDasharray="5 3" />
                </svg>
              : <svg width={20} height={10} style={{ flexShrink:0 }}>
                  <line x1={0} y1={5} x2={20} y2={5} stroke={item.color} strokeWidth={2.5} />
                </svg>
            }
            <span style={{ fontSize:12.5, fontWeight:700, color:"#475569" }}>{item.label}</span>
          </div>
        ))}
      </div>

      <Tooltip visible={showHover} x={tooltipPos.x} y={tooltipPos.y}>
        {hov && (
          <>
            <div className="an-tooltip-title">{monthLabel(hov.month)}</div>
            <div className="an-tooltip-row">
              <span className="an-tooltip-left">
                <span className="an-tooltip-dot" style={{ background:"#00ac47" }} />
                <span className="an-tooltip-label">دخل</span>
              </span>
              <span className="an-tooltip-val">{fmtMoney(hov.income)} ₪</span>
            </div>
            {hov.expense > 0 && (
              <div className="an-tooltip-row">
                <span className="an-tooltip-left">
                  <span className="an-tooltip-dot" style={{ background:"#ef4444" }} />
                  <span className="an-tooltip-label">مصاريف</span>
                </span>
                <span className="an-tooltip-val">{fmtMoney(hov.expense)} ₪</span>
              </div>
            )}
            {hov.income > 0 && (
              <div className="an-tooltip-row" style={{ marginTop:4, borderTop:"1px solid rgba(255,255,255,0.1)", paddingTop:4 }}>
                <span className="an-tooltip-label">الصافي</span>
                <span style={{ fontSize:12.5, fontWeight:800,
                  color: hov.income - hov.expense >= 0 ? "#4ade80" : "#f87171" }}>
                  {fmtMoney(hov.income - hov.expense)} ₪
                </span>
              </div>
            )}
          </>
        )}
      </Tooltip>
    </>
  );
}

/* ── Vertical bar chart ── */
function VBarChart({ data, accentColor = "#00ac47" }) {
  const svgRef = useRef(null);
  const [hoverIdx,   setHoverIdx]   = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x:0, y:0 });
  const [barsReady,  setBarsReady]  = useState(false);

  useEffect(() => {
    setBarsReady(false);
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => setBarsReady(true));
      return () => cancelAnimationFrame(id2);
    });
    return () => cancelAnimationFrame(id1);
  }, [data]);

  if (!data.length) return <Empty />;

  const W   = 600, H = 300;
  const pad = { top:28, right:20, bottom:72, left:58 };
  const cW  = W - pad.left - pad.right;
  const cH  = H - pad.top  - pad.bottom;
  const visible = data.slice(0, 12);
  const n   = visible.length;
  const maxV = Math.max(...visible.map(d => d.value), 1);

  const slotW = cW / n;
  const barW  = Math.max(slotW * 0.62, 14);
  const barX  = i => pad.left + i * slotW + (slotW - barW) / 2;
  const barH  = v => (v / maxV) * cH;
  const barTop = v => pad.top + cH - barH(v);

  function handleMouseMove(e) {
    if (!svgRef.current) return;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return;
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgX = pt.matrixTransform(ctm.inverse()).x;
    const i = Math.floor((svgX - pad.left) / slotW);
    if (i >= 0 && i < n) { setHoverIdx(i); setTooltipPos({ x:e.clientX, y:e.clientY }); }
    else setHoverIdx(null);
  }

  return (
    <>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width:"100%", height:"auto", display:"block", cursor:"default", overflow:"visible" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f, gi) => {
          const gy = barTop(maxV * f);
          return (
            <g key={gi}>
              <line x1={pad.left} y1={gy} x2={W - pad.right} y2={gy}
                stroke={gi === 4 ? "#e2e8f0" : "#f8fafc"} strokeWidth={gi === 4 ? 1.5 : 1} />
              <text x={pad.left - 6} y={gy} textAnchor="end" dominantBaseline="middle"
                fontSize={9} fill="#94a3b8">{fmtMoneyShort(maxV * f)}</text>
            </g>
          );
        })}

        {/* Bars */}
        {visible.map((item, i) => {
          const bx  = barX(i);
          const bh  = barsReady ? barH(item.value) : 0;
          const by  = barsReady ? barTop(item.value) : pad.top + cH;
          const isHov = hoverIdx === i;
          const dim   = hoverIdx !== null && !isHov;
          return (
            <g key={i}>
              {/* Bar shadow / glow on hover */}
              {isHov && (
                <rect
                  x={bx - 3} y={by - 3} width={barW + 6} height={bh + 3}
                  rx={7} fill={accentColor} opacity={0.15}
                />
              )}
              <rect
                x={bx} width={barW} rx={5}
                fill={accentColor}
                style={{
                  y: by,
                  height: bh,
                  opacity: dim ? 0.3 : isHov ? 1 : 0.82,
                  transition: "height .55s cubic-bezier(.4,0,.2,1), y .55s cubic-bezier(.4,0,.2,1), opacity .15s",
                  filter: isHov ? `drop-shadow(0 4px 10px ${accentColor}66)` : "none",
                }}
              />
              {/* Value label above bar when hovered */}
              {isHov && bh > 12 && (
                <text
                  x={bx + barW / 2} y={by - 7}
                  textAnchor="middle" fontSize={10} fontWeight={800} fill={accentColor}
                >
                  {fmtMoneyShort(item.value)}
                </text>
              )}
            </g>
          );
        })}

        {/* X-axis baseline */}
        <line x1={pad.left} y1={pad.top + cH} x2={W - pad.right} y2={pad.top + cH}
          stroke="#e2e8f0" strokeWidth={1.5} />

        {/* X-axis labels — centered below each bar */}
        {visible.map((item, i) => {
          const cx    = barX(i) + barW / 2;
          const isHov = hoverIdx === i;
          const maxLabelLen = n > 8 ? 6 : n > 5 ? 9 : 13;
          const label = item.label.length > maxLabelLen
            ? item.label.slice(0, maxLabelLen - 1) + "…"
            : item.label;
          return (
            <text
              key={i}
              x={cx} y={pad.top + cH + 20}
              textAnchor="middle"
              dominantBaseline="hanging"
              fontSize={9.5}
              fontWeight={isHov ? 800 : 600}
              fill={isHov ? accentColor : "#64748b"}
              style={{ transition:"fill .1s" }}
            >
              {label}
            </text>
          );
        })}
      </svg>

      <Tooltip visible={hoverIdx !== null} x={tooltipPos.x} y={tooltipPos.y}>
        {hoverIdx !== null && visible[hoverIdx] && (
          <>
            <div className="an-tooltip-title">{visible[hoverIdx].label}</div>
            <div className="an-tooltip-row">
              <span className="an-tooltip-left">
                <span className="an-tooltip-dot" style={{ background: accentColor }} />
                <span className="an-tooltip-label">الدخل</span>
              </span>
              <span className="an-tooltip-val">{fmtMoney(visible[hoverIdx].value)} ₪</span>
            </div>
            <div className="an-tooltip-row">
              <span className="an-tooltip-label">النسبة</span>
              <span className="an-tooltip-val">{visible[hoverIdx].pct}%</span>
            </div>
          </>
        )}
      </Tooltip>
    </>
  );
}

/* ── Ranked list ── */
function RankedList({ data }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  if (!data.length) return <Empty />;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5, direction:"rtl" }}>
      {data.slice(0, 10).map((item, i) => (
        <div
          key={i}
          style={{
            display:"flex", alignItems:"center", gap:12, padding:"9px 12px",
            background: hoverIdx === i
              ? "rgba(0,172,71,0.05)"
              : i % 2 === 0 ? "#f8fafc" : "#fff",
            borderRadius:10, transition:"background .15s", cursor:"default",
          }}
          onMouseEnter={() => setHoverIdx(i)}
          onMouseLeave={() => setHoverIdx(null)}
        >
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
   MAIN PAGE
───────────────────────────────────────────────── */
export default function Analytics() {
  injectStyles();

  /* ── state (restored from localStorage) ── */
  const _s = (() => { try { return JSON.parse(localStorage.getItem("pgx_analytics_v1")) || {}; } catch { return {}; } })();
  const [preset,     setPreset]     = useState(_s.preset     ?? "this_month");
  const [customFrom, setCustomFrom] = useState(_s.customFrom ?? "");
  const [customTo,   setCustomTo]   = useState(_s.customTo   ?? "");
  const [loading,    setLoading]    = useState(true);
  const [err,        setErr]        = useState(null);

  const [payments,       setPayments]       = useState([]);
  const [expenses,       setExpenses]       = useState([]);
  const [staffPayments,  setStaffPayments]  = useState([]);
  const [childMap,       setChildMap]       = useState({});
  const [courseKindMap,  setCourseKindMap]  = useState({});

  /* Global filters (restored from localStorage) */
  const [selCourses,     setSelCourses]     = useState(_s.selCourses ?? []); // [] = all
  const [selKinds,       setSelKinds]       = useState(_s.selKinds   ?? []); // [] = all, "workshop" | "course"
  const [courseDropOpen, setCourseDropOpen] = useState(false);
  const [kindDropOpen,   setKindDropOpen]   = useState(false);
  const [dateDropOpen,   setDateDropOpen]   = useState(false);
  const courseDropRef = useRef(null);
  const kindDropRef   = useRef(null);
  const dateDropRef   = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e) {
      if (courseDropRef.current && !courseDropRef.current.contains(e.target)) setCourseDropOpen(false);
      if (kindDropRef.current   && !kindDropRef.current.contains(e.target))   setKindDropOpen(false);
      if (dateDropRef.current   && !dateDropRef.current.contains(e.target))   setDateDropOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Persist filters to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("pgx_analytics_v1", JSON.stringify({ preset, customFrom, customTo, selCourses, selKinds }));
    } catch {}
  }, [preset, customFrom, customTo, selCourses, selKinds]);

  // Clear all filters back to defaults
  const hasActiveFilters = preset !== "this_month" || customFrom || customTo || selCourses.length > 0 || selKinds.length > 0;
  function clearAllFilters() {
    setPreset("this_month");
    setCustomFrom("");
    setCustomTo("");
    setSelCourses([]);
    setSelKinds([]);
  }

  /* P&L sort */
  const [plSort, setPlSort] = useState({ col:"income", dir:"desc" });
  function toggleSort(col) {
    setPlSort(prev =>
      prev.col === col
        ? { col, dir: prev.dir === "desc" ? "asc" : "desc" }
        : { col, dir: "desc" }
    );
  }

  /* ── date range ── */
  const dateRange = useMemo(() => {
    if (preset === "custom") return { from: customFrom, to: customTo };
    return getPresetRange(preset);
  }, [preset, customFrom, customTo]);
  const { from, to } = dateRange;

  /* ── load ── */
  async function load() {
    setLoading(true); setErr(null);
    try {
      const [
        { data: pays,    error: e1 },
        { data: exps,    error: e2 },
        { data: staff,   error: e3 },
        { data: kids },
        { data: courses },
      ] = await Promise.all([
        supabase.from("payments_details_view")
          .select("amount, created_at, child_id, course_id, course_title, run_id"),
        supabase.from("expenses")
          .select("id, spent_on, amount, category, party, item, run_id"),
        supabase.from("staff_salary_payments")
          .select("total_amount, date_to, expense_id"),
        supabase.from("children_view").select("id, country"),
        supabase.from("courses").select("id, kind"),
      ]);
      if (e1 || e2 || e3) throw e1 || e2 || e3;
      setPayments(pays  || []);
      setExpenses(exps  || []);
      setStaffPayments(staff || []);
      const cmap = {};
      for (const c of kids || []) { if (c.id) cmap[c.id] = c.country || "غير محدد"; }
      setChildMap(cmap);
      const kmap = {};
      for (const c of courses || []) { if (c.id) kmap[String(c.id)] = c.kind || "course"; }
      setCourseKindMap(kmap);
    } catch (e) {
      setErr(e?.message || "حدث خطأ أثناء تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  /* ── run → course mapping ── */
  const runCourseMap = useMemo(() => {
    const map = {};
    for (const p of payments) { if (p.run_id && p.course_id) map[p.run_id] = String(p.course_id); }
    return map;
  }, [payments]);

  /* ── course list for dropdown ── */
  const courseOptions = useMemo(() => {
    const map = {};
    // Stringify IDs to avoid number/string mismatch in comparisons
    for (const p of payments) { if (p.course_id && p.course_title) map[String(p.course_id)] = p.course_title; }
    return Object.entries(map).map(([id, title]) => ({ id, title }));
  }, [payments]);

  function toggleCourse(id) {
    setSelCourses(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  const courseFilterLabel = selCourses.length === 0
    ? "كل الدورات"
    : selCourses.length === 1
      ? courseOptions.find(c => c.id === selCourses[0])?.title ?? "دورة"
      : `${selCourses.length} دورات`;

  const selectedPresetLabel = PRESETS.find(p => p.key === preset)?.label ?? "الفترة";

  /* ── filtered slices (date + courses — affects ALL charts/KPIs) ── */
  const isKindMatch = (courseId, kinds) => {
    if (!kinds.length) return true;
    const k = courseKindMap[String(courseId)] || "course";
    return kinds.some(sk => sk === "workshop" ? k === "workshop" : k !== "workshop");
  };

  const fPays = useMemo(() => {
    let d = payments;
    if (from && to)            d = d.filter(p => { const x = p.created_at?.slice(0,10); return x && x >= from && x <= to; });
    if (selCourses.length > 0) d = d.filter(p => selCourses.includes(String(p.course_id)));
    if (selKinds.length > 0)   d = d.filter(p => isKindMatch(p.course_id, selKinds));
    return d;
  }, [payments, from, to, selCourses, selKinds, courseKindMap]);

  const fExps = useMemo(() => {
    let d = expenses;
    if (from && to)            d = d.filter(e => e.spent_on && e.spent_on >= from && e.spent_on <= to);
    if (selCourses.length > 0) d = d.filter(e => e.run_id && selCourses.includes(String(runCourseMap[e.run_id])));
    if (selKinds.length > 0)   d = d.filter(e => {
      const cid = runCourseMap[e.run_id];
      return cid ? isKindMatch(cid, selKinds) : false;
    });
    return d;
  }, [expenses, from, to, selCourses, selKinds, runCourseMap, courseKindMap]);

  /* ── kind comparison (always off unfiltered fPays/fExps by date only) ── */
  const kindComparison = useMemo(() => {
    const calc = (kindCheck) => {
      const pays = fPays.filter(p => kindCheck(courseKindMap[String(p.course_id)] || "course"));
      const exps = fExps.filter(e => {
        const cid = runCourseMap[e.run_id]; if (!cid) return false;
        return kindCheck(courseKindMap[cid] || "course");
      });
      const income  = pays.reduce((s, p) => s + Number(p.amount || 0), 0);
      const expense = exps.reduce((s, e) => s + Number(e.amount || 0), 0);
      const net     = income - expense;
      const margin  = income > 0 ? (net / income) * 100 : 0;
      const students = new Set(pays.map(p => p.child_id).filter(Boolean)).size;
      return { income, expense, net, margin, students };
    };
    return {
      courses:   calc(k => k !== "workshop"),
      workshops: calc(k => k === "workshop"),
    };
  }, [fPays, fExps, courseKindMap, runCourseMap]);

  const fStaff = useMemo(() => {
    if (!from || !to) return staffPayments;
    return staffPayments.filter(s => s.date_to && s.date_to >= from && s.date_to <= to);
  }, [staffPayments, from, to]);

  /* ── KPIs ── */
  const kpi = useMemo(() => {
    const totalIncome   = fPays.reduce((s,p) => s + Number(p.amount||0), 0);
    const staffExpIds   = new Set(staffPayments.map(s => s.expense_id).filter(Boolean));
    const nonStaffExp   = fExps.filter(e => !staffExpIds.has(e.id)).reduce((s,e) => s + Number(e.amount||0), 0);
    const staffCost     = fStaff.reduce((s,p) => s + Number(p.total_amount||0), 0);
    const totalExpenses = fExps.reduce((s,e) => s + Number(e.amount||0), 0);
    const netProfit     = totalIncome - nonStaffExp - staffCost;
    const activeStudents= new Set(fPays.map(p => p.child_id).filter(Boolean)).size;
    return { totalIncome, totalExpenses, nonStaffExp, staffCost, netProfit, activeStudents };
  }, [fPays, fExps, fStaff, staffPayments]);

  /* ── monthly trend (uses already-filtered fPays / fExps) ── */
  const monthlyTrend = useMemo(() => {
    const inc = {}, exp = {};
    for (const p of fPays) { const mo = p.created_at?.slice(0,7); if (mo) inc[mo] = (inc[mo]||0) + Number(p.amount||0); }
    for (const e of fExps) { const mo = e.spent_on?.slice(0,7); if (mo) exp[mo] = (exp[mo]||0) + Number(e.amount||0); }
    const months = Array.from(new Set([...Object.keys(inc), ...Object.keys(exp)])).sort();
    return months.map(mo => ({ month:mo, income: inc[mo]||0, expense: exp[mo]||0 }));
  }, [fPays, fExps]);

  /* ── income by course ── */
  const incomeByCourse = useMemo(() => {
    const map = {};
    for (const p of fPays) { const k = p.course_title||"غير مصنف"; map[k] = (map[k]||0) + Number(p.amount||0); }
    const total = Object.values(map).reduce((s,v)=>s+v,0);
    return Object.entries(map)
      .map(([label, value]) => ({ label, value, pct: total ? ((value/total)*100).toFixed(1) : 0 }))
      .sort((a,b) => b.value - a.value);
  }, [fPays]);

  /* ── income by country ── */
  const incomeByCountry = useMemo(() => {
    const map = {};
    for (const p of fPays) { const k = childMap[p.child_id]||"غير محدد"; map[k] = (map[k]||0) + Number(p.amount||0); }
    const total = Object.values(map).reduce((s,v)=>s+v,0);
    return Object.entries(map)
      .map(([label, value]) => ({ label, value, pct: total ? ((value/total)*100).toFixed(1) : 0 }))
      .sort((a,b) => b.value - a.value);
  }, [fPays, childMap]);

  /* ── expenses by category ── */
  const expByCategory = useMemo(() => {
    const map = {};
    for (const e of fExps) { const k = e.category||"غير مصنف"; map[k] = (map[k]||0) + Number(e.amount||0); }
    const total = Object.values(map).reduce((s,v)=>s+v,0);
    return Object.entries(map)
      .map(([label, value], i) => ({
        label, value, color: RED_PALETTE[i % RED_PALETTE.length],
        pct: total ? ((value/total)*100).toFixed(1) : 0,
      }))
      .sort((a,b) => b.value - a.value);
  }, [fExps]);

  /* ── top parties ── */
  const topParties = useMemo(() => {
    const map = {};
    for (const e of fExps) { const k = e.party||"غير محدد"; map[k] = (map[k]||0) + Number(e.amount||0); }
    const total = Object.values(map).reduce((s,v)=>s+v,0);
    return Object.entries(map)
      .map(([label, value]) => ({ label, value, pct: total ? ((value/total)*100).toFixed(1) : 0 }))
      .sort((a,b) => b.value - a.value);
  }, [fExps]);

  /* ── top items ── */
  const topItems = useMemo(() => {
    const map = {};
    for (const e of fExps) { if (e.item) map[e.item] = (map[e.item]||0) + Number(e.amount||0); }
    const total = Object.values(map).reduce((s,v)=>s+v,0);
    return Object.entries(map)
      .map(([label, value]) => ({ label, value, pct: total ? ((value/total)*100).toFixed(1) : 0 }))
      .sort((a,b) => b.value - a.value);
  }, [fExps]);

  /* ── course P&L ── */
  const coursePL = useMemo(() => {
    const runCourse = {};
    for (const p of payments) { if (p.run_id && p.course_id) runCourse[p.run_id] = p.course_id; }
    const courseNames = {}, incMap = {}, expMap = {};
    for (const p of fPays) {
      if (!p.course_id) continue;
      incMap[p.course_id] = (incMap[p.course_id]||0) + Number(p.amount||0);
      courseNames[p.course_id] = p.course_title || `دورة #${p.course_id}`;
    }
    for (const e of fExps) {
      if (!e.run_id) continue;
      const cid = runCourse[e.run_id]; if (!cid) continue;
      expMap[cid] = (expMap[cid]||0) + Number(e.amount||0);
    }
    const ids = new Set([...Object.keys(incMap), ...Object.keys(expMap)]);
    return Array.from(ids).map(cid => ({
      id: cid,
      name: courseNames[cid] || `دورة #${cid}`,
      income:  incMap[cid] || 0,
      expense: expMap[cid] || 0,
      net:    (incMap[cid]||0) - (expMap[cid]||0),
    }));
  }, [fPays, fExps, payments]);

  const sortedCoursePL = useMemo(() => {
    return [...coursePL].sort((a,b) =>
      plSort.dir === "desc" ? b[plSort.col] - a[plSort.col] : a[plSort.col] - b[plSort.col]
    );
  }, [coursePL, plSort]);

  const sortArrow = col =>
    plSort.col === col ? (plSort.dir === "desc" ? " ↓" : " ↑") : "";

  /* ─────────────── RENDER ─────────────── */
  return (
    <div className="container an-page page page--analytics" style={{ direction:"rtl" }}>

      <PageHeader
        title="التحليل المالي"
        subtitle="نظرة شاملة على الدخل والمصاريف والأداء المالي"
        actions={
          <button className="btn" onClick={load} disabled={loading}
            style={{ display:"flex", alignItems:"center", gap:6 }}>
            <RefreshCw size={15} />
            {loading ? "جار التحميل..." : "تحديث"}
          </button>
        }
      />

      {err && <ErrorBanner message={err} onClose={() => setErr(null)} />}

      {/* ══ FILTER PANEL ══ */}
      <div className="an-filter-panel" style={{ flexDirection:"row", alignItems:"flex-start", gap:16, flexWrap:"wrap" }}>

        {/* Date dropdown */}
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <span className="an-filter-label">الفترة الزمنية</span>
          <div className="an-dropdown" ref={dateDropRef}>
            <button
              className={`an-dropdown-trigger${dateDropOpen ? " an-open" : ""}`}
              onClick={() => { setDateDropOpen(o => !o); setCourseDropOpen(false); }}
            >
              {selectedPresetLabel}
              <ChevronDown size={14} style={{ transition:"transform .2s", transform: dateDropOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
            </button>

            {dateDropOpen && (
              <div className="an-dropdown-menu">
                {PRESETS.filter(p => p.key !== "custom").map(p => (
                  <div
                    key={p.key}
                    className={`an-dropdown-item${preset === p.key ? " an-sel" : ""}`}
                    onClick={() => { setPreset(p.key); setDateDropOpen(false); }}
                  >
                    <span>{p.label}</span>
                    {preset === p.key && <Check size={14} />}
                  </div>
                ))}
                <div
                  className={`an-dropdown-item${preset === "custom" ? " an-sel" : ""}`}
                  onClick={() => setPreset("custom")}
                >
                  <span>مخصص</span>
                  {preset === "custom" && <Check size={14} />}
                </div>
              </div>
            )}
          </div>

          {/* Custom date inputs — shown below trigger when custom is selected */}
          {preset === "custom" && (
            <div className="an-custom-dates" style={{ borderRadius:14 }}>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
              <span style={{ color:"#cbd5e1", fontWeight:700 }}>—</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} />
            </div>
          )}

          {/* Date range label */}
          {from && to && preset !== "all" && preset !== "custom" && (
            <span style={{ fontSize:11.5, color:"#94a3b8", fontWeight:700 }}>
              {fmtDate(from)} — {fmtDate(to)}
            </span>
          )}
        </div>

        <div className="an-filter-divider" style={{ height:"auto", alignSelf:"stretch", margin:"0 4px" }} />

        {/* Kind dropdown */}
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <span className="an-filter-label">النوع</span>
          <div className="an-dropdown" ref={kindDropRef}>
            <button
              className={`an-dropdown-trigger${kindDropOpen || selKinds.length > 0 ? " an-open" : ""}`}
              onClick={() => { setKindDropOpen(o => !o); setCourseDropOpen(false); setDateDropOpen(false); }}
            >
              {selKinds.length === 0 ? "الكل" : selKinds.length === 2 ? "الكل" : selKinds[0] === "workshop" ? "ورشات" : "دورات"}
              <ChevronDown size={14} style={{ transition:"transform .2s", transform: kindDropOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
            </button>
            {kindDropOpen && (
              <div className="an-dropdown-menu">
                {[{ id:"course", label:"دورات" }, { id:"workshop", label:"ورشات" }].map(opt => {
                  const checked = selKinds.includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      className={`an-dropdown-item${checked ? " an-sel" : ""}`}
                      onClick={() => setSelKinds(prev => checked ? prev.filter(x => x !== opt.id) : [...prev, opt.id])}
                    >
                      <span>{opt.label}</span>
                      {checked && <Check size={14} />}
                    </div>
                  );
                })}
                {selKinds.length > 0 && (
                  <>
                    <div style={{ height:1, background:"#f1f5f9", margin:"4px 8px" }} />
                    <div className="an-dropdown-item" onClick={() => { setSelKinds([]); setKindDropOpen(false); }}>
                      <span style={{ color:"#64748b" }}>مسح</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="an-filter-divider" style={{ height:"auto", alignSelf:"stretch", margin:"0 4px" }} />

        {/* Course dropdown — multi-select */}
        {courseOptions.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <span className="an-filter-label">الدورة</span>
            <div className="an-dropdown" ref={courseDropRef}>
              <button
                className={`an-dropdown-trigger${courseDropOpen || selCourses.length > 0 ? " an-open" : ""}`}
                onClick={() => { setCourseDropOpen(o => !o); setDateDropOpen(false); }}
              >
                {courseFilterLabel}
                <ChevronDown size={14} style={{ transition:"transform .2s", transform: courseDropOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
              </button>

              {courseDropOpen && (
                <div className="an-dropdown-menu">
                  {/* Clear all */}
                  <div
                    className={`an-dropdown-item${selCourses.length === 0 ? " an-sel" : ""}`}
                    onClick={() => setSelCourses([])}
                  >
                    <span>كل الدورات</span>
                    {selCourses.length === 0 && <Check size={14} />}
                  </div>
                  <div style={{ height:1, background:"#f1f5f9", margin:"4px 8px" }} />
                  {courseOptions.map(c => {
                    const checked = selCourses.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        className={`an-dropdown-item${checked ? " an-sel" : ""}`}
                        onClick={() => toggleCourse(c.id)}
                      >
                        <span>{c.title}</span>
                        {checked && <Check size={14} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Active chips — one per selected course */}
            {selCourses.length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {selCourses.map(id => (
                  <span key={id} className="an-chip" style={{ fontSize:12 }}>
                    {courseOptions.find(c => c.id === id)?.title ?? id}
                    <button className="an-chip-clear" onClick={() => toggleCourse(id)}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
                <button className="an-chip-clear" style={{ fontSize:12, color:"#64748b", padding:"4px 6px" }}
                  onClick={() => setSelCourses([])}>
                  مسح الكل
                </button>
              </div>
            )}
          </div>
        )}

        {/* Clear all button — only when something is active */}
        {hasActiveFilters && (
          <>
            <div className="an-filter-divider" style={{ height:"auto", alignSelf:"stretch", margin:"0 4px" }} />
            <div style={{ display:"flex", flexDirection:"column", justifyContent:"center" }}>
              <button
                onClick={clearAllFilters}
                style={{
                  display:"flex", alignItems:"center", gap:6,
                  padding:"7px 14px", borderRadius:999,
                  border:"1.5px solid rgba(239,68,68,0.25)",
                  background:"rgba(239,68,68,0.06)", color:"#ef4444",
                  fontSize:13, fontWeight:800, cursor:"pointer",
                  whiteSpace:"nowrap", transition:"background .15s, border-color .15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background="rgba(239,68,68,0.12)"}
                onMouseLeave={e => e.currentTarget.style.background="rgba(239,68,68,0.06)"}
              >
                <X size={14} />
                مسح الفلاتر
              </button>
            </div>
          </>
        )}
      </div>

      {/* ══ LOADING SKELETON ══ */}
      {loading && (
        <>
          <div className="an-kpi-grid" style={{ marginBottom:32 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} className="an-card" style={{ minHeight:108 }}>
                <div className="an-skeleton" style={{ height:11, width:"50%", marginBottom:14 }} />
                <div className="an-skeleton" style={{ height:34, width:"72%", marginBottom:10 }} />
                <div className="an-skeleton" style={{ height:9,  width:"38%" }} />
              </div>
            ))}
          </div>
          <div className="an-card" style={{ marginBottom:36 }}>
            <div className="an-skeleton" style={{ height:14, width:"28%", marginBottom:22 }} />
            <div className="an-skeleton" style={{ height:185, width:"100%" }} />
          </div>
        </>
      )}

      {/* ══ MAIN CONTENT ══ */}
      {!loading && (
        <>
          {/* 1 · KPIs */}
          <div className="an-kpi-grid">
            <KpiCard icon={TrendingUp}   label="إجمالي الدخل"       value={`${fmtMoney(kpi.totalIncome)} ₪`}  hint="المبالغ المدفوعة"       variant="ok" />
            <KpiCard icon={TrendingDown} label="المصاريف التشغيلية" value={`${fmtMoney(kpi.nonStaffExp)} ₪`}  hint="بدون رواتب الموظفين"    variant="warn" />
            <KpiCard icon={Briefcase}    label="تكاليف الموظفين"    value={`${fmtMoney(kpi.staffCost)} ₪`}    hint="رواتب مدفوعة"           variant="info" />
            <KpiCard
              icon={Banknote}
              label="صافي الربح"
              value={`${fmtMoney(kpi.netProfit)} ₪`}
              hint={
                <span style={{ display:"flex", alignItems:"center", gap:4,
                  color: kpi.netProfit >= 0 ? "#00ac47" : "#ef4444" }}>
                  {kpi.netProfit >= 0
                    ? <ArrowUpRight size={13} />
                    : <ArrowDownRight size={13} />}
                  {kpi.netProfit >= 0 ? "ربح" : "خسارة"}
                </span>
              }
              variant={kpi.netProfit >= 0 ? "ok" : "danger"}
            />
            <KpiCard icon={Users} label="أطفال نشطون" value={kpi.activeStudents} hint="دفعوا خلال الفترة" variant="info" />
          </div>

          {/* 1b · Kind comparison */}
          {(kindComparison.courses.income > 0 || kindComparison.workshops.income > 0) && (
            <div className="an-section">
              <Card>
                <CardTitle>مقارنة: دورات مقابل ورشات</CardTitle>
                <div className="an-2col" style={{ gap:24 }}>
                  {[
                    { label:"دورات", color:"#3b82f6", data: kindComparison.courses },
                    { label:"ورشات", color:"#8b5cf6", data: kindComparison.workshops },
                  ].map(({ label, color, data }) => {
                    const totalIncome = kindComparison.courses.income + kindComparison.workshops.income || 1;
                    const sharePct = ((data.income / totalIncome) * 100).toFixed(1);
                    return (
                      <div key={label} style={{ borderRadius:16, border:`1.5px solid ${color}22`, padding:"18px 20px", background:`${color}07` }}>
                        {/* Header */}
                        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18, direction:"rtl" }}>
                          <div style={{ width:10, height:10, borderRadius:"50%", background:color, flexShrink:0 }} />
                          <span style={{ fontSize:17, fontWeight:900, color:"#1e293b" }}>{label}</span>
                          <span style={{ marginRight:"auto", fontSize:12, fontWeight:700, color, background:`${color}15`, padding:"3px 10px", borderRadius:999 }}>
                            {sharePct}% من الدخل
                          </span>
                        </div>

                        {/* Metrics */}
                        {[
                          { label:"الدخل",       val: data.income,  color:"#00ac47" },
                          { label:"المصاريف",    val: data.expense, color:"#ef4444" },
                          { label:"صافي الربح",  val: data.net,     color: data.net >= 0 ? "#00ac47" : "#ef4444" },
                        ].map(row => (
                          <div key={row.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, direction:"rtl" }}>
                            <span style={{ fontSize:13, color:"#64748b", fontWeight:700 }}>{row.label}</span>
                            <span style={{ fontSize:14, fontWeight:900, color: row.color }}>{fmtMoney(row.val)} ₪</span>
                          </div>
                        ))}

                        {/* Margin bar */}
                        <div style={{ marginTop:14, direction:"rtl" }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                            <span style={{ fontSize:12, color:"#94a3b8", fontWeight:700 }}>هامش الربح</span>
                            <span style={{ fontSize:13, fontWeight:900, color: data.margin >= 0 ? color : "#ef4444" }}>
                              {data.margin.toFixed(1)}%
                            </span>
                          </div>
                          <div style={{ background:"#e2e8f0", borderRadius:6, height:8, overflow:"hidden" }}>
                            <div style={{
                              width:`${Math.max(0, Math.min(100, Math.abs(data.margin)))}%`,
                              height:"100%", borderRadius:6,
                              background: data.margin >= 0 ? color : "#ef4444",
                              transition:"width .7s cubic-bezier(.4,0,.2,1)",
                            }} />
                          </div>
                        </div>

                        {/* Student count */}
                        <div style={{ marginTop:12, fontSize:12, color:"#94a3b8", fontWeight:700, textAlign:"right" }}>
                          {data.students} طفل نشط
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* 2 · Monthly Trend */}
          <div className="an-section">
            <Card style={{ padding: "32px 36px" }}>
              <CardTitle action={monthlyTrend.length > 0 ? `${monthlyTrend.length} شهر` : undefined}>
                التطور الشهري — الدخل مقابل المصاريف
              </CardTitle>
              <TrendChart data={monthlyTrend} />
            </Card>
          </div>

          {/* 3 · Income breakdown */}
          <div className="an-section">
            <SectionHeader icon={BookOpen}>تحليل الدخل</SectionHeader>
            <div className="an-2col">
              <Card>
                <CardTitle action={incomeByCourse.length > 0 ? `${incomeByCourse.length} دورة` : undefined}>
                  الدخل حسب الدورة
                </CardTitle>
                <VBarChart data={incomeByCourse} accentColor="#00ac47" />
              </Card>
              <Card>
                <CardTitle action={incomeByCountry.length > 0 ? `${incomeByCountry.length} دولة` : undefined}>
                  الدخل حسب الدولة
                </CardTitle>
                <HBar data={incomeByCountry} accentColor="#3b82f6" />
              </Card>
            </div>
          </div>

          {/* 4 · Expense breakdown */}
          <div className="an-section">
            <SectionHeader icon={ShoppingCart} color="#ef4444">تحليل المصاريف</SectionHeader>
            <div className="an-2col" style={{ marginBottom:20 }}>
              <ExpenseCategoryCard data={expByCategory} />
              <Card>
                <CardTitle action="أعلى 10">أكثر الأشخاص والمتاجر إنفاقاً</CardTitle>
                <HBar data={topParties} accentColor="#f59e0b" />
              </Card>
            </div>
            <Card>
              <CardTitle action="أعلى 10">أكثر المنتجات والخدمات</CardTitle>
              <RankedList data={topItems} />
            </Card>
          </div>

          {/* 5 · Course P&L */}
          {sortedCoursePL.length > 0 && (
            <div className="an-section">
              <SectionHeader icon={BarChart2}>ربحية الدورات</SectionHeader>
              <Card>
                <div style={{ overflowX:"auto" }}>
                  <table className="an-pl-table">
                    <thead>
                      <tr>
                        <th>الدورة</th>
                        <th className={plSort.col === "income"  ? "an-sort-active" : ""} onClick={() => toggleSort("income")}>
                          الدخل{sortArrow("income")}
                        </th>
                        <th className={plSort.col === "expense" ? "an-sort-active" : ""} onClick={() => toggleSort("expense")}>
                          المصاريف{sortArrow("expense")}
                        </th>
                        <th className={plSort.col === "net"     ? "an-sort-active" : ""} onClick={() => toggleSort("net")}>
                          صافي الربح{sortArrow("net")}
                        </th>
                        <th>هامش الربح</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedCoursePL.map(c => {
                        const margin = c.income > 0 ? (c.net / c.income) * 100 : 0;
                        const isPos  = c.net >= 0;
                        return (
                          <tr key={c.id}>
                            <td>{c.name}</td>
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
                                <span style={{ fontSize:12, fontWeight:800, minWidth:44, textAlign:"left",
                                  color: isPos ? "#00ac47" : "#ef4444" }}>
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

          {/* 6 · Staff costs */}
          <div className="an-section">
            <SectionHeader icon={Briefcase}>تكاليف الموظفين</SectionHeader>
            <div className="an-2col">
              <Card>
                <CardTitle>الرواتب المدفوعة في الفترة</CardTitle>
                {fStaff.length === 0 ? <Empty /> : (
                  <div style={{ display:"flex", flexDirection:"column", gap:7, direction:"rtl" }}>
                    {fStaff.map((s,i) => (
                      <div key={i} style={{
                        display:"flex", justifyContent:"space-between", alignItems:"center",
                        padding:"8px 12px",
                        background: i%2===0 ? "#f8fafc" : "#fff",
                        borderRadius:10,
                      }}>
                        <span style={{ fontSize:12, color:"#64748b", fontWeight:700 }}>
                          حتى {fmtDate(s.date_to)}
                        </span>
                        <span style={{ fontSize:14, fontWeight:800, color:"#1e293b" }}>
                          {fmtMoney(s.total_amount)} ₪
                        </span>
                      </div>
                    ))}
                    <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 12px",
                      borderTop:"2px solid #f1f5f9", marginTop:4 }}>
                      <span style={{ fontSize:13, fontWeight:800, color:"#475569" }}>الإجمالي</span>
                      <span style={{ fontSize:15, fontWeight:900, color:"#06b6d4" }}>
                        {fmtMoney(kpi.staffCost)} ₪
                      </span>
                    </div>
                  </div>
                )}
              </Card>

              <Card>
                <CardTitle>توزيع الدخل</CardTitle>
                {kpi.totalIncome > 0 ? (() => {
                  const staffPct = Math.min(100, (kpi.staffCost     / kpi.totalIncome) * 100);
                  const expPct   = Math.min(100 - staffPct, (kpi.nonStaffExp / kpi.totalIncome) * 100);
                  const netPct   = Math.max(0, 100 - staffPct - expPct);
                  return (
                    <div style={{ direction:"rtl" }}>
                      {[
                        { label:"رواتب الموظفين", pct: staffPct.toFixed(1), color:"#06b6d4" },
                        { label:"مصاريف تشغيل",   pct: expPct.toFixed(1),   color:"#f59e0b" },
                        { label:"صافي الربح",     pct: netPct.toFixed(1),   color: kpi.netProfit>=0 ? "#00ac47" : "#ef4444" },
                      ].map((row,i) => (
                        <div key={i} style={{ marginBottom:14 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                            <span style={{ fontSize:13, fontWeight:700, color:"#334155" }}>{row.label}</span>
                            <span style={{ fontSize:13, fontWeight:800, color:row.color }}>{row.pct}%</span>
                          </div>
                          <div style={{ background:"#f1f5f9", borderRadius:8, height:10, overflow:"hidden" }}>
                            <div style={{
                              width:`${row.pct}%`, height:"100%", borderRadius:8,
                              background:row.color,
                              transition:"width .7s cubic-bezier(.4,0,.2,1)",
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
