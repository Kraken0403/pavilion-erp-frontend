import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import * as XLSX from 'xlsx';
import {
  createPassbookAccount,
  createPassbookEntry,
  getPassbookAccounts,
  getPassbookEntries,
  getPassbookSummary,
} from '../services/passbookService';
import { formatDate } from '../utils/dateFormatter';
import '../assets/styles/LeadsTable.scss';
import '../assets/styles/PaymentModule.scss';

const formatCurrency = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Number(value || 0));

const today = () => new Date().toISOString().slice(0, 10);

const emptyAccountForm = { account_name: '', starting_balance: 0, notes: '' };
const emptyEntryForm = {
  entry_date: today(),
  type: 'CREDIT',
  category: '',
  party_name: '',
  amount: '',
  notes: '',
};

function Passbook() {
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState('');
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState({});
  const [accountForm, setAccountForm] = useState(emptyAccountForm);
  const [entryForm, setEntryForm] = useState(emptyEntryForm);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    entryDate: '',
    type: '',
    search: '',
  });

  const selectedAccount = useMemo(
    () => accounts.find((a) => String(a.id) === String(accountId)),
    [accounts, accountId],
  );

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await getPassbookAccounts();
      setAccounts(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  const loadEntries = useCallback(async (id = accountId) => {
    if (!id) return;

    const params = {
      account_id: id,
      start_date: filters.startDate || undefined,
      end_date: filters.endDate || undefined,
      date: filters.entryDate || undefined,
      type: filters.type || undefined,
      q: filters.search || undefined,
    };

    const [entryRows, summaryData] = await Promise.all([
      getPassbookEntries(params),
      getPassbookSummary(params),
    ]);

    setEntries(Array.isArray(entryRows) ? entryRows : []);
    setSummary(summaryData || {});
  }, [accountId, filters]);

  useEffect(() => { loadAccounts(); }, []);
  useEffect(() => { if (accountId) loadEntries(accountId); }, [accountId, loadEntries]);

  const handleOpenAccount = (id) => {
    setAccountId(String(id));
    setFilters({ startDate: '', endDate: '', entryDate: '', type: '', search: '' });
  };

  const handleCreateAccount = async () => {
    if (!accountForm.account_name.trim()) return alert('Account name is required');

    const saved = await createPassbookAccount(accountForm);
    setAccountForm(emptyAccountForm);
    setAccountModalOpen(false);
    await loadAccounts();
    if (saved?.id) setAccountId(String(saved.id));
    return null;
  };

  const handleCreateEntry = async () => {
    if (!accountId || !entryForm.amount || Number(entryForm.amount) <= 0) {
      return alert('Select account and enter a valid amount');
    }

    await createPassbookEntry({
      ...entryForm,
      account_id: accountId,
      amount: Number(entryForm.amount),
    });

    setEntryForm(emptyEntryForm);
    setEntryModalOpen(false);
    await loadEntries(accountId);
    await loadAccounts();
    return null;
  };

  const handleExport = () => {
    const rows = entries.map((entry) => ({
      Date: entry.entry_date ? formatDate(entry.entry_date) : '',
      Account: entry.account_name || selectedAccount?.account_name || '',
      Type: entry.type || '',
      Category: entry.category || '',
      Party: entry.party_name || '',
      Amount: Number(entry.amount || 0),
      Notes: entry.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selectedAccount?.account_name || 'Passbook');
    XLSX.writeFile(wb, `${selectedAccount?.account_name || 'passbook'}-entries.xlsx`);
  };

  const renderAccountList = () => (
    <>
      <div className="table-container module-card passbook-hero-card">
        <div className="module-header compact">
          <div>
            <h2>Passbook Accounts</h2>
            <p>Select an account to view ledger entries, filters and exports.</p>
          </div>
          <button className="primary-btn" onClick={() => setAccountModalOpen(true)}>
            <AddCircleOutlineIcon />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      <div className="passbook-accounts-grid">
        {accounts.map((account) => (
          <button
            type="button"
            key={account.id}
            className="passbook-account-card"
            onClick={() => handleOpenAccount(account.id)}
          >
            <div>
              <strong>{account.account_name}</strong>
              <span>{account.notes || 'Cash, bank or wallet account'}</span>
            </div>
            <div className="passbook-account-balance">{formatCurrency(account.current_balance)}</div>
          </button>
        ))}

        {!accounts.length && !loading && (
          <div className="table-container module-card passbook-empty-card">
            <h3>No accounts yet</h3>
            <p>Create your first cash, bank or wallet account to start tracking entries.</p>
            <button className="primary-btn" onClick={() => setAccountModalOpen(true)}>Add Account</button>
          </div>
        )}
      </div>
    </>
  );

  const renderEntries = () => (
    <>
      <div className="table-container module-card">
        <div className="module-header compact">
          <div className="passbook-title-row">
            <button className="secondary-btn" onClick={() => setAccountId('')}>
              <ArrowBackIcon />
              <span>Accounts</span>
            </button>
            <div>
              <h2>{selectedAccount?.account_name || 'Passbook'}</h2>
              <p>Filter, export and manage entries for this account.</p>
            </div>
          </div>

          <div className="toolbar-actions">
            <button className="secondary-btn" onClick={handleExport} disabled={!entries.length}>
              <DownloadIcon />
              <span>Export</span>
            </button>
            <button className="primary-btn" onClick={() => setEntryModalOpen(true)}>
              <AddCircleOutlineIcon />
              <span>Add Entry</span>
            </button>
          </div>
        </div>

        <div className="module-summary">
          <div className="summary-item">
            <div className="summary-label">Starting Balance</div>
            <div className="summary-value">{formatCurrency(selectedAccount?.starting_balance || summary.starting_balance)}</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Credit</div>
            <div className="summary-value">{formatCurrency(summary.total_credit)}</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Debit</div>
            <div className="summary-value">{formatCurrency(summary.total_debit)}</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Balance</div>
            <div className="summary-value">{formatCurrency(summary.current_balance || selectedAccount?.current_balance)}</div>
          </div>
        </div>
      </div>

      <div className="table-container module-card passbook-filter-card">
        <div className="module-header compact">
          <div>
            <h2>Filters</h2>
            <p>Date-wise, range-wise, type-wise and text search filters.</p>
          </div>
          <button
            className="secondary-btn"
            onClick={() => setFilters({ startDate: '', endDate: '', entryDate: '', type: '', search: '' })}
          >
            Clear Filters
          </button>
        </div>

        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <Typography className="field-label">Search</Typography>
            <TextField className="form-input" fullWidth placeholder="Party, category, notes" value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} />
          </Grid>
          <Grid item xs={12} md={2}>
            <Typography className="field-label">Exact Date</Typography>
            <TextField className="form-input" fullWidth type="date" value={filters.entryDate} onChange={(e) => setFilters((p) => ({ ...p, entryDate: e.target.value }))} />
          </Grid>
          <Grid item xs={12} md={2}>
            <Typography className="field-label">From</Typography>
            <TextField className="form-input" fullWidth type="date" value={filters.startDate} onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value }))} />
          </Grid>
          <Grid item xs={12} md={2}>
            <Typography className="field-label">To</Typography>
            <TextField className="form-input" fullWidth type="date" value={filters.endDate} onChange={(e) => setFilters((p) => ({ ...p, endDate: e.target.value }))} />
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography className="field-label">Type</Typography>
            <TextField className="form-input" fullWidth select value={filters.type} onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="CREDIT">Credit</MenuItem>
              <MenuItem value="DEBIT">Debit</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </div>

      <div className="table-container">
        <table className="leads-table passbook-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Category</th>
              <th>Party</th>
              <th>Amount</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {entries.length ? entries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.entry_date ? formatDate(entry.entry_date) : '—'}</td>
                <td><span className={`status-pill ${entry.type === 'CREDIT' ? 'status-approved' : 'status-pending'}`}>{entry.type}</span></td>
                <td>{entry.category || '—'}</td>
                <td>{entry.party_name || '—'}</td>
                <td>{formatCurrency(entry.amount)}</td>
                <td><span className="cell-text">{entry.notes || '—'}</span></td>
              </tr>
            )) : <tr><td colSpan={6} className="table-empty-message">No passbook entries found</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );

  return (
    <div className="leads-table-container passbook-page">
      {accountId ? renderEntries() : renderAccountList()}

      <Dialog open={accountModalOpen} onClose={() => setAccountModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ className: 'flowbite-card' }}>
        <DialogTitle className="dialog-title">Add Account</DialogTitle>
        <DialogContent className="dialog-content">
          <Typography className="field-label">Account Name</Typography>
          <TextField className="form-input" fullWidth value={accountForm.account_name} onChange={(e) => setAccountForm((p) => ({ ...p, account_name: e.target.value }))} />
          <Typography className="field-label" sx={{ mt: 2 }}>Starting Balance</Typography>
          <TextField className="form-input" fullWidth type="number" value={accountForm.starting_balance} onChange={(e) => setAccountForm((p) => ({ ...p, starting_balance: e.target.value }))} />
          <Typography className="field-label" sx={{ mt: 2 }}>Notes</Typography>
          <TextField className="form-input" fullWidth multiline minRows={3} value={accountForm.notes} onChange={(e) => setAccountForm((p) => ({ ...p, notes: e.target.value }))} />
        </DialogContent>
        <DialogActions className="dialog-actions">
          <button className="cancel-btn" onClick={() => setAccountModalOpen(false)}>Cancel</button>
          <button className="save-btn-x" onClick={handleCreateAccount}>Create Account</button>
        </DialogActions>
      </Dialog>

      <Dialog open={entryModalOpen} onClose={() => setEntryModalOpen(false)} maxWidth="md" fullWidth PaperProps={{ className: 'flowbite-card' }}>
        <DialogTitle className="dialog-title">Add Entry</DialogTitle>
        <DialogContent className="dialog-content">
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography className="field-label">Date</Typography>
              <TextField className="form-input" fullWidth type="date" value={entryForm.entry_date} onChange={(e) => setEntryForm((p) => ({ ...p, entry_date: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography className="field-label">Type</Typography>
              <TextField className="form-input" fullWidth select value={entryForm.type} onChange={(e) => setEntryForm((p) => ({ ...p, type: e.target.value }))}>
                <MenuItem value="CREDIT">Credit</MenuItem>
                <MenuItem value="DEBIT">Debit</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography className="field-label">Amount</Typography>
              <TextField className="form-input" fullWidth type="number" value={entryForm.amount} onChange={(e) => setEntryForm((p) => ({ ...p, amount: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography className="field-label">Category</Typography>
              <TextField className="form-input" fullWidth placeholder="Vendor payment, Client payment, Adjustment" value={entryForm.category} onChange={(e) => setEntryForm((p) => ({ ...p, category: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography className="field-label">Party</Typography>
              <TextField className="form-input" fullWidth value={entryForm.party_name} onChange={(e) => setEntryForm((p) => ({ ...p, party_name: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <Typography className="field-label">Notes</Typography>
              <TextField className="form-input" fullWidth multiline minRows={3} value={entryForm.notes} onChange={(e) => setEntryForm((p) => ({ ...p, notes: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions className="dialog-actions">
          <button className="cancel-btn" onClick={() => setEntryModalOpen(false)}>Cancel</button>
          <button className="save-btn-x" onClick={handleCreateEntry}>Add Entry</button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default Passbook;
