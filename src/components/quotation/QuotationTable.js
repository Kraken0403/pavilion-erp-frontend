import React, { useEffect, useMemo, useState } from 'react';
import '../../assets/styles/LeadsTable.scss'; // reuse same styles
import { Checkbox } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import UtilsBar from '../UtilsBar';
import PaginationBar from '../ui/PaginationBar';
import { updateQuotationStatus } from '../../services/quotationService';
import { useSettings } from "../../context/SettingsContext";

const statusOptions = ['pending', 'approved', 'rejected', 'converted'];

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN');
};

const QuotationsTable = ({
  quotations,
  searchQuery,
  setSearchQuery,
  sortValue,
  setSortValue,
  dateFilter,
  setDateFilter,
  reload
}) => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const currency = settings?.currency_code || '₹';

  const itemsPerPage = 20;
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [editingStatusId, setEditingStatusId] = useState(null);

  /* ================= FILTER + SORT ================= */

  const groupByParent = (rows) => {
    const map = {};
    const result = [];

    rows.forEach(q => {
      const parentId = q.parent_id || q.id;
      if (!map[parentId]) {
        map[parentId] = [];
      }
      map[parentId].push(q);
    });

    Object.values(map)
      .sort((a, b) => {
        const aDate = new Date(a[0].quotation_date);
        const bDate = new Date(b[0].quotation_date);
        return bDate - aDate; // 🔥 latest quotation group first
      })
      .forEach(group => {
        group.sort((a, b) => (a.version || 1) - (b.version || 1));
        result.push(...group);
      });

    return result;
  };

  const processed = useMemo(() => {
    let data = [...quotations];

    // Date filter
    if (dateFilter.startDate || dateFilter.endDate) {
      data = data.filter(q => {
        const d = new Date(q.quotation_date);
        if (dateFilter.startDate && d < new Date(dateFilter.startDate)) return false;
        if (dateFilter.endDate && d > new Date(dateFilter.endDate)) return false;
        return true;
      });
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(row =>
        row.quotation_number?.toLowerCase().includes(q) ||
        row.lead_first_name?.toLowerCase().includes(q) ||
        row.lead_last_name?.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sortValue) {
      case 'latest':
        data.sort((a, b) => new Date(b.quotation_date) - new Date(a.quotation_date));
        break;
      case 'oldest':
        data.sort((a, b) => new Date(a.quotation_date) - new Date(b.quotation_date));
        break;
      default:
        break;
    }

    return groupByParent(data);
  }, [quotations, searchQuery, sortValue, dateFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortValue, dateFilter]);

  /* ================= PAGINATION ================= */

  const indexOfLast = currentPage * itemsPerPage;
  const currentRows = processed.slice(indexOfLast - itemsPerPage, indexOfLast);

  const getLeadName = (q) => {
    const name = `${q.first_name || ''} ${q.last_name || ''}`.trim();
    return name || '—';
  };

  /* ================= SELECTION ================= */

  const toggleSelectAll = () => {
    setSelectAll(!selectAll);
    setSelected(!selectAll ? processed.map(q => q.id) : []);
  };

  const toggleSelect = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  /* ================= STATUS CHANGE ================= */

  const handleStatusChange = async (id, status) => {
    await updateQuotationStatus(id, status);
    reload();
  };

  return (
    <div className="leads-table-container">
      <UtilsBar
        buttonLabel="Create Quotation"
        onButtonClick={() => navigate('/quotation-create')}
        selectedCount={selected.length}
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
              <th>
                <Checkbox checked={selectAll} onChange={toggleSelectAll} />
              </th>
              <th>LEAD</th>
              <th>QUOTATION NO</th>
              <th>DATE</th>
              <th>TOTAL</th>
              <th>VERSION</th>
              <th>STATUS</th>
            </tr>
          </thead>

          <tbody>
            {currentRows.map(q => {
              const isVersion = !!q.parent_id;

              return (
                <tr
                  key={q.id}
                  className={`clickable-row ${isVersion ? 'quotation-version-row' : ''}`}
                  onClick={() => navigate(`/quotations/${q.id}`)}
                >
                  <td onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.includes(q.id)}
                      onChange={() => toggleSelect(q.id)}
                    />
                  </td>

                  <td>{getLeadName(q)}</td>

                  <td>
                    {isVersion ? '↳ ' : ''}
                    {q.quotation_number || '—'}
                  </td>

                  <td>{formatDate(q.quotation_date)}</td>

                  <td>{currency} {q.total_amount}</td>

                  <td>v{q.version}</td>

                  <td onClick={e => e.stopPropagation()}>
                    {editingStatusId === q.id ? (
                      <select
                        className="status-select-inline"
                        value={q.status}
                        autoFocus
                        onBlur={() => setEditingStatusId(null)}
                        onChange={async (e) => {
                          await handleStatusChange(q.id, e.target.value)
                          setEditingStatusId(null)
                        }}
                      >
                        {statusOptions.map(s => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={`status-pill status-${q.status}`}
                        onClick={() => setEditingStatusId(q.id)}
                      >
                        {q.status}
                      </span>
                    )}
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <PaginationBar
        currentPage={currentPage}
        totalItems={processed.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default QuotationsTable;
