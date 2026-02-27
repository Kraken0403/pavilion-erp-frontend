import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Box,
  Grid,
  Button
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

import {
  getCategories,
  createCategory,
  updateCategory
} from "../../services/productServices";

import NotificationSnackbar from "../ui/NotificationSnackbar";

import "../../assets/styles/AddProductDialog.scss";

function AddCategoryDialog({ open, onClose, category = null }) {
  /* ---------------- STATE ---------------- */

  const [name, setName] = useState("");
  const [parentOptions, setParentOptions] = useState([]);
  const [selectedParent, setSelectedParent] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [notif, setNotif] = useState({
    open: false,
    message: "",
    severity: "success"
  });

  /* ---------------- HELPERS ---------------- */

  const showNotification = (message, severity = "success") => {
    setNotif({ open: true, message, severity });
  };

  const closeNotification = () => {
    setNotif(prev => ({ ...prev, open: false }));
  };

  const resetForm = () => {
    setName("");
    setSelectedParent(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  /* ---------------- LOAD CATEGORIES ---------------- */

  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        const raw = await getCategories();
        const flat = [];

        const flatten = (list, path = []) => {
          list.forEach(cat => {
            const fullPath = [...path, cat.name];
            flat.push({
              id: cat.id,
              label: fullPath.join(" > ")
            });

            if (cat.children?.length) {
              flatten(cat.children, fullPath);
            }
          });
        };

        flatten(raw);
        setParentOptions(flat);

        if (category) {
          setName(category.rawName || category.name || "");
          if (category.parent_id) {
            const match = flat.find(p => p.id === category.parent_id);
            setSelectedParent(match || null);
          } else {
            setSelectedParent(null);
          }
        } else {
          resetForm();
        }
      } catch (err) {
        console.error(err);
        showNotification("Failed to fetch categories", "error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category]);

  /* ---------------- SAVE ---------------- */

  const handleSave = async () => {
    if (submitting) return;

    if (!name.trim()) {
      showNotification("Category name is required", "warning");
      return;
    }

    setSubmitting(true);

    try {
      if (category?.id) {
        // EDIT
        await updateCategory(category.id, {
          name: name.trim(),
          parent_id: selectedParent?.id || null
        });
        showNotification("Category updated successfully");
      } else {
        // CREATE
        await createCategory({
          category: name.trim(),
          parent_id: selectedParent?.id || null
        });
        showNotification("Category created successfully");
      }

      setSubmitting(false);
      handleClose();
    } catch (err) {
      console.error(err);
      setSubmitting(false);

      const msg =
        err.response?.data?.error ||
        "Failed to save category";

      showNotification(msg, "error");
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <>
      <Dialog
        className="add-product-dialog"
        open={open}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle className="dialog-title">
          {category ? "Edit Category" : "Add New Category"}
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent className="dialog-content">
          {/* CATEGORY NAME */}
          <Typography className="field-label">Category Name</Typography>
          <TextField
            className="form-input"
            fullWidth
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />

          {/* PARENT CATEGORY */}
          <Typography className="field-label" sx={{ mt: 2 }}>
            Parent Category (optional)
          </Typography>

          <Autocomplete
            options={parentOptions}
            value={selectedParent}
            onChange={(e, val) => setSelectedParent(val)}
            getOptionLabel={o => o?.label || ""}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => (
              <TextField
                {...params}
                className="form-input"
                fullWidth
              />
            )}
          />
        </DialogContent>

        <DialogActions className="dialog-actions">
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

      <NotificationSnackbar
        open={notif.open}
        message={notif.message}
        severity={notif.severity}
        onClose={closeNotification}
      />
    </>
  );
}

export default AddCategoryDialog;
