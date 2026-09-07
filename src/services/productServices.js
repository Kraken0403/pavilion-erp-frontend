// src/services/productServices.js
import api from './api';

/* ---------------------------------------
   ERROR HANDLER
--------------------------------------- */
const handleError = (error, context = 'Unknown error') => {
  console.error(
    `❌ ${context}:`,
    error.response?.data || error.message || error
  );
  throw error;
};

/* =======================
   PRODUCTS
======================= */

export const fetchAllProducts = async () => {
  try {
    const res = await api.get('/products');
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to fetch all products');
  }
};

export const searchProducts = async (query) => {
  try {
    const res = await api.get('/products', {
      params: { search: query },
    });
    return res.data;
  } catch (error) {
    console.error('❌ Failed to search products:', error);
    return [];
  }
};


/* =======================
   BULK IMPORT
======================= */

export const bulkImportProducts = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await api.post(
      '/products/bulk-import',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    return res.data; // { total, success, failed, errors }
  } catch (error) {
    handleError(error, 'Failed to bulk import products');
  }
};



export const fetchProductById = async (id) => {
  try {
    const res = await api.get(`/products/${id}`);
    return res.data;
  } catch (error) {
    handleError(error, `Failed to fetch product ${id}`);
  }
};

export const createProduct = async (productData) => {
  try {
    const res = await api.post('/products', productData);
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to create product');
  }
};

export const updateProduct = async (id, productData) => {
  try {
    const res = await api.put(`/products/${id}`, productData);
    return res.data;
  } catch (error) {
    handleError(error, `Failed to update product ${id}`);
  }
};

export const deleteProduct = async (id) => {
  try {
    const res = await api.delete(`/products/${id}`);
    return res.data;
  } catch (error) {
    console.error(`❌ Failed to delete product ${id}:`, error);
    throw error;
  }
};

/* =======================
   PRODUCT IMAGE
======================= */

export const uploadProductImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await api.post('/upload/product-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return res.data; // { url }
  } catch (error) {
    handleError(error, 'Failed to upload product image');
  }
};

/* =======================
   ATTRIBUTES
======================= */

export const createAttribute = async (data) => {
  try {
    const res = await api.post('/attributes', data);
    return res.data;
  } catch (error) {
    console.error('❌ Failed to create attribute:', error);
    throw error;
  }
};

export const getAllAttributes = async () => {
  try {
    const res = await api.get('/attributes');
    return res.data;
  } catch (error) {
    console.error('❌ Failed to fetch attributes:', error);
    throw error;
  }
};

export const updateAttribute = async (id, data) => {
  try {
    const res = await api.put(`/attributes/${id}`, data);
    return res.data;
  } catch (error) {
    console.error(`❌ Failed to update attribute ${id}:`, error);
    throw error;
  }
};

export const deleteAttribute = async (id) => {
  try {
    const res = await api.delete(`/attributes/${id}`);
    return res.data;
  } catch (error) {
    console.error(`❌ Failed to delete attribute ${id}:`, error);
    throw error;
  }
};

/* =======================
   ATTRIBUTE OPTIONS
======================= */

export const createAttributeOption = async ({ attribute_id, value }) => {
  try {
    const res = await api.post(
      `/attributes/${attribute_id}/options`,
      { value }
    );
    return res.data;
  } catch (error) {
    console.error('❌ Failed to create attribute option:', error);
    throw error;
  }
};

export const getAttributeOptions = async (attribute_id) => {
  try {
    const res = await api.get(
      `/attributes/${attribute_id}/options`
    );
    return res.data;
  } catch (error) {
    console.error('❌ Failed to fetch attribute options:', error);
    throw error;
  }
};

export const deleteAttributeOption = async (optionId) => {
  try {
    const res = await api.delete(`/attribute-options/${optionId}`);
    return res.data;
  } catch (error) {
    console.error(`❌ Failed to delete attribute option ${optionId}:`, error);
    throw error;
  }
};

/* =======================
   VARIANTS
======================= */

export const createVariant = async (variantData) => {
  try {
    const res = await api.post('/variants', variantData);
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to create variant');
  }
};

export const getVariantsByProduct = async (productId) => {
  try {
    const res = await api.get(`/products/${productId}/variants`);
    return res.data;
  } catch (error) {
    handleError(error, `Failed to get variants for product ${productId}`);
  }
};

/* =======================
   PACKAGING
======================= */

export const getProductPackaging = async (productId) => {
  try {
    const res = await api.get(`/products/${productId}/packaging`);
    return res.data;
  } catch (error) {
    handleError(error, `Failed to fetch packaging for product ${productId}`);
  }
};

export const addProductPackaging = async (productId, packagingData) => {
  try {
    const res = await api.post(
      `/products/${productId}/packaging`,
      packagingData
    );
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to add product packaging');
  }
};

export const addVariantPackaging = async (variantId, packagingData) => {
  try {
    const res = await api.post(
      `/variants/${variantId}/packaging`,
      packagingData
    );
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to add variant packaging');
  }
};

/* =======================
   CATEGORIES
======================= */

export const getCategories = async () => {
  try {
    const res = await api.get('/categories');
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to get categories');
  }
};

export const getCategoryById = async (id) => {
  try {
    const res = await api.get(`/categories/${id}`);
    return res.data;
  } catch (error) {
    handleError(error, `Failed to get category ${id}`);
  }
};

export const createCategory = async (data) => {
  try {
    const res = await api.post('/categories', data);
    return res.data;
  } catch (error) {
    console.error('❌ Failed to create category:', error);
    throw error;
  }
};

export const updateCategory = async (id, data) => {
  try {
    const res = await api.put(`/categories/${id}`, data);
    return res.data;
  } catch (error) {
    console.error(`❌ Failed to update category ${id}:`, error);
    throw error;
  }
};

export const deleteCategory = async (id) => {
  try {
    const res = await api.delete(`/categories/${id}`);
    return res.data;
  } catch (error) {
    console.error(`❌ Failed to delete category ${id}:`, error);
    throw error;
  }
};

/* =======================
   PRODUCT UNITS
======================= */

export const getProductUnits = async () => {
  try {
    const res = await api.get('/product-units');
    return res.data || [];
  } catch (error) {
    handleError(error, 'Failed to fetch product units');
  }
};

export const createProductUnit = async (name) => {
  try {
    const res = await api.post('/product-units', { name });
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to create product unit');
  }
};

/* =======================
   PRODUCT VENDORS / ANALYTICS
======================= */

export const getProductVendors = async (productId) => {
  try {
    const res = await api.get(`/products/${productId}/vendors`);
    const payload = res.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.vendors)) return payload.vendors;
    return [];
  } catch (error) {
    handleError(error, `Failed to fetch vendors for product ${productId}`);
  }
};

export const addProductVendor = async (productId, vendorId) => {
  try {
    const res = await api.post(`/products/${productId}/vendors`, { vendor_id: vendorId });
    return res.data;
  } catch (error) {
    handleError(error, `Failed to add vendor to product ${productId}`);
  }
};

export const removeProductVendor = async (productId, vendorId) => {
  try {
    const res = await api.delete(`/products/${productId}/vendors/${vendorId}`);
    return res.data;
  } catch (error) {
    handleError(error, `Failed to remove vendor from product ${productId}`);
  }
};

export const getProductAnalytics = async (productId) => {
  try {
    const res = await api.get(`/products/${productId}/analytics`);
    return res.data;
  } catch (error) {
    handleError(error, `Failed to fetch analytics for product ${productId}`);
  }
};

