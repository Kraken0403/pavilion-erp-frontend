import React, { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete, Drawer, IconButton, MenuItem, TextField,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import {
  getCategories, getAllAttributes, getAttributeOptions, uploadProductImage,
  getProductUnits, createProductUnit,
} from '../../services/productServices';
import { getVendors } from '../../services/vendorService';
import { resolveBackendAssetUrl } from '../../services/api';
import VendorFormDialog from '../vendors/VendorFormDialog';
import WgiymEditor from '../ui/WgiymEditor';
import '../../assets/styles/AddProductDialog.scss';

const DEFAULT_UNITS = ['mg', 'g', 'kg', 'tonne', 'mm', 'cm', 'm', 'metre', 'ml', 'l', 'piece', 'pair', 'pcs', 'box', 'packet', 'bag', 'roll'];

const flattenCategories = (list) => {
  const out = [];
  const walk = (items, parents = []) => (items || []).forEach((category) => {
    const path = [...parents, category.name];
    out.push({ id: category.id, name: category.name, label: path.join(' > ') });
    if (category.children?.length) walk(category.children, path);
  });
  walk(list || []);
  return out;
};

const FieldLabel = ({ children, required = false }) => (
  <span className="product-drawer-label">
    {children}
    {required && <b>*</b>}
  </span>
);


function UnitSelect({ label, value, onChange, units, onAddUnit }) {
  const [adding, setAdding] = useState(false);
  const [newUnit, setNewUnit] = useState('');
  const [saving, setSaving] = useState(false);

  const saveUnit = async () => {
    const normalized = newUnit.trim().toLowerCase();
    if (!normalized || saving) return;
    setSaving(true);
    try {
      const saved = await onAddUnit(normalized);
      onChange(saved?.name || normalized);
      setNewUnit('');
      setAdding(false);
    } finally {
      setSaving(false);
    }
  };

  return <label className="product-unit-field">
    <div className="product-label-action">
      <FieldLabel>{label}</FieldLabel>
      <button type="button" onClick={() => setAdding((current) => !current)}>
        <AddCircleOutlineIcon /> Add unit
      </button>
    </div>
    {adding && <div className="product-unit-add">
      <input value={newUnit} onChange={(event) => setNewUnit(event.target.value)} placeholder="e.g. pair" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); saveUnit(); } }} />
      <button type="button" disabled={!newUnit.trim() || saving} onClick={saveUnit}>{saving ? 'Saving…' : 'Save'}</button>
    </div>}
    <TextField fullWidth size="small" select value={value} onChange={(event) => onChange(event.target.value)}>
      {units.map((unit) => <MenuItem key={unit.name || unit} value={unit.name || unit}>{unit.name || unit}</MenuItem>)}
    </TextField>
  </label>;
}

function AddProductDialog({ open, onClose, onAddProduct, productToEdit }) {
  const [tab, setTab] = useState('details');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sku, setSku] = useState('');
  const [stock, setStock] = useState(0);
  const [type, setType] = useState('simple');
  const [category, setCategory] = useState(null);
  const [brand, setBrand] = useState('');
  const [vendor, setVendor] = useState(null);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [costPricingMode, setCostPricingMode] = useState('absolute');
  const [costDiscountPercent, setCostDiscountPercent] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [costPriceUnit, setCostPriceUnit] = useState('piece');
  const [costPriceQty, setCostPriceQty] = useState(1);
  const [sellingPrice, setSellingPrice] = useState('');
  const [sellingPriceUnit, setSellingPriceUnit] = useState('piece');
  const [sellingPriceQty, setSellingPriceQty] = useState(1);
  const [gstRate, setGstRate] = useState(0);
  const [hsnSac, setHsnSac] = useState('');
  const [attributes, setAttributes] = useState([]);
  const [selectedAttributes, setSelectedAttributes] = useState([]);
  const [attributeOptions, setAttributeOptions] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({});
  const [variants, setVariants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [units, setUnits] = useState(DEFAULT_UNITS.map((name) => ({ name })));
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setTab('details');
    setName('');
    setDescription('');
    setImageUrl('');
    setSku('');
    setStock(0);
    setType('simple');
    setCategory(null);
    setBrand('');
    setVendor(null);
    setCostPricingMode('absolute');
    setCostDiscountPercent('');
    setCostPrice('');
    setCostPriceUnit('piece');
    setCostPriceQty(1);
    setSellingPrice('');
    setSellingPriceUnit('piece');
    setSellingPriceQty(1);
    setGstRate(0);
    setHsnSac('');
    setSelectedAttributes([]);
    setAttributeOptions({});
    setSelectedOptions({});
    setVariants([]);
    setPreviewUrl('');
    setError('');
  };

  useEffect(() => {
    if (!open) return;
    Promise.all([getCategories(), getAllAttributes(), getVendors(), getProductUnits()])
      .then(([categoryRows, attributeRows, vendorRows, unitRows]) => {
        setCategories(flattenCategories(categoryRows));
        setAttributes(attributeRows || []);
        setVendors(vendorRows || []);
        setUnits(unitRows?.length ? unitRows : DEFAULT_UNITS.map((name) => ({ name })));
      })
      .catch((loadError) => setError(loadError.response?.data?.error || 'Unable to load product form data.'));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!productToEdit) {
      resetForm();
      return;
    }

    setTab('details');
    setName(productToEdit.name || '');
    setDescription(productToEdit.description || '');
    setImageUrl(productToEdit.image_url || '');
    setPreviewUrl('');
    setBrand(productToEdit.brand || '');
    setSku(productToEdit.sku || '');
    setStock(productToEdit.stock || 0);
    setType(productToEdit.type || 'simple');
    setCostPricingMode(productToEdit.cost_pricing_mode || 'absolute');
    setCostDiscountPercent(productToEdit.cost_discount_percent ?? '');
    setCostPrice(productToEdit.cost_price ?? '');
    setCostPriceUnit(productToEdit.cost_price_unit || 'piece');
    setCostPriceQty(productToEdit.cost_price_qty ?? 1);
    setSellingPrice(productToEdit.selling_price ?? '');
    setSellingPriceUnit(productToEdit.selling_price_unit || 'piece');
    setSellingPriceQty(productToEdit.selling_price_qty ?? 1);
    setGstRate(productToEdit.gst_rate ?? 0);
    setHsnSac(productToEdit.hsn_sac || '');

    if (productToEdit.type === 'variable' && Array.isArray(productToEdit.variants)) {
      const attrIds = new Set();
      const optionMap = {};
      productToEdit.variants.forEach((variant) => (variant.attributes || []).forEach((attribute) => {
        attrIds.add(attribute.attribute_id);
        if (!optionMap[attribute.attribute_id]) optionMap[attribute.attribute_id] = [];
        if (!optionMap[attribute.attribute_id].some((option) => Number(option.id) === Number(attribute.id))) {
          optionMap[attribute.attribute_id].push({ id: attribute.id, value: attribute.value });
        }
      }));
      setSelectedAttributes([...attrIds]);
      setSelectedOptions(optionMap);
      setVariants(productToEdit.variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku || '',
        stock: variant.stock || 0,
        cost_price: variant.cost_price ?? '',
        cost_price_unit: variant.cost_price_unit || 'piece',
        attributes: variant.attributes || [],
      })));
      [...attrIds].forEach((attrId) => getAttributeOptions(attrId).then((rows) => {
        setAttributeOptions((current) => ({ ...current, [attrId]: rows || [] }));
      }));
    } else {
      setSelectedAttributes([]);
      setSelectedOptions({});
      setVariants([]);
    }
  }, [open, productToEdit]);

  useEffect(() => {
    if (!open || !productToEdit || !categories.length) return;
    setCategory(categories.find((item) => Number(item.id) === Number(productToEdit.category_id)) || null);
  }, [open, productToEdit, categories]);

  useEffect(() => {
    if (!open || !productToEdit || !vendors.length) return;
    setVendor(vendors.find((item) => Number(item.id) === Number(productToEdit.vendor_id)) || null);
  }, [open, productToEdit, vendors]);

  const fetchOptions = async (attributeId) => {
    if (attributeOptions[attributeId]) return;
    const options = await getAttributeOptions(attributeId);
    setAttributeOptions((current) => ({ ...current, [attributeId]: options || [] }));
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploadingImage(true);
    setError('');
    try {
      const result = await uploadProductImage(file);
      setImageUrl(result.url);
    } catch (uploadError) {
      setError(uploadError.response?.data?.error || 'Image upload failed.');
    } finally {
      setUploadingImage(false);
    }
  };

  const generateVariants = () => {
    const groups = selectedAttributes
      .map((attributeId) => selectedOptions[attributeId] || [])
      .filter((options) => options.length);
    if (!groups.length) return;

    const combinations = groups.reduce(
      (left, right) => left.flatMap((existing) => right.map((option) => [...existing, option])),
      [[]],
    );

    setVariants(combinations.map((attributesForVariant, index) => ({
      id: `tmp_${Date.now()}_${index}`,
      sku: '',
      stock: 0,
      cost_price: '',
      cost_price_unit: costPriceUnit,
      attributes: attributesForVariant,
    })));
  };

  const preview = useMemo(() => previewUrl || resolveBackendAssetUrl(imageUrl), [previewUrl, imageUrl]);

  const handleAddUnit = async (name) => {
    const saved = await createProductUnit(name);
    setUnits((current) => current.some((unit) => unit.name === saved.name) ? current : [...current, saved].sort((a, b) => a.name.localeCompare(b.name)));
    return saved;
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = async () => {
    if (submitting) return;
    if (!name.trim()) {
      setTab('details');
      setError('Product name is required.');
      return;
    }
    if (sellingPrice === '' || Number(sellingPrice) <= 0) {
      setTab('pricing');
      setError('Selling price is required and must be greater than zero.');
      return;
    }
    if (Number(gstRate) < 0 || Number(gstRate) > 28) {
      setTab('pricing');
      setError('GST rate must be between 0 and 28%.');
      return;
    }

    setSubmitting(true);
    setError('');

    const payload = {
      name: name.trim(),
      brand: brand || '',
      vendor_id: vendor?.id || null,
      description: description || '',
      image_url: imageUrl || null,
      category_id: category?.id || 1,
      type,
      sku: type === 'simple' ? (sku || '') : '',
      stock: type === 'simple' ? Number(stock || 0) : 0,
      cost_pricing_mode: costPricingMode,
      cost_discount_percent: costPricingMode === 'percentage' ? Number(costDiscountPercent || 0) : null,
      ...(costPricingMode === 'absolute' ? { cost_price: Number(costPrice || 0) } : {}),
      cost_price_unit: costPriceUnit,
      cost_price_qty: Number(costPriceQty || 1),
      selling_price: Number(sellingPrice),
      selling_price_unit: sellingPriceUnit,
      selling_price_qty: Number(sellingPriceQty || 1),
      gst_rate: Number(gstRate || 0),
      hsn_sac: hsnSac || null,
      is_active: 1,
      variants: type === 'variable'
        ? variants.map((variant) => ({
          id: variant.id && !String(variant.id).startsWith('tmp_') ? variant.id : undefined,
          sku: variant.sku || '',
          stock: Number(variant.stock || 0),
          cost_price: variant.cost_price === '' ? undefined : Number(variant.cost_price || 0),
          cost_price_unit: variant.cost_price_unit || costPriceUnit,
          attribute_option_ids: (variant.attributes || []).map((attribute) => attribute.id),
        }))
        : [],
    };

    try {
      await onAddProduct(payload);
    } catch (saveError) {
      setError(saveError.response?.data?.details || saveError.response?.data?.error || 'Unable to save product.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVendorSaved = async (savedVendor) => {
    const rows = await getVendors();
    setVendors(rows || []);
    if (savedVendor?.id) setVendor(savedVendor);
  };

  return <>
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      PaperProps={{ className: 'product-form-drawer erp-standard-drawer' }}
    >
      <header className="product-drawer-head">
        <div>
          <h2>{productToEdit ? 'Edit product' : 'Add product'}</h2>
          <p>{productToEdit ? 'Update catalog information for this product.' : 'Create a product for your catalog.'}</p>
        </div>
        <IconButton size="small" onClick={handleClose} aria-label="Close product form">
          <CloseIcon />
        </IconButton>
      </header>

      <nav className="product-drawer-tabs" aria-label="Product form sections">
        <button type="button" className={tab === 'details' ? 'active' : ''} onClick={() => setTab('details')}>Product details</button>
        <button type="button" className={tab === 'pricing' ? 'active' : ''} onClick={() => setTab('pricing')}>Pricing & tax</button>
        <button type="button" className={tab === 'variants' ? 'active' : ''} onClick={() => setTab('variants')}>Variants</button>
      </nav>

      <div className="product-drawer-body">
        {error && <div className="product-drawer-error">{error}</div>}

        {tab === 'details' && <div className="product-tab-content">
          <section className="product-form-section">
            <div className="product-section-heading">
              <div>
                <h3>Basic information</h3>
                <p>Core information used throughout quotations and catalog views.</p>
              </div>
            </div>

            <div className="product-form-grid">
              <label>
                <FieldLabel required>Product name</FieldLabel>
                <TextField fullWidth size="small" value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label>
                <FieldLabel>Brand</FieldLabel>
                <TextField fullWidth size="small" value={brand} onChange={(event) => setBrand(event.target.value)} />
              </label>
              <label>
                <div className="product-label-action">
                  <FieldLabel>Vendor</FieldLabel>
                  <button type="button" onClick={() => setVendorDialogOpen(true)}>
                    <AddCircleOutlineIcon /> Add vendor
                  </button>
                </div>
                <Autocomplete
                  fullWidth
                  size="small"
                  options={vendors}
                  value={vendor}
                  getOptionLabel={(item) => item?.name || ''}
                  onChange={(_, value) => setVendor(value)}
                  isOptionEqualToValue={(option, value) => Number(option.id) === Number(value.id)}
                  renderInput={(params) => <TextField {...params} fullWidth placeholder="Search vendor" />}
                />
              </label>
              <label>
                <FieldLabel>Category</FieldLabel>
                <Autocomplete
                  fullWidth
                  size="small"
                  options={categories}
                  value={category}
                  getOptionLabel={(item) => item?.label || ''}
                  onChange={(_, value) => setCategory(value)}
                  isOptionEqualToValue={(option, value) => Number(option.id) === Number(value.id)}
                  renderInput={(params) => <TextField {...params} fullWidth placeholder="Select category" />}
                />
              </label>
              <label>
                <FieldLabel>Product type</FieldLabel>
                <TextField
                  fullWidth
                  size="small"
                  select
                  value={type}
                  onChange={(event) => {
                    setType(event.target.value);
                    if (event.target.value === 'simple') {
                      setSelectedAttributes([]);
                      setSelectedOptions({});
                      setVariants([]);
                    }
                  }}
                >
                  <MenuItem value="simple">Simple</MenuItem>
                  <MenuItem value="variable">Variable</MenuItem>
                </TextField>
              </label>
              {type === 'simple' && <>
                <label>
                  <FieldLabel>SKU</FieldLabel>
                  <TextField fullWidth size="small" value={sku} onChange={(event) => setSku(event.target.value)} />
                </label>
                <label>
                  <FieldLabel>Stock</FieldLabel>
                  <TextField fullWidth size="small" type="number" value={stock} onChange={(event) => setStock(event.target.value)} />
                </label>
              </>}
            </div>
          </section>

          <section className="product-form-section">
            <div className="product-section-heading">
              <div>
                <h3>Description & image</h3>
                <p>Content shown when this product is used in sales documents.</p>
              </div>
            </div>

            <label className="product-editor-field">
              <FieldLabel>Description</FieldLabel>
              <WgiymEditor value={description} onChange={setDescription} />
            </label>

            <div className="product-image-field">
              <FieldLabel>Product image</FieldLabel>
              <div className="product-image-upload-card">
                <div className="product-image-preview">
                  {preview ? <img src={preview} alt="Product preview" /> : <ImageOutlinedIcon />}
                </div>
                <div className="product-image-copy">
                  <strong>{preview ? 'Product image' : 'Add a product image'}</strong>
                  <span>PNG, JPG or WEBP. Use a square image for the cleanest catalog layout.</span>
                  <label className="product-image-button">
                    {uploadingImage ? 'Uploading…' : preview ? 'Replace image' : 'Browse image'}
                    <input
                      type="file"
                      hidden
                      disabled={uploadingImage}
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        setPreviewUrl(URL.createObjectURL(file));
                        handleImageUpload(file);
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </section>
        </div>}

        {tab === 'pricing' && <div className="product-tab-content">
          <section className="product-form-section">
            <div className="product-section-heading">
              <div>
                <h3>Selling price</h3>
                <p>Customer-facing pricing and tax information.</p>
              </div>
            </div>
            <div className="product-form-grid">
              <label>
                <FieldLabel required>Selling price</FieldLabel>
                <TextField fullWidth size="small" type="number" value={sellingPrice} onChange={(event) => setSellingPrice(event.target.value)} />
              </label>
              <UnitSelect label="Selling unit" value={sellingPriceUnit} onChange={setSellingPriceUnit} units={units} onAddUnit={handleAddUnit} />
              <label>
                <FieldLabel>Selling quantity</FieldLabel>
                <TextField fullWidth size="small" type="number" value={sellingPriceQty} onChange={(event) => setSellingPriceQty(event.target.value)} />
              </label>
              <label>
                <FieldLabel>GST rate (%)</FieldLabel>
                <TextField fullWidth size="small" type="number" inputProps={{ min: 0, max: 28, step: 0.01 }} value={gstRate} onChange={(event) => setGstRate(event.target.value)} />
              </label>
              <label>
                <FieldLabel>HSN / SAC</FieldLabel>
                <TextField fullWidth size="small" value={hsnSac} onChange={(event) => setHsnSac(event.target.value)} />
              </label>
            </div>
          </section>

          <section className="product-form-section">
            <div className="product-section-heading">
              <div>
                <h3>Cost information</h3>
                <p>Internal cost information used for margin calculations.</p>
              </div>
            </div>
            <div className="product-form-grid">
              <label>
                <FieldLabel>Cost pricing mode</FieldLabel>
                <TextField fullWidth size="small" select value={costPricingMode} onChange={(event) => setCostPricingMode(event.target.value)}>
                  <MenuItem value="absolute">Absolute</MenuItem>
                  <MenuItem value="percentage">Percentage</MenuItem>
                </TextField>
              </label>
              {costPricingMode === 'percentage' ? (
                <label>
                  <FieldLabel>Cost discount %</FieldLabel>
                  <TextField fullWidth size="small" type="number" value={costDiscountPercent} onChange={(event) => setCostDiscountPercent(event.target.value)} />
                </label>
              ) : (
                <label>
                  <FieldLabel>Cost price</FieldLabel>
                  <TextField fullWidth size="small" type="number" value={costPrice} onChange={(event) => setCostPrice(event.target.value)} />
                </label>
              )}
              <UnitSelect label="Cost unit" value={costPriceUnit} onChange={setCostPriceUnit} units={units} onAddUnit={handleAddUnit} />
              <label>
                <FieldLabel>Cost quantity</FieldLabel>
                <TextField fullWidth size="small" type="number" value={costPriceQty} onChange={(event) => setCostPriceQty(event.target.value)} />
              </label>
            </div>
          </section>
        </div>}

        {tab === 'variants' && <div className="product-variants-panel">
          {type !== 'variable' ? (
            <div className="product-empty-state">
              Change Product type to <strong>Variable</strong> to configure variants.
            </div>
          ) : <>
            <section className="product-form-section">
              <div className="product-section-heading">
                <div>
                  <h3>Variant attributes</h3>
                  <p>Select attributes and their options, then generate the variants.</p>
                </div>
              </div>

              <div className="product-attribute-buttons">
                {attributes.map((attribute) => {
                  const active = selectedAttributes.includes(attribute.id);
                  return (
                    <button
                      type="button"
                      key={attribute.id}
                      className={active ? 'active' : ''}
                      onClick={() => {
                        if (active) return;
                        setSelectedAttributes((current) => [...current, attribute.id]);
                        fetchOptions(attribute.id);
                      }}
                    >
                      {attribute.name}
                    </button>
                  );
                })}
              </div>

              {selectedAttributes.map((attributeId) => (
                <section className="product-attribute-card" key={attributeId}>
                  <header>
                    <strong>{attributes.find((attribute) => Number(attribute.id) === Number(attributeId))?.name}</strong>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAttributes((current) => current.filter((id) => id !== attributeId));
                        setSelectedOptions((current) => {
                          const next = { ...current };
                          delete next[attributeId];
                          return next;
                        });
                      }}
                    >
                      Remove
                    </button>
                  </header>
                  <Autocomplete
                    fullWidth
                    multiple
                    size="small"
                    options={attributeOptions[attributeId] || []}
                    value={selectedOptions[attributeId] || []}
                    getOptionLabel={(item) => item?.value || ''}
                    onChange={(_, value) => setSelectedOptions((current) => ({ ...current, [attributeId]: value }))}
                    isOptionEqualToValue={(option, value) => Number(option.id) === Number(value.id)}
                    renderInput={(params) => <TextField {...params} fullWidth placeholder="Select options" />}
                  />
                </section>
              ))}

              <button type="button" className="product-generate-btn" onClick={generateVariants}>Generate variants</button>
            </section>

            {!!variants.length && <section className="product-form-section">
              <div className="product-section-heading">
                <div>
                  <h3>Generated variants</h3>
                  <p>Set SKU, stock and optional cost override for each variant.</p>
                </div>
              </div>
              <div className="product-variant-list">
                {variants.map((variant, index) => (
                  <section key={variant.id || index}>
                    <strong>{(variant.attributes || []).map((attribute) => attribute.value).join(' / ') || `Variant ${index + 1}`}</strong>
                    <div className="product-form-grid product-variant-grid">
                      <label>
                        <FieldLabel>SKU</FieldLabel>
                        <input value={variant.sku || ''} onChange={(event) => setVariants((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, sku: event.target.value } : row))} />
                      </label>
                      <label>
                        <FieldLabel>Stock</FieldLabel>
                        <input type="number" value={variant.stock || 0} onChange={(event) => setVariants((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, stock: event.target.value } : row))} />
                      </label>
                      <label>
                        <FieldLabel>Cost override</FieldLabel>
                        <input type="number" value={variant.cost_price ?? ''} onChange={(event) => setVariants((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, cost_price: event.target.value } : row))} />
                      </label>
                    </div>
                  </section>
                ))}
              </div>
            </section>}
          </>}
        </div>}
      </div>

      <footer className="product-drawer-footer">
        <button type="button" onClick={handleClose}>Cancel</button>
        <button type="button" className="primary" disabled={submitting} onClick={handleSave}>
          {submitting ? 'Saving…' : productToEdit ? 'Save changes' : 'Create product'}
        </button>
      </footer>
    </Drawer>

    <VendorFormDialog
      open={vendorDialogOpen}
      onClose={() => setVendorDialogOpen(false)}
      onSaved={handleVendorSaved}
    />
  </>;
}

export default AddProductDialog;
