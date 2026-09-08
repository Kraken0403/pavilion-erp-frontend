import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import HubSpotListing from '../ui/HubSpotListing';
import AddProductDialog from './AddProductDialog';
import { createProduct, fetchAllProducts, fetchProductById, updateProduct } from '../../services/productServices';

const fields = [{ key: 'name', label: 'Product name' }, { key: 'sku', label: 'SKU' }, { key: 'brand', label: 'Brand' }, { key: 'category_name', label: 'Category' }, { key: 'vendor_name', label: 'Vendor' }, { key: 'type', label: 'Type' }, { key: 'selling_price', label: 'Selling price' }, { key: 'stock', label: 'Stock' }];

export default function ProductList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState([]); const [dialogOpen, setDialogOpen] = useState(false); const [editing, setEditing] = useState(null);
  const load = async () => { const data = await fetchAllProducts(); setProducts(Array.isArray(data) ? data : data?.products || []); };
  useEffect(() => { load().catch(() => setProducts([])); }, []);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('create') === '1') { setEditing(null); setDialogOpen(true); return; }
    const editId = params.get('edit');
    if (editId) edit({ id: editId });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);
  const edit = async (row) => { try { setEditing(await fetchProductById(row.id)); setDialogOpen(true); } catch { setEditing(row); setDialogOpen(true); } };
  const save = async (data) => { if (editing?.id) await updateProduct(editing.id, data); else await createProduct(data); setDialogOpen(false); setEditing(null); if (new URLSearchParams(location.search).has('create') || new URLSearchParams(location.search).has('edit')) navigate('/products/list', { replace: true }); await load(); };
  const closeDialog = () => { setDialogOpen(false); setEditing(null); if (new URLSearchParams(location.search).has('create') || new URLSearchParams(location.search).has('edit')) navigate('/products/list', { replace: true }); };
  return <><HubSpotListing title="Products" createLabel="Add product" rows={products} initialFields={fields} onCreate={() => { setEditing(null); setDialogOpen(true); }} onRowOpen={(row) => navigate(`/products/${row.id}`)} onUpdateRow={edit} /><AddProductDialog open={dialogOpen} onClose={closeDialog} onAddProduct={save} productToEdit={editing} /></>;
}
