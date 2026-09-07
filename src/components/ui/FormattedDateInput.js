import React, { useEffect, useRef, useState } from 'react';
import { CalendarMonthOutlined } from '@mui/icons-material';
import { formatDate, formatTime12Hour, getDateFormat, parseDateInput, toInputDateValue } from '../../utils/dateFormatter';

const emit = (onChange, name, value) => onChange?.({ target: { name, value } });

export default function FormattedDateInput({ id, name, value = '', onChange, min, max, includeTime = false, disabled = false, required = false, className = '' }) {
  const pickerRef = useRef(null);
  const displayFor = (raw) => {
    if (!raw) return '';
    const date = formatDate(raw);
    if (!includeTime) return date;
    const time = String(raw).match(/[T ](\d{2}:\d{2})/)?.[1] || '';
    return time ? `${date} ${formatTime12Hour(time)}` : date;
  };
  const [display, setDisplay] = useState(() => displayFor(value));
  useEffect(() => setDisplay(displayFor(value)), [value, includeTime]); // eslint-disable-line react-hooks/exhaustive-deps

  const commitTyped = () => {
    if (!display.trim()) { emit(onChange, name, ''); return; }
    const parsed = parseDateInput(display);
    if (!parsed) { setDisplay(displayFor(value)); return; }
    const isoDate = toInputDateValue(parsed);
    emit(onChange, name, includeTime ? `${isoDate}T${String(value).match(/[T ](\d{2}:\d{2})/)?.[1] || '00:00'}` : isoDate);
  };
  const chooseNative = (event) => {
    const next = event.target.value;
    emit(onChange, name, next);
    setDisplay(displayFor(next));
  };
  const openPicker = () => {
    if (disabled) return;
    if (pickerRef.current?.showPicker) pickerRef.current.showPicker();
    else pickerRef.current?.click();
  };

  return <span className={`formatted-date-input ${className}`}>
    <input id={id} name={`${name || ''}_display`} value={display} onChange={(event) => setDisplay(event.target.value)} onBlur={commitTyped} disabled={disabled} required={required} placeholder={includeTime ? `${getDateFormat()} 12:00 PM` : getDateFormat()} inputMode="numeric" />
    <button type="button" onClick={openPicker} disabled={disabled} aria-label="Open calendar"><CalendarMonthOutlined /></button>
    <input ref={pickerRef} className="formatted-date-input__native" type={includeTime ? 'datetime-local' : 'date'} value={includeTime ? String(value || '').replace(' ', 'T').slice(0, 16) : toInputDateValue(value)} min={min} max={max} onChange={chooseNative} tabIndex={-1} aria-hidden="true" />
  </span>;
}
