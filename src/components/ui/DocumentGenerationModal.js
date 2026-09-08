import React, { useEffect, useState } from 'react';
import { Close, DescriptionOutlined, ReceiptLongOutlined } from '@mui/icons-material';

export default function DocumentGenerationModal({
  open,
  title,
  description,
  confirmLabel,
  loading = false,
  onClose,
  onConfirm,
}) {
  const [options, setOptions] = useState({ proforma: true, taxInvoice: false });
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setOptions({ proforma: true, taxInvoice: false });
    setNotes('');
  }, [open]);

  if (!open) return null;

  const toggle = (key) => setOptions((current) => ({ ...current, [key]: !current[key] }));

  return (
    <div className="erp-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) onClose?.(); }}>
      <section className="erp-choice-modal" role="dialog" aria-modal="true" aria-labelledby="document-generation-title">
        <header>
          <div>
            <h2 id="document-generation-title">{title}</h2>
            <p>{description}</p>
          </div>
          <button type="button" className="erp-choice-modal__close" aria-label="Close" disabled={loading} onClick={onClose}><Close /></button>
        </header>

        <div className="erp-choice-modal__body">
          <div className="erp-document-options">
            <button type="button" className={options.proforma ? 'is-selected' : ''} onClick={() => toggle('proforma')}>
              <span className="erp-document-options__icon"><DescriptionOutlined /></span>
              <span><strong>Generate Proforma Invoice</strong><small>Creates a payment-request document before the final tax invoice.</small></span>
              <i aria-hidden="true">{options.proforma ? '✓' : ''}</i>
            </button>
            <button type="button" className={options.taxInvoice ? 'is-selected' : ''} onClick={() => toggle('taxInvoice')}>
              <span className="erp-document-options__icon"><ReceiptLongOutlined /></span>
              <span><strong>Generate Tax Invoice Directly</strong><small>Creates the final tax invoice immediately.</small></span>
              <i aria-hidden="true">{options.taxInvoice ? '✓' : ''}</i>
            </button>
          </div>
          <p className="erp-choice-modal__hint">Select either option, both options, or leave both unselected to generate no invoice.</p>
          <label className="erp-choice-modal__notes">
            <span>Notes</span>
            <textarea rows="3" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional note for the generated document" />
          </label>
        </div>

        <footer>
          <button type="button" disabled={loading} onClick={onClose}>Cancel</button>
          <button type="button" className="primary" disabled={loading} onClick={() => onConfirm?.({ ...options, notes: notes.trim() })}>{loading ? 'Processing…' : confirmLabel}</button>
        </footer>
      </section>
    </div>
  );
}
