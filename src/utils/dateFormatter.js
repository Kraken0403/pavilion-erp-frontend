// src/utils/dateFormatter.js

const isValidDate = (date) => date instanceof Date && !Number.isNaN(date.getTime());

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

  // Native parser handles ISO dates/datetimes well.
  const nativeParsed = new Date(raw);
  if (isValidDate(nativeParsed)) return nativeParsed;

  // Handle app display dates such as 23/06/2026 or 23-06-2026.
  const dmyMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (dmyMatch) {
    const [, dd, mm, yyyy, hh = '0', min = '0', ss = '0'] = dmyMatch;
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
  const formattedTime = formatTime12Hour(time);

  if (!date && !formattedTime) return '';

  return formattedTime
    ? `${date} • ${formattedTime}`
    : date;
};
