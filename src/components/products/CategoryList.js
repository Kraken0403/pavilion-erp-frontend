import React, { useEffect, useMemo, useState } from 'react'
import { Checkbox, IconButton } from '@mui/material'
import { Edit, Delete } from '@mui/icons-material'
import * as XLSX from 'xlsx'

import {
  getCategories,
  deleteCategory
} from '../../services/productServices'

import AddCategoryDialog from './AddCategoryDialog'
import UtilsBar from '../UtilsBar'
import PaginationBar from '../ui/PaginationBar'
import ConfirmDialog from '../ui/ConfirmDialog'
import NotificationSnackbar from '../ui/NotificationSnackbar'

import '../../assets/styles/LeadsTable.scss'

const ITEMS_PER_PAGE = 20

function CategoryList() {
  /* ---------------- STATE ---------------- */

  const [categories, setCategories] = useState([])
  const [openDialog, setOpenDialog] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)

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

  const fetchCategories = async () => {
    try {
      const data = await getCategories()
      const flat = []

      const flatten = (nodes, path = '') => {
        nodes.forEach(cat => {
          const label = path ? `${path} > ${cat.name}` : cat.name

          flat.push({
            id: cat.id,
            name: label,
            rawName: cat.name,
            parent_id: cat.parent_id,
            product_count: cat.product_count,
            isParent: !!cat.children?.length
          })

          if (cat.children?.length) {
            flatten(cat.children, label)
          }
        })
      }

      flatten(data)
      setCategories(flat)
    } catch (err) {
      showSnackbar('Failed to load categories', 'error')
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  /* ---------------- FILTER + SORT ---------------- */

  const filteredCategories = useMemo(() => {
    let data = [...categories]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      data = data.filter(c => c.name.toLowerCase().includes(q))
    }

    switch (sortValue) {
      case 'az':
        data.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'za':
        data.sort((a, b) => b.name.localeCompare(a.name))
        break
      case 'products_high':
        data.sort((a, b) => b.product_count - a.product_count)
        break
      case 'products_low':
        data.sort((a, b) => a.product_count - b.product_count)
        break
      default:
        break
    }

    return data
  }, [categories, searchQuery, sortValue])

  /* ---------------- PAGINATION ---------------- */

  const indexOfLast = currentPage * ITEMS_PER_PAGE
  const indexOfFirst = indexOfLast - ITEMS_PER_PAGE
  const currentItems = filteredCategories.slice(indexOfFirst, indexOfLast)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortValue])

  /* ---------------- SELECTION ---------------- */

  const toggleSelectAll = () => {
    const next = !selectAll
    setSelectAll(next)
    setSelected(next ? currentItems.map(c => c.id) : [])
  }

  const toggleSelectOne = (id) => {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    )
  }

  /* ---------------- EXPORT ---------------- */

  const exportSelected = () => {
    if (!selected.length) {
      showSnackbar('Please select at least one category to export', 'warning')
      return
    }

    const exportData = categories
      .filter(c => selected.includes(c.id))
      .map(c => ({
        Category: c.name,
        Products: c.product_count
      }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Categories')

    XLSX.writeFile(wb, 'categories.xlsx')

    showSnackbar('Categories exported successfully', 'success')
  }

  /* ---------------- DELETE ---------------- */

  const handleDeleteSingle = (id) => {
    setDeleteTarget([id])
    setConfirmOpen(true)
  }

  const handleDeleteSelected = () => {
    if (!selected.length) {
      showSnackbar('Please select at least one category', 'warning')
      return
    }
    setDeleteTarget(selected)
    setConfirmOpen(true)
  }

  const confirmDelete = async () => {
    try {
      for (const id of deleteTarget) {
        await deleteCategory(id)
      }

      showSnackbar('Category deleted successfully', 'success')
      setSelected([])
      setSelectAll(false)
      fetchCategories()
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        'Failed to delete category'

      showSnackbar(msg, 'error')
    } finally {
      setConfirmOpen(false)
      setDeleteTarget([])
    }
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="leads-table-container">
      <UtilsBar
        buttonLabel="Add Category"
        onButtonClick={() => {
          setEditingCategory(null)
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
              <th>CATEGORY</th>
              <th style={{ width: 140 }}>PRODUCTS</th>
              <th style={{ width: 120 }}>ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: 20 }}>
                  No categories found
                </td>
              </tr>
            ) : (
              currentItems.map(cat => (
                <tr key={cat.id}>
                  <td>
                    <Checkbox
                      checked={selected.includes(cat.id)}
                      onChange={() => toggleSelectOne(cat.id)}
                    />
                  </td>

                  <td>{cat.name}</td>

                  <td>
                    <strong>{cat.product_count}</strong>
                  </td>

                  <td>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditingCategory(cat)
                        setOpenDialog(true)
                      }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>

                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteSingle(cat.id)}
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
        totalItems={filteredCategories.length}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />

      <AddCategoryDialog
        open={openDialog}
        category={editingCategory}
        onClose={() => {
          setOpenDialog(false)
          fetchCategories()
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Category"
        description={`Are you sure you want to delete ${deleteTarget.length} category(s)?`}
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

export default CategoryList
