import React, { useEffect, useState } from 'react'
import {
  Grid,
  TextField,
  Typography,
  Autocomplete,
  Paper,
  Box,
  Popper,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import '../../assets/styles/QuotationContact.scss'

// Better z-index popper (dropdown above dialogs/cards/etc.)
const LeadPopper = (props) => (
  <Popper
    {...props}
    style={{ ...(props.style || {}), zIndex: 2000 }}
    placement="bottom-start"
  />
)

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
}) {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [leadInput, setLeadInput] = useState('')

  useEffect(() => {
    const nextLeadId = selectedLead?.id ?? ''

    // Avoid re-setting parent header state on every render.
    if (String(leadId ?? '') !== String(nextLeadId ?? '')) {
      setLeadId(nextLeadId)
    }

    if (selectedLead) {
      setEmail(selectedLead.email || '')
      setPhone(selectedLead.phone_number || '')
      setCompany(selectedLead.company_name || '')
    } else {
      setEmail('')
      setPhone('')
      setCompany('')
    }
  }, [selectedLead, leadId, setLeadId])

  const fullName = (o) =>
    `${o?.first_name || ''} ${o?.last_name || ''}`.trim()

  return (
    <div className="quotation-contact-section">
      <Typography className="section-title">
        <span className="sep"></span>
        Lead Information
      </Typography>

      <Grid container spacing={2}>
        {/* LEAD AUTOCOMPLETE */}
        <Grid item xs={12} md={6}>
          <Typography className="field-label">Lead</Typography>

          <Autocomplete
            PopperComponent={LeadPopper}
            options={leads}
            value={selectedLead || null}
            inputValue={leadInput}
            disabled={isLocked}
            clearOnBlur={false}
            isOptionEqualToValue={(a, b) => String(a?.id) === String(b?.id)}
            getOptionLabel={(o) => (o ? fullName(o) : '')}
            onInputChange={(e, val) => setLeadInput(val)}
            onChange={(e, val) => {
              if (!val) return
              setSelectedLead(val)
            }}
            PaperComponent={(paperProps) => (
              <Paper {...paperProps} className="lead-paper">
                {/* MUI renders <ul> children here */}
                {paperProps.children}

                {!isLocked && (
                  <Box
                    className="lead-add-option"
                    onMouseDown={(e) => {
                      // CRITICAL: prevent autocomplete from blurring / closing before click
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()

                      // Prefill from typed input (can be empty too)
                      setPrefillLeadName(leadInput || '')
                      openAddLeadDialog?.()
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <AddIcon fontSize="small" />
                    Add Lead
                  </Box>
                )}
              </Paper>
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                {fullName(option)}
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                className="form-input"
                fullWidth
                placeholder="Search lead"
                // This helps when you have weird click swallowing from parent wrappers
                onMouseDown={(e) => e.stopPropagation()}
              />
            )}
          />
        </Grid>

        {/* COMPANY */}
        <Grid item xs={12} md={6}>
          <Typography className="field-label">Company</Typography>
          <TextField className="form-input" fullWidth value={company} disabled />
        </Grid>

        {/* DATES */}
        <Grid item xs={6} md={3}>
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

        <Grid item xs={6} md={3}>
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

        {/* GST */}
        <Grid item xs={12} md={6}>
          <Typography className="field-label">GST Number</Typography>
          <TextField
            className="form-input"
            fullWidth
            value={selectedLead?.gst_number || ''}
            disabled
          />
        </Grid>

        {/* EMAIL */}
        <Grid item xs={6} md={3}>
          <Typography className="field-label">Email</Typography>
          <TextField className="form-input" fullWidth value={email} disabled />
        </Grid>

        {/* PHONE */}
        <Grid item xs={6} md={3}>
          <Typography className="field-label">Phone</Typography>
          <TextField className="form-input" fullWidth value={phone} disabled />
        </Grid>

        {/* NOTES */}
        <Grid item xs={12}>
          <Typography className="field-label">Notes</Typography>
          <TextField
            className="form-input"
            fullWidth
            multiline
            rows={3}
            disabled={isLocked}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Grid>
      </Grid>
    </div>
  )
}

export default QuotationContactSection