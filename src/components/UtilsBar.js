import React, { useState } from 'react';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import MoreVertIcon from '@mui/icons-material/MoreVert';

import {
  IconButton,
  Popover,
  MenuItem,
  Select,
  Box,
  Button
} from '@mui/material';

import '../assets/styles/UtilsBar.scss';

const UtilsBar = ({
  buttonLabel,
  onButtonClick,

  // selection aware
  selectedCount = 0,
  onDeleteSelected,
  onExportSelected,

  // search + filter
  searchValue,
  onSearchChange,
  onDateFilterChange,
  onImportBulk,
  sortValue,
  onSortChange,
}) => {
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [actionsAnchor, setActionsAnchor] = useState(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const hasSelection = selectedCount > 0;

  /* ================= DATE FILTER ================= */

  const applyDateFilter = () => {
    onDateFilterChange?.({ startDate, endDate });
    setFilterAnchor(null);
  };

  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
    onDateFilterChange?.({ startDate: '', endDate: '' });
    setFilterAnchor(null);
  };

  return (
    <div className="utils-bar">
      {/* LEFT ACTIONS */}
      <div className="ub-create">
        <button onClick={onButtonClick} className="primary-btn">
          <AddCircleOutlineIcon />
          <p>{buttonLabel}</p>
        </button>

        {/* ACTIONS DROPDOWN (ALWAYS VISIBLE) */}
        <Button
          className="secondary-btn"
          onClick={(e) => setActionsAnchor(e.currentTarget)}
          startIcon={<MoreVertIcon />}
        >
          Actions
        </Button>

        <Popover
          open={Boolean(actionsAnchor)}
          anchorEl={actionsAnchor}
          onClose={() => setActionsAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Box sx={{ minWidth: 180 }}>
            <MenuItem
              disabled={!hasSelection}
              onClick={() => {
                onExportSelected?.();
                setActionsAnchor(null);
              }}
            >
              Export Selected
            </MenuItem>

            {onImportBulk && (
              <MenuItem
                onClick={() => {
                  onImportBulk?.();
                  setActionsAnchor(null);
                }}
              >
                Import
              </MenuItem>
            )}

            <MenuItem
              disabled={!hasSelection}
              onClick={() => {
                onDeleteSelected?.();
                setActionsAnchor(null);
              }}
              sx={{ color: '#d32f2f' }}
            >
              Delete Selected
            </MenuItem>
          </Box>
        </Popover>
      </div>

      {/* RIGHT CONTROLS */}
      <div className="ub-search">
        {/* FILTER ICON */}
        <IconButton onClick={(e) => setFilterAnchor(e.currentTarget)}>
          <FilterAltOutlinedIcon />
        </IconButton>

        {/* SORT */}
        <Select
          className="utils-select"
          size="small"
          value={sortValue}
          onChange={(e) => onSortChange(e.target.value)}
          IconComponent={ArrowDropDownIcon}
        >
          <MenuItem value="latest">Latest first</MenuItem>
          <MenuItem value="oldest">Oldest first</MenuItem>
          <MenuItem value="az">A → Z</MenuItem>
          <MenuItem value="za">Z → A</MenuItem>
        </Select>

        {/* DATE FILTER POPOVER */}
        <Popover
          open={Boolean(filterAnchor)}
          anchorEl={filterAnchor}
          onClose={() => setFilterAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Box sx={{ p: 2, width: 220, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <div className="fl-date-row">
              <label>From:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="fl-date-row">
              <label>To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <button className="secondary-btn" onClick={clearDateFilter}>
                Clear
              </button>
              <button className="primary-btn" onClick={applyDateFilter}>
                Apply
              </button>
            </Box>
          </Box>
        </Popover>

        {/* SEARCH */}
        <div className="search-input">
          <input
            type="text"
            placeholder="Search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default UtilsBar;
