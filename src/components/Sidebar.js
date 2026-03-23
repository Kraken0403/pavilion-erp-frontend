import React, { useState } from 'react';
import { Box, Drawer, List, ListItemIcon, ListItemText, Toolbar, Collapse } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ListItemButton from '@mui/material/ListItemButton';
import ProductionQuantityLimitsIcon from '@mui/icons-material/ProductionQuantityLimits';
// import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import ArticleIcon from '@mui/icons-material/Article';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import ExpandLess from '@mui/icons-material/ExpandLess';
import SettingsIcon from '@mui/icons-material/Settings';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CampaignIcon from '@mui/icons-material/Campaign';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import HistoryIcon from '@mui/icons-material/History';
import CategoryIcon from '@mui/icons-material/Category';
import StyleIcon from '@mui/icons-material/Style';

import ExpandMore from '@mui/icons-material/ExpandMore';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../context/LayoutContext';
import { useNotification } from '../context/NotificationContext';
import '../assets/styles/Sidebar.scss';

const drawerWidth = 200;
const MAX_EXPANDED_MODULES = 1;

const Sidebar = () => {
  const { currentUser, canAccessModule } = useAuth();
  const { settings } = useSettings();
  const { sidebarOpen } = useLayout();
  const { bubbleCounts } = useNotification();
  const navigate = useNavigate();

  const isCateringBusiness = settings?.business_type === 'CATERING';

  const [expandedModules, setExpandedModules] = useState([]);

  const isExpanded = (moduleKey) => expandedModules.includes(moduleKey);

  const toggleModule = (moduleKey) => {
    setExpandedModules((prev) => {
      if (prev.includes(moduleKey)) {
        return prev.filter((item) => item !== moduleKey);
      }

      const next = [...prev, moduleKey];
      if (next.length <= MAX_EXPANDED_MODULES) return next;
      return next.slice(next.length - MAX_EXPANDED_MODULES);
    });
  };

  const go = (path) => {
    const safePath = String(path || '')
      .replace('/qoutations', '/quotations')
      .replace('/qoutation', '/quotation');

    const currentPath = window.location.pathname || '';
    if (currentPath === safePath) return;

    navigate(safePath, { replace: false });

    // Universal fallback: if SPA navigation gets stuck, hard-navigate to target.
    window.setTimeout(() => {
      if ((window.location.pathname || '') !== safePath) {
        window.location.assign(safePath);
      }
    }, 120);
  };

  const withModuleBadge = (label, count) => {
    const parsed = Number(count || 0);

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', minWidth: 0 }}>
        <Box
          component="span"
          sx={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </Box>

        {parsed > 0 ? (
          <Box
            component="span"
            sx={{
              minWidth: 22,
              height: 22,
              px: 0.75,
              ml: 1,
              borderRadius: '999px',
              bgcolor: 'error.main',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.72rem',
              fontWeight: 700,
              lineHeight: 1,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {parsed > 99 ? '99+' : parsed}
          </Box>
        ) : null}
      </Box>
    );
  };

  const getCountForModule = (moduleKey) => {
    const key = String(moduleKey || '').trim().toLowerCase();
    if (!key) return 0;

    if (key === 'work_orders') return Number(bubbleCounts.workOrderCount || 0);

    const dynamicKey = `${key.replace(/_([a-z])/g, (_m, char) => char.toUpperCase())}Count`;
    return Number(bubbleCounts?.[dynamicKey] || 0);
  };

  const withSubmenuBadge = (label, moduleKey) => withModuleBadge(label, getCountForModule(moduleKey));

  return (
    <div className="sidebar">
      <Drawer
        open={sidebarOpen}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            height: '100vh',
            position: 'fixed',
            overflowY: 'auto',
          },
        }}
        variant="persistent"
        anchor="left"
      >
        <Toolbar />
        <List>

          {canAccessModule('dashboard') && (
            <ListItemButton onClick={() => go('/dashboard')}>
              <ListItemIcon><DashboardIcon /></ListItemIcon>
              <ListItemText primary="Dashboard" />
            </ListItemButton>
          )}

          {canAccessModule('leads') && (
            <>
              <ListItemButton onClick={() => toggleModule('leads')}>
                <ListItemIcon><PeopleIcon /></ListItemIcon>
                <ListItemText primary={withModuleBadge('Leads', bubbleCounts.leadsCount)} />
                {isExpanded('leads') ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={isExpanded('leads')} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <ListItemButton sx={{ pl: 4 }} onClick={() => go('/leads')}>
                    <ListItemIcon><PeopleIcon /></ListItemIcon>
                    <ListItemText primary={withSubmenuBadge('View Leads', 'leads')} />
                  </ListItemButton>
                  {canAccessModule('customers') && (
                    <ListItemButton sx={{ pl: 4 }} onClick={() => go('/customers')}>
                      <ListItemIcon><PeopleIcon /></ListItemIcon>
                      <ListItemText primary="Customers (Website)" />
                    </ListItemButton>
                  )}
                  <ListItemButton sx={{ pl: 4 }} onClick={() => go('/leads/settings')}>
                    <ListItemIcon><SettingsIcon /></ListItemIcon>
                    <ListItemText primary="Lead Settings" />
                  </ListItemButton>
                </List>
              </Collapse>
            </>
          )}

          {canAccessModule('customers') && (
            <ListItemButton onClick={() => go('/customers')}>
              <ListItemIcon><PeopleIcon /></ListItemIcon>
              <ListItemText primary="Customers" />
            </ListItemButton>
          )}

          {/* PRODUCTS DROPDOWN */}
          {canAccessModule('products') && (
            <>
              <ListItemButton onClick={() => toggleModule('products')}>
                <ListItemIcon><ProductionQuantityLimitsIcon /></ListItemIcon>
                <ListItemText primary="Products" />
                {isExpanded('products') ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={isExpanded('products')} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <ListItemButton sx={{ pl: 4 }} onClick={() => go('/products/list')}>
                    <ListItemIcon><FormatListBulletedIcon /></ListItemIcon>
                    <ListItemText primary="Products List" />
                  </ListItemButton>
                  <ListItemButton sx={{ pl: 4 }} onClick={() => go('/categories')}>
                    <ListItemIcon><CategoryIcon /></ListItemIcon>
                    <ListItemText primary="Categories" />
                  </ListItemButton>
                  <ListItemButton sx={{ pl: 4 }} onClick={() => go('/attributes')}>
                    <ListItemIcon><StyleIcon /></ListItemIcon>
                    <ListItemText primary="Attributes" />
                  </ListItemButton>
                </List>
              </Collapse>
            </>
          )}

          {/* QUOTATIONS DROPDOWN */}
          {canAccessModule('quotations') && (
            <>
              <ListItemButton onClick={() => toggleModule('quotations')}>
                <ListItemIcon><ArticleIcon /></ListItemIcon>
                <ListItemText primary="Quotations" />
                {isExpanded('quotations') ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>

              <Collapse in={isExpanded('quotations')} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <ListItemButton sx={{ pl: 4 }} onClick={() => go('/quotations')}>
                    <ListItemIcon><FormatListBulletedIcon /></ListItemIcon>
                    <ListItemText primary="Quotation List" />
                  </ListItemButton>

                  <ListItemButton sx={{ pl: 4 }} onClick={() => go('/quotations-settings')}>
                    <ListItemIcon><SettingsIcon /></ListItemIcon>
                    <ListItemText primary="Settings" />
                  </ListItemButton>
                </List>
              </Collapse>
            </>
          )}


          {/* WORK ORDERS DROPDOWN */}
          {canAccessModule('work_orders') && (
            <>
              <ListItemButton onClick={() => toggleModule('work_orders')}>
                <ListItemIcon><ProductionQuantityLimitsIcon /></ListItemIcon>
                <ListItemText primary={withModuleBadge('Work Orders', bubbleCounts.workOrderCount)} />
                {isExpanded('work_orders') ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={isExpanded('work_orders')} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <ListItemButton sx={{ pl: 4 }} onClick={() => go('/workorders')}>
                    <ListItemIcon><FormatListBulletedIcon /></ListItemIcon>
                    <ListItemText
                      primary={withSubmenuBadge('Work Order List', 'work_orders')}
                    />
                  </ListItemButton>
                </List>
              </Collapse>
            </>
          )}

          {/* KOT (Kitchen Order Ticket) - CATERING ONLY */}
          {isCateringBusiness && canAccessModule('kots') && (
            <>
              <ListItemButton onClick={() => toggleModule('kots')}>
                <ListItemIcon><RestaurantMenuIcon /></ListItemIcon>
                <ListItemText primary={withModuleBadge('KOT', bubbleCounts.kotCount)} />
                {isExpanded('kots') ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={isExpanded('kots')} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <ListItemButton sx={{ pl: 4 }} onClick={() => go('/kots')}>
                    <ListItemIcon><FormatListBulletedIcon /></ListItemIcon>
                    <ListItemText primary={withSubmenuBadge('KOT Board', 'kot')} />
                  </ListItemButton>
                  <ListItemButton sx={{ pl: 4 }} onClick={() => go('/kots/settings')}>
                    <ListItemIcon><SettingsIcon /></ListItemIcon>
                    <ListItemText primary="KOT Settings" />
                  </ListItemButton>
                </List>
              </Collapse>
            </>
          )}

          {/* DELIVERY - CATERING ONLY */}
          {isCateringBusiness && canAccessModule('deliveries') && (
            <>
              <ListItemButton onClick={() => toggleModule('deliveries')}>
                <ListItemIcon><LocalShippingIcon /></ListItemIcon>
                <ListItemText primary={withModuleBadge('Delivery', bubbleCounts.deliveryCount)} />
                {isExpanded('deliveries') ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={isExpanded('deliveries')} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <ListItemButton sx={{ pl: 4 }} onClick={() => go('/deliveries')}>
                    <ListItemIcon><FormatListBulletedIcon /></ListItemIcon>
                    <ListItemText primary={withSubmenuBadge('Delivery Board', 'delivery')} />
                  </ListItemButton>
                </List>
              </Collapse>
            </>
          )}

          {/* INVOICES DROPDOWN */}
          {canAccessModule('invoices') && (
            <>
              <ListItemButton onClick={() => toggleModule('invoices')}>
                <ListItemIcon><ReceiptLongIcon /></ListItemIcon>
                <ListItemText primary="Invoices" />
                {isExpanded('invoices') ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>

              <Collapse in={isExpanded('invoices')} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <ListItemButton sx={{ pl: 4 }} onClick={() => go('/proforma-invoices')}>
                    <ListItemIcon><FormatListBulletedIcon /></ListItemIcon>
                    <ListItemText primary="Proforma Invoices" />
                  </ListItemButton>

                  <ListItemButton sx={{ pl: 4 }} onClick={() => go('/invoices')}>
                    <ListItemIcon><FormatListBulletedIcon /></ListItemIcon>
                    <ListItemText primary="Invoice List" />
                  </ListItemButton>

                  <ListItemButton sx={{ pl: 4 }} onClick={() => go('/invoice-settings')}>
                    <ListItemIcon><SettingsIcon /></ListItemIcon>
                    <ListItemText primary="Settings" />
                  </ListItemButton>
                </List>
              </Collapse>
            </>
          )}

          {canAccessModule('payments') && (
            <>
              <ListItemButton onClick={() => toggleModule('payments')}>
                <ListItemIcon><AccountBalanceWalletIcon /></ListItemIcon>
                <ListItemText primary="Payments" />
                {isExpanded('payments') ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>

              <Collapse in={isExpanded('payments')} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <ListItemButton sx={{ pl: 4 }} onClick={() => go('/payments')}>
                    <ListItemIcon><HourglassEmptyIcon /></ListItemIcon>
                    <ListItemText primary="Pending Payments" />
                  </ListItemButton>
                  <ListItemButton sx={{ pl: 4 }} onClick={() => go('/payments/history')}>
                    <ListItemIcon><HistoryIcon /></ListItemIcon>
                    <ListItemText primary="Payment History" />
                  </ListItemButton>
                </List>
              </Collapse>
            </>
          )}

          {canAccessModule('payment_reminders') && (
            <>
              <ListItemButton onClick={() => toggleModule('payment_reminders')}>
                <ListItemIcon><CampaignIcon /></ListItemIcon>
                <ListItemText primary="Payment Reminders" />
                {isExpanded('payment_reminders') ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>

              <Collapse in={isExpanded('payment_reminders')} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <ListItemButton sx={{ pl: 4 }} onClick={() => go('/payment-reminders')}>
                    <ListItemIcon><FormatListBulletedIcon /></ListItemIcon>
                    <ListItemText primary="Pending Payments" />
                  </ListItemButton>

                  <ListItemButton sx={{ pl: 4 }} onClick={() => go('/payment-reminders/settings')}>
                    <ListItemIcon><SettingsIcon /></ListItemIcon>
                    <ListItemText primary="Settings" />
                  </ListItemButton>
                </List>
              </Collapse>
            </>
          )}

          {canAccessModule('reports') && (
            <ListItemButton onClick={() => go('/reports')}>
              <ListItemIcon><AssessmentIcon /></ListItemIcon>
              <ListItemText primary="Reports" />
            </ListItemButton>
          )}

          {currentUser?.role === 'admin' && canAccessModule('users') && (
            <ListItemButton onClick={() => go('/users')}>
              <ListItemIcon><PeopleIcon /></ListItemIcon>
              <ListItemText primary="Users" />
            </ListItemButton>
          )}

          {canAccessModule('reports') && (
            <>
              <ListItemButton onClick={() => toggleModule('feedback')}>
                <ListItemIcon><CampaignIcon /></ListItemIcon>
                <ListItemText primary={withModuleBadge('Feedback', bubbleCounts.feedbackCount)} />
                {isExpanded('feedback') ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>

              <Collapse in={isExpanded('feedback')} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <ListItemButton sx={{ pl: 4 }} onClick={() => go('/feedbacks')}>
                    <ListItemIcon><FormatListBulletedIcon /></ListItemIcon>
                    <ListItemText primary={withSubmenuBadge('Feedback List', 'feedback')} />
                  </ListItemButton>

                  <ListItemButton sx={{ pl: 4 }} onClick={() => go('/feedbacks/settings')}>
                    <ListItemIcon><SettingsIcon /></ListItemIcon>
                    <ListItemText primary="Settings" />
                  </ListItemButton>
                </List>
              </Collapse>
            </>
          )}

          {canAccessModule('settings') && (
            <ListItemButton onClick={() => go('/settings')}>
              <ListItemIcon><SettingsIcon /></ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItemButton>
          )}

        </List>
      </Drawer>
    </div>
  );
};

export default Sidebar;
