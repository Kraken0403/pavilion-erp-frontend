import React from 'react';
import HubSpotListing from './ui/HubSpotListing';

export default function CustomersTable({ customers = [], onAddCustomer }) {
  const rows = customers.map((customer, index) => ({ id: customer.id || customer.customer_email || index, ...customer }));
  return <HubSpotListing title="Customers" createLabel="Add customer" rows={rows} initialFields={['customer_name', 'customer_email', 'customer_phone', 'total_invoices', 'total_spent', 'last_transaction_date']} onCreate={onAddCustomer} />;
}
