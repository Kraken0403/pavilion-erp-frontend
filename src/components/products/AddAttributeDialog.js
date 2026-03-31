import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Button,
  IconButton,
  Typography
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'

import {
  createAttribute,
  createAttributeOption
} from '../../services/productServices'
import { updateAttribute } from '../../services/productServices'

import NotificationSnackbar from '../ui/NotificationSnackbar'
import '../../assets/styles/AddProductDialog.scss'

function AddAttributeDialog({ open, onClose, attribute = null }) {
  /* ---------------- STATE ---------------- */

  const [attributeName, setAttributeName] = useState('')
  const [options, setOptions] = useState([''])
  const [existingOptionValues, setExistingOptionValues] = useState(new Set())

  const [notif, setNotif] = useState({
    open: false,
    message: '',
    severity: 'success'
  })

  /* ---------------- HELPERS ---------------- */

  const showNotification = (message, severity = 'success') => {
    setNotif({ open: true, message, severity })
  }

  const closeNotification = () => {
    setNotif(prev => ({ ...prev, open: false }))
  }

  const resetForm = () => {
    setAttributeName('')
    setOptions([''])
  }

  // Populate when editing
  React.useEffect(() => {
    if (attribute) {
      setAttributeName(attribute.name || '')
      const opts = (attribute.options || []).map(o => String(o.value || ''))
      setOptions(opts.length ? opts : [''])
      setExistingOptionValues(new Set(opts.filter(Boolean)))
    } else {
      resetForm()
      setExistingOptionValues(new Set())
    }
  }, [attribute, open])

  const handleClose = () => {
    resetForm()
    onClose()
  }

  /* ---------------- OPTIONS ---------------- */

  const handleAddOption = () => {
    setOptions(prev => [...prev, ''])
  }

  const handleChangeOption = (index, value) => {
    const copy = [...options]
    copy[index] = value
    setOptions(copy)
  }

  const handleRemoveOption = (index) => {
    if (options.length === 1) return // 🚫 keep at least one
    setOptions(prev => prev.filter((_, i) => i !== index))
  }

  /* ---------------- SAVE ---------------- */

  const handleSave = async () => {
    if (!attributeName.trim()) {
      return showNotification('Please enter attribute name', 'warning')
    }

    const validOptions = options.filter(o => o.trim())

    if (!validOptions.length) {
      return showNotification('At least one option is required', 'warning')
    }

    try {
      if (attribute && attribute.id) {
        // Update existing attribute name
        await updateAttribute(attribute.id, { name: attributeName })

        // Create any new options that didn't previously exist
        for (const opt of validOptions) {
          if (!existingOptionValues.has(opt)) {
            await createAttributeOption({ attribute_id: attribute.id, value: opt })
          }
        }

        showNotification('Attribute updated successfully')
        handleClose()
      } else {
        const created = await createAttribute({ name: attributeName })
        const attributeId = created.attributeId

        for (const opt of validOptions) {
          await createAttributeOption({
            attribute_id: attributeId,
            value: opt
          })
        }

        showNotification('Attribute created successfully')
        handleClose()
      }
    } catch (err) {
      console.error(err)
      const msg =
        err.response?.data?.error ||
        'Failed to create attribute'
      showNotification(msg, 'error')
    }
  }

  /* ---------------- UI ---------------- */

  return (
    <>
      <Dialog
        className="add-product-dialog"
        open={open}
        maxWidth="sm"
        fullWidth
      >
        {/* HEADER */}
        <DialogTitle className="dialog-title">
          {attribute && attribute.id ? 'Edit Attribute' : 'Add Attribute'}
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        {/* BODY */}
        <DialogContent className="dialog-content">
          {/* ATTRIBUTE NAME */}
          <Typography className="field-label">Attribute Name</Typography>
          <TextField
            className="form-input"
            fullWidth
            value={attributeName}
            onChange={(e) => setAttributeName(e.target.value)}
            autoFocus
          />

          {/* OPTIONS */}
          <Typography className="field-label" sx={{ mt: 3 }}>
            Attribute Options
          </Typography>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            {options.map((opt, idx) => (
              <Grid item xs={12} key={idx}>
                <Grid container spacing={1} alignItems="center">
                  <Grid item xs>
                    <TextField
                      className="form-input"
                      fullWidth
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) =>
                        handleChangeOption(idx, e.target.value)
                      }
                    />
                  </Grid>

                  <Grid item>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveOption(idx)}
                      disabled={options.length === 1}
                      title="Remove option"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Grid>
                </Grid>
              </Grid>
            ))}

            <Grid item xs={12}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddOption}
              >
                Add Option
              </Button>
            </Grid>
          </Grid>
        </DialogContent>

        {/* FOOTER */}
        <DialogActions className="dialog-actions">
          <button className="cancel-btn" onClick={handleClose}>
            Cancel
          </button>
          <button className="save-btn-x" onClick={handleSave}>
            {attribute && attribute.id ? 'Update' : 'Save'}
          </button>
        </DialogActions>
      </Dialog>

      {/* SNACKBAR */}
      <NotificationSnackbar
        open={notif.open}
        message={notif.message}
        severity={notif.severity}
        onClose={closeNotification}
      />
    </>
  )
}

export default AddAttributeDialog
