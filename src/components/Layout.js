import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar'; // Adjust the path based on your structure
import { Box } from '@mui/material';
import { LayoutProvider } from '../context/LayoutContext';

const Layout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const location = useLocation();

    const toggleSidebar = () => {
        setSidebarOpen((prev) => !prev);
    };

    const contextValue = useMemo(
        () => ({ sidebarOpen, toggleSidebar }),
        [sidebarOpen]
    );

    return (
        <LayoutProvider value={contextValue}>
            <Box sx={{ display: 'flex' }}>
                <div className={`sidebar-container ${sidebarOpen ? '' : 'collapsed'}`}>
                    <Sidebar />
                </div>

                <div
                    className={`main-container ${sidebarOpen ? '' : 'expanded'}`}
                    key={location.pathname}
                >
                    {children}
                </div>
            </Box>
        </LayoutProvider>
    );
};

export default Layout;
