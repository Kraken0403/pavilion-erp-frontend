import React, { useEffect, useMemo, useState } from 'react';
import '../../assets/styles/LeadsTable.scss'; // reuse same styles
import { Checkbox } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import UtilsBar from '../UtilsBar';
import PaginationBar from '../ui/PaginationBar';
import ChannelSelectModal from '../ui/ChannelSelectModal';
import { sendQuotationEmailToCustomer, sendQuotationWhatsAppToCustomer, updateQuotationStatus } from '../../services/quotationService';
import { useSettings } from "../../context/SettingsContext";
import { displayCurrency } from '../../utils/currencyUtils';
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
  const currency = displayCurrency(settings?.currency_code);

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
            {(() => {
              const rendered = new Set();
              return currentRows.map(q => {
                if (rendered.has(Number(q.id))) return null;
                const parentKey = q.parent_id || q.id;
                if (rendered.has(parentKey)) return null;

                const group = groupsMap[parentKey] || [];
                // pick the latest entry for this group (sorted desc in groupsMap)
                const latest = group[0] || q;
                const hasVersions = group.length > 1;

                const toggleOpen = (key) => {
                  setOpenParents(prev => ({ ...prev, [key]: !prev[key] }));
                };

                // mark parent and all its members as rendered to avoid duplicates across the page
                rendered.add(parentKey);
                for (const m of group) rendered.add(Number(m.id));

                return (
                  <React.Fragment key={`parent-${parentKey}`}>
                    <tr
                      className={`clickable-row ${latest.parent_id ? 'quotation-version-row' : ''}`}
                      onClick={() => navigate(`/quotations/${latest.id}`)}
                    >
                      <td onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.includes(latest.id)}
                          onChange={() => toggleSelect(latest.id)}
                          />
                          
                          {hasVersions && (
                            <button
                              className="versions-toggle"
                              onClick={(e) => { e.stopPropagation(); toggleOpen(parentKey); }}
                              aria-expanded={!!openParents[parentKey]}
                              title="Show versions"
                            >
                              <span className="versions-icon" aria-hidden>
                                {openParents[parentKey] ? (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M6 9l6 6 6-6" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                ) : (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9 6l6 6-6 6" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </span>
                            </button>
                          )}
                      </td>

                      <td>{getLeadName(latest)}</td>

                      <td>
                        {latest.quotation_number || '—'}
                      </td>

                      <td>{formatDate(latest.quotation_date)}</td>

                      <td>{currency} {latest.total_amount}</td>

                      <td>v{latest.version}</td>

                      <td onClick={e => e.stopPropagation()}>
                        {editingStatusId === latest.id ? (
                          <select
                            className="status-select-inline"
                            value={normalizeStatusValue(latest.status)}
                            autoFocus
                            onBlur={() => setEditingStatusId(null)}
                            onChange={async (e) => {
                              await handleStatusChange(latest.id, e.target.value)
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
                            className={`status-pill status-${normalizeStatusValue(latest.status)}`}
                            onClick={() => setEditingStatusId(latest.id)}
                          >
                            {formatStatusLabel(latest.status)}
                          </span>
                        )}
                      </td>

                    </tr>

                    {/* Render versions when expanded (exclude the latest) */}
                    {openParents[parentKey] && hasVersions && (
                      group.filter(v => Number(v.id) !== Number(latest.id)).map(v => (
                        <tr
                          key={`version-${v.id}`}
                          className="clickable-row version-subrow"
                          onClick={() => navigate(`/quotations/${v.id}`)}
                        >
                          <td onClick={e => e.stopPropagation()}>
                            <Checkbox
                              checked={selected.includes(v.id)}
                              onChange={() => toggleSelect(v.id)}
                            />
                          </td>
                          <td className="version-lead">{getLeadName(v)}</td>
                          <td className="version-quotation">{v.quotation_number || '—'}</td>
                          <td>{formatDate(v.quotation_date)}</td>
                          <td>{currency} {v.total_amount}</td>
                          <td>v{v.version}</td>
                          <td onClick={e => e.stopPropagation()}>
                            <span className={`status-pill status-${normalizeStatusValue(v.status)}`}>{formatStatusLabel(v.status)}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </React.Fragment>
                );
              })
            })()}

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
