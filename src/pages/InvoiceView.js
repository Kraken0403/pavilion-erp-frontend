import React, { useCallback, useEffect, useState } from "react";
import DOMPurify from 'dompurify';
import { useParams } from "react-router-dom";
import { Box, Chip, Divider, Grid, Typography, Menu, MenuItem, IconButton, ListItemIcon } from "@mui/material";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ShareIcon from '@mui/icons-material/Share';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import Topbar from "../components/Topbar";
import NotificationSnackbar from "../components/ui/NotificationSnackbar";
import PageLoader from "../components/ui/PageLoader";
import ChannelSelectModal from "../components/ui/ChannelSelectModal";

import {
  getInvoiceById,
  downloadInvoicePdf,
} from "../services/invoiceService";
import { sendInvoiceEmail, sendInvoiceWhatsApp } from "../services/invoiceService";
import StatusUpdateModal from "../components/invoices/StatusUpdateModal";
import { formatDate as formatLocalDate } from "../utils/dateFormatter";
import { formatStatusLabel } from "../utils/statusFormatter";
import { formatQty, formatMoney as fm } from '../utils/formatters'

import "../assets/styles/LeadsTable.scss";
import "../assets/styles/QuotationDetail.scss";

const statusColors = {
  draft: "default",
  issued: "primary",
  "part-payment": "warning",
  paid: "success",
  cancelled: "error",
};

function InvoiceView() {
  const { id } = useParams();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [actionsAnchor, setActionsAnchor] = useState(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusModalInvoiceId, setStatusModalInvoiceId] = useState(null);
  

  /* ================= FETCH ================= */

  const loadInvoice = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getInvoiceById(id);
      setInvoice(data);
    } catch {
      setNotification({
        open: true,
        message: "❌ Failed to load invoice.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  const formatMoney = (value) => fm(value)

  const getShareSubtitle = () => {
    const items = invoice?.items || []
    if (!items.length) return ''
    const visible = items.slice(0, 5)
    const parts = visible.map(i => {
      const qtyDisplay = formatQty(i.quantity)
      return `${i.description} x${qtyDisplay} · ${fm(i.line_total || i.lineTotal || 0)}`
    })
    const more = items.length > 5 ? ` · +${items.length - 5} more` : ''
    return parts.join(' · ') + more
  }

  const customerName = [invoice?.first_name, invoice?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim() || "—";

  const customerEmail =
    invoice?.lead?.email ||
    invoice?.billing_snapshot?.email ||
    "—";

  const customerPhone =
    invoice?.lead?.phone ||
    invoice?.billing_snapshot?.phone ||
    "—";

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  /* ================= PDF ================= */

  const handleExportPdf = async () => {
    try {
      await downloadInvoicePdf(id);
    } catch {
      setNotification({
        open: true,
        message: "❌ PDF download failed.",
        severity: "error",
      });
    }
  };

  const handleSendInvoiceChannels = async ({ sendEmail = true, sendWhatsApp = false } = {}) => {
    try {
      if (sendEmail) await sendInvoiceEmail(id);
      if (sendWhatsApp) await sendInvoiceWhatsApp(id);
      setNotification({ open: true, message: '📩 Notification sent', severity: 'success' });
    } catch (err) {
      setNotification({ open: true, message: '❌ Failed to send notification', severity: 'error' });
    } finally {
      setChannelModalOpen(false);
    }
  };

  const openActionsMenu = (e) => setActionsAnchor(e.currentTarget);
  const closeActionsMenu = () => setActionsAnchor(null);

  const handleGenerateReceipt = (e) => {
    e.stopPropagation?.();
    setStatusModalInvoiceId(id);
    setStatusModalOpen(true);
    closeActionsMenu();
  }

  const handleShareFromActions = (e) => {
    e.stopPropagation?.();
    setChannelModalOpen(true);
    closeActionsMenu();
  }

  /* ================= UI ================= */

  return (
    <div className="quotation-detail-container">
      <Topbar />

      {loading ? (
        <div className="quotation-card">
          <PageLoader message="Loading invoice details..." minHeight={220} />
        </div>
      ) : !invoice ? (
        <div className="quotation-card" style={{ padding: "60px 0", textAlign: "center" }}>
          <Typography variant="h6">No invoice found</Typography>
        </div>
      ) : (
        <>
          <div className="quotation-header">
            <div className="quotation-head">
              <div className="qh-content">
                <h2>Invoice #{invoice.invoice_number}</h2>
              </div>
              <div className="quotation-meta">
                <span>Issue Date: {formatLocalDate(invoice.issue_date) || "—"}</span>
                <span className="chip">
                  <span>{formatStatusLabel(invoice.status)}</span>
                </span>
              </div>
            </div>

            <div className="quotation-actions">
              <Chip
                label={formatStatusLabel(invoice.status)}
                color={statusColors[invoice.status] || "default"}
                size="small"
              />

              <button
                className="secondary-btn"
                onClick={handleExportPdf}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <PictureAsPdfOutlinedIcon fontSize="small" />
                Export PDF
              </button>

              <div>
                <IconButton size="small" onClick={openActionsMenu}>
                  <MoreVertIcon />
                </IconButton>
                <Menu
                  anchorEl={actionsAnchor}
                  open={Boolean(actionsAnchor)}
                  onClose={closeActionsMenu}
                >
                  <MenuItem onClick={handleGenerateReceipt}>
                    <ListItemIcon>
                      <AddCircleOutlineIcon fontSize="small" />
                    </ListItemIcon>
                    Generate Receipt
                  </MenuItem>
                  <MenuItem onClick={handleShareFromActions}>
                    <ListItemIcon>
                      <ShareIcon fontSize="small" />
                    </ListItemIcon>
                    Share Invoice
                  </MenuItem>
                </Menu>
              </div>
            </div>
          </div>

          <div className="quotation-card">
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Customer Details
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>Customer</Typography>
                <Typography variant="body1">{customerName}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>Issue Date</Typography>
                <Typography variant="body1">{formatLocalDate(invoice.issue_date) || "—"}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>Due Date</Typography>
                <Typography variant="body1">{formatLocalDate(invoice.due_date) || "—"}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>Email</Typography>
                <Typography variant="body1">{customerEmail}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>Phone</Typography>
                <Typography variant="body1">{customerPhone}</Typography>
              </Grid>
            </Grid>
          </div>

          <div className="quotation-card table-container">
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Invoice Items
            </Typography>
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>GST %</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>
                {(invoice.items || []).length ? invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(String(item.description || '')) }} />
                    <td>{formatQty(item.quantity)}</td>
                    <td>
                      {formatMoney(item.unit_price)}
                    </td>
                    <td>{item.gst_rate}%</td>
                    <td>
                      {formatMoney(item.line_total)}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center" }}>No items found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="quotation-card">
            <Box sx={{ maxWidth: 360, ml: "auto" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                <Typography variant="body2">{formatMoney(invoice.display_taxable_subtotal ?? invoice.subtotal)}</Typography>
              </Box>
              {Number(invoice._computed_discount || 0) > 0 && (
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Discount{invoice.discount_percent ? ` (${invoice.discount_percent}%)` : ''}</Typography>
                  <Typography variant="body2">-{formatMoney(invoice._computed_discount)}</Typography>
                </Box>
              )}
              {Number(invoice.cgst_total || 0) > 0 && (
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">CGST</Typography>
                  <Typography variant="body2">{formatMoney(invoice.cgst_total)}</Typography>
                </Box>
              )}

              {Number(invoice.sgst_total || 0) > 0 && (
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">SGST</Typography>
                  <Typography variant="body2">{formatMoney(invoice.sgst_total)}</Typography>
                </Box>
              )}

              {Number(invoice.igst_total || 0) > 0 && (
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">IGST</Typography>
                  <Typography variant="body2">{formatMoney(invoice.igst_total)}</Typography>
                </Box>
              )}

              <Divider sx={{ mb: 1.5 }} />

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Grand Total</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{formatMoney(invoice.grand_total)}</Typography>
              </Box>
            </Box>
          </div>
        </>
      )}

      <NotificationSnackbar
        {...notification}
        onClose={() =>
          setNotification((prev) => ({ ...prev, open: false }))
        }
      />

      <ChannelSelectModal
        open={channelModalOpen}
        onClose={() => setChannelModalOpen(false)}
        title={`Share Invoice ${invoice?.invoice_number || ''} with ${customerName}`}
        subtitle={getShareSubtitle()}
        defaultEmail
        defaultWhatsApp={false}
        confirmLabel="Share Invoice"
        onConfirm={handleSendInvoiceChannels}
      />

      <StatusUpdateModal
        open={statusModalOpen}
        invoiceId={statusModalInvoiceId}
        onClose={() => setStatusModalOpen(false)}
        onSuccess={(msg) => {
          setNotification({ open: true, message: msg || 'Success', severity: 'success' });
          setStatusModalOpen(false);
          loadInvoice();
        }}
        onError={(msg) => setNotification({ open: true, message: msg || 'Action failed', severity: 'error' })}
      />
    </div>
  );
}

export default InvoiceView;