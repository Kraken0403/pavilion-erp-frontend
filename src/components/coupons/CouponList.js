import React, { useEffect, useState } from 'react'
// Topbar is rendered by the Layout; avoid duplicating it here
import HubSpotListing from '../ui/HubSpotListing'
import ConfirmDialog from '../ui/ConfirmDialog'
import NotificationSnackbar from '../ui/NotificationSnackbar'
import '../../assets/styles/LeadsTable.scss'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'

import { fetchCouponsAdmin, createCouponAdmin, updateCouponAdmin, deleteCouponAdmin } from '../../services/couponService'
import EditIcon from '@mui/icons-material/Edit'
import { formatDate } from '../../utils/dateFormatter'
import { useSettings } from '../../context/SettingsContext'
import { displayCurrency, formatCurrency } from '../../utils/currencyUtils'

export default function CouponList() {
  const { settings } = useSettings()
  const currency = displayCurrency(settings?.currency_code || 'INR')
  const money = (value) => formatCurrency(value, settings?.currency_code || 'INR')
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toDeleteId, setToDeleteId] = useState(null)
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' })

  // Create form fields
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ code: '', type: 'flat', value: 0, min_order_amount: 0, starts_at: '', ends_at: '', usage_limit: '', usage_limit_per_user: '', active: 1 })

  const load = async () => {
    setLoading(true)
    try {
      const rows = await fetchCouponsAdmin()
      setCoupons(Array.isArray(rows) ? rows : [])
    } catch (e) {
      console.error(e)
      setNotification({ open: true, message: 'Failed to load coupons', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const onCreate = async () => {
    if (!form.code) return setNotification({ open: true, message: 'Enter coupon code', severity: 'warning' })
    try {
      if (editingId) {
        await updateCouponAdmin(editingId, {
          code: form.code,
          type: form.type,
          value: Number(form.value || 0),
          min_order_amount: Number(form.min_order_amount || 0),
          starts_at: form.starts_at || null,
          ends_at: form.ends_at || null,
          usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
          usage_limit_per_user: form.usage_limit_per_user ? Number(form.usage_limit_per_user) : null,
          active: form.active ? 1 : 0
        })
        setNotification({ open: true, message: 'Coupon updated', severity: 'success' })
      } else {
        await createCouponAdmin({
          code: form.code,
          type: form.type,
          value: Number(form.value || 0),
          min_order_amount: Number(form.min_order_amount || 0),
          starts_at: form.starts_at || null,
          ends_at: form.ends_at || null,
          usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
          usage_limit_per_user: form.usage_limit_per_user ? Number(form.usage_limit_per_user) : null,
          active: form.active ? 1 : 0
        })
        setNotification({ open: true, message: 'Coupon created', severity: 'success' })
      }

      setForm({ code: '', type: 'flat', value: 0, min_order_amount: 0, starts_at: '', ends_at: '', usage_limit: '', usage_limit_per_user: '', active: 1 })
      setShowCreate(false)
      setEditingId(null)
      await load()
    } catch (e) {
      console.error(e)
      setNotification({ open: true, message: editingId ? 'Failed to update coupon' : 'Failed to create coupon', severity: 'error' })
    }
  }

  const confirmDelete = (id) => {
    setToDeleteId(id)
    setConfirmOpen(true)
  }

  const onEdit = (coupon) => {
    setEditingId(coupon.id)
    setForm({
      code: coupon.code || '',
      type: coupon.type || 'flat',
      value: coupon.value || 0,
      min_order_amount: coupon.min_order_amount || 0,
      starts_at: coupon.starts_at ? String(coupon.starts_at).split('T')[0] : '',
      ends_at: coupon.ends_at ? String(coupon.ends_at).split('T')[0] : '',
      usage_limit: coupon.usage_limit || '',
      usage_limit_per_user: coupon.usage_limit_per_user || '',
      active: coupon.active ? 1 : 0
    })
    setShowCreate(true)
  }

  const doDelete = async () => {
    try {
      await deleteCouponAdmin(toDeleteId)
      setNotification({ open: true, message: 'Coupon deleted', severity: 'success' })
      await load()
    } catch (e) {
      console.error(e)
      setNotification({ open: true, message: 'Failed to delete coupon', severity: 'error' })
    } finally {
      setConfirmOpen(false)
      setToDeleteId(null)
    }
  }

  return (
    <div className="leads-table-container">
      <div style={{ height: '100%' }}>
        <HubSpotListing
          title="Coupons"
          createLabel="Add coupon"
          rows={loading ? [] : coupons.map((coupon) => ({ ...coupon, active_label: coupon.active ? 'Yes' : 'No' }))}
          initialFields={[
            { key: 'code', label: 'Code' }, { key: 'type', label: 'Type', options: ['flat', 'percent'] },
            { key: 'value', label: 'Value' }, { key: 'min_order_amount', label: 'Minimum order' },
            { key: 'starts_at', label: 'Starts at' }, { key: 'ends_at', label: 'Ends at' },
            { key: 'times_used', label: 'Times used' }, { key: 'active_label', label: 'Active', options: ['Yes', 'No'] },
            { key: '_actions', label: 'Actions' },
          ]}
          onCreate={() => { setEditingId(null); setShowCreate(true); }}
          onRowOpen={onEdit}
          onRefresh={load}
          renderValue={(field, value, coupon) => {
            if (field === 'value') return coupon.type === 'percent' ? `${Number(value || 0).toFixed(2)} %` : money(value);
            if (field === 'min_order_amount') return money(value);
            if (field === 'starts_at' || field === 'ends_at') return formatDate(value) || '—';
            if (field === 'active_label') return value;
            if (field === '_actions') return <span className="hs-listing__row-actions" onClick={(event) => event.stopPropagation()}><IconButton aria-label="edit coupon" onClick={() => onEdit(coupon)} size="small"><EditIcon fontSize="small" /></IconButton><IconButton aria-label="delete coupon" color="error" onClick={() => confirmDelete(coupon.id)} size="small"><DeleteIcon fontSize="small" /></IconButton></span>;
            return value ?? '—';
          }}
        />

        <Dialog className="erp-form-drawer" open={showCreate} onClose={() => setShowCreate(false)} fullWidth maxWidth="sm">
          <DialogTitle>
            {editingId ? 'Edit Coupon' : 'Create Coupon'}
            <IconButton
              aria-label="close"
              onClick={() => setShowCreate(false)}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent dividers>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <TextField
                label="Coupon Code"
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                fullWidth
                required
                variant="outlined"
                size="small"
              />

              <TextField
                label="Type"
                select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                fullWidth
                variant="outlined"
                size="small"
              >
                <MenuItem value="flat">Flat</MenuItem>
                <MenuItem value="percent">Percent</MenuItem>
              </TextField>

              <TextField
                label={form.type === 'percent' ? 'Percentage (%)' : `Value (${currency})`}
                type="number"
                value={form.value}
                onChange={e => setForm({ ...form, value: e.target.value })}
                fullWidth
                variant="outlined"
                size="small"
              />

              <TextField
                label={`Minimum Order Amount (${currency})`}
                type="number"
                value={form.min_order_amount}
                onChange={e => setForm({ ...form, min_order_amount: e.target.value })}
                fullWidth
                variant="outlined"
                size="small"
              />

              <TextField
                label="Starts At"
                type="date"
                value={form.starts_at}
                onChange={e => setForm({ ...form, starts_at: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
                size="small"
              />

              <TextField
                label="Ends At"
                type="date"
                value={form.ends_at}
                onChange={e => setForm({ ...form, ends_at: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
                size="small"
              />

              <TextField
                label="Usage Limit (total)"
                type="number"
                value={form.usage_limit}
                onChange={e => setForm({ ...form, usage_limit: e.target.value })}
                fullWidth
                size="small"
              />

              <TextField
                label="Usage Limit per User"
                type="number"
                value={form.usage_limit_per_user}
                onChange={e => setForm({ ...form, usage_limit_per_user: e.target.value })}
                fullWidth
                size="small"
              />

              <TextField
                label="Active"
                select
                value={form.active}
                onChange={e => setForm({ ...form, active: Number(e.target.value) })}
                fullWidth
                size="small"
              >
                <MenuItem value={1}>Yes</MenuItem>
                <MenuItem value={0}>No</MenuItem>
              </TextField>

            </div>
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setShowCreate(false)} color="secondary">Cancel</Button>
            <Button onClick={onCreate} variant="contained" color="primary">Save Coupon</Button>
          </DialogActions>
        </Dialog>

        <ConfirmDialog
          open={confirmOpen}
          title="Delete Coupon"
          message="Are you sure you want to delete this coupon?"
          confirmText="Delete"
          onConfirm={doDelete}
          onCancel={() => setConfirmOpen(false)}
        />

        <NotificationSnackbar
          open={notification.open}
          message={notification.message}
          severity={notification.severity}
          onClose={() => setNotification({ ...notification, open: false })}
        />
      </div>
    </div>
  )
}
