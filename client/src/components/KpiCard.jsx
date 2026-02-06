import React from "react";

/**
 * KpiCard
 * - KPI Dashboard
 * - variant: ok | warn | danger | info | neutral
 */
export default function KpiCard({
 icon: Icon,
 label,
 value,
 hint,
 variant = "neutral",
}) {
 return (
 <div className={`kpi card kpi--${variant}`}>
 <div className="kpi__top">
 <div className="kpi__label muted">{label}</div>
 {Icon ? (
 <div className="kpi__icon" aria-hidden="true">
 <Icon size={18} />
 </div>
 ) : null}
 </div>

 <div className="kpi__value">{value}</div>
 {hint ? <div className="kpi__hint muted">{hint}</div> : null}
 </div>
 );
}
