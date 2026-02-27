import React, { useEffect, useState } from 'react';
import {
  Autocomplete, TextField, CircularProgress
} from '@mui/material';
import { fetchAllProducts } from '../services/productServices';

function ProductAutocomplete({ value, onChange, onAddProduct }) {
  const [inputValue, setInputValue] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const products = await fetchAllProducts();
        setAllProducts(products);
      } catch (err) {
        console.error('Failed to load products', err);
      }
      setLoading(false);
    };

    loadProducts();
  }, []);

  useEffect(() => {
    const filtered = allProducts.filter(p =>
      p.name?.toLowerCase().includes(inputValue.toLowerCase())
    );

    const suggestionList = [...filtered];

    if (
      inputValue &&
      !filtered.some(p => p.name?.toLowerCase() === inputValue.toLowerCase())
    ) {
      suggestionList.push({ id: '__new', name: `➕ Add "${inputValue}"` });
    }

    setFilteredOptions(suggestionList);
  }, [inputValue, allProducts]);

  const formatLabel = (option) => {
    const category = option.category_name || 'No Category';
    const packaging = option.packaging_type || 'No Packaging';
    const variant = option.variantSku || option.variantId || '';
    return `${option.name} (${category}) (${packaging})${variant ? ` [${variant}]` : ''}`;
  };

  return (
    <Autocomplete
      options={filteredOptions}
      getOptionLabel={(option) => formatLabel(option)}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      value={value}
      onChange={(event, newValue) => {
        if (newValue?.id === '__new') {
          onAddProduct();
        } else {
          onChange(newValue);
        }
      }}
      onInputChange={(e, newInput) => setInputValue(newInput)}
      renderOption={(props, option, { index }) => (
        <li {...props} key={`${option.id || option.name}-${index}`}>
          {formatLabel(option)}
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Product"
          fullWidth
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            )
          }}
        />
      )}
    />
  );
}

export default ProductAutocomplete;
