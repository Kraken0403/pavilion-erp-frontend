import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Autocomplete, Checkbox, Drawer, IconButton, Switch, TextField } from '@mui/material';
import {
  Add, ArrowBack, ChevronRight, Close, DeleteOutline, DownloadOutlined, DragIndicator,
  EditOutlined, LinkOutlined, OpenInNewOutlined, SaveOutlined, Search, SendOutlined, SettingsOutlined,
} from '@mui/icons-material';
import { createQuotation, generateQuotationPdf, previewQuotationDocument, sendQuotationEmail } from '../services/quotationService';
import { fetchLeads } from '../services/leadService';
import { fetchAllProducts, getCategories } from '../services/productServices';
import { getCompanies } from '../services/companyService';
import { getQuotationSettings } from '../services/quotationSettingsService';
import { resolveBackendAssetUrl } from '../services/api';
import AddLeadDialog from '../components/leads/AddLeadDialog';
import AddCompanyDialog from '../components/company/AddCompanyDialog';
import FileUploader from '../components/ui/FileUploader';
import WgiymEditor from '../components/ui/WgiymEditor';
import FormattedDateInput from '../components/ui/FormattedDateInput';
import { formatDate } from '../utils/dateFormatter';
import { useSettings as useGlobalSettings } from '../context/SettingsContext';
import { formatCurrency } from '../utils/currencyUtils';
import '../assets/styles/QuotationBuilder.scss';

const steps = ['Details', 'Customer details', 'Your info', 'Order lines', 'Review'];
const allLineColumns = [
  { key:'image', label:'Image', quotationAllowed:true },
  { key:'product', label:'Product', quotationAllowed:true, required:true },
  { key:'sku', label:'SKU', quotationAllowed:true },
  { key:'brand', label:'Brand', quotationAllowed:true },
  { key:'category', label:'Category', quotationAllowed:false },
  { key:'description', label:'Description', quotationAllowed:true },
  { key:'quantity', label:'Qty', quotationAllowed:true },
  { key:'unit_price', label:'Selling price', quotationAllowed:true },
  { key:'selling_price_unit', label:'Selling unit', quotationAllowed:true },
  { key:'selling_price_qty', label:'Selling qty', quotationAllowed:false },
  { key:'discount', label:'Line discount', quotationAllowed:true },
  { key:'gst_rate', label:'GST %', quotationAllowed:true },
  { key:'hsn_sac', label:'HSN / SAC', quotationAllowed:true },
  { key:'stock', label:'Stock', quotationAllowed:false },
  { key:'type', label:'Product type', quotationAllowed:false },
  { key:'vendor', label:'Vendor', quotationAllowed:false },
  { key:'cost_price', label:'Cost price', quotationAllowed:false },
  { key:'cost_price_unit', label:'Cost unit', quotationAllowed:false },
  { key:'cost_price_qty', label:'Cost qty', quotationAllowed:false },
  { key:'margin', label:'Margin', quotationAllowed:false },
  { key:'total', label:'Line total', quotationAllowed:true, required:true },
];
const defaultVisibleColumns = ['product','description','quantity','unit_price','discount','gst_rate','cost_price','margin','total'];
const defaultQuotationColumns = ['brand','product','description','quantity','unit_price','discount','gst_rate','total'];
const required = (label) => <span className="field-label-text">{label}<span className="required-mark">*</span></span>;
const leadName = (lead) => lead?.name || `${lead?.first_name || ''} ${lead?.last_name || ''}`.trim() || lead?.email || (lead?.id ? `Lead #${lead.id}` : '');
const companyName = (company) => company?.name || company?.company_name || (company?.id ? `Company #${company.id}` : '');
const productName = (product) => product?.name || product?.product_name || `Product #${product?.id}`;
const stripHtml = (value) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

function buildCategoryTopMap(tree = []) {
  const map = new Map();
  const walk = (nodes, top = null) => (nodes || []).forEach((node) => {
    const root = top || node;
    map.set(Number(node.id), root.name || node.name || 'Uncategorized');
    walk(node.children || [], root);
  });
  walk(tree);
  return map;
}

function QuotationPreview({ html, loading, error }) {
  return <aside className="builder-preview builder-preview--document">
    {loading && <div className="preview-status">Updating preview…</div>}
    {error && !html && <div className="preview-status preview-status--error">{error}</div>}
    {html && <iframe title="Quotation preview" srcDoc={html} sandbox="allow-same-origin allow-scripts" />}
  </aside>;
}

export default function QuotationBuilder() {
  const { settings: globalSettings } = useGlobalSettings() || {};
  const money = (value) => formatCurrency(value, globalSettings?.currency_code || 'INR');
  const navigate = useNavigate();
  const { leadId } = useParams();
  const [step, setStep] = useState(0);
  const [leads, setLeads] = useState([]);
  const [products, setProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [customerCompanies, setCustomerCompanies] = useState([]);
  const [settings, setSettings] = useState({});
  const [categoryTopMap, setCategoryTopMap] = useState(new Map());
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    template:'builder', quotation_type:'HOME_THEATRE', lead_id:leadId || '', company_id:'', quotation_date:new Date().toISOString().slice(0,10), valid_until:'', notes:'',
    public_link_enabled:true, protected_link:false, access_code:'', acceptance_enabled:true, customer_email:'', customer_phone:'', customer_company:'', quotation_number:'', client_slug:'',
    cover_letter_html:'', terms_conditions_html:'', company_logo_url:'', payment_terms:'', quotation_discount_type:'PERCENT', quotation_discount_value:0, group_items_by_top_category:false,
    issuer_company_name:'', issuer_company_email:'', issuer_company_phone:'', issuer_company_address:'', issuer_company_gst_number:'',
  });
  const [columnOrder, setColumnOrder] = useState(allLineColumns.map((column) => column.key));
  const [visibleColumns, setVisibleColumns] = useState(defaultVisibleColumns);
  const [quotationColumns, setQuotationColumns] = useState(defaultQuotationColumns);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [columnsDrawerOpen, setColumnsDrawerOpen] = useState(false);
  const [leadDrawerOpen, setLeadDrawerOpen] = useState(false);
  const [customerCompanyDrawerOpen, setCustomerCompanyDrawerOpen] = useState(false);
  const [customerCompanyPrefill, setCustomerCompanyPrefill] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [productCategory, setProductCategory] = useState('all');
  const [productSort, setProductSort] = useState('name-asc');
  const [pickedProducts, setPickedProducts] = useState([]);
  const [message, setMessage] = useState({ text:'', severity:'error' });
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const createdRef = useRef(null);
  const creationPromiseRef = useRef(null);

  useEffect(() => {
    Promise.all([fetchLeads(), fetchAllProducts(), getCompanies('ISSUING'), getCompanies('CUSTOMER'), getQuotationSettings(), getCategories()])
      .then(([leadData, productData, companyData, customerCompanyData, quotationSettings, categoryTree]) => {
        setLeads(leadData?.leads || []);
        setProducts(Array.isArray(productData) ? productData : productData?.products || []);
        setCompanies(Array.isArray(companyData) ? companyData : companyData?.companies || []);
        setCustomerCompanies(Array.isArray(customerCompanyData) ? customerCompanyData : customerCompanyData?.companies || []);
        setSettings(quotationSettings || {});
        setCategoryTopMap(buildCategoryTopMap(categoryTree || []));
        setForm((current) => ({
          ...current,
          template:'builder',
          cover_letter_html:current.cover_letter_html || quotationSettings?.cover_letter_html || '',
          terms_conditions_html:current.terms_conditions_html || quotationSettings?.terms_conditions_html || '',
          company_logo_url:current.company_logo_url || quotationSettings?.logo_url || globalSettings?.company_logo || '',
          payment_terms:current.payment_terms || quotationSettings?.default_payment_terms || '',
          quotation_number:current.quotation_number || `${quotationSettings?.prefix || 'QT'}/${new Date().getFullYear()}/${String(quotationSettings?.sequence_start || 1).padStart(4,'0')}`,
        }));
      }).catch(() => setMessage({ text:'Unable to load quotation data.', severity:'error' }));
  }, [globalSettings?.company_logo]);

  useEffect(() => {
    try {
      const draft = JSON.parse(localStorage.getItem('pav-erp:quotation-draft') || 'null');
      if (draft?.form) {
        setForm((current) => ({ ...current, ...draft.form, template:'builder', lead_id:leadId || draft.form.lead_id || '' }));
        setItems(draft.items || []);
        if (Array.isArray(draft.columnOrder)) setColumnOrder(draft.columnOrder);
        if (Array.isArray(draft.visibleColumns)) setVisibleColumns(draft.visibleColumns);
        if (Array.isArray(draft.quotationColumns)) setQuotationColumns(draft.quotationColumns);
      }
    } catch (_) { /* invalid draft */ }
  }, [leadId]);

  const selectedLead = useMemo(() => leads.find((lead) => String(lead.id) === String(form.lead_id)), [leads, form.lead_id]);
  const selectedCompany = useMemo(() => companies.find((company) => String(company.id) === String(form.company_id)), [companies, form.company_id]);
  const categories = useMemo(() => [...new Set(products.map((product) => product.category_name || product.category?.name).filter(Boolean))].sort(), [products]);
  const visibleDefinitions = useMemo(() => columnOrder.map((key) => allLineColumns.find((column) => column.key === key)).filter((column) => column && visibleColumns.includes(column.key)), [columnOrder, visibleColumns]);
  const pickerProducts = useMemo(() => products.filter((product) => {
    const query = productQuery.toLowerCase();
    const category = product.category_name || product.category?.name || '';
    return (productCategory === 'all' || category === productCategory) && (!query || `${productName(product)} ${product.sku || ''} ${product.brand || ''} ${category}`.toLowerCase().includes(query));
  }).sort((a,b) => {
    if (productSort === 'price-asc') return Number(a.selling_price || a.price || 0) - Number(b.selling_price || b.price || 0);
    if (productSort === 'price-desc') return Number(b.selling_price || b.price || 0) - Number(a.selling_price || a.price || 0);
    return productName(a).localeCompare(productName(b)) * (productSort === 'name-desc' ? -1 : 1);
  }), [products, productQuery, productCategory, productSort]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0), 0);
    const itemDiscount = items.reduce((sum, item) => sum + Number(item.discount || 0), 0);
    const taxable = Math.max(0, subtotal - itemDiscount);
    const inclusive = String(globalSettings?.gst_pricing_mode || 'EXCLUSIVE').toUpperCase() === 'INCLUSIVE';
    const tax = items.reduce((sum, item) => { const base=Math.max(0,Number(item.quantity || 0)*Number(item.unit_price || 0)-Number(item.discount || 0)); const rate=Number(item.gst_rate || 0); return sum+(inclusive ? base*rate/(100+rate) : base*rate/100); }, 0);
    const overallDiscount = form.quotation_discount_type === 'FLAT' ? Number(form.quotation_discount_value || 0) : taxable * Number(form.quotation_discount_value || 0) / 100;
    const cost = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.cost_price || 0), 0);
    return { subtotal, itemDiscount, tax, overallDiscount, cost, total:Math.max(0,taxable+(inclusive?0:tax)-overallDiscount), margin:taxable-overallDiscount-cost };
  }, [items, form.quotation_discount_type, form.quotation_discount_value, globalSettings?.gst_pricing_mode]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const html = await previewQuotationDocument({ form, lead:selectedLead, items, totals, quotationColumns });
        if (active) {
          setPreviewHtml(html);
          setPreviewError('');
        }
      } catch (_) {
        if (active) setPreviewError('Unable to update the quotation preview.');
      } finally {
        if (active) setPreviewLoading(false);
      }
    }, 450);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [form, selectedLead, items, totals, quotationColumns]);

  const update = (name, value) => setForm((current) => ({ ...current, [name]:value }));
  const updateItem = (index, patch) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const chooseLead = (lead) => setForm((current) => ({ ...current, lead_id:lead?.id || '', customer_email:lead?.email || '', customer_phone:lead?.phone_number || lead?.phone || '', customer_company:lead?.company_name || '' }));
  const chooseCompany = (company) => {
    const address = company?.registered_address || globalSettings?.company_address_line1 || '';
    setForm((current) => ({
      ...current,
      company_id:company?.id || '',
      company_logo_url:company?.logo_url || globalSettings?.company_logo || settings?.logo_url || current.company_logo_url || '',
      issuer_company_name:company?.legal_name || company?.name || globalSettings?.company_name || '',
      issuer_company_email:company?.email || globalSettings?.company_email || '',
      issuer_company_phone:company?.phone || globalSettings?.company_phone || '',
      issuer_company_address:[address, company?.registered_city || globalSettings?.company_city, company?.registered_state || globalSettings?.company_state, company?.registered_pincode || globalSettings?.company_pincode].filter(Boolean).join(', '),
      issuer_company_gst_number:company?.gst_number || globalSettings?.gst_number || '',
    }));
  };

  const addPickedProducts = () => {
    const additions = products.filter((product) => pickedProducts.includes(product.id)).map((product) => ({
      product_id:product.id, product_name:productName(product), description:stripHtml(product.description), image_url:product.image_url || '', sku:product.sku || '', brand:product.brand || '',
      category_name:product.category_name || product.category?.name || '', top_category_name:categoryTopMap.get(Number(product.category_id)) || product.category_name || product.category?.name || 'Uncategorized',
      quantity:1, unit_price:Number(product.selling_price ?? product.price ?? 0), selling_price_unit:product.selling_price_unit || '', selling_price_qty:Number(product.selling_price_qty || 1), discount:0,
      gst_rate:Number(product.gst_rate || 0), hsn_sac:product.hsn_sac || '', stock:Number(product.stock || 0), type:product.type || 'simple', vendor_name:product.vendor_name || product.vendor?.name || '',
      cost_price:Number(product.cost_price || 0), cost_price_unit:product.cost_price_unit || '', cost_price_qty:Number(product.cost_price_qty || 1),
    }));
    setItems((current) => [...current, ...additions]); setPickedProducts([]); setProductPickerOpen(false);
  };

  const validationMessage = (index) => {
    if (index === 0) { if (!form.quotation_date) return 'Quotation date is required.'; if (!form.valid_until) return 'Expiration date is required.'; if (!form.quotation_type) return 'Quotation type is required.'; if (form.protected_link && !/^\d{6}$/.test(form.access_code)) return 'Enter a six-digit OTP for the protected link.'; }
    if (index === 1 && !form.lead_id) return 'Select a customer or contact.';
    if (index === 2 && !form.company_id) return 'Select the issuing company.';
    if (index === 3 && !items.length) return 'Add at least one product.';
    return '';
  };
  const goToStep = (target) => { if (target <= step) { setStep(target); setMessage({ text:'', severity:'error' }); return; } for (let index=0; index<target; index+=1) { const error=validationMessage(index); if (error) { setStep(index); setMessage({ text:error, severity:'error' }); return; } } setStep(target); setMessage({ text:'', severity:'error' }); };
  const next = () => { const error=validationMessage(step); if (error) return setMessage({ text:error, severity:'error' }); goToStep(Math.min(steps.length-1,step+1)); };
  const saveDraft = () => { localStorage.setItem('pav-erp:quotation-draft', JSON.stringify({ form, items, columnOrder, visibleColumns, quotationColumns, savedAt:new Date().toISOString() })); setMessage({ text:'Quotation draft saved.', severity:'success' }); };

  const ensureCreated = async () => {
    if (createdRef.current?.id) return createdRef.current;
    if (creationPromiseRef.current) return creationPromiseRef.current;
    for (let index=0; index<steps.length - 1; index+=1) { const error=validationMessage(index); if (error) { setStep(index); throw new Error(error); } }
    creationPromiseRef.current = createQuotation({ ...form, items, line_columns:quotationColumns, quotation_discount_type:Number(form.quotation_discount_value || 0)>0 ? form.quotation_discount_type : null, quotation_discount_value:Number(form.quotation_discount_value || 0), quotation_template:'builder', quotation_type:form.quotation_type })
      .then((result) => {
        const id = result?.quotationId || result?.id;
        const publicUrl = result?.publicUrl ? `${window.location.origin}${result.publicUrl}` : '';
        const nextCreated = { ...result, id, publicUrl };
        createdRef.current = nextCreated;
        setCreated(nextCreated);
        localStorage.removeItem('pav-erp:quotation-draft');
        return nextCreated;
      })
      .finally(() => { creationPromiseRef.current = null; });
    return creationPromiseRef.current;
  };
  const runFinalAction = async (action) => {
    setSaving(true); setMessage({ text:'', severity:'error' });
    try {
      const quotation = await ensureCreated();
      if (action === 'send') { await sendQuotationEmail(quotation.id); setMessage({ text:'Quotation generated and sent.', severity:'success' }); }
      if (action === 'download') { await generateQuotationPdf(quotation.id); setMessage({ text:'Quotation downloaded.', severity:'success' }); }
      if (action === 'share') { if (!quotation.publicUrl) throw new Error('Client-view link is disabled for this quotation.'); await navigator.clipboard.writeText(quotation.publicUrl); setMessage({ text:'Client link copied to clipboard.', severity:'success' }); }
      if (action === 'create') setMessage({ text:'Quotation created. Use View quotation to open it.', severity:'success' });
    } catch (error) { setMessage({ text:error.response?.data?.error || error.response?.data?.details || error.message || 'Unable to create quotation.', severity:'error' }); }
    finally { setSaving(false); }
  };

  const lineValue = (item, index, key) => {
    if (key === 'image') return item.image_url ? <img className="order-line-image" src={resolveBackendAssetUrl(item.image_url)} alt="" /> : '—';
    if (key === 'product') return <strong>{item.product_name}</strong>;
    if (key === 'sku') return item.sku || '—'; if (key === 'brand') return item.brand || '—'; if (key === 'category') return item.category_name || '—';
    if (key === 'description') return <input value={item.description || ''} onChange={(event) => updateItem(index,{ description:event.target.value })} />;
    if (['quantity','unit_price','discount','gst_rate','cost_price'].includes(key)) return <input type="number" min="0" value={item[key] ?? 0} onChange={(event) => updateItem(index,{ [key]:event.target.value })} />;
    if (key === 'selling_price_unit') return item.selling_price_unit || '—'; if (key === 'selling_price_qty') return item.selling_price_qty || 1; if (key === 'hsn_sac') return item.hsn_sac || '—'; if (key === 'stock') return item.stock ?? '—'; if (key === 'type') return item.type || '—'; if (key === 'vendor') return item.vendor_name || '—'; if (key === 'cost_price_unit') return item.cost_price_unit || '—'; if (key === 'cost_price_qty') return item.cost_price_qty || 1;
    if (key === 'margin') return money((Number(item.unit_price || 0)-Number(item.cost_price || 0))*Number(item.quantity || 0)-Number(item.discount || 0));
    const base=Number(item.quantity || 0)*Number(item.unit_price || 0)-Number(item.discount || 0); const inclusive=String(globalSettings?.gst_pricing_mode || 'EXCLUSIVE').toUpperCase()==='INCLUSIVE'; return money(inclusive ? base : base*(1+Number(item.gst_rate || 0)/100));
  };

  const reorderLine = (from, to) => { if (from === to) return; setItems((current) => { const next=[...current]; const [moving]=next.splice(from,1); next.splice(to,0,moving); return next; }); };
  const reorderColumn = (from, to) => { if (from === to) return; setColumnOrder((current) => { const next=[...current]; const [moving]=next.splice(from,1); next.splice(to,0,moving); return next; }); };
  const toggleVisibleColumn = (key) => setVisibleColumns((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current,key]);
  const toggleQuotationColumn = (key) => setQuotationColumns((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current,key]);

  return <main className="quotation-builder">
    <ol className="builder-steps">{steps.map((label,index) => <li className={`${index<=step?'active':''} ${index<step?'complete':''}`} key={label}><button type="button" onClick={() => goToStep(index)}><span>{index<step?'✓':index+1}</span><b>{label}</b></button></li>)}</ol>
    <section className={`builder-body ${step===3 || step===5 ? 'builder-body--wide' : ''}`}>
      <div className="builder-form">
        {step === 0 && <>
          <div className="builder-title"><div><span>Step 1</span><h1>Quotation details</h1></div><button type="button" className="secondary-action" onClick={() => navigate('/quotation-templates')}><SettingsOutlined />Edit template</button></div>
          <div className="field-pair"><label>{required('Quotation date')}<FormattedDateInput name="quotation_date" value={form.quotation_date} onChange={(event) => update('quotation_date',event.target.value)} required /></label><label>{required('Expiration date')}<FormattedDateInput name="valid_until" min={form.quotation_date} value={form.valid_until} onChange={(event) => update('valid_until',event.target.value)} required /></label></div>
          <label>{required('Quotation type')}<select value={form.quotation_type} onChange={(event) => update('quotation_type',event.target.value)}><option value="HOME_THEATRE">Home Theatre</option><option value="HOME_AUTOMATION">Home Automation</option></select></label>
          <label>Notes and terms<WgiymEditor placeholder="Add notes and terms" value={form.notes} onChange={(value) => update('notes',value)} /></label>
          <div className="builder-option-card">
            <div className="builder-option-row"><div><strong>Create a client-view link</strong><span>Give the customer a browser link to view the quotation.</span></div><Switch checked={form.public_link_enabled} onChange={(event) => update('public_link_enabled',event.target.checked)} /></div>
            {form.public_link_enabled && <><div className="builder-option-url"><span>Client URL</span><div><b>{window.location.origin}/public/quotations/</b><input value={form.client_slug} onChange={(event) => update('client_slug',event.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))} placeholder="optional-custom-url" /></div></div><div className="builder-option-grid"><div className="builder-option-row"><div><strong>Protect link with OTP</strong><span>Require a six-digit access code.</span></div><Switch checked={form.protected_link} onChange={(event) => update('protected_link',event.target.checked)} /></div><div className="builder-option-row"><div><strong>Allow online acceptance</strong><span>Customer can approve the quotation online.</span></div><Switch checked={form.acceptance_enabled} onChange={(event) => update('acceptance_enabled',event.target.checked)} /></div></div>{form.protected_link && <label className="builder-otp-field">Six-digit OTP<input maxLength="6" inputMode="numeric" value={form.access_code} onChange={(event) => update('access_code',event.target.value.replace(/\D/g,'').slice(0,6))} /></label>}</>}
          </div>
        </>}

        {step === 1 && <><div className="builder-title"><div><span>Step 2</span><h1>Customer details</h1></div><button type="button" className="secondary-action" onClick={() => setLeadDrawerOpen(true)}><Add />Add contact</button></div><label>{required('Customer / contact')}<Autocomplete options={leads} value={selectedLead || null} onChange={(_,value) => chooseLead(value)} getOptionLabel={(option) => `${leadName(option)} ${option?.company_name ? `· ${option.company_name}` : ''}`} isOptionEqualToValue={(option,value) => Number(option.id)===Number(value.id)} renderInput={(params) => <TextField {...params} placeholder="Type a name, company, email or phone" />} /></label><div className="field-pair"><label>Email<input type="email" value={form.customer_email} onChange={(event) => update('customer_email',event.target.value)} /></label><label>Phone<input value={form.customer_phone} onChange={(event) => update('customer_phone',event.target.value)} /></label></div><label>Customer company<input value={form.customer_company} onChange={(event) => update('customer_company',event.target.value)} /></label></>}

        {step === 1 && <div className="customer-company-picker"><label>Customer company <span className="optional-mark">Optional</span><Autocomplete freeSolo options={customerCompanies} value={form.customer_company || null} inputValue={form.customer_company || ''} onInputChange={(_, value) => update('customer_company', value)} onChange={(_, value) => update('customer_company', typeof value === 'string' ? value : companyName(value))} getOptionLabel={(option) => typeof option === 'string' ? option : companyName(option)} renderInput={(params) => <TextField {...params} placeholder="Search or enter a customer company" InputProps={{ ...params.InputProps, endAdornment: <>{params.InputProps.endAdornment}<IconButton size="small" title="Add company" onClick={() => { setCustomerCompanyPrefill(form.customer_company || ''); setCustomerCompanyDrawerOpen(true); }}><Add /></IconButton></> }} />} /></label></div>}

        {step === 2 && <><div className="builder-title"><div><span>Step 3</span><h1>Your information</h1></div></div><label>{required('Issuing company')}<Autocomplete options={companies} value={selectedCompany || null} onChange={(_,value) => chooseCompany(value)} getOptionLabel={companyName} isOptionEqualToValue={(option,value) => Number(option.id)===Number(value.id)} renderInput={(params) => <TextField {...params} placeholder="Search companies" />} /></label><div className="company-details"><label>Quotation number<input readOnly value={form.quotation_number} /></label><label>Company name<input value={form.issuer_company_name} onChange={(event) => update('issuer_company_name',event.target.value)} /></label><label>Company email<input value={form.issuer_company_email} onChange={(event) => update('issuer_company_email',event.target.value)} /></label><label>Company phone<input value={form.issuer_company_phone} onChange={(event) => update('issuer_company_phone',event.target.value)} /></label><label>GST number<input value={form.issuer_company_gst_number} onChange={(event) => update('issuer_company_gst_number',event.target.value)} /></label><label className="company-address-override">Company address<textarea rows="2" value={form.issuer_company_address} onChange={(event) => update('issuer_company_address',event.target.value)} /></label></div><label>Cover letter<WgiymEditor value={form.cover_letter_html} onChange={(value) => update('cover_letter_html',value)} /></label><label>Terms and conditions<WgiymEditor value={form.terms_conditions_html} onChange={(value) => update('terms_conditions_html',value)} /></label><FileUploader label="Company logo" fileUrl={form.company_logo_url} onFileUploaded={(url) => update('company_logo_url',url)} /></>}

        {step === 3 && <>
          <div className="builder-title"><div><span>Step 4</span><h1>Order lines</h1></div><div className="builder-title-actions"><button type="button" className="secondary-action" onClick={() => setColumnsDrawerOpen(true)}><SettingsOutlined />Edit columns</button><button type="button" className="primary-action" onClick={() => setProductPickerOpen(true)}><Add />Add products</button></div></div>
          <div className="order-lines-scroll"><table className="order-lines"><thead><tr><th className="order-drag-column" />{visibleDefinitions.map((column) => <th key={column.key}>{column.label}</th>)}<th /></tr></thead><tbody>{items.length ? items.map((item,index) => <tr key={`${item.product_id}-${index}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => reorderLine(Number(event.dataTransfer.getData('line-index')),index)}><td className="order-drag-column"><button type="button" className="order-drag-handle" draggable onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.setData('line-index',String(index)); }} title="Drag row"><DragIndicator /></button></td>{visibleDefinitions.map((column) => <td key={column.key}>{lineValue(item,index,column.key)}</td>)}<td><IconButton size="small" aria-label="Remove line" onClick={() => setItems((current) => current.filter((_,itemIndex) => itemIndex!==index))}><DeleteOutline /></IconButton></td></tr>) : <tr><td className="empty-lines" colSpan={visibleDefinitions.length+2}>No products have been added. Use Add products to build the quotation.</td></tr>}</tbody></table></div>
          <div className="order-layout-options"><div><strong>Quotation line layout</strong><span>Choose whether the final quotation separates products by the top-most product category.</span></div><label><Switch checked={form.group_items_by_top_category} onChange={(event) => update('group_items_by_top_category',event.target.checked)} /><span>Separate quotation sections and summaries by parent-most category</span></label></div>
          <section className="order-summary"><h2>Order summary</h2><div><span>Subtotal</span><strong>{money(totals.subtotal)}</strong></div><div><span>Item discounts</span><strong>− {money(totals.itemDiscount)}</strong></div><div className="summary-discount"><label>Cumulative discount<select value={form.quotation_discount_type} onChange={(event) => update('quotation_discount_type',event.target.value)}><option value="PERCENT">Percent</option><option value="FLAT">Flat amount</option></select></label><input type="number" min="0" value={form.quotation_discount_value} onChange={(event) => update('quotation_discount_value',event.target.value)} /></div><div><span>Tax</span><strong>{money(totals.tax)}</strong></div><div><span>Cumulative margin</span><strong className={totals.margin<0?'negative':''}>{money(totals.margin)}</strong></div><div className="summary-total"><span>Total</span><strong>{money(totals.total)}</strong></div></section>
        </>}

        {step === 4 && <><div className="builder-title"><div><span>Step 5</span><h1>Review quotation</h1></div></div><div className="review-grid"><section><h2>Details <button onClick={() => goToStep(0)}><EditOutlined />Edit</button></h2><p><b>Template</b>Quotation Builder</p><p><b>Type</b>{form.quotation_type==='HOME_THEATRE'?'Home Theatre':'Home Automation'}</p><p><b>Dates</b>{formatDate(form.quotation_date)} to {formatDate(form.valid_until)}</p></section><section><h2>Customer <button onClick={() => goToStep(1)}><EditOutlined />Edit</button></h2><p><b>Name</b>{leadName(selectedLead)}</p><p><b>Company</b>{form.customer_company || '—'}</p><p><b>Email</b>{form.customer_email || '—'}</p></section><section><h2>Your info <button onClick={() => goToStep(2)}><EditOutlined />Edit</button></h2><p><b>Company</b>{form.issuer_company_name || companyName(selectedCompany)}</p><p><b>Quotation number</b>{form.quotation_number}</p></section><section><h2>Order <button onClick={() => goToStep(3)}><EditOutlined />Edit</button></h2><p><b>Line items</b>{items.length}</p><p><b>Total</b>{money(totals.total)}</p></section></div>{created?.id ? <div className="review-created-actions"><div><strong>Quotation created</strong><span>This quotation has been created once and is ready to view.</span></div><Link className="primary-action" to={`/quotations/${created.id}`}><OpenInNewOutlined />View quotation</Link><button disabled={saving} onClick={() => runFinalAction('download')}><DownloadOutlined />Download PDF</button>{created.publicUrl && <a href={created.publicUrl} target="_blank" rel="noreferrer"><LinkOutlined />Open public link</a>}</div> : <div className="review-actions"><button disabled={saving} onClick={() => runFinalAction('send')}><SendOutlined />Generate and send</button><button disabled={saving} onClick={() => runFinalAction('download')}><DownloadOutlined />Download PDF</button>{form.public_link_enabled && <button disabled={saving} onClick={() => runFinalAction('share')}><LinkOutlined />Share link</button>}<button className="primary-action" disabled={saving} onClick={() => runFinalAction('create')}><SaveOutlined />{saving?'Creating…':'Create quotation'}</button></div>}</>}

        {step === 5 && <><div className="builder-title"><div><span>Step 6</span><h1>Review quotation</h1></div></div><div className="review-grid"><section><h2>Details <button onClick={() => goToStep(0)}><EditOutlined />Edit</button></h2><p><b>Template</b>Quotation Builder</p><p><b>Type</b>{form.quotation_type==='HOME_THEATRE'?'Home Theatre':'Home Automation'}</p><p><b>Dates</b>{formatDate(form.quotation_date)} to {formatDate(form.valid_until)}</p><p><b>Client access</b>{form.public_link_enabled ? `${form.protected_link?'OTP protected · ':''}${form.acceptance_enabled?'Online acceptance enabled':'View only'}` : 'Disabled'}</p></section><section><h2>Customer <button onClick={() => goToStep(1)}><EditOutlined />Edit</button></h2><p><b>Name</b>{leadName(selectedLead)}</p><p><b>Email</b>{form.customer_email || '—'}</p><p><b>Phone</b>{form.customer_phone || '—'}</p></section><section><h2>Your info <button onClick={() => goToStep(2)}><EditOutlined />Edit</button></h2><p><b>Company</b>{form.issuer_company_name || companyName(selectedCompany)}</p><p><b>Quotation number</b>{form.quotation_number}</p></section><section><h2>Order <button onClick={() => goToStep(3)}><EditOutlined />Edit</button></h2><p><b>Line items</b>{items.length}</p><p><b>Margin</b>{money(totals.margin)}</p><p><b>Total discount</b>{money(totals.itemDiscount+totals.overallDiscount)}</p><p><b>Total</b>{money(totals.total)}</p></section><section className="review-wide"><h2>Payment terms <button onClick={() => goToStep(4)}><EditOutlined />Edit</button></h2><div dangerouslySetInnerHTML={{ __html:form.payment_terms }} /></section></div>{created?.id ? <div className="review-created-actions"><div><strong>Quotation created</strong><span>This quotation has been created once and is ready to view.</span></div><Link className="primary-action" to={`/quotations/${created.id}`}><OpenInNewOutlined />View quotation</Link><button disabled={saving} onClick={() => runFinalAction('download')}><DownloadOutlined />Download PDF</button>{created.publicUrl && <a href={created.publicUrl} target="_blank" rel="noreferrer"><LinkOutlined />Open public link</a>}</div> : <div className="review-actions"><button disabled={saving} onClick={() => runFinalAction('send')}><SendOutlined />Generate and send</button><button disabled={saving} onClick={() => runFinalAction('download')}><DownloadOutlined />Download PDF</button>{form.public_link_enabled && <button disabled={saving} onClick={() => runFinalAction('share')}><LinkOutlined />Share link</button>}<button className="primary-action" disabled={saving} onClick={() => runFinalAction('create')}><SaveOutlined />{saving?'Creating…':'Create quotation'}</button></div>}</>}
      </div>
      <QuotationPreview html={previewHtml} loading={previewLoading} error={previewError} />
    </section>

    {message.text && <Alert className="builder-message" severity={message.severity} onClose={() => setMessage({ text:'', severity:'error' })}>{message.text}</Alert>}
    <footer className="builder-footer"><div><button type="button" onClick={() => setStep((current) => Math.max(0,current-1))} disabled={!step}><ArrowBack />Back</button><button type="button" className="exit-link" onClick={() => navigate('/quotations')}>Exit</button></div><div><button type="button" onClick={saveDraft}><SaveOutlined />Save</button>{step<steps.length-1 && <button type="button" className="primary" onClick={next}>Next<ChevronRight /></button>}</div></footer>

    <AddLeadDialog open={leadDrawerOpen} onClose={() => setLeadDrawerOpen(false)} onLeadCreated={(lead) => { setLeads((current) => [...current,lead]); chooseLead(lead); }} />
    <AddCompanyDialog open={customerCompanyDrawerOpen} prefillName={customerCompanyPrefill} onClose={() => setCustomerCompanyDrawerOpen(false)} onCompanyCreated={(company) => { setCustomerCompanies((current) => [...current, company]); update('customer_company', companyName(company)); setCustomerCompanyDrawerOpen(false); }} />

    <Drawer anchor="right" open={productPickerOpen} onClose={() => setProductPickerOpen(false)} PaperProps={{ className:'product-picker-drawer erp-standard-drawer' }}><header><div><h2>Add products</h2><p>Search, filter and select one or more products.</p></div><IconButton onClick={() => setProductPickerOpen(false)}><Close /></IconButton></header><div className="product-picker-tools"><label><Search /><input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="Search products" />{productQuery && <IconButton onClick={() => setProductQuery('')}><Close /></IconButton>}</label><select value={productCategory} onChange={(event) => setProductCategory(event.target.value)}><option value="all">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select><select value={productSort} onChange={(event) => setProductSort(event.target.value)}><option value="name-asc">Name A–Z</option><option value="name-desc">Name Z–A</option><option value="price-asc">Lowest price</option><option value="price-desc">Highest price</option></select></div><div className="product-picker-table"><table><thead><tr><th /><th>Product</th><th>Category</th><th>SKU</th><th>Price</th><th>Margin</th></tr></thead><tbody>{pickerProducts.map((product) => <tr key={product.id}><td><Checkbox checked={pickedProducts.includes(product.id)} onChange={() => setPickedProducts((current) => current.includes(product.id) ? current.filter((id) => id!==product.id) : [...current,product.id])} /></td><td><strong>{productName(product)}</strong></td><td>{product.category_name || product.category?.name || '—'}</td><td>{product.sku || '—'}</td><td>{money(product.selling_price || product.price)}</td><td>{money(Number(product.selling_price || product.price || 0)-Number(product.cost_price || 0))}</td></tr>)}</tbody></table></div><footer><span>{pickedProducts.length} selected</span><div><button onClick={() => setProductPickerOpen(false)}>Cancel</button><button className="primary-action" disabled={!pickedProducts.length} onClick={addPickedProducts}><Add />Add selected</button></div></footer></Drawer>

    <Drawer anchor="right" open={columnsDrawerOpen} onClose={() => setColumnsDrawerOpen(false)} PaperProps={{ className:'quotation-columns-drawer erp-standard-drawer' }}>
      <header><div><h2>Edit order line columns</h2><p>Choose product fields, arrange the table, and control what appears in the quotation.</p></div><IconButton onClick={() => setColumnsDrawerOpen(false)}><Close /></IconButton></header>
      <div className="quotation-columns-body">
        <div className="quotation-column-head"><span>Field</span><span>Table</span><span>Quotation</span></div>
        {columnOrder.map((key,index) => { const column=allLineColumns.find((item) => item.key===key); if (!column) return null; return <div className="quotation-column-row" key={key} onDragOver={(event) => event.preventDefault()} onDrop={(event) => reorderColumn(Number(event.dataTransfer.getData('column-index')),index)}><button type="button" draggable className="quotation-column-drag" onDragStart={(event) => event.dataTransfer.setData('column-index',String(index))}><DragIndicator /></button><span>{column.label}</span><input type="checkbox" checked={visibleColumns.includes(key)} disabled={column.required} onChange={() => toggleVisibleColumn(key)} /><input type="checkbox" checked={quotationColumns.includes(key)} disabled={!column.quotationAllowed || column.required} onChange={() => toggleQuotationColumn(key)} /></div>; })}
        <div className="quotation-columns-note"><strong>Internal-only fields are locked out of the quotation.</strong><span>Cost price, cost unit, cost quantity, margin, vendor, stock, category and product type stay available in the order-lines workspace but cannot be exposed on the customer quotation.</span></div>
        <div className="quotation-columns-group"><div><strong>Group by parent-most category</strong><span>Creates separate Audio / Video-style order-line sections and category summaries, followed by the consolidated grand summary.</span></div><Switch checked={form.group_items_by_top_category} onChange={(event) => update('group_items_by_top_category',event.target.checked)} /></div>
      </div>
      <footer><button type="button" className="primary-action" onClick={() => setColumnsDrawerOpen(false)}>Done</button></footer>
    </Drawer>
  </main>;
}
