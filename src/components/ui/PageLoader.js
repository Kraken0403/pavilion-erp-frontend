import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

function PageLoader({ message = 'Loading...', minHeight = 220, size = 34 }) {
    return (
        <Box
            sx={{
                minHeight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 1.25,
                px: 2,
            }}
        >
            <CircularProgress size={size} thickness={4.5} />
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                {message}
            </Typography>
        </Box>
    );
}

export default PageLoader;
