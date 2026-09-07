import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { Close, DownloadOutlined } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { BACKEND_BASE_URL } from '../services/api';
import '../assets/styles/PublicQuotation.scss';

export default function PublicQuotation() {
  const { token } = useParams();
  const [quotation, setQuotation] = useState(null);
  const [accessCode, setAccessCode] = useState('');
  const [requiresCode, setRequiresCode] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [clarificationOpen, setClarificationOpen] = useState(false);
  const [clarification, setClarification] = useState({ customerName: '', customerEmail: '', message: '' });
  const endpoint = useMemo(() => `${BACKEND_BASE_URL}/api/public/quotations/${token}`, [token]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(endpoint);
      setQuotation(data);
      setRequiresCode(false);
      setMessage('');
    } catch (error) {
      if (error.response?.status === 401 && error.response?.data?.accessCodeRequired) setRequiresCode(true);
      else setMessage(error.response?.data?.error || 'This quotation is unavailable.');
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => { load(); }, [load]);

  const verify = async (event) => {
    event.preventDefault();
    try {
      const { data } = await axios.post(`${endpoint}/verify`, { accessCode });
      setQuotation(data.quotation);
      setRequiresCode(false);
      setMessage('');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Unable to verify the access code.');
    }
  };

  const accept = async () => {
    try {
      const { data } = await axios.post(`${endpoint}/accept`, { accessCode });
      setQuotation((current) => ({ ...current, status: 'approved' }));
      setMessage(data.workOrderId ? 'Quotation accepted. Your order is being prepared.' : 'Quotation accepted.');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Unable to accept this quotation.');
    }
  };

  const requestClarification = async (event) => {
    event.preventDefault();
    try {
      const { data } = await axios.post(`${endpoint}/clarification`, clarification);
      setMessage(data.message || 'Your clarification request has been sent.');
      setClarificationOpen(false);
      setClarification({ customerName: '', customerEmail: '', message: '' });
    } catch (error) {
      setMessage(error.response?.data?.error || 'Unable to send your clarification request.');
    }
  };

  const downloadPdf = async () => {
    try {
      const response = await axios.get(`${BACKEND_BASE_URL}/public/quotations/${quotation.id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${quotation.quotation_number || 'Quotation'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Unable to download this quotation.');
    }
  };

  if (loading) return <main className="public-quotation public-quotation--center"><p>Loading quotation…</p></main>;
  if (requiresCode) return <main className="public-quotation public-quotation--center"><section className="access-card"><span className="eyebrow">Private document</span><h1>Protected quotation</h1><p>Enter the six-digit access code shared with you.</p><form onSubmit={verify}><input aria-label="Six digit access code" value={accessCode} onChange={(event) => setAccessCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" maxLength="6" placeholder="000000" /><button type="submit">View quotation</button></form>{message && <p className="public-error">{message}</p>}</section></main>;
  if (!quotation) return <main className="public-quotation public-quotation--center"><section className="access-card"><h1>Quotation unavailable</h1><p>{message}</p></section></main>;

  return <main className="public-quotation public-quotation--document">
    <header className="public-document-toolbar"><div><span>Quotation</span><strong>{quotation.quotation_number}</strong></div><div><span className={`public-status is-${quotation.status}`}>{quotation.status}</span><button className="clarify-quote" onClick={downloadPdf}><DownloadOutlined />Download PDF</button>{quotation.public_acceptance_enabled && quotation.status !== 'approved' && <button className="clarify-quote" onClick={() => setClarificationOpen(true)}>Ask for clarification</button>}{quotation.public_acceptance_enabled && quotation.status !== 'approved' && <button className="accept-quote" onClick={accept}>Accept quotation</button>}{quotation.status === 'approved' && <span className="public-accepted">Accepted</span>}</div></header>
    <section className="public-document-frame"><iframe title={`Quotation ${quotation.quotation_number}`} srcDoc={quotation.rendered_html || '<p>Quotation preview is unavailable.</p>'} sandbox="allow-same-origin allow-scripts" /></section>
    {message && <div className="public-floating-message">{message}</div>}
    {clarificationOpen && <div className="clarification-overlay" role="dialog" aria-modal="true"><form className="clarification-form" onSubmit={requestClarification}><header><div><h2>Ask for clarification</h2><p>Send a question about this quotation.</p></div><IconButton onClick={() => setClarificationOpen(false)}><Close /></IconButton></header><div className="clarification-form__body"><input aria-label="Your name" placeholder="Your name" value={clarification.customerName} onChange={(event) => setClarification((current) => ({ ...current, customerName: event.target.value }))} /><input aria-label="Your email" type="email" placeholder="Your email" value={clarification.customerEmail} onChange={(event) => setClarification((current) => ({ ...current, customerEmail: event.target.value }))} /><textarea required placeholder="What would you like clarified?" value={clarification.message} onChange={(event) => setClarification((current) => ({ ...current, message: event.target.value }))} /></div><footer><button type="button" onClick={() => setClarificationOpen(false)}>Cancel</button><button type="submit">Send request</button></footer></form></div>}
  </main>;
}
