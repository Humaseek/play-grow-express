import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export default function Modal({ open, title, children, onClose, maxWidth }) {
  useEffect(() => {
    if (!open) return;

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

  return createPortal(
    <div
      className="modalOverlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className="modalCard"
        role="dialog"
        aria-modal="true"
        // هذا السطر السحري اللي رح يخلينا نكبر النوافذ اللي بدنا إياها بس
        style={maxWidth ? { maxWidth: maxWidth, width: "95%" } : {}}
      >
        <button
          type="button"
          className="modalClose"
          aria-label="إغلاق"
          onClick={() => onClose?.()}
        >
          ×
        </button>

        {title ? (
          <div className="modalHeader">
            <div className="modalTitle">{title}</div>
          </div>
        ) : null}

        <div className="modalBody">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
