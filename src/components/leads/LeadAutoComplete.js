import React, { useEffect, useState } from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import { fetchLeads } from '../../services/leadService';

function LeadAutoComplete({ value, onChange, onAddLead }) {
  const [inputValue, setInputValue] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (inputValue.length >= 2) loadLeads();
    else setFiltered([]);
  }, [inputValue]);

  const loadLeads = async () => {
    setLoading(true);
  
    try {
      const { leads } = await fetchLeads();
      const list = Array.isArray(leads) ? leads : [];
  
      const matches = list.filter(l =>
        `${l.first_name} ${l.last_name} ${l.company_name || ''}`
          .toLowerCase()
          .includes(inputValue.toLowerCase())
      );
  
      setFiltered(matches);
    } catch (err) {
      console.error("❌ Failed to fetch leads", err);
    }
  
    setLoading(false);
  };
  
  

  const getOptions = () => {
    if (inputValue.length < 2) return [];

    const exists = filtered.some(
      l =>
        `${l.first_name} ${l.last_name}`.toLowerCase() ===
        inputValue.toLowerCase()
    );

    const options = [...filtered];

    if (!exists && inputValue.trim()) {
      options.push({
        id: '__add_new',
        first_name: `➕ Add "${inputValue.trim()}"`,
        isNew: true
      });
    }

    return options;
  };

  return (
    <Autocomplete
      value={value}
      inputValue={inputValue}
      onInputChange={(e, val) => setInputValue(val)}
      options={getOptions()}
      getOptionLabel={(option) =>
        option.isNew
          ? option.first_name
          : `${option.first_name} ${option.last_name || ''}${option.company_name ? ` (${option.company_name})` : ''}`
      }
      isOptionEqualToValue={(a, b) => a?.id === b?.id}
      onChange={(e, selected) => {
        if (selected?.isNew && onAddLead) {
          onAddLead(inputValue.trim());
        } else {
          onChange(selected);
        }
      }}
      filterOptions={(x) => x}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Select Lead"
          placeholder="Type 2+ characters..."
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

export default LeadAutoComplete;
