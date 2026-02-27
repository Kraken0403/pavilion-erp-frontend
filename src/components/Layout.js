import React from 'react';
import Sidebar from './Sidebar'; // Adjust the path based on your structure
import { Box } from '@mui/material';

const Layout = ({ children }) => {
    return (
        <Box sx={{ display: 'flex' }}>
            {/* Sidebar will always render */}
            <div className="sidebar-container">
                <Sidebar />
            </div>
            
            {/* Main content of the page */}
            {/* <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                {children}
            </Box> */}
            <div className="main-container">
                {children}
            </div>
        </Box>
    );
};

export default Layout;
