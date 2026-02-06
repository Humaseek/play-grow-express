import React from "react";

/**
 * EmptyState
 * - View No ( Search)
 */
export default function EmptyState({
 icon: Icon,
 title,
 description,
 actionLabel,
 onAction,
 secondaryLabel,
 onSecondary,
}) {
 return (
 <div className="emptyState card">
 <div className="emptyState__icon" aria-hidden="true">
 {Icon ? <Icon size={22} /> : null}
 </div>

 <div className="emptyState__body">
 <div className="emptyState__title">{title}</div>
 {description ? (
 <div className="emptyState__desc muted">{description}</div>
 ) : null}

 {(actionLabel || secondaryLabel) ? (
 <div className="emptyState__actions">
 {actionLabel ? (
 <button className="btn primary" onClick={onAction}>
 {actionLabel}
 </button>
 ) : null}

 {secondaryLabel ? (
 <button className="btn" onClick={onSecondary}>
 {secondaryLabel}
 </button>
 ) : null}
 </div>
 ) : null}
 </div>
 </div>
 );
}
