// src/components/workorders/WorkOrderEventSection.js
import React from 'react'
import { Typography, Grid } from '@mui/material'
import '../../assets/styles/WorkOrderEventSection.scss'
import { formatDate, formatTime12Hour } from '../../utils/dateFormatter'

function WorkOrderEventSection({ workOrder }) {
  if (!workOrder) return null
  const mode = String(workOrder.mode || workOrder.quotation_mode || 'GENERAL').toUpperCase()
  if (mode !== 'CATERING') return null

  const {
    event_name,
    event_date,
    event_time,
    event_location,
    pax,
  } = workOrder

  const eventDateLabel = formatDate(event_date) || event_date
  const eventTimeLabel = formatTime12Hour(`1970-01-01T${event_time}`) || event_time

  return (
    <div className="wo-event-section">
      <Typography variant="h6" gutterBottom>
        Event Details
      </Typography>

      <Grid container spacing={2}>
        {event_name && (
          <Grid item xs={12} md={6}>
            <div className="wo-field">
              <span className="wo-label">Event Name:</span>
              <span className="wo-value">{event_name}</span>
            </div>
          </Grid>
        )}

        {event_date && (
          <Grid item xs={12} md={6}>
            <div className="wo-field">
              <span className="wo-label">Event Date:</span>
              <span className="wo-value">{eventDateLabel}</span>
            </div>
          </Grid>
        )}

        {event_time && (
          <Grid item xs={12} md={6}>
            <div className="wo-field">
              <span className="wo-label">Event Time:</span>
              <span className="wo-value">{eventTimeLabel}</span>
            </div>
          </Grid>
        )}

        {event_location && (
          <Grid item xs={12} md={6}>
            <div className="wo-field">
              <span className="wo-label">Event Location:</span>
              <span className="wo-value">{event_location}</span>
            </div>
          </Grid>
        )}

        {pax && (
          <Grid item xs={12} md={6}>
            <div className="wo-field">
              <span className="wo-label">Guests (PAX):</span>
              <span className="wo-value">{pax}</span>
            </div>
          </Grid>
        )}
      </Grid>
    </div>
  )
}

export default WorkOrderEventSection
