import React from "react";

export default function ErrorBanner({ error }) {
 if (!error) return null;

 const msg =
 typeof error === "string" ? error : error?.message || " ";

 return (
 <div className="alert" role="alert" aria-live="polite">
 <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
 <div style={{ fontWeight: 900 }}> .</div>
 <div className="muted" style={{ fontWeight: 850 }}>
 Refresh .
 </div>
 </div>

 <details style={{ marginTop: 8 }}>
 <summary style={{ cursor: "pointer", fontWeight: 900 }}>View Details</summary>
 <div style={{ marginTop: 8, fontWeight: 850 }}>
 <span className="ltrIso">{msg}</span>
 </div>
 </details>
 </div>
 );
}
