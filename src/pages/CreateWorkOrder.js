// src/pages/CreateWorkOrder.js
import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  MenuItem,
  Select,
} from "@mui/material";

import Topbar from "../components/Topbar";
import NotificationSnackbar from "../components/ui/NotificationSnackbar";

import {
  fetchApprovedQuotations,
  fetchQuotationById,
} from "../services/quotationService";

import { createWorkOrder } from "../services/workOrderServices";

import { useNavigate } from "react-router-dom";

export default function CreateWorkOrder() {
  const navigate = useNavigate();

  const [quotations, setQuotations] = useState([]);
  const [selectedQuotationId, setSelectedQuotationId] = useState("");

  const [woDate, setWoDate] = useState(() =>
    new Date().toISOString().substring(0, 10)
  );
  const [assignedTo, setAssignedTo] = useState("");
  const [siteName, setSiteName] = useState("");
  const [notes, setNotes] = useState("");

  const [quotationData, setQuotationData] = useState(null);
  const [items, setItems] = useState([]);

  const [notif, setNotif] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const notify = (message, severity = "success") =>
    setNotif({ open: true, message, severity });

  // -------------------- LOAD APPROVED QUOTATIONS --------------------
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchApprovedQuotations();
        setQuotations(data);
      } catch (err) {
        notify("❌ Failed to load quotations", "error");
      }
    })();
  }, []);

  // -------------------- LOAD SELECTED QUOTATION --------------------
  const loadQuotationDetails = async (id) => {
    try {
      const q = await fetchQuotationById(id);

      setQuotationData(q);

      setItems(
        q.items.map((it) => ({
          product_id: it.product_id,
          product_name: it.product_name,
          quantity: it.quantity,
          unit_price: it.unit_price,
          discount: it.discount,
          tax: it.tax,
          line_total: it.line_total,
        }))
      );

      setSiteName(q.company_name || "");
    } catch (err) {
      notify("❌ Failed to load quotation details", "error");
    }
  };

  const handleQuotationSelect = (id) => {
    setSelectedQuotationId(id);
    loadQuotationDetails(id);
  };

  // -------------------- CALCULATE TOTAL --------------------
  const total = items.reduce((sum, i) => sum + (i.line_total || 0), 0);

  // -------------------- SUBMIT FORM --------------------
  const handleSubmit = async () => {
    if (!woDate || !siteName) {
      return notify("⚠️ Please fill all required fields", "warning");
    }

    try {
      const payload = {
        quotation_id: selectedQuotationId || null,
        issue_date: woDate,
        assigned_to: assignedTo || null,
        site_name: siteName,
        customer_name: quotationData?.lead_name || "",
        notes,
        items,
      };

      const res = await createWorkOrder(payload);

      notify("✅ Work Order Created!");
      navigate(`/workorders/${res.id}`);
    } catch (err) {
      notify("❌ Failed to create Work Order", "error");
      console.error(err);
    }
  };

  return (
    <>
      <Topbar />

      <Box mt={4} mx="auto" maxWidth="900px">
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            Create Work Order
          </Typography>

          {/* ---------------- SELECT QUOTATION ---------------- */}
          <Typography variant="subtitle1" sx={{ mt: 2 }}>
            Select Quotation (approved)
          </Typography>
          <Select
            fullWidth
            value={selectedQuotationId}
            onChange={(e) => handleQuotationSelect(e.target.value)}
            displayEmpty
          >
            <MenuItem value="" disabled>
              Select approved quotation
            </MenuItem>
            {quotations.map((q) => (
              <MenuItem key={q.id} value={q.id}>
                {q.quotation_number} — {q.lead_name}
              </MenuItem>
            ))}
          </Select>

          {/* ---------------- WORK ORDER FIELDS ---------------- */}
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} md={4}>
              <TextField
                label="Work Order Date"
                type="date"
                value={woDate}
                onChange={(e) => setWoDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={8}>
              <TextField
                label="Assign to Employee"
                placeholder="Employee name"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Site Name"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <label className="field-label">Notes</label>
              <WgiymEditor value={notes || ''} onChange={setNotes} />
            </Grid>
          </Grid>
        </Paper>

        {/* ---------------- ITEMS PREVIEW ---------------- */}
        {items.length > 0 && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Work Order Items
            </Typography>

            {items.map((i, idx) => (
              <Box
                key={idx}
                sx={{ p: 2, mb: 2, border: "1px solid #ddd", borderRadius: 2 }}
              >
                <Typography>
                  <strong>{i.product_name}</strong>
                </Typography>
                <Typography>Qty: {i.quantity}</Typography>
                <Typography>Unit Price: ₹{i.unit_price}</Typography>
                <Typography>Discount: ₹{i.discount}</Typography>
                <Typography>Tax: ₹{i.tax}</Typography>
                <Typography>
                  <strong>Line Total: ₹{i.line_total}</strong>
                </Typography>
              </Box>
            ))}

            <Typography variant="h6" align="right">
              Total: ₹{total.toFixed(2)}
            </Typography>
          </Paper>
        )}

        {/* ---------------- SUBMIT ---------------- */}
        <Button
          variant="contained"
          color="primary"
          fullWidth
          size="large"
          onClick={handleSubmit}
        >
          Create Work Order
        </Button>
      </Box>

      {/* Notifications */}
      <NotificationSnackbar
        open={notif.open}
        message={notif.message}
        severity={notif.severity}
        onClose={() => setNotif({ ...notif, open: false })}
      />
    </>
  );
}
