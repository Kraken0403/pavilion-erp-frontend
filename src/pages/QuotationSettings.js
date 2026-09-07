import React, { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  MenuItem,
  CircularProgress
} from '@mui/material';

import { getQuotationSettings, saveQuotationSettings } from '../services/quotationSettingsService';
import NotificationSnackbar from '../components/ui/NotificationSnackbar';
import WgiymEditor from '../components/ui/WgiymEditor';
import FileUploader from '../components/ui/FileUploader';


const numberingModes = [
  { value: 'continuous', label: 'Continuous (Never resets)' },
  { value: 'yearly', label: 'Reset Every Year' },
  { value: 'monthly', label: 'Reset Every Month' },
];

function QuotationSettings() {
  const [settings, setSettings] = useState({
    layout_option: 'builder',
    logo_url: '',
    terms_conditions_html: '',
    cover_letter_html: '',
    footer_notes_html: '',
    prefix: 'QT',
    sequence_start: 1,
    number_format: '{prefix}/{year}/{seq}',
    numbering_mode: 'continuous',
    quotation_mode: 'GENERAL',
    default_payment_terms: '',
    signature_url: '',
    header_notes_html: ''
  });

  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const showNotification = (message, severity = 'success') => {
    setNotif({ open: true, message, severity });
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await getQuotationSettings();
      setSettings({ ...data, layout_option: 'builder' });
    } catch (err) {
      console.error("Failed to load settings:", err);
      showNotification("Failed to load settings", "error");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      await saveQuotationSettings({ ...settings, layout_option: 'builder' });
      showNotification("✅ Quotation settings saved!");
    } catch (err) {
      console.error("Failed to save settings:", err);
      showNotification("❌ Failed to save settings", "error");
    }
  };

  return (
    <div className="settings-module-page">
      <div className="settings-module-heading"><span>Document settings</span><h2>Quotations</h2><p>Set quotation defaults, numbering and reusable customer-facing content.</p></div>
      {loading ? <div className="settings-module-loading"><CircularProgress size={26} /><span>Loading quotation settings…</span></div> : (
        <div className="settings-sections-form">
          <section className="settings-section-card">
            <header><div><h3>Document defaults</h3><p>Set the assets and defaults used for new quotations. Template layout is managed only from the Quotation Template Builder.</p></div></header>
            <div className="settings-field-grid">
            <TextField
                select
                label="Quotation Mode"
                fullWidth
                value={settings.quotation_mode || 'GENERAL'}
                onChange={(e) => setSettings({ ...settings, quotation_mode: e.target.value })}
              >
                <MenuItem value="GENERAL">General (Default)</MenuItem>
                {/* <MenuItem value="CATERING">Catering (With PAX)</MenuItem>
                <MenuItem value="FUSION_BOX">Fusion Box</MenuItem>
                <MenuItem value="MEAL_BOX">Chef’s Meal Box</MenuItem> */}
              </TextField>
              <div className="settings-upload-field"><FileUploader label="Company Logo" fileUrl={settings.logo_url} onFileUploaded={(url) => setSettings({ ...settings, logo_url: url })} /></div>
              <div className="settings-upload-field"><FileUploader label="Authorized e-signature" fileUrl={settings.signature_url} onFileUploaded={(url) => setSettings({ ...settings, signature_url: url })} /></div>
              <div className="settings-field-wide"><TextField label="Default payment terms" fullWidth multiline minRows={3} value={settings.default_payment_terms || ''} onChange={(e) => setSettings({ ...settings, default_payment_terms: e.target.value })} /></div>
            </div>
          </section>

          <section className="settings-section-card">
            <header><div><h3>Quotation numbering</h3><p>Define how unique quotation numbers are generated.</p></div></header>
            <div className="settings-field-grid">
            <TextField
              label="Prefix"
              fullWidth
              value={settings.prefix}
              onChange={(e) => setSettings({ ...settings, prefix: e.target.value })}
            />

            <TextField
              label="Sequence Start"
              type="number"
              fullWidth
              value={settings.sequence_start}
              onChange={(e) => setSettings({ ...settings, sequence_start: Number(e.target.value) })}
            />

            <TextField
              label="Number Format"
              fullWidth
              helperText="Available tags: {prefix} {year} {month} {seq}"
              value={settings.number_format}
              onChange={(e) => setSettings({ ...settings, number_format: e.target.value })}
            />

            <TextField
              label="Numbering Mode"
              select
              fullWidth
              value={settings.numbering_mode}
              onChange={(e) => setSettings({ ...settings, numbering_mode: e.target.value })}
            >
              {numberingModes.map(op => (
                <MenuItem key={op.value} value={op.value}>
                  {op.label}
                </MenuItem>
              ))}
            </TextField>
            </div>
          </section>

          <section className="settings-section-card">
            <header><div><h3>Reusable content</h3><p>These blocks populate new quotations and can still be edited per quotation.</p></div></header>
            <div className="settings-editor-stack">
              <label><span>Cover letter / introduction</span><WgiymEditor value={settings.cover_letter_html} onChange={(val) => setSettings({ ...settings, cover_letter_html: val })} /></label>
              <label><span>Header notes</span><WgiymEditor value={settings.header_notes_html || ''} onChange={(val) => setSettings({ ...settings, header_notes_html: val })} /></label>
              <label><span>Terms & conditions</span><WgiymEditor value={settings.terms_conditions_html} onChange={(val) => setSettings({ ...settings, terms_conditions_html: val })} /></label>
              <label><span>Footer notes</span><WgiymEditor value={settings.footer_notes_html} onChange={(val) => setSettings({ ...settings, footer_notes_html: val })} /></label>
            </div>
          </section>

          <footer className="settings-form-footer"><Button variant="contained" onClick={handleSave}>Save quotation settings</Button></footer>
        </div>
      )}

      <NotificationSnackbar
        open={notif.open}
        message={notif.message}
        severity={notif.severity}
        onClose={() => setNotif({ ...notif, open: false })}
      />
    </div>
  );
}

export default QuotationSettings;
