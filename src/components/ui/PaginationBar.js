import React from 'react';
import { Button, Box, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const PaginationBar = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalItems === 0) return null;

  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: '#fff',
      }}
    >
      {/* COUNT */}
      <Typography
        sx={{
          fontSize: '13px',
          color: '#666',
        }}
      >
        Showing <strong>{start}–{end}</strong> of <strong>{totalItems}</strong>
      </Typography>

      {/* CONTROLS */}
      <Box sx={{ display: 'flex', gap: '6px' }}>
        <Button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          sx={{
            width: '30px',
            height: '30px',
            borderRadius: '3000px',
            borderColor: '#ddd',
            color: '#333',
          }}
          variant="outlined"
        >
          <ChevronLeftIcon fontSize="small" />
        </Button>

        <Button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          sx={{
            width: '30px',
            height: '30px',
            borderRadius: '3000px',
            borderColor: '#ddd',
            color: '#333',
          }}
          variant="outlined"
        >
          <ChevronRightIcon fontSize="small" />
        </Button>
      </Box>
    </Box>
  );
};

export default PaginationBar;
