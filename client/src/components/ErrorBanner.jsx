import React from "react";

export default function ErrorBanner({ error }) {
  if (!error) return null;

  const msg =
    typeof error === "string" ? error : error?.message || "שגיאה לא ידועה";

  return (
    <div className="alert" role="alert" aria-live="polite">
      <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 900 }}>אירעה שגיאה.</div>
        <div className="muted" style={{ fontWeight: 850 }}>
          נסה לרענן את הדף.
        </div>
      </div>

      <details style={{ marginTop: 8 }}>
        <summary style={{ cursor: "pointer", fontWeight: 900 }}>הצג פרטים</summary>
        <div style={{ marginTop: 8, fontWeight: 850 }}>
          <span className="ltrIso">{msg}</span>
        </div>
      </details>
    </div>
  );
}
