import React, { useEffect, useMemo, useState } from 'react';
import '../../assets/styles/LeadsTable.scss'; // reuse same styles
import { Checkbox } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import UtilsBar from '../UtilsBar';
import PaginationBar from '../ui/PaginationBar';
import ChannelSelectModal from '../ui/ChannelSelectModal';
import { sendQuotationEmailToCustomer, sendQuotationWhatsAppToCustomer, updateQuotationStatus } from '../../services/quotationService';
import { useSettings } from "../../context/SettingsContext";
import { formatStatusLabel, normalizeStatusValue } from '../../utils/statusFormatter';
import { parseDateInput } from '../../utils/dateFormatter';

const statusOptions = ['pending', 'approved', 'rejected', 'converted'];

const formatDate = (iso) => {
  if (!iso) return '—';
  const parsed = parseDateInput(iso);
  if (!parsed) return '—';
  return parsed.toLocaleDateString('en-IN');
};

const QuotationsTable = ({
  quotations,
  searchQuery,
  setSearchQuery,
  sortValue,
  setSortValue,
  dateFilter,
  setDateFilter,
  reload,
  onNotify
}) => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const currency = settings?.currency_code || '₹';

  const itemsPerPage = 20;
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [editingStatusId, setEditingStatusId] = useState(null);
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [openParents, setOpenParents] = useState({});

  /* ================= FILTER + SORT ================= */

  const groupByParent = (rows, sort) => {
    const map = {};
    const result = [];

    rows.forEach(q => {
      const parentId = q.parent_id || q.id;
      if (!map[parentId]) {
        map[parentId] = [];
      }
      map[parentId].push(q);
    });

    const groups = Object.values(map);
    const withMeta = groups.map((group) => {
      const sortedByVersion = [...group].sort((a, b) => (a.version || 1) - (b.version || 1));
      const parentRow = sortedByVersion.find((row) => !row.parent_id) || sortedByVersion[0];

      const timestamps = sortedByVersion
        .map((row) => parseDateInput(row.quotation_date)?.getTime() || 0)
        .filter((value) => Number.isFinite(value));

      const latestTimestamp = timestamps.length ? Math.max(...timestamps) : 0;
      const oldestTimestamp = timestamps.length ? Math.min(...timestamps) : 0;
      const quotationNumber = String(parentRow?.quotation_number || '').trim();

      return {
        rows: [...sortedByVersion].sort((a, b) => {
          const versionDiff = Number(b.version || 1) - Number(a.version || 1);
          if (versionDiff !== 0) return versionDiff;
          return Number(b.id || 0) - Number(a.id || 0);
        }),
        latestTimestamp,
        oldestTimestamp,
        quotationNumber,
        maxId: Math.max(...sortedByVersion.map((row) => Number(row.id || 0)), 0),
      };
    });

    // Sort groups based on selected sort value
    switch (sort) {
      case 'oldest':
        withMeta.sort((a, b) => {
          const diff = a.oldestTimestamp - b.oldestTimestamp;
          if (diff !== 0) return diff;
          return a.maxId - b.maxId;
        });
        break;
      case 'az':
        withMeta.sort((a, b) =>
          a.quotationNumber.localeCompare(b.quotationNumber, undefined, { numeric: true, sensitivity: 'base' })
        );
        break;
      case 'za':
        withMeta.sort((a, b) =>
          b.quotationNumber.localeCompare(a.quotationNumber, undefined, { numeric: true, sensitivity: 'base' })
        );
        break;
      case 'latest':
      default:
        withMeta.sort((a, b) => {
          const diff = b.latestTimestamp - a.latestTimestamp;
          if (diff !== 0) return diff;
          return b.maxId - a.maxId;
        });
        break;
    }

    withMeta.forEach((group) => {
      result.push(...group.rows);
    });

    return result;
  };

  const processed = useMemo(() => {
    let data = [...quotations];

    // Date filter
    if (dateFilter.startDate || dateFilter.endDate) {
      data = data.filter(q => {
        const d = parseDateInput(q.quotation_date);
        if (!d) return false;

        const startDate = dateFilter.startDate ? parseDateInput(dateFilter.startDate) : null;
        if (startDate && d < startDate) return false;

        if (dateFilter.endDate) {
          const end = parseDateInput(dateFilter.endDate);
          if (!end) return false;
          end.setHours(23, 59, 59, 999);
          if (d > end) return false;
        }
        return true;
      });
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(row =>
        row.quotation_number?.toLowerCase().includes(q) ||
        row.first_name?.toLowerCase().includes(q) ||
        row.last_name?.toLowerCase().includes(q) ||
        row.status?.toLowerCase().includes(q)
      );
    }

    return groupByParent(data, sortValue);
  }, [quotations, searchQuery, sortValue, dateFilter]);

  // Map parentId => rows for quick lookup (used for dropdown rendering)
  const groupsMap = useMemo(() => {
    const m = {};
    (quotations || []).forEach(q => {
      const parentId = q.parent_id || q.id;
      if (!m[parentId]) m[parentId] = [];
      m[parentId].push(q);
    });
    Object.keys(m).forEach(k => {
      m[k].sort((a, b) => (b.version || 0) - (a.version || 0));
    });
    return m;
  }, [quotations]);

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

  const handleSendEmails = async () => {
    if (!selected.length) return;

    const uniqueSelectedIds = [...new Set(selected)];

    const results = await Promise.allSettled(
      uniqueSelectedIds.map((id) => sendQuotationEmailToCustomer(id))
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failedCount = results.length - successCount;

    if (failedCount === 0) {
      onNotify?.(`Email sent for ${successCount} quotation(s)`, 'success');
    } else if (successCount === 0) {
      onNotify?.('Failed to send quotation emails', 'error');
    } else {
      onNotify?.(`Sent ${successCount}, failed ${failedCount} quotation email(s)`, 'warning');
    }
  };

  const handleSendWhatsApp = async () => {
    if (!selected.length) return;

    const uniqueSelectedIds = [...new Set(selected)];

    const results = await Promise.allSettled(
      uniqueSelectedIds.map((quotationId) => sendQuotationWhatsAppToCustomer(quotationId))
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failedCount = results.length - successCount;

    if (failedCount === 0) {
      onNotify?.(`WhatsApp sent for ${successCount} quotation(s)`, 'success');
    } else if (successCount === 0) {
      onNotify?.('Failed to send quotation WhatsApp notifications', 'error');
    } else {
      onNotify?.(`Sent ${successCount}, failed ${failedCount} quotation WhatsApp notification(s)`, 'warning');
    }
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
        onSendEmail={() => setChannelModalOpen(true)}
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
              const parentId = q.parent_id || q.id;
              const parentRow = !q.parent_id && (groupsMap[q.id] && groupsMap[q.id].length > 1);

              const toggleOpen = (id) => {
                setOpenParents(prev => ({ ...prev, [id]: !prev[id] }));
              };

              return (
                <React.Fragment key={q.id}>
                  <tr
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
                      {/* If this is the parent row and has versions, show a toggle chevron */}
                      {!isVersion && parentRow && (
                        <button
                          className="versions-toggle"
                          onClick={(e) => { e.stopPropagation(); toggleOpen(q.id); }}
                          aria-expanded={!!openParents[q.id]}
                        >
                          {openParents[q.id] ? '▾' : '▸'}
                        </button>
                      )}

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
                          value={normalizeStatusValue(q.status)}
                          autoFocus
                          onBlur={() => setEditingStatusId(null)}
                          onChange={async (e) => {
                            await handleStatusChange(q.id, e.target.value)
                            setEditingStatusId(null)
                          }}
                        >
                          {statusOptions.map(s => (
                            <option key={s} value={s}>
                              {formatStatusLabel(s)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`status-pill status-${normalizeStatusValue(q.status)}`}
                          onClick={() => setEditingStatusId(q.id)}
                        >
                          {formatStatusLabel(q.status)}
                        </span>
                      )}
                    </td>

                  </tr>

                  {/* Render dropdown area when parent row is expanded */}
                  {!isVersion && openParents[q.id] && groupsMap[q.id] && groupsMap[q.id].length > 1 && (
                    <tr className="versions-dropdown-row">
                      <td colSpan={7}>
                        <div className="versions-dropdown">
                          {(groupsMap[q.id] || [])
                            .filter(v => v.id !== q.id)
                            .map(v => (
                              <div
                                key={v.id}
                                className="version-item"
                                onClick={() => navigate(`/quotations/${v.id}`)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/quotations/${v.id}`); }}
                              >
                                <div className="vi-number">{v.quotation_number}</div>
                                <div className="vi-date">{formatDate(v.quotation_date)}</div>
                                <div className="vi-total">{currency} {v.total_amount}</div>
                                <div className="vi-version">v{v.version}</div>
                                <div className="vi-status"><span className={`status-pill status-${normalizeStatusValue(v.status)}`}>{formatStatusLabel(v.status)}</span></div>
                              </div>
                            ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {!currentRows.length && (
              <tr>
                <td colSpan={7} className="table-empty-message">
                  No quotations found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PaginationBar
        currentPage={currentPage}
        totalItems={processed.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />

      <ChannelSelectModal
        open={channelModalOpen}
        onClose={() => setChannelModalOpen(false)}
        title="Send Quotation Notifications"
        subtitle="Choose channels for selected quotations"
        defaultEmail
        defaultWhatsApp
        confirmLabel="Send Notifications"
        onConfirm={async ({ sendEmail = true, sendWhatsApp = false }) => {
          setChannelModalOpen(false);
          if (sendEmail) {
            await handleSendEmails();
          }
          if (sendWhatsApp) {
            await handleSendWhatsApp();
          }
        }}
      />
    </div>
  );
};

export default QuotationsTable;
