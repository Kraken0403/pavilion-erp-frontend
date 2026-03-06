import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  MenuItem,
} from '@mui/material';
import Topbar from '../components/Topbar';
import NotificationSnackbar from '../components/ui/NotificationSnackbar';
import PageLoader from '../components/ui/PageLoader';
import { getKotSettings, saveKotSettings } from '../services/kotSettingsService';

const kotPrintPageSizes = [
  { value: 'SLIP', label: 'Slip / Thermal (Current)' },
  { value: 'A4', label: 'A4 Page' },
];

function KOTSettings() {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    kot_print_page_size: 'SLIP',
  });

  const [notif, setNotif] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const showNotification = (message, severity = 'success') => {
    setNotif({ open: true, message, severity });
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getKotSettings();
        setSettings({
          kot_print_page_size: data?.kot_print_page_size || 'SLIP',
        });
      } catch (err) {
        showNotification('Failed to load KOT settings', 'error');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleSave = async () => {
    try {
      await saveKotSettings(settings);
      showNotification('✅ KOT settings saved successfully');
    } catch (err) {
      showNotification('❌ Failed to save KOT settings', 'error');
    }
  };

  return (
    <Container>
      <Topbar />

      <Paper sx={{ p: 3 }}>
        {loading ? (
          <PageLoader message="Loading KOT settings..." minHeight={220} />
        ) : (
          <>
            <Typography variant="h6" sx={{ mb: 2 }}>KOT Settings</Typography>

            <TextField
              label="KOT Print Page Size"
              select
              fullWidth
              value={settings.kot_print_page_size}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  kot_print_page_size: e.target.value,
                }))
              }
            >
              {kotPrintPageSizes.map((op) => (
                <MenuItem key={op.value} value={op.value}>
                  {op.label}
                </MenuItem>
              ))}
            </TextField>

            <Button variant="contained" sx={{ mt: 3 }} onClick={handleSave}>
              Save KOT Settings
            </Button>
          </>
        )}
      </Paper>

      <NotificationSnackbar
        open={notif.open}
        message={notif.message}
        severity={notif.severity}
        onClose={() => setNotif((prev) => ({ ...prev, open: false }))}
      />
    </Container>
  );
}

export default KOTSettings;
