import React, {
  useEffect,
  useMemo,
  useState,
  useRef
} from 'react';
import '../assets/styles/LeadsTable.scss';
import { Checkbox } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import UtilsBar from './UtilsBar';
import PaginationBar from './ui/PaginationBar';
import * as XLSX from 'xlsx';
import { formatDate as formatLocalDate } from '../utils/dateFormatter';
import { toInputDateTimeValue } from '../utils/dateFormatter';
import { formatStatusLabel } from '../utils/statusFormatter';
import { useNotification } from '../context/NotificationContext';

const LeadsTable = ({
  leads,
  visibleFields = [],
  onDelete,
  onBulkDelete,
  leadStatusOptions,
  priorityOptions,
  onUpdateLead,

  // FILTER STATE FROM PARENT
  searchQuery = '',
  setSearchQuery = () => {},
  sortValue = '',
  setSortValue = () => {},
  dateFilter = {},
  setDateFilter = () => {},
  onImportBulk,
}) => {
  const { getUnreadNotificationFor, markRecordNotificationsSeen } = useNotification();

  const resolveLeadBadgeLabel = (lead) => {
    const notification = getUnreadNotificationFor('leads', lead?.id);
    if (!notification) return '';

    const action = String(notification.action || '').toLowerCase();
    return /(create|new|added)/.test(action) ? 'NEW' : 'UPDATED';
  };

  const getBadgeStyle = (label) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 74,
    padding: '3px 8px',
    borderRadius: 999,
    color: '#fff',
    background: label === 'NEW' ? '#e53935' : '#f57c00',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.02em',
  });

  const renderFieldValue = (lead, field) => {
    const value = lead[field];

    if (value === null || value === undefined || value === '') return '—';

    if (field === 'follow_up_date' || field === 'event_date') {
      return formatLocalDate(value) || '—';
    }

    if (field === 'lead_status') {
      return formatStatusLabel(value);
    }

    return value;
  };

  const navigate = useNavigate();
  const leadsPerPage = 20;

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const [currentLead, setCurrentLead] = useState({});
  const [editingField, setEditingField] = useState(null);
  const [tempLead, setTempLead] = useState(null);

  // 🔑 CLICK INTENT TIMER (single vs double click)
  const clickTimerRef = useRef(null);

  /* ================= FILTER + SORT ================= */

  const processedLeads = useMemo(() => {
    let data = [...leads];

    if (dateFilter.startDate || dateFilter.endDate) {
      data = data.filter((lead) => {
        if (!lead.created_at) return false;
        const d = new Date(lead.created_at);
        if (dateFilter.startDate && d < new Date(dateFilter.startDate)) return false;
        if (dateFilter.endDate && d > new Date(dateFilter.endDate)) return false;
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter((lead) =>
        visibleFields.some((field) =>
          lead[field]?.toString().toLowerCase().includes(q)
        )
      );
    }

    switch (sortValue) {
      case 'latest':
        data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'oldest':
        data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'az':
        data.sort((a, b) =>
          String(a.name || '').localeCompare(String(b.name || ''))
        );
        break;
      case 'za':
        data.sort((a, b) =>
          String(b.name || '').localeCompare(String(a.name || ''))
        );
        break;
      default:
        break;
    }

    return data;
  }, [leads, searchQuery, sortValue, dateFilter, visibleFields]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortValue, dateFilter]);

  /* ================= PAGINATION ================= */

  const indexOfLastLead = currentPage * leadsPerPage;
  const indexOfFirstLead = indexOfLastLead - leadsPerPage;
  const currentLeads = processedLeads.slice(indexOfFirstLead, indexOfLastLead);

  /* ================= ROW CLICK (SINGLE CLICK) ================= */

  const handleRowClick = (id) => {
    if (clickTimerRef.current) return;

    clickTimerRef.current = setTimeout(async () => {
      try {
        await markRecordNotificationsSeen('leads', id);
      } catch (err) {
        // non-fatal: proceed to navigate even if marking fails
        console.warn('markRecordNotificationsSeen failed for lead', id, err);
      }

      navigate(`/leads/${id}/edit`);
      clickTimerRef.current = null;
    }, 220);
  };

  /* ================= INLINE EDIT (DOUBLE CLICK) ================= */

  const handleDoubleClick = (lead, field) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }

    setCurrentLead(lead);
    setEditingField(field);
    setTempLead({ ...lead });
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setTempLead((prev) => ({ ...prev, [name]: value }));
  };

  const saveInlineEdit = async () => {
    try {
      await onUpdateLead(tempLead);
      setEditingField(null);
      setTempLead(null);
    } catch (err) {
      console.error(err);
    }
  };

  /* ================= SELECTION ================= */

  const toggleSelectAll = () => {
    setSelectAll(!selectAll);
    setSelectedLeads(!selectAll ? processedLeads.map((l) => l.id) : []);
  };

  const toggleSelectLead = (id) => {
    setSelectedLeads((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  /* ================= EXPORT ================= */

  const exportToExcel = () => {
    const selectedData = leads
      .filter((lead) => selectedLeads.includes(lead.id))
      .map((lead) => {
        const obj = {};
        visibleFields.forEach((f) => (obj[f] = lead[f]));
        return obj;
      });

    const ws = XLSX.utils.json_to_sheet(selectedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Selected Leads');
    XLSX.writeFile(wb, 'selected_leads.xlsx');
  };

  return (
    <div className="leads-table-container">
      <UtilsBar
        buttonLabel="Create Lead"
        onButtonClick={() => navigate('/leads/new')}
        selectedCount={selectedLeads.length}
        onExportSelected={exportToExcel}
        onDeleteSelected={() => {
          if (window.confirm(`Delete ${selectedLeads.length} leads?`)) {
            (async () => {
              try {
                if (typeof onBulkDelete === 'function') {
                  await onBulkDelete(selectedLeads);
                } else {
                  await Promise.all(selectedLeads.map((id) => onDelete(id)));
                }
                setSelectedLeads([]);
                setSelectAll(false);
              } catch (error) {
                console.error('Bulk delete failed:', error);
              }
            })();
          }
        }}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        sortValue={sortValue}
        onSortChange={setSortValue}
        onDateFilterChange={setDateFilter}
        onImportBulk={onImportBulk}
      />

      <div className="table-container">
        <table className="leads-table">
          <thead>
            <tr>
              <th>
                <Checkbox
                  checked={selectAll}
                  onChange={toggleSelectAll}
                />
              </th>
              <th>ALERT</th>
              {visibleFields.map((f) => (
                <th key={f}>
                  {f.replace(/_/g, ' ').toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {currentLeads.map((lead) => {
              const badgeLabel = resolveLeadBadgeLabel(lead);

              return (
                <tr
                  key={lead.id}
                  className="clickable-row"
                  onClick={() => handleRowClick(lead.id)}
                >
                  {/* CHECKBOX */}
                  <td onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedLeads.includes(lead.id)}
                      onChange={() => toggleSelectLead(lead.id)}
                    />
                  </td>

                  <td>
                    {badgeLabel ? (
                      <span style={getBadgeStyle(badgeLabel)}>{badgeLabel}</span>
                    ) : '—'}
                  </td>

                  {/* DATA CELLS */}
                  {visibleFields.map((field) => (
                    <td
                      key={field}
                      onDoubleClick={() =>
                        handleDoubleClick(lead, field)
                      }
                    >
                      {editingField === field &&
                        currentLead.id === lead.id ? (
                        field === 'lead_status' ||
                          field === 'priority' ? (
                          <select
                            name={field}
                            value={tempLead[field] || ''}
                            onChange={handleFieldChange}
                            onBlur={saveInlineEdit}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          >
                            {(field === 'lead_status'
                              ? leadStatusOptions
                              : priorityOptions
                            ).map((option) => (
                              <option key={option} value={option}>
                                {field === 'lead_status' ? formatStatusLabel(option) : option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={
                              field === 'phone_number'
                                ? 'tel'
                                : field === 'follow_up_date'
                                  ? 'datetime-local'
                                  : 'text'
                            }
                            name={field}
                            value={
                              field === 'follow_up_date'
                                ? toInputDateTimeValue(tempLead[field])
                                : (tempLead[field] || '')
                            }
                            onChange={handleFieldChange}
                            onBlur={saveInlineEdit}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        )
                      ) : (
                        <span className="cell-text">
                          {renderFieldValue(lead, field)}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}

            {!currentLeads.length && (
              <tr>
                <td colSpan={visibleFields.length + 2} className="table-empty-message">
                  No leads found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PaginationBar
        currentPage={currentPage}
        totalItems={processedLeads.length}
        itemsPerPage={leadsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default LeadsTable;
