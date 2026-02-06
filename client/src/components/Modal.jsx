import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export default function Modal({ open, title, children, onClose }) {
 useEffect(() => {
 if (!open) return;

 // Lock body scroll while modal is open
 const prevOverflow = document.body.style.overflow;
 document.body.style.overflow = "hidden";

 const onKey = (e) => {
 if (e.key === "Escape") onClose?.();
 };
 window.addEventListener("keydown", onKey);

 return () => {
 window.removeEventListener("keydown", onKey);
 document.body.style.overflow = prevOverflow;
 };
 }, [open, onClose]);

 if (!open) return null;

 // Render into a portal so the modal isn't affected by any parent stacking/transform/overflow.
 return createPortal(
 <div
 className="modalOverlay"
 onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
 >
 <div className="modalCard" role="dialog" aria-modal="true">
 <div className="modalHeader">
 <div className="h1">{title}</div>
 <button className="btn" onClick={onClose}>
 Close
 </button>
 </div>
 <hr className="sep" />
 {children}
 </div>
 </div>,
 document.body
 );
}
