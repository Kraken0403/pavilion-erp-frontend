import React, { useEffect, useState } from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import { getContacts } from '../../services/contactService';

function ContactAutocomplete({ value, onChange, onAddContact }) {
  const [inputValue, setInputValue] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (inputValue.length >= 2) {
      loadContacts();
    } else {
      setFiltered([]);
    }
  }, [inputValue]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const data = await getContacts();
      const matches = data.filter(c =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFiltered(matches);
    } catch (err) {
      console.error('Failed to fetch contacts', err);
    }
    setLoading(false);
  };

  const getOptions = () => {
    if (inputValue.length < 2) return [];
    const exists = filtered.some(
      c => `${c.first_name} ${c.last_name}`.toLowerCase() === inputValue.toLowerCase()
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
          : `${option.first_name} ${option.last_name}${option.company_name ? ` (${option.company_name})` : ''}`
      }
      isOptionEqualToValue={(a, b) => a?.id === b?.id}
      onChange={(e, selected) => {
        if (selected?.isNew && onAddContact) {
          onAddContact(inputValue.trim());
        } else {
          onChange(selected);
        }
      }}
      filterOptions={(x) => x}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Select Contact"
          placeholder="Type 2+ characters to search..."
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

export default ContactAutocomplete;
