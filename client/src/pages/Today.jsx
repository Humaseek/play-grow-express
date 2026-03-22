import React, { useEffect, useMemo, useState } from "react";
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
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  BadgeDollarSign,
  Filter,
  Zap,
} from "lucide-react";

import ErrorBanner from "../components/ErrorBanner";
import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";
import Badge from "../components/Badge";

// ============================================================================
// الدوال المساعدة
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

// دالة لمعالجة فترات الفلتر الذكي
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
// مكونات الرسوم البيانية المتجاوبة
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

// ============================================================================
// Skeleton Loader Component
// ============================================================================
const Skeleton = ({
  width = "100%",
  height = "20px",
  borderRadius = "8px",
  style = {},
}) => (
  <div
    className="skeleton-pulse"
    style={{ width, height, borderRadius, ...style }}
  ></div>
);

// ============================================================================
// Enterprise CSS Styles
// ============================================================================
const DASHBOARD_STYLES = `
/* خلفية مش مألوفة - Mesh Gradient فخمة جداً */
.page--dashboard {
  background-color: #f8fafc;
  background-image: 
    radial-gradient(at 0% 0%, hsla(217,100%,94%,0.7) 0px, transparent 50%),
    radial-gradient(at 100% 0%, hsla(160,100%,94%,0.7) 0px, transparent 50%),
    radial-gradient(at 100% 100%, hsla(280,100%,94%,0.6) 0px, transparent 50%),
    radial-gradient(at 0% 100%, hsla(38,100%,94%,0.6) 0px, transparent 50%);
  background-attachment: fixed;
  min-height: 100vh;
  padding-bottom: 60px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* Header Area */
.dash-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 32px;
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

/* Glassmorphism Cards */
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

/* Layouts */
.main-layout {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  margin-bottom: 24px;
}
.layout-col-main {
  flex: 2;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.layout-col-side {
  flex: 1;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 24px;
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

/* Bulletproof Flex Timeline */
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

/* تأثير النبض (Pulse) للجلسة المجدولة */
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
.chart-bar.income-bar {
  background: linear-gradient(180deg, #10b981 0%, #059669 100%);
}
.chart-bar.expense-bar {
  background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%);
}
.chart-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 700;
  margin-top: 8px;
  white-space: nowrap;
}

/* Skeleton Shimmer Loading Effect */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton-pulse {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite linear;
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
  });

  const [confirm, setConfirm] = useState({
    open: false,
    action: null,
    sessionId: null,
  });

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
        .select("amount, spent_on")
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
            <h1 className="dash-greeting">
              {getGreeting()}، جيمي{" "}
              <Zap size={32} color="#f59e0b" fill="#f59e0b" />
            </h1>
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

        {/* ==================== ROW 1: Enterprise KPIs ==================== */}
        <div className="kpi-grid">
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
              <Skeleton height="45px" />
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
              <Skeleton height="45px" />
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
              <Skeleton height="45px" />
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
                <Skeleton width="60%" height="16px" />
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
              <Skeleton height="45px" />
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
                <Skeleton width="50%" height="16px" />
              ) : (
                "إجمالي الاشتراكات الفعالة بالمركز"
              )}
            </div>
          </div>
        </div>

        {/* ==================== Main Layout (Flex layout) ==================== */}
        <div className="main-layout">
          {/* ----- Left Column: Timeline & Recent Txs ----- */}
          <div className="layout-col-main">
            {/* Timeline */}
            <div className="bento-item" style={{ minHeight: 400 }}>
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
                        <Skeleton height="100px" />
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
                                  title="تأكيد إكمال الجلسة"
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
                                  title="إلغاء الجلسة"
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

            {/* Recent Transactions */}
            <div className="bento-item">
              <div className="section-header" style={{ marginBottom: 20 }}>
                <h2 className="section-title">
                  <History size={22} color="#0f172a" /> أحدث الحركات المالية
                  (العامة)
                </h2>
              </div>

              {loading ? (
                <div className="list-widget">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="list-item">
                      <Skeleton height="40px" />
                    </div>
                  ))}
                </div>
              ) : dashData.recentTransactions.length === 0 ? (
                <div
                  style={{
                    padding: 40,
                    textAlign: "center",
                    color: "#94a3b8",
                    fontWeight: 800,
                  }}
                >
                  لا توجد حركات مالية مسجلة مؤخراً.
                </div>
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

          {/* ----- Right Column: Charts, Actions & Debtors ----- */}
          <div className="layout-col-side">
            {/* Quick Actions */}
            <div className="bento-item" style={{ padding: "24px 24px 20px" }}>
              <div className="quick-actions-grid">
                <Link to="/payments" className="qa-btn success">
                  <div className="qa-icon-wrap">
                    <CreditCard size={28} />
                  </div>
                  قبض دفعة
                </Link>
                <Link to="/expenses" className="qa-btn danger">
                  <div className="qa-icon-wrap">
                    <Receipt size={28} />
                  </div>
                  صرف مبلغ
                </Link>
                <Link to="/children" className="qa-btn primary">
                  <div className="qa-icon-wrap">
                    <UserPlus size={28} />
                  </div>
                  إضافة طالب
                </Link>
                <Link to="/calendar" className="qa-btn purple">
                  <div className="qa-icon-wrap">
                    <CalendarClock size={28} />
                  </div>
                  التقويم
                </Link>
              </div>
            </div>

            {/* Financial Flow Chart */}
            <div className="bento-item">
              <div className="section-header">
                <h2 className="section-title">
                  <PieChart size={24} color="#8b5cf6" /> التدفق المالي
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
                  <Skeleton height="100%" />
                </div>
              ) : (
                <DualBarChart
                  incomeData={dashData.incomeTrend}
                  expenseData={dashData.expenseTrend}
                  labels={dashData.chartLabels}
                />
              )}
            </div>

            {/* Debtors */}
            <div className="bento-item" style={{ flex: 1 }}>
              <div className="section-header" style={{ marginBottom: 20 }}>
                <h2 className="section-title" style={{ color: "#ef4444" }}>
                  <BellRing size={22} color="#ef4444" /> رادار الديون
                </h2>
                {!loading && (
                  <Badge variant="danger" style={{ fontSize: 14 }}>
                    يوجد {dashData.debtors.length} طلاب
                  </Badge>
                )}
              </div>

              {loading ? (
                <div className="list-widget">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="list-item">
                      <Skeleton height="40px" />
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
                  الوضع ممتاز! لا توجد ديون مسجلة حالياً.
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
                          <div className="li-sub">حساب متأخر للدفع</div>
                        </div>
                      </div>
                      <div className="li-value danger">
                        {fmtMoney(d.balance)} ₪
                      </div>
                    </Link>
                  ))}
                  <Link
                    to="/children"
                    style={{
                      textAlign: "center",
                      fontSize: 14,
                      fontWeight: 900,
                      color: "#3b82f6",
                      marginTop: 12,
                      textDecoration: "none",
                    }}
                  >
                    عرض كل الطلاب والديون ←
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================================ */}
        {/* حوار التأكيد لإدارة الجلسات */}
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
