import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Add, DeleteOutline, EditOutlined, FileDownloadOutlined,
} from '@mui/icons-material';
import { Autocomplete, TextField } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import SingleRecordWorkspace from '../components/ui/SingleRecordWorkspace';
import AddProductDialog from '../components/products/AddProductDialog';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import NotificationSnackbar from '../components/ui/NotificationSnackbar';
import {
  addProductVendor,
  createProductUnit,
  deleteProduct,
  fetchProductById,
  getProductAnalytics,
  getProductPackaging,
  getProductUnits,
  getProductVendors,
  getVariantsByProduct,
  removeProductVendor,
  updateProduct,
  uploadProductImage,
} from '../services/productServices';
import { getVendors } from '../services/vendorService';
import { resolveBackendAssetUrl } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { displayCurrency } from '../utils/currencyUtils';
import '../assets/styles/ProductDetails.scss';

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.error
  || error?.response?.data?.details
  || error?.message
  || fallback
);

const formatMoney = (value, currencyCode = 'INR') => {
  const code = String(currencyCode || 'INR').trim() || 'INR';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: code.length === 3 ? code.toUpperCase() : 'INR',
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  } catch (_) {
    return `${displayCurrency(code)} ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }
};

const exportRecordCsv = (record, filename) => {
  const rows = Object.entries(record || {}).filter(([, value]) => (
    value === null
    || value === undefined
    || ['string', 'number', 'boolean'].includes(typeof value)
  ));
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = ['Field,Value', ...rows.map(([key, value]) => `${escape(key)},${escape(value)}`)].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const normalizeVendorRows = (rows, productRow = null) => {
  const raw = Array.isArray(rows)
    ? rows
    : Array.isArray(rows?.data)
      ? rows.data
      : Array.isArray(rows?.vendors)
        ? rows.vendors
        : [];
  const byId = new Map();
  raw.forEach((vendor) => {
    if (vendor?.id !== undefined && vendor?.id !== null) byId.set(String(vendor.id), vendor);
  });

  const primaryId = productRow?.vendor_id ?? productRow?.vendor?.id;
  if (primaryId !== undefined && primaryId !== null && !byId.has(String(primaryId))) {
    byId.set(String(primaryId), {
      ...(productRow?.vendor || {}),
      id: primaryId,
      name: productRow?.vendor_name || productRow?.vendor?.name || `Vendor #${primaryId}`,
      is_primary: 1,
    });
  }

  return [...byId.values()].sort((a, b) => Number(b.is_primary || 0) - Number(a.is_primary || 0) || String(a.name || '').localeCompare(String(b.name || '')));
};

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const currencyCode = settings?.currency_code || 'INR';
  const currencyLabel = displayCurrency(currencyCode);
  const money = useCallback((value) => formatMoney(value, currencyCode), [currencyCode]);

  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [packaging, setPackaging] = useState([]);
  const [units, setUnits] = useState([]);
  const [productVendors, setProductVendors] = useState([]);
  const [allVendors, setAllVendors] = useState([]);
  const [vendorToAdd, setVendorToAdd] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [error, setError] = useState('');
  const [vendorSaving, setVendorSaving] = useState(false);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  const showNotification = useCallback((message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  }, []);

  const loadAvailableVendors = useCallback(async () => {
    setVendorsLoading(true);
    try {
      const rows = await getVendors({ includeInactive: true });
      const activeRows = (Array.isArray(rows) ? rows : []).filter((vendor) => Number(vendor.is_active ?? 1) !== 0);
      setAllVendors(activeRows);
      return activeRows;
    } finally {
      setVendorsLoading(false);
    }
  }, []);

  const loadRelated = useCallback(async (row) => {
    const results = await Promise.allSettled([
      row?.type === 'variable' ? getVariantsByProduct(id) : Promise.resolve(row?.variants || []),
      getProductPackaging(id),
      getProductUnits(),
      getProductVendors(id),
      getVendors({ includeInactive: true }),
      getProductAnalytics(id),
    ]);

    const value = (index, fallback) => results[index]?.status === 'fulfilled' ? results[index].value : fallback;
    const variantRows = value(0, row?.variants || []);
    const packagingRows = value(1, []);
    const unitRows = value(2, []);
    const vendorRows = value(3, []);
    const availableVendors = value(4, []);
    const analyticsData = value(5, null);

    setVariants(Array.isArray(variantRows) ? variantRows : []);
    setPackaging(Array.isArray(packagingRows) ? packagingRows : []);
    setUnits(Array.isArray(unitRows) ? unitRows : []);
    setProductVendors(normalizeVendorRows(vendorRows, row));
    setAllVendors((Array.isArray(availableVendors) ? availableVendors : []).filter((vendor) => Number(vendor.is_active ?? 1) !== 0));
    setAnalytics(analyticsData);
  }, [id]);

  const load = useCallback(async () => {
    try {
      const row = await fetchProductById(id);
      setProduct(row);
      setError('');
      loadRelated(row).catch((relatedError) => {
        console.error('Failed to load related product information:', relatedError);
      });
    } catch (loadError) {
      setError(loadError.response?.data?.error || 'Unable to load product.');
    }
  }, [id, loadRelated]);

  useEffect(() => { load(); }, [load]);

  const handleAddUnit = useCallback(async (name) => {
    const saved = await createProductUnit(name);
    setUnits((current) => current.some((unit) => unit.name === saved.name)
      ? current
      : [...current, saved].sort((a, b) => a.name.localeCompare(b.name)));
    return saved;
  }, []);

  const unitOptions = useMemo(
    () => units.map((unit) => ({ value: unit.name, label: unit.name })),
    [units],
  );

  const fields = useMemo(() => [
    { key: 'name', label: 'Product name' },
    { key: 'sku', label: 'SKU' },
    { key: 'brand', label: 'Brand' },
    { key: 'description', label: 'Description', type: 'html', placeholder: 'Add product description…' },
    { key: 'type', label: 'Product type', type: 'select', options: ['simple', 'variable'] },
    { key: 'stock', label: 'Stock', type: 'number' },
    { key: 'category_name', label: 'Category', readOnly: true },
    { key: 'vendor_name', label: 'Primary vendor', readOnly: true },
    { key: 'is_favorite', label: 'Favorite', type: 'select', options: [{ value: 1, label: 'Yes' }, { value: 0, label: 'No' }], render: (value) => Number(value) ? 'Yes' : 'No' },
    { key: 'selling_price', label: `Selling price (${currencyLabel})`, type: 'number', render: (value) => money(value) },
    { key: 'selling_price_unit', label: 'Selling unit', type: 'select', options: unitOptions, onAddOption: handleAddUnit, addOptionLabel: 'Add unit', addOptionPlaceholder: 'e.g. pair' },
    { key: 'selling_price_qty', label: 'Selling quantity', type: 'number' },
    { key: 'cost_price', label: `Cost price (${currencyLabel})`, type: 'number', render: (value) => money(value) },
    { key: 'cost_price_unit', label: 'Cost unit', type: 'select', options: unitOptions, onAddOption: handleAddUnit, addOptionLabel: 'Add unit', addOptionPlaceholder: 'e.g. pair' },
    { key: 'cost_price_qty', label: 'Cost quantity', type: 'number' },
    { key: 'cost_pricing_mode', label: 'Cost pricing mode', type: 'select', options: ['absolute', 'percentage'] },
    { key: 'cost_discount_percent', label: 'Cost discount %', type: 'number' },
    { key: 'gst_rate', label: 'GST rate %', type: 'number' },
    { key: 'hsn_sac', label: 'HSN / SAC' },
    {
      key: 'image_url',
      label: 'Product image',
      type: 'image',
      onUpload: uploadProductImage,
      resolveImage: resolveBackendAssetUrl,
      render: (value) => value ? <img className="record-product-image" src={resolveBackendAssetUrl(value)} alt="Product" /> : '—',
    },
    { key: 'created_at', label: 'Created', type: 'datetime', readOnly: true },
    { key: 'updated_at', label: 'Updated', type: 'datetime', readOnly: true },
  ], [currencyLabel, handleAddUnit, money, unitOptions]);

  const record = useMemo(() => product ? {
    ...product,
    category_name: product.category_name || product.category?.name || '',
    vendor_name: product.vendor_name || product.vendor?.name || '',
  } : null, [product]);

  const handleExport = useCallback(() => {
    if (!record) return;
    exportRecordCsv(record, `${String(product?.name || `product-${id}`).replace(/[^a-z0-9-_]+/gi, '-')}.csv`);
    showNotification('Product exported successfully.', 'success');
  }, [id, product?.name, record, showNotification]);

  const cards = useMemo(() => product ? [
    { id: 'product-details', title: 'Product Details', position: 'left', fieldKeys: ['sku', 'brand', 'description', 'image_url'], deletable: false },
    { id: 'key-information', title: 'Key Information', position: 'left', fieldKeys: ['type', 'category_name', 'vendor_name', 'stock', 'is_favorite'], deletable: false },
    {
      id: 'actions',
      title: 'Actions',
      position: 'right',
      fixed: true,
      disableDrag: true,
      deletable: false,
      allowSettings: false,
      titleEditable: false,
      fieldKeys: [],
      customContent: () => <div className="record-action-buttons">
        <button type="button" className="hs-listing__create" onClick={() => setEditOpen(true)}><EditOutlined />Edit product</button>
        <button type="button" className="hs-listing__create" onClick={handleExport}><FileDownloadOutlined />Export product</button>
      </div>,
    },
    { id: 'pricing', title: 'Pricing & Tax', position: 'right', deletable: false, fieldKeys: ['selling_price', 'selling_price_unit', 'selling_price_qty', 'gst_rate', 'hsn_sac'] },
    { id: 'costing', title: 'Cost Information', position: 'right', fieldKeys: ['cost_pricing_mode', 'cost_price', 'cost_price_unit', 'cost_price_qty', 'cost_discount_percent'] },
    {
      id: 'variants',
      title: 'Variants',
      position: 'right',
      fieldKeys: [],
      defaultCollapsed: variants.length === 0,
      customContent: () => <div className="record-quotation-list">{variants.length ? variants.map((variant, index) => <div className="record-quotation-row" key={variant.id || index}><strong>{variant.sku || `Variant ${index + 1}`}</strong><span><em>{(variant.attributes || []).map((attribute) => attribute.value).filter(Boolean).join(' / ') || 'Variant'}</em><b>Stock: {variant.stock ?? 0}</b></span></div>) : <p className="record-empty">No variants configured.</p>}</div>,
    },
    {
      id: 'packaging',
      title: 'Packaging',
      position: 'right',
      fieldKeys: [],
      defaultCollapsed: packaging.length === 0,
      customContent: () => <div className="record-quotation-list">{packaging.length ? packaging.map((item, index) => <div className="record-quotation-row" key={item.id || index}><strong>{item.packaging_type || 'Packaging'}</strong><span><em>{[item.packaging_weight, item.packaging_unit].filter(Boolean).join(' ')}</em><b>{item.length ? `${item.length} × ${item.width || 0} × ${item.height || 0} ${item.dimensions_unit || ''}` : ''}</b></span></div>) : <p className="record-empty">No packaging details configured.</p>}</div>,
    },
  ] : [], [handleExport, packaging, product, variants]);

  const summaryCard = useMemo(() => product ? ({
    backTo: '/products/list',
    backLabel: 'Products',
    titleFieldKey: 'name',
    subtitle: [product.sku, product.brand].filter(Boolean).join(' · '),
    fieldKeys: ['stock', 'sku', 'category_name', 'selling_price'],
    actions: [
      { label: 'Edit product', icon: <EditOutlined />, onClick: () => setEditOpen(true) },
      { label: 'Export product', icon: <FileDownloadOutlined />, onClick: handleExport },
      { label: 'Delete product', icon: <DeleteOutline />, danger: true, onClick: () => setDeleteOpen(true) },
    ],
  }) : null, [handleExport, product]);

  const activities = useMemo(() => product ? [
    { id: 'updated', type: 'product', title: 'Product updated', description: `${product.name || 'Product'} details were last updated.`, created_at: product.updated_at, editable: false },
    { id: 'created', type: 'product', title: 'Product created', description: `${product.name || 'Product'} was added to the catalog.`, created_at: product.created_at, editable: false },
  ].filter((item) => item.created_at) : [], [product]);

  const availableProductVendors = useMemo(() => {
    const selected = new Set(productVendors.map((vendor) => Number(vendor.id)));
    return allVendors.filter((vendor) => !selected.has(Number(vendor.id)));
  }, [allVendors, productVendors]);

  const refreshVendors = useCallback(async () => {
    const [rows, refreshedProduct, available] = await Promise.all([
      getProductVendors(id),
      fetchProductById(id),
      loadAvailableVendors(),
    ]);
    setProductVendors(normalizeVendorRows(rows, refreshedProduct));
    setVendorToAdd(null);
    setProduct(refreshedProduct);
    setAllVendors((Array.isArray(available) ? available : []).filter((vendor) => Number(vendor.is_active ?? 1) !== 0));
  }, [id, loadAvailableVendors]);

  const handleAttachVendor = async (notify) => {
    if (vendorSaving) return;
    if (!vendorToAdd?.id) {
      notify?.('Select a vendor first.', 'info');
      return;
    }
    setVendorSaving(true);
    try {
      await addProductVendor(id, vendorToAdd.id);
      await refreshVendors();
      notify?.('Vendor added to product successfully.', 'success');
    } catch (vendorError) {
      notify?.(getErrorMessage(vendorError, 'Unable to add vendor.'), 'error');
    } finally {
      setVendorSaving(false);
    }
  };

  const handleRemoveVendor = async (vendorId, notify) => {
    if (vendorSaving) return;
    setVendorSaving(true);
    try {
      await removeProductVendor(id, vendorId);
      await refreshVendors();
      notify?.('Vendor removed from product successfully.', 'success');
    } catch (vendorError) {
      notify?.(getErrorMessage(vendorError, 'Unable to remove vendor.'), 'error');
    } finally {
      setVendorSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteSaving) return;
    setDeleteSaving(true);
    try {
      await deleteProduct(id);
      setDeleteOpen(false);
      navigate('/products/list');
    } catch (deleteError) {
      showNotification(getErrorMessage(deleteError, 'Unable to delete product.'), 'error');
      setDeleteSaving(false);
    }
  };

  const saveProductFields = useCallback(async (patch) => {
    const editableProduct = { ...product };
    [
      'bundle_items', 'add_on_products', 'images', 'category', 'variants', 'ingredients',
      'vendor_name', 'category_name', 'vendor', 'created_at', 'updated_at',
    ].forEach((key) => delete editableProduct[key]);
    const payload = { ...editableProduct, ...patch };
    if (payload.cost_pricing_mode === 'percentage') delete payload.cost_price;

    await updateProduct(id, payload);
    const refreshedProduct = await fetchProductById(id);
    setProduct(refreshedProduct);
    setError('');
    loadRelated(refreshedProduct).catch((relatedError) => {
      console.error('Failed to refresh related product information:', relatedError);
    });
  }, [id, loadRelated, product]);

  if (error) return <div className="record-load-error">{error}</div>;
  if (!record) return <div className="record-load-error">Loading product…</div>;

  const summary = analytics?.summary || {};
  const revenueContent = <div className="product-analytics">
    <div className="record-stat-grid product-analytics__stats">
      <div className="record-stat"><span>Approved quotation value ({currencyLabel})</span><strong>{money(summary.approved_amount)}</strong></div>
      <div className="record-stat"><span>Quantity sold / approved</span><strong>{Number(summary.approved_quantity || 0)}</strong></div>
      <div className="record-stat"><span>Approved quotations</span><strong>{Number(summary.approved_quotations || 0)}</strong></div>
      <div className="record-stat"><span>Rejected quotations</span><strong>{Number(summary.rejected_quotations || 0)}</strong></div>
      <div className="record-stat"><span>Pending / other quotations</span><strong>{Number(summary.pending_quotations || 0)}</strong></div>
      <div className="record-stat"><span>Favorite product</span><strong>{summary.is_favorite ? 'Yes' : 'No'}</strong></div>
    </div>

    {!!analytics?.status_breakdown?.length && <section className="product-analytics__section">
      <h3>Quotation status breakdown</h3>
      <div className="product-analytics__table-wrap"><table><thead><tr><th>Status</th><th>Quotations</th><th>Quantity</th><th>Value ({currencyLabel})</th></tr></thead><tbody>{analytics.status_breakdown.map((row) => <tr key={row.status}><td>{String(row.status || 'pending').replace(/_/g, ' ')}</td><td>{row.quotation_count}</td><td>{Number(row.quantity || 0)}</td><td>{money(row.amount)}</td></tr>)}</tbody></table></div>
    </section>}

    <section className="product-analytics__section">
      <h3>Customers who ordered this product</h3>
      {analytics?.customers?.length ? <div className="product-analytics__table-wrap"><table><thead><tr><th>Customer</th><th>Company</th><th>Approved quotations</th><th>Quantity</th><th>Value ({currencyLabel})</th></tr></thead><tbody>{analytics.customers.map((customer) => <tr key={customer.lead_id}><td><strong>{customer.customer_name}</strong><small>{customer.email || customer.phone_number || ''}</small></td><td>{customer.company_name || '—'}</td><td>{customer.approved_quotations}</td><td>{Number(customer.quantity || 0)}</td><td>{money(customer.amount)}</td></tr>)}</tbody></table></div> : <div className="record-empty-state">No approved quotation customer data for this product yet.</div>}
    </section>
  </div>;

  const vendorContent = ({ notify }) => <div className="product-vendors-tab">
    <div className="product-vendors-tab__add">
      <Autocomplete
        className="product-vendor-search"
        size="small"
        value={vendorToAdd}
        options={availableProductVendors}
        loading={vendorsLoading}
        onOpen={() => {
          loadAvailableVendors().catch((vendorError) => notify?.(getErrorMessage(vendorError, 'Unable to refresh vendors.'), 'error'));
        }}
        onChange={(_, value) => setVendorToAdd(value)}
        getOptionLabel={(vendor) => vendor?.name || ''}
        isOptionEqualToValue={(option, value) => Number(option.id) === Number(value.id)}
        noOptionsText="No vendors found"
        renderInput={(params) => <TextField {...params} placeholder="Search vendor..." />}
      />
      <button type="button" className="hs-listing__create" disabled={vendorSaving} onClick={() => handleAttachVendor(notify)}><Add />{vendorSaving ? 'Saving…' : 'Add vendor'}</button>
    </div>
    <div className="product-vendors-tab__list">
      {productVendors.length ? productVendors.map((vendor) => <article key={vendor.id}>
        <div><strong>{vendor.name}</strong><span>{[vendor.contact_person, vendor.phone, vendor.email].filter(Boolean).join(' · ') || 'No contact details'}</span>{vendor.is_primary ? <small>Primary vendor</small> : null}</div>
        <button type="button" disabled={vendorSaving} onClick={() => handleRemoveVendor(vendor.id, notify)}><DeleteOutline />Remove</button>
      </article>) : <div className="record-empty-state">No vendors linked to this product.</div>}
    </div>
  </div>;

  return <>
    <SingleRecordWorkspace
      storageKey={`pav-erp:record:product:${id}`}
      backTo="/products/list"
      backLabel="Products"
      title={product.name || `Product #${id}`}
      subtitle={[product.sku, product.brand, product.category_name || product.category?.name].filter(Boolean).join(' · ')}
      hidePageHeader
      summaryCard={summaryCard}
      record={record}
      fields={fields}
      initialCards={cards}
      activities={activities}
      onSaveFields={saveProductFields}
      revenueContent={revenueContent}
      extraTabs={[{ id: 'vendors', label: 'Vendors', content: vendorContent }]}
    />

    <AddProductDialog
      open={editOpen}
      productToEdit={product}
      onClose={() => setEditOpen(false)}
      onAddProduct={async (payload) => {
        try {
          await updateProduct(id, payload);
          setEditOpen(false);
          await load();
          showNotification('Product updated successfully.', 'success');
        } catch (updateError) {
          showNotification(getErrorMessage(updateError, 'Unable to update product.'), 'error');
          throw updateError;
        }
      }}
    />

    <ConfirmDialog
      open={deleteOpen}
      title="Delete product"
      message={`Delete ${product.name || 'this product'}? This action cannot be undone.`}
      confirmText="Delete product"
      onConfirm={handleDelete}
      onCancel={() => setDeleteOpen(false)}
      loading={deleteSaving}
    />

    <NotificationSnackbar
      open={notification.open}
      message={notification.message}
      severity={notification.severity}
      onClose={() => setNotification((current) => ({ ...current, open: false }))}
    />
  </>;
}

export default ProductDetail;
