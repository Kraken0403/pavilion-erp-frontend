// src/pages/Settings.js
import React, { useCallback, useEffect, useState } from "react";
import { Container, Paper } from "@mui/material";
import Topbar from "../components/Topbar";
import NotificationSnackbar from "../components/ui/NotificationSnackbar";

import SettingsForm from "../components/settings/SettingsForm";
import { getSettings, updateSettings } from "../services/settingsService";

export default function Settings() {
  const [settings, setSettings] = useState(null);

  const [notif, setNotif] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const showNotif = useCallback((message, severity = "success") => {
    setNotif({ open: true, message, severity });
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const data = await getSettings();

      // Ensure defaults
      setSettings({
        ...data,
        business_type: data.business_type || "GENERAL",
        gst_pricing_mode: data.gst_pricing_mode || "INCLUSIVE",
        currency_code: data.currency_code || "INR",
      });

    } catch (err) {
      console.error("❌ Failed to load settings", err);
      showNotif("Failed to load settings", "error");
    }
  }, [showNotif]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  /* ---------------------------------------
     SUBMIT SETTINGS
  --------------------------------------- */
  const handleSubmit = async (form) => {
    const formData = new FormData();

    /* -----------------------------
       COMPANY BASIC INFO
    ----------------------------- */
    formData.append("company_name", form.company_name || "");
    formData.append("company_email", form.company_email || "");
    formData.append("company_phone", form.company_phone || "");

    /* -----------------------------
       COMPANY ADDRESS
    ----------------------------- */
    formData.append("company_address_line1", form.company_address_line1 || "");
    formData.append("company_address_line2", form.company_address_line2 || "");
    formData.append("company_city", form.company_city || "");
    formData.append("company_state", form.company_state || "");
    formData.append("company_pincode", form.company_pincode || "");
    formData.append("company_country", form.company_country || "India");

    /* -----------------------------
       GST SETTINGS
    ----------------------------- */
    formData.append("gst_enabled", form.gst_enabled ? 1 : 0);
    formData.append("gst_pricing_mode", form.gst_pricing_mode || "INCLUSIVE");
    formData.append("gst_number", form.gst_number || "");
    formData.append("gst_state_code", form.gst_state_code || "");

    /* -----------------------------
       CURRENCY
    ----------------------------- */
    formData.append("currency_code", form.currency_code || "INR");

    /* -----------------------------
       GLOBAL BUSINESS TYPE
    ----------------------------- */
    formData.append("business_type", form.business_type || "GENERAL");

    /* -----------------------------
       LOGO
    ----------------------------- */
    if (form.company_logo instanceof File) {
      formData.append("company_logo", form.company_logo);
    }

    try {
      await updateSettings(formData);
      showNotif("Settings updated successfully!", "success");
      loadSettings(); // reload latest values
    } catch (err) {
      console.error("❌ Failed to update settings:", err);
      showNotif(
        err?.response?.data?.error || "Failed to update settings",
        "error"
      );
    }
  };

  if (!settings) return null;

  return (
    <>
      <Topbar />

      <Container>
        <Paper sx={{ p: 3 }}>
          <SettingsForm
            settings={settings}
            onSubmit={handleSubmit}
          />
        </Paper>
      </Container>

      <NotificationSnackbar
        open={notif.open}
        message={notif.message}
        severity={notif.severity}
        onClose={() => setNotif((p) => ({ ...p, open: false }))}
      />
    </>
  );
}