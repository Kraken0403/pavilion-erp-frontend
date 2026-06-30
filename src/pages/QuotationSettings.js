import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  MenuItem,
  CircularProgress
} from '@mui/material';

import { getQuotationSettings, saveQuotationSettings } from '../services/quotationSettingsService';
import NotificationSnackbar from '../components/ui/NotificationSnackbar';
import WgiymEditor from '../components/ui/WgiymEditor';
import FileUploader from '../components/ui/FileUploader';

const layoutOptions = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'classic', label: 'Classic' },
  { value: 'modern', label: 'Modern' },
];

const numberingModes = [
  { value: 'continuous', label: 'Continuous (Never resets)' },
  { value: 'yearly', label: 'Reset Every Year' },
  { value: 'monthly', label: 'Reset Every Month' },
];

function QuotationSettings() {
  const [settings, setSettings] = useState({
    layout_option: 'minimal',
    logo_url: '',
    terms_conditions_html: '',
    cover_letter_html: '',
    footer_notes_html: '',
    prefix: 'QT',
    sequence_start: 1,
    number_format: '{prefix}/{year}/{seq}',
    numbering_mode: 'continuous',
    quotation_mode: 'GENERAL'
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
      setSettings(data);
    } catch (err) {
      console.error("Failed to load settings:", err);
      showNotification("Failed to load settings", "error");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      await saveQuotationSettings(settings);
      showNotification("✅ Quotation settings saved!");
    } catch (err) {
      console.error("Failed to save settings:", err);
      showNotification("❌ Failed to save settings", "error");
    }
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Quotation Settings
      </Typography>

      <Paper sx={{ p: 3 }}>
        {loading ? (
          <CircularProgress />
        ) : (
          <>
            {/* Layout */}
            <TextField
              label="Quotation Layout"
              select
              fullWidth
              sx={{ mb: 3 }}
              value={settings.layout_option}
              onChange={(e) => setSettings({ ...settings, layout_option: e.target.value })}
            >
              {layoutOptions.map(op => (
                <MenuItem key={op.value} value={op.value}>
                  {op.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
                select
                label="Quotation Mode"
                fullWidth
                sx={{ mb: 3 }}
                value={settings.quotation_mode || 'GENERAL'}
                onChange={(e) => setSettings({ ...settings, quotation_mode: e.target.value })}
              >
                <MenuItem value="GENERAL">General (Default)</MenuItem>
                {/* <MenuItem value="CATERING">Catering (With PAX)</MenuItem>
                <MenuItem value="FUSION_BOX">Fusion Box</MenuItem>
                <MenuItem value="MEAL_BOX">Chef’s Meal Box</MenuItem> */}
              </TextField>


            {/* Logo */}
            <FileUploader
              label="Company Logo"
              fileUrl={settings.logo_url}
              onFileUploaded={(url) => setSettings({ ...settings, logo_url: url })}
            />

            <Typography variant="h6" mt={4}>
              Quotation Numbering
            </Typography>

            <TextField
              label="Prefix"
              fullWidth
              sx={{ mt: 2 }}
              value={settings.prefix}
              onChange={(e) => setSettings({ ...settings, prefix: e.target.value })}
            />

            <TextField
              label="Sequence Start"
              type="number"
              fullWidth
              sx={{ mt: 2 }}
              value={settings.sequence_start}
              onChange={(e) => setSettings({ ...settings, sequence_start: Number(e.target.value) })}
            />

            <TextField
              label="Number Format"
              fullWidth
              sx={{ mt: 2 }}
              helperText="Available tags: {prefix} {year} {month} {seq}"
              value={settings.number_format}
              onChange={(e) => setSettings({ ...settings, number_format: e.target.value })}
            />

            <TextField
              label="Numbering Mode"
              select
              fullWidth
              sx={{ mt: 2 }}
              value={settings.numbering_mode}
              onChange={(e) => setSettings({ ...settings, numbering_mode: e.target.value })}
            >
              {numberingModes.map(op => (
                <MenuItem key={op.value} value={op.value}>
                  {op.label}
                </MenuItem>
              ))}
            </TextField>

            <Typography variant="h6" mt={4}>Cover Letter / Introduction</Typography>
            <WgiymEditor
              value={settings.cover_letter_html}
              onChange={(val) => setSettings({ ...settings, cover_letter_html: val })}
            />

            <Typography variant="h6" mt={4}>Terms & Conditions</Typography>
            <WgiymEditor
              value={settings.terms_conditions_html}
              onChange={(val) => setSettings({ ...settings, terms_conditions_html: val })}
            />

            <Typography variant="h6" mt={4}>Footer Notes (Optional)</Typography>
            <WgiymEditor
              value={settings.footer_notes_html}
              onChange={(val) => setSettings({ ...settings, footer_notes_html: val })}
            />

            <Button variant="contained" sx={{ mt: 4 }} onClick={handleSave}>
              Save Settings
            </Button>
          </>
        )}
      </Paper>

      <NotificationSnackbar
        open={notif.open}
        message={notif.message}
        severity={notif.severity}
        onClose={() => setNotif({ ...notif, open: false })}
      />
    </Container>
  );
}

export default QuotationSettings;
