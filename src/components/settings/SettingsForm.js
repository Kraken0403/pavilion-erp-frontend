// src/components/settings/SettingsForm.js
import React, { useState, useEffect } from "react";
import { resolveBackendAssetUrl } from "../../services/api";
import {
  TextField,
  Button,
  MenuItem,
  Switch,
  FormControlLabel
} from "@mui/material";
import UploadFileOutlined from "@mui/icons-material/UploadFileOutlined";

export default function SettingsForm({ settings, onSubmit }) {
  const [form, setForm] = useState({
    company_name: "",
    company_email: "",
    company_phone: "",

    company_address_line1: "",
    company_address_line2: "",
    company_city: "",
    company_state: "",
    company_pincode: "",
    company_country: "India",

    gst_enabled: true,
    gst_pricing_mode: "INCLUSIVE",
    gst_number: "",
    gst_state_code: "",

    currency_code: "INR",
    date_format: "DD/MM/YYYY",
    company_logo: null,
  });

  const [logoPreview, setLogoPreview] = useState(null);

  /* ---------------------------------------
     LOAD SETTINGS INTO FORM
  --------------------------------------- */
  useEffect(() => {
    if (!settings) return;

    setForm({
      company_name: settings.company_name || "",
      company_email: settings.company_email || "",
      company_phone: settings.company_phone || "",

      company_address_line1: settings.company_address_line1 || "",
      company_address_line2: settings.company_address_line2 || "",
      company_city: settings.company_city || "",
      company_state: settings.company_state || "",
      company_pincode: settings.company_pincode || "",
      company_country: settings.company_country || "India",

      gst_enabled: settings.gst_enabled !== undefined ? !!settings.gst_enabled : true,
      gst_pricing_mode: settings.gst_pricing_mode || "INCLUSIVE",
      gst_number: settings.gst_number || "",
      gst_state_code: settings.gst_state_code || "",

      currency_code: settings.currency_code || "INR",
      date_format: settings.date_format || "DD/MM/YYYY",
      company_logo: null,
    });

    if (settings.company_logo) {
      setLogoPreview(resolveBackendAssetUrl(settings.company_logo));
    }
  }, [settings]);

  /* ---------------------------------------
     HANDLERS
  --------------------------------------- */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (e) => {
    setForm((prev) => ({ ...prev, gst_enabled: e.target.checked }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setForm((prev) => ({ ...prev, company_logo: file }));
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  /* ---------------------------------------
     UI
  --------------------------------------- */
  return (
    <div className="settings-module-page">
      <div className="settings-module-heading"><span>General settings</span><h2>Company & GST</h2><p>Keep your company identity, regional formats and tax preferences consistent across Pav ERP.</p></div>
      <form className="settings-sections-form" onSubmit={handleSubmit}>
        <section className="settings-section-card settings-logo-section">
          <header><div><h3>Company identity</h3><p>Used on documents, emails and customer-facing pages.</p></div></header>
          <div className="settings-logo-row">
            {logoPreview && (
              <img
                src={logoPreview}
                alt="Logo Preview"
              />
            )}
            <Button variant="contained" component="label">
              <UploadFileOutlined />
              Upload Logo
              <input hidden type="file" accept="image/*" onChange={handleLogoChange} />
            </Button>
          </div>
          <div className="settings-field-grid">
            <TextField
              label="Company Name"
              name="company_name"
              fullWidth
              value={form.company_name}
              onChange={handleChange}
            />
            <TextField
              label="Email"
              name="company_email"
              fullWidth
              value={form.company_email}
              onChange={handleChange}
            />
            <TextField
              label="Phone"
              name="company_phone"
              fullWidth
              value={form.company_phone}
              onChange={handleChange}
            />
            <TextField
              select
              label="Currency"
              name="currency_code"
              value={form.currency_code}
              fullWidth
              onChange={handleChange}
            >
              <MenuItem value="INR">₹ INR</MenuItem>
              <MenuItem value="USD">$ USD</MenuItem>
              <MenuItem value="EUR">€ EUR</MenuItem>
              <MenuItem value="GBP">£ GBP</MenuItem>
              <MenuItem value="AED">د.إ AED</MenuItem>
            </TextField>
            <TextField select label="Date format" name="date_format" value={form.date_format} fullWidth onChange={handleChange} helperText="Used across date inputs, filters and displayed dates">
              <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
              <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
              <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
            </TextField>
          </div>
        </section>

        <section className="settings-section-card">
          <header><div><h3>Company address</h3><p>The registered address shown on generated documents.</p></div></header>
          <div className="settings-field-grid">
            <div className="settings-field-wide">
            <TextField
              label="Address Line 1"
              name="company_address_line1"
              fullWidth
              value={form.company_address_line1}
              onChange={handleChange}
            />
            </div>
            <div className="settings-field-wide">
            <TextField
              label="Address Line 2"
              name="company_address_line2"
              fullWidth
              value={form.company_address_line2}
              onChange={handleChange}
            />
            </div>
            <TextField
              label="City"
              name="company_city"
              fullWidth
              value={form.company_city}
              onChange={handleChange}
            />
            <TextField
              label="State"
              name="company_state"
              fullWidth
              value={form.company_state}
              onChange={handleChange}
            />
            <TextField
              label="Pincode"
              name="company_pincode"
              fullWidth
              value={form.company_pincode}
              onChange={handleChange}
            />
          </div>
        </section>

        <section className="settings-section-card">
          <header><div><h3>GST settings</h3><p>Control whether prices include GST and the tax identifiers used in documents.</p></div>
            <FormControlLabel
              control={
                <Switch
                  checked={form.gst_enabled}
                  onChange={handleSwitchChange}
                />
              }
              label="GST Enabled"
            />
          </header>
          {form.gst_enabled && (
            <div className="settings-field-grid">
                <TextField
                  label="GST Number (GSTIN)"
                  name="gst_number"
                  fullWidth
                  value={form.gst_number}
                  onChange={handleChange}
                />
                <TextField
                  label="GST State Code"
                  name="gst_state_code"
                  fullWidth
                  value={form.gst_state_code}
                  onChange={handleChange}
                />
                <TextField
                  select
                  label="GST Pricing Mode"
                  name="gst_pricing_mode"
                  value={form.gst_pricing_mode}
                  fullWidth
                  onChange={handleChange}
                >
                  <MenuItem value="INCLUSIVE">Inclusive</MenuItem>
                  <MenuItem value="EXCLUSIVE">Exclusive</MenuItem>
                </TextField>
            </div>
          )}
        </section>

          <footer className="settings-form-footer">
            <Button variant="contained" color="primary" type="submit">
              Save Settings
            </Button>
          </footer>
      </form>
    </div>
  );
}
