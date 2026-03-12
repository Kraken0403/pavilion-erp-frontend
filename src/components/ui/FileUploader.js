import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import api from '../../services/api.js';
import { BACKEND_URL } from '../../config/env';

function FileUploader({ label = "Upload File", fileUrl, onFileUploaded }) {
  const fileInputRef = useRef();
  const [localPreview, setLocalPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const safeBackendUrl = useMemo(() => (BACKEND_URL || '').replace(/\/$/, ''), []);

  const resolvedPreviewUrl = useMemo(() => {
    if (localPreview) return localPreview;
    if (!fileUrl) return '';
    if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
    return `${safeBackendUrl}${fileUrl}`;
  }, [fileUrl, localPreview, safeBackendUrl]);

  useEffect(() => {
    return () => {
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);


  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type?.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    setError('');

    if (localPreview) {
      URL.revokeObjectURL(localPreview);
    }
    const nextPreview = URL.createObjectURL(file);
    setLocalPreview(nextPreview);
    setUploading(true);
  
    try {
      const formData = new FormData();
      formData.append('file', file);
  
      // const res = await api.post('/api/upload/logo', formData);
      const res = await api.post('/upload/logo', formData);
  
      onFileUploaded(res.data.url);
      setLocalPreview('');
    } catch (err) {
      console.error('File upload failed:', err);
      setError('Logo upload failed. Please try again.');
    } finally {
      setUploading(false);
      // allow selecting same file again
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
        {uploading ? 'Uploading...' : fileUrl ? 'Change File' : 'Choose File'}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFileChange}
      />
      {!!resolvedPreviewUrl && (
        <Box mt={2}>
          <Typography variant="body2">Uploaded Preview:</Typography>
          <img src={resolvedPreviewUrl} alt="Uploaded File" style={{ maxHeight: '150px', marginTop: '8px' }} />
        </Box>
      )}
      {error && (
        <Typography variant="body2" color="error" mt={1}>{error}</Typography>
      )}
    </Box>
  );
}

export default FileUploader;
