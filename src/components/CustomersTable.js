import React, { useMemo, useState, useEffect } from 'react';
import '../assets/styles/LeadsTable.scss';
import { Checkbox } from '@mui/material';
import UtilsBar from './UtilsBar';
import PaginationBar from './ui/PaginationBar';
import * as XLSX from 'xlsx';

const CustomersTable = ({
  customers = [],
  onAddCustomer,
  onExportSelected,
}) => {
  const customersPerPage = 20;

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortValue, setSortValue] = useState('latest');
  const [dateFilter, setDateFilter] = useState({});

  const getProcessed = useMemo(() => {
    return () => {
      let data = Array.isArray(customers) ? [...customers] : [];

      if (dateFilter.startDate || dateFilter.endDate) {
        data = data.filter((c) => {
          if (!c.last_transaction_date) return false;
          const d = new Date(c.last_transaction_date);
          if (dateFilter.startDate && d < new Date(dateFilter.startDate)) return false;
          if (dateFilter.endDate && d > new Date(dateFilter.endDate)) return false;
          return true;
        });
      }

      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        data = data.filter((c) => (
          String(c.customer_name || '').toLowerCase().includes(q) ||
          String(c.customer_email || '').toLowerCase().includes(q) ||
          String(c.customer_phone || '').toLowerCase().includes(q)
        ));
      }

      switch (sortValue) {
        case 'latest':
          data.sort((a, b) => new Date(b.last_transaction_date) - new Date(a.last_transaction_date));
          break;
        case 'oldest':
          data.sort((a, b) => new Date(a.last_transaction_date) - new Date(b.last_transaction_date));
          break;
        case 'big-spenders':
          data.sort((a, b) => (parseFloat(b.total_spent) || 0) - (parseFloat(a.total_spent) || 0));
          break;
        case 'most-orders':
          data.sort((a, b) => (parseInt(b.total_invoices) || 0) - (parseInt(a.total_invoices) || 0));
          break;
        default:
          break;
      }

      return data;
    };
  }, [customers, searchQuery, sortValue, dateFilter]);

  const processed = useMemo(() => getProcessed(), [getProcessed]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, sortValue, dateFilter]);

  const indexOfLast = currentPage * customersPerPage;
  const indexOfFirst = indexOfLast - customersPerPage;
  const currentRows = processed.slice(indexOfFirst, indexOfLast);

  const toggleSelectAll = () => {
    setSelectAll(!selectAll);
    setSelectedRows(!selectAll ? processed.map((c) => c.customer_email || c.customer_name) : []);
  };

  const toggleSelect = (key) => {
    setSelectedRows((prev) => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);
  };

  const exportSelected = () => {
    const selectedData = processed
      .filter((c) => selectedRows.includes(c.customer_email || c.customer_name))
      .map((c) => ({
        name: c.customer_name,
        email: c.customer_email,
        phone: c.customer_phone,
        orders: c.total_orders ?? c.total_invoices,
        spent: c.total_spent,
        last_transaction: c.last_transaction_date,
      }));

    const ws = XLSX.utils.json_to_sheet(selectedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, 'customers_selected.xlsx');
  };

  // No detail navigation — rows are not clickable

  return (
    <div className="leads-table-container">
      <UtilsBar
        buttonLabel="Add Customer"
        onButtonClick={onAddCustomer}
        selectedCount={selectedRows.length}
        onExportSelected={exportSelected}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        sortValue={sortValue}
        onSortChange={setSortValue}
        onDateFilterChange={setDateFilter}
      />

      <div className="table-container">
        <table className="leads-table">
          <thead>
            <tr>
              <th><Checkbox checked={selectAll} onChange={toggleSelectAll} /></th>
              <th>NAME</th>
              <th>EMAIL</th>
              <th>PHONE</th>
              <th>TOTAL ORDERS</th>
              <th>TOTAL SPENT</th>
              <th>LAST TRANSACTION</th>
            </tr>
          </thead>
          <tbody>
            {currentRows.map((c, idx) => (
              <tr key={idx} className="clickable-row">
                <td onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={selectedRows.includes(c.customer_email || c.customer_name)} onChange={() => toggleSelect(c.customer_email || c.customer_name)} />
                </td>
                <td>{c.customer_name || '—'}</td>
                <td>{c.customer_email || '—'}</td>
                <td>{c.customer_phone || '—'}</td>
                <td>{c.total_orders ?? c.total_invoices ?? 0}</td>
                <td>{c.total_spent ?? 0}</td>
                <td>{c.last_transaction_date || '—'}</td>
              </tr>
            ))}

            {!currentRows.length && (
              <tr>
                <td colSpan={7} className="table-empty-message">No customers found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PaginationBar
        currentPage={currentPage}
        totalItems={processed.length}
        itemsPerPage={customersPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default CustomersTable;
