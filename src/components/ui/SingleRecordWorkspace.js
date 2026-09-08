import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import {
  Add, Check, ChevronLeft, Close, DeleteOutline, DragIndicator, EditOutlined,
  ExpandLess, ExpandMore, FilterList, MoreHoriz, Search, SettingsOutlined,
  UnfoldLess, UnfoldMore,
} from '@mui/icons-material';
import { Drawer, IconButton, Menu, MenuItem, TextField } from '@mui/material';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import NotificationSnackbar from './NotificationSnackbar';
import ConfirmDialog from './ConfirmDialog';
import WgiymEditor from './WgiymEditor';
import FormattedDateInput from './FormattedDateInput';
import '../../assets/styles/SingleRecordWorkspace.scss';
import { formatDate, formatDateTime } from '../../utils/dateFormatter';

const valueText = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.map(valueText).join(', ');
  if (typeof value === 'object') return value.name || value.label || value.value || '—';
  return String(value);
};

const unique = (items) => [...new Set(items)];

const hasDisplayValue = (value) => {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};


const mergeStoredCards = (baseCards, storageKey) => {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (!Array.isArray(stored?.cards)) return baseCards;

    const baseById = new Map(baseCards.map((card) => [card.id, card]));
    const merged = stored.cards.map((savedCard) => {
      const base = baseById.get(savedCard.id);
      if (!base) return null;
      return {
        ...base,
        title: base.titleEditable === false ? base.title : (savedCard.title || base.title),
        position: base.fixed ? base.position : (savedCard.position || base.position),
        fieldKeys: Array.isArray(savedCard.fieldKeys) ? savedCard.fieldKeys : base.fieldKeys,
        deletable: base.deletable,
        fixed: base.fixed,
        variant: base.variant,
        titleEditable: base.titleEditable,
        allowSettings: base.allowSettings,
        nonCollapsible: base.nonCollapsible,
        disableDrag: base.disableDrag,
        defaultCollapsed: base.defaultCollapsed,
      };
    }).filter(Boolean);

    baseCards.forEach((card) => {
      if (!merged.some((item) => item.id === card.id)) merged.push(card);
    });
    return merged;
  } catch (_) {
    return baseCards;
  }
};

const toDateTimeLocalValue = (value) => {
  if (!value) return '';
  const raw = String(value).trim();
  const direct = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
  if (direct) return `${direct[1]}T${direct[2]}`;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const autocompleteFilter = createFilterOptions();

const errorMessage = (error, fallback = 'Something went wrong.') => (
  error?.response?.data?.error
  || error?.response?.data?.details
  || error?.message
  || fallback
);

function FieldValue({ field, value, editing, draft, setDraft, notify }) {
  const [addingOption, setAddingOption] = useState(false);
  const [newOption, setNewOption] = useState('');
  const [savingOption, setSavingOption] = useState(false);
  const [optionError, setOptionError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState('');

  if (!editing) {
    if (field.render) return field.render(value, draft);
    if (field.type === 'date') return value ? formatDate(value) : '—';
    if (field.type === 'datetime') return value ? formatDateTime(value) : '—';
    if (field.type === 'html') return value
      ? <div className="record-rich-value" dangerouslySetInnerHTML={{ __html: value }} />
      : '—';
    return valueText(value);
  }

  if (field.readOnly) return <span className="record-readonly-value">{valueText(value)}</span>;
  const current = draft[field.key] ?? '';

  if (field.type === 'image') {
    const imageSrc = current && field.resolveImage ? field.resolveImage(current) : current;
    const upload = async (file) => {
      if (!file || !field.onUpload || uploadingImage) return;
      setUploadingImage(true);
      setImageError('');
      try {
        const saved = await field.onUpload(file);
        const nextValue = saved?.url ?? saved?.image_url ?? saved?.value ?? saved;
        if (!nextValue) throw new Error('The image upload did not return a file URL.');
        setDraft((state) => ({ ...state, [field.key]: nextValue }));
        notify?.('Image uploaded. Save the card to apply the change.', 'success');
      } catch (error) {
        const message = errorMessage(error, 'Unable to upload image.');
        setImageError(message);
        notify?.(message, 'error');
      } finally {
        setUploadingImage(false);
      }
    };

    return <div className="record-image-editor">
      <div className="record-image-editor__preview">
        {imageSrc ? <img src={imageSrc} alt={field.label || 'Preview'} /> : <span>No image</span>}
      </div>
      <label className="record-image-editor__button">
        {uploadingImage ? 'Uploading…' : imageSrc ? 'Replace image' : 'Add image'}
        <input
          type="file"
          hidden
          accept="image/*"
          disabled={uploadingImage}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) upload(file);
          }}
        />
      </label>
      {imageError && <small className="record-select-editor__error">{imageError}</small>}
    </div>;
  }

  if (field.type === 'autocomplete' || field.type === 'creatable-autocomplete') {
    const options = (field.options || []).map((option) => (
      typeof option === 'string' ? { value: option, label: option } : option
    ));
    const selected = options.find((option) => String(option.value ?? '') === String(current ?? ''))
      || (current ? { value: current, label: String(current) } : null);
    const creatable = field.type === 'creatable-autocomplete';

    const applyOption = async (option) => {
      if (!option) {
        setDraft((state) => ({
          ...state,
          [field.key]: '',
          ...(field.linkedKey ? { [field.linkedKey]: null } : {}),
        }));
        return;
      }

      if (option.inputValue && field.onCreateOption) {
        try {
          const saved = await field.onCreateOption(option.inputValue);
          const normalized = typeof saved === 'string'
            ? { value: saved, label: saved }
            : saved;
          setDraft((state) => ({
            ...state,
            [field.key]: normalized?.value ?? normalized?.label ?? option.inputValue,
            ...(field.linkedKey ? { [field.linkedKey]: normalized?.linkedValue ?? normalized?.id ?? null } : {}),
          }));
          notify?.(`${field.createOptionLabel || 'Option'} created successfully.`, 'success');
        } catch (error) {
          notify?.(errorMessage(error, `Unable to create ${field.createOptionLabel || 'option'}.`), 'error');
        }
        return;
      }

      const normalized = typeof option === 'string' ? { value: option, label: option } : option;
      setDraft((state) => ({
        ...state,
        [field.key]: normalized?.value ?? normalized?.label ?? '',
        ...(field.linkedKey ? { [field.linkedKey]: normalized?.linkedValue ?? normalized?.id ?? null } : {}),
      }));
    };

    return <Autocomplete
      className="record-autocomplete-editor"
      size="small"
      freeSolo={creatable}
      selectOnFocus={creatable}
      clearOnBlur={false}
      handleHomeEndKeys={creatable}
      value={selected}
      options={options}
      getOptionLabel={(option) => {
        if (typeof option === 'string') return option;
        if (option?.inputValue) return option.inputValue;
        return option?.label || option?.name || String(option?.value ?? '');
      }}
      isOptionEqualToValue={(option, selectedValue) => String(option?.value ?? option?.label ?? '') === String(selectedValue?.value ?? selectedValue?.label ?? selectedValue ?? '')}
      filterOptions={(available, params) => {
        const filtered = autocompleteFilter(available, params);
        const inputValue = String(params.inputValue || '').trim();
        if (creatable && inputValue && field.onCreateOption) {
          const exists = available.some((option) => String(option?.label || option?.value || '').toLowerCase() === inputValue.toLowerCase());
          if (!exists) filtered.push({ inputValue, label: `Add "${inputValue}"` });
        }
        return filtered;
      }}
      onChange={(_, nextValue) => {
        if (typeof nextValue === 'string' && creatable) {
          applyOption({ inputValue: nextValue, label: nextValue });
          return;
        }
        applyOption(nextValue);
      }}
      renderOption={(props, option) => <li {...props} key={`${option?.value ?? option?.inputValue ?? option?.label}`}>{option?.inputValue ? `Add "${option.inputValue}"` : option?.label || option?.name || option?.value}</li>}
      renderInput={(params) => <TextField {...params} placeholder={field.placeholder || `Select ${String(field.label || '').toLowerCase()}`} />}
    />;
  }

  if (field.type === 'select') {
    const saveOption = async () => {
      const normalized = newOption.trim();
      if (!normalized || !field.onAddOption || savingOption) return;
      setSavingOption(true);
      setOptionError('');
      try {
        const saved = await field.onAddOption(normalized);
        const nextValue = saved?.value ?? saved?.name ?? saved ?? normalized;
        setDraft((state) => ({ ...state, [field.key]: nextValue }));
        setNewOption('');
        setAddingOption(false);
        notify?.(`${field.addOptionLabel || 'Option'} saved.`, 'success');
      } catch (error) {
        const message = errorMessage(error, 'Unable to save option.');
        setOptionError(message);
        notify?.(message, 'error');
      } finally {
        setSavingOption(false);
      }
    };

    return <div className="record-select-editor">
      {field.onAddOption && <button type="button" className="record-select-editor__add" onClick={() => setAddingOption((shown) => !shown)}><Add />{field.addOptionLabel || 'Add option'}</button>}
      {addingOption && <div className="record-select-editor__new"><input value={newOption} onChange={(event) => setNewOption(event.target.value)} placeholder={field.addOptionPlaceholder || 'New option'} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); saveOption(); } }} /><button type="button" disabled={!newOption.trim() || savingOption} onClick={saveOption}>{savingOption ? 'Saving…' : 'Save'}</button></div>}
      {optionError && <small className="record-select-editor__error">{optionError}</small>}
      <select value={current} onChange={(event) => setDraft((state) => ({ ...state, [field.key]: event.target.value }))}>
        <option value="">Select</option>
        {(field.options || []).map((option) => {
          const item = typeof option === 'string' ? { value: option, label: option } : option;
          return <option key={item.value} value={item.value}>{item.label}</option>;
        })}
      </select>
    </div>;
  }

  if (field.type === 'html') {
    return <WgiymEditor
      value={current}
      onChange={(nextValue) => setDraft((state) => ({ ...state, [field.key]: nextValue }))}
      placeholder={field.placeholder || 'Start typing…'}
    />;
  }

  if (field.type === 'textarea') {
    return <textarea rows="3" value={current} onChange={(event) => setDraft((state) => ({ ...state, [field.key]: event.target.value }))} />;
  }

  if (field.type === 'datetime') {
    return <input type="datetime-local" value={toDateTimeLocalValue(current)} onChange={(event) => setDraft((state) => ({ ...state, [field.key]: event.target.value }))} />;
  }

  if (field.type === 'date') {
    return <FormattedDateInput
      name={field.key}
      value={current}
      min={field.min}
      max={field.max}
      onChange={(event) => setDraft((state) => ({ ...state, [field.key]: event.target.value }))}
    />;
  }

  return <input type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : 'text'} value={current} onChange={(event) => setDraft((state) => ({ ...state, [field.key]: event.target.value }))} />;
}

function RecordCard({ card, index = 0, fieldsByKey, record, onSaveFields, onConfigure, onDelete, onTitleChange, notify, standalone = false }) {
  const isEmpty = typeof card.isEmpty === 'function'
    ? Boolean(card.isEmpty(record))
    : (!card.customContent && !(card.fieldKeys || []).some((key) => hasDisplayValue(record?.[key])));
  const [collapsed, setCollapsed] = useState(Boolean(card.defaultCollapsed || isEmpty));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(record || {});

  useEffect(() => {
    if (!editing) setDraft(record || {});
  }, [record, editing]);

  useEffect(() => {
    if (isEmpty) setCollapsed(true);
  }, [isEmpty]);

  const save = async () => {
    const patch = {};
    const editableKeys = unique((card.fieldKeys || []).flatMap((key) => {
      const linkedKey = fieldsByKey.get(key)?.linkedKey;
      return linkedKey ? [key, linkedKey] : [key];
    }));
    editableKeys.forEach((key) => {
      if (draft[key] !== record?.[key]) patch[key] = draft[key];
    });

    try {
      if (Object.keys(patch).length) await onSaveFields?.(patch);
      setEditing(false);
      notify?.(Object.keys(patch).length ? `${card.title} updated successfully.` : 'No field changes to save.', Object.keys(patch).length ? 'success' : 'info');
    } catch (error) {
      notify?.(errorMessage(error, `Unable to update ${card.title}.`), 'error');
    }
  };

  const article = (provided = null, snapshot = null) => <article
    ref={provided?.innerRef}
    {...(provided?.draggableProps || {})}
    className={`record-card ${snapshot?.isDragging ? 'is-dragging' : ''}`}
  >
    <header className="record-card__header">
      {!standalone && !card.disableDrag && !card.fixed && <span className="record-card__drag" {...(provided?.dragHandleProps || {})} title="Drag card"><DragIndicator /></span>}
      {card.titleEditable !== false && editing
        ? <input className="record-card__title-input" value={card.title} onChange={(event) => onTitleChange(card.id, event.target.value)} />
        : <h2>{card.title}</h2>}
      <div className="record-card__actions">
        {card.editable !== false && card.fieldKeys?.length > 0 && !card.customContent && (editing
          ? <><IconButton size="small" aria-label="Save changes" onClick={save}><Check /></IconButton><IconButton size="small" aria-label="Discard changes" onClick={() => { setDraft(record || {}); setEditing(false); }}><Close /></IconButton></>
          : <IconButton size="small" aria-label="Edit card" onClick={() => setEditing(true)}><EditOutlined /></IconButton>)}
        {card.headerActions?.({ record, notify })}
        {card.allowSettings !== false && <IconButton size="small" aria-label="Configure card" onClick={() => onConfigure(card.id)}><SettingsOutlined /></IconButton>}
        {card.deletable !== false && <IconButton size="small" aria-label="Delete card" onClick={() => onDelete(card.id)}><DeleteOutline /></IconButton>}
        {!card.nonCollapsible && <IconButton size="small" aria-label={collapsed ? 'Expand card' : 'Collapse card'} onClick={() => setCollapsed((value) => !value)}>{collapsed ? <ExpandMore /> : <ExpandLess />}</IconButton>}
      </div>
    </header>
    {!collapsed && <div className="record-card__body">
      {card.customContent ? card.customContent({ record, notify }) : (card.fieldKeys || []).map((key) => {
        const field = fieldsByKey.get(key);
        if (!field) return null;
        return <div className="record-property" key={key}>
          <span>{field.label}</span>
          <div><FieldValue field={field} value={record?.[key]} editing={editing} draft={draft} setDraft={setDraft} notify={notify} /></div>
        </div>;
      })}
      {!card.customContent && !(card.fieldKeys || []).length && <p className="record-empty">Use the settings icon to add properties to this card.</p>}
    </div>}
  </article>;

  if (standalone) return article();

  return <Draggable draggableId={card.id} index={index} isDragDisabled={Boolean(card.disableDrag || card.fixed)}>
    {(provided, snapshot) => article(provided, snapshot)}
  </Draggable>;
}

function SummaryRecordCard({ card, fieldsByKey, record, onSaveFields, onConfigure, notify }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(record || {});
  const [menuAnchor, setMenuAnchor] = useState(null);

  useEffect(() => {
    if (!editing) setDraft(record || {});
  }, [record, editing]);

  const save = async () => {
    const baseKeys = [card.titleFieldKey, ...(card.fieldKeys || [])].filter(Boolean);
    const keys = unique(baseKeys.flatMap((key) => {
      const linkedKey = fieldsByKey.get(key)?.linkedKey;
      return linkedKey ? [key, linkedKey] : [key];
    }));
    const patch = {};
    keys.forEach((key) => {
      if (draft[key] !== record?.[key]) patch[key] = draft[key];
    });

    try {
      if (Object.keys(patch).length) await onSaveFields?.(patch);
      setEditing(false);
      notify?.(Object.keys(patch).length ? 'Record details updated successfully.' : 'No field changes to save.', Object.keys(patch).length ? 'success' : 'info');
    } catch (error) {
      notify?.(errorMessage(error, 'Unable to update record details.'), 'error');
    }
  };

  const actions = typeof card.actions === 'function' ? card.actions({ record, notify }) : (card.actions || []);
  const displayTitle = card.titleFieldKey ? valueText(record?.[card.titleFieldKey]) : (card.displayTitle || card.title || 'Record');
  const titleEditable = Boolean(card.titleFieldKey && !fieldsByKey.get(card.titleFieldKey)?.readOnly);
  const hasEditableFields = [card.titleFieldKey, ...(card.fieldKeys || [])]
    .filter(Boolean)
    .some((key) => !fieldsByKey.get(key)?.readOnly);

  const runAction = async (action) => {
    setMenuAnchor(null);
    try {
      await action.onClick?.({ record, notify });
      if (action.successMessage) notify?.(action.successMessage, 'success');
    } catch (error) {
      notify?.(errorMessage(error, action.errorMessage || 'Unable to complete action.'), 'error');
    }
  };

  return <article className="record-card record-summary-card">
    <header className="record-summary-card__header">
      <Link to={card.backTo} className="record-summary-card__back"><ChevronLeft />{card.backLabel}</Link>
      {!!actions.length && <>
        <button type="button" className="record-summary-card__actions-button" onClick={(event) => setMenuAnchor(event.currentTarget)}>Actions <MoreHoriz /></button>
        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)} MenuListProps={{ className: 'record-action-menu' }}>
          {actions.map((action) => <MenuItem key={action.label} className={action.danger ? 'record-action-menu__danger' : ''} onClick={() => runAction(action)}>{action.icon}{action.label}</MenuItem>)}
        </Menu>
      </>}
    </header>

    <div className="record-summary-card__body">
      <div className="record-summary-card__title-row">
        <div className="record-summary-card__title-wrap">
          {editing && titleEditable
            ? <input className="record-summary-card__title-input" value={draft[card.titleFieldKey] ?? ''} onChange={(event) => setDraft((state) => ({ ...state, [card.titleFieldKey]: event.target.value }))} />
            : <h1>{displayTitle}</h1>}
          {card.subtitle && <p>{card.subtitle}</p>}
        </div>
        <div className="record-summary-card__edit-actions">
          {card.editable !== false && hasEditableFields && (editing
            ? <><IconButton size="small" aria-label="Save changes" onClick={save}><Check /></IconButton><IconButton size="small" aria-label="Discard changes" onClick={() => { setDraft(record || {}); setEditing(false); }}><Close /></IconButton></>
            : <IconButton size="small" aria-label="Edit record summary" onClick={() => setEditing(true)}><EditOutlined /></IconButton>)}
          {card.allowSettings !== false && <IconButton size="small" aria-label="Configure summary card" onClick={() => onConfigure(card.id)}><SettingsOutlined /></IconButton>}
        </div>
      </div>

      <div className="record-summary-card__properties">
        {(card.fieldKeys || []).map((key) => {
          const field = fieldsByKey.get(key);
          if (!field) return null;
          return <div className="record-summary-card__property" key={key}>
            <span>{field.label}</span>
            <div><FieldValue field={field} value={record?.[key]} editing={editing} draft={draft} setDraft={setDraft} notify={notify} /></div>
          </div>;
        })}
      </div>
    </div>
  </article>;
}

function CardColumn({ column, cards, ...props }) {
  return <Droppable droppableId={column}>
    {(provided, snapshot) => <div ref={provided.innerRef} {...provided.droppableProps} className={`record-side-column ${snapshot.isDraggingOver ? 'is-over' : ''}`}>
      {cards.map((card, index) => <RecordCard key={card.id} card={card} index={index} {...props} />)}
      {provided.placeholder}
    </div>}
  </Droppable>;
}

export default function SingleRecordWorkspace({
  storageKey,
  backTo,
  backLabel,
  title,
  subtitle,
  record,
  fields = [],
  initialCards = [],
  summaryCard = null,
  hidePageHeader = false,
  onSaveFields,
  activities = [],
  revenueContent,
  extraTabs = [],
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
  activityTypes = ['call', 'email', 'meeting', 'task', 'note'],
  toolbarActions,
  centerContent,
  centerSummary,
  centerLabel = 'Details',
}) {
  const navigate = useNavigate();
  const fieldsByKey = useMemo(() => new Map(fields.map((field) => [field.key, field])), [fields]);
  const safeCards = useMemo(() => {
    const source = [
      ...(summaryCard ? [{
        id: 'record-summary',
        title: 'Record Summary',
        position: 'left',
        fieldKeys: [],
        deletable: false,
        fixed: true,
        variant: 'summary',
        titleEditable: false,
        ...summaryCard,
      }] : []),
      ...initialCards,
    ];

    return source.map((card, index) => ({
      position: index < 2 ? 'left' : 'right',
      fieldKeys: [],
      deletable: true,
      ...card,
    }));
  }, [initialCards, summaryCard]);

  const [cards, setCards] = useState(() => mergeStoredCards(safeCards, storageKey));
  const hydratedStorageKeyRef = useRef(storageKey);
  const [configCardId, setConfigCardId] = useState(null);
  const [activityDrawer, setActivityDrawer] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [activityDelete, setActivityDelete] = useState(null);
  const [activityTab, setActivityTab] = useState('activities');
  const [activitySearch, setActivitySearch] = useState('');
  const [activityType, setActivityType] = useState('all');
  const [collapseActivities, setCollapseActivities] = useState(false);
  const [activityForm, setActivityForm] = useState({ type: 'note', title: '', description: '', due_date: '', due_time: '', status: 'open' });
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  const notify = (message, severity = 'info') => setNotification({ open: true, message, severity });

  useEffect(() => {
    setCards((current) => {
      if (hydratedStorageKeyRef.current !== storageKey) {
        hydratedStorageKeyRef.current = storageKey;
        return mergeStoredCards(safeCards, storageKey);
      }

      const baseById = new Map(safeCards.map((card) => [card.id, card]));
      const refreshed = current.map((existing) => {
        const base = baseById.get(existing.id);
        if (!base) return null;
        return {
          ...base,
          title: base.titleEditable === false ? base.title : existing.title,
          position: base.fixed ? base.position : existing.position,
          fieldKeys: Array.isArray(existing.fieldKeys) ? existing.fieldKeys : base.fieldKeys,
          deletable: base.deletable,
          fixed: base.fixed,
          variant: base.variant,
          titleEditable: base.titleEditable,
          allowSettings: base.allowSettings,
          nonCollapsible: base.nonCollapsible,
          disableDrag: base.disableDrag,
          defaultCollapsed: base.defaultCollapsed,
        };
      }).filter(Boolean);

      safeCards.forEach((card) => {
        if (!refreshed.some((item) => item.id === card.id)) refreshed.push(card);
      });
      return refreshed;
    });
  }, [safeCards, storageKey]);

  useEffect(() => {
    const persistedCards = cards.map((card) => ({
      id: card.id,
      title: card.title,
      position: card.position,
      fieldKeys: Array.isArray(card.fieldKeys) ? card.fieldKeys : [],
      deletable: card.deletable,
      fixed: card.fixed,
      variant: card.variant,
      titleEditable: card.titleEditable,
      allowSettings: card.allowSettings,
      nonCollapsible: card.nonCollapsible,
      disableDrag: card.disableDrag,
      defaultCollapsed: card.defaultCollapsed,
    }));

    localStorage.setItem(storageKey, JSON.stringify({ cards: persistedCards }));
  }, [cards, storageKey]);

  const configuredCard = cards.find((card) => card.id === configCardId) || null;
  const fixedLeftCards = cards.filter((card) => card.position === 'left' && card.fixed);
  const fixedRightCards = cards.filter((card) => card.position === 'right' && card.fixed);
  const leftCards = cards.filter((card) => card.position === 'left' && !card.fixed);
  const rightCards = cards.filter((card) => card.position === 'right' && !card.fixed);

  const onDragEnd = ({ source, destination, draggableId }) => {
    if (!destination) return;
    const movableCards = cards.filter((card) => !card.fixed);
    const sourceCards = movableCards.filter((card) => card.position === source.droppableId);
    const moving = sourceCards.find((card) => card.id === draggableId);
    if (!moving) return;
    const targetCards = movableCards.filter((card) => card.position === destination.droppableId && card.id !== draggableId);
    targetCards.splice(destination.index, 0, { ...moving, position: destination.droppableId });
    const otherPosition = destination.droppableId === 'left' ? 'right' : 'left';
    const others = movableCards.filter((card) => card.position === otherPosition && card.id !== draggableId);
    const nextMovable = destination.droppableId === 'left' ? [...targetCards, ...others] : [...others, ...targetCards];
    const fixedCards = cards.filter((card) => card.fixed);
    setCards([...fixedCards, ...nextMovable]);
  };

  const updateCard = (id, patch) => setCards((current) => current.map((card) => card.id === id ? { ...card, ...patch } : card));
  const deleteCard = (id) => {
    const card = cards.find((item) => item.id === id);
    setCards((current) => current.filter((item) => item.id !== id));
    notify(`${card?.title || 'Card'} removed.`, 'success');
  };
  const addCard = (position) => {
    const id = `custom-${Date.now()}`;
    setCards((current) => [...current, { id, title: 'New card', position, fieldKeys: fields.slice(0, 4).map((field) => field.key), deletable: true }]);
    setConfigCardId(id);
  };
  const toggleField = (key) => {
    if (!configuredCard) return;
    const next = configuredCard.fieldKeys?.includes(key)
      ? configuredCard.fieldKeys.filter((item) => item !== key)
      : [...(configuredCard.fieldKeys || []), key];
    updateCard(configuredCard.id, { fieldKeys: next });
  };
  const reorderField = (from, to) => {
    if (!configuredCard || from === to) return;
    const next = [...(configuredCard.fieldKeys || [])];
    const [moving] = next.splice(from, 1);
    next.splice(to, 0, moving);
    updateCard(configuredCard.id, { fieldKeys: next });
  };

  const filteredActivities = activities.filter((activity) => {
    const text = `${activity.title || ''} ${activity.description || ''} ${activity.type || ''}`.toLowerCase();
    return (!activitySearch || text.includes(activitySearch.toLowerCase())) && (activityType === 'all' || String(activity.type).toLowerCase() === activityType.toLowerCase());
  });
  const availableActivityTypes = unique([...activityTypes, ...activities.map((activity) => String(activity.type || '').toLowerCase()).filter(Boolean)]);
  const emptyActivityForm = { type: 'note', title: '', description: '', due_date: '', due_time: '', status: 'open' };

  const openAddActivity = () => {
    setEditingActivity(null);
    setActivityForm(emptyActivityForm);
    setActivityDrawer(true);
  };

  const openEditActivity = (activity) => {
    setEditingActivity(activity);
    setActivityForm({
      type: String(activity.type || 'note').toLowerCase(),
      title: activity.title || '',
      description: activity.description || '',
      due_date: activity.due_date ? String(activity.due_date).slice(0, 10) : '',
      due_time: activity.due_time ? String(activity.due_time).slice(0, 5) : '',
      status: activity.status || 'open',
    });
    setActivityDrawer(true);
  };

  const submitActivity = async (event) => {
    event.preventDefault();
    try {
      if (editingActivity) {
        await onUpdateActivity?.(editingActivity.activityId ?? editingActivity.rawId ?? editingActivity.id, activityForm);
        notify('Activity updated successfully.', 'success');
      } else {
        await onAddActivity?.(activityForm);
        notify('Activity added successfully.', 'success');
      }
      setEditingActivity(null);
      setActivityForm(emptyActivityForm);
      setActivityDrawer(false);
    } catch (error) {
      notify(errorMessage(error, editingActivity ? 'Unable to update activity.' : 'Unable to add activity.'), 'error');
    }
  };

  const confirmDeleteActivity = async () => {
    if (!activityDelete) return;
    try {
      await onDeleteActivity?.(activityDelete.activityId ?? activityDelete.rawId ?? activityDelete.id);
      setActivityDelete(null);
      notify('Activity deleted successfully.', 'success');
    } catch (error) {
      notify(errorMessage(error, 'Unable to delete activity.'), 'error');
    }
  };

  const centerTabs = [
    { id: 'activities', label: 'All Activities' },
    { id: 'revenue', label: 'Revenue' },
    ...extraTabs,
  ];
  const activeExtraTab = extraTabs.find((tab) => tab.id === activityTab);

  const renderFixedCard = (card) => card.variant === 'summary'
    ? <SummaryRecordCard key={card.id} card={card} fieldsByKey={fieldsByKey} record={record} onSaveFields={onSaveFields} onConfigure={setConfigCardId} notify={notify} />
    : <RecordCard key={card.id} standalone card={card} fieldsByKey={fieldsByKey} record={record} onSaveFields={onSaveFields} onConfigure={setConfigCardId} onDelete={deleteCard} onTitleChange={(id, value) => updateCard(id, { title: value })} notify={notify} />;

  return <main className={`single-record-workspace ${hidePageHeader ? 'single-record-workspace--no-header' : ''}`}>
    {!hidePageHeader && <div className="record-page-head">
      <Link to={backTo} className="record-back-link"><ChevronLeft />{backLabel}</Link>
      <div className="record-page-title"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div><div>{toolbarActions?.({ record, navigate })}</div></div>
    </div>}

    <DragDropContext onDragEnd={onDragEnd}>
      <div className="record-layout">
        <aside className="record-side-wrap">
          {!!fixedLeftCards.length && <div className="record-fixed-cards">{fixedLeftCards.map(renderFixedCard)}</div>}
          <CardColumn column="left" cards={leftCards} fieldsByKey={fieldsByKey} record={record} onSaveFields={onSaveFields} onConfigure={setConfigCardId} onDelete={deleteCard} onTitleChange={(id, value) => updateCard(id, { title: value })} notify={notify} />
          <button className="record-add-card" type="button" onClick={() => addCard('left')}><Add />Add card</button>
        </aside>

        <section className={`record-center ${centerContent ? 'record-center--custom' : ''}`}>
          {centerContent ? <>
            <div className="record-tabs"><button type="button" className="is-active">{centerLabel}</button></div>
            <div className="record-center-custom-content">{typeof centerContent === 'function' ? centerContent({ record, notify }) : centerContent}</div>
            {centerSummary && <div className="record-center-summary">{typeof centerSummary === 'function' ? centerSummary({ record, notify }) : centerSummary}</div>}
          </> : <>
          <div className="record-tabs">{centerTabs.map((tab) => <button type="button" key={tab.id} className={activityTab === tab.id ? 'is-active' : ''} onClick={() => setActivityTab(tab.id)}>{tab.label}</button>)}</div>
          {activityTab === 'activities' ? <>
            <div className="record-activity-tools">
              <label className="record-activity-search"><Search /><input value={activitySearch} onChange={(event) => setActivitySearch(event.target.value)} placeholder="Search activities" /></label>
              <label className="record-activity-filter"><FilterList /><select value={activityType} onChange={(event) => setActivityType(event.target.value)}><option value="all">All activity types</option>{availableActivityTypes.map((type) => <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>)}</select></label>
              <button type="button" className="record-tool-button" onClick={() => setCollapseActivities((value) => !value)}>{collapseActivities ? <UnfoldMore /> : <UnfoldLess />}{collapseActivities ? 'Expand all' : 'Collapse all'}</button>
              {onAddActivity && <button type="button" className="hs-listing__create" onClick={openAddActivity}><Add />Add Activity</button>}
            </div>
            <div className="record-timeline">
              {filteredActivities.length ? filteredActivities.map((activity, index) => {
                const editable = activity.editable !== false && Boolean(activity.activityId ?? activity.rawId ?? activity.id) && (onUpdateActivity || onDeleteActivity);
                return <article key={activity.id || `${activity.type}-${index}`} className="record-activity">
                  <span className="record-activity__dot" />
                  <header>
                    <div><small>{String(activity.type || 'activity').replace(/_/g, ' ')}</small><h3>{activity.title || 'Activity'}</h3></div>
                    <div className="record-activity__header-right">
                      <time>{activity.created_at ? formatDateTime(activity.created_at) : activity.date ? formatDate(activity.date) : ''}</time>
                      {editable && <div className="record-activity__actions">
                        {onUpdateActivity && <IconButton size="small" aria-label="Edit activity" onClick={() => openEditActivity(activity)}><EditOutlined /></IconButton>}
                        {onDeleteActivity && <IconButton size="small" aria-label="Delete activity" onClick={() => setActivityDelete(activity)}><DeleteOutline /></IconButton>}
                      </div>}
                    </div>
                  </header>
                  {!collapseActivities && <div className="record-activity__body">{activity.description && <p>{activity.description}</p>}{activity.meta && <div>{activity.meta}</div>}</div>}
                </article>;
              }) : <div className="record-empty-state">No activities match the current filters.</div>}
            </div>
          </> : activityTab === 'revenue'
            ? <div className="record-revenue-panel">{revenueContent || <div className="record-empty-state">No revenue information is available yet.</div>}</div>
            : <div className="record-revenue-panel record-custom-tab-panel">{typeof activeExtraTab?.content === 'function' ? activeExtraTab.content({ record, notify }) : activeExtraTab?.content || <div className="record-empty-state">No information is available.</div>}</div>}
          </>}
        </section>

        <aside className="record-side-wrap">
          {!!fixedRightCards.length && <div className="record-fixed-cards">{fixedRightCards.map(renderFixedCard)}</div>}
          <CardColumn column="right" cards={rightCards} fieldsByKey={fieldsByKey} record={record} onSaveFields={onSaveFields} onConfigure={setConfigCardId} onDelete={deleteCard} onTitleChange={(id, value) => updateCard(id, { title: value })} notify={notify} />
          <button className="record-add-card" type="button" onClick={() => addCard('right')}><Add />Add card</button>
        </aside>
      </div>
    </DragDropContext>

    <Drawer anchor="right" open={Boolean(configuredCard)} onClose={() => setConfigCardId(null)} PaperProps={{ className: 'record-config-drawer erp-standard-drawer' }}>
      {configuredCard && <><header className="erp-standard-drawer__header"><div><h2>Configure card</h2><p>Choose the properties shown on this card and drag displayed properties into order.</p></div><IconButton onClick={() => setConfigCardId(null)}><Close /></IconButton></header><div className="erp-standard-drawer__body">
        {configuredCard.titleEditable !== false && <label className="record-config-title"><span>Card title</span><input value={configuredCard.title} onChange={(event) => updateCard(configuredCard.id, { title: event.target.value })} /></label>}
        <h3>Displayed properties</h3>
        {(configuredCard.fieldKeys || []).map((key, index) => <div className="record-config-field" key={key} draggable onDragStart={(event) => event.dataTransfer.setData('card-field-index', index)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => reorderField(Number(event.dataTransfer.getData('card-field-index')), index)}><DragIndicator /><span>{fieldsByKey.get(key)?.label || key}</span><input type="checkbox" checked onChange={() => toggleField(key)} aria-label={`Hide ${fieldsByKey.get(key)?.label || key}`} /></div>)}
        <h3>Available properties</h3>
        {fields.filter((field) => field.key !== configuredCard.titleFieldKey && !(configuredCard.fieldKeys || []).includes(field.key)).map((field) => <div className="record-config-field" key={field.key}><span>{field.label}</span><input type="checkbox" checked={false} onChange={() => toggleField(field.key)} aria-label={`Show ${field.label}`} /></div>)}
      </div><footer className="erp-standard-drawer__footer"><button type="button" className="primary" onClick={() => { setConfigCardId(null); notify('Card layout updated.', 'success'); }}>Done</button></footer></>}
    </Drawer>

    <Drawer anchor="right" open={activityDrawer} onClose={() => { setActivityDrawer(false); setEditingActivity(null); }} PaperProps={{ className: 'record-activity-drawer erp-standard-drawer' }}>
      <header className="erp-standard-drawer__header"><div><h2>{editingActivity ? 'Edit activity' : 'Add activity'}</h2><p>{editingActivity ? 'Update the activity details.' : 'Add a call, email, meeting, task or note to the timeline.'}</p></div><IconButton onClick={() => { setActivityDrawer(false); setEditingActivity(null); }}><Close /></IconButton></header>
      <form onSubmit={submitActivity} className="erp-standard-drawer__form"><div className="erp-standard-drawer__body record-activity-form">
        <label><span>Activity type</span><select value={activityForm.type} onChange={(event) => setActivityForm((current) => ({ ...current, type: event.target.value }))}>{availableActivityTypes.map((type) => <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>)}</select></label>
        <label><span>Title <b>*</b></span><input required value={activityForm.title} onChange={(event) => setActivityForm((current) => ({ ...current, title: event.target.value }))} /></label>
        <label><span>Description</span><textarea rows="6" value={activityForm.description} onChange={(event) => setActivityForm((current) => ({ ...current, description: event.target.value }))} /></label>
        <div className="record-activity-form__row"><label><span>Due date</span><input type="date" value={activityForm.due_date} onChange={(event) => setActivityForm((current) => ({ ...current, due_date: event.target.value }))} /></label><label><span>Due time</span><input type="time" value={activityForm.due_time} onChange={(event) => setActivityForm((current) => ({ ...current, due_time: event.target.value }))} /></label></div>
        <label><span>Status</span><select value={activityForm.status} onChange={(event) => setActivityForm((current) => ({ ...current, status: event.target.value }))}><option value="open">Open</option><option value="completed">Completed</option></select></label>
      </div><footer className="erp-standard-drawer__footer"><button type="button" onClick={() => { setActivityDrawer(false); setEditingActivity(null); }}>Cancel</button><button className="primary" type="submit">{editingActivity ? 'Save activity' : 'Add activity'}</button></footer></form>
    </Drawer>

    <ConfirmDialog
      open={Boolean(activityDelete)}
      title="Delete activity"
      message={`Delete ${activityDelete?.title || 'this activity'}? This action cannot be undone.`}
      confirmText="Delete activity"
      onConfirm={confirmDeleteActivity}
      onCancel={() => setActivityDelete(null)}
    />

    <NotificationSnackbar
      open={notification.open}
      message={notification.message}
      severity={notification.severity}
      onClose={() => setNotification((current) => ({ ...current, open: false }))}
    />
  </main>;
}
