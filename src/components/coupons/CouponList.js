import React, { useEffect, useMemo, useState } from 'react'
// Topbar is rendered by the Layout; avoid duplicating it here
import UtilsBar from '../UtilsBar'
import PaginationBar from '../ui/PaginationBar'
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

const ITEMS_PER_PAGE = 20

export default function CouponList() {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
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

  const filtered = useMemo(() => {
    const q = String(search || '').trim().toLowerCase()
    if (!q) return coupons
    return coupons.filter(c => (String(c.code || '').toLowerCase().includes(q) || String(c.description || '').toLowerCase().includes(q)))
  }, [coupons, search])

  const totalItems = filtered.length
  const start = (currentPage - 1) * ITEMS_PER_PAGE
  const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE)

  return (
    <div className="leads-table-container">
      <div style={{ padding: 12 }}>
        <UtilsBar
          buttonLabel="New Coupon"
          onButtonClick={() => setShowCreate(true)}
          searchValue={search}
          onSearchChange={setSearch}
          sortValue="latest"
          onSortChange={() => {}}
        />

        <div className="table-container" style={{ marginTop: 12 }}>
          <table className="leads-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Value</th>
                <th>Min Order</th>
                <th>Starts At</th>
                <th>Ends At</th>
                <th>Usage</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: 20, textAlign: 'center' }}>Loading...</td></tr>
              ) : (pageItems.length ? pageItems.map(c => (
                <tr key={c.id} className="clickable-row">
                  <td><span className="cell-text">{c.code}</span></td>
                  <td>{c.type}</td>
                  <td>{c.type === 'percent' ? `${Number(c.value || 0).toFixed(2)} %` : `₹ ${Number(c.value || 0).toFixed(2)}`}</td>
                  <td>₹ {Number(c.min_order_amount || 0).toFixed(2)}</td>
                  <td>{formatDate(c.starts_at)}</td>
                  <td>{formatDate(c.ends_at)}</td>
                  <td>{c.times_used || 0}{c.usage_limit ? ` / ${c.usage_limit}` : ''}</td>
                  <td>{c.active ? 'Yes' : 'No'}</td>
                  <td>
                    <IconButton aria-label="edit-coupon" color="primary" onClick={() => onEdit(c)} size="small">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton aria-label="delete-coupon" color="error" onClick={() => confirmDelete(c.id)} size="small">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={9} className="table-empty-message">No coupons found</td></tr>
              ))}
            </tbody>
          </table>

          <PaginationBar
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={(p) => setCurrentPage(p)}
          />
        </div>

        <Dialog open={showCreate} onClose={() => setShowCreate(false)} fullWidth maxWidth="sm">
          <DialogTitle>
            Create Coupon
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
                label={form.type === 'percent' ? 'Percentage (%)' : 'Value (₹)'}
                type="number"
                value={form.value}
                onChange={e => setForm({ ...form, value: e.target.value })}
                fullWidth
                variant="outlined"
                size="small"
              />

              <TextField
                label="Minimum Order Amount (₹)"
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
