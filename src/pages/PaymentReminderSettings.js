import React, { useEffect, useState } from 'react';
import Topbar from '../components/Topbar';
import NotificationSnackbar from '../components/ui/NotificationSnackbar';
import PageLoader from '../components/ui/PageLoader';
import TimePicker12 from '../components/TimePicker12'
import {
  getPaymentReminderSettings,
  savePaymentReminderSettings,
} from '../services/paymentReminderService';
import '../assets/styles/LeadsTable.scss';
import '../assets/styles/PaymentReminders.scss';

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
];

const toInputTime = (value) => {
  if (!value) return '10:00';
  return String(value).slice(0, 5);
};

const PaymentReminderSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    frequency: 'daily',
    email_send_time: '10:00',
    whatsapp_send_time: '10:00',
    is_email_enabled: true,
    is_whatsapp_enabled: false,
  });

  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info',
  });

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await getPaymentReminderSettings();
      setSettings({
        frequency: response?.frequency || 'daily',
        email_send_time: toInputTime(response?.email_send_time),
        whatsapp_send_time: toInputTime(response?.whatsapp_send_time),
        is_email_enabled: Number(response?.is_email_enabled ?? 1) === 1,
        is_whatsapp_enabled: Number(response?.is_whatsapp_enabled ?? 0) === 1,
      });
    } catch (error) {
      setNotification({
        open: true,
        message: error?.response?.data?.error || 'Failed to load settings',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await savePaymentReminderSettings({
        frequency: settings.frequency,
        email_send_time: `${settings.email_send_time}:00`,
        whatsapp_send_time: `${settings.whatsapp_send_time}:00`,
        is_email_enabled: settings.is_email_enabled,
        is_whatsapp_enabled: settings.is_whatsapp_enabled,
      });

      setNotification({
        open: true,
        message: 'Payment reminder settings saved successfully',
        severity: 'success',
      });
      await loadSettings();
    } catch (error) {
      setNotification({
        open: true,
        message: error?.response?.data?.error || 'Failed to save settings',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="leads-table-container payment-reminder-page">
      <Topbar />

      <div className="table-container payment-reminder-card">
        <div className="payment-reminder-header">
          <h2>Payment Reminder Settings</h2>
          <p>
            Configure reminder frequency and send timing for automated reminders.
          </p>
        </div>

        <div className="payment-reminder-settings-body">
          {loading ? (
            <PageLoader message="Loading payment reminder settings..." minHeight={180} size={28} />
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 20 }}>
              <div className="auto-toggle-card">
                <div>
                  <div className="title">Auto Email Reminders</div>
                  <div className="subtitle">
                    {settings.is_email_enabled
                      ? 'Automatic reminder emails are currently running.'
                      : 'Automatic reminder emails are currently stopped.'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSettings((prev) => ({ ...prev, is_email_enabled: !prev.is_email_enabled }))}
                  className={`toggle-btn ${settings.is_email_enabled ? 'running' : 'stopped'}`}
                >
                  {settings.is_email_enabled ? 'Stop Auto' : 'Start Auto'}
                </button>
              </div>

              <div className="auto-toggle-card">
                <div>
                  <div className="title">Auto WhatsApp Reminders</div>
                  <div className="subtitle">
                    {settings.is_whatsapp_enabled
                      ? 'WhatsApp reminders are currently running.'
                      : 'WhatsApp reminders are currently disabled.'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSettings((prev) => ({ ...prev, is_whatsapp_enabled: !prev.is_whatsapp_enabled }))}
                  className={`toggle-btn ${settings.is_whatsapp_enabled ? 'running' : 'stopped'}`}
                >
                  {settings.is_whatsapp_enabled ? 'Stop Auto' : 'Start Auto'}
                </button>
              </div>

              <div className="frequency-section">
                <label className="freq-label">
                  Reminder Frequency
                </label>

                <div className="frequency-grid">
                  {FREQUENCY_OPTIONS.map((option) => {
                    const isActive = settings.frequency === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSettings((prev) => ({ ...prev, frequency: option.value }))}
                        className={`frequency-chip ${isActive ? 'active' : ''}`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="time-grid">

                <div className="time-field">
                  <label>Email Send Time</label>
                  <TimePicker12
                    value={settings.email_send_time}
                    onChange={(val) => setSettings((prev) => ({ ...prev, email_send_time: val }))}
                  />
                </div>

                <div className="time-field">
                  <label>WhatsApp Send Time</label>
                  <TimePicker12
                    value={settings.whatsapp_send_time}
                    onChange={(val) => setSettings((prev) => ({ ...prev, whatsapp_send_time: val }))}
                  />
                </div>
              </div>

              <div className="settings-actions">
                <button type="submit" className="primary-btn" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <NotificationSnackbar
        {...notification}
        onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
};

export default PaymentReminderSettings;
