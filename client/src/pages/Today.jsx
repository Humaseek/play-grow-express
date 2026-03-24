import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useOutletContext, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

import {
  TrendingUp,
  TrendingDown,
  Users,
  CalendarClock,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  AlertOctagon,
  CreditCard,
  Receipt,
  UserPlus,
  RefreshCcw,
  Sparkles,
  History,
  BellRing,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  BadgeDollarSign,
  Filter,
  BarChart3,
  Activity,
  CheckSquare,
  Briefcase,
  ChevronDown,
  Search,
  UserRound,
  Phone, // مهمة لأيقونة المودال المنسوخ
} from "lucide-react";

import ErrorBanner from "../components/ErrorBanner";
import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";
import Badge from "../components/Badge";
import Modal from "../components/Modal";
import ModernSelect from "../components/ModernSelect";

// ============================================================================
// 1. الدوال المساعدة الأساسية
// ============================================================================

function fmtMoney(n) {
  const x = Number(n || 0);
  return x.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "صباح الخير";
  if (hour < 18) return "مساء الخير";
  return "طاب مساؤك";
}

function toDateString(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTimeLocally(dt) {
  if (!dt) return "—";
  const d = new Date(dt);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function startOfMonth(d = new Date()) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function toInputDatetimeLocal(dt) {
  const d = dt ? new Date(dt) : new Date();
  const pad = (x) => String(x).padStart(2, "0");
  const y = d.getFullYear();
  const mo = pad(d.getMonth() + 1);
  const da = pad(d.getDate());
  const h = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${y}-${mo}-${da}T${h}:${mi}`;
}

function getRangeAndBins(preset, customStart, customEnd) {
  const now = new Date();
  let start = new Date();
  let end = new Date();

  switch (preset) {
    case "today":
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "7d":
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "this_month":
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "30d":
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "this_year":
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "all":
      start = new Date(2020, 0, 1, 0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "custom":
      if (customStart) start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
      if (customEnd) end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
  }

  const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
  let bins = [];

  if (diffDays <= 1) {
    bins.push({ start: start.getTime(), end: end.getTime(), label: "اليوم" });
  } else if (diffDays <= 31) {
    for (let i = 0; i < diffDays; i++) {
      let dStart = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + i,
        0,
        0,
        0,
        0,
      );
      let dEnd = new Date(
        dStart.getFullYear(),
        dStart.getMonth(),
        dStart.getDate(),
        23,
        59,
        59,
        999,
      );
      if (dStart > end) break;
      let label =
        diffDays <= 7
          ? new Intl.DateTimeFormat("ar-EG", { weekday: "short" }).format(
              dStart,
            )
          : String(dStart.getDate());
      bins.push({ start: dStart.getTime(), end: dEnd.getTime(), label });
    }
  } else {
    const startMonth = start.getMonth();
    const startYear = start.getFullYear();
    const totalMonths =
      (end.getFullYear() - startYear) * 12 + (end.getMonth() - startMonth) + 1;

    for (let i = 0; i < totalMonths; i++) {
      let mStart = new Date(startYear, startMonth + i, 1, 0, 0, 0, 0);
      let mEnd = new Date(
        mStart.getFullYear(),
        mStart.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      if (mEnd > end) mEnd = end;
      bins.push({
        start: mStart.getTime(),
        end: mEnd.getTime(),
        label: new Intl.DateTimeFormat("ar-EG", { month: "short" }).format(
          mStart,
        ),
      });
    }
  }

  return { fromIso: start.toISOString(), toIso: end.toISOString(), bins };
}

// ============================================================================
// مكون القائمة المنسدلة الأصلي
// ============================================================================
function CustomCombobox({ value, onChange, options, placeholder, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter((o) =>
    (o.label || "").toLowerCase().includes((value || "").toLowerCase()),
  );

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <input
        className="input"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        style={{ width: "100%" }}
      />
      <ChevronDown
        size={16}
        style={{
          position: "absolute",
          left: 12,
          top: "50%",
          transform: `translateY(-50%) ${isOpen ? "rotate(180deg)" : "rotate(0deg)"}`,
          color: "#94a3b8",
          pointerEvents: "none",
          transition: "transform 0.2s ease",
        }}
      />
      {isOpen && filtered.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "#fff",
            border: "1px solid rgba(15,23,42,0.08)",
            borderRadius: "14px",
            maxHeight: "200px",
            overflowY: "auto",
            boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
            padding: "4px",
          }}
        >
          {filtered.map((opt, i) => (
            <div
              key={i}
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 600,
                color: "#334155",
                borderRadius: "10px",
                transition: "background 0.15s ease",
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(opt.value);
                setIsOpen(false);
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#f8fafc")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. مكونات الرسوم البيانية (SVG Charts)
// ============================================================================

const Sparkline = ({ data, color, type = "line" }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data) || 1;
  const min = Math.min(...data);
  const range = max - min || 1;

  if (type === "bar") {
    return (
      <svg
        viewBox="0 0 100 30"
        preserveAspectRatio="none"
        style={{ width: "100%", height: "100%" }}
      >
        {data.map((d, i) => {
          const h = ((d - Math.min(0, min)) / max) * 30 || 2;
          const w = 100 / data.length - (data.length > 15 ? 0.5 : 2);
          const x = i * (100 / data.length);
          return (
            <rect
              key={i}
              x={x}
              y={30 - h}
              width={w}
              height={h}
              fill={color}
              rx="1.5"
              opacity={0.85}
            />
          );
        })}
      </svg>
    );
  }

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 30 - ((d - min) / range) * 26;
      return `${x},${y}`;
    })
    .join(" ");
  const fillPoints = `0,30 ${points} 100,30`;

  return (
    <svg
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      style={{ width: "100%", height: "100%", overflow: "visible" }}
    >
      <defs>
        <linearGradient
          id={`grad-${color.replace("#", "")}`}
          x1="0"
          x2="0"
          y1="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={fillPoints}
        fill={`url(#grad-${color.replace("#", "")})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const DualBarChart = ({ incomeData, expenseData, labels }) => {
  const maxVal = Math.max(...(incomeData || []), ...(expenseData || [])) || 1;
  const minWidth = labels.length > 10 ? `${labels.length * 40}px` : "100%";

  return (
    <div style={{ width: "100%", overflowX: "auto", paddingBottom: "10px" }}>
      <div
        style={{
          minWidth: minWidth,
          height: "220px",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          paddingTop: 20,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 25,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            zIndex: 0,
          }}
        >
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              style={{
                borderTop: "1px dashed #e2e8f0",
                width: "100%",
                height: 0,
              }}
            ></div>
          ))}
        </div>

        {(labels || []).map((label, i) => {
          const incHeight = ((incomeData[i] || 0) / maxVal) * 100;
          const expHeight = ((expenseData[i] || 0) / maxVal) * 100;

          return (
            <div key={i} className="chart-col-group">
              <div className="chart-bars-wrap">
                <div
                  className="chart-bar income-bar"
                  title={`الإيرادات: ${fmtMoney(incomeData[i])} ₪`}
                  style={{ height: `${incHeight}%` }}
                />
                <div
                  className="chart-bar expense-bar"
                  title={`المصاريف: ${fmtMoney(expenseData[i])} ₪`}
                  style={{ height: `${expHeight}%` }}
                />
              </div>
              <div className="chart-label">{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ExpenseDonutChart = ({ data }) => {
  if (!data || data.length === 0)
    return (
      <div className="muted text-center" style={{ padding: 20 }}>
        لا توجد مصاريف لتحليلها
      </div>
    );

  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativePercent = 0;

  const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  const colors = [
    "#ef4444",
    "#f59e0b",
    "#3b82f6",
    "#8b5cf6",
    "#10b981",
    "#64748b",
  ];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
      <div style={{ position: "relative", width: "120px", height: "120px" }}>
        <svg viewBox="-1 -1 2 2" style={{ transform: "rotate(-90deg)" }}>
          {data.map((slice, i) => {
            const percent = slice.value / total;
            const [startX, startY] =
              getCoordinatesForPercent(cumulativePercent);
            cumulativePercent += percent;
            const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
            const largeArcFlag = percent > 0.5 ? 1 : 0;
            const pathData = [
              `M ${startX} ${startY}`,
              `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
              `L 0 0`,
            ].join(" ");

            return (
              <path key={i} d={pathData} fill={colors[i % colors.length]} />
            );
          })}
          <circle cx="0" cy="0" r="0.6" fill="#fff" />
        </svg>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 800 }}>
            الإجمالي
          </span>
          <span
            style={{ fontSize: "14px", color: "#0f172a", fontWeight: 900 }}
            className="ltrIso"
          >
            {fmtMoney(total)}
          </span>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {data.slice(0, 4).map((slice, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "13px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: colors[i % colors.length],
                }}
              ></div>
              <span style={{ fontWeight: 700, color: "#334155" }}>
                {slice.label}
              </span>
            </div>
            <span style={{ fontWeight: 900, color: "#0f172a" }}>
              {Math.round((slice.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 3. CSS Styles
// ============================================================================
const DASHBOARD_STYLES = `
.page--dashboard {
  background: #f8fafc;
  background-image: 
    radial-gradient(at 0% 0%, hsla(217,100%,94%,0.7) 0px, transparent 50%),
    radial-gradient(at 100% 0%, hsla(160,100%,94%,0.7) 0px, transparent 50%),
    radial-gradient(at 100% 100%, hsla(280,100%,94%,0.6) 0px, transparent 50%),
    radial-gradient(at 0% 100%, hsla(38,100%,94%,0.6) 0px, transparent 50%);
  background-attachment: fixed;
  min-height: 100vh;
  padding-bottom: 60px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  direction: rtl;
}

/* Header Area */
.dash-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 24px;
  padding-top: 24px;
}

.dash-greeting {
  font-size: 34px;
  font-weight: 900;
  color: #0f172a;
  margin-bottom: 12px;
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 10px;
}

.dash-meta-pills {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.dash-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.9);
  color: #334155;
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 800;
  box-shadow: 0 4px 10px rgba(0,0,0,0.02);
}

/* Custom Tabs */
.dash-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  background: rgba(255, 255, 255, 0.5);
  padding: 6px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  display: inline-flex;
}
.dash-tab {
  padding: 10px 24px;
  border-radius: 14px;
  font-weight: 800;
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 8px;
}
.dash-tab.active {
  background: #fff;
  color: #3b82f6;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

/* Controls & Filters */
.dash-controls {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.smart-filter-wrapper {
  display: inline-flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(203, 213, 225, 0.8);
  padding: 6px 14px;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
  gap: 8px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.smart-filter-wrapper:focus-within,
.smart-filter-wrapper:hover {
  border-color: #3b82f6;
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.12);
  background: #fff;
}

.smart-select {
  border: none;
  background: transparent;
  outline: none;
  font-weight: 800;
  color: #0f172a;
  font-size: 14px;
  cursor: pointer;
  font-family: inherit;
  padding: 4px 0;
}

.date-input {
  border: none;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 4px 8px;
  outline: none;
  font-family: inherit;
  font-weight: 700;
  color: #0f172a;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}
.date-input:hover { background: #e2e8f0; }

.dash-btn-refresh {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(203, 213, 225, 0.8);
  color: #334155;
  padding: 10px 20px;
  border-radius: 16px;
  font-weight: 900;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
}
.dash-btn-refresh:hover {
  background: #fff;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
  border-color: #94a3b8;
}

/* Bento Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
}

.bento-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
  margin-bottom: 24px;
}

.bento-item {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 1);
  box-shadow: 
    0 4px 24px -4px rgba(15, 23, 42, 0.04), 
    0 1px 4px -1px rgba(15, 23, 42, 0.02),
    inset 0 0 0 1px rgba(255,255,255,0.4);
  padding: 24px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease;
}
.bento-item:hover {
  box-shadow: 0 14px 40px -4px rgba(15, 23, 42, 0.08);
  transform: translateY(-2px);
}

.span-3 { grid-column: span 3; }
.span-4 { grid-column: span 4; }
.span-6 { grid-column: span 6; }
.span-8 { grid-column: span 8; }
.span-12 { grid-column: span 12; }

@media (max-width: 1200px) {
  .span-3, .span-4, .span-6 { grid-column: span 6; }
  .span-8 { grid-column: span 12; }
}
@media (max-width: 768px) {
  .span-3, .span-4, .span-6, .span-8, .span-12 { grid-column: span 12; }
}

.kpi-title {
  font-size: 15px;
  font-weight: 800;
  color: #64748b;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.kpi-value {
  font-size: 40px;
  font-weight: 900;
  color: #0f172a;
  line-height: 1.1;
  margin-bottom: 16px;
  letter-spacing: -0.02em;
}
.kpi-chart-wrapper {
  height: 45px;
  width: 100%;
  margin-top: auto;
}

/* Section Headers */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.section-title {
  font-size: 19px;
  font-weight: 900;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Timeline */
.timeline-list {
  display: flex;
  flex-direction: column;
}
.tl-row {
  display: flex;
  gap: 16px;
}
.tl-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 20px;
  flex-shrink: 0;
}
.tl-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  border: 5px solid #cbd5e1;
  z-index: 2;
  margin-top: 6px;
  box-shadow: 0 0 0 4px rgba(255,255,255,0.8);
}
.tl-line {
  flex: 1;
  width: 3px;
  background: #e2e8f0;
  margin-top: 4px;
  margin-bottom: -6px;
  border-radius: 3px;
}
.tl-row:last-child .tl-line { display: none; }

@keyframes pulse-ring {
  0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
  70% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); }
  100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
}

.tl-row.status-done .tl-dot { border-color: #10b981; }
.tl-row.status-scheduled .tl-dot { 
  border-color: #3b82f6; 
  animation: pulse-ring 2s infinite;
}
.tl-row.status-canceled .tl-dot { border-color: #ef4444; }

.tl-card {
  flex: 1;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.02);
  transition: all 0.2s ease;
}
.tl-card:hover {
  background: #fff;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.06);
  transform: translateX(-4px);
}

.tl-time {
  font-size: 15px;
  font-weight: 900;
  color: #0f172a;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.tl-course {
  font-size: 19px;
  font-weight: 900;
  color: #1e293b;
  margin-bottom: 8px;
}
.tl-run {
  font-size: 14px;
  color: #64748b;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 6px;
}
.tl-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed rgba(226, 232, 240, 0.8);
  flex-wrap: wrap;
}

.btn-tl {
  flex: 1;
  min-width: 100px;
  padding: 10px;
  border-radius: 14px;
  font-weight: 800;
  font-size: 13px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-tl-main { background: #eff6ff; color: #2563eb; }
.btn-tl-main:hover:not(:disabled) { background: #dbeafe; transform: translateY(-1px); }
.btn-tl-done { background: #f0fdf4; color: #16a34a; flex: 0.5; min-width: 50px; }
.btn-tl-done:hover:not(:disabled) { background: #dcfce7; transform: translateY(-1px); }
.btn-tl-cancel { background: #fef2f2; color: #dc2626; flex: 0.5; min-width: 50px; }
.btn-tl-cancel:hover:not(:disabled) { background: #fee2e2; transform: translateY(-1px); }
.btn-tl:disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(1); }

/* Quick Actions */
.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 16px;
}
.qa-btn {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 1);
  padding: 20px 16px;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #334155;
  font-weight: 800;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;
  box-shadow: 0 4px 6px rgba(0,0,0,0.02);
}
.qa-btn:hover {
  background: #fff;
  color: #0f172a;
  transform: translateY(-4px);
  box-shadow: 0 14px 25px -5px rgba(0,0,0,0.08);
}
.qa-icon-wrap {
  width: 54px;
  height: 54px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s;
}
.qa-btn:hover .qa-icon-wrap { transform: scale(1.1); }
.qa-btn.primary .qa-icon-wrap { background: linear-gradient(135deg, #eff6ff, #dbeafe); color: #3b82f6; }
.qa-btn.success .qa-icon-wrap { background: linear-gradient(135deg, #f0fdf4, #dcfce7); color: #10b981; }
.qa-btn.danger .qa-icon-wrap { background: linear-gradient(135deg, #fef2f2, #fee2e2); color: #ef4444; }
.qa-btn.purple .qa-icon-wrap { background: linear-gradient(135deg, #faf5ff, #f3e8ff); color: #8b5cf6; }

/* List Widgets */
.list-widget {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  transition: all 0.2s;
  text-decoration: none;
}
.list-item:hover {
  background: #fff;
  box-shadow: 0 6px 16px rgba(0,0,0,0.04);
  transform: translateX(-4px);
}
.li-info {
  display: flex;
  align-items: center;
  gap: 14px;
}
.li-avatar {
  width: 46px; height: 46px;
  border-radius: 16px;
  background: #e2e8f0;
  display: flex; align-items: center; justify-content: center;
  color: #64748b; font-weight: 900;
}
.li-title { font-weight: 900; color: #0f172a; font-size: 15px; margin-bottom: 4px; }
.li-sub { font-size: 13px; color: #64748b; font-weight: 700; }
.li-value { font-weight: 900; font-size: 16px; text-align: left; direction: ltr; }
.li-value.danger { color: #ef4444; }
.li-value.success { color: #10b981; }

/* Bar Chart Styling */
.chart-col-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  z-index: 1;
  height: 100%;
  min-width: 40px;
}
.chart-bars-wrap {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: calc(100% - 25px);
  width: 100%;
  justify-content: center;
}
.chart-bar {
  width: 35%;
  max-width: 16px;
  border-radius: 6px 6px 0 0;
  transition: height 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 -2px 6px rgba(0,0,0,0.1);
}
.chart-bar.income-bar { background: linear-gradient(180deg, #10b981 0%, #059669 100%); }
.chart-bar.expense-bar { background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%); }
.chart-label { font-size: 12px; color: #64748b; font-weight: 700; margin-top: 8px; white-space: nowrap; }

/* Loader */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton-pulse {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite linear;
  border-radius: 8px;
}

/* تنسيقات الأزرار الأصلية المسحوبة من ملف الأطفال للمودال */
.btn-add {
  background: #3b82f6 !important;
  color: #fff !important;
  border: none !important;
  border-radius: 12px !important;
  padding: 10px 20px !important;
  font-weight: 800 !important;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.25) !important;
  transition: all 0.2s !important;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.btn-add:hover {
  transform: translateY(-2px);
  background: #2563eb !important;
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.3) !important;
}

/* تنسيقات المدخلات للمودال المشتركة */
.search-wrapper {
  position: relative;
  width: 100%;
}
.search-input {
  width: 100%;
  padding: 12px 16px 12px 42px;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  background: #fff;
  font-size: 14px;
  transition: all 0.2s;
  outline: none;
  font-family: inherit;
}
.search-input:focus {
  border-color: #3b82f6;
}
.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
}
.form-section-title {
  margin: 0 0 16px 0;
  color: #0f172a;
  font-size: 16px;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.enrollment-picker-list {
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fff;
  display: flex;
  flex-direction: column;
}
.enrollment-picker-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.enrollment-picker-item:last-child {
  border-bottom: none;
}
.enrollment-picker-item:hover {
  background: #f8fafc;
}
.enrollment-picker-item.selected {
  background: #f0fdf4;
  border-right: 4px solid #16a34a;
}
.epi-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.epi-name {
  font-weight: 800;
  color: #0f172a;
  font-size: 15px;
}
.epi-meta {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}
.epi-balance {
  font-weight: 900;
  font-size: 14px;
  color: #16a34a;
  direction: rtl;
}
.epi-balance.debt {
  color: #dc2626;
}

/* تنسيقات الفورم المنسوخة من ملف الأطفال */
.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 16px;
}
.input {
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  font-size: 14px;
  transition: all 0.2s;
  outline: none;
  font-family: inherit;
}
.input:focus {
  border-color: #3b82f6;
}
.muted {
  font-size: 13px;
  font-weight: 800;
  color: #64748b;
  margin-bottom: 6px;
}
`;

export default function Dashboard() {
  const { toast } = useOutletContext();
  const navigate = useNavigate();

  // ============================================================================
  // States
  // ============================================================================
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [time, setTime] = useState(new Date());

  // Tab State
  const [activeTab, setActiveTab] = useState("overview");

  // فلاتر الوقت الذكية
  const [preset, setPreset] = useState("this_month");
  const [customStartDate, setCustomStartDate] = useState(() =>
    toDateString(startOfMonth(new Date())),
  );
  const [customEndDate, setCustomEndDate] = useState(() =>
    toDateString(new Date()),
  );

  const [dashData, setDashData] = useState({
    incomeFiltered: 0,
    expenseFiltered: 0,
    netFiltered: 0,
    activeStudents: 0,
    sessionsCountToday: 0,
    incomeTrend: [],
    expenseTrend: [],
    chartLabels: [],
    todaySessions: [],
    debtors: [],
    recentTransactions: [],
    expenseCategories: [],
  });

  const [confirm, setConfirm] = useState({
    open: false,
    action: null,
    sessionId: null,
  });

  // ==========================================
  // حالات وإعدادات إضافة مصروف
  // ==========================================
  const [openExpAdd, setOpenExpAdd] = useState(false);
  const [expDate, setExpDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("");
  const [expParty, setExpParty] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [savingExp, setSavingExp] = useState(false);

  const [catOptions, setCatOptions] = useState([]);
  const [partyOptions, setPartyOptions] = useState([]);

  // ==========================================
  // حالات وإعدادات إضافة دفعة (قبض دفعة)
  // ==========================================
  const [openPayAdd, setOpenPayAdd] = useState(false);
  const [payEnrId, setPayEnrId] = useState("");
  const [payAmt, setPayAmt] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payNote, setPayNote] = useState("");
  const [payAt, setPayAt] = useState(toInputDatetimeLocal(new Date()));
  const [savingPay, setSavingPay] = useState(false);

  const [pickerRows, setPickerRows] = useState([]);
  const [pickerQ, setPickerQ] = useState("");

  // ==========================================
  // حالات وإعدادات إضافة طالب جديد (النسخة الأصلية)
  // ==========================================
  const [openChildAdd, setOpenChildAdd] = useState(false);
  const [savingChild, setSavingChild] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    id_number: "",
    birth_date: "",
    gender: "male",
    class: "",
    mother_name: "",
    mother_phone: "",
    father_name: "",
    father_phone: "",
    country_name: "",
    notes: "",
  });
  const [countries, setCountries] = useState([]);
  const [classes, setClasses] = useState([]);

  // تحديث الساعة الحية
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ============================================================================
  // Data Fetching Engine
  // ============================================================================
  async function loadDashboard() {
    if (!customStartDate || !customEndDate) return;
    if (new Date(customStartDate) > new Date(customEndDate)) {
      toast("تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية", "warn");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const dayStartObj = startOfDay(now);
      const dayEndObj = endOfDay(now);
      const isoDayStart = dayStartObj.toISOString();
      const isoDayEnd = dayEndObj.toISOString();

      const { fromIso, toIso, bins } = getRangeAndBins(
        preset,
        customStartDate,
        customEndDate,
      );

      const qActiveStudents = supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");
      const qSessionsToday = supabase
        .from("course_sessions")
        .select("*")
        .gte("start_at", isoDayStart)
        .lte("start_at", isoDayEnd)
        .order("start_at", { ascending: true });
      const qRunsSummary = supabase
        .from("course_runs_summary_view")
        .select("run_id, title, label");
      const qDebtors = supabase
        .from("run_participants_view")
        .select("child_name, child_id, balance")
        .eq("enrollment_status", "active")
        .gt("balance", 0)
        .order("balance", { ascending: false })
        .limit(5);
      const qRecentPays = supabase
        .from("payments_details_view")
        .select("id, amount, child_name, method, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      const qRecentExps = supabase
        .from("expenses")
        .select("id, amount, category, party, created_at, spent_on")
        .order("created_at", { ascending: false })
        .limit(5);

      const qPayments = supabase
        .from("payments")
        .select("amount, created_at")
        .gte("created_at", fromIso)
        .lte("created_at", toIso);
      const qExpenses = supabase
        .from("expenses")
        .select("amount, category, spent_on")
        .gte("spent_on", fromIso.split("T")[0])
        .lte("spent_on", toIso.split("T")[0]);

      const [
        { count: activeStudentsCount, error: e1 },
        { data: sessionsToday, error: e2 },
        { data: runsSummary, error: e3 },
        { data: debtorsData, error: e4 },
        { data: recentPays, error: e5 },
        { data: recentExps, error: e6 },
        { data: paymentsData, error: e7 },
        { data: expensesData, error: e8 },
      ] = await Promise.all([
        qActiveStudents,
        qSessionsToday,
        qRunsSummary,
        qDebtors,
        qRecentPays,
        qRecentExps,
        qPayments,
        qExpenses,
      ]);

      const errs = [e1, e2, e3, e4, e5, e6, e7, e8].filter(Boolean);
      if (errs.length > 0) {
        console.error("Dashboard Fetch Errors:", errs);
        setError({
          message: "حدث خطأ أثناء جلب بعض البيانات، يرجى المحاولة لاحقاً.",
        });
      }

      // --- Processing ---
      const enrichedSessions = (sessionsToday || []).map((session) => {
        const runInfo = (runsSummary || []).find(
          (r) => r.run_id === session.run_id,
        );
        return {
          ...session,
          course_title: runInfo?.title || "دورة غير محددة",
          run_label: runInfo?.label || "فوج غير محدد",
        };
      });

      let combinedTx = [];
      if (recentPays) {
        combinedTx.push(
          ...recentPays.map((p) => ({
            type: "income",
            id: `p_${p.id}`,
            title: p.child_name || "دفعة طالب",
            subtitle:
              p.method === "cash"
                ? "كاش"
                : p.method === "card"
                  ? "بطاقة"
                  : "تحويل",
            amount: p.amount,
            date: p.created_at,
          })),
        );
      }
      if (recentExps) {
        combinedTx.push(
          ...recentExps.map((e) => ({
            type: "expense",
            id: `e_${e.id}`,
            title: e.category || "مصروف عام",
            subtitle: e.party || "—",
            amount: e.amount,
            date: e.created_at,
          })),
        );
      }
      combinedTx.sort((a, b) => new Date(b.date) - new Date(a.date));
      combinedTx = combinedTx.slice(0, 6);

      const totalIncome = (paymentsData || []).reduce(
        (sum, p) => sum + Number(p.amount || 0),
        0,
      );
      const totalExpense = (expensesData || []).reduce(
        (sum, e) => sum + Number(e.amount || 0),
        0,
      );
      const netProfit = totalIncome - totalExpense;

      const expCatMap = new Map();
      (expensesData || []).forEach((e) => {
        const cat = e.category || "أخرى";
        expCatMap.set(cat, (expCatMap.get(cat) || 0) + Number(e.amount || 0));
      });
      const expCategories = Array.from(expCatMap.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);

      const incTrendArr = bins.map((b) => {
        return (paymentsData || [])
          .filter((p) => {
            const t = new Date(p.created_at).getTime();
            return t >= b.start && t <= b.end;
          })
          .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      });

      const expTrendArr = bins.map((b) => {
        return (expensesData || [])
          .filter((e) => {
            const t = new Date(e.spent_on).getTime();
            return t >= b.start && t <= b.end;
          })
          .reduce((sum, e) => sum + Number(e.amount || 0), 0);
      });

      setDashData({
        incomeFiltered: totalIncome,
        expenseFiltered: totalExpense,
        netFiltered: netProfit,
        activeStudents: activeStudentsCount || 0,
        sessionsCountToday: enrichedSessions.length,
        incomeTrend: incTrendArr,
        expenseTrend: expTrendArr,
        chartLabels: bins.map((b) => b.label),
        todaySessions: enrichedSessions,
        debtors: debtorsData || [],
        recentTransactions: combinedTx,
        expenseCategories: expCategories,
      });
    } catch (err) {
      console.error("Dashboard Hard Crash:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, customStartDate, customEndDate]);

  async function changeSessionStatus(id, newStatus) {
    const { error: upErr } = await supabase
      .from("course_sessions")
      .update({ status: newStatus })
      .eq("id", id);
    if (upErr) {
      toast("حدث خطأ أثناء تحديث الجلسة.", "danger");
      return;
    }
    toast("تم تحديث الجلسة بنجاح.", "ok");
    loadDashboard();
  }

  // ============================================================================
  // دوال نافذة المصاريف
  // ============================================================================
  async function loadPicklists() {
    const [catsRes, partiesRes] = await Promise.all([
      supabase
        .from("expense_categories")
        .select("name")
        .order("name", { ascending: true }),
      supabase
        .from("expense_parties")
        .select("name")
        .order("name", { ascending: true }),
    ]);
    if (!catsRes.error && !partiesRes.error) {
      setCatOptions((catsRes.data || []).map((x) => x.name).filter(Boolean));
      setPartyOptions(
        (partiesRes.data || []).map((x) => x.name).filter(Boolean),
      );
    }
  }

  async function safeInsertPicklist(tableName, rawName) {
    const name = String(rawName || "").trim();
    if (!name) return { ok: false };
    const ins = await supabase.from(tableName).insert([{ name }]);
    if (ins.error) {
      const msg = String(ins.error.message || "").toLowerCase();
      if (ins.error.code === "23505" || msg.includes("duplicate"))
        return { ok: true };
      return { ok: false };
    }
    return { ok: true };
  }

  const openExpenseModal = () => {
    setExpDate(new Date().toISOString().split("T")[0]);
    setExpAmount("");
    setExpCategory("");
    setExpParty("");
    setExpDesc("");
    loadPicklists();
    setOpenExpAdd(true);
  };

  async function handleSaveExpense() {
    const amount = Number(expAmount);
    if (!expDate) {
      toast("الرجاء اختيار التاريخ.", "warn");
      return;
    }
    if (!amount || amount <= 0) {
      toast("الرجاء إدخال مبلغ صحيح.", "warn");
      return;
    }

    setSavingExp(true);
    try {
      if (expCategory?.trim())
        await safeInsertPicklist("expense_categories", expCategory);
      if (expParty?.trim())
        await safeInsertPicklist("expense_parties", expParty);

      const payload = {
        spent_on: expDate,
        amount,
        category: expCategory?.trim() || null,
        party: expParty?.trim() || null,
        description: expDesc?.trim() || null,
      };

      const ins = await supabase.from("expenses").insert([payload]);
      if (ins.error) throw ins.error;

      toast("تم صرف المبلغ وحفظ المصروف بنجاح.", "ok");
      setOpenExpAdd(false);
      loadDashboard();
    } catch (e) {
      console.error(e);
      toast("فشل حفظ المصروف.", "danger");
    } finally {
      setSavingExp(false);
    }
  }

  // ============================================================================
  // دوال نافذة قبض الدفعة
  // ============================================================================
  async function loadPaymentPicklists() {
    const [pRes, cRes] = await Promise.all([
      supabase
        .from("run_participants_view")
        .select("enrollment_id, child_name, run_id, balance"),
      supabase.from("course_runs_summary_view").select("run_id, title, label"),
    ]);

    if (!pRes.error && !cRes.error) {
      const runsMap = {};
      (cRes.data || []).forEach((r) => {
        runsMap[r.run_id] = r;
      });

      const merged = (pRes.data || []).map((p) => ({
        enrollment_id: p.enrollment_id,
        child_name: p.child_name || "—",
        course_title: runsMap[p.run_id]?.title || "—",
        run_label: runsMap[p.run_id]?.label || "—",
        balance: Number(p.balance || 0),
      }));

      merged.sort((a, b) => a.child_name.localeCompare(b.child_name, "ar"));
      setPickerRows(merged);
    }
  }

  const openPaymentModal = () => {
    setPayEnrId("");
    setPayAmt("");
    setPayMethod("cash");
    setPayNote("");
    setPickerQ("");
    setPayAt(toInputDatetimeLocal(new Date()));
    loadPaymentPicklists();
    setOpenPayAdd(true);
  };

  const pickerFiltered = useMemo(() => {
    const s = pickerQ.trim().toLowerCase();
    if (!s) return pickerRows;
    return pickerRows.filter((r) => {
      const cName = String(r.child_name || "").toLowerCase();
      const crs = String(r.course_title || "").toLowerCase();
      return cName.includes(s) || crs.includes(s);
    });
  }, [pickerRows, pickerQ]);

  useEffect(() => {
    if (payEnrId) {
      const match = pickerRows.find((r) => r.enrollment_id === payEnrId);
      if (match && Number(match.balance) > 0 && !payAmt) {
        setPayAmt(match.balance);
      }
    }
  }, [payEnrId]);

  async function handleSavePayment() {
    if (!payEnrId) {
      toast("الرجاء اختيار الطالب والاشتراك.", "warn");
      return;
    }
    const val = Number(payAmt);
    if (!val || val <= 0) {
      toast("أدخل مبلغًا صحيحًا.", "warn");
      return;
    }

    setSavingPay(true);
    try {
      const payload = {
        enrollment_id: payEnrId,
        amount: val,
        method: payMethod,
        note: payNote.trim() || null,
        created_at: new Date(payAt).toISOString(),
      };

      const { error: insErr } = await supabase
        .from("payments")
        .insert([payload]);
      if (insErr) throw insErr;

      toast("تم تسجيل الدفعة بنجاح.", "ok");
      setOpenPayAdd(false);
      loadDashboard();
    } catch (e) {
      toast("حدث خطأ أثناء الحفظ.", "danger");
      console.error(e);
    } finally {
      setSavingPay(false);
    }
  }

  // ============================================================================
  // دوال نافذة إضافة طالب (النسخة الأصلية)
  // ============================================================================
  async function loadChildPicklists() {
    const [cRes, clRes] = await Promise.all([
      supabase.from("countries").select("name").order("name"),
      supabase.from("child_classes").select("name").order("name"),
    ]);
    if (!cRes.error) setCountries(cRes.data || []);
    if (!clRes.error) setClasses(clRes.data || []);
  }

  const openChildModal = () => {
    setFormData({
      name: "",
      id_number: "",
      birth_date: "",
      gender: "male",
      class: "",
      mother_name: "",
      mother_phone: "",
      father_name: "",
      father_phone: "",
      country_name: "",
      notes: "",
    });
    loadChildPicklists();
    setOpenChildAdd(true);
  };

  async function handleSaveChild() {
    if (!formData.name.trim()) {
      toast("يرجى إدخال اسم الطالب.", "warn");
      return;
    }

    setSavingChild(true);
    try {
      if (formData.country_name?.trim()) {
        await safeInsertPicklist("countries", formData.country_name);
      }
      if (formData.class?.trim()) {
        await safeInsertPicklist("child_classes", formData.class);
      }

      const payload = {
        name: formData.name.trim(),
        id_number: formData.id_number.trim() || null,
        birth_date: formData.birth_date || null,
        gender: formData.gender,
        class: formData.class.trim() || null,
        mother_name: formData.mother_name.trim() || null,
        mother_phone: formData.mother_phone.trim() || null,
        father_name: formData.father_name.trim() || null,
        father_phone: formData.father_phone.trim() || null,
        country: formData.country_name.trim() || null,
        notes: formData.notes.trim() || null,
      };

      const { error } = await supabase.from("children").insert([payload]);

      if (error) throw error;
      toast("تم إضافة الطالب بنجاح.", "ok");
      setOpenChildAdd(false);
      loadDashboard();
    } catch (e) {
      toast("فشل حفظ البيانات.", "danger");
      console.error(e);
    } finally {
      setSavingChild(false);
    }
  }

  const todayFormatted = useMemo(() => {
    const d = new Date();
    return new Intl.DateTimeFormat("ar-EG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d);
  }, []);

  const currentTimeStr = new Intl.DateTimeFormat("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(time);

  const rangeLabels = {
    today: "اليوم",
    "7d": "آخر 7 أيام",
    this_month: "هذا الشهر",
    "30d": "آخر 30 يوم",
    this_year: "هذه السنة",
    all: "كل الوقت",
    custom: "فترة مخصصة",
  };

  return (
    <div className="page page--dashboard" dir="rtl" lang="ar">
      <style>{DASHBOARD_STYLES}</style>
      <div className="container" style={{ maxWidth: 1440 }}>
        {/* ==================== Header Section ==================== */}
        <div className="dash-header">
          <div>
            <h1 className="dash-greeting">{getGreeting()}، جيمي</h1>
            <div className="dash-meta-pills">
              <div className="dash-pill">
                <CalendarDays size={16} color="#3b82f6" />
                {todayFormatted}
              </div>
              <div className="dash-pill" style={{ color: "#8b5cf6" }}>
                <Clock size={16} color="#8b5cf6" />
                <span dir="ltr">{currentTimeStr}</span>
              </div>
            </div>
          </div>

          <div className="dash-controls">
            <div className="smart-filter-wrapper">
              <Filter size={16} color="#64748b" />
              <select
                className="smart-select"
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
              >
                <option value="today">اليوم</option>
                <option value="7d">آخر 7 أيام</option>
                <option value="this_month">هذا الشهر</option>
                <option value="30d">آخر 30 يوم</option>
                <option value="this_year">هذه السنة</option>
                <option value="all">كل الوقت</option>
                <option value="custom">تاريخ مخصص...</option>
              </select>

              {preset === "custom" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    borderRight: "1px solid #e2e8f0",
                    paddingRight: "8px",
                    marginLeft: "4px",
                  }}
                >
                  <input
                    type="date"
                    className="date-input"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                  <span
                    style={{ fontSize: 13, color: "#94a3b8", fontWeight: 800 }}
                  >
                    إلى
                  </span>
                  <input
                    type="date"
                    className="date-input"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              )}
            </div>

            <button
              className="dash-btn-refresh"
              onClick={loadDashboard}
              disabled={loading}
            >
              <RefreshCcw
                size={16}
                className={loading ? "spin" : ""}
                color="#3b82f6"
              />
              تحديث
            </button>
          </div>
        </div>

        {error && <ErrorBanner error={error} />}

        {/* ==================== Tabs ==================== */}
        <div className="dash-tabs">
          <button
            className={`dash-tab ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <Activity size={16} /> نظرة عامة
          </button>
          <button
            className={`dash-tab ${activeTab === "financial" ? "active" : ""}`}
            onClick={() => setActiveTab("financial")}
          >
            <BarChart3 size={16} /> التحليل المالي
          </button>
          <button
            className={`dash-tab ${activeTab === "schedule" ? "active" : ""}`}
            onClick={() => setActiveTab("schedule")}
          >
            <CheckSquare size={16} /> الجدول والعمليات
          </button>
        </div>

        {/* ==================== ROW 1: Enterprise KPIs ==================== */}
        <div
          className="kpi-grid"
          style={{ display: activeTab === "schedule" ? "none" : "grid" }}
        >
          <div className="bento-item">
            <div className="kpi-title">
              <div
                style={{ background: "#f0fdf4", padding: 8, borderRadius: 10 }}
              >
                <TrendingUp size={20} color="#10b981" />
              </div>
              الإيرادات ({rangeLabels[preset]})
            </div>
            {loading ? (
              <div
                className="skeleton-pulse"
                style={{ height: 45, width: "60%" }}
              ></div>
            ) : (
              <div className="kpi-value">
                {fmtMoney(dashData.incomeFiltered)}{" "}
                <span style={{ fontSize: 20, color: "#94a3b8" }}>₪</span>
              </div>
            )}
            <div className="kpi-chart-wrapper">
              {!loading && (
                <Sparkline
                  data={dashData.incomeTrend}
                  color="#10b981"
                  type="line"
                />
              )}
            </div>
          </div>

          <div className="bento-item">
            <div className="kpi-title">
              <div
                style={{ background: "#fef2f2", padding: 8, borderRadius: 10 }}
              >
                <TrendingDown size={20} color="#ef4444" />
              </div>
              المصاريف ({rangeLabels[preset]})
            </div>
            {loading ? (
              <div
                className="skeleton-pulse"
                style={{ height: 45, width: "60%" }}
              ></div>
            ) : (
              <div className="kpi-value">
                {fmtMoney(dashData.expenseFiltered)}{" "}
                <span style={{ fontSize: 20, color: "#94a3b8" }}>₪</span>
              </div>
            )}
            <div className="kpi-chart-wrapper">
              {!loading && (
                <Sparkline
                  data={dashData.expenseTrend}
                  color="#ef4444"
                  type="bar"
                />
              )}
            </div>
          </div>

          <div
            className="bento-item"
            style={
              !loading && dashData.netFiltered >= 0
                ? { background: "#f0fdf4", borderColor: "#bbf7d0" }
                : !loading
                  ? { background: "#fef2f2", borderColor: "#fecaca" }
                  : {}
            }
          >
            <div
              className="kpi-title"
              style={{
                color:
                  !loading && dashData.netFiltered >= 0
                    ? "#059669"
                    : !loading
                      ? "#dc2626"
                      : "#64748b",
              }}
            >
              <div
                style={{
                  background: "#fff",
                  padding: 8,
                  borderRadius: 10,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                }}
              >
                <BadgeDollarSign
                  size={20}
                  color={
                    !loading && dashData.netFiltered >= 0
                      ? "#10b981"
                      : !loading
                        ? "#ef4444"
                        : "#64748b"
                  }
                />
              </div>
              صافي الأرباح
            </div>
            {loading ? (
              <div
                className="skeleton-pulse"
                style={{ height: 45, width: "60%" }}
              ></div>
            ) : (
              <div
                className="kpi-value"
                style={{
                  color: dashData.netFiltered >= 0 ? "#047857" : "#b91c1c",
                }}
              >
                <span dir="ltr">
                  {dashData.netFiltered > 0 ? "+" : ""}
                  {fmtMoney(dashData.netFiltered)}
                </span>{" "}
                <span style={{ fontSize: 20, opacity: 0.5 }}>₪</span>
              </div>
            )}
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                marginTop: "auto",
                color:
                  !loading && dashData.netFiltered >= 0 ? "#10b981" : "#ef4444",
                opacity: 0.8,
              }}
            >
              {loading ? (
                <div
                  className="skeleton-pulse"
                  style={{ height: 16, width: "80%" }}
                ></div>
              ) : dashData.netFiltered >= 0 ? (
                "أداء مالي إيجابي لهذه الفترة"
              ) : (
                "تنبيه: المصاريف تتجاوز الإيرادات!"
              )}
            </div>
          </div>

          <div className="bento-item">
            <div className="kpi-title">
              <div
                style={{ background: "#eff6ff", padding: 8, borderRadius: 10 }}
              >
                <Users size={20} color="#3b82f6" />
              </div>
              الطلاب النشطين
            </div>
            {loading ? (
              <div
                className="skeleton-pulse"
                style={{ height: 45, width: "60%" }}
              ></div>
            ) : (
              <div className="kpi-value" style={{ fontSize: 44 }}>
                {dashData.activeStudents}
              </div>
            )}
            <div
              style={{
                color: "#64748b",
                fontSize: 13,
                fontWeight: 800,
                marginTop: "auto",
              }}
            >
              {loading ? (
                <div
                  className="skeleton-pulse"
                  style={{ height: 16, width: "80%" }}
                ></div>
              ) : (
                "إجمالي الاشتراكات الفعالة بالمركز"
              )}
            </div>
          </div>
        </div>

        {/* ==================== TABS CONTENT ==================== */}

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="bento-grid">
            <div className="bento-item span-8" style={{ minHeight: 450 }}>
              <div className="section-header">
                <h2 className="section-title">
                  <Clock size={24} color="#3b82f6" /> جدول اليوم
                </h2>
                {!loading && (
                  <Badge
                    variant="info"
                    style={{ fontSize: 14, padding: "6px 12px" }}
                  >
                    {dashData.sessionsCountToday} جلسات
                  </Badge>
                )}
              </div>

              {loading ? (
                <div className="timeline-list">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="tl-row">
                      <div className="tl-indicator">
                        <div className="tl-dot"></div>
                        <div className="tl-line"></div>
                      </div>
                      <div className="tl-card">
                        <div
                          className="skeleton-pulse"
                          style={{ height: 100 }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : dashData.todaySessions.length === 0 ? (
                <EmptyState
                  icon={Sparkles}
                  title="يوم راحة!"
                  description="لا توجد أي جلسات مبرمجة في جدولك لهذا اليوم."
                />
              ) : (
                <div className="timeline-list">
                  {dashData.todaySessions.map((s) => {
                    const statusClass =
                      s.status === "done"
                        ? "status-done"
                        : s.status === "canceled"
                          ? "status-canceled"
                          : "status-scheduled";
                    return (
                      <div key={s.id} className={`tl-row ${statusClass}`}>
                        <div className="tl-indicator">
                          <div className="tl-dot"></div>
                          <div className="tl-line"></div>
                        </div>
                        <div className="tl-card">
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              flexWrap: "wrap",
                              gap: 16,
                            }}
                          >
                            <div>
                              <div className="tl-time">
                                <span dir="ltr">
                                  {formatTimeLocally(s.start_at)}
                                </span>
                                <span style={{ color: "#cbd5e1" }}>-</span>
                                <span
                                  dir="ltr"
                                  style={{ color: "#64748b", fontSize: 15 }}
                                >
                                  {formatTimeLocally(s.end_at)}
                                </span>
                                {s.status === "done" && (
                                  <Badge variant="ok" style={{ marginLeft: 8 }}>
                                    مكتملة
                                  </Badge>
                                )}
                                {s.status === "canceled" && (
                                  <Badge
                                    variant="danger"
                                    style={{ marginLeft: 8 }}
                                  >
                                    ملغاة
                                  </Badge>
                                )}
                              </div>
                              <div className="tl-course">{s.course_title}</div>
                              <div className="tl-run">
                                <Layers size={16} /> الفوج: {s.run_label}
                              </div>
                            </div>
                            <div
                              style={{
                                minWidth: 220,
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "flex-end",
                              }}
                            >
                              <div className="tl-actions">
                                <button
                                  className="btn-tl btn-tl-main"
                                  disabled={s.status === "canceled"}
                                  onClick={() =>
                                    navigate(`/sessions/${s.id}/attendance`)
                                  }
                                >
                                  <ClipboardList size={18} /> أخذ الحضور
                                </button>
                                <button
                                  className="btn-tl btn-tl-done"
                                  disabled={s.status !== "scheduled"}
                                  onClick={() =>
                                    setConfirm({
                                      open: true,
                                      action: "done",
                                      sessionId: s.id,
                                    })
                                  }
                                >
                                  <CheckCircle2 size={18} />
                                </button>
                                <button
                                  className="btn-tl btn-tl-cancel"
                                  disabled={s.status !== "scheduled"}
                                  onClick={() =>
                                    setConfirm({
                                      open: true,
                                      action: "canceled",
                                      sessionId: s.id,
                                    })
                                  }
                                >
                                  <XCircle size={18} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div
              className="span-4"
              style={{ display: "flex", flexDirection: "column", gap: 24 }}
            >
              <div className="bento-item" style={{ padding: "24px 24px 16px" }}>
                <div className="quick-actions-grid">
                  <div onClick={openPaymentModal} className="qa-btn success">
                    <div className="qa-icon-wrap">
                      <CreditCard size={28} />
                    </div>
                    قبض دفعة
                  </div>

                  <div onClick={openExpenseModal} className="qa-btn danger">
                    <div className="qa-icon-wrap">
                      <Receipt size={28} />
                    </div>
                    صرف مبلغ
                  </div>

                  <div onClick={openChildModal} className="qa-btn primary">
                    <div className="qa-icon-wrap">
                      <UserPlus size={28} />
                    </div>
                    إضافة طالب
                  </div>

                  <Link to="/calendar" className="qa-btn purple">
                    <div className="qa-icon-wrap">
                      <CalendarClock size={28} />
                    </div>
                    التقويم
                  </Link>
                </div>
              </div>
              <div className="bento-item" style={{ flex: 1 }}>
                <div className="section-header" style={{ marginBottom: 20 }}>
                  <h2 className="section-title" style={{ color: "#ef4444" }}>
                    <BellRing size={22} color="#ef4444" /> رادار الديون
                  </h2>
                  {!loading && (
                    <Badge variant="danger" style={{ fontSize: 14 }}>
                      {dashData.debtors.length}
                    </Badge>
                  )}
                </div>
                {loading ? (
                  <div className="list-widget">
                    {[1, 2].map((n) => (
                      <div key={n} className="list-item">
                        <div
                          className="skeleton-pulse"
                          style={{ height: 40, width: "100%" }}
                        ></div>
                      </div>
                    ))}
                  </div>
                ) : dashData.debtors.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: 30,
                      color: "#10b981",
                      fontSize: 15,
                      fontWeight: 800,
                      background: "#f0fdf4",
                      borderRadius: 16,
                    }}
                  >
                    <CheckCircle2 size={32} style={{ margin: "0 auto 10px" }} />
                    الوضع ممتاز!
                  </div>
                ) : (
                  <div className="list-widget">
                    {dashData.debtors.map((d, i) => (
                      <Link
                        to={`/children/${d.child_id}`}
                        key={i}
                        className="list-item"
                      >
                        <div className="li-info">
                          <div
                            className="li-avatar"
                            style={{ background: "#fee2e2", color: "#ef4444" }}
                          >
                            <AlertOctagon size={20} />
                          </div>
                          <div>
                            <div className="li-title">{d.child_name}</div>
                            <div className="li-sub">تأخر بالدفع</div>
                          </div>
                        </div>
                        <div className="li-value danger">
                          {fmtMoney(d.balance)} ₪
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FINANCIALS */}
        {activeTab === "financial" && (
          <div className="bento-grid">
            <div className="bento-item span-8" style={{ minHeight: 450 }}>
              <div className="section-header">
                <h2 className="section-title">
                  <PieChartIcon size={24} color="#8b5cf6" /> التدفق المالي
                </h2>
              </div>
              <div
                style={{
                  color: "#64748b",
                  fontSize: 14,
                  fontWeight: 800,
                  marginBottom: 20,
                }}
              >
                الإيرادات مقابل المصاريف ({rangeLabels[preset]}).
              </div>
              <div className="chart-legend">
                <div className="legend-item">
                  <div
                    className="legend-color"
                    style={{ background: "#10b981" }}
                  ></div>{" "}
                  الإيرادات
                </div>
                <div className="legend-item">
                  <div
                    className="legend-color"
                    style={{ background: "#ef4444" }}
                  ></div>{" "}
                  المصاريف
                </div>
              </div>
              {loading ? (
                <div
                  style={{
                    height: 220,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    className="skeleton-pulse"
                    style={{ height: "100%", width: "100%" }}
                  ></div>
                </div>
              ) : (
                <DualBarChart
                  incomeData={dashData.incomeTrend}
                  expenseData={dashData.expenseTrend}
                  labels={dashData.chartLabels}
                />
              )}
            </div>

            <div className="bento-item span-4">
              <div className="section-header">
                <h2 className="section-title">
                  <Briefcase size={22} color="#0f172a" /> توزيع المصاريف
                </h2>
              </div>
              {loading ? (
                <div
                  style={{
                    height: 200,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    className="skeleton-pulse"
                    style={{ height: 120, width: 120, borderRadius: "50%" }}
                  ></div>
                </div>
              ) : (
                <ExpenseDonutChart data={dashData.expenseCategories} />
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SCHEDULE & TRANSACTIONS */}
        {activeTab === "schedule" && (
          <div className="bento-grid">
            <div className="bento-item span-12">
              <div className="section-header" style={{ marginBottom: 20 }}>
                <h2 className="section-title">
                  <History size={22} color="#0f172a" /> أحدث الحركات المالية
                </h2>
              </div>

              {loading ? (
                <div className="list-widget">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="list-item">
                      <div
                        className="skeleton-pulse"
                        style={{ height: 40, width: "100%" }}
                      ></div>
                    </div>
                  ))}
                </div>
              ) : dashData.recentTransactions.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="لا توجد حركات"
                  description="لم يتم تسجيل أي حركات مالية في الفترة المحددة."
                />
              ) : (
                <div className="list-widget">
                  {dashData.recentTransactions.map((tx) => {
                    const isIncome = tx.type === "income";
                    const Icon = isIncome ? ArrowDownRight : ArrowUpRight;
                    const colorClass = isIncome ? "success" : "danger";
                    const bgClass = isIncome ? "#f0fdf4" : "#fef2f2";
                    const iconColor = isIncome ? "#10b981" : "#ef4444";

                    return (
                      <div key={tx.id} className="list-item">
                        <div className="li-info">
                          <div
                            className="li-avatar"
                            style={{ background: bgClass, color: iconColor }}
                          >
                            <Icon size={20} strokeWidth={2.5} />
                          </div>
                          <div>
                            <div className="li-title">{tx.title}</div>
                            <div className="li-sub">
                              {tx.subtitle} •{" "}
                              <span dir="ltr">
                                {formatTimeLocally(tx.date)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className={`li-value ${colorClass}`}>
                          <span dir="ltr">
                            {isIncome ? "+" : "-"}
                            {fmtMoney(tx.amount)} ₪
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================================ */}
        {/* نافذة إضافة مصروف (Quick Add) */}
        {/* ============================================================================ */}
        <Modal
          open={openExpAdd}
          title="إضافة مصروف جديد"
          onClose={() => !savingExp && setOpenExpAdd(false)}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              padding: "10px 0",
            }}
          >
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 45%" }}>
                <div
                  style={{
                    marginBottom: 6,
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#64748b",
                  }}
                >
                  التاريخ *
                </div>
                <input
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    outline: "none",
                    fontFamily: "inherit",
                    fontSize: "15px",
                  }}
                />
              </div>
              <div style={{ flex: "1 1 45%" }}>
                <div
                  style={{
                    marginBottom: 6,
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#64748b",
                  }}
                >
                  المبلغ (₪) *
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  placeholder="مثال: 150"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    outline: "none",
                    fontFamily: "inherit",
                    fontSize: "15px",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 45%" }}>
                <div
                  style={{
                    marginBottom: 6,
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#64748b",
                  }}
                >
                  الفئة
                </div>
                <CustomCombobox
                  value={expCategory}
                  onChange={setExpCategory}
                  options={catOptions.map((c) => ({ value: c, label: c }))}
                  placeholder="اختر أو اكتب فئة..."
                />
              </div>
              <div style={{ flex: "1 1 45%" }}>
                <div
                  style={{
                    marginBottom: 6,
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#64748b",
                  }}
                >
                  شخص / المتجر
                </div>
                <CustomCombobox
                  value={expParty}
                  onChange={setExpParty}
                  options={partyOptions.map((p) => ({ value: p, label: p }))}
                  placeholder="اختر أو اكتب متجر..."
                />
              </div>
            </div>

            <div>
              <div
                style={{
                  marginBottom: 6,
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#64748b",
                }}
              >
                الوصف (اختياري)
              </div>
              <input
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                placeholder="مثال: ضيافة للطلاب، قرطاسية..."
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  outline: "none",
                  fontFamily: "inherit",
                  fontSize: "15px",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 10,
              }}
            >
              <button
                style={{
                  padding: "12px 24px",
                  borderRadius: "14px",
                  border: "1px solid #e2e8f0",
                  background: "white",
                  cursor: "pointer",
                  fontWeight: 800,
                  color: "#64748b",
                }}
                onClick={() => setOpenExpAdd(false)}
                disabled={savingExp}
              >
                إلغاء
              </button>
              <button
                style={{
                  background: "#ef4444",
                  color: "white",
                  padding: "12px 24px",
                  borderRadius: "14px",
                  border: "none",
                  fontWeight: "800",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(239, 68, 68, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
                onClick={handleSaveExpense}
                disabled={savingExp}
              >
                <Receipt size={18} />
                {savingExp ? "جاري الحفظ..." : "حفظ المصروف"}
              </button>
            </div>
          </div>
        </Modal>

        {/* ============================================================================ */}
        {/* نافذة قبض دفعة (Quick Add) */}
        {/* ============================================================================ */}
        <Modal
          open={openPayAdd}
          title="تسجيل دفعة واردة"
          onClose={() => !savingPay && setOpenPayAdd(false)}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              padding: "10px 0",
            }}
          >
            <div style={{ gridColumn: "span 12" }}>
              <h4 className="form-section-title">
                <UserRound size={18} color="#64748b" /> اختيار الاشتراك
              </h4>
              <div
                className="search-wrapper"
                style={{ maxWidth: "100%", marginBottom: 12 }}
              >
                <Search size={18} className="search-icon" />
                <input
                  className="search-input"
                  value={pickerQ}
                  onChange={(e) => setPickerQ(e.target.value)}
                  placeholder="ابحث باسم الطالب أو الدورة..."
                />
              </div>

              <div className="enrollment-picker-list">
                {pickerFiltered.length === 0 ? (
                  <div
                    style={{
                      padding: 20,
                      textAlign: "center",
                      color: "#94a3b8",
                    }}
                  >
                    لا توجد اشتراكات متطابقة
                  </div>
                ) : (
                  pickerFiltered.map((r) => {
                    const isSelected = payEnrId === r.enrollment_id;
                    const isDebt = Number(r.balance) > 0;
                    return (
                      <div
                        key={r.enrollment_id}
                        className={`enrollment-picker-item ${isSelected ? "selected" : ""}`}
                        onClick={() => setPayEnrId(r.enrollment_id)}
                      >
                        <div className="epi-main">
                          <div className="epi-name">{r.child_name}</div>
                          <div className="epi-meta">
                            {r.course_title} — {r.run_label}
                          </div>
                        </div>
                        <div className={`epi-balance ${isDebt ? "debt" : ""}`}>
                          {isDebt
                            ? `متبقي عليه: ${r.balance} ₪`
                            : "مدفوع بالكامل"}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {payEnrId && (
              <div style={{ gridColumn: "span 12" }}>
                <h4 className="form-section-title">
                  <CreditCard size={18} color="#64748b" /> تفاصيل الدفعة
                </h4>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 45%" }}>
                    <div
                      style={{
                        marginBottom: 6,
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#64748b",
                      }}
                    >
                      المبلغ (₪) *
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={payAmt}
                      onChange={(e) => setPayAmt(e.target.value)}
                      placeholder="أدخل المبلغ..."
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        outline: "none",
                        fontFamily: "inherit",
                        fontSize: "15px",
                      }}
                    />
                  </div>

                  <div style={{ flex: "1 1 45%" }}>
                    <div
                      style={{
                        marginBottom: 6,
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#64748b",
                      }}
                    >
                      طريقة الدفع
                    </div>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        outline: "none",
                        fontFamily: "inherit",
                        fontSize: "15px",
                        background: "#fff",
                      }}
                    >
                      <option value="cash">كاش</option>
                      <option value="card">بطاقة</option>
                      <option value="transfer">تحويل بنكي</option>
                      <option value="other">أخرى</option>
                    </select>
                  </div>

                  <div style={{ flex: "1 1 45%" }}>
                    <div
                      style={{
                        marginBottom: 6,
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#64748b",
                      }}
                    >
                      التاريخ والوقت *
                    </div>
                    <input
                      type="datetime-local"
                      value={payAt}
                      onChange={(e) => setPayAt(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        outline: "none",
                        fontFamily: "inherit",
                        fontSize: "15px",
                      }}
                    />
                  </div>

                  <div style={{ flex: "1 1 100%" }}>
                    <div
                      style={{
                        marginBottom: 6,
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#64748b",
                      }}
                    >
                      ملاحظة (اختياري)
                    </div>
                    <input
                      value={payNote}
                      onChange={(e) => setPayNote(e.target.value)}
                      placeholder="أي ملاحظات حول الدفعة..."
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        outline: "none",
                        fontFamily: "inherit",
                        fontSize: "15px",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 10,
              }}
            >
              <button
                style={{
                  padding: "12px 24px",
                  borderRadius: "14px",
                  border: "1px solid #e2e8f0",
                  background: "white",
                  cursor: "pointer",
                  fontWeight: 800,
                  color: "#64748b",
                }}
                onClick={() => setOpenPayAdd(false)}
                disabled={savingPay}
              >
                إلغاء
              </button>
              <button
                style={{
                  background: "#10b981",
                  color: "white",
                  padding: "12px 24px",
                  borderRadius: "14px",
                  border: "none",
                  fontWeight: "800",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
                onClick={handleSavePayment}
                disabled={savingPay || !payEnrId}
              >
                <CreditCard size={18} />
                {savingPay ? "جاري الحفظ..." : "حفظ الدفعة"}
              </button>
            </div>
          </div>
        </Modal>

        {/* ============================================================================ */}
        {/* نافذة إضافة طالب (النسخة المصححة) */}
        {/* ============================================================================ */}
        <Modal
          open={openChildAdd}
          title="إضافة طفل جديد"
          onClose={() => !savingChild && setOpenChildAdd(false)}
        >
          <div className="grid" style={{ gap: "20px", padding: "10px 0" }}>
            {/* قسم البيانات الأساسية */}
            <div style={{ gridColumn: "span 12" }}>
              <h4 className="form-section-title">
                <Users size={18} color="#64748b" /> البيانات الأساسية
              </h4>
              <div className="grid" style={{ gap: "16px" }}>
                <div style={{ gridColumn: "span 12" }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    الاسم الرباعي *
                  </div>
                  <input
                    className="input"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="مثال: أحمد محمد علي"
                  />
                </div>
                <div style={{ gridColumn: "span 6" }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    تاريخ الميلاد
                  </div>
                  <input
                    className="input"
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) =>
                      setFormData({ ...formData, birth_date: e.target.value })
                    }
                  />
                </div>
                <div style={{ gridColumn: "span 6" }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    الجنس
                  </div>
                  <ModernSelect
                    value={formData.gender}
                    onChange={(v) => setFormData({ ...formData, gender: v })}
                    options={[
                      { value: "male", label: "ذكر" },
                      { value: "female", label: "أنثى" },
                    ]}
                  />
                </div>
                <div style={{ gridColumn: "span 6" }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    الصف
                  </div>
                  <CustomCombobox
                    value={formData.class}
                    onChange={(v) => setFormData({ ...formData, class: v })}
                    options={classes.map((c) => ({
                      value: c.name,
                      label: c.name,
                    }))}
                    placeholder="اختر أو اكتب صفاً..."
                  />
                </div>
                <div style={{ gridColumn: "span 6" }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    المدينة / البلد
                  </div>
                  <CustomCombobox
                    value={formData.country_name}
                    onChange={(v) =>
                      setFormData({ ...formData, country_name: v })
                    }
                    options={countries.map((c) => ({
                      value: c.name,
                      label: c.name,
                    }))}
                    placeholder="اختر أو اكتب مدينة..."
                  />
                </div>
              </div>
            </div>

            {/* قسم معلومات التواصل مع الأهل */}
            <div style={{ gridColumn: "span 12" }}>
              <h4 className="form-section-title">
                <Phone size={18} color="#64748b" /> معلومات التواصل (الأهل)
              </h4>
              <div className="grid" style={{ gap: "16px" }}>
                <div style={{ gridColumn: "span 6" }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    هاتف الأم
                  </div>
                  <input
                    className="input"
                    value={formData.mother_phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        mother_phone: e.target.value,
                      })
                    }
                    placeholder="رقم الهاتف"
                    dir="ltr"
                    style={{ textAlign: "right" }}
                  />
                </div>
                <div style={{ gridColumn: "span 6" }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    اسم الأم
                  </div>
                  <input
                    className="input"
                    value={formData.mother_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        mother_name: e.target.value,
                      })
                    }
                    placeholder="اختياري"
                  />
                </div>
                <div style={{ gridColumn: "span 6" }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    هاتف الأب
                  </div>
                  <input
                    className="input"
                    value={formData.father_phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        father_phone: e.target.value,
                      })
                    }
                    placeholder="رقم الهاتف"
                    dir="ltr"
                    style={{ textAlign: "right" }}
                  />
                </div>
                <div style={{ gridColumn: "span 6" }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    اسم الأب
                  </div>
                  <input
                    className="input"
                    value={formData.father_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        father_name: e.target.value,
                      })
                    }
                    placeholder="اختياري"
                  />
                </div>
              </div>
            </div>

            {/* قسم الملاحظات */}
            <div style={{ gridColumn: "span 12" }}>
              <div className="muted" style={{ marginBottom: 6 }}>
                ملاحظات إضافية
              </div>
              <textarea
                className="input"
                rows={3}
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="أي تفاصيل طبية أو ملاحظات أخرى..."
                style={{ resize: "vertical" }}
              />
            </div>

            {/* أزرار الإجراءات في النموذج */}
            <div
              style={{
                gridColumn: "span 12",
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 10,
              }}
            >
              <button
                className="btn"
                onClick={() => setOpenChildAdd(false)}
                disabled={savingChild}
              >
                إلغاء
              </button>
              <button
                className="btn btn-add"
                onClick={handleSaveChild}
                disabled={savingChild}
              >
                {savingChild ? "جاري الحفظ..." : "حفظ البيانات"}
              </button>
            </div>
          </div>
        </Modal>

        {/* ============================================================================ */}
        {/* حوار التأكيد */}
        {/* ============================================================================ */}
        <ConfirmDialog
          open={confirm.open}
          title="تأكيد الإجراء"
          message={
            confirm.action === "done"
              ? "هل أنت متأكد من تعليم هذه الجلسة كمكتملة؟ سيتم إغلاقها ولن تظهر كمجدولة."
              : "هل أنت متأكد من إلغاء هذه الجلسة؟ لن يتم احتسابها من أرصدة الطلاب."
          }
          confirmText="نعم، تأكيد الإجراء"
          cancelText="تراجع"
          danger={confirm.action === "canceled"}
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
    </div>
  );
}
