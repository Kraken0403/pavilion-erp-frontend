import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import {
  Add, CheckCircleOutline, ContentCopyOutlined, FileCopyOutlined, LinkOutlined,
  OpenInNewOutlined, PictureAsPdfOutlined, SaveOutlined, WorkOutlineOutlined,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import SingleRecordWorkspace from '../ui/SingleRecordWorkspace';
import NotificationSnackbar from '../ui/NotificationSnackbar';
import AddLeadDialog from '../leads/AddLeadDialog';
import QuotationItemsSection from './QuotationItemsSection';
import QuotationSummary from './QuotationSummary';
import QuotationProductPickerDrawer from './QuotationProductPickerDrawer';
import { createWorkOrderFromQuotation } from '../../services/workOrderServices';
import {
  createPublicQuotationLink,
  createQuotation,
  fetchQuotationById,
  generateQuotationPdf,
  updateQuotation,
  updateQuotationItems,
  updateQuotationStatus,
} from '../../services/quotationService';
import { fetchLeads } from '../../services/leadService';
import { fetchAllProducts } from '../../services/productServices';
import { useSettings } from '../../context/SettingsContext';
import { calculateQuotationTotals } from '../../utils/quotationCalculator';
import { displayCurrency } from '../../utils/currencyUtils';
import { formatDateTime } from '../../utils/dateFormatter';
import '../../assets/styles/QuotationDetail.scss';

const COST_PRICING_MODES = ['absolute', 'percentage'];
const normalizeCostMode = (mode) => COST_PRICING_MODES.includes(mode) ? mode : 'absolute';
const leadName = (lead) => lead?.name || `${lead?.first_name || ''} ${lead?.last_name || ''}`.trim() || lead?.email || (lead?.id ? `Contact #${lead.id}` : '');
const productName = (product) => product?.name || product?.product_name || product?.title || product?.label || `Product #${product?.id}`;

const formatMoney = (value, currencyCode = 'INR') => {
  const code = String(currencyCode || 'INR').trim() || 'INR';
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: code.length === 3 ? code.toUpperCase() : 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));
  } catch (_) {
    return `${displayCurrency(code)} ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }
};

export default function QuotationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings() || {};
  const currencyCode = settings?.currency_code || 'INR';
  const currencyLabel = displayCurrency(currencyCode);
  const money = useCallback((value) => formatMoney(value, currencyCode), [currencyCode]);

  const [quotation, setQuotation] = useState(null);
  const [leads, setLeads] = useState([]);
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [pax, setPax] = useState(1);
  const [loading, setLoading] = useState(true);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [publicLinkDialogOpen, setPublicLinkDialogOpen] = useState(false);
  const [publicAccessCode, setPublicAccessCode] = useState('');
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  const showNotification = useCallback((message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  }, []);

  const normalizeItems = useCallback((rows, availableProducts) => (rows || []).map((item) => {
    const product = availableProducts.find((row) => String(row.id) === String(item.product_id));
    return {
      ...product,
      ...item,
      product: product || (item.product_id ? { id: item.product_id, name: item.product_name } : null),
      product_id: item.product_id ?? product?.id ?? null,
      product_name: item.product_name || productName(product),
      variant_id: item.variant_id ?? null,
      variant_sku: item.variant_sku || '',
      quantity: Number(item.quantity) || 1,
      cost_price: Number(item.cost_price ?? product?.cost_price ?? 0) || 0,
      cost_price_qty: Number(item.cost_price_qty ?? product?.cost_price_qty ?? 1) || 1,
      cost_price_unit: item.cost_price_unit || product?.cost_price_unit || 'unit',
      cost_unit: item.cost_unit || item.cost_price_unit || product?.cost_price_unit || 'unit',
      cost_pricing_mode: normalizeCostMode(item.cost_pricing_mode || product?.cost_pricing_mode),
      cost_discount_percent: Number(item.cost_discount_percent ?? product?.cost_discount_percent ?? 0) || 0,
      selling_price: Number(item.selling_price ?? product?.selling_price ?? product?.price ?? 0) || 0,
      selling_price_qty: Number(item.selling_price_qty ?? product?.selling_price_qty ?? 1) || 1,
      selling_price_unit: item.selling_price_unit || product?.selling_price_unit || 'unit',
      gst_rate: Number(item.gst_rate ?? product?.gst_rate ?? 0) || 0,
      attributes_json: item.attributes_json || {},
      packaging_json: item.packaging_json || {},
      discount: Number(item.discount) || 0,
      tax: Number(item.tax) || 0,
    };
  }), []);

  const loadQuotation = useCallback(async () => {
    setLoading(true);
    try {
      const [quotationData, leadData, productData] = await Promise.all([fetchQuotationById(id), fetchLeads(), fetchAllProducts()]);
      const leadRows = Array.isArray(leadData?.leads) ? leadData.leads : Array.isArray(leadData?.data) ? leadData.data : [];
      const productRows = Array.isArray(productData) ? productData : Array.isArray(productData?.products) ? productData.products : [];
      setLeads(leadRows);
      setProducts(productRows);
      setQuotation(quotationData);
      setItems(normalizeItems(quotationData?.items, productRows));
      setOverallDiscount(Number(quotationData?.quotation_discount_amount || 0));
      setPax(Number(quotationData?.pax) || 1);
      setPublicAccessCode(quotationData?.public_access_code_display || '');
    } catch (error) {
      console.error(error);
      setQuotation(null);
      showNotification(error?.response?.data?.error || 'Failed to load quotation', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, normalizeItems, showNotification]);

  useEffect(() => { loadQuotation(); }, [loadQuotation]);

  useEffect(() => {
    if (!quotation?.public_token || quotation?.public_viewed_at) return undefined;
    let active = true;
    const checkViewedState = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const latest = await fetchQuotationById(id);
        if (active && latest?.public_viewed_at) {
          setQuotation((current) => current ? { ...current, public_viewed_at: latest.public_viewed_at } : current);
        }
      } catch (_) { /* keep the current card state and retry */ }
    };
    const interval = window.setInterval(checkViewedState, 20000);
    window.addEventListener('focus', checkViewedState);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', checkViewedState);
    };
  }, [id, quotation?.public_token, quotation?.public_viewed_at]);

  const selectedLead = useMemo(() => leads.find((lead) => String(lead.id) === String(quotation?.lead_id)) || null, [leads, quotation?.lead_id]);
  const isLocked = Number(quotation?.is_locked || 0) === 1;
  const publicUrl = quotation?.public_token ? `${window.location.origin}/public/quotations/${quotation.public_token}` : '';
  const updateItem = (index, updates) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...updates } : item));
  const reorderItems = (from, to) => {
    if (from === to || from == null || to == null) return;
    setItems((current) => { const next = [...current]; const [moving] = next.splice(from, 1); next.splice(to, 0, moving); return next; });
  };

  const addProducts = (selectedProducts) => {
    const additions = selectedProducts.map((product) => ({
      ...product,
      product,
      product_id: product.id,
      product_name: productName(product),
      variant_id: product.variant_id ?? null,
      variant_sku: product.variant_sku || product.sku || '',
      quantity: 1,
      cost_price: Number(product.cost_price || 0),
      cost_price_qty: Number(product.cost_price_qty || 1),
      cost_price_unit: product.cost_price_unit || 'unit',
      cost_unit: product.cost_price_unit || 'unit',
      cost_pricing_mode: normalizeCostMode(product.cost_pricing_mode),
      cost_discount_percent: Number(product.cost_discount_percent || 0),
      selling_price: Number(product.selling_price ?? product.price ?? 0),
      selling_price_qty: Number(product.selling_price_qty || 1),
      selling_price_unit: product.selling_price_unit || 'unit',
      gst_rate: Number(product.gst_rate || 0),
      attributes_json: product.attributes_json || {},
      packaging_json: product.packaging_json || {},
      discount: 0,
      tax: 0,
    }));
    setItems((current) => [...current, ...additions]);
    setProductPickerOpen(false);
  };

  const buildSnapshotItemsPayload = useCallback(() => items.map((item) => ({
    product_id: item.product_id ?? item.product?.id ?? null,
    product_name: item.product_name || productName(item.product),
    variant_id: item.variant_id ?? null,
    variant_sku: item.variant_sku || '',
    quantity: Number(item.quantity) || 0,
    cost_price: Number(item.cost_price) || 0,
    cost_price_qty: Number(item.cost_price_qty) || 1,
    cost_price_unit: item.cost_price_unit || 'unit',
    cost_unit: item.cost_unit || item.cost_price_unit || 'unit',
    cost_pricing_mode: normalizeCostMode(item.cost_pricing_mode),
    cost_discount_percent: Number(item.cost_discount_percent) || 0,
    unit_price: Number(item.selling_price) || 0,
    discount: Number(item.discount) || 0,
    gst_rate: Number(item.gst_rate) || 0,
    tax: Number(item.tax) || 0,
    attributes_json: item.attributes_json || {},
    packaging_json: item.packaging_json || {},
  })).filter((item) => item.product_id && item.product_name && item.quantity > 0), [items]);

  const totals = useMemo(() => calculateQuotationTotals({ items, overallDiscount, pax, quotationMode: quotation?.quotation_mode, gstPricingMode: settings?.gst_pricing_mode || 'EXCLUSIVE' }), [items, overallDiscount, pax, quotation?.quotation_mode, settings?.gst_pricing_mode]);

  const saveQuotation = async () => {
    const payloadItems = buildSnapshotItemsPayload();
    if (!payloadItems.length) return showNotification('Add at least one valid item', 'warning');
    try {
      await updateQuotationItems(id, payloadItems);
      await updateQuotation(id, { quotation_discount_type: 'FLAT', quotation_discount_value: Number(overallDiscount || 0), ...(quotation?.quotation_mode === 'CATERING' ? { pax } : {}) });
      showNotification('Quotation updated successfully');
      await loadQuotation();
    } catch (error) {
      showNotification(error?.response?.data?.error || 'Failed to save quotation', 'error');
    }
  };

  const saveFields = async (patch) => {
    if (isLocked) throw new Error('Locked quotations cannot be edited');
    const nextPatch = { ...patch };
    if (Object.prototype.hasOwnProperty.call(nextPatch, 'status')) { await updateQuotationStatus(id, nextPatch.status); delete nextPatch.status; }
    if (Object.keys(nextPatch).length) await updateQuotation(id, nextPatch);
    await loadQuotation();
  };

  const changeStatus = useCallback(async (status, successMessage = 'Quotation status updated') => {
    try { await updateQuotationStatus(id, status); showNotification(successMessage); await loadQuotation(); }
    catch (error) { showNotification(error?.response?.data?.error || 'Failed to update quotation status', 'error'); }
  }, [id, loadQuotation, showNotification]);

  const createVersion = useCallback(async () => {
    const payloadItems = buildSnapshotItemsPayload();
    if (!payloadItems.length) return showNotification('Add at least one valid item', 'warning');
    try {
      let lineColumns = [];
      try { lineColumns = JSON.parse(quotation.quotation_line_columns_json || '[]'); } catch (_) { lineColumns = []; }
      const result = await createQuotation({
        parent_id: quotation.parent_id || quotation.id,
        lead_id: quotation.lead_id,
        quotation_date: quotation.quotation_date,
        valid_until: quotation.valid_until || null,
        notes: quotation.notes || null,
        items: payloadItems,
        quotation_discount_type: 'FLAT',
        quotation_discount_value: Number(overallDiscount || 0),
        company_id: quotation.company_id || null,
        quotation_template: quotation.quotation_template || null,
        quotation_type: quotation.quotation_type || null,
        cover_letter_html: quotation.cover_letter_html || null,
        terms_conditions_html: quotation.terms_conditions_html || null,
        company_logo_url: quotation.company_logo_url || null,
        payment_terms: quotation.payment_terms || null,
        line_columns: lineColumns,
        group_items_by_top_category: Boolean(Number(quotation.group_items_by_top_category || 0)),
        issuer_company_name: quotation.issuer_company_name || null,
        issuer_company_email: quotation.issuer_company_email || null,
        issuer_company_phone: quotation.issuer_company_phone || null,
        issuer_company_address: quotation.issuer_company_address || null,
        issuer_company_gst_number: quotation.issuer_company_gst_number || null,
        ...(quotation.quotation_mode === 'CATERING' ? { pax, event_name: quotation.event_name, event_date: quotation.event_date || null, event_start_time: quotation.event_start_time || null, event_end_date: quotation.event_end_date || null, event_end_time: quotation.event_end_time || null, event_location: quotation.event_location || null } : {}),
      });
      navigate(`/quotations/${result.id || result.quotationId}`);
    } catch (error) { showNotification(error?.response?.data?.error || 'Failed to create version', 'error'); }
  }, [buildSnapshotItemsPayload, navigate, overallDiscount, pax, quotation, showNotification]);

  const createWorkOrder = useCallback(async () => {
    if (quotation.status !== 'approved') return showNotification('Work Order can only be created from approved quotations', 'warning');
    try {
      const result = await createWorkOrderFromQuotation(quotation.id);
      await updateQuotationStatus(quotation.id, 'converted');
      const workOrderId = result?.id || result?.work_order_id || result?.data?.id;
      if (!workOrderId) throw new Error('Work order created but ID not returned');
      navigate(`/workorders/${workOrderId}`);
    } catch (error) { showNotification(error?.response?.data?.error || error.message || 'Failed to create work order', 'error'); }
  }, [navigate, quotation, showNotification]);

  const copyPublicLink = useCallback(async () => {
    if (!publicUrl) { setPublicLinkDialogOpen(true); return; }
    await navigator.clipboard?.writeText(publicUrl);
    showNotification('Client quotation link copied to clipboard');
  }, [publicUrl, showNotification]);

  const savePublicLink = async () => {
    if (publicAccessCode && !/^\d{6}$/.test(publicAccessCode)) return showNotification('Access code must contain exactly six digits', 'error');
    try {
      const result = await createPublicQuotationLink(quotation.id, { accessCode: publicAccessCode, acceptanceEnabled: true });
      await navigator.clipboard?.writeText(`${window.location.origin}${result.publicUrl}`);
      setPublicLinkDialogOpen(false);
      await loadQuotation();
      showNotification('Client quotation link saved and copied');
    } catch (error) { showNotification(error?.response?.data?.error || 'Unable to create client quotation link', 'error'); }
  };

  const fields = useMemo(() => {
    const leadOptions = leads.map((lead) => ({ value: lead.id, label: [leadName(lead), lead.company_name].filter(Boolean).join(' · ') }));
    return [
      { key: 'quotation_number', label: 'Quotation number', readOnly: true },
      { key: 'version', label: 'Version', readOnly: true, render: (value) => value ? `Version ${value}` : '—' },
      { key: 'status', label: 'Status', type: 'select', options: ['pending', 'rejected'], readOnly: isLocked || ['approved', 'converted'].includes(String(quotation?.status || '').toLowerCase()) },
      { key: 'quotation_date', label: 'Quotation date', type: 'date', readOnly: isLocked },
      { key: 'valid_until', label: 'Expiration date', type: 'date', readOnly: isLocked },
      { key: 'lead_id', label: 'Contact', type: 'autocomplete', options: leadOptions, readOnly: isLocked, render: () => leadName(selectedLead) || '—' },
      { key: 'company_name', label: 'Company', readOnly: true },
      { key: 'customer_email', label: 'Email', readOnly: true },
      { key: 'customer_phone', label: 'Phone', readOnly: true },
      { key: 'customer_gst', label: 'GST number', readOnly: true },
      { key: 'notes', label: 'Notes', type: 'html', readOnly: isLocked },
      { key: 'quotation_mode', label: 'Quotation mode', readOnly: true },
      { key: 'quotation_type', label: 'Quotation type', readOnly: true, render: (value) => String(value || '—').replace(/_/g, ' ') },
      { key: 'quotation_template', label: 'Template', readOnly: true },
      { key: 'subtotal_display', label: 'Subtotal', readOnly: true },
      { key: 'discount_display', label: 'Total discount', readOnly: true },
      { key: 'tax_display', label: 'Tax', readOnly: true },
      { key: 'total_display', label: 'Grand total', readOnly: true },
      { key: 'event_name', label: 'Event name', readOnly: isLocked },
      { key: 'event_date', label: 'Event date', type: 'date', readOnly: isLocked },
      { key: 'event_start_time', label: 'Start time', readOnly: isLocked },
      { key: 'event_end_time', label: 'End time', readOnly: isLocked },
      { key: 'event_location', label: 'Location', readOnly: isLocked },
      { key: 'pax', label: 'PAX', type: 'number', readOnly: isLocked },
    ];
  }, [isLocked, leads, quotation?.status, selectedLead]);

  const record = useMemo(() => quotation ? {
    ...quotation,
    company_name: selectedLead?.company_name || '',
    customer_email: selectedLead?.email || '',
    customer_phone: selectedLead?.phone_number || selectedLead?.phone || '',
    customer_gst: selectedLead?.gst_number || '',
    subtotal_display: money(totals.subtotal),
    discount_display: money(totals.totalDiscount),
    tax_display: money(totals.totalTax),
    total_display: money(totals.grandTotal),
    pax,
  } : null, [money, pax, quotation, selectedLead, totals]);

  const cards = useMemo(() => quotation ? [
    { id: 'client-details', title: 'Client Details', position: 'left', deletable: false, editable: !isLocked, fieldKeys: ['lead_id', 'company_name', 'customer_email', 'customer_phone', 'customer_gst'], headerActions: () => !isLocked ? <button type="button" className="record-card-header-link" title="Add contact" onClick={() => setLeadDialogOpen(true)}><Add /></button> : null },
    { id: 'quotation-details', title: 'Quotation Details', position: 'left', deletable: false, editable: !isLocked, fieldKeys: ['quotation_date', 'valid_until', 'quotation_mode', 'quotation_type', 'quotation_template'] },
    { id: 'notes', title: 'Notes', position: 'left', editable: !isLocked, fieldKeys: ['notes'] },
    ...(quotation.quotation_mode === 'CATERING' ? [{ id: 'event-details', title: 'Event Details', position: 'left', editable: !isLocked, fieldKeys: ['event_name', 'event_date', 'event_start_time', 'event_end_time', 'event_location', 'pax'] }] : []),
    { id: 'quotation-actions', title: 'Actions', position: 'right', fixed: true, disableDrag: true, deletable: false, allowSettings: false, titleEditable: false, fieldKeys: [], customContent: () => <div className="record-action-buttons"><button type="button" className="hs-listing__create" title="Save quotation" aria-label="Save quotation" disabled={isLocked} onClick={saveQuotation}><SaveOutlined /></button><button type="button" className="hs-listing__create" title="Download PDF" aria-label="Download PDF" onClick={() => generateQuotationPdf(quotation.id)}><PictureAsPdfOutlined /></button><button type="button" className="hs-listing__create" title={publicUrl ? 'Copy client link' : 'Create client link'} aria-label={publicUrl ? 'Copy client link' : 'Create client link'} onClick={copyPublicLink}><LinkOutlined /></button>{quotation.status === 'pending' && !isLocked && <button type="button" className="hs-listing__create" title="Approve quotation" aria-label="Approve quotation" onClick={() => changeStatus('approved', 'Quotation approved')}><CheckCircleOutline /></button>}{quotation.status === 'approved' && <button type="button" className="hs-listing__create" title="Create work order" aria-label="Create work order" onClick={createWorkOrder}><WorkOutlineOutlined /></button>}</div> },
    { id: 'client-link', title: 'Client Link', position: 'right', deletable: false, fieldKeys: [], customContent: () => <div className="quotation-link-card"><div className={`quotation-view-state ${quotation.public_viewed_at ? 'is-viewed' : ''}`}><span />{quotation.public_viewed_at ? `Viewed ${formatDateTime(quotation.public_viewed_at)}` : publicUrl ? 'Not viewed yet' : 'No client link created'}</div>{publicUrl && <a href={publicUrl} target="_blank" rel="noreferrer">{publicUrl}<OpenInNewOutlined /></a>}<div><button type="button" onClick={copyPublicLink} disabled={!publicUrl}><ContentCopyOutlined />Copy</button><button type="button" onClick={() => setPublicLinkDialogOpen(true)}><LinkOutlined />{publicUrl ? 'Update link' : 'Create link'}</button></div>{quotation.public_access_code_display && <small>Access code: <b>{quotation.public_access_code_display}</b></small>}<small>Online acceptance: <b>{Number(quotation.public_acceptance_enabled || 0) ? 'Enabled' : 'Disabled'}</b></small></div> },
    { id: 'related-documents', title: 'Related documents', position: 'right', deletable: false, editable: false, fieldKeys: [], customContent: () => <div className="record-related-documents">{quotation.related_documents?.work_orders?.map((workOrder) => <a key={`work-order-${workOrder.id}`} href={`/workorders/${workOrder.id}`}><WorkOutlineOutlined /><span>Work order</span><strong>{workOrder.work_order_number || `#${workOrder.id}`}</strong></a>)}{quotation.related_documents?.invoices?.map((invoice) => <a key={`invoice-${invoice.id}`} href={`/invoices/${invoice.id}`}><PictureAsPdfOutlined /><span>{String(invoice.source_type || '').toUpperCase() === 'PROFORMA' ? 'Proforma invoice' : 'Invoice'}</span><strong>{invoice.invoice_number || `#${invoice.id}`}</strong></a>)}{!quotation.related_documents?.work_orders?.length && !quotation.related_documents?.invoices?.length && <small>No work orders, invoices, or receipts have been created yet.</small>}</div> },
    { id: 'totals', title: 'Quotation Totals', position: 'right', deletable: false, editable: false, fieldKeys: ['subtotal_display', 'discount_display', 'tax_display', 'total_display'] },
  ] : [], [changeStatus, copyPublicLink, createWorkOrder, isLocked, publicUrl, quotation, saveQuotation]);

  const summaryCard = useMemo(() => quotation ? {
    titleFieldKey: 'quotation_number', backTo: '/quotations', backLabel: 'Quotations', subtitle: [leadName(selectedLead), quotation.version ? `Version ${quotation.version}` : null].filter(Boolean).join(' · '), fieldKeys: ['status', 'quotation_date', 'valid_until'], editable: !isLocked,
    actions: [
      { label: 'Download PDF', icon: <PictureAsPdfOutlined />, onClick: () => generateQuotationPdf(quotation.id) },
      { label: publicUrl ? 'Copy client link' : 'Create client link', icon: <LinkOutlined />, onClick: copyPublicLink },
      ...(quotation.status === 'pending' && !isLocked ? [{ label: 'Approve quotation', icon: <CheckCircleOutline />, onClick: () => changeStatus('approved', 'Quotation approved') }] : []),
      ...(quotation.status === 'approved' ? [{ label: 'Create work order', icon: <WorkOutlineOutlined />, onClick: createWorkOrder }] : []),
      ...(quotation.status !== 'converted' && quotation.status !== 'rejected' ? [{ label: 'Create new version', icon: <FileCopyOutlined />, onClick: createVersion }] : []),
    ],
  } : null, [changeStatus, copyPublicLink, createVersion, createWorkOrder, isLocked, publicUrl, quotation, selectedLead]);

  if (loading) return <div className="quotation-loading">Loading quotation…</div>;
  if (!quotation) return <div className="quotation-loading">Quotation not found</div>;

  return <>
    <SingleRecordWorkspace storageKey={`pav-erp:record:quotation:${id}`} backTo="/quotations" backLabel="Quotations" title={quotation.quotation_number || `Quotation #${id}`} record={record} fields={fields} initialCards={cards} summaryCard={summaryCard} hidePageHeader onSaveFields={saveFields} centerLabel={`Order Lines (${items.length})`} centerContent={<div className="quotation-order-lines-workspace"><QuotationItemsSection items={items} setItems={setItems} updateItem={updateItem} reorderItems={reorderItems} onAddProducts={() => setProductPickerOpen(true)} isLocked={isLocked} products={products} /><div className="quotation-order-summary-card"><QuotationSummary totals={totals} overallDiscount={overallDiscount} setOverallDiscount={setOverallDiscount} currency={currencyLabel} isLocked={isLocked} /></div></div>} />
    <QuotationProductPickerDrawer open={productPickerOpen} products={products} onClose={() => setProductPickerOpen(false)} onAdd={addProducts} />
    <AddLeadDialog open={leadDialogOpen} onClose={() => setLeadDialogOpen(false)} onLeadCreated={async (lead) => { setLeads((current) => [...current, lead]); setLeadDialogOpen(false); try { await updateQuotation(id, { lead_id: lead.id }); await loadQuotation(); } catch (error) { showNotification(error?.response?.data?.error || 'Unable to update contact', 'error'); } }} />
    <Dialog open={publicLinkDialogOpen} onClose={() => setPublicLinkDialogOpen(false)} fullWidth maxWidth="xs"><DialogTitle>{publicUrl ? 'Update client quotation link' : 'Create client quotation link'}</DialogTitle><DialogContent><p>Set an optional six-digit access code. Leave it blank for an open link.</p><TextField autoFocus fullWidth label="Access code" value={publicAccessCode} onChange={(event) => setPublicAccessCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputProps={{ inputMode: 'numeric', maxLength: 6 }} /></DialogContent><DialogActions><Button onClick={() => setPublicLinkDialogOpen(false)}>Cancel</Button><Button variant="contained" onClick={savePublicLink}>Save and copy link</Button></DialogActions></Dialog>
    <NotificationSnackbar open={notification.open} message={notification.message} severity={notification.severity} onClose={() => setNotification((current) => ({ ...current, open: false }))} />
  </>;
}
