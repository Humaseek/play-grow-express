import React from "react";
import IconButton from "./IconButton";

export default function SessionsStepper({
 sessions,
 totalPrice,
 busy,
 onInc,
 onDec,
}) {
 const s = Number(sessions || 0);
 const total = Number(totalPrice || 0);
 const unit = s > 0 ? total / s : 0;

 return (
 <div className="stepperCard">
 <div className="muted">عدد الحصص</div>

 <div className="row" style={{ gap: 8, alignItems: "center" }}>
 <IconButton
 icon="−"
 title=" "
 variant="danger"
 size="sm"
 disabled={busy || s <= 0}
 onClick={onDec}
 />

 <div className="stepperValue">{s}</div>

 <IconButton
 icon="+"
 title=" "
 variant="primary"
 size="sm"
 disabled={busy}
 onClick={onInc}
 />

 {busy && (
 <span className="muted" style={{ marginInlineStart: 8 }}>
 ...
 </span>
 )}
 </div>

 <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
 : {Number.isFinite(unit) ? unit.toFixed(2) : "0.00"}
 </div>
 </div>
 );
}
