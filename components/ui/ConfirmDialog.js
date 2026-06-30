import React from "react";
import "./ConfirmDialog.scss";

const ConfirmDialog = ({
  open,
  title = "Confirm Action",
  message = "Are you sure you want to continue?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  loading = false
}) => {
  if (!open) return null;

  return (
    <div className="confirm-dialog-backdrop">
      <div className="confirm-dialog">

        <h4 className="confirm-title">{title}</h4>
        <p className="confirm-message">{message}</p>

        <div className="confirm-actions">
          <button
            className="secondary-btn"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>

          <button
            className="danger-btn"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Please wait..." : confirmText}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ConfirmDialog;
