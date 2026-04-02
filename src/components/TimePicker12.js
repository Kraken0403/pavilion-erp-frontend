import React, { useState, useEffect, useRef, useCallback } from 'react'

const pad = (n) => String(Number(n) || 0).padStart(2, '0')

const parseModel = (val) => {
  const raw = String(val || '').trim()
  // match 24h HH:MM or 12h with AM/PM
  const m = raw.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i)
  if (!m) return { hour: new Date().getHours(), minute: new Date().getMinutes(), am: 'AM' }
  const numH = Number(m[1])
  const minutes = pad(m[2])
  const ampm = (m[3] || '').toUpperCase()

  if (ampm === 'AM' || ampm === 'PM') {
    // input was 12-hour
    return { hour: pad(numH % 12 === 0 ? 12 : numH), minute: minutes, am: ampm }
  }

  // assume 24-hour
  const am = numH >= 12 ? 'PM' : 'AM'
  let hh12 = numH % 12
  if (hh12 === 0) hh12 = 12
  return { hour: pad(hh12), minute: minutes, am }
}

const to24 = (hour12, minute, ampm) => {
  let h = Number(hour12)
  if (ampm === 'AM' && h === 12) h = 0
  if (ampm === 'PM' && h < 12) h += 12
  return `${pad(h)}:${pad(minute)}`
}

export default function TimePicker12({ value = '', onChange = () => {}, hourStart = 1, hourEnd = 12, minuteStep = 1, disabled = false, className = '' }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState({ hour: '', minute: '' })
  const [ampm, setAmpm] = useState('AM')

  const rootRef = useRef(null)
  const hourListRef = useRef(null)
  const minuteListRef = useRef(null)

  const scrollToSelected = useCallback(() => {
    if (hourListRef.current) {
      const el = hourListRef.current.querySelector(`[data-hour="${selected.hour}"]`)
      if (el) el.scrollIntoView({ block: 'center' })
    }
    if (minuteListRef.current) {
      const el = minuteListRef.current.querySelector(`[data-minute="${selected.minute}"]`)
      if (el) el.scrollIntoView({ block: 'center' })
    }
  }, [selected.hour, selected.minute])

  useEffect(() => {
    const p = parseModel(value)
    // normalize fallback to padded 12-hour values
    const normHour = typeof p.hour === 'number' ? pad(((p.hour % 12) === 0 ? 12 : (p.hour % 12))) : pad(p.hour)
    const normMinute = typeof p.minute === 'number' ? pad(p.minute) : pad(p.minute)
    const normAm = p.am || 'AM'
    setSelected({ hour: normHour, minute: normMinute })
    setAmpm(normAm)
    // If no explicit value was provided, emit the current time as selected
    if (!value) {
      const out = to24(normHour, normMinute, normAm)
      try { onChange(out) } catch (e) { /* ignore */ }
    }
    // scroll after render
    setTimeout(() => scrollToSelected(), 0)
  }, [value, scrollToSelected, onChange])

  useEffect(() => {
    const onDoc = (e) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    if (open) {
      document.addEventListener('click', onDoc)
      document.addEventListener('keydown', onKey)
    }
    return () => {
      document.removeEventListener('click', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const hours = []
  for (let h = hourStart; h <= hourEnd; h++) hours.push(pad(h))

  const minutes = []
  for (let m = 0; m < 60; m += minuteStep) minutes.push(pad(m))

  

  const setValue = (h, m, am) => {
    const hh = h || selected.hour || pad(hourStart)
    const mm = m || selected.minute || '00'
    const a = am || ampm || 'AM'
    const out = to24(hh, mm, a)
    onChange(out)
  }

  const onHourClick = (h) => {
    setSelected((s) => ({ ...s, hour: h }))
    setTimeout(() => setValue(h, selected.minute, ampm), 0)
    setTimeout(() => scrollToSelected(), 0)
  }

  const onMinuteClick = (m) => {
    setSelected((s) => ({ ...s, minute: m }))
    setTimeout(() => setValue(selected.hour, m, ampm), 0)
    setTimeout(() => scrollToSelected(), 0)
  }

  const onAmpmClick = (a) => {
    setAmpm(a)
    setTimeout(() => setValue(selected.hour, selected.minute, a), 0)
  }

  const displayCollapsed = () => {
    if (!selected.hour || !selected.minute) return `--:-- ${ampm}`
    return `${Number(selected.hour)}:${selected.minute} ${ampm}`
  }

  // Inline styles to match CRM vars and Vue styles
  const styles = {
    root: { fontFamily: 'inherit' },
    // show only a single "cell" in the scroller so selected item is the only visible one
    tpList: { width: '4.8rem', height: '3.2rem', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, background: 'var(--theme-bg, #ffffff)', padding: 4, msOverflowStyle: 'none', scrollbarWidth: 'none' },
    tpItem: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '2.4rem', padding: '6px 8px', textAlign: 'center', borderRadius: 6, background: 'var(--theme-bg, #ffffff)', color: 'var(--theme-text, #000000)', border: 0, margin: '0' },
    tpSelected: { background: 'var(--theme-blue, #1976d2)', color: '#ffffff' },
    tpAmpm: { display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8, height: '3.2rem', alignItems: 'center' },
    collapsedBtn: { padding: '8px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: 'var(--theme-bg, #fff)', color: 'var(--theme-text, #000)', cursor: 'pointer' }
  }

  return (
    <div ref={rootRef} className={`timepicker12 ${className}`} style={styles.root}>
      {!open ? (
        <button
          type="button"
          className="tp-collapsed input"
          style={styles.collapsedBtn}
          onClick={() => !disabled && setOpen(true)}
          onFocus={() => !disabled && setOpen(true)}
          onMouseDown={(e) => { if (!disabled) { e.preventDefault(); setOpen(true); } }}
          tabIndex={0}
          aria-expanded={open}
        >
          {displayCollapsed()}
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div ref={hourListRef} className="tp-list tp-hours" role="listbox" aria-label="Hours" style={styles.tpList}>
            {hours.map((h) => (
              <button type="button" key={h} data-hour={h} onClick={() => onHourClick(h)} style={{ ...styles.tpItem, ...(selected.hour === h ? styles.tpSelected : {}) }} className={`tp-item ${selected.hour === h ? 'tp-selected' : ''}`}>{h}</button>
            ))}
          </div>

          <div ref={minuteListRef} className="tp-list tp-minutes" role="listbox" aria-label="Minutes" style={styles.tpList}>
            {minutes.map((m) => (
              <button type="button" key={m} data-minute={m} onClick={() => onMinuteClick(m)} style={{ ...styles.tpItem, ...(selected.minute === m ? styles.tpSelected : {}) }} className={`tp-item ${selected.minute === m ? 'tp-selected' : ''}`}>{m}</button>
            ))}
          </div>

          <div className="tp-ampm" role="radiogroup" aria-label="AM PM" style={styles.tpAmpm}>
            {['AM','PM'].map((a) => (
              <button key={a} type="button" role="radio" aria-checked={ampm===a} onClick={() => onAmpmClick(a)} style={{ ...styles.tpItem, width: '3.2rem', padding: '6px 8px', borderRadius: 6, ...(ampm === a ? styles.tpSelected : {}) }} className={`tp-item tp-ampm-item ${ampm===a ? 'tp-selected' : ''}`}>{a}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
