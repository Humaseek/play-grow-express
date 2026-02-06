import React from "react";

/**
 * PageHeader
 * - : + + 
 * - Accent Theme CSS variables (--page-accent)
 */
export default function PageHeader({ title, subtitle, actions }) {
 return (
 <div className="pageHeader">
 <div className="pageHeader__titleBlock">
 <span className="pageHeader__dot" aria-hidden="true" />
 <div>
 <div className="h1">{title}</div>
 {subtitle ? <div className="muted">{subtitle}</div> : null}
 </div>
 </div>

 {actions ? <div className="pageHeader__actions">{actions}</div> : null}
 </div>
 );
}
