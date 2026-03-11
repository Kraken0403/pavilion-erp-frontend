import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Typography,
  Box,
  IconButton
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { addLead } from "../../services/leadService";
import { getAllCustomFields } from "../../services/customFieldServices";
import { getAllUsers } from "../../services/userServices";
import { formatStatusLabel } from "../../utils/statusFormatter";

import "../../assets/styles/AddProductDialog.scss"; // reuse same styling

const INITIAL_FORM = {
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  company_name: "",
  gst_number: "",
  contact_name: "",
  lead_status: "new",
  priority: "low",
  follow_up_date: "",
  assigned_salesperson: "",
  hotness: "",
  amount: "",
  billing_address: "",
  billing_city: "",
  billing_state: "",
  billing_pincode: "",
  shipping_address: "",
  shipping_city: "",
  shipping_state: "",
  shipping_pincode: "",
  notes: ""
};

function AddLeadDialog({ open, onClose, onLeadCreated, showNotification, prefillName = "" }) {

  const [form, setForm] = useState(INITIAL_FORM);

  const [users, setUsers] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [customValues, setCustomValues] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const hasLoadedMasterDataRef = useRef(false);
  const isLoadingMasterDataRef = useRef(false);
  const showNotificationRef = useRef(showNotification);

  useEffect(() => {
    showNotificationRef.current = showNotification;
  }, [showNotification]);

  /* ---------------------------------------
     PREFILL NAME
  --------------------------------------- */
  useEffect(() => {
    if (!open) return;

    if (prefillName) {
      const parts = prefillName.split(" ");
      setForm(prev => ({
        ...prev,
        first_name: parts[0] || "",
        last_name: parts.slice(1).join(" ") || ""
      }));
    }
  }, [prefillName, open]);

  /* ---------------------------------------
     LOAD USERS + CUSTOM FIELDS
  --------------------------------------- */
  useEffect(() => {
    if (!open) {
      hasLoadedMasterDataRef.current = false;
      isLoadingMasterDataRef.current = false;
      return;
    }

    if (hasLoadedMasterDataRef.current || isLoadingMasterDataRef.current) {
      return;
    }

    let isCancelled = false;
    isLoadingMasterDataRef.current = true;

    (async () => {
      try {
        const [userList, fields] = await Promise.all([
          getAllUsers(),
          getAllCustomFields(),
        ]);

        if (isCancelled) return;

        setUsers(Array.isArray(userList) ? userList : []);
        setCustomFields(Array.isArray(fields) ? fields : []);
        hasLoadedMasterDataRef.current = true;
      } catch (error) {
        if (isCancelled) return;
        console.error('Failed to load AddLeadDialog master data:', error);
        setUsers([]);
        setCustomFields([]);
        showNotificationRef.current?.('Failed to load users/custom fields', 'error');
      } finally {
        isLoadingMasterDataRef.current = false;
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCustomChange = (fieldId, value) => {
    setCustomValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSave = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);

      /* -----------------------------
         BASIC VALIDATION
      ----------------------------- */
      if (!form.first_name?.trim()) {
        showNotification("First name is required", "warning");
        return;
      }

      /* -----------------------------
         SAFE NUMERIC CONVERSION
      ----------------------------- */
      const safeNumber = (val) =>
        val === "" || val === null || val === undefined
          ? null
          : Number(val);

      /* -----------------------------
         CLEAN PAYLOAD
      ----------------------------- */
      const payload = {
        ...form,

        // convert numeric fields properly
        hotness: safeNumber(form.hotness),
        amount: safeNumber(form.amount),

        // convert empty strings to null for optional text fields
        email: form.email || null,
        phone_number: form.phone_number || null,
        gst_number: form.gst_number || null,
        contact_name: form.contact_name || null,
        follow_up_date: form.follow_up_date || null,
        assigned_salesperson:
          form.assigned_salesperson === "" ? null : form.assigned_salesperson,

        billing_address: form.billing_address || null,
        billing_city: form.billing_city || null,
        billing_state: form.billing_state || null,
        billing_pincode: form.billing_pincode || null,

        shipping_address: form.shipping_address || null,
        shipping_city: form.shipping_city || null,
        shipping_state: form.shipping_state || null,
        shipping_pincode: form.shipping_pincode || null,

        notes: form.notes || null,

        custom_fields: Object.entries(customValues).map(([id, val]) => ({
          field_id: Number(id),
          field_value: val || null
        }))
      };

      /* -----------------------------
         API CALL
      ----------------------------- */
      const response = await addLead(payload);

      /*
        Depending on your backend, response could be:
        { leadId: 27 }
        OR full lead object
      */

      const createdLeadId =
        response?.leadId || response?.id || null;

      if (!createdLeadId) {
        throw new Error("Lead created but no ID returned from server");
      }

      /* -----------------------------
         SUCCESS
      ----------------------------- */
      showNotification("Lead created successfully", "success");

      onLeadCreated(createdLeadId);

      onClose();

    } catch (err) {
      console.error("Error creating lead:", err);

      showNotification(
        err?.response?.data?.details ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to create lead",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm(INITIAL_FORM);
    setCustomValues({});
    onClose();
  };

  return (
    <Dialog className="add-product-dialog" open={open} maxWidth="md" fullWidth>
      <DialogTitle className="dialog-title">
        Add New Lead
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent className="dialog-content">

        {/* CONTACT SECTION */}
        <Typography className="field-label">First Name</Typography>
        <TextField className="form-input" fullWidth name="first_name" value={form.first_name} onChange={handleChange} />

        <Typography className="field-label" sx={{ mt: 2 }}>Last Name</Typography>
        <TextField className="form-input" fullWidth name="last_name" value={form.last_name} onChange={handleChange} />

        <Typography className="field-label" sx={{ mt: 2 }}>Email</Typography>
        <TextField className="form-input" fullWidth name="email" value={form.email} onChange={handleChange} />

        <Typography className="field-label" sx={{ mt: 2 }}>Phone</Typography>
        <TextField className="form-input" fullWidth name="phone_number" value={form.phone_number} onChange={handleChange} />

        <Typography className="field-label" sx={{ mt: 2 }}>Company Name</Typography>
        <TextField className="form-input" fullWidth name="company_name" value={form.company_name} onChange={handleChange} />

        <Typography className="field-label" sx={{ mt: 2 }}>GST Number</Typography>
        <TextField className="form-input" fullWidth name="gst_number" value={form.gst_number} onChange={handleChange} />

        {/* STATUS + PRIORITY */}
        <Typography className="field-label" sx={{ mt: 2 }}>Status</Typography>
        <TextField className="form-input" select fullWidth name="lead_status" value={form.lead_status} onChange={handleChange}>
          {["new", "in-progress", "closed", "won", "lost"].map(s =>
            <MenuItem key={s} value={s}>{formatStatusLabel(s)}</MenuItem>
          )}
        </TextField>

        <Typography className="field-label" sx={{ mt: 2 }}>Priority</Typography>
        <TextField className="form-input" select fullWidth name="priority" value={form.priority} onChange={handleChange}>
          {["low", "medium", "high"].map(p =>
            <MenuItem key={p} value={p}>{p}</MenuItem>
          )}
        </TextField>

        {/* ASSIGNED SALES */}
        <Typography className="field-label" sx={{ mt: 2 }}>Assigned Salesperson</Typography>
        <TextField className="form-input" select fullWidth name="assigned_salesperson" value={form.assigned_salesperson} onChange={handleChange}>
          {users.map(u => (
            <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
          ))}
        </TextField>

        {/* FOLLOW UP */}
        <Typography className="field-label" sx={{ mt: 2 }}>Follow Up Date</Typography>
        <TextField className="form-input" type="datetime-local" fullWidth name="follow_up_date" value={form.follow_up_date} onChange={handleChange} />

        {/* HOTNESS + AMOUNT */}
        <Typography className="field-label" sx={{ mt: 2 }}>Hotness</Typography>
        <TextField className="form-input" type="number" fullWidth name="hotness" value={form.hotness} onChange={handleChange} />

        <Typography className="field-label" sx={{ mt: 2 }}>Amount</Typography>
        <TextField className="form-input" type="number" fullWidth name="amount" value={form.amount} onChange={handleChange} />

        {/* NOTES */}
        <Typography className="field-label" sx={{ mt: 2 }}>Notes</Typography>
        <TextField className="form-input" multiline rows={3} fullWidth name="notes" value={form.notes} onChange={handleChange} />

        {/* CUSTOM FIELDS */}
        {customFields.length > 0 && (
          <>
            <Typography className="field-label" sx={{ mt: 3 }}>Custom Fields</Typography>

            {customFields.map(field => (
              <Box key={field.field_id} sx={{ mt: 2 }}>
                <Typography className="field-label">{field.field_name}</Typography>

                <TextField
                  className="form-input"
                  fullWidth
                  value={customValues[field.field_id] || ""}
                  onChange={(e) => handleCustomChange(field.field_id, e.target.value)}
                />
              </Box>
            ))}
          </>
        )}

      </DialogContent>

      <DialogActions className="dialog-actions">
        <button className="cancel-btn" onClick={handleClose}>Cancel</button>
        <button className="save-btn-x" disabled={submitting} onClick={handleSave}>Save</button>
      </DialogActions>
    </Dialog>
  );
}

export default AddLeadDialog;