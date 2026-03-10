import React, { useMemo, useState } from 'react';
import Sidebar from './Sidebar';
import { Box } from '@mui/material';
import { LayoutProvider } from '../context/LayoutContext';
import { Outlet } from 'react-router-dom';

const Layout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);

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
                >
                    <Outlet />
                </div>
            </Box>
        </LayoutProvider>
    );
};

export default Layout;