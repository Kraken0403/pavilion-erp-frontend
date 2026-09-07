import React, { useMemo, useState } from 'react';
import { Avatar, List, ListItemButton, ListItemIcon, ListItemText, Popover, Tooltip, Typography } from '@mui/material';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import KitchenOutlinedIcon from '@mui/icons-material/KitchenOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import ReviewsOutlinedIcon from '@mui/icons-material/ReviewsOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../context/LayoutContext';
import { useSettings } from '../context/SettingsContext';
import '../assets/styles/Sidebar.scss';

const navGroups = [
  { key: 'home', module: 'dashboard', label: 'Home', icon: HomeOutlinedIcon, path: '/dashboard' },
  { key: 'crm', module: 'leads', label: 'CRM', icon: PeopleOutlineIcon, children: [
    { label: 'Contacts', path: '/leads', icon: PeopleOutlineIcon, module: 'leads' },
    { label: 'Companies', path: '/companies', icon: StorefrontOutlinedIcon, module: 'leads' },
    { label: 'Customers', path: '/customers', icon: GroupsOutlinedIcon, module: 'customers' },
    { label: 'Contact settings', path: '/leads/settings', icon: SettingsOutlinedIcon, module: 'leads' },
  ] },
  { key: 'sales', module: 'quotations', label: 'Sales', icon: RequestQuoteOutlinedIcon, children: [
    { label: 'Quotations', path: '/quotations', icon: ArticleOutlinedIcon, module: 'quotations' },
    { label: 'Work orders', path: '/workorders', icon: Inventory2OutlinedIcon, module: 'work_orders' },
  ] },
  { key: 'billing', module: 'invoices', label: 'Billing', icon: ReceiptLongOutlinedIcon, children: [
    { label: 'Invoices', path: '/invoices', icon: ReceiptLongOutlinedIcon, module: 'invoices' },
    { label: 'Proforma invoices', path: '/proforma-invoices', icon: RequestQuoteOutlinedIcon, module: 'invoices' },
  ] },
  { key: 'payments', module: 'payments', label: 'Payments', icon: PaymentsOutlinedIcon, children: [
    { label: 'Pending payments', path: '/payments', icon: PaymentsOutlinedIcon, module: 'payments' },
    { label: 'Payment history', path: '/payments/history', icon: ReceiptLongOutlinedIcon, module: 'payments' },
    { label: 'Passbook', path: '/passbook', icon: AccountBalanceWalletOutlinedIcon, module: 'passbook' },
    { label: 'Reminders', path: '/payment-reminders', icon: NotificationsActiveOutlinedIcon, module: 'payment_reminders' },
  ] },
  { key: 'catalog', module: 'products', label: 'Catalog', icon: Inventory2OutlinedIcon, children: [
    { label: 'Products', path: '/products/list', icon: Inventory2OutlinedIcon, module: 'products' },
    { label: 'Vendors', path: '/vendors', icon: StorefrontOutlinedIcon, module: 'vendors' },
    { label: 'Categories', path: '/products/categories', icon: CategoryOutlinedIcon, module: 'products' },
    { label: 'Attributes', path: '/products/attributes', icon: TuneOutlinedIcon, module: 'products' },
    { label: 'Coupons', path: '/coupons', icon: ConfirmationNumberOutlinedIcon, module: 'settings', cateringOnly: true },
  ] },
  { key: 'operations', module: 'kots', cateringOnly: true, label: 'Operations', icon: KitchenOutlinedIcon, children: [
    { label: 'KOT board', path: '/kots', icon: KitchenOutlinedIcon, module: 'kots' },
    { label: 'Deliveries', path: '/deliveries', icon: LocalShippingOutlinedIcon, module: 'deliveries' },
    { label: 'Order feedbacks', path: '/order-feedbacks', icon: ReviewsOutlinedIcon, module: 'reports' },
  ] },
  { key: 'reports', module: 'reports', label: 'Reports', icon: AssessmentOutlinedIcon, path: '/reports' },
  { key: 'more', module: 'settings', label: 'More', icon: SettingsOutlinedIcon, children: [
    { label: 'Settings', path: '/settings', icon: SettingsOutlinedIcon, module: 'settings' },
    { label: 'My companies', path: '/my-companies', icon: SettingsOutlinedIcon, module: 'settings' },
  ] },
];

const isActivePath = (currentPath, targetPath) => currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
const isActiveGroup = (group, pathname) => group.path ? isActivePath(pathname, group.path) : group.children?.some((item) => isActivePath(pathname, item.path));

const Sidebar = () => {
  const { currentUser, canAccessModule } = useAuth();
  const { sidebarOpen, toggleSidebar } = useLayout();
  const { settings } = useSettings() || {};
  const [menu, setMenu] = useState({ anchor: null, group: null });
  const navigate = useNavigate();
  const location = useLocation();
  const showCateringModules = ['CATERING', 'HYBRID'].includes(String(settings?.business_type || 'GENERAL').toUpperCase());

  const visibleGroups = useMemo(() => navGroups.filter((group) => !group.cateringOnly || showCateringModules).map((group) => {
    if (!group.children) return canAccessModule(group.module) ? group : null;
    const children = group.children.filter((item) => (!item.cateringOnly || showCateringModules) && canAccessModule(item.module));
    return children.length ? { ...group, children } : null;
  }).filter(Boolean), [canAccessModule, showCateringModules]);

  const openGroup = (event, group) => {
    if (!group.children) return navigate(group.path);
    return setMenu({ anchor: event.currentTarget, group });
  };
  const chooseItem = (path) => { setMenu({ anchor: null, group: null }); navigate(path); };

  return <aside className={`hub-sidebar ${sidebarOpen ? '' : 'hub-sidebar--collapsed'}`} aria-label="Main navigation">
    <List className="hub-sidebar__nav" disablePadding>
      {visibleGroups.map((group) => {
        const Icon = group.icon;
        return <Tooltip key={group.key} title={sidebarOpen ? '' : group.label} placement="right"><ListItemButton className={`hub-sidebar__item ${isActiveGroup(group, location.pathname) ? 'is-active' : ''}`} onClick={(event) => openGroup(event, group)} aria-haspopup={Boolean(group.children)} aria-expanded={menu.group?.key === group.key}>
          <ListItemIcon><Icon /></ListItemIcon>{sidebarOpen && <ListItemText primary={group.label} />}{sidebarOpen && group.children && <ChevronRightIcon className="hub-sidebar__chevron" />}
        </ListItemButton></Tooltip>;
      })}
    </List>
    <Tooltip title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'} placement="right"><button className="hub-sidebar__collapse" type="button" onClick={toggleSidebar} aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}>{sidebarOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}{sidebarOpen && <span>Collapse sidebar</span>}</button></Tooltip>
    <div className="hub-sidebar__account"><Avatar>{String(currentUser?.name || currentUser?.email || 'U').charAt(0).toUpperCase()}</Avatar>{sidebarOpen && <span>{currentUser?.name || currentUser?.email || 'My account'}</span>}</div>
    <Popover open={Boolean(menu.anchor)} anchorEl={menu.anchor} onClose={() => setMenu({ anchor: null, group: null })} anchorOrigin={{ vertical: 'top', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }} slotProps={{ paper: { className: 'hub-sidebar__flyout' } }}>
      <Typography className="hub-sidebar__flyout-title">{menu.group?.label}</Typography><List disablePadding>{menu.group?.children?.map((item) => { const Icon = item.icon; return <ListItemButton key={item.path} onClick={() => chooseItem(item.path)} className={isActivePath(location.pathname, item.path) ? 'is-active' : ''}><ListItemIcon><Icon /></ListItemIcon><ListItemText primary={item.label} /></ListItemButton>; })}</List>
    </Popover>
  </aside>;
};

export default Sidebar;
