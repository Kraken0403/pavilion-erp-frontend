import React, { useRef } from 'react';
import { Box, Button, Typography } from '@mui/material';
import api from '../../services/api.js';

function FileUploader({ label = "Upload File", fileUrl, onFileUploaded }) {
  const fileInputRef = useRef();


  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    try {
      const formData = new FormData();
      formData.append('file', file);
  
      // const res = await api.post('/api/upload/logo', formData);
      const res = await api.post('/upload/logo', formData);
  
      onFileUploaded(res.data.url);
    } catch (err) {
      console.error('File upload failed:', err);
    }
  };

  return (
    <Box mb={3}>
      <Typography variant="subtitle1" mb={1}>{label}</Typography>
      <Button
        variant="outlined"
        onClick={() => fileInputRef.current.click()}
      >
        {fileUrl ? 'Change File' : 'Choose File'}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFileChange}
      />
      {fileUrl && (
        <Box mt={2}>
          <Typography variant="body2">Uploaded Preview:</Typography>
          <img src={fileUrl} alt="Uploaded File" style={{ maxHeight: '150px', marginTop: '8px' }} />
        </Box>
      )}
    </Box>
  );
}

export default FileUploader;
