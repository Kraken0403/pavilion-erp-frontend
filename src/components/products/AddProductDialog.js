import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Typography,
  Box,
  Grid,
  Button
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";

import { getCategories, getAllAttributes, getAttributeOptions, uploadProductImage } from "../../services/productServices";
import { getVendors } from "../../services/vendorService";
import VendorFormDialog from "../vendors/VendorFormDialog";
import WgiymEditor from "../ui/WgiymEditor";

import "../../assets/styles/AddProductDialog.scss";
import { BACKEND_URL } from '../../config/env';

const UNITS = ["kg", "g", "piece", "box", "pcs", "packet", "bag", "roll"];

function AddProductDialog({ open, onClose, onAddProduct, productToEdit }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sku, setSku] = useState("");
  const [stock, setStock] = useState(0);
  const [type, setType] = useState("simple");
  const [category, setCategory] = useState(null);
  const [brand, setBrand] = useState("");
  const [vendor, setVendor] = useState(null);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);

  const [costPricingMode, setCostPricingMode] = useState("absolute");
  const [costDiscountPercent, setCostDiscountPercent] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [costPriceUnit, setCostPriceUnit] = useState("piece");
  const [costPriceQty, setCostPriceQty] = useState(1);
  const [sellingPrice, setSellingPrice] = useState("");
  const [sellingPriceUnit, setSellingPriceUnit] = useState("piece");
  const [sellingPriceQty, setSellingPriceQty] = useState(1);
  const [gstRate, setGstRate] = useState(0);
  const [hsnSac, setHsnSac] = useState("");

  const [attributes, setAttributes] = useState([]);
  const [selectedAttributes, setSelectedAttributes] = useState([]);
  const [attributeOptions, setAttributeOptionsState] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({});
  const [variants, setVariants] = useState([]);

  const [categories, setCategoriesState] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadMasterData = async () => {
    const [cats, attrs, vendorRows] = await Promise.all([
      getCategories(),
      getAllAttributes(),
      getVendors(),
    ]);
    setCategoriesState(flattenCategories(cats));
    setAttributes(attrs || []);
    setVendors(vendorRows || []);
  };

  useEffect(() => {
    if (!open) return;
    loadMasterData().catch((error) => console.error('Failed to load product form data', error));
  }, [open]);

  useEffect(() => {
    if (!open || !productToEdit || !categories.length) return;
    setCategory(categories.find((c) => Number(c.id) === Number(productToEdit.category_id)) || null);
  }, [open, productToEdit, categories]);

  useEffect(() => {
    if (!open || !productToEdit || !vendors.length) return;
    setVendor(vendors.find((v) => Number(v.id) === Number(productToEdit.vendor_id)) || null);
  }, [open, productToEdit, vendors]);

  useEffect(() => {
    if (!open) return;
    if (!productToEdit) {
      resetForm();
      return;
    }

    setName(productToEdit.name || "");
    setDescription(productToEdit.description || "");
    setImageUrl(productToEdit.image_url || "");
    setPreviewUrl("");
    setBrand(productToEdit.brand || "");
    setSku(productToEdit.sku || "");
    setStock(productToEdit.stock || 0);
    setType(productToEdit.type || "simple");
    setCostPricingMode(productToEdit.cost_pricing_mode || "absolute");
    setCostDiscountPercent(productToEdit.cost_discount_percent ?? "");
    setCostPrice(productToEdit.cost_price ?? "");
    setCostPriceUnit(productToEdit.cost_price_unit || "piece");
    setCostPriceQty(productToEdit.cost_price_qty ?? 1);
    setSellingPrice(productToEdit.selling_price ?? "");
    setSellingPriceUnit(productToEdit.selling_price_unit || "piece");
    setSellingPriceQty(productToEdit.selling_price_qty ?? 1);
    setGstRate(productToEdit.gst_rate ?? 0);
    setHsnSac(productToEdit.hsn_sac || "");

    if (productToEdit.type === "variable" && Array.isArray(productToEdit.variants)) {
      const attrIds = new Set();
      const optMap = {};
      productToEdit.variants.forEach((v) => {
        (v.attributes || []).forEach((a) => {
          attrIds.add(a.attribute_id);
          if (!optMap[a.attribute_id]) optMap[a.attribute_id] = [];
          if (!optMap[a.attribute_id].some((x) => x.id === a.id)) optMap[a.attribute_id].push({ id: a.id, value: a.value });
        });
      });
      const attrIdArr = Array.from(attrIds);
      setSelectedAttributes(attrIdArr);
      setSelectedOptions(optMap);
      setVariants(productToEdit.variants.map((v) => ({
        id: v.id,
        sku: v.sku || "",
        stock: v.stock || 0,
        cost_price: v.cost_price ?? "",
        cost_price_unit: v.cost_price_unit || "piece",
        attributes: v.attributes || []
      })));
      attrIdArr.forEach((attrId) => fetchAttributeOptionsData(attrId));
    } else {
      setSelectedAttributes([]);
      setSelectedOptions({});
      setVariants([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productToEdit]);

  const fetchAttributeOptionsData = async (attrId) => {
    if (attributeOptions[attrId]) return;
    const opts = await getAttributeOptions(attrId);
    setAttributeOptionsState((prev) => ({ ...prev, [attrId]: opts || [] }));
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      const res = await uploadProductImage(file);
      setImageUrl(res.url);
      setPreviewUrl("");
    } catch (err) {
      console.error(err);
      alert("Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const generateVariants = () => {
    const optionGroups = Object.values(selectedOptions).filter((arr) => arr && arr.length);
    if (!optionGroups.length) return;
    const cartesian = optionGroups.reduce((a, b) => a.flatMap((d) => b.map((e) => [...d, e])), [[]]);
    setVariants(cartesian.map((combo) => ({ sku: "", stock: 0, cost_price: "", cost_price_unit: costPriceUnit, attributes: combo })));
  };

  const resetForm = () => {
    setName("");
    setBrand("");
    setVendor(null);
    setDescription("");
    setImageUrl("");
    setSku("");
    setStock(0);
    setType("simple");
    setCategory(null);
    setCostPricingMode("absolute");
    setCostDiscountPercent("");
    setCostPrice("");
    setCostPriceUnit("piece");
    setCostPriceQty(1);
    setSellingPrice("");
    setSellingPriceUnit("piece");
    setSellingPriceQty(1);
    setGstRate(0);
    setHsnSac("");
    setSelectedAttributes([]);
    setAttributeOptionsState({});
    setSelectedOptions({});
    setVariants([]);
    setPreviewUrl("");
  };

  const handleClose = () => { resetForm(); onClose(); };

  const handleSave = async () => {
    if (submitting) return;
    if (!name.trim()) return alert("Name is required");
    if (sellingPrice === "" || Number(sellingPrice) <= 0) return alert("Selling price is required and must be > 0");
    if (Number(gstRate) < 0 || Number(gstRate) > 28) return alert("GST rate must be between 0 and 28%");

    setSubmitting(true);
    const payload = {
      name: name.trim(),
      brand: brand || "",
      vendor_id: vendor?.id || null,
      description: description || "",
      image_url: imageUrl || null,
      category_id: category?.id || 1,
      type,
      sku: type === "simple" ? (sku || "") : "",
      stock: type === "simple" ? Number(stock || 0) : 0,
      cost_pricing_mode: costPricingMode,
      cost_discount_percent: costPricingMode === "percentage" ? Number(costDiscountPercent || 0) : null,
      cost_price: costPricingMode === "absolute" ? Number(costPrice || 0) : 0,
      cost_price_unit: costPriceUnit,
      cost_price_qty: Number(costPriceQty || 1),
      selling_price: Number(sellingPrice),
      selling_price_unit: sellingPriceUnit,
      selling_price_qty: Number(sellingPriceQty || 1),
      gst_rate: Number(gstRate || 0),
      hsn_sac: hsnSac || null,
      is_active: 1,
      variants: type === "variable" ? variants.map((v) => ({
        id: v.id && String(v.id).startsWith("tmp_") ? undefined : v.id,
        sku: v.sku || "",
        stock: Number(v.stock || 0),
        cost_price: v.cost_price === "" ? undefined : Number(v.cost_price || 0),
        cost_price_unit: v.cost_price_unit || costPriceUnit,
        attribute_option_ids: (v.attributes || []).map((a) => a.id)
      })) : []
    };

    try {
      await onAddProduct(payload);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVendorSaved = async (savedVendor) => {
    const vendorRows = await getVendors();
    setVendors(vendorRows || []);
    if (savedVendor?.id) setVendor(savedVendor);
  };

  return (
    <>
      <Dialog className="add-product-dialog flowbite-dialog" open={open} maxWidth="md" fullWidth>
        <DialogTitle className="dialog-title">
          {productToEdit ? "Edit Product" : "Add New Product"}
          <IconButton onClick={handleClose} size="small"><CloseIcon /></IconButton>
        </DialogTitle>

        <DialogContent className="dialog-content">
          <Typography className="field-label">Name</Typography>
          <TextField className="form-input" fullWidth value={name} onChange={(e) => setName(e.target.value)} />

          <Typography className="field-label" sx={{ mt: 2 }}>Brand Name</Typography>
          <TextField className="form-input" fullWidth value={brand} onChange={(e) => setBrand(e.target.value)} />

          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography className="field-label">Vendor</Typography>
            <Button size="small" startIcon={<AddCircleOutlineIcon />} onClick={() => setVendorDialogOpen(true)}>Add Vendor</Button>
          </Box>
          <Autocomplete
            options={vendors}
            value={vendor}
            getOptionLabel={(o) => o?.name || ""}
            onChange={(e, val) => setVendor(val)}
            isOptionEqualToValue={(option, value) => Number(option.id) === Number(value.id)}
            renderInput={(params) => <TextField className="form-input" {...params} fullWidth placeholder="Type vendor name" />}
          />

          <Typography className="field-label" sx={{ mt: 2 }}>Description</Typography>
          <WgiymEditor value={description} onChange={setDescription} />

          <Typography className="field-label" sx={{ mt: 2 }}>Product Image</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Button variant="outlined" component="label">
              Browse Image
              <input type="file" hidden accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setPreviewUrl(URL.createObjectURL(file));
                handleImageUpload(file);
              }} />
            </Button>
            {uploadingImage && <Typography variant="body2">Uploading...</Typography>}
          </Box>

          {(previewUrl || imageUrl) && (
            <Box sx={{ mt: 2 }}>
              <img src={previewUrl || (imageUrl?.startsWith("http") ? imageUrl : `${BACKEND_URL}${imageUrl}`)} alt="Product preview" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 10, border: "1px solid #ddd", display: "block" }} />
            </Box>
          )}

          <Typography className="field-label" sx={{ mt: 2 }}>Type</Typography>
          <TextField className="form-input" fullWidth select value={type} onChange={(e) => {
            const t = e.target.value;
            setType(t);
            if (t === "simple") { setSelectedAttributes([]); setSelectedOptions({}); setVariants([]); }
          }}>
            <MenuItem value="simple">Simple</MenuItem>
            <MenuItem value="variable">Variable</MenuItem>
          </TextField>

          <Typography className="field-label" sx={{ mt: 2 }}>Category</Typography>
          <Autocomplete options={categories} value={category} getOptionLabel={(o) => o?.label || ""} onChange={(e, val) => setCategory(val)} isOptionEqualToValue={(option, value) => Number(option.id) === Number(value.id)} renderInput={(params) => <TextField className="form-input" {...params} fullWidth />} />

          {type === "simple" && (
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={6}><Typography className="field-label">SKU</Typography><TextField className="form-input" fullWidth value={sku} onChange={(e) => setSku(e.target.value)} /></Grid>
              <Grid item xs={6}><Typography className="field-label">Stock</Typography><TextField className="form-input" fullWidth type="number" value={stock} onChange={(e) => setStock(e.target.value)} /></Grid>
            </Grid>
          )}

          <Typography className="field-label" sx={{ mt: 3 }}>Cost Pricing Mode</Typography>
          <TextField className="form-input" fullWidth select value={costPricingMode} onChange={(e) => setCostPricingMode(e.target.value)}>
            <MenuItem value="absolute">Absolute</MenuItem>
            <MenuItem value="percentage">Percentage</MenuItem>
          </TextField>

          {costPricingMode === "percentage" && (
            <Box sx={{ mt: 2 }}><Typography className="field-label">Cost Discount %</Typography><TextField className="form-input" fullWidth type="number" value={costDiscountPercent} onChange={(e) => setCostDiscountPercent(e.target.value)} /></Box>
          )}

          {costPricingMode === "absolute" && (
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={4}><Typography className="field-label">Cost Price</Typography><TextField className="form-input" fullWidth type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} /></Grid>
              <Grid item xs={4}><Typography className="field-label">Cost Unit</Typography><TextField className="form-input" fullWidth select value={costPriceUnit} onChange={(e) => setCostPriceUnit(e.target.value)}>{UNITS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}</TextField></Grid>
              <Grid item xs={4}><Typography className="field-label">Cost Qty</Typography><TextField className="form-input" fullWidth type="number" value={costPriceQty} onChange={(e) => setCostPriceQty(e.target.value)} /></Grid>
            </Grid>
          )}

          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={4}><Typography className="field-label">Selling Price</Typography><TextField className="form-input" fullWidth type="number" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} /></Grid>
            <Grid item xs={4}><Typography className="field-label">Selling Unit</Typography><TextField className="form-input" fullWidth select value={sellingPriceUnit} onChange={(e) => setSellingPriceUnit(e.target.value)}>{UNITS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}</TextField></Grid>
            <Grid item xs={4}><Typography className="field-label">Selling Qty</Typography><TextField className="form-input" fullWidth type="number" value={sellingPriceQty} onChange={(e) => setSellingPriceQty(e.target.value)} /></Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={6}><Typography className="field-label">GST Rate (%)</Typography><TextField className="form-input" fullWidth type="number" value={gstRate} onChange={(e) => setGstRate(e.target.value)} inputProps={{ min: 0, max: 28, step: 0.01 }} helperText="GST inclusive/exclusive is based on settings" /></Grid>
            <Grid item xs={6}><Typography className="field-label">HSN / SAC</Typography><TextField className="form-input" fullWidth value={hsnSac} onChange={(e) => setHsnSac(e.target.value)} placeholder="e.g. 9403 / 998391" /></Grid>
          </Grid>

          {type === "variable" && (
            <>
              <Typography className="field-label" sx={{ mt: 3 }}>Attributes</Typography>
              <Box sx={{ mt: 1 }}>{attributes.map((attr) => {
                const active = selectedAttributes.includes(attr.id);
                return <Button key={attr.id} variant={active ? "contained" : "outlined"} size="small" sx={{ mr: 1, mb: 1 }} onClick={() => { if (active) return; setSelectedAttributes((prev) => [...prev, attr.id]); fetchAttributeOptionsData(attr.id); }}>{attr.name}</Button>;
              })}</Box>

              {selectedAttributes.map((attrId) => (
                <Box key={attrId} sx={{ mt: 2, p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography className="field-label">{attributes.find((a) => a.id === attrId)?.name}</Typography>
                    <Button size="small" onClick={() => { setSelectedAttributes((prev) => prev.filter((x) => x !== attrId)); setSelectedOptions((prev) => { const copy = { ...prev }; delete copy[attrId]; return copy; }); }}>Remove</Button>
                  </Box>
                  <Autocomplete multiple options={attributeOptions[attrId] || []} value={selectedOptions[attrId] || []} getOptionLabel={(o) => o?.value || ""} onChange={(e, val) => setSelectedOptions((prev) => ({ ...prev, [attrId]: val }))} renderInput={(params) => <TextField className="form-input" {...params} fullWidth />} />
                </Box>
              ))}

              <Button variant="outlined" sx={{ mt: 2 }} onClick={generateVariants}>Generate Variants</Button>
              {variants.map((v, idx) => (
                <Box key={v.id || idx} sx={{ mt: 2, p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
                  <Typography className="field-label">Variant: {(v.attributes || []).map((a) => a.value).join(" / ")}</Typography>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={4}><Typography className="field-label">SKU</Typography><TextField className="form-input" fullWidth value={v.sku} onChange={(e) => { const copy = [...variants]; copy[idx].sku = e.target.value; setVariants(copy); }} /></Grid>
                    <Grid item xs={4}><Typography className="field-label">Stock</Typography><TextField className="form-input" fullWidth type="number" value={v.stock} onChange={(e) => { const copy = [...variants]; copy[idx].stock = e.target.value; setVariants(copy); }} /></Grid>
                    <Grid item xs={4}><Typography className="field-label">Cost Unit</Typography><TextField className="form-input" fullWidth select value={v.cost_price_unit} onChange={(e) => { const copy = [...variants]; copy[idx].cost_price_unit = e.target.value; setVariants(copy); }}>{UNITS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}</TextField></Grid>
                  </Grid>
                  <Box sx={{ mt: 2 }}><Typography className="field-label">Variant Cost (optional override)</Typography><TextField className="form-input" fullWidth type="number" value={v.cost_price} onChange={(e) => { const copy = [...variants]; copy[idx].cost_price = e.target.value; setVariants(copy); }} placeholder="Leave empty to use product cost" /></Box>
                </Box>
              ))}
            </>
          )}
        </DialogContent>

        <DialogActions className="dialog-actions">
          <button className="cancel-btn" onClick={handleClose}>Cancel</button>
          <button className="save-btn-x" disabled={submitting} onClick={handleSave}>{submitting ? "Saving..." : "Save"}</button>
        </DialogActions>
      </Dialog>

      <VendorFormDialog open={vendorDialogOpen} onClose={() => setVendorDialogOpen(false)} onSaved={handleVendorSaved} />
    </>
  );
}

function flattenCategories(list, parent = []) {
  const out = [];
  const walk = (items, p) => {
    (items || []).forEach((cat) => {
      const path = [...p, cat.name];
      out.push({ id: cat.id, name: cat.name, label: path.join(" > ") });
      if (cat.children?.length) walk(cat.children, path);
    });
  };
  walk(list || [], parent);
  return out;
}

export default AddProductDialog;
