import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Chip, CircularProgress } from "@mui/material";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import Topbar from "../components/Topbar";
import NotificationSnackbar from "../components/ui/NotificationSnackbar";

import {
  getInvoiceById,
  downloadInvoicePdf,
} from "../services/invoiceService";
import { formatDate as formatLocalDate } from "../utils/dateFormatter";
import { formatStatusLabel } from "../utils/statusFormatter";

import "../assets/styles/LeadsTable.scss";

const statusColors = {
  draft: "default",
  issued: "primary",
  "part-payment": "warning",
  paid: "success",
  cancelled: "error",
};

function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  /* ================= FETCH ================= */

  const loadInvoice = async () => {
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
  };

  useEffect(() => {
    loadInvoice();
  }, [id]);

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
    <div className="leads-table-container">
      <Topbar />

      {loading ? (
        <div style={{ padding: "60px 0", textAlign: "center" }}>
          <CircularProgress />
        </div>
      ) : !invoice ? (
        <div style={{ padding: "60px 0", textAlign: "center" }}>
          No invoice found
        </div>
      ) : (
        <>
          {/* HEADER */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <div>
              <h2 style={{ marginBottom: "6px" }}>
                Invoice #{invoice.invoice_number}
              </h2>

              <Chip
                label={formatStatusLabel(invoice.status)}
                color={statusColors[invoice.status] || "default"}
                size="small"
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
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


          {/* CUSTOMER DETAILS */}
          <div
            className="table-container"
            style={{ marginBottom: "25px" }}
          >
            <table className="leads-table">
              <tbody>
                <tr>
                  <th>Customer</th>
                  <td>
                    {invoice.first_name && invoice.last_name
                      ? `${invoice.first_name} ${invoice.last_name}`
                      : "—"}
                  </td>
                </tr>

                <tr>
                  <th>Issue Date</th>
                  <td>{formatLocalDate(invoice.issue_date) || '—'}</td>
                </tr>

                <tr>
                  <th>Email</th>
                  <td>
                    {invoice.lead?.email ||
                      invoice.billing_snapshot?.email ||
                      "—"}
                  </td>
                </tr>

                <tr>
                  <th>Phone</th>
                  <td>
                    {invoice.lead?.phone ||
                      invoice.billing_snapshot?.phone ||
                      "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ITEMS TABLE */}
          <div className="table-container">
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
                {invoice.items?.map((item) => (
                  <tr key={item.id}>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>
                      ₹ {Number(item.unit_price || 0).toFixed(2)}
                    </td>
                    <td>{item.gst_rate}%</td>
                    <td>
                      ₹ {Number(item.line_total || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* TOTAL SECTION */}
          <div
            style={{
              marginTop: "25px",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{
                minWidth: "280px",
                padding: "20px",
                border: "1px solid #eee",
                borderRadius: "6px",
                background: "#fafafa",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                }}
              >
                <span>Subtotal</span>
                <span>
                  ₹ {Number(invoice.subtotal || 0).toFixed(2)}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 600,
                  fontSize: "16px",
                  borderTop: "1px solid #ddd",
                  paddingTop: "10px",
                }}
              >
                <span>Grand Total</span>
                <span>
                  ₹ {Number(invoice.grand_total || 0).toFixed(2)}
                </span>
              </div>
            </div>
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