import React, { useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';

import Topbar from '../components/Topbar';
import NotificationSnackbar from '../components/ui/NotificationSnackbar';
import PageLoader from '../components/ui/PageLoader';
import { fetchKots, updateKotStatus } from '../services/kotService';
import { createDeliveryFromWorkOrder } from '../services/deliveryService';
import { useSettings } from '../context/SettingsContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import { downloadPdfFromResponse, printPdfFromResponse } from '../utils/pdfHelpers';
import { formatDateTime, parseDateInput, toInputDateValue } from '../utils/dateFormatter';
import { formatStatusLabel } from '../utils/statusFormatter';
import useAutoRefresh from '../hooks/useAutoRefresh';
import { useLocation, useNavigate } from 'react-router-dom';

const STATUS_OPTIONS = ['pending', 'preparing', 'ready', 'completed'];
const RANGE_OPTIONS = ['all', 'today', 'tomorrow', 'upcoming'];

const formatQty = (qty) => {
  const num = Number(qty || 0);
  return `${Math.round(num)} Qty`;
};

function KOTBoard() {
  const { settings } = useSettings();
  const { getUnreadNotificationFor, markRecordNotificationsSeen } = useNotification();
  const location = useLocation();
  const navigate = useNavigate();

  const [range, setRange] = useState('today');
  const [kots, setKots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notif, setNotif] = useState({ open: false, message: '', severity: 'success' });
  const [sliderIndex, setSliderIndex] = useState(0);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('scheduled'); // 'scheduled', 'status', 'pax'

  const isCateringBusiness = settings?.business_type === 'CATERING';
  const cardsPerView = 4; // Show 4 cards at a time

  const showNotification = (message, severity = 'success') => {
    setNotif({ open: true, message, severity });
  };

  const loadKots = async (selectedRange = range, { isAutoRefresh = false } = {}) => {
    try {
      if (!isAutoRefresh) setLoading(true);
      const res = await fetchKots(selectedRange);
      setKots(res?.kots || []);
    } catch (error) {
      showNotification(
        error?.response?.data?.error || 'Failed to fetch KOT list',
        'error'
      );
    } finally {
      if (!isAutoRefresh) setLoading(false);
    }
  };

  useAutoRefresh(
    (refreshContext) => {
      if (isCateringBusiness) {
        return loadKots(range, refreshContext);
      }

      setLoading(false);
      return Promise.resolve();
    },
    {
      enabled: true,
      intervalMs: 15000,
      watch: [range, isCateringBusiness],
    }
  );

  useEffect(() => {
    setSliderIndex(0);
  }, [range]);

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const rangeQuery = String(params.get('range') || '').trim().toLowerCase();
    if (RANGE_OPTIONS.includes(rangeQuery)) {
      setRange(rangeQuery);
    }

    const focusWoNo = params.get('focusWoNo');
    const focusKotId = params.get('focusKotId') || params.get('notification_source_id');
    const focusQuery = String(focusWoNo || focusKotId || '').trim();

    if (!focusQuery) return;

    setRange('all');
    setStatusFilter('all');
    setSearchQuery(focusQuery);
    setSliderIndex(0);

    // Consume one-time focus query params so refreshes don't keep filtering.
    params.delete('focusWoNo');
    params.delete('focusKotId');
    params.delete('notification_source_id');
    const nextQuery = params.toString();
    const nextUrl = `${location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
    navigate(nextUrl, { replace: true });
  }, [location.search, location.pathname, navigate]);

  const filteredAndSortedKots = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = [...kots].filter((kot) => {
      const event = kot.event_snapshot || {};

      if (statusFilter !== 'all' && kot.status !== statusFilter) {
        return false;
      }

      if (!q) return true;

      const haystack = [
        kot.id,
        kot.work_order_number,
        kot.customer_name,
        event.name,
        event.location,
        event.venue,
        kot.event_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });

    return filtered.sort((a, b) => {
      const eventA = a.event_snapshot || {};
      const eventB = b.event_snapshot || {};

      if (sortBy === 'status') {
        const rankA = STATUS_OPTIONS.indexOf(a.status);
        const rankB = STATUS_OPTIONS.indexOf(b.status);
        return (rankA === -1 ? 999 : rankA) - (rankB === -1 ? 999 : rankB);
      }

      if (sortBy === 'pax') {
        const paxA = Number(eventA.pax || a.pax || 0);
        const paxB = Number(eventB.pax || b.pax || 0);
        return paxB - paxA;
      }

      const dateA = eventA.date
        ? (parseDateInput(`${eventA.date}T${eventA.time || '00:00:00'}`) || new Date(0))
        : (parseDateInput(a.scheduled_for || 0) || new Date(0));
      const dateB = eventB.date
        ? (parseDateInput(`${eventB.date}T${eventB.time || '00:00:00'}`) || new Date(0))
        : (parseDateInput(b.scheduled_for || 0) || new Date(0));

      return dateA - dateB;
    });
  }, [kots, searchQuery, statusFilter, sortBy]);

  useEffect(() => {
    setSliderIndex(0);
  }, [searchQuery, statusFilter, sortBy]);

  const handleStatusChange = async (kot, status) => {
    try {
      await updateKotStatus(kot.id, status);

      // Auto-create delivery if KOT is marked as completed
      if (status === 'completed') {
        try {
          const event = kot.event_snapshot || {};
          const deliveryData = {
            delivery_date: event.date || toInputDateValue(new Date()),
            delivery_time: event.time ? String(event.time).slice(0, 5) : '09:00',
            delivery_status: 'pending'
          };
          await createDeliveryFromWorkOrder(kot.work_order_id, deliveryData);
          showNotification('KOT completed and delivery created automatically');
        } catch (deliveryError) {
          showNotification('KOT marked complete but auto-delivery creation failed', 'warning');
        }
      } else {
        showNotification('KOT status updated');
      }

      loadKots(range);
    } catch (error) {
      showNotification(
        error?.response?.data?.error || 'Failed to update KOT status',
        'error'
      );
    }
  };

  const handlePrintKot = async (kotId) => {
    try {
      const res = await api.get(`/kots/${kotId}/pdf`, {
        responseType: 'blob'
      });

      await printPdfFromResponse(res, 'Failed to print KOT PDF');

    } catch (error) {
      showNotification(
        error?.message || error?.response?.data?.error || 'Failed to print KOT',
        'error'
      );
    }
  };

  const handleDownloadKot = async (kotId, workOrderNumber) => {
    try {
      const res = await api.get(`/kots/${kotId}/pdf`, {
        responseType: 'blob'
      });

      await downloadPdfFromResponse(
        res,
        `KOT-${workOrderNumber || kotId}.pdf`,
        'Failed to download KOT PDF'
      );
    } catch (error) {
      showNotification(
        error?.response?.data?.error || 'Failed to download KOT',
        'error'
      );
    }
  };

  const handleOpenKotRecord = async (kotId) => {
    try {
      await markRecordNotificationsSeen('kot', kotId);
    } catch {
      // Keep board interaction responsive even if notification update fails.
    }
  };

  if (!isCateringBusiness) {
    return (
      <>
        <Topbar />
        <Box sx={{ p: 3 }}>
          <Typography variant="h6">KOT is available only for CATERING business type.</Typography>
        </Box>
      </>
    );
  }

  return (
    <>
      <Topbar />
      <Box sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h5" fontWeight={700}>Kitchen Order Tickets</Typography>

          <Stack direction="row" spacing={1}>
            {RANGE_OPTIONS.map((option) => (
              <Chip
                key={option}
                clickable
                color={range === option ? 'primary' : 'default'}
                label={formatStatusLabel(option)}
                onClick={() => setRange(option)}
              />
            ))}
          </Stack>
        </Stack>

        {/* Search and Filters */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search KOT, customer, event..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  {STATUS_OPTIONS.map((status) => (
                    <MenuItem key={status} value={status}>{formatStatusLabel(status)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  label="Sort By"
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <MenuItem value="scheduled">Scheduled Time</MenuItem>
                  <MenuItem value="status">Status</MenuItem>
                  <MenuItem value="pax">PAX (High to Low)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {loading ? (
          <PageLoader message="Loading KOT board..." minHeight={300} />
        ) : filteredAndSortedKots.length === 0 ? (
          <Typography>No KOTs found for selected filters.</Typography>
        ) : (
          <Stack direction="column" spacing={2}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cardsPerView}, 1fr)`,
                gap: 2,
                minHeight: 'calc(100vh - 300px)',
              }}
            >
              {filteredAndSortedKots.slice(sliderIndex, sliderIndex + cardsPerView).map((kot) => {
                const event = kot.event_snapshot || {};
                const totalQty = (kot.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
                const notification = getUnreadNotificationFor('kot', kot.id);
                const action = String(notification?.action || '').toLowerCase();
                const badgeLabel = notification ? (/(create|new|added)/.test(action) ? 'NEW' : 'UPDATED') : '';

                const notes = String(kot.work_order_notes || event.notes || '').trim();

                return (
                  <Card
                    key={kot.id}
                    onClick={() => handleOpenKotRecord(kot.id)}
                    sx={{ borderRadius: 2, height: 'calc(100vh - 300px)', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
                  >
                    <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                        <Stack direction="column" spacing={0}>
                          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                            <strong>Customer:</strong> {kot.customer_name || (event && (event.customer_name || event.customer)) || 'Customer'}
                          </Typography>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="subtitle1" fontWeight={700}>
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={() => handleOpenKotRecord(kot.id)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    handleOpenKotRecord(kot.id);
                                  }
                                }}
                                style={{ cursor: 'pointer' }}
                              >
                                {kot.work_order_number}
                              </span>
                            </Typography>
                            {badgeLabel ? (
                              <Chip
                                label={badgeLabel}
                                size="small"
                                color="error"
                                sx={{ fontWeight: 700 }}
                              />
                            ) : null}
                          </Stack>
                        </Stack>

                        <FormControl size="small" sx={{ minWidth: 130 }}>
                          <InputLabel>Status</InputLabel>
                          <Select
                            label="Status"
                            value={kot.status}
                            onChange={(e) => handleStatusChange(kot, e.target.value)}
                          >
                            {STATUS_OPTIONS.map((status) => (
                              <MenuItem key={status} value={status}>{formatStatusLabel(status)}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Stack>

                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>Event:</strong> {event.name || '—'}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>Venue:</strong> {event.venue || '—'}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>PAX:</strong> {event.pax || '—'}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>Scheduled:</strong> {formatDateTime(kot.scheduled_for)}
                      </Typography>
                      {/* <Typography variant="body2" sx={{ mb: 1.5 }}>
                        <strong>Customer:</strong> {kot.customer_name || '—'}
                      </Typography> */}

                      {!!notes && (
                        <Box sx={{ mb: 1.5, bgcolor: 'rgba(255,243,205,0.95)', p: 1, borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, mb: 0.5 }}>Notes</Typography>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{notes}</Typography>
                        </Box>
                      )}

                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Items ({kot.items?.length || 0}) • Total Qty: {formatQty(totalQty)}
                      </Typography>

                      <Box sx={{ flex: 1, overflow: 'auto', pr: 1, mb: 2 }}>
                        {(kot.items || []).map((item) => (
                          <Box
                            key={item.id}
                            sx={{ py: 0.75, borderBottom: '1px solid #eee' }}
                          >
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                              <Typography variant="body2" fontWeight={600}>{item.product_name}</Typography>
                              <Typography variant="body2" fontWeight={700}>{formatQty(item.quantity)}</Typography>
                            </Stack>
                            {item.product_description && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', mt: 0.25 }}
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(String(item.product_description || '')) }}
                              />
                            )}
                          </Box>
                        ))}
                      </Box>

                      <Stack direction="row" spacing={1} mt="auto">
                        <Button
                          variant="outlined"
                          color="primary"
                          size="small"
                          fullWidth
                          startIcon={<PrintIcon />}
                          onClick={() => handlePrintKot(kot.id)}
                        >
                          Print
                        </Button>

                        <Button
                          variant="outlined"
                          color="info"
                          size="small"
                          fullWidth
                          startIcon={<DownloadIcon />}
                          onClick={() => handleDownloadKot(kot.id, kot.work_order_number)}
                        >
                          Download
                        </Button>

                        {kot.status !== 'completed' && (
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            fullWidth
                            onClick={() => handleStatusChange(kot, 'completed')}
                          >
                            Complete
                          </Button>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>

            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <IconButton
                onClick={() => setSliderIndex(Math.max(0, sliderIndex - 1))}
                disabled={sliderIndex === 0}
              >
                <ChevronLeftIcon />
              </IconButton>
              <Typography variant="body2" sx={{ flex: 1, textAlign: 'center' }}>
                {sliderIndex + 1} - {Math.min(sliderIndex + cardsPerView, filteredAndSortedKots.length)} of {filteredAndSortedKots.length}
              </Typography>
              <IconButton
                onClick={() => setSliderIndex(Math.min(sliderIndex + 1, Math.max(filteredAndSortedKots.length - cardsPerView, 0)))}
                disabled={sliderIndex + cardsPerView >= filteredAndSortedKots.length}
              >
                <ChevronRightIcon />
              </IconButton>
            </Stack>
          </Stack>
        )}
      </Box>

      <NotificationSnackbar
        open={notif.open}
        message={notif.message}
        severity={notif.severity}
        onClose={() => setNotif((prev) => ({ ...prev, open: false }))}
      />
    </>
  );
}

export default KOTBoard;
