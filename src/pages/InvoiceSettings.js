// src/pages/InvoiceSettings.js
import React, { useCallback, useState, useEffect } from 'react'
import {
  TextField,
  Button,
  MenuItem
} from '@mui/material'

import NotificationSnackbar from '../components/ui/NotificationSnackbar'
import WgiymEditor from '../components/ui/WgiymEditor'
import {
  getInvoiceSettings,
  saveInvoiceSettings
} from '../services/invoiceService'
import PageLoader from '../components/ui/PageLoader'

const numberingModes = [
  { value: 'continuous', label: 'Continuous (Never resets)' },
  { value: 'yearly', label: 'Reset Every Year' },
  { value: 'monthly', label: 'Reset Every Month' },
]

function InvoiceSettings() {
  const [settings, setSettings] = useState({
    layout_option: 'minimal',
    prefix: 'INV',
    sequence_start: 1,
    number_format: '{prefix}/{year}/{seq}',
    numbering_mode: 'continuous',
    receipt_prefix: 'REC',
    receipt_sequence_start: 1,
    receipt_number_format: '{prefix}/{year}/{seq}',
    receipt_numbering_mode: 'continuous',
    proforma_prefix: 'PI',
    proforma_number_format: '{prefix}/{year}/{seq}',
    proforma_sequence_start: 1,
    proforma_numbering_mode: 'continuous',
    cover_letter_html: '',
    terms_conditions_html: '',
    footer_notes_html: ''
  })

  const [loading, setLoading] = useState(false)

  const [notif, setNotif] = useState({
    open: false,
    message: '',
    severity: 'success'
  })

  const showNotification = useCallback((message, severity = 'success') => {
    setNotif({ open: true, message, severity })
  }, [])

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getInvoiceSettings()
      if (data) setSettings(data)
    } catch (err) {
      console.error('Failed to load invoice settings:', err)
      showNotification('Failed to load invoice settings', 'error')
    }
    setLoading(false)
  }, [showNotification])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSave = async () => {
    try {
      await saveInvoiceSettings(settings)
      showNotification('✅ Invoice settings saved!')
    } catch (err) {
      console.error('Failed to save invoice settings:', err)
      showNotification('❌ Failed to save invoice settings', 'error')
    }
  }

  return (
    <div className="settings-module-page">
      <div className="settings-module-heading"><span>Document settings</span><h2>Invoices</h2><p>Manage numbering for invoices, proformas and receipts, plus reusable document content.</p></div>
      {loading ? <PageLoader message="Loading invoice settings..." minHeight={220} /> : (
        <div className="settings-sections-form">
          <section className="settings-section-card">
            <header><div><h3>Invoice numbering</h3><p>Define the sequence used for issued invoices.</p></div></header>
            <div className="settings-field-grid">
            <TextField
              label="Prefix"
              fullWidth
              value={settings.prefix}
              onChange={(e) =>
                setSettings({ ...settings, prefix: e.target.value })
              }
            />

            <TextField
              label="Sequence Start"
              type="number"
              fullWidth
              value={settings.sequence_start}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  sequence_start: Number(e.target.value)
                })
              }
            />

            <TextField
              label="Number Format"
              fullWidth
              helperText="Available tags: {prefix} {year} {month} {seq}"
              value={settings.number_format}
              onChange={(e) =>
                setSettings({ ...settings, number_format: e.target.value })
              }
            />

            <TextField
              label="Numbering Mode"
              select
              fullWidth
              value={settings.numbering_mode}
              onChange={(e) =>
                setSettings({ ...settings, numbering_mode: e.target.value })
              }
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
            <header><div><h3>Proforma numbering</h3><p>Keep proforma documents on their own independent sequence.</p></div></header>
            <div className="settings-field-grid">
            <TextField
              label="Proforma Prefix"
              fullWidth
              value={settings.proforma_prefix || ''}
              onChange={(e) => setSettings({ ...settings, proforma_prefix: e.target.value })}
            />

            <TextField
              label="Proforma Number Format"
              fullWidth
              helperText="Available tags: {prefix} {year} {month} {seq}"
              value={settings.proforma_number_format || ''}
              onChange={(e) => setSettings({ ...settings, proforma_number_format: e.target.value })}
            />

            <TextField
              label="Proforma Sequence Start"
              type="number"
              fullWidth
              value={settings.proforma_sequence_start}
              onChange={(e) => setSettings({ ...settings, proforma_sequence_start: Number(e.target.value) })}
            />

            <TextField
              label="Proforma Numbering Mode"
              select
              fullWidth
              value={settings.proforma_numbering_mode || 'continuous'}
              onChange={(e) => setSettings({ ...settings, proforma_numbering_mode: e.target.value })}
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
            <header><div><h3>Receipt numbering</h3><p>Configure the identifiers created for payment receipts.</p></div></header>
            <div className="settings-field-grid">
            <TextField
              label="Receipt Prefix"
              fullWidth
              value={settings.receipt_prefix || ''}
              onChange={(e) =>
                setSettings({ ...settings, receipt_prefix: e.target.value })
              }
            />

            <TextField
              label="Receipt Sequence Start"
              type="number"
              fullWidth
              value={settings.receipt_sequence_start}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  receipt_sequence_start: Number(e.target.value)
                })
              }
            />

            <TextField
              label="Receipt Number Format"
              fullWidth
              helperText="Available tags: {prefix} {year} {month} {seq}"
              value={settings.receipt_number_format || ''}
              onChange={(e) =>
                setSettings({ ...settings, receipt_number_format: e.target.value })
              }
            />

            <TextField
              label="Receipt Numbering Mode"
              select
              fullWidth
              value={settings.receipt_numbering_mode || 'continuous'}
              onChange={(e) =>
                setSettings({ ...settings, receipt_numbering_mode: e.target.value })
              }
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
            <header><div><h3>Reusable content</h3><p>Default copy included in newly created invoice documents.</p></div></header>
            <div className="settings-editor-stack">
              <label><span>Cover letter / introduction</span><WgiymEditor value={settings.cover_letter_html || ''} onChange={(val) => setSettings({ ...settings, cover_letter_html: val })} /></label>
              <label><span>Terms & conditions</span><WgiymEditor value={settings.terms_conditions_html} onChange={(val) => setSettings({ ...settings, terms_conditions_html: val })} /></label>
              <label><span>Footer notes</span><WgiymEditor value={settings.footer_notes_html} onChange={(val) => setSettings({ ...settings, footer_notes_html: val })} /></label>
            </div>
          </section>

          <footer className="settings-form-footer"><Button variant="contained" onClick={handleSave}>Save invoice settings</Button></footer>
        </div>
      )}

      <NotificationSnackbar
        open={notif.open}
        message={notif.message}
        severity={notif.severity}
        onClose={() =>
          setNotif(prev => ({ ...prev, open: false }))
        }
      />
    </div>
  )
}

export default InvoiceSettings
