// src/pages/Settings.js
import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BusinessOutlined,
  DescriptionOutlined,
  GroupOutlined,
  PersonOutline,
  ReceiptLongOutlined,
  WorkOutline,
} from "@mui/icons-material";
import NotificationSnackbar from "../components/ui/NotificationSnackbar";

import SettingsForm from "../components/settings/SettingsForm";
import { getSettings, updateSettings } from "../services/settingsService";
import { useSettings } from "../context/SettingsContext";
import QuotationSettings from "./QuotationSettings";
import InvoiceSettings from "./InvoiceSettings";
import WorkOrderSettings from "./WorkOrderSettings";
import SignUp from "../components/SignUp";
import MyAccount from "./MyAccount";
import "../assets/styles/Settings.scss";

const settingsTabs = [
  { value:"general", label:"General", description:"Company, tax and display", icon:BusinessOutlined },
  { value:"quotation", label:"Quotations", description:"Templates and numbering", icon:DescriptionOutlined },
  { value:"work-orders", label:"Work orders", description:"Document defaults", icon:WorkOutline },
  { value:"invoice", label:"Invoices", description:"Invoice and receipt setup", icon:ReceiptLongOutlined },
  { value:"user-settings", label:"My account", description:"Profile and password", icon:PersonOutline },
  { value:"users", label:"User management", description:"Access and permissions", icon:GroupOutlined },
];

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { reloadSettings } = useSettings() || {};
  const activeTab = searchParams.get('tab') || 'general';

  const [notif, setNotif] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const showNotif = (message, severity = "success") => {
    setNotif({ open: true, message, severity });
  };

  /* ---------------------------------------
     LOAD SETTINGS
  --------------------------------------- */
  const loadSettings = useCallback(async () => {
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (err) {
      console.error("❌ Failed to load settings", err);
      showNotif("Failed to load settings", "error");
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  /* ---------------------------------------
     SUBMIT SETTINGS (UPDATED)
  --------------------------------------- */
  const handleSubmit = async (form) => {
    const formData = new FormData();

    // Company basic info
    formData.append("company_name", form.company_name || "");
    formData.append("company_email", form.company_email || "");
    formData.append("company_phone", form.company_phone || "");

    // Address fields
    formData.append("company_address_line1", form.company_address_line1 || "");
    formData.append("company_address_line2", form.company_address_line2 || "");
    formData.append("company_city", form.company_city || "");
    formData.append("company_state", form.company_state || "");
    formData.append("company_pincode", form.company_pincode || "");
    formData.append("company_country", form.company_country || "India");

    // GST settings
    formData.append("gst_enabled", form.gst_enabled ? 1 : 0);
    formData.append("gst_pricing_mode", form.gst_pricing_mode || "INCLUSIVE");
    formData.append("gst_number", form.gst_number || "");
    formData.append("gst_state_code", form.gst_state_code || "");

    // Currency
    formData.append("currency_code", form.currency_code || "INR");
    formData.append("date_format", form.date_format || "DD/MM/YYYY");

    // Logo
    if (form.company_logo) {
      formData.append("company_logo", form.company_logo);
    }

    try {
      await updateSettings(formData);
      showNotif("Settings updated successfully!", "success");
      await loadSettings();
      await reloadSettings?.();
    } catch (err) {
      console.error("❌ Failed to update settings:", err);
      showNotif(
        err?.response?.data?.error || "Failed to update settings",
        "error"
      );
    }
  };

  return (
    <>
      <div className="global-settings-page">
        <section className="global-settings-card">
          <header><div><span>Account & system</span><h1>Settings</h1><p>Manage company-wide document, user and display preferences.</p></div></header>
          <div className="global-settings-body">
            <nav className="global-settings-nav" aria-label="Settings sections">
              <strong>Settings</strong>
              {settingsTabs.map(({ value, label, description, icon:Icon }) => <button key={value} type="button" className={activeTab === value ? 'is-active' : ''} onClick={() => setSearchParams({ tab:value })}><Icon /><span><b>{label}</b><small>{description}</small></span></button>)}
            </nav>
          <div className={`global-settings-panel ${activeTab === 'users' ? 'is-listing' : ''}`}>
            {activeTab === 'general' && (settings ? <SettingsForm settings={settings} onSubmit={handleSubmit} /> : <div className="settings-module-loading">Loading general settings…</div>)}
            {activeTab === 'quotation' && <QuotationSettings embedded />}
            {activeTab === 'work-orders' && <WorkOrderSettings />}
            {activeTab === 'invoice' && <InvoiceSettings embedded />}
            {activeTab === 'user-settings' && <MyAccount />}
            {activeTab === 'users' && <SignUp />}
          </div>
          </div>
        </section>
      </div>

      <NotificationSnackbar
        open={notif.open}
        message={notif.message}
        severity={notif.severity}
        onClose={() => setNotif((p) => ({ ...p, open: false }))}
      />
    </>
  );
}
