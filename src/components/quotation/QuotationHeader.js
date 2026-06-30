import React, { useState } from 'react'
import { Menu, MenuItem } from '@mui/material'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined'
import FileCopyOutlinedIcon from '@mui/icons-material/FileCopyOutlined'

import { generateQuotationPdf } from '../../services/quotationService'

function QuotationHeader({
  quotation,
  isLocked = false,

  // optional actions
  onStatusChange,
  onApprove,
  onCreateWorkOrder,
  onCreateVersion,

  showActions = true
}) {
  const [actionsAnchorEl, setActionsAnchorEl] = useState(null)

  if (!quotation) return null

  const {
    id,
    quotation_number,
    version,
    quotation_mode,
    status
  } = quotation

  const actionsOpen = Boolean(actionsAnchorEl)

  const handleGeneratePdf = async () => {
    if (!id) return
    try {
      await generateQuotationPdf(id)
    } catch (err) {
      console.error('Failed to generate PDF', err)
    }
  }

  return (
    <div className="quotation-header">
      <div className="quotation-head">
        <div className="qh-content">
          <h2>
            {/* <strong>Quotation:</strong>{' '} */}
            {quotation_number || `#${id || 'NEW'}`}
          </h2>

          {version && <p className="muted">Version {version}</p>}
        </div>
{/* 
        <div className="quotation-meta">
          {quotation_mode && (
            <p className="chip">
              <strong>Mode:</strong>{' '}
              <span>{quotation_mode}</span>
            </p>
          )}
        </div> */}
      </div>

      {showActions && (
        <div className="quotation-actions">

          {/* STATUS */}
          {status === 'approved' ? (
            <span className="status-pill status-approved">Approved</span>
          ) : status === 'converted' ? (
            <span className="status-pill status-converted">Converted</span>
          ) : (
            onStatusChange && (
              <select
                className={`status-select status-${status}`}
                value={status}
                disabled={isLocked}
                onChange={(e) => onStatusChange(e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            )
          )}

          {/* ACTIONS BUTTON */}
          <button
            className="secondary-btn"
            onClick={(e) => {
              e.preventDefault()
              setActionsAnchorEl(e.currentTarget)
            }}
            disabled={!id}
          >
            <p>Actions</p>
            <ArrowDropDownIcon />
          </button>

          {/* ACTIONS MENU */}
          <Menu
            anchorEl={actionsAnchorEl}
            open={actionsOpen}
            onClose={() => setActionsAnchorEl(null)}
          >

            {/* DOWNLOAD PDF */}
            <MenuItem
              onClick={() => {
                setActionsAnchorEl(null)
                handleGeneratePdf()
              }}
            >
              <PictureAsPdfOutlinedIcon fontSize="small" style={{ marginRight: 10 }} />
              Download PDF
            </MenuItem>

            {/* APPROVE */}
            {status === 'pending' && !isLocked && onApprove && (
              <MenuItem
                onClick={() => {
                  setActionsAnchorEl(null)
                  onApprove()
                }}
              >
                <CheckCircleOutlineOutlinedIcon fontSize="small" style={{ marginRight: 10 }} />
                Approve Quotation
              </MenuItem>
            )}

            {/* CREATE WORK ORDER */}
            {status === 'approved' && onCreateWorkOrder && (
              <MenuItem
                onClick={() => {
                  setActionsAnchorEl(null)
                  onCreateWorkOrder()
                }}
              >
                <WorkOutlineOutlinedIcon fontSize="small" style={{ marginRight: 10 }} />
                Create Work Order
              </MenuItem>
            )}

            {/* CREATE VERSION */}
            {onCreateVersion && status !== 'converted' && status !== 'rejected' && (
              <MenuItem
                onClick={() => {
                  setActionsAnchorEl(null)
                  onCreateVersion()
                }}
              >
                <FileCopyOutlinedIcon fontSize="small" style={{ marginRight: 10 }} />
                Create New Version
              </MenuItem>
            )}
          </Menu>

        </div>
      )}
    </div>
  )
}

export default QuotationHeader
