import React, { useEffect, useState } from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import { getCompanies } from '../../services/companyService';

function CompanyAutocomplete({ value, onChange, onAddCompany }) {
  const [allCompanies, setAllCompanies] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (inputValue.length >= 2) {
      fetchCompanies();
    } else {
      setFiltered([]);
    }
  }, [inputValue]);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const companies = await getCompanies();
      setAllCompanies(companies);
      const matches = companies.filter((c) =>
        c.name.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFiltered(matches);
    } catch (err) {
      console.error('❌ Failed to fetch companies:', err);
    }
    setLoading(false);
  };

  const getOptions = () => {
    if (inputValue.length < 2) return [];

    const base = [...filtered];
    const exists = filtered.some(
      (c) => c.name.toLowerCase().trim() === inputValue.toLowerCase().trim()
    );

    if (!exists && inputValue.trim()) {
      base.push({
        id: '__add_new__',
        name: `➕ Add "${inputValue.trim()}"`,
        isNew: true
      });
    }

    return base;
  };

  return (
    <Autocomplete
      value={value}
      inputValue={inputValue}
      onInputChange={(e, val) => setInputValue(val)}
      options={getOptions()}
      getOptionLabel={(option) =>
        option.isNew ? option.name : `${option.name}`
      }
      isOptionEqualToValue={(a, b) => a?.id === b?.id}
      onChange={(e, selected) => {
        if (selected?.isNew && onAddCompany) {
          onAddCompany(inputValue.trim());
        } else {
          onChange(selected);
        }
      }}
      filterOptions={(x) => x}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Select Company"
          placeholder="Type 2+ characters to search"
          fullWidth
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading && <CircularProgress size={18} />}
                {params.InputProps.endAdornment}
              </>
            )
          }}
        />
      )}
    />
  );
}

export default CompanyAutocomplete;
