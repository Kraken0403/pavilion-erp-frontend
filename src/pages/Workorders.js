// src/pages/WorkOrdersTable.jsx
import React, { useEffect, useMemo, useState } from 'react'
import '../assets/styles/LeadsTable.scss'
import Topbar from '../components/Topbar';

import { Checkbox } from '@mui/material'
import { useNavigate } from 'react-router-dom'

import UtilsBar from '../components/UtilsBar'
import PaginationBar from '../components/ui/PaginationBar'

import {
  fetchWorkOrders,
  updateWorkOrderStatus
} from '../services/workOrderServices'
import { formatStatusLabel, normalizeStatusValue } from '../utils/statusFormatter'
import useAutoRefresh from '../hooks/useAutoRefresh'
import { parseDateInput, formatDate as formatDateUtil } from '../utils/dateFormatter'

import { useSettings } from '../context/SettingsContext'
import { displayCurrency } from '../utils/currencyUtils'
import { useNotification } from '../context/NotificationContext'

const statusOptions = [
  'pending',
  'preparing',
  'ready',
  'completed',
  'cancelled'
]

const formatDate = (iso) => {
  if (!iso) return '—'
  const parsed = parseDateInput(iso)
  if (!parsed) return '—'
  return formatDateUtil(parsed)
}

const normalizeWorkOrderStatus = (status) => {
  const raw = normalizeStatusValue(status)
  if (raw === 'issued') return 'pending'
  if (raw === 'in_progress') return 'preparing'
  return raw
}

const ITEMS_PER_PAGE = 20

const getWorkOrdersSignature = (items) => {
  if (!Array.isArray(items)) return '[]'

  return JSON.stringify(
    items.map((item) => ({
      id: Number(item?.id || 0),
      work_order_number: String(item?.work_order_number || ''),
      issue_date: String(item?.issue_date || ''),
      customer_name: String(item?.customer_name || ''),
      total_amount: Number(item?.total_amount || 0),
      status: String(item?.status || ''),
    }))
  )
}

function WorkOrders() {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const { getUnreadNotificationFor, markRecordNotificationsSeen } = useNotification()
  const currency = displayCurrency(settings?.currency_code)

  const [orders, setOrders] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortValue, setSortValue] = useState('latest')
  const [dateFilter, setDateFilter] = useState({})
  const [currentPage, setCurrentPage] = useState(1)

  const [selected, setSelected] = useState([])
  const [selectAll, setSelectAll] = useState(false)
  const [editingStatusId, setEditingStatusId] = useState(null)

  /* ================= FETCH ================= */

  const load = async () => {
    const res = await fetchWorkOrders()
    const nextOrders = Array.isArray(res?.workOrders) ? res.workOrders : []

    setOrders((prev) => {
      const prevSignature = getWorkOrdersSignature(prev)
      const nextSignature = getWorkOrdersSignature(nextOrders)
      return prevSignature === nextSignature ? prev : nextOrders
    })
  }

  useAutoRefresh(load, { intervalMs: 15000 })

  /* ================= FILTER + SORT ================= */

  const processed = useMemo(() => {
    let data = [...orders]

    if (dateFilter?.startDate) {
      const startDate = parseDateInput(dateFilter.startDate)
      data = data.filter(
        (o) => {
          const issueDate = parseDateInput(o.issue_date)
          if (!issueDate || !startDate) return false
          return issueDate >= startDate
        }
      )
    }

    if (dateFilter?.endDate) {
      const end = parseDateInput(dateFilter.endDate)
      if (!end) return data
      end.setHours(23, 59, 59, 999)
      data = data.filter(
        (o) => {
          const issueDate = parseDateInput(o.issue_date)
          if (!issueDate) return false
          return issueDate <= end
        }
      )
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      data = data.filter(o =>
        o.work_order_number?.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q)
      )
    }

    // Sort
    if (sortValue === 'latest') {
      data.sort((a, b) => (parseDateInput(b.issue_date) || new Date(0)) - (parseDateInput(a.issue_date) || new Date(0)))
    } else if (sortValue === 'oldest') {
      data.sort((a, b) => (parseDateInput(a.issue_date) || new Date(0)) - (parseDateInput(b.issue_date) || new Date(0)))
    }

    return data
  }, [orders, searchQuery, sortValue, dateFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortValue])

  /* ================= PAGINATION ================= */

  const indexOfLast = currentPage * ITEMS_PER_PAGE
  const currentRows = processed.slice(indexOfLast - ITEMS_PER_PAGE, indexOfLast)

  /* ================= SELECTION ================= */

  const toggleSelectAll = () => {
    setSelectAll(!selectAll)
    setSelected(!selectAll ? processed.map(o => o.id) : [])
  }

  const toggleSelect = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  /* ================= STATUS ================= */

  const handleStatusChange = async (id, status) => {
    await updateWorkOrderStatus(id, status)
    load()
  }

  const handleOpenWorkOrder = async (workOrderId) => {
    try {
      await markRecordNotificationsSeen('work_orders', workOrderId)
    } catch {
      // Navigation should still work even if notification refresh fails.
    }

    navigate(`/workorders/${workOrderId}`)
  }

  /* ================= UI ================= */

  return (
    <div className="leads-table-container">
      <Topbar />
      <UtilsBar
        buttonLabel="Create Work Order"
        onButtonClick={() => navigate('/workorders/create')}
        selectedCount={selected.length}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        sortValue={sortValue}
        onSortChange={setSortValue}
        onDateFilterChange={setDateFilter}
      />

      <div className="table-container">
        <table className="leads-table">
          <thead>
            <tr>
              <th>
                <Checkbox checked={selectAll} onChange={toggleSelectAll} />
              </th>
              <th>WO NO</th>
              <th>CUSTOMER</th>
              <th>DATE</th>
              <th>TOTAL</th>
              <th>STATUS</th>
            </tr>
          </thead>

          <tbody>
            {currentRows.map(o => {
              const notification = getUnreadNotificationFor('work_orders', o.id)
              const action = String(notification?.action || '').toLowerCase()
              const badgeLabel = notification ? (/(create|new|added)/.test(action) ? 'NEW' : 'UPDATED') : ''
              const statusKey = normalizeWorkOrderStatus(o.status)

              return (
                <tr
                  key={o.id}
                  className="clickable-row"
                  onClick={() => handleOpenWorkOrder(o.id)}
                >
                  <td onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.includes(o.id)}
                      onChange={() => toggleSelect(o.id)}
                    />
                  </td>

                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span>{o.work_order_number}</span>
                      {badgeLabel ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 74,
                            padding: '3px 8px',
                            borderRadius: 999,
                            color: '#fff',
                            background: badgeLabel === 'NEW' ? '#e53935' : '#f57c00',
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.02em',
                          }}
                        >
                          {badgeLabel}
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td>{o.customer_name || '—'}</td>
                  <td>{formatDate(o.issue_date)}</td>
                  <td>{currency} {o.total_amount}</td>

                  <td onClick={e => e.stopPropagation()}>
                    {editingStatusId === o.id ? (
                      <select
                        className="status-select-inline"
                        value={normalizeWorkOrderStatus(o.status)}
                        autoFocus
                        onBlur={() => setEditingStatusId(null)}
                        onChange={async (e) => {
                          await handleStatusChange(o.id, e.target.value)
                          setEditingStatusId(null)
                        }}
                      >
                        {statusOptions.map(s => (
                          <option key={s} value={s}>{formatStatusLabel(s)}</option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={`status-pill status-${statusKey}`}
                        onClick={() => setEditingStatusId(o.id)}
                      >
                        {formatStatusLabel(statusKey)}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}

            {!currentRows.length && (
              <tr>
                <td colSpan={6} className="table-empty-message">
                  No work orders found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PaginationBar
        currentPage={currentPage}
        totalItems={processed.length}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />

    </div>
  )
}

export default WorkOrders
