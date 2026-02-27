import React from 'react';
import { Box } from '@mui/material';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

function WgiymEditor({ value, onChange }) {
  return (
    <Box mb={3}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={{
          toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ header: [1, 2, 3, false] }],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['link', 'image'],
            ['clean']
          ]
        }}
        style={{ minHeight: '200px', marginBottom: '20px' }}
      />
    </Box>
  );
}

export default WgiymEditor;
