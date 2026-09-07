import React, { useEffect, useMemo, useState } from 'react';
import { Add, Close, Search } from '@mui/icons-material';
import { Checkbox, Drawer, IconButton } from '@mui/material';
import { useSettings } from '../../context/SettingsContext';
import { displayCurrency } from '../../utils/currencyUtils';
import '../../assets/styles/QuotationBuilder.scss';

const productName = (product) => product?.name || product?.product_name || `Product #${product?.id}`;

const formatMoney = (value, currencyCode) => {
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

export default function QuotationProductPickerDrawer({ open, products = [], onClose, onAdd }) {
  const { settings } = useSettings() || {};
  const currencyCode = settings?.currency_code || 'INR';
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('name-asc');
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (!open) return;
    setSelectedIds([]);
  }, [open]);

  const categories = useMemo(() => [...new Set(products
    .map((product) => product.category_name || product.category?.name)
    .filter(Boolean))].sort(), [products]);

  const visibleProducts = useMemo(() => products.filter((product) => {
    const normalizedQuery = query.toLowerCase();
    const productCategory = product.category_name || product.category?.name || '';
    return (category === 'all' || productCategory === category)
      && (!normalizedQuery || `${productName(product)} ${product.sku || ''} ${product.brand || ''} ${productCategory}`.toLowerCase().includes(normalizedQuery));
  }).sort((a, b) => {
    if (sort === 'price-asc') return Number(a.selling_price || a.price || 0) - Number(b.selling_price || b.price || 0);
    if (sort === 'price-desc') return Number(b.selling_price || b.price || 0) - Number(a.selling_price || a.price || 0);
    return productName(a).localeCompare(productName(b)) * (sort === 'name-desc' ? -1 : 1);
  }), [category, products, query, sort]);

  const toggleProduct = (productId) => {
    const key = String(productId);
    setSelectedIds((current) => current.includes(key)
      ? current.filter((id) => id !== key)
      : [...current, key]);
  };

  const addSelected = () => {
    const selected = products.filter((product) => selectedIds.includes(String(product.id)));
    if (!selected.length) return;
    onAdd?.(selected);
    setSelectedIds([]);
  };

  return <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ className: 'product-picker-drawer erp-standard-drawer' }}>
    <header>
      <div><h2>Add products</h2><p>Search, filter and select one or more products.</p></div>
      <IconButton onClick={onClose}><Close /></IconButton>
    </header>
    <div className="product-picker-tools">
      <label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" />{query && <IconButton onClick={() => setQuery('')}><Close /></IconButton>}</label>
      <select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
      <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="name-asc">Name A–Z</option><option value="name-desc">Name Z–A</option><option value="price-asc">Lowest price</option><option value="price-desc">Highest price</option></select>
    </div>
    <div className="product-picker-table">
      <table><thead><tr><th /><th>Product</th><th>Category</th><th>SKU</th><th>Price</th><th>Margin</th></tr></thead><tbody>
        {visibleProducts.map((product) => <tr key={product.id}>
          <td><Checkbox checked={selectedIds.includes(String(product.id))} onChange={() => toggleProduct(product.id)} /></td>
          <td><strong>{productName(product)}</strong></td>
          <td>{product.category_name || product.category?.name || '—'}</td>
          <td>{product.sku || '—'}</td>
          <td>{formatMoney(product.selling_price || product.price, currencyCode)}</td>
          <td>{formatMoney(Number(product.selling_price || product.price || 0) - Number(product.cost_price || 0), currencyCode)}</td>
        </tr>)}
      </tbody></table>
    </div>
    <footer><span>{selectedIds.length} selected</span><div><button type="button" onClick={onClose}>Cancel</button><button type="button" className="primary-action" disabled={!selectedIds.length} onClick={addSelected}><Add />Add selected</button></div></footer>
  </Drawer>;
}
