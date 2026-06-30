import React, { useEffect, useState, useMemo } from 'react'
import { Autocomplete, Button, Collapse, Grid, TextField, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import WgiymEditor from '../ui/WgiymEditor'
import '../../assets/styles/QuotationContact.scss'

function QuotationContactSection({
  leadId,
  setLeadId,
  selectedLead,
  setSelectedLead,
  quotationDate,
  setQuotationDate,
  validUntil,
  setValidUntil,
  notes,
  setNotes,
  openAddLeadDialog,
  setPrefillLeadName,
  leads = [],
  isLocked = false,
  defaultDetailsOpen = false,
}) {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [leadInput, setLeadInput] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(defaultDetailsOpen)

  const leadOptions = useMemo(() => leads || [], [leads])

  /* ---------------------------------------
     SYNC SELECTED LEAD
  --------------------------------------- */
  useEffect(() => {
    if (selectedLead) {
      setLeadId?.(selectedLead.id)
      setEmail(selectedLead.email || '')
      setPhone(selectedLead.phone_number || '')
      setCompany(selectedLead.company_name || '')
    } else {
      setLeadId?.('')
      setEmail('')
      setPhone('')
      setCompany('')
    }
  }, [selectedLead, setLeadId])

  const leadName = selectedLead
    ? `${selectedLead.first_name || ''} ${selectedLead.last_name || ''}`.trim()
    : ''

  const detailCount = [email, phone, selectedLead?.gst_number, notes]
    .filter(Boolean)
    .length

  return (
    <div className="quotation-contact-section">
      <div className="quotation-section-heading">
        <div>
          <Typography className="section-title">
            <span className="sep"></span>
            Lead Information
          </Typography>
          <p className="quotation-section-subtitle">
            {leadName || 'Select a lead and quotation dates'}
            {company ? ` - ${company}` : ''}
          </p>
        </div>

        <button
          type="button"
          className="quotation-details-toggle"
          onClick={() => setDetailsOpen((prev) => !prev)}
        >
          {detailsOpen ? 'Hide details' : `More details${detailCount ? ` (${detailCount})` : ''}`}
          {detailsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </button>
      </div>

      <Grid container spacing={1.5} className="quotation-lead-core">
        {/* LEAD AUTOCOMPLETE */}
        <Grid item xs={12} md={4}>
          <div className="field-label-row">
            <Typography className="field-label">Lead</Typography>
            {!isLocked && (
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => {
                  setPrefillLeadName?.(leadInput || '')
                  openAddLeadDialog?.()
                }}
              >
                Add New Lead
              </Button>
            )}
          </div>

          <Autocomplete
            size="small"
            options={leadOptions}
            value={selectedLead}
            inputValue={leadInput}
            disabled={isLocked}
            clearOnBlur={false}
            isOptionEqualToValue={(a, b) => a?.id === b?.id}
            getOptionLabel={(o) => {
              if (!o) return ''
              return `${o.first_name || ''} ${o.last_name || ''}`.trim()
            }}
            onInputChange={(e, val) => setLeadInput(val)}
            onChange={(e, val) => {
              if (!val) return
              setSelectedLead(val)
            }}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <div className="lead-option-row">
                  <strong>{option.first_name} {option.last_name}</strong>
                  {option.company_name ? <span>{option.company_name}</span> : null}
                </div>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                className="form-input"
                fullWidth
                placeholder="Search lead"
              />
            )}
          />
        </Grid>

        {/* COMPANY */}
        <Grid item xs={12} md={3}>
          <Typography className="field-label">Company</Typography>
          <TextField
            className="form-input"
            fullWidth
            value={company}
            InputProps={{ readOnly: true }}
          />
        </Grid>

        {/* DATES */}
        <Grid item xs={6} md={2.5}>
          <Typography className="field-label">Quotation Date</Typography>
          <TextField
            className="form-input"
            type="date"
            fullWidth
            disabled={isLocked}
            value={quotationDate}
            onChange={(e) => setQuotationDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        <Grid item xs={6} md={2.5}>
          <Typography className="field-label">Valid Until</Typography>
          <TextField
            className="form-input"
            type="date"
            fullWidth
            required
            disabled={isLocked}
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
      </Grid>

      <Collapse in={detailsOpen} timeout="auto" unmountOnExit>
        <Grid container spacing={1.5} className="quotation-lead-extra">
          {/* EMAIL */}
          <Grid item xs={6} md={3}>
            <Typography className="field-label">Email</Typography>
            <TextField
              className="form-input"
              fullWidth
              value={email}
              InputProps={{ readOnly: true }}
            />
          </Grid>

          {/* PHONE */}
          <Grid item xs={6} md={3}>
            <Typography className="field-label">Phone</Typography>
            <TextField
              className="form-input"
              fullWidth
              value={phone}
              InputProps={{ readOnly: true }}
            />
          </Grid>

          {/* GST */}
          <Grid item xs={12} md={6}>
            <Typography className="field-label">GST Number</Typography>
            <TextField
              className="form-input"
              fullWidth
              value={selectedLead?.gst_number || ''}
              InputProps={{ readOnly: true }}
            />
          </Grid>

          {/* NOTES */}
          <Grid item xs={12}>
            <Typography className="field-label">Notes</Typography>
            {isLocked ? (
              <div className="rich-text-preview" dangerouslySetInnerHTML={{ __html: notes || '' }} />
            ) : (
              <WgiymEditor value={notes || ''} onChange={setNotes} />
            )}
          </Grid>
        </Grid>
      </Collapse>
    </div>
  )
}

export default QuotationContactSection
