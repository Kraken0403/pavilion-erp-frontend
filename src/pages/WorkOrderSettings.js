import React, { useEffect, useState } from 'react';
import { Alert, Button, MenuItem, Snackbar, TextField } from '@mui/material';
import WgiymEditor from '../components/ui/WgiymEditor';
import { getWorkOrderSettings, saveWorkOrderSettings } from '../services/workOrderSettingsService';

export default function WorkOrderSettings() {
  const [settings, setSettings] = useState({ prefix: 'WO', number_format: '{prefix}/{year}/{seq}', numbering_mode: 'continuous', terms_conditions_html: '', footer_notes_html: '' });
  const [notice, setNotice] = useState({ open: false, message: '', severity: 'success' });
  useEffect(() => { getWorkOrderSettings().then((data) => setSettings((current) => ({ ...current, ...data }))).catch(() => setNotice({ open: true, message: 'Failed to load work order settings.', severity: 'error' })); }, []);
  const save = async () => {
    try { await saveWorkOrderSettings(settings); setNotice({ open: true, message: 'Work order settings saved.', severity: 'success' }); }
    catch (_) { setNotice({ open: true, message: 'Failed to save work order settings.', severity: 'error' }); }
  };
  return <div className="settings-module-page">
    <div className="settings-module-heading"><span>Document settings</span><h2>Work orders</h2><p>Set work order numbering and reusable operational content.</p></div>
    <div className="settings-sections-form">
      <section className="settings-section-card"><header><div><h3>Work order numbering</h3><p>Define the identifier applied to each new work order.</p></div></header><div className="settings-field-grid"><TextField label="Prefix" fullWidth value={settings.prefix} onChange={(event) => setSettings((current) => ({ ...current, prefix: event.target.value }))} /><TextField label="Number format" fullWidth value={settings.number_format} helperText="Available tags: {prefix} {year} {month} {seq}" onChange={(event) => setSettings((current) => ({ ...current, number_format: event.target.value }))} /><TextField select label="Numbering mode" fullWidth value={settings.numbering_mode} onChange={(event) => setSettings((current) => ({ ...current, numbering_mode: event.target.value }))}><MenuItem value="continuous">Continuous</MenuItem><MenuItem value="yearly">Reset every year</MenuItem><MenuItem value="monthly">Reset every month</MenuItem></TextField></div></section>
      <section className="settings-section-card"><header><div><h3>Reusable content</h3><p>Default terms and footer copy for generated work orders.</p></div></header><div className="settings-editor-stack"><label><span>Terms and conditions</span><WgiymEditor value={settings.terms_conditions_html} onChange={(value) => setSettings((current) => ({ ...current, terms_conditions_html: value }))} /></label><label><span>Footer notes</span><WgiymEditor value={settings.footer_notes_html} onChange={(value) => setSettings((current) => ({ ...current, footer_notes_html: value }))} /></label></div></section>
      <footer className="settings-form-footer"><Button variant="contained" onClick={save}>Save work order settings</Button></footer>
    </div>
    <Snackbar open={notice.open} autoHideDuration={5000} onClose={() => setNotice((current) => ({ ...current, open: false }))}><Alert severity={notice.severity}>{notice.message}</Alert></Snackbar>
  </div>;
}
