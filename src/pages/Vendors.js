import React, { useEffect, useState } from 'react';
import VendorFormDialog from '../components/vendors/VendorFormDialog';
import HubSpotListing from '../components/ui/HubSpotListing';
import { getVendors } from '../services/vendorService';

const fields = [
  { key: 'name', label: 'Vendor' }, { key: 'contact_person', label: 'Contact' },
  { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' },
  { key: 'brands', label: 'Brands' }, { key: 'credit_days', label: 'Credit days' },
  { key: 'payable_balance', label: 'Payable balance' }, { key: 'status_label', label: 'Status' },
];
export default function Vendors() {
  const [vendors, setVendors] = useState([]); const [open, setOpen] = useState(false); const [editing, setEditing] = useState(null);
  const load = async () => { const data = await getVendors({ includeInactive: true }); setVendors(data.map((vendor) => ({ ...vendor, status_label: vendor.is_active ? 'Active' : 'Inactive' }))); };
  useEffect(() => { load().catch(() => setVendors([])); }, []);
  const edit = (vendor) => { setEditing(vendor); setOpen(true); };
  return <><HubSpotListing title="Vendors" createLabel="Add vendor" rows={vendors} initialFields={fields} onCreate={() => { setEditing(null); setOpen(true); }} onRowOpen={edit} onUpdateRow={edit} onRefresh={load} /><VendorFormDialog open={open} vendor={editing} onClose={() => { setOpen(false); setEditing(null); }} onSaved={() => { setOpen(false); setEditing(null); load(); }} /></>;
}
