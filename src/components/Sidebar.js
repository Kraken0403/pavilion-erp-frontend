import React, { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Collapse,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import GroupsIcon from '@mui/icons-material/Groups';
import ArticleIcon from '@mui/icons-material/Article';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import PaymentsIcon from '@mui/icons-material/Payments';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import AssessmentIcon from '@mui/icons-material/Assessment';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import KitchenIcon from '@mui/icons-material/Kitchen';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ReviewsIcon from '@mui/icons-material/Reviews';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import CategoryIcon from '@mui/icons-material/Category';
import TuneIcon from '@mui/icons-material/Tune';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../context/LayoutContext';
import { useSettings } from '../context/SettingsContext';
import '../assets/styles/Sidebar.scss';

const drawerWidth = 248;
const collapsedDrawerWidth = 68;

const navGroups = [
  {
    key: 'dashboard',
    module: 'dashboard',
    label: 'Dashboard',
    icon: DashboardIcon,
    path: '/dashboard',
  },
  {
    key: 'crm',
    module: 'leads',
    label: 'CRM',
    icon: PeopleIcon,
    children: [
      { label: 'Leads', path: '/leads', icon: PeopleIcon, module: 'leads' },
      { label: 'Customers', path: '/customers', icon: GroupsIcon, module: 'customers' },
      { label: 'Lead Settings', path: '/leads/settings', icon: SettingsIcon, module: 'leads' },
    ],
  },
  {
    key: 'sales',
    module: 'quotations',
    label: 'Sales',
    icon: RequestQuoteIcon,
    children: [
      { label: 'Quotations', path: '/quotations', icon: ArticleIcon, module: 'quotations' },
      { label: 'Quotation Settings', path: '/quotations-settings', icon: SettingsIcon, module: 'quotations' },
      { label: 'Work Orders', path: '/workorders', icon: Inventory2Icon, module: 'work_orders' },
    ],
  },
  {
    key: 'invoices',
    module: 'invoices',
    label: 'Invoices',
    icon: ReceiptLongIcon,
    children: [
      { label: 'Proforma Invoices', path: '/proforma-invoices', icon: RequestQuoteIcon, module: 'invoices' },
      { label: 'Invoices', path: '/invoices', icon: ReceiptLongIcon, module: 'invoices' },
      { label: 'Settings', path: '/invoice-settings', icon: SettingsIcon, module: 'invoices' },
    ],
  },
  {
    key: 'payments',
    module: 'payments',
    label: 'Payments',
    icon: PaymentsIcon,
    children: [
      { label: 'Pending Payments', path: '/payments', icon: PaymentsIcon, module: 'payments' },
      { label: 'Payment History', path: '/payments/history', icon: ReceiptLongIcon, module: 'payments' },
      { label: 'Passbook', path: '/passbook', icon: AccountBalanceWalletIcon, module: 'passbook' },
    ],
  },
  {
    key: 'payment-reminders',
    module: 'payment_reminders',
    label: 'Payment Reminders',
    icon: NotificationsActiveIcon,
    children: [
      { label: 'Pending Payments', path: '/payment-reminders', icon: NotificationsActiveIcon, module: 'payment_reminders' },
      { label: 'Settings', path: '/payment-reminders/settings', icon: SettingsIcon, module: 'payment_reminders' },
    ],
  },
  {
    key: 'catalog',
    module: 'products',
    label: 'Catalog',
    icon: Inventory2Icon,
    children: [
      { label: 'Products', path: '/products/list', icon: Inventory2Icon, module: 'products' },
      { label: 'Vendors', path: '/vendors', icon: StorefrontIcon, module: 'vendors' },
      { label: 'Categories', path: '/products/categories', icon: CategoryIcon, module: 'products' },
      { label: 'Attributes', path: '/products/attributes', icon: TuneIcon, module: 'products' },
      { label: 'Coupons', path: '/coupons', icon: ConfirmationNumberIcon, module: 'settings', cateringOnly: true },
    ],
  },
  {
    key: 'operations',
    module: 'kots',
    cateringOnly: true,
    label: 'Operations',
    icon: KitchenIcon,
    children: [
      { label: 'KOT Board', path: '/kots', icon: KitchenIcon, module: 'kots' },
      { label: 'KOT Settings', path: '/kots/settings', icon: SettingsIcon, module: 'kots' },
      { label: 'Deliveries', path: '/deliveries', icon: LocalShippingIcon, module: 'deliveries' },
      { label: 'Order Feedbacks', path: '/order-feedbacks', icon: ReviewsIcon, module: 'reports' },
      { label: 'Feedback Settings', path: '/order-feedbacks/settings', icon: SettingsIcon, module: 'reports' },
    ],
  },
  {
    key: 'reports',
    module: 'reports',
    label: 'Reports',
    icon: AssessmentIcon,
    path: '/reports',
  },
  {
    key: 'admin',
    module: 'settings',
    label: 'Admin',
    icon: SettingsIcon,
    children: [
      { label: 'Users', path: '/users', icon: PeopleIcon, module: 'users' },
      { label: 'Settings', path: '/settings', icon: SettingsIcon, module: 'settings' },
    ],
  },
];

function isActivePath(currentPath, targetPath) {
  if (!targetPath) return false;
  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

function groupContainsPath(group, currentPath) {
  if (group.path && isActivePath(currentPath, group.path)) return true;
  return Array.isArray(group.children) && group.children.some((item) => isActivePath(currentPath, item.path));
}

const Sidebar = () => {
  const { logout, currentUser, canAccessModule } = useAuth();
  const { sidebarOpen } = useLayout();
  const { settings } = useSettings() || {};
  const businessType = String(settings?.business_type || 'GENERAL').toUpperCase();
  const showCateringModules = businessType === 'CATERING' || businessType === 'HYBRID';
  const navigate = useNavigate();
  const location = useLocation();

  const initialOpen = useMemo(() => {
    return navGroups.reduce((acc, group) => {
      acc[group.key] = groupContainsPath(group, location.pathname);
      return acc;
    }, {});
  }, [location.pathname]);

  const [openGroups, setOpenGroups] = useState(initialOpen);

  const toggleGroup = (key) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const canSee = (moduleKey) => {
    if (!moduleKey || typeof canAccessModule !== 'function') return true;
    return canAccessModule(moduleKey);
  };

  const visibleGroups = navGroups
    .filter((group) => !group.cateringOnly || showCateringModules)
    .map((group) => {
      const visibleChildren = Array.isArray(group.children)
        ? group.children.filter((item) => (!item.cateringOnly || showCateringModules) && canSee(item.module || group.module))
        : null;

      if (Array.isArray(group.children) && !visibleChildren.length) return null;
      if (!Array.isArray(group.children) && !canSee(group.module)) return null;

      return visibleChildren ? { ...group, children: visibleChildren } : group;
    })
    .filter(Boolean);

  const renderNavItem = (item, nested = false) => {
    const Icon = item.icon || ArticleIcon;
    const active = isActivePath(location.pathname, item.path);

    return (
      <ListItemButton
        key={item.path || item.label}
        onClick={() => navigate(item.path)}
        className={active ? 'erp-sidebar-link active' : 'erp-sidebar-link'}
        sx={{ pl: nested ? 4.25 : 2 }}
      >
        <ListItemIcon className="erp-sidebar-icon"><Icon /></ListItemIcon>
        <ListItemText primary={item.label} />
      </ListItemButton>
    );
  };

  const activeDrawerWidth = sidebarOpen ? drawerWidth : collapsedDrawerWidth;

  return (
    <Drawer
      className={`erp-sidebar-drawer ${sidebarOpen ? '' : 'collapsed'}`}
      variant="permanent"
      anchor="left"
      sx={{
        width: activeDrawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: activeDrawerWidth,
          boxSizing: 'border-box',
          borderRight: '1px solid #e5e7eb',
          borderRadius: 0,
          background: '#ffffff',
        },
      }}
    >
      <Box className="erp-sidebar-brand">
        <Avatar className="erp-sidebar-logo">P</Avatar>
        <Box>
          <Typography className="erp-sidebar-title">Pav ERP</Typography>
          <Typography className="erp-sidebar-subtitle">Business Console</Typography>
        </Box>
      </Box>

      <List className="erp-sidebar-list">
        {visibleGroups.map((group) => {
          const Icon = group.icon || ArticleIcon;
          const hasChildren = Array.isArray(group.children) && group.children.length > 0;
          const active = groupContainsPath(group, location.pathname);

          if (!hasChildren) {
            return renderNavItem(group);
          }

          return (
            <Box key={group.key} className="erp-sidebar-group">
              <ListItemButton
                onClick={() => toggleGroup(group.key)}
                className={active ? 'erp-sidebar-link active parent' : 'erp-sidebar-link parent'}
              >
                <ListItemIcon className="erp-sidebar-icon"><Icon /></ListItemIcon>
                <ListItemText primary={group.label} />
                {openGroups[group.key] ? <ExpandLess className="erp-sidebar-chevron" /> : <ExpandMore className="erp-sidebar-chevron" />}
              </ListItemButton>
              <Collapse in={Boolean(openGroups[group.key] || active)} timeout="auto" unmountOnExit>
                <List component="div" disablePadding className="erp-sidebar-children">
                  {group.children.map((item) => renderNavItem(item, true))}
                </List>
              </Collapse>
            </Box>
          );
        })}
      </List>

      <Box className="erp-sidebar-footer">
        <Divider />
        <Box className="erp-sidebar-user">
          <Avatar className="erp-sidebar-user-avatar">
            {String(currentUser?.name || currentUser?.email || 'U').charAt(0).toUpperCase()}
          </Avatar>
          <Box className="erp-sidebar-user-copy">
            <Typography className="erp-sidebar-user-name">
              {currentUser?.name || currentUser?.email || 'ERP User'}
            </Typography>
            <Typography className="erp-sidebar-user-role">Signed in</Typography>
          </Box>
        </Box>
        <ListItemButton onClick={handleLogout} className="erp-sidebar-link logout">
          <ListItemIcon className="erp-sidebar-icon"><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
