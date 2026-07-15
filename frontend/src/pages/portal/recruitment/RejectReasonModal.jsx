import React, { useEffect, useRef } from "react";
import Modal from "../../../components/ui/Modal";

export default function RejectReasonModal({ open, onClose, onConfirm, loading, reason, onReasonChange }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Rejection Reason"
      size="sm"
      footer={
        <>
          <button onClick={onClose} disabled={loading} className="btn-secondary">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="btn-danger"
          >
            {loading ? "Rejecting…" : "Reject"}
          </button>
        </>
      }
    >
      <div>
        <label className="portal-form-label" style={{ display: "block", marginBottom: 6 }}>
          Reason <span className="t-muted" style={{ fontWeight: 400 }}>(optional)</span>
        </label>
        <textarea
          ref={textareaRef}
          value={reason}
          onChange={e => onReasonChange(e.target.value)}
          rows={4}
          placeholder="Enter rejection reason…"
          className="input-field"
          style={{ width: "100%", resize: "vertical" }}
        />
      </div>
    </Modal>
  );
}
