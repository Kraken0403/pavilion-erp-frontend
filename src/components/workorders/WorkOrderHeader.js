import React, { useState } from 'react'
import { Menu, MenuItem } from '@mui/material'
import { useNavigate } from 'react-router-dom'

import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import { generateWorkOrderPdf } from '../../services/workOrderServices'
// import { generateWorkOrderPdf } from '../../services/workOrderService'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import { createInvoiceFromWorkOrder } from '../../services/invoiceService'
import RestaurantMenuOutlinedIcon from '@mui/icons-material/RestaurantMenuOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'


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

  const handleSendToInvoice = async () => {
    if (!id) return
  
    try {
      const res = await createInvoiceFromWorkOrder(id)
  
      if (res.already_existed) {
        navigate(`/invoices/${res.id}`)
        return
      }
  
      navigate(`/invoices/${res.id}`)
    } catch (err) {
      console.error('Send to invoice failed:', err)
      alert('Failed to create invoice')
    }
  }
  

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
            {status}
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

            <MenuItem
              onClick={() => {
                setAnchorEl(null)
                handleSendToInvoice()
              }}
            >
              <ReceiptLongOutlinedIcon fontSize="small" style={{ marginRight: 10 }} />
              Send to Invoice
            </MenuItem>

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
