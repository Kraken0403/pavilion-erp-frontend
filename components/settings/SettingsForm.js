// src/components/settings/SettingsForm.js
import React, { useState, useEffect } from "react";
import {
  Grid,
  TextField,
  Button,
  Typography,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider
} from "@mui/material";

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
      company_logo: null,
    });

    if (settings.company_logo) {
      setLogoPreview(`http://localhost:5000${settings.company_logo}`);
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
    <>
      <Typography variant="h5" mb={2}>
        Company & GST Settings
      </Typography>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>

          {/* LOGO */}
          <Grid item xs={12}>
            <Typography variant="body1" mb={1}>
              Company Logo
            </Typography>

            {logoPreview && (
              <img
                src={logoPreview}
                alt="Logo Preview"
                style={{ width: 120, marginBottom: 16, borderRadius: 6 }}
              />
            )}

            <Button variant="contained" component="label">
              Upload Logo
              <input hidden type="file" accept="image/*" onChange={handleLogoChange} />
            </Button>
          </Grid>

          {/* COMPANY INFO */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Company Name"
              name="company_name"
              fullWidth
              value={form.company_name}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Email"
              name="company_email"
              fullWidth
              value={form.company_email}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Phone"
              name="company_phone"
              fullWidth
              value={form.company_phone}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
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
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6">Company Address</Typography>
          </Grid>

          {/* ADDRESS */}
          <Grid item xs={12}>
            <TextField
              label="Address Line 1"
              name="company_address_line1"
              fullWidth
              value={form.company_address_line1}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Address Line 2"
              name="company_address_line2"
              fullWidth
              value={form.company_address_line2}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="City"
              name="company_city"
              fullWidth
              value={form.company_city}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="State"
              name="company_state"
              fullWidth
              value={form.company_state}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="Pincode"
              name="company_pincode"
              fullWidth
              value={form.company_pincode}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6">GST Settings</Typography>
          </Grid>

          {/* GST ENABLE */}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.gst_enabled}
                  onChange={handleSwitchChange}
                />
              }
              label="GST Enabled"
            />
          </Grid>

          {/* GST DETAILS */}
          {form.gst_enabled && (
            <>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="GST Number (GSTIN)"
                  name="gst_number"
                  fullWidth
                  value={form.gst_number}
                  onChange={handleChange}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="GST State Code"
                  name="gst_state_code"
                  fullWidth
                  value={form.gst_state_code}
                  onChange={handleChange}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
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
              </Grid>
            </>
          )}

          {/* SAVE */}
          <Grid item xs={12} mt={2}>
            <Button variant="contained" color="primary" type="submit">
              Save Settings
            </Button>
          </Grid>

        </Grid>
      </form>
    </>
  );
}
