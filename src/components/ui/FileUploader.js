import React, { useMemo, useRef, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import api, { SERVER_ORIGIN } from '../../services/api.js';

function FileUploader({ label = "Upload File", fileUrl, onFileUploaded }) {
  const fileInputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const previewUrl = useMemo(() => {
    if (!fileUrl) return '';
    try {
      return new URL(fileUrl, SERVER_ORIGIN).toString();
    } catch (_) {
      return fileUrl;
    }
  }, [fileUrl]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    try {
      setUploading(true);
      setError('');
      const formData = new FormData();
      formData.append('file', file);
  
      const res = await api.post('/upload/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (!res.data?.url) {
        throw new Error('Upload completed but no file URL was returned');
      }

      onFileUploaded(res.data.url);
    } catch (err) {
      console.error('File upload failed:', err);
      setError(err?.response?.data?.error || err?.response?.data?.details || err.message || 'File upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <Box mb={3}>
      <Typography variant="subtitle1" mb={1}>{label}</Typography>
      <Button
        variant="outlined"
        onClick={() => fileInputRef.current.click()}
        disabled={uploading}
      >
        {uploading ? 'Uploading…' : fileUrl ? 'Change File' : 'Choose File'}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFileChange}
      />
      {error && (
        <Typography variant="body2" color="error" mt={1}>
          {error}
        </Typography>
      )}
      {previewUrl && (
        <Box mt={2} sx={{ display: 'inline-flex', alignItems: 'center', gap: 2, p: 1.5, border: '1px solid #e5e7eb', borderRadius: 2, background: '#f9fafb' }}>
          <img src={previewUrl} alt="Uploaded File" style={{ maxHeight: '92px', maxWidth: '220px', objectFit: 'contain' }} />
          <Typography variant="body2" color="text.secondary">Logo preview</Typography>
        </Box>
      )}
    </Box>
  );
}

export default FileUploader;
