import React, { useMemo, useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import Topbar from '../components/Topbar';
import NotificationSnackbar from '../components/ui/NotificationSnackbar';
import { fetchDeliveries, updateDeliveryStatus, updateDeliveryNotes } from '../services/deliveryService';
import { formatDateTime, parseDateInput, toInputDateValue } from '../utils/dateFormatter';
import { formatStatusLabel } from '../utils/statusFormatter';
import useAutoRefresh from '../hooks/useAutoRefresh';
import { useNotification } from '../context/NotificationContext';
import { useLocation } from 'react-router-dom';

const STATUS_OPTIONS = ['pending', 'out_for_delivery', 'delivered', 'failed'];
const RANGE_OPTIONS = ['all', 'today'];

const formatQty = (qty) => {
  const num = Number(qty || 0);
  return `${Math.round(num)} Qty`;
};

const formatPrice = (price) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price || 0);
};

const calculateTotalPrice = (items = []) => {
  return items.reduce((sum, item) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unit_price || 0);
    return sum + (quantity * unitPrice);
  }, 0);
};

const getStatusColor = (status) => {
  switch (status) {
    case 'pending': return '#ff9800'; // Orange
    case 'out_for_delivery': return '#2196f3'; // Blue
    case 'delivered': return '#4caf50'; // Green
    case 'failed': return '#f44336'; // Red
    default: return '#999';
  }
};

const buildDateTimeInput = (dateValue, timeValue) => {
  if (!dateValue) return null;

  const dateRaw = String(dateValue).trim();
  if (!dateRaw) return null;

  const normalizedTime = (() => {
    const raw = String(timeValue || '').trim();
    const match = raw.match(/^(\d{2}:\d{2})(?::\d{2})?$/);
    return match ? `${match[1]}:00` : '00:00:00';
  })();

  const dateOnly = dateRaw.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (dateOnly) {
    return `${dateOnly[1]}T${normalizedTime}`;
  }

  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(dateRaw)) {
    return dateRaw.replace(' ', 'T');
  }

  const datePrefix = dateRaw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (datePrefix) {
    return `${datePrefix[1]}T${normalizedTime}`;
  }

  return dateRaw;
};

function DeliveryBoard() {
  const { getUnreadNotificationFor, markRecordNotificationsSeen } = useNotification();
  const location = useLocation();
  const [range, setRange] = useState('all');
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notif, setNotif] = useState({ open: false, message: '', severity: 'success' });
  const [sliderIndex, setSliderIndex] = useState(0);
  const [notesModal, setNotesModal] = useState({ open: false, deliveryId: null, value: '', title: '' });

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('delivery_date'); // 'delivery_date', 'status', 'customer'

  const cardsPerView = 4;

  const showNotification = (message, severity = 'success') => {
    setNotif({ open: true, message, severity });
  };

  const getDateFilter = () => {
    if (range === 'today') {
      return toInputDateValue(new Date());
    }
    return null;
  };

  const loadDeliveries = async () => {
    try {
      setLoading(true);
      const dateFilter = getDateFilter();
      const res = await fetchDeliveries(dateFilter);
      setDeliveries(res?.deliveries || []);
      setSliderIndex(0);
    } catch (error) {
      showNotification(
        error?.response?.data?.error || 'Failed to fetch deliveries',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  useAutoRefresh(loadDeliveries, {
    intervalMs: 15000,
    watch: [range],
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const rangeQuery = String(params.get('range') || '').trim().toLowerCase();
    if (RANGE_OPTIONS.includes(rangeQuery)) {
      setRange(rangeQuery);
    }

    const focusWoNo = params.get('focusWoNo');
    const focusDeliveryId = params.get('focusDeliveryId') || params.get('notification_source_id');
    const focusQuery = String(focusWoNo || focusDeliveryId || '').trim();

    if (!focusQuery) return;

    setRange('all');
    setStatusFilter('all');
    setSearchQuery(focusQuery);
    setSliderIndex(0);

    // Consume one-time focus query params so refreshes don't keep filtering.
    params.delete('focusWoNo');
    params.delete('focusDeliveryId');
    params.delete('notification_source_id');
    const nextQuery = params.toString();
    const nextUrl = `${location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
    window.history.replaceState({}, '', nextUrl);
  }, [location.search]);

  const sortedDeliveries = useMemo(() => {
    let filtered = [...deliveries];

    // Search filter
    if (searchQuery) {
      const query = String(searchQuery || '').trim().toLowerCase();
      const queryDigits = query.replace(/\D/g, '');

      filtered = filtered.filter((delivery) => {
        const deliveryId = String(delivery.id || '');
        const workOrderNo = String(delivery.work_order_number || '');
        const workOrderNoLower = workOrderNo.toLowerCase();
        const workOrderDigits = workOrderNo.replace(/\D/g, '');
        const customerName = String(delivery.customer_name || '').toLowerCase();
        const customerPhone = String(delivery.customer_phone || '').toLowerCase();
        const deliveryLocation = String(delivery.delivery_location || '').toLowerCase();

        const textMatch =
          deliveryId.includes(query) ||
          workOrderNoLower.includes(query) ||
          customerName.includes(query) ||
          customerPhone.includes(query) ||
          deliveryLocation.includes(query);

        const numberMatch = queryDigits
          ? (
            deliveryId.includes(queryDigits) ||
            workOrderDigits.includes(queryDigits)
          )
          : false;

        return textMatch || numberMatch;
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(delivery => delivery.status === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'delivery_date') {
        const dateA =
          parseDateInput(buildDateTimeInput(a.delivery_date, a.delivery_time)) ||
          parseDateInput(buildDateTimeInput(a.event_snapshot?.date, a.event_snapshot?.time)) ||
          new Date(0);
        const dateB =
          parseDateInput(buildDateTimeInput(b.delivery_date, b.delivery_time)) ||
          parseDateInput(buildDateTimeInput(b.event_snapshot?.date, b.event_snapshot?.time)) ||
          new Date(0);
        return dateA - dateB;
      } else if (sortBy === 'status') {
        const statusOrder = { 'pending': 1, 'out_for_delivery': 2, 'delivered': 3, 'failed': 4 };
        return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
      } else if (sortBy === 'customer') {
        return (a.customer_name || '').localeCompare(b.customer_name || '');
      }
      return 0;
    });

    return filtered;
  }, [deliveries, searchQuery, statusFilter, sortBy]);

  const handleStatusChange = async (deliveryId, status) => {
    try {
      await updateDeliveryStatus(deliveryId, status);
      showNotification('Delivery status updated');
      loadDeliveries();
    } catch (error) {
      showNotification(
        error?.response?.data?.error || 'Failed to update status',
        'error'
      );
    }
  };

  const handleNotesChange = async (deliveryId, notes) => {
    try {
      await updateDeliveryNotes(deliveryId, notes);
      showNotification('Delivery notes updated');
      loadDeliveries();
    } catch (error) {
      showNotification(
        error?.response?.data?.error || 'Failed to update notes',
        'error'
      );
    }
  };

  const getDeliveryDateTimeLabel = (delivery) => {
    const primaryInput = buildDateTimeInput(delivery?.delivery_date, delivery?.delivery_time);
    const fallbackInput = buildDateTimeInput(delivery?.event_snapshot?.date, delivery?.event_snapshot?.time);

    const formattedPrimary = primaryInput ? formatDateTime(primaryInput) : '';
    if (formattedPrimary) return formattedPrimary;

    const formattedFallback = fallbackInput ? formatDateTime(fallbackInput) : '';
    if (formattedFallback) return formattedFallback;

    return '—';
  };

  const openNotesModal = (delivery) => {
    setNotesModal({
      open: true,
      deliveryId: delivery.id,
      value: delivery.delivery_notes || '',
      title: `Notes • #${delivery.id}`,
    });
  };

  const closeNotesModal = () => {
    setNotesModal({ open: false, deliveryId: null, value: '', title: '' });
  };

  const saveNotesFromModal = async () => {
    if (!notesModal.deliveryId) return;
    await handleNotesChange(notesModal.deliveryId, notesModal.value);
    closeNotesModal();
  };

  const handleOpenDeliveryRecord = async (deliveryId) => {
    try {
      await markRecordNotificationsSeen('delivery', deliveryId);
    } catch {
      // Keep board interaction responsive even if notification update fails.
    }
  };

  return (
    <>
      <Topbar />
      <Box sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h5" fontWeight={700}>Deliveries</Typography>

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
        <Box sx={{ p: 2, mb: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #e0e0e0' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <TextField
              fullWidth
              size="small"
              placeholder="Search delivery, customer, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <FormControl fullWidth size="small" sx={{ minWidth: 200 }}>
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
            <FormControl fullWidth size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="delivery_date">Delivery Date</MenuItem>
                <MenuItem value="status">Status</MenuItem>
                <MenuItem value="customer">Customer Name</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Box>

        {loading ? (
          <CircularProgress />
        ) : sortedDeliveries.length === 0 ? (
          <Typography>No deliveries found.</Typography>
        ) : (
          <Stack direction="column" spacing={2}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cardsPerView}, 1fr)`,
                gap: 2,
                minHeight: 'calc(100vh - 200px)',
              }}
            >
              {sortedDeliveries.slice(sliderIndex, sliderIndex + cardsPerView).map((delivery) => {
                const event = delivery.event_snapshot || {};
                const totalQty = (delivery.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
                const notification = getUnreadNotificationFor('delivery', delivery.id);
                const action = String(notification?.action || '').toLowerCase();
                const badgeLabel = notification ? (/(create|new|added)/.test(action) ? 'NEW' : 'UPDATED') : '';

                return (
                  <Card
                    key={delivery.id}
                    onClick={() => handleOpenDeliveryRecord(delivery.id)}
                    sx={{ borderRadius: 2, height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
                  >
                    <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="subtitle1" fontWeight={700}>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={() => handleOpenDeliveryRecord(delivery.id)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  handleOpenDeliveryRecord(delivery.id);
                                }
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              #{delivery.id}
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

                        <FormControl size="small" sx={{ minWidth: 130 }}>
                          <InputLabel>Status</InputLabel>
                          <Select
                            label="Status"
                            value={delivery.status}
                            onChange={(e) => handleStatusChange(delivery.id, e.target.value)}
                          >
                            {STATUS_OPTIONS.map((status) => (
                              <MenuItem key={status} value={status}>{formatStatusLabel(status)}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Stack>

                      <Box sx={{ mb: 1, p: 1, bgcolor: getStatusColor(delivery.status), borderRadius: 1, color: 'white' }}>
                        <Typography variant="caption" fontWeight={700}>
                          {formatStatusLabel(delivery.status)}
                        </Typography>
                      </Box>

                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>Event:</strong> {event.name || '—'}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>Date & Time:</strong> {getDeliveryDateTimeLabel(delivery)}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>Customer:</strong> {delivery.customer_name || '—'}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>Phone:</strong> {delivery.customer_phone || '—'}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>Location:</strong> {delivery.delivery_location || '—'}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1.5 }}>
                        <strong>PAX:</strong> {delivery.pax || '—'}
                      </Typography>

                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Items ({delivery.items?.length || 0}) • Total Qty: {formatQty(totalQty)}
                      </Typography>

                      <Box sx={{ flex: 1, overflow: 'auto', pr: 1, mb: 2 }}>
                        {(delivery.items || []).map((item) => (
                          <Box
                            key={item.id}
                            sx={{ py: 0.75, borderBottom: '1px solid #eee' }}
                          >
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                              <Typography variant="body2" fontWeight={600}>{item.product_name}</Typography>
                              <Stack direction="column" alignItems="flex-end">
                                <Typography variant="body2" fontWeight={700}>{formatQty(item.quantity)}</Typography>
                                {item.unit_price && (
                                  <Typography variant="caption" color="text.secondary">
                                    {formatPrice(item.unit_price)}
                                  </Typography>
                                )}
                              </Stack>
                            </Stack>
                          </Box>
                        ))}
                      </Box>

                      {calculateTotalPrice(delivery.items) > 0 && (
                        <Box sx={{ mb: 2, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                          <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Typography variant="subtitle2" fontWeight={700}>Total Price:</Typography>
                            <Typography variant="subtitle2" fontWeight={700} color="primary">
                              {formatPrice(calculateTotalPrice(delivery.items))}
                            </Typography>
                          </Stack>
                        </Box>
                      )}

                      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Notes:</Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: 'block',
                          mb: 2,
                          p: 1.25,
                          bgcolor: '#f5f5f5',
                          borderRadius: 1.5,
                          border: '1px dashed #c8ccd4',
                          minHeight: 44,
                          whiteSpace: 'pre-wrap',
                          cursor: 'pointer',
                          '&:hover': { bgcolor: '#eceff3' },
                        }}
                        onClick={() => openNotesModal(delivery)}
                      >
                        {delivery.delivery_notes || '(Click to add notes)'}
                      </Typography>
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
                {sliderIndex + 1} - {Math.min(sliderIndex + cardsPerView, sortedDeliveries.length)} of {sortedDeliveries.length}
              </Typography>
              <IconButton
                onClick={() => setSliderIndex(Math.min(sliderIndex + 1, sortedDeliveries.length - cardsPerView))}
                disabled={sliderIndex + cardsPerView >= sortedDeliveries.length}
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

      <Dialog open={notesModal.open} onClose={closeNotesModal} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pb: 1 }}>{notesModal.title || 'Delivery Notes'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={5}
            placeholder="Add delivery notes..."
            value={notesModal.value}
            onChange={(e) => setNotesModal((prev) => ({ ...prev, value: e.target.value }))}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeNotesModal}>Cancel</Button>
          <Button variant="contained" onClick={saveNotesFromModal}>Save Notes</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default DeliveryBoard;
