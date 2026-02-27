import React, { useEffect, useMemo, useState } from 'react'
import { Checkbox, IconButton } from '@mui/material'
import { Edit, Delete } from '@mui/icons-material'
import * as XLSX from 'xlsx'

import {
  getAllAttributes,
  getAttributeOptions,
  deleteAttribute
} from '../../services/productServices'

import AddAttributeDialog from './AddAttributeDialog'
import UtilsBar from '../UtilsBar'
import PaginationBar from '../ui/PaginationBar'
import ConfirmDialog from '../ui/ConfirmDialog'
import NotificationSnackbar from '../ui/NotificationSnackbar'

import '../../assets/styles/LeadsTable.scss'

const ITEMS_PER_PAGE = 20

function AttributeList() {
  /* ---------------- STATE ---------------- */

  const [attributes, setAttributes] = useState([])
  const [openDialog, setOpenDialog] = useState(false)
  const [editingAttribute, setEditingAttribute] = useState(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [sortValue, setSortValue] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [selected, setSelected] = useState([])
  const [selectAll, setSelectAll] = useState(false)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState([])

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  })

  /* ---------------- HELPERS ---------------- */

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity })
  }

  const closeSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }))
  }

  /* ---------------- FETCH ---------------- */

  const fetchAttributes = async () => {
    try {
      const raw = await getAllAttributes()

      const enriched = await Promise.all(
        raw.map(async (attr) => {
          const options = await getAttributeOptions(attr.id)
          return {
            ...attr,
            options,
            optionsCount: options?.length || 0
          }
        })
      )

      setAttributes(enriched)
    } catch (err) {
      console.error(err)
      showSnackbar('Failed to load attributes', 'error')
    }
  }

  useEffect(() => {
    fetchAttributes()
  }, [])

  /* ---------------- FILTER + SORT ---------------- */

  const filteredAttributes = useMemo(() => {
    let data = [...attributes]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      data = data.filter(a =>
        a.name.toLowerCase().includes(q)
      )
    }

    switch (sortValue) {
      case 'az':
        data.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'za':
        data.sort((a, b) => b.name.localeCompare(a.name))
        break
      case 'options_high':
        data.sort((a, b) => b.optionsCount - a.optionsCount)
        break
      case 'options_low':
        data.sort((a, b) => a.optionsCount - b.optionsCount)
        break
      default:
        break
    }

    return data
  }, [attributes, searchQuery, sortValue])

  /* ---------------- PAGINATION ---------------- */

  const indexOfLast = currentPage * ITEMS_PER_PAGE
  const indexOfFirst = indexOfLast - ITEMS_PER_PAGE
  const currentItems = filteredAttributes.slice(indexOfFirst, indexOfLast)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortValue])

  /* ---------------- SELECTION ---------------- */

  const toggleSelectAll = () => {
    const next = !selectAll
    setSelectAll(next)
    setSelected(next ? currentItems.map(a => a.id) : [])
  }

  const toggleSelectOne = (id) => {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    )
  }

  /* ---------------- DELETE ---------------- */

  const handleDeleteSingle = (id) => {
    setDeleteTarget([id])
    setConfirmOpen(true)
  }

  const handleDeleteSelected = () => {
    if (!selected.length) {
      showSnackbar('Please select at least one attribute', 'warning')
      return
    }
    setDeleteTarget(selected)
    setConfirmOpen(true)
  }

  const confirmDelete = async () => {
    try {
      for (const id of deleteTarget) {
        await deleteAttribute(id)
      }

      showSnackbar('Attribute deleted successfully', 'success')
      setSelected([])
      setSelectAll(false)
      fetchAttributes()
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        'Failed to delete attribute'

      showSnackbar(msg, 'error')
    } finally {
      setConfirmOpen(false)
      setDeleteTarget([])
    }
  }

  /* ---------------- EXPORT ---------------- */

  const exportSelected = () => {
    if (!selected.length) {
      showSnackbar('Select attributes to export', 'warning')
      return
    }

    const data = attributes
      .filter(a => selected.includes(a.id))
      .map(a => ({
        Attribute: a.name,
        Options: a.options?.map(o => o.value).join(', ')
      }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Attributes')
    XLSX.writeFile(wb, 'attributes.xlsx')

    showSnackbar('Attributes exported successfully', 'success')
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="leads-table-container">
      <UtilsBar
        buttonLabel="Add Attribute"
        onButtonClick={() => {
          setEditingAttribute(null)
          setOpenDialog(true)
        }}
        showSearch
        showSort
        showDateFilter={false}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        sortValue={sortValue}
        onSortChange={setSortValue}
        selectedCount={selected.length}
        onDeleteSelected={handleDeleteSelected}
        onExportSelected={exportSelected}
      />

      <div className="table-container">
        <table className="leads-table">
          <thead>
            <tr>
              <th style={{ width: 48 }}>
                <Checkbox
                  checked={
                    currentItems.length > 0 &&
                    selected.length === currentItems.length
                  }
                  indeterminate={
                    selected.length > 0 &&
                    selected.length < currentItems.length
                  }
                  onChange={toggleSelectAll}
                />
              </th>
              <th>ATTRIBUTE</th>
              <th style={{ width: 200 }}>OPTIONS</th>
              <th style={{ width: 120 }}>ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: 20 }}>
                  No attributes found
                </td>
              </tr>
            ) : (
              currentItems.map(attr => (
                <tr key={attr.id}>
                  <td>
                    <Checkbox
                      checked={selected.includes(attr.id)}
                      onChange={() => toggleSelectOne(attr.id)}
                    />
                  </td>

                  <td>{attr.name}</td>

                  <td>
                    {attr.options?.length
                      ? attr.options.map(o => o.value).join(', ')
                      : '—'}
                  </td>

                  <td>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditingAttribute(attr)
                        setOpenDialog(true)
                      }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>

                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteSingle(attr.id)}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PaginationBar
        currentPage={currentPage}
        totalItems={filteredAttributes.length}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />

      <AddAttributeDialog
        open={openDialog}
        attribute={editingAttribute}
        onClose={() => {
          setOpenDialog(false)
          fetchAttributes()
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Attribute"
        description={`Are you sure you want to delete ${deleteTarget.length} attribute(s)?`}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
      />

      <NotificationSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={closeSnackbar}
      />
    </div>
  )
}

export default AttributeList
