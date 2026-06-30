import React from 'react';
import { AccountCircle, MenuOpen, Search, ViewSidebar } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../context/LayoutContext';
import '../assets/styles/Topbar.scss';

const titleMap = [
  [/^\/dashboard/, 'Dashboard'],
  [/^\/proforma-invoices/, 'Proforma Invoices'],
  [/^\/invoices/, 'Invoices'],
  [/^\/invoice-settings/, 'Invoice Settings'],
  [/^\/payments\/history/, 'Payment History'],
  [/^\/passbook/, 'Passbook'],
  [/^\/vendors/, 'Vendors'],
  [/^\/payments/, 'Pending Payments'],
  [/^\/payment-reminders\/settings/, 'Reminder Settings'],
  [/^\/payment-reminders/, 'Payment Reminders'],
  [/^\/reports/, 'Reports'],
  [/^\/quotations-settings/, 'Quotation Settings'],
  [/^\/quotations/, 'Quotations'],
  [/^\/workorders/, 'Work Orders'],
  [/^\/products\/categories/, 'Categories'],
  [/^\/products\/attributes/, 'Attributes'],
  [/^\/products/, 'Products'],
  [/^\/customers/, 'Customers'],
  [/^\/leads\/settings/, 'Lead Settings'],
  [/^\/leads/, 'Leads'],
  [/^\/kots/, 'KOT Board'],
  [/^\/deliveries/, 'Delivery Board'],
  [/^\/order-feedbacks/, 'Order Feedbacks'],
  [/^\/users/, 'Users'],
  [/^\/settings/, 'Settings'],
];

function getPageTitle(pathname) {
  const match = titleMap.find(([regex]) => regex.test(pathname));
  if (match) return match[1];

  const formatted = pathname.replace(/^\//, '').replace(/[-_]/g, ' ');
  return formatted ? formatted.charAt(0).toUpperCase() + formatted.slice(1) : 'Dashboard';
}

function Topbar({ layoutTopbar = false }) {
  const location = useLocation();
  const { currentUser } = useAuth();
  const { sidebarOpen, toggleSidebar } = useLayout();
  const pageTitle = getPageTitle(location.pathname);

  if (!layoutTopbar) return null;

  return (
    <div className="topbar">
      <div className="topbar-wrapper">
        <div className="topbar-ops">
          <IconButton
            className="topbar-sidebar-toggle"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <MenuOpen /> : <ViewSidebar />}
          </IconButton>
          <div>
            <p className="topbar-eyebrow">Workspace</p>
            <h2>{pageTitle}</h2>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="topbar-search">
            <Search />
            <input placeholder="Search ERP" aria-label="Search ERP" />
          </div>
          <div className="topbar-profile-name">
            {currentUser?.name || currentUser?.email || 'User'}
          </div>
          <IconButton className="topbar-profile-button">
            <AccountCircle />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

export default Topbar;
