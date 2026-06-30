import React, { useEffect, useMemo, useState } from 'react';
import { Chip } from '@mui/material';
import VendorFormDialog from '../components/vendors/VendorFormDialog';
import { deleteVendor, getVendors } from '../services/vendorService';
import '../assets/styles/LeadsTable.scss';
import '../assets/styles/PaymentModule.scss';

const formatCurrency = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(Number(value || 0));

function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);

  const loadVendors = async () => {
    setLoading(true);
    try {
      setVendors(await getVendors({ includeInactive: true }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadVendors(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter((v) => [v.name, v.contact_person, v.email, v.phone, v.brands]
      .some((x) => String(x || '').toLowerCase().includes(q)));
  }, [vendors, search]);

  const openCreate = () => { setEditingVendor(null); setDialogOpen(true); };
  const openEdit = (vendor) => { setEditingVendor(vendor); setDialogOpen(true); };

  return (
    <div className="leads-table-container vendors-page">
      <div className="table-container module-card">
        <div className="module-header compact">
          <div>
            <h2>Vendors</h2>
            <p>Manage suppliers, brands, payment terms, and purchase-side balances.</p>
          </div>
          <button className="primary-btn" onClick={openCreate}>Add Vendor</button>
        </div>
        <div className="module-toolbar">
          <div className="search-input">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendor, brand, phone or email" />
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="leads-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Brands</th>
              <th>Terms</th>
              <th>Payable Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="table-empty-message">Loading vendors...</td></tr>
            ) : filtered.length ? filtered.map((vendor) => (
              <tr key={vendor.id}>
                <td>{vendor.name}</td>
                <td>{vendor.contact_person || '—'}</td>
                <td>{vendor.email || '—'}</td>
                <td>{vendor.phone || '—'}</td>
                <td><span className="cell-text">{vendor.brands || '—'}</span></td>
                <td>{vendor.credit_days ? `${vendor.credit_days} days` : 'Immediate'}</td>
                <td>{formatCurrency(vendor.payable_balance)}</td>
                <td><Chip size="small" label={vendor.is_active ? 'Active' : 'Inactive'} color={vendor.is_active ? 'success' : 'default'} /></td>
                <td>
                  <div className="row-actions">
                    <button className="secondary-btn" onClick={() => openEdit(vendor)}>Edit</button>
                    <button className="secondary-btn danger" onClick={async () => { await deleteVendor(vendor.id); loadVendors(); }}>Archive</button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={9} className="table-empty-message">No vendors found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <VendorFormDialog
        open={dialogOpen}
        vendor={editingVendor}
        onClose={() => setDialogOpen(false)}
        onSaved={loadVendors}
      />
    </div>
  );
}

export default Vendors;
