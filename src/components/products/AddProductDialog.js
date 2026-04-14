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
  Button,
  Chip,
  Paper
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ReactQuill from 'react-quill'

import {
  fetchAllProducts,
  getCategories,
  getAllAttributes,
  getAttributeOptions,
  uploadProductImage,
  getIngredients,
  getProductImages,
  getProductIngredients,
  getProductBundleItems
} from "../../services/productServices";

import { useConfirm } from "../../context/ConfirmContext";

import "../../assets/styles/AddProductDialog.scss";
import { BACKEND_URL } from '../../config/env'


const UNITS = [
  'ml',
  'ltr',
  'l',
  'kg',
  'g',
  'pcs',
  'piece',
  'bottle',
  'can',
  'cup',
  'tsp',
  'tbsp',
  'box',
  'pack',
  'pouch',
  'dozen'
];

function AddProductDialog({ open, onClose, onAddProduct, productToEdit, mode = "create" }) {
  /* ---------------- CORE PRODUCT ---------------- */
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sku, setSku] = useState("");
  const [stock, setStock] = useState(0);
  const [type, setType] = useState("simple");
  const [category, setCategory] = useState(null);
  const [brand, setBrand] = useState(null);

  /* ---------------- PRICING ---------------- */
  const [costPricingMode, setCostPricingMode] = useState("absolute"); // absolute | percentage
  const [costDiscountPercent, setCostDiscountPercent] = useState("");

  const [costPrice, setCostPrice] = useState("");
  const [costPriceUnit, setCostPriceUnit] = useState("piece");
  const [costPriceQty, setCostPriceQty] = useState(1);

  const [sellingPrice, setSellingPrice] = useState("");
  const [sellingPriceUnit, setSellingPriceUnit] = useState("piece");
  const [sellingPriceQty, setSellingPriceQty] = useState(1);

  const [gstRate, setGstRate] = useState(0);
  const [hsnSac, setHsnSac] = useState("");
  const [isActive, setIsActive] = useState(1);

  /* ---------------- VARIANTS + ATTRIBUTES ---------------- */
  const [attributes, setAttributes] = useState([]);
  const [selectedAttributes, setSelectedAttributes] = useState([]); // [attrId]
  const [attributeOptions, setAttributeOptionsState] = useState({}); // { attrId: [] }
  const [selectedOptions, setSelectedOptions] = useState({}); // { attrId: [options] }

  const [variants, setVariants] = useState([]);

  /* ---------------- SUPPORT DATA ---------------- */
  const [categories, setCategoriesState] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedAddOnProducts, setSelectedAddOnProducts] = useState([]);
  // preview/local preview removed — we use `productImages` + `imageUrl` for main image

  /* ---- NEW: BUNDLE ITEMS, IMAGES, INGREDIENTS ---- */
  const [ingredients, setIngredientsState] = useState([]);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [bundleItems, setBundleItems] = useState([]);
  const [productImages, setProductImages] = useState([]);
  const [newBundleItem, setNewBundleItem] = useState({
    component_product_id: null,
    quantity: 1,
    unit: "piece",
    description: ""
  });

  const [uploadingImage, setUploadingImage] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewIndex, setPreviewIndex] = useState(0)
  // no local preview handling; images handled via `productImages` and `imageUrl`



  /* ---------------- SUBMIT ---------------- */
  const [submitting, setSubmitting] = useState(false);
  const showConfirm = useConfirm();

  /* ---------------- LOAD MASTER DATA ---------------- */
  useEffect(() => {
    if (!open) return;

    (async () => {
      const cats = await getCategories();
      setCategoriesState(flattenCategories(cats));

      const attrs = await getAllAttributes();
      setAttributes(attrs);

      const products = await fetchAllProducts();
      setAllProducts(Array.isArray(products) ? products : []);

      const ings = await getIngredients();
      setIngredientsState(Array.isArray(ings) ? ings : []);
    })();
  }, [open]);

  /* ---------------- POPULATE CATEGORY ON EDIT WHEN CATS READY ---------------- */
  useEffect(() => {
    if (!open || !productToEdit || !categories.length) return;
    const matched = categories.find(c => c.id === productToEdit.category_id) || null;
    setCategory(matched);
  }, [open, productToEdit, categories]);

  /* ---------------- EDIT MODE POPULATION ---------------- */
  useEffect(() => {
    if (!open) return;

    if (!productToEdit) {
      // Reset for create
      resetForm();
      return;
    }

    setName(productToEdit.name || "");
    setDescription(productToEdit.description || "");
    setImageUrl(productToEdit.image_url || "");
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
    setIsActive(Number(productToEdit.is_active ?? 1));
    setSelectedAddOnProducts(productToEdit.add_on_products || []);

    // Load bundle items, images, ingredients for edit mode
    (async () => {
      if (productToEdit.id) {
        const bundleData = await getProductBundleItems(productToEdit.id);
        setBundleItems(Array.isArray(bundleData) ? bundleData : []);

        const imagesData = await getProductImages(productToEdit.id);
        setProductImages(Array.isArray(imagesData) ? imagesData : []);
        if ((!productToEdit.image_url || productToEdit.image_url === '') && Array.isArray(imagesData) && imagesData.length) {
          setImageUrl(imagesData[0].image_url);
        }

        const ingredientsData = await getProductIngredients(productToEdit.id);
        setSelectedIngredients(Array.isArray(ingredientsData) ? ingredientsData.map(i => i.id) : []);
      }
    })();

    // If backend returns variants inside productToEdit (it should from getProductById)
    if (productToEdit.type === "variable" && Array.isArray(productToEdit.variants)) {
      // Build selected attributes + selected options from existing variants
      const attrIds = new Set();
      const optMap = {}; // attrId -> options[]
      productToEdit.variants.forEach(v => {
        (v.attributes || []).forEach(a => {
          attrIds.add(a.attribute_id);
          if (!optMap[a.attribute_id]) optMap[a.attribute_id] = [];
          if (!optMap[a.attribute_id].some(x => x.id === a.id)) {
            optMap[a.attribute_id].push({ id: a.id, value: a.value });
          }
        });
      });

      const attrIdArr = Array.from(attrIds);
      setSelectedAttributes(attrIdArr);
      setSelectedOptions(optMap);

      // ensure options list loaded for each selected attribute
      (async () => {
        for (const attrId of attrIdArr) {
          if (!attributeOptions[attrId]) {
            const opts = await getAttributeOptions(attrId);
            setAttributeOptionsState(prev => ({ ...prev, [attrId]: opts }));
          }
        }
      })();

      // set variants from backend
      setVariants(
        productToEdit.variants.map(v => ({
          id: v.id,
          sku: v.sku || "",
          stock: v.stock || 0,
          cost_price: v.cost_price ?? "",
          cost_price_unit: v.cost_price_unit || "piece",
          attributes: v.attributes || []
        }))
      );
    } else {
      setSelectedAttributes([]);
      setSelectedOptions({});
      setVariants([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productToEdit]);

  useEffect(() => {
    return () => {
      // no local preview cleanup required
    }
  }, [])

  /* ---------------- HELPERS ---------------- */
  const fetchAttributeOptionsData = async (attrId) => {
    if (attributeOptions[attrId]) return;
    const opts = await getAttributeOptions(attrId);
    setAttributeOptionsState(prev => ({ ...prev, [attrId]: opts }));
  };

  // single-file upload helper removed; multi-image uploader uses uploadProductImage inline



  const generateVariants = () => {
    const optionGroups = Object.values(selectedOptions).filter(arr => arr && arr.length);
    if (!optionGroups.length) return;

    const cartesian = optionGroups.reduce(
      (a, b) => a.flatMap(d => b.map(e => [...d, e])),
      [[]]
    );

    setVariants(
      cartesian.map(combo => ({
        sku: "",
        stock: 0,
        cost_price: "", // allow override, otherwise backend will fallback
        cost_price_unit: costPriceUnit, // ✅ FIXED: use state var
        attributes: combo
      }))
    );
  };

  const resetForm = () => {
    setName("");
    setBrand("");
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
    setIsActive(1);


    setSelectedAttributes([]);
    setAttributeOptionsState({});
    setSelectedOptions({});
    setVariants([]);
    setSelectedAddOnProducts([]);
    setSelectedIngredients([]);
    setBundleItems([]);
    setProductImages([]);
    setNewBundleItem({ component_product_id: null, quantity: 1, unit: "piece", description: "" });
    // preview state not used

  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  /* ---------------- SAVE ---------------- */
  const handleSave = async () => {
    if (submitting) return;
    setSubmitting(true);

    // Basic validations (frontend)
    if (!name.trim()) {
      setSubmitting(false);
      await showConfirm({ message: "Name is required", confirmText: "OK" });
      return;
    }

    if (!category) {
      setSubmitting(false);
      await showConfirm({ message: "Category is required", confirmText: "OK" });
      return;
    }

    if (sellingPrice === "" || Number(sellingPrice) <= 0) {
      setSubmitting(false);
      await showConfirm({ message: "Selling price is required and must be > 0", confirmText: "OK" });
      return;
    }

    if (Number(gstRate) < 0 || Number(gstRate) > 28) {
      setSubmitting(false);
      await showConfirm({ message: "GST rate must be between 0 and 28%", confirmText: "OK" });
      return;
    }

    const payload = {
      name: name.trim(),
      brand: brand || "",
      description: description || "",
      image_url: imageUrl || null,
      category_id: category.id,
      type,

      // product sku/stock only for simple
      sku: type === "simple" ? (sku || "") : "",
      stock: type === "simple" ? Number(stock || 0) : 0,

      // pricing mode
      cost_pricing_mode: costPricingMode,
      cost_discount_percent:
        costPricingMode === "percentage"
          ? Number(costDiscountPercent || 0)
          : null,

      // cost fields (absolute only, but backend can ignore if percentage)
      cost_price: costPricingMode === "absolute" ? Number(costPrice || 0) : 0,
      cost_price_unit: costPriceUnit,
      cost_price_qty: Number(costPriceQty || 1),

      // selling always
      selling_price: Number(sellingPrice),
      selling_price_unit: sellingPriceUnit, // ✅ FIXED
      selling_price_qty: Number(sellingPriceQty || 1),

      gst_rate: Number(gstRate || 0),
      hsn_sac: hsnSac || null,


      is_active: Number(isActive) === 0 ? 0 : 1,

      // variants
      variants:
        type === "variable"
          ? variants.map(v => ({
            id: v.id && String(v.id).startsWith("tmp_") ? undefined : v.id, // safety
            sku: v.sku || "",
            stock: Number(v.stock || 0),
            cost_price: v.cost_price === "" ? undefined : Number(v.cost_price || 0),
            cost_price_unit: v.cost_price_unit || costPriceUnit,
            attribute_option_ids: (v.attributes || []).map(a => a.id)
          }))
          : [],

      add_on_product_ids: selectedAddOnProducts.map(p => p.id),
      bundle_items: bundleItems,
      ingredient_ids: selectedIngredients,
      product_images: productImages
    };

    try {
      await onAddProduct(payload)
      setSubmitting(false)
    } catch (e) {
      setSubmitting(false);
      // You already show snackbar in parent; just keep this silent
      console.error(e);
    }
  };

  return (
    <Dialog className="add-product-dialog" open={open} maxWidth="lg" fullWidth>
      <DialogTitle className="dialog-title">
        {mode === "edit"
          ? "Edit Product"
          : mode === "duplicate"
            ? "Duplicate Product"
            : "Add New Product"}
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent className="dialog-content">
        {/* NAME */}
        <Typography className="field-label">Name</Typography>
        <TextField
          className="form-input"
          fullWidth
          value={name}
          onChange={e => setName(e.target.value)}
        />

        {/* PRODUCT IMAGES SECTION (placed earlier in flow) */}
        <Typography className="field-label" sx={{ mt: 3 }}>
          Product Images
        </Typography>
        <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
          The main image field below will be used as the primary image. You can set any uploaded image as main.
        </Typography>

        {productImages.length > 0 && (
          <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {productImages.map((img, idx) => (
              <Paper key={idx} sx={{ position: 'relative', width: 100, height: 100, overflow: 'hidden' }}>
                <img
                  src={img.image_url?.startsWith('http') ? img.image_url : `${BACKEND_URL}${img.image_url}`}
                  alt={`Product ${idx}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                  onClick={() => { setPreviewIndex(idx); setPreviewOpen(true); }}
                />
                <Box sx={{ position: 'absolute', bottom: 4, left: 4, right: 4, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                  <Button size="small" variant="contained" onClick={() => {
                    const url = img.image_url?.startsWith('http') ? img.image_url : img.image_url;
                    setImageUrl(img.image_url || url);
                  }} sx={{ bgcolor: '#E11D2E', '&:hover': { bgcolor: '#b50f1a' }, fontSize: 11 }}>
                    Use as main
                  </Button>
                  <IconButton size="small" sx={{ bgcolor: 'rgba(0,0,0,0.5)' }} onClick={() => setProductImages(prev => prev.filter((_, i) => i !== idx))}>
                    <DeleteIcon sx={{ color: 'white', fontSize: 16 }} />
                  </IconButton>
                </Box>
              </Paper>
            ))}
          </Box>
        )}

          {/* Image preview dialog */}
          <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md">
            <Box sx={{ position: 'relative', bgcolor: '#000' }}>
              <IconButton onClick={() => setPreviewOpen(false)} sx={{ position: 'absolute', right: 8, top: 8, color: '#fff', zIndex: 10 }}>
                <CloseIcon />
              </IconButton>
              <IconButton onClick={() => setPreviewIndex(i => (i - 1 + productImages.length) % productImages.length)} sx={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#fff', zIndex: 10 }}>
                <ArrowBackIosNewIcon />
              </IconButton>
              <IconButton onClick={() => setPreviewIndex(i => (i + 1) % productImages.length)} sx={{ position: 'absolute', right: 48, top: '50%', transform: 'translateY(-50%)', color: '#fff', zIndex: 10 }}>
                <ArrowForwardIosIcon />
              </IconButton>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
                {productImages[previewIndex] && (
                  <img
                    src={productImages[previewIndex].image_url?.startsWith('http') ? productImages[previewIndex].image_url : `${BACKEND_URL}${productImages[previewIndex].image_url}`}
                    alt={`Preview ${previewIndex}`}
                    style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain' }}
                  />
                )}
              </Box>
            </Box>
          </Dialog>

        <Box>
          <Button variant="outlined" component="label" sx={{ mb: 2 }}>
            Add Images
            <input
              type="file"
              hidden
              accept="image/*"
              multiple
              onChange={async (e) => {
                const files = e.target.files;
                if (!files) return;

                for (const file of files) {
                  try {
                    setUploadingImage(true);
                    const res = await uploadProductImage(file);
                    setProductImages(prev => {
                      const next = [...prev, { image_url: res.url, alt_text: '', display_order: prev.length + 1 }];
                      return next;
                    });
                    // If no main image set yet, use the first uploaded image as main
                    if (!imageUrl) {
                      setImageUrl(res.url);
                    }
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setUploadingImage(false);
                  }
                }
              }}
            />
          </Button>
          {uploadingImage && <Typography variant="body2">Uploading images...</Typography>}
        </Box>


        <Typography className="field-label" sx={{ mt: 2 }}>Brand Name</Typography>
        <TextField
          className="form-input"
          fullWidth
          value={brand}
          onChange={e => setBrand(e.target.value)}
        />

        <Typography className="field-label" sx={{ mt: 2 }}>
          Add-on Products
        </Typography>
        <Autocomplete
          multiple
          options={allProducts.filter(p => p.id !== productToEdit?.id)}
          value={selectedAddOnProducts}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          getOptionLabel={o => `${o?.name || ''}${o?.selling_price != null ? ` (₹ ${o.selling_price})` : ''}`}
          onChange={(e, value) => setSelectedAddOnProducts(value || [])}
          renderInput={(params) => (
            <TextField
              {...params}
              className="form-input"
              fullWidth
              placeholder="Search and select add-on products"
            />
          )}
        />

        {/* BUNDLE ITEMS SECTION (for Fusion Boxes & Food Packages) */}
        {category && (category.name.toLowerCase().includes('fusion') || category.name.toLowerCase().includes('food') || category.name.toLowerCase().includes('package')) && (
          <>
            <Typography className="field-label" sx={{ mt: 3, mb: 2 }}>
              Bundle Items (Component Products)
            </Typography>
            
            <Paper sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5', border: '1px solid #e0e0e0' }}>
              <Typography className="field-label" sx={{ mb: 2 }}>Add Bundle Item</Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={5}>
                  <Autocomplete
                    options={allProducts.filter(p => p.id !== productToEdit?.id)}
                    getOptionLabel={o => `${o?.name || ''} (₹${o?.selling_price || 0})`}
                    value={allProducts.find(p => p.id === newBundleItem.component_product_id) || null}
                    onChange={(e, val) => {
                      setNewBundleItem(prev => ({ ...prev, component_product_id: val?.id || null }));
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        className="form-input"
                        fullWidth
                        placeholder="Select product"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={6} md={2}>
                  <TextField
                    className="form-input"
                    fullWidth
                    type="number"
                    label="Qty"
                    value={newBundleItem.quantity}
                    onChange={(e) => setNewBundleItem(prev => ({ ...prev, quantity: e.target.value }))}
                    inputProps={{ step: "0.1", min: "0.1" }}
                  />
                </Grid>

                <Grid item xs={6} md={2}>
                  <TextField
                    className="form-input"
                    fullWidth
                    select
                    label="Unit"
                    value={newBundleItem.unit}
                    onChange={(e) => setNewBundleItem(prev => ({ ...prev, unit: e.target.value }))}
                  >
                    {UNITS.map(u => (
                      <MenuItem key={u} value={u}>{u}</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} md={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    sx={{ bgcolor: '#4CAF50', color: 'white' }}
                    onClick={() => {
                      if (newBundleItem.component_product_id) {
                        const product = allProducts.find(p => p.id === newBundleItem.component_product_id);
                        setBundleItems(prev => [
                          ...prev,
                          {
                            ...newBundleItem,
                            product_id: product?.id,
                            name: product?.name,
                            selling_price: product?.selling_price,
                            image_url: product?.image_url,
                            display_order: prev.length + 1
                          }
                        ]);
                        setNewBundleItem({ component_product_id: null, quantity: 1, unit: "piece", description: "" });
                      }
                    }}
                  >
                    Add Item
                  </Button>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    className="form-input"
                    fullWidth
                    multiline
                    rows={2}
                    label="Description (optional)"
                    value={newBundleItem.description}
                    onChange={(e) => setNewBundleItem(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g., Traditional yogurt drink"
                  />
                </Grid>
              </Grid>
            </Paper>

            {bundleItems.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography className="field-label" sx={{ mb: 1 }}>Selected Bundle Items:</Typography>
                {bundleItems.map((item, idx) => (
                  <Chip
                    key={idx}
                    label={`${item.name} (${item.quantity} ${item.unit})`}
                    onDelete={() => setBundleItems(prev => prev.filter((_, i) => i !== idx))}
                    sx={{ mr: 1, mb: 1 }}
                    avatar={
                      item.image_url ? (
                        <img
                          src={item.image_url.startsWith('http') ? item.image_url : `${BACKEND_URL}${item.image_url}`}
                          alt={item.name}
                          style={{ width: 24, height: 24, objectFit: 'cover' }}
                        />
                      ) : undefined
                    }
                  />
                ))}
              </Box>
            )}
          </>
        )}

        {/* INGREDIENTS SECTION (for Fusion Boxes & Food Packages) */}
        {category && (category.name.toLowerCase().includes('fusion') || category.name.toLowerCase().includes('food') || category.name.toLowerCase().includes('package')) && ingredients.length > 0 && (
          <>
            <Typography className="field-label" sx={{ mt: 3 }}>
              Ingredients
            </Typography>
            <Autocomplete
              multiple
              options={ingredients}
              value={ingredients.filter(i => selectedIngredients.includes(i.id))}
              getOptionLabel={o => o?.ingredient_name || ""}
              onChange={(e, val) => setSelectedIngredients(val ? val.map(v => v.id) : [])}
              renderInput={(params) => (
                <TextField
                  {...params}
                  className="form-input"
                  fullWidth
                  placeholder="Select ingredients used in this product"
                />
              )}
            />
          </>
        )}

        
        {/* DESCRIPTION */}
        {/* <Typography className="field-label" sx={{ mt: 2 }}>
          Description
        </Typography>
        <TextField
          className="form-input"
          fullWidth
          multiline
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
        /> */}

        <Typography className="field-label" sx={{ mt: 2 }}>
          Description
        </Typography>

        <div style={{ marginTop: '8px' }}>
          <ReactQuill
            theme="snow"
            value={description || ''}
            onChange={(value) => setDescription(value)}
            style={{ height: '200px', marginBottom: '50px' }}
          />
        </div>


        {/* NOTE: Single unified image upload handled above in "Additional Product Images" section.
            Uploaded images are shown in upload order and you can mark any image as the primary image using "Use as main". */}



        {/* TYPE */}
        <Typography className="field-label" sx={{ mt: 2 }}>
          Type
        </Typography>
        <TextField
          className="form-input"
          fullWidth
          select
          value={type}
          onChange={e => {
            const t = e.target.value;
            setType(t);

            // when switching to simple, clear variants stuff
            if (t === "simple") {
              setSelectedAttributes([]);
              setSelectedOptions({});
              setVariants([]);
            }
          }}
        >
          <MenuItem value="simple">Simple</MenuItem>
          <MenuItem value="variable">Variable</MenuItem>
        </TextField>

        {/* CATEGORY */}
        <Typography className="field-label" sx={{ mt: 2 }}>
          Category <span style={{ color: 'red' }}>*</span>
        </Typography>
        <Autocomplete
          options={categories}
          value={category}
          getOptionLabel={o => o?.label || ""}
          onChange={(e, val) => setCategory(val)}
          renderInput={(params) => (
            <TextField className="form-input" {...params} fullWidth required />
          )}
        />

        {/* SKU + STOCK (Simple) */}
        {type === "simple" && (
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={6}>
              <Typography className="field-label">SKU</Typography>
              <TextField
                className="form-input"
                fullWidth
                value={sku}
                onChange={e => setSku(e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <Typography className="field-label">Stock</Typography>
              <TextField
                className="form-input"
                fullWidth
                type="number"
                value={stock}
                onChange={e => setStock(e.target.value)}
              />
            </Grid>
          </Grid>
        )}

        {/* PRICING MODE */}
        <Typography className="field-label" sx={{ mt: 3 }}>
          Cost Pricing Mode
        </Typography>
        <TextField
          className="form-input"
          fullWidth
          select
          value={costPricingMode}
          onChange={e => setCostPricingMode(e.target.value)}
        >
          <MenuItem value="absolute">Absolute</MenuItem>
          <MenuItem value="percentage">Percentage</MenuItem>
        </TextField>

        {/* PERCENT DISCOUNT */}
        {costPricingMode === "percentage" && (
          <Box sx={{ mt: 2 }}>
            <Typography className="field-label">Cost Discount %</Typography>
            <TextField
              className="form-input"
              fullWidth
              type="number"
              value={costDiscountPercent}
              onChange={e => setCostDiscountPercent(e.target.value)}
            />
          </Box>
        )}

        {/* COST (ABSOLUTE ONLY) */}
        {costPricingMode === "absolute" && (
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={4}>
              <Typography className="field-label">Cost Price</Typography>
              <TextField
                className="form-input"
                fullWidth
                type="number"
                value={costPrice}
                onChange={e => setCostPrice(e.target.value)}
              />
            </Grid>

            <Grid item xs={4}>
              <Typography className="field-label">Cost Unit</Typography>
              <TextField
                className="form-input"
                fullWidth
                select
                value={costPriceUnit}
                onChange={e => setCostPriceUnit(e.target.value)}
              >
                {UNITS.map(u => (
                  <MenuItem key={u} value={u}>{u}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={4}>
              <Typography className="field-label">Cost Qty</Typography>
              <TextField
                className="form-input"
                fullWidth
                type="number"
                value={costPriceQty}
                onChange={e => setCostPriceQty(e.target.value)}
              />
            </Grid>
          </Grid>
        )}

        {/* SELLING (ALWAYS) */}
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={4}>
            <Typography className="field-label">Selling Price</Typography>
            <TextField
              className="form-input"
              fullWidth
              type="number"
              value={sellingPrice}
              onChange={e => setSellingPrice(e.target.value)}
            />
          </Grid>

          <Grid item xs={4}>
            <Typography className="field-label">Selling Unit</Typography>
            <TextField
              className="form-input"
              fullWidth
              select
              value={sellingPriceUnit}
              onChange={e => setSellingPriceUnit(e.target.value)}
            >
              {UNITS.map(u => (
                <MenuItem key={u} value={u}>{u}</MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={4}>
            <Typography className="field-label">Selling Qty</Typography>
            <TextField
              className="form-input"
              fullWidth
              type="number"
              value={sellingPriceQty}
              onChange={e => setSellingPriceQty(e.target.value)}
            />
          </Grid>



        </Grid>

        <Typography className="field-label" sx={{ mt: 2 }}>
          Product Status
        </Typography>
        <TextField
          className="form-input"
          fullWidth
          select
          value={isActive}
          onChange={e => {
            const v = parseInt(e.target.value, 10);
            setIsActive(Number.isFinite(v) ? v : 1);
          }}
        >
          <MenuItem value={1}>Active</MenuItem>
          <MenuItem value={0}>Inactive</MenuItem>
        </TextField>


        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={6}>
            <Typography className="field-label">
              GST Rate (%)
            </Typography>
            <TextField
              className="form-input"
              fullWidth
              type="number"
              value={gstRate}
              onChange={e => setGstRate(e.target.value)}
              inputProps={{ min: 0, max: 28, step: 0.01 }}
              helperText="GST is inclusive or exclusive is based on your settings"
            />
          </Grid>

          <Grid item xs={6}>
            <Typography className="field-label">
              HSN / SAC
            </Typography>
            <TextField
              className="form-input"
              fullWidth
              value={hsnSac}
              onChange={e => setHsnSac(e.target.value)}
              placeholder="e.g. 9403 / 998391"
            />
          </Grid>
        </Grid>

        {/* VARIABLE PRODUCT: ATTRIBUTES + VARIANTS */}
        {type === "variable" && (
          <>
            <Typography className="field-label" sx={{ mt: 3 }}>
              Attributes
            </Typography>

            <Box sx={{ mt: 1 }}>
              {attributes.map(attr => {
                const active = selectedAttributes.includes(attr.id);
                return (
                  <Button
                    key={attr.id}
                    variant={active ? "contained" : "outlined"}
                    size="small"
                    sx={{ mr: 1, mb: 1 }}
                    onClick={() => {
                      if (active) return;
                      setSelectedAttributes(prev => [...prev, attr.id]);
                      fetchAttributeOptionsData(attr.id);
                    }}
                  >
                    {attr.name}
                  </Button>
                );
              })}
            </Box>

            {selectedAttributes.map(attrId => (
              <Box key={attrId} sx={{ mt: 2, p: 2, border: "1px solid #ddd", borderRadius: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography className="field-label">
                    {attributes.find(a => a.id === attrId)?.name}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => {
                      setSelectedAttributes(prev => prev.filter(x => x !== attrId));
                      setSelectedOptions(prev => {
                        const copy = { ...prev };
                        delete copy[attrId];
                        return copy;
                      });
                    }}
                  >
                    Remove
                  </Button>
                </Box>

                <Autocomplete
                  multiple
                  options={attributeOptions[attrId] || []}
                  value={selectedOptions[attrId] || []}
                  getOptionLabel={o => o?.value || ""}
                  onChange={(e, val) => {
                    setSelectedOptions(prev => ({ ...prev, [attrId]: val }));
                  }}
                  renderInput={(params) => (
                    <TextField className="form-input" {...params} fullWidth />
                  )}
                />
              </Box>
            ))}

            <Button variant="outlined" sx={{ mt: 2 }} onClick={generateVariants}>
              Generate Variants
            </Button>

            {variants.map((v, idx) => (
              <Box
                key={v.id || idx}
                sx={{ mt: 2, p: 2, border: "1px solid #ccc", borderRadius: 2 }}
              >
                <Typography className="field-label">
                  Variant: {(v.attributes || []).map(a => a.value).join(" / ")}
                </Typography>

                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={4}>
                    <Typography className="field-label">SKU</Typography>
                    <TextField
                      className="form-input"
                      fullWidth
                      value={v.sku}
                      onChange={e => {
                        const copy = [...variants];
                        copy[idx].sku = e.target.value;
                        setVariants(copy);
                      }}
                    />
                  </Grid>

                  <Grid item xs={4}>
                    <Typography className="field-label">Stock</Typography>
                    <TextField
                      className="form-input"
                      fullWidth
                      type="number"
                      value={v.stock}
                      onChange={e => {
                        const copy = [...variants];
                        copy[idx].stock = e.target.value;
                        setVariants(copy);
                      }}
                    />
                  </Grid>

                  <Grid item xs={4}>
                    <Typography className="field-label">Cost Unit</Typography>
                    <TextField
                      className="form-input"
                      fullWidth
                      select
                      value={v.cost_price_unit}
                      onChange={e => {
                        const copy = [...variants];
                        copy[idx].cost_price_unit = e.target.value;
                        setVariants(copy);
                      }}
                    >
                      {UNITS.map(u => (
                        <MenuItem key={u} value={u}>{u}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 2 }}>
                  <Typography className="field-label">
                    Variant Cost (optional override)
                  </Typography>
                  <TextField
                    className="form-input"
                    fullWidth
                    type="number"
                    value={v.cost_price}
                    onChange={e => {
                      const copy = [...variants];
                      copy[idx].cost_price = e.target.value;
                      setVariants(copy);
                    }}
                    placeholder="Leave empty to use product cost"
                  />
                </Box>
              </Box>
            ))}
          </>
        )}
      </DialogContent>

      <DialogActions className="dialog-actions">
        <button className="cancel-btn" onClick={handleClose}>
          Cancel
        </button>
        <button className="save-btn-x" disabled={submitting} onClick={handleSave}>
          {mode === "duplicate" ? "Create Copy" : "Save"}
        </button>
      </DialogActions>
    </Dialog>
  );
}

/* ---------------- HELPERS ---------------- */
function flattenCategories(list, parent = []) {
  const out = [];
  const walk = (items, p) => {
    items.forEach(cat => {
      const path = [...p, cat.name];
      out.push({ id: cat.id, name: cat.name, label: path.join(" > ") });
      if (cat.children?.length) walk(cat.children, path);
    });
  };
  walk(list || [], parent);
  return out;
}

export default AddProductDialog;
