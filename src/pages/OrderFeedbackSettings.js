import React, { useEffect, useState } from 'react';
import Topbar from '../components/Topbar';
import NotificationSnackbar from '../components/ui/NotificationSnackbar';
import PageLoader from '../components/ui/PageLoader';
import {
  getOrderFeedbackSettings,
  saveOrderFeedbackSettings,
} from '../services/orderFeedbackSettingsService';
import '../assets/styles/LeadsTable.scss';
import '../assets/styles/PaymentReminders.scss';

const OrderFeedbackSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    is_email_enabled: true,
    delay_minutes: 30,
    email_subject: 'How was your order?',
  });

  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info',
  });

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await getOrderFeedbackSettings();
      setSettings({
        is_email_enabled: Number(response?.is_email_enabled ?? 1) === 1,
        delay_minutes: Number(response?.delay_minutes || 30),
        email_subject: response?.email_subject || 'How was your order?',
      });
    } catch (error) {
      setNotification({
        open: true,
        message: error?.response?.data?.error || 'Failed to load feedback settings',
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
      await saveOrderFeedbackSettings({
        is_email_enabled: settings.is_email_enabled,
        delay_minutes: Number(settings.delay_minutes || 30),
        email_subject: settings.email_subject,
      });

      setNotification({
        open: true,
        message: 'Feedback settings saved successfully',
        severity: 'success',
      });

      await loadSettings();
    } catch (error) {
      setNotification({
        open: true,
        message: error?.response?.data?.error || 'Failed to save feedback settings',
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
          <h2>Feedback Settings</h2>
          <p>Configure when and how feedback request emails are sent after delivery.</p>
        </div>

        <div className="payment-reminder-settings-body">
          {loading ? (
            <PageLoader message="Loading feedback settings..." minHeight={180} size={28} />
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 20 }}>
              <div className="auto-toggle-card">
                <div>
                  <div className="title">Auto Feedback Emails</div>
                  <div className="subtitle">
                    {settings.is_email_enabled
                      ? 'Feedback requests will be scheduled automatically after delivered status.'
                      : 'Automatic feedback scheduling is disabled.'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      is_email_enabled: !prev.is_email_enabled,
                    }))
                  }
                  className={`toggle-btn ${settings.is_email_enabled ? 'running' : 'stopped'}`}
                >
                  {settings.is_email_enabled ? 'Stop Auto' : 'Start Auto'}
                </button>
              </div>

              <div className="time-grid">
                <div className="time-field">
                  <label>Delay in Minutes (1 to 1440)</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    max="1440"
                    value={settings.delay_minutes}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        delay_minutes: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="time-field">
                  <label>Email Subject</label>
                  <input
                    className="input"
                    type="text"
                    value={settings.email_subject}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        email_subject: e.target.value,
                      }))
                    }
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

export default OrderFeedbackSettings;
