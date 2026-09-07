import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  Rating,
  Stack,
  Typography,
} from '@mui/material';
import NotificationSnackbar from '../components/ui/NotificationSnackbar';
import HubSpotListing from '../components/ui/HubSpotListing';
import { fetchOrderFeedbackById, fetchOrderFeedbacks } from '../services/orderFeedbackService';
import { formatDate } from '../utils/dateFormatter';
import '../assets/styles/LeadsTable.scss';
import useAutoRefresh from '../hooks/useAutoRefresh';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';

const ratingChipColor = (rating) => {
  const num = Number(rating || 0);
  if (num >= 4) return 'success';
  if (num >= 3) return 'warning';
  return 'error';
};

const toWholeQtyLabel = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 'x0';
  return `x${Math.max(0, Math.round(num))}`;
};

const renderStars = (label, value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return <Typography>{label}: -</Typography>;
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography>{label}:</Typography>
      <Rating value={num} precision={1} readOnly size="small" />
      <Typography variant="body2">({num}/5)</Typography>
    </Stack>
  );
};

function OrderFeedbacks() {
  const location = useLocation();
  const navigate = useNavigate();
  const { getUnreadNotificationFor, markRecordNotificationsSeen } = useNotification();
  const [feedbacks, setFeedbacks] = useState([]);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const handledFocusRef = useRef('');

  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info',
  });

  const loadFeedbacks = async () => {
    try {
      const data = await fetchOrderFeedbacks();
      setFeedbacks(Array.isArray(data?.feedbacks) ? data.feedbacks : []);
    } catch (error) {
      setNotification({
        open: true,
        message: error?.response?.data?.error || 'Failed to load feedback responses',
        severity: 'error',
      });
    } finally { /* The shared listing keeps the empty state stable during refreshes. */ }
  };

  useAutoRefresh(loadFeedbacks, { intervalMs: 20000 });

  const openDetail = useCallback(async (id) => {
    const safeId = Number(id || 0);
    if (!safeId) return;

    try {
      const detail = await fetchOrderFeedbackById(safeId);
      setSelectedFeedback(detail);
      setDetailOpen(true);

      try {
        await markRecordNotificationsSeen('feedback', safeId);
      } catch {
        // Keep modal opening responsive even if notification status update fails.
      }
    } catch (error) {
      setNotification({
        open: true,
        message: error?.response?.data?.error || 'Failed to load feedback details',
        severity: 'error',
      });
    }
  }, [markRecordNotificationsSeen]);

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const focusFeedbackId = Number(params.get('focusFeedbackId') || params.get('notification_source_id') || 0);

    if (!focusFeedbackId) return;

    const focusKey = `${location.pathname}:${focusFeedbackId}`;
    if (handledFocusRef.current === focusKey) return;
    handledFocusRef.current = focusKey;

    openDetail(focusFeedbackId);

    params.delete('focusFeedbackId');
    params.delete('notification_source_id');
    const nextQuery = params.toString();
    const nextUrl = `${location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
    navigate(nextUrl, { replace: true });
  }, [location.search, location.pathname, navigate, openDetail]);

  const feedback = selectedFeedback?.feedback || {};

  return (
    <div className="leads-table-container hs-listing-page">
      <HubSpotListing
        title="Order feedback"
        rows={feedbacks.map((row) => ({ ...row, recommendation: row.would_recommend ? 'Yes' : 'No' }))}
        initialFields={[
          { key: 'work_order_number', label: 'Work order' }, { key: 'customer_name', label: 'Customer' },
          { key: 'customer_email', label: 'Email' }, { key: 'customer_phone', label: 'Phone' },
          { key: 'overall_rating', label: 'Rating' }, { key: 'recommendation', label: 'Recommend', options: ['Yes', 'No'] },
          { key: 'submitted_at', label: 'Submitted' },
        ]}
        onRowOpen={(row) => openDetail(row.id)}
        onRefresh={loadFeedbacks}
        renderValue={(field, value, row) => {
          if (field === 'work_order_number') {
            const unread = getUnreadNotificationFor('feedback', row.id);
            const action = String(unread?.action || '').toLowerCase();
            const label = unread ? (/(create|new|added)/.test(action) ? 'NEW' : 'UPDATED') : '';
            return <span className="hs-listing__value-with-badge">{value || '—'}{label && <Chip label={label} size="small" color={label === 'NEW' ? 'error' : 'warning'} />}</span>;
          }
          if (field === 'overall_rating') return value ? <Chip size="small" color={ratingChipColor(value)} label={`${value}/5`} /> : '—';
          if (field === 'recommendation') return value;
          if (field === 'submitted_at') return formatDate(value) || '—';
          return value ?? '—';
        }}
      />

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>
          Feedback {selectedFeedback?.work_order_number ? `- ${selectedFeedback.work_order_number}` : ''}
        </DialogTitle>
        <DialogContent>
          {selectedFeedback ? (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}><Typography><strong>Customer:</strong> {selectedFeedback.customer_name || '-'}</Typography></Grid>
              <Grid item xs={12} md={6}><Typography><strong>Email:</strong> {selectedFeedback.customer_email || '-'}</Typography></Grid>
              <Grid item xs={12} md={6}><Typography><strong>Phone:</strong> {selectedFeedback.customer_phone || '-'}</Typography></Grid>
              <Grid item xs={12} md={6}><Typography><strong>Submitted:</strong> {formatDate(selectedFeedback.submitted_at) || '-'}</Typography></Grid>
              <Grid item xs={12} md={6}><Typography><strong>Scheduled:</strong> {formatDate(selectedFeedback.scheduled_for) || '-'}</Typography></Grid>
              <Grid item xs={12} md={6}><Typography><strong>Sent:</strong> {formatDate(selectedFeedback.sent_at) || '-'}</Typography></Grid>
              <Grid item xs={12} md={6}><Typography><strong>Recommend:</strong> {feedback.would_recommend ? 'Yes' : 'No'}</Typography></Grid>

              <Grid item xs={12}><Typography variant="subtitle2" sx={{ mt: 1 }}>Ratings</Typography></Grid>
              <Grid item xs={12} md={6}>{renderStars('Overall', feedback.overall_rating)}</Grid>
              <Grid item xs={12} md={6}>{renderStars('Food', feedback.food_quality_rating)}</Grid>
              <Grid item xs={12} md={6}>{renderStars('Service', feedback.service_rating)}</Grid>
              <Grid item xs={12} md={6}>{renderStars('Delivery', feedback.delivery_rating)}</Grid>
              <Grid item xs={12} md={6}>{renderStars('Packaging', feedback.packaging_rating)}</Grid>

              <Grid item xs={12}><Typography variant="subtitle2" sx={{ mt: 1 }}>Comments</Typography></Grid>
              <Grid item xs={12}><Typography><strong>Items:</strong> {feedback.item_feedback || '-'}</Typography></Grid>
              <Grid item xs={12}><Typography><strong>Service:</strong> {feedback.service_feedback || '-'}</Typography></Grid>
              <Grid item xs={12}><Typography><strong>Delivery:</strong> {feedback.delivery_feedback || '-'}</Typography></Grid>
              <Grid item xs={12}><Typography><strong>Additional:</strong> {feedback.additional_comments || '-'}</Typography></Grid>

              <Grid item xs={12}><Typography variant="subtitle2" sx={{ mt: 1 }}>Ordered Items</Typography></Grid>
              <Grid item xs={12}>
                {(selectedFeedback.items || []).length ? (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {selectedFeedback.items.map((item, idx) => (
                      <li key={`${item.product_name}-${idx}`}>
                        {item.product_name} ({toWholeQtyLabel(item.quantity)})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Typography>-</Typography>
                )}
              </Grid>
            </Grid>
          ) : null}
        </DialogContent>
      </Dialog>

      <NotificationSnackbar
        {...notification}
        onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}

export default OrderFeedbacks;
