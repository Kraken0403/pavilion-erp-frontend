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

import { useSettings } from '../context/SettingsContext'

const statusOptions = [
  'issued',
  'in_progress',
  'completed',
  'cancelled'
]

const formatDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN')
}

const ITEMS_PER_PAGE = 20

function WorkOrders() {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const currency = settings?.currency_code || '₹'

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
    setOrders(res?.workOrders || [])
  }

  useEffect(() => {
    load()
  }, [])

  /* ================= FILTER + SORT ================= */

  const processed = useMemo(() => {
    let data = [...orders]

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
      data.sort((a, b) => new Date(b.issue_date) - new Date(a.issue_date))
    } else if (sortValue === 'oldest') {
      data.sort((a, b) => new Date(a.issue_date) - new Date(b.issue_date))
    }

    return data
  }, [orders, searchQuery, sortValue])

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
            {currentRows.map(o => (
              <tr
                key={o.id}
                className="clickable-row"
                onClick={() => navigate(`/workorders/${o.id}`)}
              >
                <td onClick={e => e.stopPropagation()}>
                  <Checkbox
                    checked={selected.includes(o.id)}
                    onChange={() => toggleSelect(o.id)}
                  />
                </td>

                <td>{o.work_order_number}</td>
                <td>{o.customer_name || '—'}</td>
                <td>{formatDate(o.issue_date)}</td>
                <td>{currency} {o.total_amount}</td>

                <td onClick={e => e.stopPropagation()}>
                  {editingStatusId === o.id ? (
                    <select
                      className="status-select-inline"
                      value={o.status}
                      autoFocus
                      onBlur={() => setEditingStatusId(null)}
                      onChange={async (e) => {
                        await handleStatusChange(o.id, e.target.value)
                        setEditingStatusId(null)
                      }}
                    >
                      {statusOptions.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={`status-pill status-${o.status}`}
                      onClick={() => setEditingStatusId(o.id)}
                    >
                      {o.status}
                    </span>
                  )}
                </td>
              </tr>
            ))}
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
