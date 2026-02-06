import React from "react";
import Modal from "./Modal";

export default function ConfirmDialog({
 open,
 title = "",
 message = " ",
 confirmText = "Yes",
 cancelText = "Cancel",
 danger = true,
 onConfirm,
 onCancel,
}) {
 return (
 <Modal open={open} title={title} onClose={onCancel}>
 <div className="muted" style={{ marginBottom: 12 }}>
 {message}
 </div>
 <div className="row">
 <button className={`btn ${danger ? "danger" : ""}`} onClick={onConfirm}>
 {confirmText}
 </button>
 <button className="btn" onClick={onCancel}>
 {cancelText}
 </button>
 </div>
 </Modal>
 );
}
