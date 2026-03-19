import React, { useState, useEffect } from 'react'
import { Menu, MenuItem } from '@mui/material'
import { useNavigate } from 'react-router-dom'

import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import { generateWorkOrderPdf } from '../../services/workOrderServices'
import { getInvoices, getProformaInvoices } from '../../services/invoiceService'
// import { generateWorkOrderPdf } from '../../services/workOrderService'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import RestaurantMenuOutlinedIcon from '@mui/icons-material/RestaurantMenuOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import { formatStatusLabel } from '../../utils/statusFormatter'


function WorkOrderHeader({
  workOrder,
  onStatusChange,
  onGenerateKOT,
  onCreateDelivery,
  showGenerateKOT = false,
  showActions = true
}) {
  const [anchorEl, setAnchorEl] = useState(null)
  const navigate = useNavigate()


  const handleCreateProforma = () => {
    if (!id) return
    setAnchorEl(null)
    navigate('/proforma-invoices/create', { state: { workOrderId: id } })
  }

  const [hasLinkedInvoice, setHasLinkedInvoice] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        if (!id) return
        const [invoicesRes, proformasRes] = await Promise.all([getInvoices(), getProformaInvoices()])
        const invoices = Array.isArray(invoicesRes) ? invoicesRes : invoicesRes?.data || []
        const proformas = Array.isArray(proformasRes) ? proformasRes : proformasRes?.data || []

        const hasInv = invoices.some(i => String(i.source_type || '').toUpperCase() === 'WORK_ORDER' && Number(i.source_id) === Number(id))
        const hasPro = proformas.some(p => String(p.source_type || '').toUpperCase().includes('WORK') && Number(p.source_id) === Number(id)) || proformas.some(p => Number(p.source_id) === Number(id))

        if (mounted) setHasLinkedInvoice(Boolean(hasInv || hasPro))
      } catch (err) {
        // ignore errors
      }
    })()
    return () => { mounted = false }
  }, [id])
  

  if (!workOrder) return null

  const {
    id,
    work_order_number,
    quotation_id,
    quotation_number,
    status
  } = workOrder

  const open = Boolean(anchorEl)

  const handlePdf = () => {
    if (!id) return
    generateWorkOrderPdf(id)
  }

  return (
    <div className="quotation-header">
      <div className="quotation-head">
        <div className="qh-content">
          <h2>
            {work_order_number || `#${id}`}
            {quotation_number && (
              <span className="muted" style={{ marginLeft: 12 }}>
                /{' '}
                <span
                  className="quotation-link"
                  onClick={() => navigate(`/quotations/${quotation_id}`)}
                  style={{
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  {quotation_number}
                </span>
              </span>
            )}
          </h2>
        </div>
      </div>

      {showActions && (
        <div className="quotation-actions">

          {/* STATUS CAPSULE */}
          <span className={`status-pill status-${status}`}>
            {formatStatusLabel(status)}
          </span>

          {/* ACTIONS */}
          <button
            className="secondary-btn"
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            <p>Actions</p>
            <ArrowDropDownIcon />
          </button>

          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={() => setAnchorEl(null)}
          >
            {/* DOWNLOAD PDF */}
            <MenuItem
              onClick={() => {
                setAnchorEl(null)
                handlePdf()
              }}
            >
              <PictureAsPdfOutlinedIcon fontSize="small" style={{ marginRight: 10 }} />
              Download PDF
            </MenuItem>

            {/* "Send to Invoice" option removed per request */}

            {!hasLinkedInvoice && (
              <MenuItem
                onClick={() => {
                  setAnchorEl(null)
                  handleCreateProforma()
                }}
              >
                <ReceiptLongOutlinedIcon fontSize="small" style={{ marginRight: 10 }} />
                Create Proforma Invoice
              </MenuItem>
            )}
            {hasLinkedInvoice && (
              <MenuItem disabled>
                <ReceiptLongOutlinedIcon fontSize="small" style={{ marginRight: 10 }} />
                Proforma / Tax Invoice exists
              </MenuItem>
            )}

            {showGenerateKOT && (
              <MenuItem
                onClick={() => {
                  setAnchorEl(null)
                  onGenerateKOT?.()
                }}
              >
                <RestaurantMenuOutlinedIcon fontSize="small" style={{ marginRight: 10 }} />
                Generate KOT
              </MenuItem>
            )}

            <MenuItem
              onClick={() => {
                setAnchorEl(null)
                onCreateDelivery?.()
              }}
            >
              <LocalShippingOutlinedIcon fontSize="small" style={{ marginRight: 10 }} />
              Create Delivery
            </MenuItem>


            {/* MARK COMPLETED */}
            {status !== 'completed' && (
              <MenuItem
                onClick={() => {
                  setAnchorEl(null)
                  onStatusChange('completed')
                }}
              >
                <CheckCircleOutlineOutlinedIcon fontSize="small" style={{ marginRight: 10 }} />
                Mark Completed
              </MenuItem>
            )}

            {/* CANCEL */}
            {status !== 'cancelled' && (
              <MenuItem
                onClick={() => {
                  setAnchorEl(null)
                  onStatusChange('cancelled')
                }}
              >
                <CancelOutlinedIcon fontSize="small" style={{ marginRight: 10 }} />
                Cancel Work Order
              </MenuItem>
            )}
          </Menu>

        </div>
      )}
    </div>
  )
}

export default WorkOrderHeader
