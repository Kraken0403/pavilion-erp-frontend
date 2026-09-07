import React, { useEffect, useState } from 'react';
import { getCategories } from '../../services/productServices';
import HubSpotListing from '../ui/HubSpotListing';
import AddCategoryDialog from './AddCategoryDialog';

const fields = [
  { key: 'name', label: 'Category' },
  { key: 'rawName', label: 'Name' },
  { key: 'product_count', label: 'Products' },
  { key: 'parent_id', label: 'Parent category' },
];

export default function CategoryList() {
  const [categories, setCategories] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const load = async () => {
    const data = await getCategories(); const flat = [];
    const flatten = (nodes = [], path = '') => nodes.forEach((category) => {
      const name = path ? `${path} > ${category.name}` : category.name;
      flat.push({ ...category, name, rawName: category.name });
      flatten(category.children, name);
    });
    flatten(data); setCategories(flat);
  };
  useEffect(() => { load().catch(() => setCategories([])); }, []);
  const edit = (category) => { setEditing(category); setOpen(true); };
  return <><HubSpotListing title="Categories" createLabel="Add category" rows={categories} initialFields={fields} onCreate={() => { setEditing(null); setOpen(true); }} onRowOpen={edit} onUpdateRow={edit} onRefresh={load} /><AddCategoryDialog open={open} category={editing} onClose={() => { setOpen(false); setEditing(null); load(); }} /></>;
}
