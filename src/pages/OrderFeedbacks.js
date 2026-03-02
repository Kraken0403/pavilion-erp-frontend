import React, { useEffect, useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Topbar from '../components/Topbar';
import NotificationSnackbar from '../components/ui/NotificationSnackbar';
import { fetchOrderFeedbackById, fetchOrderFeedbacks } from '../services/orderFeedbackService';
import { formatDate } from '../utils/dateFormatter';
import '../assets/styles/LeadsTable.scss';

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
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info',
  });

  const loadFeedbacks = async () => {
    try {
      setLoading(true);
      const data = await fetchOrderFeedbacks({ search });
      setFeedbacks(Array.isArray(data?.feedbacks) ? data.feedbacks : []);
    } catch (error) {
      setNotification({
        open: true,
        message: error?.response?.data?.error || 'Failed to load feedback responses',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    await loadFeedbacks();
  };

  const openDetail = async (id) => {
    try {
      const detail = await fetchOrderFeedbackById(id);
      setSelectedFeedback(detail);
      setDetailOpen(true);
    } catch (error) {
      setNotification({
        open: true,
        message: error?.response?.data?.error || 'Failed to load feedback details',
        severity: 'error',
      });
    }
  };

  const feedback = selectedFeedback?.feedback || {};

  return (
    <div className="leads-table-container">
      <Topbar />

      <Box sx={{ px: 1, pb: 2 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <TextField
            size="small"
            placeholder="Search by order/customer/email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 320 }}
          />
          <button className="secondary-btn" type="submit">Search</button>
        </form>

        {loading ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <div className="table-container">
            <table className="leads-table">
              <thead>
                <tr>
                  <th>WORK ORDER</th>
                  <th>CUSTOMER</th>
                  <th>EMAIL</th>
                  <th>PHONE</th>
                  <th>RATING</th>
                  <th>RECOMMEND</th>
                  <th>SUBMITTED</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.length ? feedbacks.map((row) => (
                  <tr key={row.id}>
                    <td>{row.work_order_number || '-'}</td>
                    <td>{row.customer_name || '-'}</td>
                    <td>{row.customer_email || '-'}</td>
                    <td>{row.customer_phone || '-'}</td>
                    <td>
                      {row.overall_rating ? (
                        <Chip
                          size="small"
                          color={ratingChipColor(row.overall_rating)}
                          label={`${row.overall_rating}/5`}
                        />
                      ) : '-'}
                    </td>
                    <td>
                      <Chip
                        size="small"
                        color={row.would_recommend ? 'success' : 'default'}
                        label={row.would_recommend ? 'Yes' : 'No'}
                      />
                    </td>
                    <td>{formatDate(row.submitted_at) || '-'}</td>
                    <td>
                      <button className="secondary-btn" onClick={() => openDetail(row.id)}>
                        View
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center' }}>No feedback submitted yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Box>

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
