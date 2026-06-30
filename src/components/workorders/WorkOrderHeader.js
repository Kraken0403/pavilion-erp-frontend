import React, { useState } from 'react'
import { Menu, MenuItem } from '@mui/material'
import { useNavigate } from 'react-router-dom'

import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import { generateWorkOrderPdf } from '../../services/workOrderServices'
// import { generateWorkOrderPdf } from '../../services/workOrderService'

function WorkOrderHeader({
  workOrder,
  onStatusChange,
  showActions = true
}) {
  const [anchorEl, setAnchorEl] = useState(null)
  const navigate = useNavigate()

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
