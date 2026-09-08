import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Add, Close, DownloadOutlined, DragIndicator, ExpandLess, ExpandMore,
  FilterList, Refresh, Search, SettingsOutlined, Sort, VisibilityOutlined,
} from '@mui/icons-material';
import { Autocomplete, Checkbox, Drawer, IconButton, Popover, TextField } from '@mui/material';
import * as XLSX from 'xlsx';
import '../../assets/styles/HubSpotListing.scss';
import { formatDate, parseDateInput } from '../../utils/dateFormatter';
import FormattedDateInput from './FormattedDateInput';
import { useSettings } from '../../context/SettingsContext';
import { displayCurrency, formatCurrency } from '../../utils/currencyUtils';

const textValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.map(textValue).join(', ');
  if (typeof value === 'object') return value.name || value.label || value.title || value.value || '—';
  return String(value);
};
const humanize = (value) => String(value).replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const normalizeField = (field) => typeof field === 'string'
  ? { key: field, label: humanize(field) }
  : { key: String(field?.key || ''), label: field?.label || humanize(field?.key || ''), options: field?.options || [] };
const isMonetaryField = (key) => {
  const normalized = String(key || '').toLowerCase();
  if (/percent|percentage|rate|qty|quantity|stock/.test(normalized)) return false;
  return /(^|_)(amount|price|cost|total|subtotal|balance|paid|payable|spent|revenue|value)(_|$)/.test(normalized);
};
const fieldKind = (key, rows) => {
  if (/date|time|created|updated|valid_until/i.test(key)) return 'date';
  if (/amount|total|price|cost|revenue|balance|paid|stock|quantity|rate|discount/i.test(key)
    && rows.some((row) => row[key] !== '' && row[key] != null && Number.isFinite(Number(row[key])))) return 'number';
  return 'text';
};
const dateOnly = (value) => {
  const date = parseDateInput(value);
  return date ? new Date(date.getFullYear(), date.getMonth(), date.getDate()) : null;
};
const datePresets = [
  { value: 'today', label: 'Today', description: 'All of today' },
  { value: 'yesterday', label: 'Yesterday', description: 'The previous calendar day' },
  { value: 'tomorrow', label: 'Tomorrow', description: 'The next calendar day' },
  { value: 'this_week', label: 'This week', description: 'The current calendar week' },
  { value: 'between', label: 'Custom date range', description: 'Choose a start and end date' },
];

export default function HubSpotListing({
  title, createLabel, onCreate, rows = [], initialFields = [], onRowOpen,
  onUpdateRow, renderValue, onRefresh, createIcon, tabs, activeTab, onTabChange,
  headerActions, headerContent, customContent, storageKey: customStorageKey,
}) {
  const { settings } = useSettings();
  const currencyLabel = displayCurrency(settings?.currency_code || 'INR');
  const storageKey = customStorageKey || `pav-erp:list:${String(title).toLowerCase().replace(/\s+/g, '-')}`;
  const definitions = useMemo(() => {
    const supplied = initialFields.map(normalizeField).filter((field) => field.key);
    const known = new Set(supplied.map((field) => field.key));
    rows.flatMap((row) => Object.keys(row || {})).filter((key) => !['id', 'password'].includes(key)).forEach((key) => {
      if (!known.has(key)) { supplied.push({ key, label: humanize(key) }); known.add(key); }
    });
    return supplied;
  }, [initialFields, rows]);
  const allKeys = useMemo(() => definitions.map((field) => field.key), [definitions]);
  const labelFor = (key) => {
    const baseLabel = definitions.find((field) => field.key === key)?.label || humanize(key);
    if (!isMonetaryField(key) || baseLabel.includes(`(${currencyLabel})`)) return baseLabel;
    return `${baseLabel} (${currencyLabel})`;
  };
  const saved = useMemo(() => { try { return JSON.parse(localStorage.getItem(storageKey)) || {}; } catch { return {}; } }, [storageKey]);
  const defaultKeys = initialFields.map(normalizeField).map((field) => field.key).filter(Boolean);
  const [fields, setFields] = useState(() => saved.fields?.filter((key) => allKeys.includes(key)).length ? saved.fields.filter((key) => allKeys.includes(key)) : defaultKeys);
  const [widths, setWidths] = useState(() => saved.widths || {});
  const [views, setViews] = useState(() => {
    const storedViews = Array.isArray(saved.views) ? saved.views.filter((view) => view?.id && view?.name) : [];
    const customViews = storedViews.filter((view) => view.id !== 'all');
    const original = storedViews.find((view) => view.id === 'all');
    return [{ ...(original || {}), id: 'all', name: `All ${title}` }, ...customViews];
  });
  const [activeView, setActiveView] = useState('all');
  const [headingOpen, setHeadingOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState([]);
  const [filterBarOpen, setFilterBarOpen] = useState(false);
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [filterDraft, setFilterDraft] = useState({ field: '', operator: 'contains', value: '', endValue: '', search: '' });
  const [sort, setSort] = useState({ field: '', direction: 'asc' });
  const [sortAnchor, setSortAnchor] = useState(null);
  const [sortSearch, setSortSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const scrollRef = useRef(null);
  const activeFields = fields.length ? fields : allKeys.slice(0, 6);

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify({ fields, widths, views })); }, [fields, widths, views, storageKey]);
  useEffect(() => { setVisibleCount(20); }, [query, filters, sort]);
  useEffect(() => {
    setViews((current) => current.map((view) => view.id === activeView
      ? { ...view, filters, sort, query, fields }
      : view));
  }, [activeView, filters, sort, query, fields]);

  const distinctValues = (field) => [...new Set([
    ...(definitions.find((definition) => definition.key === field)?.options || []),
    ...rows.map((row) => row[field]),
  ].filter((value) => value !== null && value !== undefined && value !== '').map((value) => typeof value === 'object' ? value.value ?? value.label : value).map(String))]
    .filter((value) => value.toLowerCase().includes(filterDraft.search.toLowerCase())).slice(0, 100);
  const matchesFilter = (row, filter) => {
    const kind = fieldKind(filter.field, rows);
    if (kind === 'date') {
      const actual = dateOnly(row[filter.field]); if (!actual) return false;
      const today = dateOnly(new Date());
      if (filter.operator === 'today') return actual.getTime() === today.getTime();
      if (filter.operator === 'yesterday') { const target = new Date(today); target.setDate(target.getDate() - 1); return actual.getTime() === target.getTime(); }
      if (filter.operator === 'tomorrow') { const target = new Date(today); target.setDate(target.getDate() + 1); return actual.getTime() === target.getTime(); }
      if (filter.operator === 'this_week') { const start = new Date(today); start.setDate(start.getDate() - start.getDay()); const end = new Date(start); end.setDate(end.getDate() + 6); return actual >= start && actual <= end; }
      const start = dateOnly(filter.value); const end = dateOnly(filter.endValue || filter.value);
      return Boolean(start && end && actual >= start && actual <= end);
    }
    if (kind === 'number') {
      const actual = Number(row[filter.field]); const expected = Number(filter.value);
      if (filter.operator === 'gt') return actual > expected;
      if (filter.operator === 'lt') return actual < expected;
      return actual === expected;
    }
    const actual = textValue(row[filter.field]).toLowerCase(); const expected = String(filter.value).toLowerCase();
    return filter.operator === 'equals' ? actual === expected : actual.includes(expected);
  };
  const filteredRows = useMemo(() => rows.filter((row) => {
    const searchMatch = !query.trim() || activeFields.some((field) => textValue(row[field]).toLowerCase().includes(query.trim().toLowerCase()));
    return searchMatch && filters.every((filter) => matchesFilter(row, filter));
  }).sort((a, b) => {
    if (!sort.field) return 0;
    const kind = fieldKind(sort.field, rows); let result = 0;
    if (kind === 'number') result = Number(a[sort.field] || 0) - Number(b[sort.field] || 0);
    else if (kind === 'date') result = (dateOnly(a[sort.field])?.getTime() || 0) - (dateOnly(b[sort.field])?.getTime() || 0);
    else result = textValue(a[sort.field]).localeCompare(textValue(b[sort.field]), undefined, { numeric: true });
    return sort.direction === 'asc' ? result : -result;
  }), [rows, query, activeFields, filters, sort]); // eslint-disable-line react-hooks/exhaustive-deps
  const visibleRows = filteredRows.slice(0, visibleCount);
  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((row) => selected.includes(row.id));
  const currentSortKind = fieldKind(sort.field || activeFields[0] || '', rows);
  const sortOptions = definitions.filter((field) => field.label.toLowerCase().includes(sortSearch.toLowerCase()));
  const displayValue = (field, value, row) => {
    if (/status/i.test(field) && value !== null && value !== undefined && value !== '') {
      const statusKey = String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return <span className={`status-pill status-${statusKey}`}>{String(value).replace(/_/g, ' ').toUpperCase()}</span>;
    }
    if (fieldKind(field, rows) === 'date' && value) return formatDate(value);
    if (isMonetaryField(field) && value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))) {
      return formatCurrency(value, settings?.currency_code || 'INR');
    }
    return renderValue ? renderValue(field, value, row) : textValue(value);
  };

  const toggleAll = () => setSelected((current) => allVisibleSelected
    ? current.filter((id) => !visibleRows.some((row) => row.id === id))
    : [...new Set([...current, ...visibleRows.map((row) => row.id)])]);
  const resizeColumn = (field, startX, initialWidth) => {
    const move = (event) => setWidths((current) => ({ ...current, [field]: Math.max(110, initialWidth + event.clientX - startX) }));
    const stop = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', stop); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', stop);
  };
  const reorder = (source, destination) => setFields((current) => {
    if (source < 0 || destination < 0 || source === destination) return current;
    const next = [...current]; const [moved] = next.splice(source, 1); next.splice(destination, 0, moved); return next;
  });
  const addView = () => { const id = `view-${Date.now()}`; setViews((current) => [...current, { id, name: 'New view' }]); setActiveView(id); };
  const selectView = (view) => { setActiveView(view.id); setFilters(view.filters || []); setSort(view.sort || { field: '', direction: 'asc' }); setQuery(view.query || ''); if (view.fields?.length) setFields(view.fields); };
  const removeView = (id) => {
    if (id === 'all') return;
    const original = views.find((view) => view.id === 'all');
    setViews((current) => current.filter((view) => view.id !== id));
    if (activeView === id && original) selectView(original);
  };
  const openFilter = (event, field, index = null) => {
    const existing = index == null ? null : filters[index];
    const kind = fieldKind(field, rows);
    setFilterDraft(existing
      ? { ...existing, search: '', index }
      : { field, operator: kind === 'date' ? 'today' : kind === 'number' ? 'equals' : 'contains', value: '', endValue: '', search: '', index });
    setFilterAnchor(event.currentTarget);
  };
  const saveFilter = () => {
    const kind = fieldKind(filterDraft.field, rows);
    const valid = kind === 'date' ? (filterDraft.operator !== 'between' || filterDraft.value) : filterDraft.value !== '';
    if (!filterDraft.field || !valid) return;
    const next = { field: filterDraft.field, operator: filterDraft.operator, value: filterDraft.value, endValue: filterDraft.endValue };
    setFilters((current) => filterDraft.index == null ? [...current, next] : current.map((filter, index) => index === filterDraft.index ? next : filter));
    setFilterAnchor(null);
  };
  const exportRows = () => {
    const source = selected.length ? filteredRows.filter((row) => selected.includes(row.id)) : filteredRows;
    const data = source.map((row) => Object.fromEntries(activeFields.map((field) => [labelFor(field), row[field] ?? ''])));
    const sheet = XLSX.utils.json_to_sheet(data); const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, title.slice(0, 31)); XLSX.writeFile(book, `${title.replace(/\s+/g, '-')}.xlsx`);
  };

  return <section className="hs-listing">
    {headingOpen && <div className="hs-listing__upper"><div className="hs-listing__heading"><h1>{title}</h1><div className="hs-listing__heading-actions">{headerActions}{onCreate && <button className="hs-listing__create" onClick={onCreate}>{createIcon || <Add />}{createLabel || 'Add'}</button>}</div></div><div className="hs-listing__views">{tabs ? tabs.map((tab) => <button key={tab.value} className={`hs-listing__view-button ${activeTab === tab.value ? 'is-selected' : ''}`} onClick={() => onTabChange?.(tab.value)}>{tab.label}</button>) : <>{views.map((view) => <div key={view.id} className={`hs-listing__view ${activeView === view.id ? 'is-selected' : ''}`}><input aria-label="View name" value={view.name} readOnly={view.id === 'all'} onFocus={() => selectView(view)} onClick={() => selectView(view)} onChange={(event) => setViews((current) => current.map((entry) => entry.id === view.id ? { ...entry, name: event.target.value } : entry))} />{view.id !== 'all' && <button onClick={() => removeView(view.id)} aria-label={`Remove ${view.name}`}><Close /></button>}</div>)}<IconButton onClick={addView} aria-label="Create saved view"><Add /></IconButton></>}</div></div>}
    {headerContent}
    {customContent ? <div className="hs-listing__custom-content">{customContent}</div> : <>
    <div className="hs-listing__toolbar"><label className="hs-listing__search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ( / )" />{query && <button onClick={() => setQuery('')} aria-label="Clear search"><Close /></button>}</label><button className={filters.length ? 'is-active' : ''} onClick={() => setFilterBarOpen((open) => !open)}><FilterList />Filter{filters.length ? ` (${filters.length})` : ''}</button><button onClick={(event) => setSortAnchor(event.currentTarget)}><Sort />Sort by</button><span className="hs-listing__spacer" /><button onClick={() => setSettingsOpen(true)}><SettingsOutlined />Edit columns</button>{!tabs && <IconButton className="hs-listing__collapse" onClick={() => setHeadingOpen((open) => !open)} aria-label={headingOpen ? 'Collapse heading' : 'Expand heading'}>{headingOpen ? <ExpandLess /> : <ExpandMore />}</IconButton>}</div>
    {(filterBarOpen || filters.length > 0) && <div className="hs-listing__filterbar"><div className="hs-listing__active-filters">{filters.map((filter, index) => <button key={`${filter.field}-${index}`} className="hs-listing__filter-chip" onClick={(event) => openFilter(event, filter.field, index)}>{labelFor(filter.field)} ({filter.value || filter.operator})<Close onClick={(event) => { event.stopPropagation(); setFilters((current) => current.filter((_, itemIndex) => itemIndex !== index)); }} /></button>)}</div>{filters.length > 0 && <button className="hs-listing__clear" onClick={() => setFilters([])}>Clear all</button>}<span className="hs-listing__filter-divider" />{activeFields.filter((field) => !filters.some((filter) => filter.field === field)).map((field) => <button key={field} className="hs-listing__property" onClick={(event) => openFilter(event, field)}>{labelFor(field)} <ExpandMore /></button>)}</div>}
    <div className="hs-listing__table-scroll" ref={scrollRef} onScroll={() => { const node = scrollRef.current; if (node && node.scrollTop + node.clientHeight >= node.scrollHeight - 50) setVisibleCount((count) => Math.min(count + 20, filteredRows.length)); }}><table><thead><tr><th className="hs-listing__select"><Checkbox size="small" checked={allVisibleSelected} onChange={toggleAll} /></th>{activeFields.map((field, index) => <th key={field} style={{ width: widths[field] || 190 }} draggable onDragStart={(event) => event.dataTransfer.setData('column-index', index)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => reorder(Number(event.dataTransfer.getData('column-index')), index)}><button onClick={() => setSort((current) => ({ field, direction: current.field === field && current.direction === 'asc' ? 'desc' : 'asc' }))}>{labelFor(field)}{sort.field === field && <span>{sort.direction === 'asc' ? '↑' : '↓'}</span>}</button><i onMouseDown={(event) => resizeColumn(field, event.clientX, widths[field] || 190)} /></th>)}<th className="hs-listing__preview-column" /></tr></thead><tbody>{visibleRows.map((row, rowIndex) => <tr key={`${row.id ?? 'row'}-${rowIndex}`} onClick={() => onRowOpen?.(row)}>{/* Prevent row navigation for selection and preview controls. */}<td onClick={(event) => event.stopPropagation()}><Checkbox size="small" checked={selected.includes(row.id)} onChange={() => setSelected((current) => current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id])} /></td>{activeFields.map((field) => <td key={field}>{onUpdateRow ? <button className="hs-listing__cell" onDoubleClick={(event) => { event.stopPropagation(); onUpdateRow(row); }}>{displayValue(field, row[field], row)}</button> : displayValue(field, row[field], row)}</td>)}<td onClick={(event) => event.stopPropagation()}><IconButton size="small" onClick={() => setPreview(row)}><VisibilityOutlined /></IconButton></td></tr>)}{!visibleRows.length && <tr><td className="hs-listing__empty" colSpan={activeFields.length + 2}>No {title.toLowerCase()} match the current filters.</td></tr>}</tbody></table></div>
    <footer className="hs-listing__footer"><span>{selected.length ? `${selected.length} selected · ` : ''}{filteredRows.length} {title.toLowerCase()}</span><div>{onRefresh && <button onClick={onRefresh}><Refresh />Refresh</button>}<button onClick={exportRows}><DownloadOutlined />Export {selected.length ? 'selection' : 'all'}</button></div></footer>
    </>}
    <Popover open={Boolean(filterAnchor)} anchorEl={filterAnchor} onClose={() => setFilterAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}><div className="hs-listing__filter-menu"><strong>{labelFor(filterDraft.field)}</strong>{fieldKind(filterDraft.field, rows) === 'date' ? <><select value="is" aria-label="Date filter operator" disabled><option value="is">Is</option></select><label className="hs-listing__option-search"><Search /><input value={filterDraft.search} onChange={(event) => setFilterDraft((current) => ({ ...current, search: event.target.value }))} placeholder="Search date options" /></label><div className="hs-listing__options hs-listing__date-options">{datePresets.filter((preset) => `${preset.label} ${preset.description}`.toLowerCase().includes(filterDraft.search.toLowerCase())).map((preset) => <button className={filterDraft.operator === preset.value ? 'is-selected' : ''} onClick={() => setFilterDraft((current) => ({ ...current, operator: preset.value, value: preset.value === 'between' ? current.value : '', endValue: preset.value === 'between' ? current.endValue : '' }))} key={preset.value}><strong>{preset.label}</strong><span>{preset.description}</span></button>)}</div>{filterDraft.operator === 'between' && <div className="hs-listing__date-range"><FormattedDateInput name="start_date" value={filterDraft.value} onChange={(event) => setFilterDraft((current) => ({ ...current, value: event.target.value }))} /><FormattedDateInput name="end_date" value={filterDraft.endValue} onChange={(event) => setFilterDraft((current) => ({ ...current, endValue: event.target.value }))} /></div>}</> : fieldKind(filterDraft.field, rows) === 'number' ? <><select value={filterDraft.operator} onChange={(event) => setFilterDraft((current) => ({ ...current, operator: event.target.value }))}><option value="equals">Is equal to</option><option value="gt">Is greater than</option><option value="lt">Is less than</option></select><input type="number" value={filterDraft.value} onChange={(event) => setFilterDraft((current) => ({ ...current, value: event.target.value }))} /></> : <><select value={filterDraft.operator} onChange={(event) => setFilterDraft((current) => ({ ...current, operator: event.target.value }))}><option value="contains">Contains</option><option value="equals">Is exactly</option></select><label className="hs-listing__option-search"><Search /><input value={filterDraft.search} onChange={(event) => setFilterDraft((current) => ({ ...current, search: event.target.value }))} placeholder="Search options" /></label><div className="hs-listing__options">{distinctValues(filterDraft.field).map((value) => <button className={filterDraft.value === value ? 'is-selected' : ''} onClick={() => setFilterDraft((current) => ({ ...current, value }))} key={value}>{value}</button>)}</div></>}<div className="hs-listing__filter-actions"><button onClick={() => setFilterAnchor(null)}>Cancel</button><button className="primary" onClick={saveFilter}>Apply filter</button></div></div></Popover>
    <Popover open={Boolean(sortAnchor)} anchorEl={sortAnchor} onClose={() => setSortAnchor(null)} anchorOrigin={{ vertical:'bottom', horizontal:'left' }} transformOrigin={{ vertical:'top', horizontal:'left' }}><div className="hs-listing__sort-menu"><strong>Sort by</strong><Autocomplete size="small" options={sortOptions} value={definitions.find((field) => field.key === sort.field) || null} inputValue={sortSearch} onInputChange={(_, value) => setSortSearch(value)} onChange={(_, field) => setSort((current) => ({ ...current, field: field?.key || '' }))} getOptionLabel={(field) => labelFor(field.key)} isOptionEqualToValue={(field, value) => field.key === value.key} renderInput={(params) => <TextField {...params} placeholder="Search properties" />} /><div><button className={sort.direction === 'asc' ? 'is-selected' : ''} onClick={() => setSort((current) => ({ ...current, direction: 'asc' }))}>{currentSortKind === 'date' ? 'Oldest' : currentSortKind === 'number' ? 'Lowest' : 'A–Z'}</button><button className={sort.direction === 'desc' ? 'is-selected' : ''} onClick={() => setSort((current) => ({ ...current, direction: 'desc' }))}>{currentSortKind === 'date' ? 'Most recent' : currentSortKind === 'number' ? 'Highest' : 'Z–A'}</button></div></div></Popover>
    <Drawer anchor="right" open={settingsOpen} onClose={() => setSettingsOpen(false)} PaperProps={{ className: 'hs-listing__drawer' }}><div className="hs-listing__drawer-head"><div><strong>Edit columns</strong><span>Choose fields, set their widths, and drag them into order.</span></div><IconButton onClick={() => setSettingsOpen(false)}><Close /></IconButton></div><div className="hs-listing__drawer-body"><h4>Displayed fields</h4>{fields.map((field, index) => <div className="hs-listing__field" draggable onDragStart={(event) => event.dataTransfer.setData('drawer-column-index', index)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => reorder(Number(event.dataTransfer.getData('drawer-column-index')), index)} key={field}><DragIndicator /><span>{labelFor(field)}</span><label className="hs-listing__width"><input aria-label={`${labelFor(field)} width`} type="number" min="110" max="600" value={widths[field] || 190} onChange={(event) => setWidths((current) => ({ ...current, [field]: Math.max(110, Number(event.target.value) || 110) }))} /><span>px</span></label><input className="hs-listing__field-checkbox" type="checkbox" checked onChange={() => setFields((current) => current.filter((key) => key !== field))} /></div>)}<h4>Available fields</h4>{definitions.filter((field) => !fields.includes(field.key)).map((field) => <div className="hs-listing__field" key={field.key}><span>{labelFor(field.key)}</span><input className="hs-listing__field-checkbox" type="checkbox" checked={false} onChange={() => setFields((current) => [...current, field.key])} /></div>)}</div><div className="hs-listing__drawer-footer"><button onClick={() => setSettingsOpen(false)}>Done</button></div></Drawer>
    <Drawer anchor="right" open={Boolean(preview)} onClose={() => setPreview(null)} PaperProps={{ className: 'hs-listing__drawer' }}>{preview && <><div className="hs-listing__drawer-head"><strong>{preview.name || preview.quotation_number || preview.id}</strong><IconButton onClick={() => setPreview(null)}><Close /></IconButton></div><div className="hs-listing__preview-body">{activeFields.map((field) => <div key={field}><small>{labelFor(field)}</small><p>{displayValue(field, preview[field], preview)}</p></div>)}</div></>}</Drawer>
  </section>;
}
