import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import ConfirmDialog from "../components/ui/ConfirmDialog";

const ConfirmContext = createContext(null);

export const ConfirmProvider = ({ children }) => {
  const [state, setState] = useState({
    open: false,
    title: "",
    message: "",
    confirmText: "OK",
    cancelText: "Cancel",
    loading: false,
    resolve: null,
  });

  const showConfirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      setState((s) => ({
        ...s,
        open: true,
        title: opts.title || opts.heading || "",
        message: opts.message || opts.text || opts.body || "",
        confirmText: opts.confirmText || opts.okText || "OK",
        cancelText: opts.cancelText || "Cancel",
        loading: false,
        resolve,
      }));
    });
  }, []);

  const handleClose = useCallback(() => {
    setState((s) => ({ ...s, open: false, resolve: null, loading: false }));
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!state.resolve) return;
    try {
      setState((s) => ({ ...s, loading: true }));
      state.resolve(true);
    } finally {
      handleClose();
    }
  }, [state, handleClose]);

  const handleCancel = useCallback(() => {
    if (state.resolve) state.resolve(false);
    handleClose();
  }, [state, handleClose]);

  // Attach a global `alert()` override so legacy `alert(msg)` calls show our dialog.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prev = window.alert;
    // Use a simple wrapper — we don't block synchronously, but UX will show the modal.
    window.alert = (msg) => {
      try {
        showConfirm({ message: String(msg || ""), confirmText: "OK" });
      } catch (e) {
        // fallback to original
        try {
          prev(String(msg));
        } catch (err) {
          // ignore
        }
      }
    };

    return () => {
      try {
        window.alert = prev;
      } catch (e) {
        // ignore
      }
    };
  }, [showConfirm]);

  return (
    <ConfirmContext.Provider value={{ showConfirm }}>
      {children}
      <ConfirmDialog
        open={state.open}
        title={state.title}
        message={state.message}
        confirmText={state.confirmText}
        cancelText={state.cancelText}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        loading={state.loading}
      />
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx.showConfirm;
};

export default ConfirmContext;
