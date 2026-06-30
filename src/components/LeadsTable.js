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
  
  const LeadsTable = ({
    leads,
    visibleFields = [],
    onDelete,
    leadStatusOptions,
    priorityOptions,
    onUpdateLead,
  
    // FILTER STATE FROM PARENT
    searchQuery,
    setSearchQuery,
    sortValue,
    setSortValue,
    dateFilter,
    setDateFilter,
  }) => {
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
  
      clickTimerRef.current = setTimeout(() => {
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
              selectedLeads.forEach(id => onDelete(id));
            }
          }}
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
                  <Checkbox
                    checked={selectAll}
                    onChange={toggleSelectAll}
                  />
                </th>
                {visibleFields.map((f) => (
                  <th key={f}>
                    {f.replace(/_/g, ' ').toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
  
            <tbody>
              {currentLeads.map((lead) => (
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
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={
                              field === 'phone_number'
                                ? 'tel'
                                : field === 'follow_up_date'
                                ? 'date'
                                : 'text'
                            }
                            name={field}
                            value={tempLead[field] || ''}
                            onChange={handleFieldChange}
                            onBlur={saveInlineEdit}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        )
                      ) : (
                        <span className="cell-text">
                          {lead[field] || '—'}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
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
  