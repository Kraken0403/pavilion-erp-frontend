import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { useParams } from 'react-router-dom';
import { AddCircleOutline, PictureAsPdfOutlined, ShareOutlined } from '@mui/icons-material';
import SingleRecordWorkspace from '../components/ui/SingleRecordWorkspace';
import NotificationSnackbar from '../components/ui/NotificationSnackbar';
import ChannelSelectModal from '../components/ui/ChannelSelectModal';
import StatusUpdateModal from '../components/invoices/StatusUpdateModal';
import { downloadInvoicePdf, getInvoiceById, sendInvoiceEmail, sendInvoiceWhatsApp } from '../services/invoiceService';
import { formatQty, formatMoney } from '../utils/formatters';
import '../assets/styles/QuotationDetail.scss';

const customerName = (invoice) => [invoice?.first_name, invoice?.last_name].filter(Boolean).join(' ') || '—';
const money = (value) => formatMoney(value);

export default function InvoiceView() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ open:false, message:'', severity:'success' });
  const [shareOpen, setShareOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const notify = useCallback((message, severity = 'success') => setNotification({ open:true, message, severity }), []);
  const loadInvoice = useCallback(async () => { setLoading(true); try { setInvoice(await getInvoiceById(id)); } catch (error) { setInvoice(null); notify(error?.response?.data?.error || 'Failed to load invoice', 'error'); } finally { setLoading(false); } }, [id, notify]);
  useEffect(() => { loadInvoice(); }, [loadInvoice]);
  const download = async () => { try { await downloadInvoicePdf(id); } catch (_) { notify('PDF download failed.', 'error'); } };
  const share = async ({ sendEmail = true, sendWhatsApp = false }) => { try { if (sendEmail) await sendInvoiceEmail(id); if (sendWhatsApp) await sendInvoiceWhatsApp(id); notify('Invoice shared'); } catch (_) { notify('Failed to share invoice.', 'error'); } finally { setShareOpen(false); } };

  const fields = useMemo(() => [
    { key:'status', label:'Status', readOnly:true, render:(value) => <span className={`status-pill status-${String(value || '').toLowerCase()}`}>{value || 'draft'}</span> },
    { key:'issue_date', label:'Issue date', type:'date', readOnly:true }, { key:'due_date', label:'Due date', type:'date', readOnly:true },
    { key:'customer_name', label:'Customer', readOnly:true }, { key:'customer_email', label:'Email', readOnly:true }, { key:'customer_phone', label:'Phone', readOnly:true },
    { key:'subtotal_display', label:'Subtotal', readOnly:true }, { key:'discount_display', label:'Discount', readOnly:true }, { key:'tax_display', label:'Tax', readOnly:true }, { key:'total_display', label:'Grand total', readOnly:true },
  ], []);
  const record = useMemo(() => invoice ? ({ ...invoice, customer_name:customerName(invoice), customer_email:invoice.lead?.email || invoice.billing_snapshot?.email || '—', customer_phone:invoice.lead?.phone || invoice.billing_snapshot?.phone || '—', subtotal_display:money(invoice.display_taxable_subtotal ?? invoice.subtotal), discount_display:money(invoice._computed_discount || 0), tax_display:money(Number(invoice.cgst_total || 0) + Number(invoice.sgst_total || 0) + Number(invoice.igst_total || 0)), total_display:money(invoice.grand_total) }) : null, [invoice]);
  const cards = useMemo(() => invoice ? [
    { id:'customer-details', title:'Customer Details', position:'left', deletable:false, editable:false, fieldKeys:['customer_name', 'customer_email', 'customer_phone'] },
    { id:'invoice-details', title:'Invoice Details', position:'left', deletable:false, editable:false, fieldKeys:['issue_date', 'due_date'] },
    { id:'invoice-actions', title:'Actions', position:'right', fixed:true, disableDrag:true, deletable:false, allowSettings:false, titleEditable:false, fieldKeys:[], customContent:() => <div className="record-action-buttons"><button type="button" className="hs-listing__create" title="Download PDF" aria-label="Download PDF" onClick={download}><PictureAsPdfOutlined /></button><button type="button" className="hs-listing__create" title="Generate receipt" aria-label="Generate receipt" onClick={() => setReceiptOpen(true)}><AddCircleOutline /></button><button type="button" className="hs-listing__create" title="Share invoice" aria-label="Share invoice" onClick={() => setShareOpen(true)}><ShareOutlined /></button></div> },
    { id:'invoice-totals', title:'Invoice Totals', position:'right', deletable:false, editable:false, fieldKeys:['subtotal_display', 'discount_display', 'tax_display', 'total_display'] },
  ] : [], [invoice]);
  const summaryCard = useMemo(() => invoice ? ({ titleFieldKey:'invoice_number', backTo:'/invoices', backLabel:'Invoices', subtitle:customerName(invoice), fieldKeys:['status', 'issue_date', 'due_date'], editable:false, actions:[{ label:'Download PDF', icon:<PictureAsPdfOutlined />, onClick:download }, { label:'Share invoice', icon:<ShareOutlined />, onClick:() => setShareOpen(true) }] }) : null, [invoice]);
  const lineItems = <div className="quotation-order-lines-workspace"><div className="quotation-items-section"><div className="quotation-section-heading qi-section-heading"><div><h2 className="section-title"><span className="sep" />Invoice items</h2><p className="quotation-section-subtitle">Products and billed amounts for this invoice.</p></div></div><div className="qi-table-wrap"><table className="qi-table"><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>GST</th><th>Total</th></tr></thead><tbody>{(invoice?.items || []).length ? invoice.items.map((item) => <tr key={item.id}><td dangerouslySetInnerHTML={{ __html:DOMPurify.sanitize(String(item.description || '—')) }} /><td>{formatQty(item.quantity)}</td><td>{money(item.unit_price)}</td><td>{item.gst_rate || 0}%</td><td>{money(item.line_total)}</td></tr>) : <tr><td colSpan="5" className="empty-lines">No invoice items found.</td></tr>}</tbody></table></div></div></div>;

  if (loading) return <div className="quotation-loading">Loading invoice…</div>;
  if (!invoice) return <div className="quotation-loading">Invoice not found</div>;
  return <><SingleRecordWorkspace storageKey={`pav-erp:record:invoice:${id}`} backTo="/invoices" backLabel="Invoices" title={invoice.invoice_number || `Invoice #${id}`} record={record} fields={fields} initialCards={cards} summaryCard={summaryCard} hidePageHeader centerLabel={`Order Lines (${invoice.items?.length || 0})`} centerContent={lineItems} /><ChannelSelectModal open={shareOpen} onClose={() => setShareOpen(false)} title={`Share Invoice ${invoice.invoice_number || ''} with ${customerName(invoice)}`} subtitle="Send this invoice by email or WhatsApp." defaultEmail defaultWhatsApp={false} confirmLabel="Share Invoice" onConfirm={share} /><StatusUpdateModal open={receiptOpen} invoiceId={id} onClose={() => setReceiptOpen(false)} onSuccess={(message) => { notify(message || 'Receipt generated'); setReceiptOpen(false); loadInvoice(); }} onError={(message) => notify(message || 'Action failed', 'error')} /><NotificationSnackbar open={notification.open} message={notification.message} severity={notification.severity} onClose={() => setNotification((current) => ({ ...current, open:false }))} /></>;
}
