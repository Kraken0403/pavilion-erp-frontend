// src/pages/ProductDetail.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  List,
  ListItem,
  Divider
} from '@mui/material';
import Topbar from '../components/Topbar';
import {
  fetchProductById,
  getVariantsByProduct,
  getProductPackaging,
  getCategories
} from '../services/productServices';

const ProductDetail = () => {
  const { id } = useParams(); // Get product id from URL
  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [packaging, setPackaging] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch the product details by id.
        const prod = await fetchProductById(id);
        setProduct(prod);

        // If the product is variable, fetch its variants.
        if (prod && prod.type === 'variable') {
          const vars = await getVariantsByProduct(id);
          setVariants(vars);
        }

        // Fetch packaging parameters associated with the product.
        try {
          const pack = await getProductPackaging(id);
          setPackaging(pack);
        } catch (packErr) {
          console.warn("No packaging data available for product", id);
        }

        // Fetch the category tree.
        const cats = await getCategories();
        setCategories(cats);

        setLoading(false);
      } catch (err) {
        console.error('Error loading product details:', err);
        setError('Failed to load product details. Please try again.');
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  // Helper: Flatten a category tree structure for an easy lookup.
  const flattenCategories = (cats) => {
    let list = [];
    cats.forEach(cat => {
      list.push(cat);
      if (cat.children && cat.children.length > 0) {
        list = list.concat(flattenCategories(cat.children));
      }
    });
    return list;
  };

  // Look up the product's category details.
  let productCategory;
  if (product && product.category_id && categories.length > 0) {
    const flatCats = flattenCategories(categories);
    productCategory = flatCats.find(cat => cat.id === product.category_id);
  }

  if (loading) {
    return (
      <Container>
        <Topbar />
        <Box mt={4}>
          <Typography variant="h6">Loading product details...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Topbar />
        <Box mt={4}>
          <Typography variant="h6" color="error">{error}</Typography>
        </Box>
      </Container>
    );
  }

  if (!product) {
    return (
      <Container>
        <Topbar />
        <Box mt={4}>
          <Typography variant="h6">Product not found.</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container>
      <Topbar />
      <Box mt={4}>
        <Card>
          <CardContent>
            <Typography variant="h4" gutterBottom>
              {product.name}
            </Typography>
            <Box className="rich-text-preview" dangerouslySetInnerHTML={{ __html: product.description || '' }} />
            {product.vendor_name && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Vendor: {product.vendor_name}
              </Typography>
            )}
            <Typography variant="h6" color="primary">
              Cost: ₹{product.cost}
            </Typography>
            <Typography variant="body2">
              Stock: {product.stock}
            </Typography>
            {productCategory && (
              <Typography variant="body2">
                Category: {productCategory.name}
              </Typography>
            )}
            <Divider sx={{ my: 2 }} />

            {/* Display variants for variable products */}
            {product.type === 'variable' && variants.length > 0 && (
              <Box mb={2}>
                <Typography variant="h6">Variants</Typography>
                <List>
                  {variants.map(variant => (
                    <ListItem key={variant.id}>
                      <Typography>
                        {variant.variantSku} – Price: ₹{variant.price}, Stock: {variant.stock}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* Display packaging details if available */}
            {packaging.length > 0 && (
              <Box mb={2}>
                <Typography variant="h6">Packaging Details</Typography>
                <List>
                  {packaging.map(pkg => (
                    <ListItem key={pkg.id}>
                      <Typography>
                        Type: {pkg.packaging_type} – Weight: {pkg.packaging_weight} {pkg.packaging_unit}
                        {pkg.length && `, Dimensions: ${pkg.length} x ${pkg.width} x ${pkg.height} ${pkg.dimensions_unit}`}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default ProductDetail;
