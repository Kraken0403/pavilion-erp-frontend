import React, { useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { LayoutProvider } from '../context/LayoutContext';

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
      <Box className="erp-layout-shell">
        <aside className={`sidebar-container ${sidebarOpen ? '' : 'collapsed'}`}>
          <Sidebar />
        </aside>
        <main className={`main-container ${sidebarOpen ? '' : 'expanded'}`}>
          <Topbar layoutTopbar />
          <Outlet />
        </main>
      </Box>
    </LayoutProvider>
  );
};

export default Layout;
