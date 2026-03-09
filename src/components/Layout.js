import React, { useMemo, useState } from 'react';
import Sidebar from './Sidebar';
import { Box } from '@mui/material';
import { LayoutProvider } from '../context/LayoutContext';
import { useLocation } from 'react-router-dom';

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
                    key={location.pathname}
                    className={`main-container ${sidebarOpen ? '' : 'expanded'}`}
                >
                    {children}
                </div>
            </Box>
        </LayoutProvider>
    );
};

export default Layout;