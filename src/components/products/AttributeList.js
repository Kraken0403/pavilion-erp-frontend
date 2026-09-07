import React, { useEffect, useState } from 'react';
import { getAllAttributes, getAttributeOptions } from '../../services/productServices';
import HubSpotListing from '../ui/HubSpotListing';
import AddAttributeDialog from './AddAttributeDialog';

const fields = [{ key: 'name', label: 'Attribute' }, { key: 'option_values', label: 'Options' }, { key: 'optionsCount', label: 'Option count' }];
export default function AttributeList() {
  const [attributes, setAttributes] = useState([]); const [open, setOpen] = useState(false); const [editing, setEditing] = useState(null);
  const load = async () => { const raw = await getAllAttributes(); const data = await Promise.all(raw.map(async (attribute) => { const options = await getAttributeOptions(attribute.id); return { ...attribute, options, option_values: options.map((option) => option.value).join(', '), optionsCount: options.length }; })); setAttributes(data); };
  useEffect(() => { load().catch(() => setAttributes([])); }, []);
  const edit = (attribute) => { setEditing(attribute); setOpen(true); };
  return <><HubSpotListing title="Attributes" createLabel="Add attribute" rows={attributes} initialFields={fields} onCreate={() => { setEditing(null); setOpen(true); }} onRowOpen={edit} onUpdateRow={edit} onRefresh={load} /><AddAttributeDialog open={open} attribute={editing} onClose={() => { setOpen(false); setEditing(null); load(); }} /></>;
}
