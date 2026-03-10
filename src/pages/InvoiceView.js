import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Chip, Divider, Grid, Typography } from "@mui/material";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import Topbar from "../components/Topbar";
import NotificationSnackbar from "../components/ui/NotificationSnackbar";
import PageLoader from "../components/ui/PageLoader";

import {
  getInvoiceById,
  downloadInvoicePdf,
} from "../services/invoiceService";
import { formatDate as formatLocalDate } from "../utils/dateFormatter";
import { formatStatusLabel } from "../utils/statusFormatter";

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

  const formatMoney = (value) => `₹ ${Number(value || 0).toFixed(2)}`;

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
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
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
                <Typography variant="body2">{formatMoney(invoice.subtotal)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="body2" color="text.secondary">CGST</Typography>
                <Typography variant="body2">{formatMoney(invoice.cgst_total)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="body2" color="text.secondary">SGST</Typography>
                <Typography variant="body2">{formatMoney(invoice.sgst_total)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="body2" color="text.secondary">IGST</Typography>
                <Typography variant="body2">{formatMoney(invoice.igst_total)}</Typography>
              </Box>

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
    </div>
  );
}

export default InvoiceView;