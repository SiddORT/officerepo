import React from "react";
import Modal from "./Modal";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  confirmVariant = "danger",
  onConfirm,
  onCancel,
  loading = false,
  error = "",
}) {
  const btnClass =
    confirmVariant === "danger"
      ? "btn-danger"
      : confirmVariant === "warning"
        ? "btn-secondary"
        : "btn-primary";

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button onClick={onCancel} className="btn-secondary" disabled={loading}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className={btnClass}>
            {loading ? "Please wait…" : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm t-body">{message}</p>
      {error && (
        <p className="text-xs text-red-400 mt-3">{error}</p>
      )}
    </Modal>
  );
}
