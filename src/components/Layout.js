import React, { useMemo, useState } from 'react';
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
      <div className={`erp-layout-shell ${sidebarOpen ? '' : 'erp-layout-shell--collapsed'}`}>
        <Topbar layoutTopbar />
        <div className="erp-layout-body">
        <Sidebar />
        <main className="main-container">
          <div className="erp-page-content"><Outlet /></div>
        </main>
        </div>
      </div>
    </LayoutProvider>
  );
};

export default Layout;
