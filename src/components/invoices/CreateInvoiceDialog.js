import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Grid,
  IconButton,
  Button,
  MenuItem,
  Box
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import { createInvoice } from "../../services/invoiceService";
import { fetchLeads } from "../../services/leadService";

import "../../assets/styles/AddProductDialog.scss";

function CreateInvoiceDialog({ open, onClose, onSuccess }) {
  const [leads, setLeads] = useState([]);
  const [leadId, setLeadId] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState([
    {
      description: "",
      quantity: 1,
      unit_price: 0,
      gst_rate: 18,
    },
  ]);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    (async () => {
      const data = await fetchLeads();
      setLeads(Array.isArray(data) ? data : []);
    })();
  }, [open]);

  const addItem = () => {
    setItems(prev => [
      ...prev,
      { description: "", quantity: 1, unit_price: 0, gst_rate: 18 },
    ]);
  };

  const removeItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const copy = [...items];
    copy[index][field] = value;
    setItems(copy);
  };

  const handleSave = async () => {
    if (!leadId) {
      alert("Lead is required");
      return;
    }

    setSubmitting(true);

    try {
      await createInvoice({
        lead_id: leadId,
        source_type: "MANUAL",
        issue_date: issueDate || null,
        due_date: dueDate || null,
        notes,
        items,
      });

      onSuccess();
      handleClose();
    } catch (err) {
      console.error(err);
    }

    setSubmitting(false);
  };

  const handleClose = () => {
    setLeadId("");
    setIssueDate("");
    setDueDate("");
    setNotes("");
    setItems([{ description: "", quantity: 1, unit_price: 0, gst_rate: 18 }]);
    onClose();
  };

  return (
    <Dialog open={open} maxWidth="md" fullWidth>
      <DialogTitle className="dialog-title">
        Create Invoice
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent className="dialog-content">

        <Typography className="field-label">Customer</Typography>
        <TextField
          select
          fullWidth
          value={leadId}
          onChange={(e) => setLeadId(e.target.value)}
        >
          {leads.map(l => (
            <MenuItem key={l.id} value={l.id}>
              {l.first_name} {l.last_name}
            </MenuItem>
          ))}
        </TextField>

        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={6}>
            <Typography className="field-label">Issue Date</Typography>
            <TextField
              type="date"
              fullWidth
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </Grid>

          <Grid item xs={6}>
            <Typography className="field-label">Due Date</Typography>
            <TextField
              type="date"
              fullWidth
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Grid>
        </Grid>

        <Typography className="field-label" sx={{ mt: 3 }}>
          Items
        </Typography>

        {items.map((item, index) => (
          <Box
            key={index}
            sx={{ mt: 2, p: 2, border: "1px solid #ddd", borderRadius: 2 }}
          >
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography className="field-label">Description</Typography>
                <TextField
                  fullWidth
                  value={item.description}
                  onChange={(e) =>
                    handleItemChange(index, "description", e.target.value)
                  }
                />
              </Grid>

              <Grid item xs={4}>
                <Typography className="field-label">Qty</Typography>
                <TextField
                  type="number"
                  fullWidth
                  value={item.quantity}
                  onChange={(e) =>
                    handleItemChange(index, "quantity", e.target.value)
                  }
                />
              </Grid>

              <Grid item xs={4}>
                <Typography className="field-label">Unit Price</Typography>
                <TextField
                  type="number"
                  fullWidth
                  value={item.unit_price}
                  onChange={(e) =>
                    handleItemChange(index, "unit_price", e.target.value)
                  }
                />
              </Grid>

              <Grid item xs={4}>
                <Typography className="field-label">GST %</Typography>
                <TextField
                  type="number"
                  fullWidth
                  value={item.gst_rate}
                  onChange={(e) =>
                    handleItemChange(index, "gst_rate", e.target.value)
                  }
                />
              </Grid>
            </Grid>

            {items.length > 1 && (
              <Button
                color="error"
                size="small"
                sx={{ mt: 1 }}
                onClick={() => removeItem(index)}
              >
                Remove
              </Button>
            )}
          </Box>
        ))}

        <Button variant="outlined" sx={{ mt: 2 }} onClick={addItem}>
          Add Item
        </Button>

        <Typography className="field-label" sx={{ mt: 3 }}>
          Notes
        </Typography>
        <TextField
          multiline
          rows={3}
          fullWidth
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </DialogContent>

      <DialogActions>
        <button className="cancel-btn" onClick={handleClose}>
          Cancel
        </button>
        <button
          className="save-btn-x"
          disabled={submitting}
          onClick={handleSave}
        >
          Save
        </button>
      </DialogActions>
    </Dialog>
  );
}

export default CreateInvoiceDialog;