import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { useNavigate, useParams } from 'react-router-dom';
import { PictureAsPdfOutlined, ReceiptLongOutlined, RequestQuoteOutlined, ShareOutlined, WorkOutlineOutlined } from '@mui/icons-material';
import SingleRecordWorkspace from '../components/ui/SingleRecordWorkspace';
import RecordFinancialSummary from '../components/ui/RecordFinancialSummary';
import ChannelSelectModal from '../components/ui/ChannelSelectModal';
import NotificationSnackbar from '../components/ui/NotificationSnackbar';
import {
  createTaxInvoiceFromProforma,
  downloadProformaPdf,
  getProformaInvoiceById,
  sendProformaEmail,
  sendProformaWhatsApp,
} from '../services/invoiceService';
import { useSettings } from '../context/SettingsContext';
import { displayCurrency } from '../utils/currencyUtils';
import { formatMoney, formatQty } from '../utils/formatters';
import '../assets/styles/QuotationDetail.scss';

const customerName = (invoice) => [invoice?.first_name, invoice?.last_name].filter(Boolean).join(' ').trim() || invoice?.billing_snapshot?.name || '—';

export default function ProformaInvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings() || {};
  const currency = displayCurrency(settings?.currency_code || 'INR');
  const money = useCallback((value) => formatMoney(value, currency), [currency]);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [creatingTax, setCreatingTax] = useState(false);
  const [notification, setNotification] = useState({ open:false, message:'', severity:'success' });
  const notify = useCallback((message, severity = 'success') => setNotification({ open:true, message, severity }), []);

  const loadInvoice = useCallback(async () => {
    setLoading(true);
    try { setInvoice(await getProformaInvoiceById(id)); }
    catch (error) { setInvoice(null); notify(error?.response?.data?.error || 'Failed to load proforma invoice', 'error'); }
    finally { setLoading(false); }
  }, [id, notify]);

  useEffect(() => { loadInvoice(); }, [loadInvoice]);

  const download = async () => {
    try { await downloadProformaPdf(id); }
    catch (_) { notify('PDF download failed.', 'error'); }
  };

  const createTaxInvoice = async () => {
    if (invoice?.tax_invoice_id) {
      navigate(`/invoices/${invoice.tax_invoice_id}`);
      return;
    }
    setCreatingTax(true);
    try {
      const result = await createTaxInvoiceFromProforma(id);
      const taxId = result?.tax_invoice?.id || result?.tax_invoice?.invoice?.id;
      notify(result?.already_existed ? 'Tax invoice already exists.' : 'Tax invoice created successfully.');
      if (taxId) navigate(`/invoices/${taxId}`);
      else await loadInvoice();
    } catch (error) { notify(error?.response?.data?.error || 'Failed to create tax invoice.', 'error'); }
    finally { setCreatingTax(false); }
  };

  const share = async ({ sendEmail = true, sendWhatsApp = false }) => {
    try {
      if (sendEmail) await sendProformaEmail(id);
      if (sendWhatsApp) await sendProformaWhatsApp(id);
      notify('Proforma invoice shared');
    } catch (_) { notify('Failed to share proforma invoice.', 'error'); }
    finally { setShareOpen(false); }
  };

  const fields = useMemo(() => [
    { key:'status', label:'Status', readOnly:true, render:(value) => <span className={`status-pill status-${String(value || '').toLowerCase()}`}>{String(value || 'issued').toUpperCase()}</span> },
    { key:'issue_date', label:'Issue date', type:'date', readOnly:true },
    { key:'due_date', label:'Due date', type:'date', readOnly:true },
    { key:'customer_name', label:'Customer', readOnly:true },
    { key:'customer_email', label:'Email', readOnly:true },
    { key:'customer_phone', label:'Phone', readOnly:true },
    { key:'subtotal_display', label:'Subtotal', readOnly:true },
    { key:'discount_display', label:'Discount', readOnly:true },
    { key:'tax_display', label:'Tax', readOnly:true },
    { key:'total_display', label:'Grand total', readOnly:true },
  ], []);

  const record = useMemo(() => invoice ? ({
    ...invoice,
    customer_name:customerName(invoice),
    customer_email:invoice.lead?.email || invoice.billing_snapshot?.email || '—',
    customer_phone:invoice.lead?.phone || invoice.billing_snapshot?.phone || '—',
    subtotal_display:money(invoice.display_taxable_subtotal ?? invoice.subtotal),
    discount_display:money(invoice._computed_discount || 0),
    tax_display:money(Number(invoice.cgst_total || 0) + Number(invoice.sgst_total || 0) + Number(invoice.igst_total || 0)),
    total_display:money(invoice.grand_total),
  }) : null, [invoice, money]);

  const cards = useMemo(() => invoice ? [
    { id:'customer-details', title:'Customer Details', position:'left', deletable:false, editable:false, fieldKeys:['customer_name', 'customer_email', 'customer_phone'] },
    { id:'proforma-details', title:'Proforma Invoice Details', position:'left', deletable:false, editable:false, fieldKeys:['issue_date', 'due_date'] },
    { id:'proforma-actions', title:'Actions', position:'right', fixed:true, disableDrag:true, deletable:false, allowSettings:false, titleEditable:false, fieldKeys:[], customContent:() => <div className="record-action-buttons"><button type="button" className="hs-listing__create" title="Download PDF" aria-label="Download PDF" onClick={download}><PictureAsPdfOutlined /></button><button type="button" className="hs-listing__create" title={invoice.tax_invoice_id ? 'Open tax invoice' : 'Create tax invoice'} aria-label={invoice.tax_invoice_id ? 'Open tax invoice' : 'Create tax invoice'} disabled={creatingTax} onClick={createTaxInvoice}><ReceiptLongOutlined /></button><button type="button" className="hs-listing__create" title="Share proforma invoice" aria-label="Share proforma invoice" onClick={() => setShareOpen(true)}><ShareOutlined /></button></div> },
    { id:'related-documents', title:'Related Documents', position:'right', deletable:false, editable:false, fieldKeys:[], customContent:() => <div className="record-related-documents">{invoice.related_documents?.quotation && <a href={`/quotations/${invoice.related_documents.quotation.id}`}><RequestQuoteOutlined /><span>Approved quotation</span><strong>{invoice.related_documents.quotation.quotation_number || `#${invoice.related_documents.quotation.id}`}</strong></a>}{invoice.related_documents?.work_order && <a href={`/workorders/${invoice.related_documents.work_order.id}`}><WorkOutlineOutlined /><span>Work order</span><strong>{invoice.related_documents.work_order.work_order_number || `#${invoice.related_documents.work_order.id}`}</strong></a>}{invoice.tax_invoice_id && <a href={`/invoices/${invoice.tax_invoice_id}`}><ReceiptLongOutlined /><span>Tax invoice</span><strong>{invoice.related_documents?.tax_invoice?.invoice_number || `#${invoice.tax_invoice_id}`}</strong></a>}{!invoice.related_documents?.quotation && !invoice.related_documents?.work_order && !invoice.tax_invoice_id && <small>No related documents have been created yet.</small>}</div> },
    { id:'proforma-totals', title:'Proforma Invoice Totals', position:'right', deletable:false, editable:false, fieldKeys:['subtotal_display', 'discount_display', 'tax_display', 'total_display'] },
  ] : [], [creatingTax, invoice]); // eslint-disable-line react-hooks/exhaustive-deps

  const summaryCard = useMemo(() => invoice ? ({
    titleFieldKey:'invoice_number', backTo:'/proforma-invoices', backLabel:'Proforma invoices', subtitle:customerName(invoice), fieldKeys:['status', 'issue_date', 'due_date'], editable:false,
    actions:[
      { label:'Download PDF', icon:<PictureAsPdfOutlined />, onClick:download },
      { label:invoice.tax_invoice_id ? 'Open tax invoice' : 'Create tax invoice', icon:<ReceiptLongOutlined />, onClick:createTaxInvoice },
      { label:'Share proforma invoice', icon:<ShareOutlined />, onClick:() => setShareOpen(true) },
    ],
  }) : null, [invoice]); // eslint-disable-line react-hooks/exhaustive-deps

  const lineItems = <div className="quotation-order-lines-workspace"><div className="quotation-items-section"><div className="quotation-section-heading qi-section-heading"><div><h2 className="section-title"><span className="sep" />Proforma invoice items</h2><p className="quotation-section-subtitle">Products and proposed billing amounts for this proforma invoice.</p></div></div><div className="qi-table-wrap"><table className="qi-table"><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>GST</th><th>Total</th></tr></thead><tbody>{(invoice?.items || []).length ? invoice.items.map((item) => <tr key={item.id}><td dangerouslySetInnerHTML={{ __html:DOMPurify.sanitize(String(item.description || '—')) }} /><td>{formatQty(item.quantity)}</td><td>{money(item.unit_price)}</td><td>{item.gst_rate || 0}%</td><td>{money(item.line_total)}</td></tr>) : <tr><td colSpan="5" className="empty-lines">No proforma invoice items found.</td></tr>}</tbody></table></div></div></div>;
  const centerSummary = <RecordFinancialSummary items={[
    { key:'subtotal', label:'Subtotal', value:money(invoice?.display_taxable_subtotal ?? invoice?.subtotal) },
    { key:'discount', label:'Discount', value:money(invoice?._computed_discount || 0) },
    { key:'tax', label:'Taxes', value:money(Number(invoice?.cgst_total || 0) + Number(invoice?.sgst_total || 0) + Number(invoice?.igst_total || 0)) },
    { key:'total', label:'Grand Total', value:money(invoice?.grand_total) },
  ]} />;

  if (loading) return <div className="quotation-loading">Loading proforma invoice…</div>;
  if (!invoice) return <div className="quotation-loading">Proforma invoice not found</div>;

  return <>
    <SingleRecordWorkspace storageKey={`pav-erp:record:proforma-invoice:${id}`} backTo="/proforma-invoices" backLabel="Proforma invoices" title={invoice.invoice_number || `Proforma invoice #${id}`} record={record} fields={fields} initialCards={cards} summaryCard={summaryCard} hidePageHeader centerLabel={`Order Lines (${invoice.items?.length || 0})`} centerContent={lineItems} centerSummary={centerSummary} />
    <ChannelSelectModal open={shareOpen} onClose={() => setShareOpen(false)} title={`Share Proforma ${invoice.invoice_number || ''} with ${customerName(invoice)}`} subtitle="Send this proforma invoice by email or WhatsApp." defaultEmail defaultWhatsApp={false} confirmLabel="Share Proforma" onConfirm={share} />
    <NotificationSnackbar open={notification.open} message={notification.message} severity={notification.severity} onClose={() => setNotification((current) => ({ ...current, open:false }))} />
  </>;
}
