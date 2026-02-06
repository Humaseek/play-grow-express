import React from "react";

export default function ToastHost({ toasts, onRemove }) {
  if (!toasts?.length) return null;

  return (
    <div className="toastHost">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.variant}`}>
          <div>{t.message}</div>
          <button className="toast-x" onClick={() => onRemove(t.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
