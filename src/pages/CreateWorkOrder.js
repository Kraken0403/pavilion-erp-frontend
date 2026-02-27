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
  FormControl,
  InputLabel,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Autocomplete
} from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';

import Topbar from "../components/Topbar";
import NotificationSnackbar from "../components/ui/NotificationSnackbar";

import {
  fetchApprovedQuotations,
  fetchQuotationById,
} from "../services/quotationService";

import { createWorkOrderFromQuotation, createManualWorkOrder } from "../services/workOrderServices";
import { fetchAllProducts } from "../services/productServices";

import { useNavigate } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";

export default function CreateWorkOrder() {
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [creationMode, setCreationMode] = useState("manual"); // "manual" or "quotation"
  const [quotations, setQuotations] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedQuotationId, setSelectedQuotationId] = useState("");

  // Manual WO fields
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCompany, setCustomerCompany] = useState("");
  const [customerGst, setCustomerGst] = useState("");
  const [mode, setMode] = useState("GENERAL");
  const [pax, setPax] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([]);

  const [notif, setNotif] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const notify = (message, severity = "success") =>
    setNotif({ open: true, message, severity });

  // -------------------- LOAD APPROVED QUOTATIONS & PRODUCTS --------------------
  useEffect(() => {
    (async () => {
      try {
        const [quotationsData, productsData] = await Promise.all([
          fetchApprovedQuotations(),
          fetchAllProducts()
        ]);
        setQuotations(quotationsData);
        setProducts(Array.isArray(productsData) ? productsData : productsData?.data || []);
      } catch (err) {
        notify("❌ Failed to load data", "error");
      }
    })();
  }, []);

  // -------------------- LOAD SELECTED QUOTATION --------------------
  const loadQuotationDetails = async (id) => {
    if (!id) return;
    try {
      const q = await fetchQuotationById(id);
      const fullName = `${q.first_name || ''} ${q.last_name || ''}`.trim();
      setCustomerName(fullName || q.lead_name || '');
      setCustomerEmail(q.email || '');
      setCustomerPhone(q.phone_number || '');
      setCustomerCompany(q.company_name || '');
      setCustomerGst(q.gst_number || '');
      setMode(q.quotation_mode || "GENERAL");
      setPax(q.pax || "");
      setEventName(q.event_name || "");
      setEventDate(q.event_date || "");
      setEventTime(q.event_time || "");
      setEventLocation(q.event_location || "");
      setNotes(q.notes || "");

      const mappedItems = Array.isArray(q.items)
        ? q.items.map((it) => ({
            product_id: it.product_id,
            product_name: it.product_name,
            quantity: it.quantity || 0,
            unit_price: it.selling_price || 0,
            discount: it.discount || 0,
            tax: it.tax || 0,
          }))
        : [];

      setItems(mappedItems);
    } catch (err) {
      notify("❌ Failed to load quotation details", "error");
    }
  };

  const handleQuotationSelect = (id) => {
    setSelectedQuotationId(id);
    loadQuotationDetails(id);
  };

  // -------------------- ITEM HELPERS --------------------
  const addItem = () => {
    setItems([
      ...items,
      {
        product_id: null,
        product_name: "",
        quantity: 1,
        unit_price: 0,
        discount: 0,
        tax: 0,
      },
    ]);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index, product) => {
    if (!product) return;
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      product_id: product.id,
      product_name: product.name,
      unit_price: product.sell_price || 0,
    };
    setItems(newItems);
  };

  // -------------------- CALCULATE TOTAL --------------------
  const total = items.reduce((sum, i) => {
    const qty = Number(i.quantity) || 0;
    const price = Number(i.unit_price) || 0;
    const discount = Number(i.discount) || 0;
    const tax = Number(i.tax) || 0;
    return sum + (qty * price - discount + tax);
  }, 0);

  // -------------------- SUBMIT FORM --------------------
  const handleSubmit = async () => {
    if (creationMode === "quotation") {
      if (!selectedQuotationId) {
        return notify("⚠️ Please select a quotation", "warning");
      }

      try {
        const res = await createWorkOrderFromQuotation(selectedQuotationId);
        notify("✅ Work Order Created from Quotation!");
        navigate(`/workorders/${res.work_order_id}`);
      } catch (err) {
        notify(err?.response?.data?.error || "❌ Failed to create Work Order", "error");
        console.error(err);
      }
    } else {
      if (!customerName || items.length === 0) {
        return notify("⚠️ Customer name and items are required", "warning");
      }

      try {
        const payload = {
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          customer_company: customerCompany,
          customer_gst: customerGst,
          mode,
          pax: pax || null,
          event_name: eventName,
          event_date: eventDate,
          event_time: eventTime,
          event_location: eventLocation,
          notes,
          items: items.map(item => ({
            product_id: item.product_id || null,
            product_name: item.product_name,
            quantity: Number(item.quantity) || 0,
            unit_price: Number(item.unit_price) || 0,
            discount: Number(item.discount) || 0,
            tax: Number(item.tax) || 0
          }))
        };

        const res = await createManualWorkOrder(payload);
        notify("✅ Manual Work Order Created!");
        navigate(`/workorders/${res.work_order_id}`);
      } catch (err) {
        notify(err?.response?.data?.error || "❌ Failed to create Work Order", "error");
        console.error(err);
      }
    }
  };

  return (
    <>
      <Topbar />

      <Box mt={4} mx="auto" maxWidth="1200px" px={3}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            Create Work Order
          </Typography>

          {/* ---------------- MODE TOGGLE ---------------- */}
          <Box sx={{ mt: 2, mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Creation Mode
            </Typography>
            <ToggleButtonGroup
              value={creationMode}
              exclusive
              onChange={(e, val) => {
val && setCreationMode(val);
              }}
              size="small"
            >
              <ToggleButton value="manual">Manual Entry</ToggleButton>
              <ToggleButton value="quotation">From Quotation</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* ---------------- QUOTATION MODE ---------------- */}
          {creationMode === "quotation" && (
            <>
              <Typography variant="subtitle1" sx={{ mt: 2 }}>
                Select Approved Quotation
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
                    {q.quotation_number} — {q.lead_name || q.first_name + ' ' + q.last_name}
                  </MenuItem>
                ))}
              </Select>
            </>
          )}

          {/* ---------------- CUSTOMER INFO (Always visible in manual mode) ---------------- */}
          {(creationMode === "manual" || selectedQuotationId) && (
            <>
              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                Customer Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Customer Name *"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    fullWidth
                    disabled={creationMode === "quotation"}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    fullWidth
                    disabled={creationMode === "quotation"}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Phone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    fullWidth
                    disabled={creationMode === "quotation"}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Company"
                    value={customerCompany}
                    onChange={(e) => setCustomerCompany(e.target.value)}
                    fullWidth
                    disabled={creationMode === "quotation"}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="GST Number"
                    value={customerGst}
                    onChange={(e) => setCustomerGst(e.target.value)}
                    fullWidth
                    disabled={creationMode === "quotation"}
                  />
                </Grid>
              </Grid>

              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                Work Order Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Mode</InputLabel>
                    <Select
                      value={mode}
                      label="Mode"
                      onChange={(e) => setMode(e.target.value)}
                      disabled={creationMode === "quotation"}
                    >
                      <MenuItem value="GENERAL">General</MenuItem>
                      {settings?.business_type === 'CATERING' && (
                        <MenuItem value="CATERING">Catering</MenuItem>
                      )}
                    </Select>
                  </FormControl>
                </Grid>

                {mode === "CATERING" && (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="PAX"
                        type="number"
                        value={pax}
                        onChange={(e) => setPax(e.target.value)}
                        fullWidth
                        disabled={creationMode === "quotation"}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Event Name"
                        value={eventName}
                        onChange={(e) => setEventName(e.target.value)}
                        fullWidth
                        disabled={creationMode === "quotation"}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        label="Event Date"
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        disabled={creationMode === "quotation"}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        label="Event Time"
                        type="time"
                        value={eventTime}
                        onChange={(e) => setEventTime(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        disabled={creationMode === "quotation"}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Event Location"
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        fullWidth
                        disabled={creationMode === "quotation"}
                      />
                    </Grid>
                  </>
                )}

                <Grid item xs={12}>
                  <TextField
                    label="Notes"
                    multiline
                    minRows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    fullWidth
                    disabled={creationMode === "quotation"}
                  />
                </Grid>
              </Grid>
            </>
          )}
        </Paper>

        {/* ---------------- ITEMS SECTION ---------------- */}
        {(creationMode === "manual" || selectedQuotationId) && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Work Order Items
              </Typography>
              {creationMode === "manual" && (
                <Button variant="outlined" onClick={addItem}>
                  Add Item
                </Button>
              )}
            </Box>

            {items.length === 0 ? (
              <Typography color="textSecondary">No items added yet</Typography>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Unit Price</TableCell>
                    <TableCell align="right">Discount</TableCell>
                    <TableCell align="right">Tax</TableCell>
                    <TableCell align="right">Line Total</TableCell>
                    {creationMode === "manual" && <TableCell></TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item, index) => {
                    const lineTotal =
                      (Number(item.quantity) || 0) * (Number(item.unit_price) || 0) -
                      (Number(item.discount) || 0) +
                      (Number(item.tax) || 0);

                    return (
                      <TableRow key={index}>
                        <TableCell>
                          {creationMode === "manual" ? (
                            <Autocomplete
                              options={products}
                              getOptionLabel={(option) => option.name || ''}
                              value={products.find(p => p.id === item.product_id) || null}
                              onChange={(e, val) => handleProductSelect(index, val)}
                              renderInput={(params) => (
                                <TextField {...params} placeholder="Select product" size="small" />
                              )}
                              sx={{ minWidth: 200 }}
                            />
                          ) : (
                            item.product_name
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {creationMode === "manual" ? (
                            <TextField
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                              size="small"
                              sx={{ width: 100 }}
                            />
                          ) : (
                            item.quantity
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {creationMode === "manual" ? (
                            <TextField
                              type="number"
                              value={item.unit_price}
                              onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                              size="small"
                              sx={{ width: 120 }}
                            />
                          ) : (
                            `${settings?.currency_symbol || '₹'}${item.unit_price}`
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {creationMode === "manual" ? (
                            <TextField
                              type="number"
                              value={item.discount}
                              onChange={(e) => updateItem(index, 'discount', e.target.value)}
                              size="small"
                              sx={{ width: 100 }}
                            />
                          ) : (
                            `${settings?.currency_symbol || '₹'}${item.discount}`
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {creationMode === "manual" ? (
                            <TextField
                              type="number"
                              value={item.tax}
                              onChange={(e) => updateItem(index, 'tax', e.target.value)}
                              size="small"
                              sx={{ width: 100 }}
                            />
                          ) : (
                            `${settings?.currency_symbol || '₹'}${item.tax}`
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={600}>
                            {settings?.currency_symbol || '₹'}{lineTotal.toFixed(2)}
                          </Typography>
                        </TableCell>
                        {creationMode === "manual" && (
                          <TableCell>
                            <IconButton size="small" color="error" onClick={() => removeItem(index)}>
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  <TableRow>
                    <TableCell colSpan={5} align="right">
                      <Typography variant="h6">Total:</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="h6" color="primary">
                        {settings?.currency_symbol || '₹'}{total.toFixed(2)}
                      </Typography>
                    </TableCell>
                    {creationMode === "manual" && <TableCell></TableCell>}
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </Paper>
        )}

        {/* ---------------- SUBMIT ---------------- */}
        {(creationMode === "manual" || selectedQuotationId) && (
          <Button
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            onClick={handleSubmit}
            disabled={items.length === 0}
          >
            Create Work Order
          </Button>
        )}
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
