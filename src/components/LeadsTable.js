import React from 'react';
import HubSpotListing from './ui/HubSpotListing';

const LeadsTable = ({ leads, visibleFields = [], onUpdateLead, onCreate, onRowOpen }) => {
  const fields = visibleFields.map((field) => {
    const key = typeof field === 'string' ? field : field.key;
    if (key === 'lead_status') return { ...(typeof field === 'string' ? { key } : field), options: ['new', 'in-progress', 'closed', 'won', 'lost'] };
    if (key === 'priority') return { ...(typeof field === 'string' ? { key } : field), options: ['low', 'medium', 'high'] };
    return field;
  });
  return <HubSpotListing title="Contacts" createLabel="Add contact" rows={leads} initialFields={fields} onCreate={onCreate} onRowOpen={onRowOpen} onUpdateRow={onUpdateLead} renderValue={(field, value) => {
    if (field === 'lead_status' && value) return <span className={`hs-listing__status hs-listing__status--${String(value).toLowerCase().replace(/\s+/g, '-')}`}>{value}</span>;
    if ((field === 'email' || field === 'phone_number') && value) return <span>{value}</span>;
    return value === null || value === undefined || value === '' ? '—' : String(value);
  }} />;
};

export default LeadsTable;
