// src/utils/dateFormatter.js

const isValidDate = (date) => date instanceof Date && !Number.isNaN(date.getTime());
let activeDateFormat = 'DD/MM/YYYY';

export const getDateFormat = () => activeDateFormat;

export const setDateFormat = (format) => {
  activeDateFormat = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].includes(format) ? format : 'DD/MM/YYYY';
};

export const parseDateInput = (dateInput) => {
  if (!dateInput && dateInput !== 0) return null;

  if (dateInput instanceof Date) {
    return isValidDate(dateInput) ? dateInput : null;
  }

  if (typeof dateInput === 'number') {
    const fromNumber = new Date(dateInput);
    return isValidDate(fromNumber) ? fromNumber : null;
  }

  const raw = String(dateInput || '').trim();
  if (!raw) return null;

  const isoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) {
    const parsed = new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]));
    return isValidDate(parsed) ? parsed : null;
  }

  // Parse slash/dash display values according to the saved dashboard format
  // before the browser applies its locale-dependent parser.
  const displayMatch = raw.match(/^(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (displayMatch) {
    const [, first, second, third, hh = '0', min = '0', ss = '0'] = displayMatch;
    const yyyy = activeDateFormat === 'YYYY-MM-DD' ? first : third;
    const mm = activeDateFormat === 'DD/MM/YYYY' ? second : activeDateFormat === 'MM/DD/YYYY' ? first : second;
    const dd = activeDateFormat === 'DD/MM/YYYY' ? first : activeDateFormat === 'MM/DD/YYYY' ? second : third;
    const parsed = new Date(
      Number(yyyy),
      Number(mm) - 1,
      Number(dd),
      Number(hh),
      Number(min),
      Number(ss)
    );
    return isValidDate(parsed) ? parsed : null;
  }

  // Native parser handles ISO datetimes and textual dates.
  const nativeParsed = new Date(raw);
  if (isValidDate(nativeParsed)) return nativeParsed;

  return null;
};

export const toInputDateValue = (dateInput) => {
  const date = parseDateInput(dateInput);
  if (!date) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const formatDate = (dateInput) => {
  const date = parseDateInput(dateInput);
  if (!date) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  if (activeDateFormat === 'MM/DD/YYYY') return `${month}/${day}/${year}`;
  if (activeDateFormat === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
  return `${day}/${month}/${year}`;
};

export const formatTime12Hour = (time) => {
  if (!time) return '';

  const value = String(time).trim();
  const timePart = value.includes('T')
    ? value.split('T')[1]
    : value.includes(' ')
      ? value.split(' ').pop()
      : value;

  const [hourStr, minute = '00'] = String(timePart || '').split(':');
  let hour = parseInt(hourStr, 10);

  if (Number.isNaN(hour)) return '';

  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;

  return `${hour}:${String(minute).padStart(2, '0')} ${ampm}`;
};

export const formatDateTime = (dateInput, time) => {
  const date = formatDate(dateInput);
  const parsed = parseDateInput(dateInput);
  const inferredTime = time || (parsed && (parsed.getHours() || parsed.getMinutes() || parsed.getSeconds())
    ? `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`
    : '');
  const formattedTime = formatTime12Hour(inferredTime);

  if (!date && !formattedTime) return '';

  return formattedTime
    ? `${date} • ${formattedTime}`
    : date;
};
