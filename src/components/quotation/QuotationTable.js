import React from 'react';
import { useNavigate } from 'react-router-dom';
import HubSpotListing from '../ui/HubSpotListing';

export default function QuotationTable({ quotations = [], reload }) {
  const navigate = useNavigate();
  const rows = quotations.map((quotation) => ({ ...quotation, customer: `${quotation.first_name || quotation.lead_first_name || ''} ${quotation.last_name || quotation.lead_last_name || ''}`.trim() || '—' }));
  return <HubSpotListing title="Quotations" createLabel="Create quotation" rows={rows} initialFields={['customer', 'quotation_number', 'quotation_date', 'total_amount', 'version', 'status']} onCreate={() => navigate('/quotation-create')} onRowOpen={(quotation) => navigate(`/quotations/${quotation.id}`)} onRefresh={reload} />;
}
