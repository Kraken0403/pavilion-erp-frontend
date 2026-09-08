import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CancelOutlined, CheckCircleOutline, PictureAsPdfOutlined, ReceiptLongOutlined, RequestQuoteOutlined } from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import SingleRecordWorkspace from '../components/ui/SingleRecordWorkspace';
import NotificationSnackbar from '../components/ui/NotificationSnackbar';
import DocumentGenerationModal from '../components/ui/DocumentGenerationModal';
import WorkOrderItemsSection from '../components/workorders/WorkOrderItemsSection';
import WorkOrderFooterSection from '../components/workorders/WorkOrderFooterSection';
import { fetchWorkOrderById, generateWorkOrderPdf, updateWorkOrderStatus } from '../services/workOrderServices';
import { createInvoice, createProformaInvoice } from '../services/invoiceService';
import { useSettings } from '../context/SettingsContext';
import { displayCurrency } from '../utils/currencyUtils';
import '../assets/styles/QuotationDetail.scss';

const personName = (record) => [record?.first_name, record?.last_name].filter(Boolean).join(' ') || '—';

export default function WorkOrderDetail() {
  const { id } = useParams();
  const { settings } = useSettings() || {};
  const [workOrder, setWorkOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [completionLoading, setCompletionLoading] = useState(false);
  const [notification, setNotification] = useState({ open:false, message:'', severity:'success' });
  const notify = useCallback((message, severity = 'success') => setNotification({ open:true, message, severity }), []);

  const loadWorkOrder = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWorkOrderById(id);
      setWorkOrder({ ...data, total_amount:Number(data?.total_amount || 0), items:(data?.items || []).map((item) => {
        const quantity = Number(item.quantity || 0); const unitPrice = Number(item.unit_price || 0); const discount = Number(item.discount || 0); const tax = Number(item.tax || 0);
        return { ...item, quantity, unit_price:unitPrice, discount, tax, line_total:Number(item.line_total ?? (quantity * unitPrice - discount + tax)) };
      }) });
    } catch (error) { setWorkOrder(null); notify(error?.response?.data?.error || 'Failed to load work order', 'error'); }
    finally { setLoading(false); }
  }, [id, notify]);

  useEffect(() => { loadWorkOrder(); }, [loadWorkOrder]);
  const changeStatus = async (status) => { try { await updateWorkOrderStatus(id, status); notify('Work order status updated'); await loadWorkOrder(); } catch (error) { notify(error?.response?.data?.error || 'Failed to update work order status', 'error'); } };
  const completeWorkOrder = async ({ proforma, taxInvoice, notes }) => {
    setCompletionLoading(true);
    try {
      await updateWorkOrderStatus(id, 'completed');
      const documentPayload = {
        lead_id: workOrder.lead_id || null,
        source_id: workOrder.id,
        issue_date: new Date().toISOString().slice(0, 10),
        notes: notes || workOrder.notes || null,
        items: (workOrder.items || []).map((item) => ({
          product_id: item.product_id || null,
          description: item.product_name || item.description || 'Item',
          quantity: Number(item.quantity || 0),
          unit_price: Number(item.unit_price || 0),
          discount: Number(item.discount || 0),
          gst_rate: Number(item.gst_rate || 0),
        })),
      };
      if (proforma) await createProformaInvoice({ ...documentPayload, source_type: 'WORK_ORDER_PROFORMA' });
      if (taxInvoice) await createInvoice({ ...documentPayload, source_type: 'WORK_ORDER' });
      setCompletionOpen(false);
      notify([proforma ? 'proforma invoice' : '', taxInvoice ? 'tax invoice' : ''].filter(Boolean).length
        ? `Work order completed and ${[proforma ? 'proforma invoice' : '', taxInvoice ? 'tax invoice' : ''].filter(Boolean).join(' and ')} generated`
        : 'Work order completed without generating an invoice');
      await loadWorkOrder();
    } catch (error) {
      notify(error?.response?.data?.error || error.message || 'Failed to complete work order', 'error');
      await loadWorkOrder();
    } finally {
      setCompletionLoading(false);
    }
  };

  const currency = displayCurrency(settings?.currency_code || 'INR');

  const fields = useMemo(() => [
    { key:'status', label:'Status', readOnly:true, render:(value) => <span className={`status-pill status-${String(value || '').toLowerCase()}`}>{String(value || 'pending').toUpperCase()}</span> },
    { key:'work_order_date', label:'Work order date', type:'date', readOnly:true }, { key:'quotation_number', label:'Quotation', readOnly:true }, { key:'site_name', label:'Site', readOnly:true },
    { key:'client_name', label:'Client', readOnly:true }, { key:'company_name', label:'Company', readOnly:true }, { key:'phone_number', label:'Phone', readOnly:true }, { key:'email', label:'Email', readOnly:true }, { key:'gst_number', label:'GST number', readOnly:true },
    { key:'subtotal_display', label:'Subtotal', readOnly:true }, { key:'discount_display', label:'Discount', readOnly:true }, { key:'total_display', label:'Grand total', readOnly:true },
  ], []);

  const record = useMemo(() => workOrder ? ({ ...workOrder, client_name:personName(workOrder), subtotal_display:`${currency} ${Number(workOrder.display_taxable_subtotal ?? workOrder.subtotal ?? workOrder.total_amount).toFixed(2)}`, discount_display:`${currency} ${Number(workOrder._computed_discount || 0).toFixed(2)}`, total_display:`${currency} ${Number(workOrder.total_amount || 0).toFixed(2)}` }) : null, [currency, workOrder]);
  const cards = useMemo(() => workOrder ? [
    { id:'client-details', title:'Client Details', position:'left', deletable:false, editable:false, fieldKeys:['client_name', 'company_name', 'phone_number', 'email', 'gst_number'] },
    { id:'work-order-details', title:'Work Order Details', position:'left', deletable:false, editable:false, fieldKeys:['work_order_date', 'quotation_number', 'site_name'] },
    { id:'work-order-actions', title:'Actions', position:'right', fixed:true, disableDrag:true, deletable:false, allowSettings:false, titleEditable:false, fieldKeys:[], customContent:() => <div className="record-action-buttons"><button type="button" className="hs-listing__create" title="Download PDF" aria-label="Download PDF" onClick={() => generateWorkOrderPdf(workOrder.id)}><PictureAsPdfOutlined /></button>{workOrder.status !== 'completed' && <button type="button" className="hs-listing__create" title="Mark completed" aria-label="Mark completed" onClick={() => setCompletionOpen(true)}><CheckCircleOutline /></button>}{workOrder.status !== 'cancelled' && <button type="button" className="hs-listing__create" title="Cancel work order" aria-label="Cancel work order" onClick={() => changeStatus('cancelled')}><CancelOutlined /></button>}</div> },
    { id:'related-documents', title:'Related Documents', position:'right', deletable:false, editable:false, fieldKeys:[], customContent:() => <div className="record-related-documents">{workOrder.related_documents?.quotation && <a href={`/quotations/${workOrder.related_documents.quotation.id}`}><RequestQuoteOutlined /><span>Approved quotation</span><strong>{workOrder.related_documents.quotation.quotation_number || `#${workOrder.related_documents.quotation.id}`}</strong></a>}{workOrder.related_documents?.proforma_invoices?.map((invoice) => <a key={`proforma-${invoice.id}`} href={`/proforma-invoices/${invoice.id}`}><PictureAsPdfOutlined /><span>Proforma invoice</span><strong>{invoice.proforma_number || `#${invoice.id}`}</strong></a>)}{workOrder.related_documents?.invoices?.map((invoice) => <a key={`invoice-${invoice.id}`} href={`/invoices/${invoice.id}`}><ReceiptLongOutlined /><span>{String(invoice.source_type || '').toUpperCase().includes('PROFORMA') ? 'Proforma invoice' : 'Tax invoice'}</span><strong>{invoice.invoice_number || `#${invoice.id}`}</strong></a>)}{!workOrder.related_documents?.quotation && !workOrder.related_documents?.proforma_invoices?.length && !workOrder.related_documents?.invoices?.length && <small>No related documents have been created yet.</small>}</div> },
    { id:'totals', title:'Work Order Totals', position:'right', deletable:false, editable:false, fieldKeys:['subtotal_display', 'discount_display', 'total_display'] },
  ] : [], [workOrder]);
  const summaryCard = useMemo(() => workOrder ? ({ titleFieldKey:'work_order_number', backTo:'/workorders', backLabel:'Work orders', subtitle:[workOrder.quotation_number ? `Quotation ${workOrder.quotation_number}` : null, workOrder.site_name].filter(Boolean).join(' · '), fieldKeys:['status', 'work_order_date'], editable:false, actions:[{ label:'Download PDF', icon:<PictureAsPdfOutlined />, onClick:() => generateWorkOrderPdf(workOrder.id) }] }) : null, [workOrder]);

  if (loading) return <div className="quotation-loading">Loading work order…</div>;
  if (!workOrder) return <div className="quotation-loading">Work order not found</div>;
  return <><SingleRecordWorkspace storageKey={`pav-erp:record:work-order:${id}`} backTo="/workorders" backLabel="Work orders" title={workOrder.work_order_number || `Work order #${id}`} record={record} fields={fields} initialCards={cards} summaryCard={summaryCard} hidePageHeader centerLabel={`Order Lines (${workOrder.items.length})`} centerContent={<div className="quotation-order-lines-workspace"><WorkOrderItemsSection items={workOrder.items} /></div>} centerSummary={<WorkOrderFooterSection total={workOrder.total_amount} subtotal={workOrder.display_taxable_subtotal ?? workOrder.subtotal} discount={workOrder._computed_discount} discountPercent={workOrder.discount_percent} taxes={workOrder.taxes} margin={workOrder.margin_amount} marginPercent={workOrder.margin_percent} currency={currency} />} /><DocumentGenerationModal open={completionOpen} title="Complete work order" description="Choose which invoice documents should be generated when this work order is completed." confirmLabel="Complete work order" loading={completionLoading} onClose={() => setCompletionOpen(false)} onConfirm={completeWorkOrder} /><NotificationSnackbar open={notification.open} message={notification.message} severity={notification.severity} onClose={() => setNotification((current) => ({ ...current, open:false }))} /></>;
}
