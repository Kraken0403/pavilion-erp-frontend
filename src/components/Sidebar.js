import React, { useState } from 'react';
import { Drawer, List, ListItemIcon, ListItemText, Toolbar, Collapse } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CategoryIcon from '@mui/icons-material/Category';
import ListItemButton from '@mui/material/ListItemButton';
import ProductionQuantityLimitsIcon from '@mui/icons-material/ProductionQuantityLimits';
// import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import ArticleIcon from '@mui/icons-material/Article';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import ExpandLess from '@mui/icons-material/ExpandLess';
import SettingsIcon from '@mui/icons-material/Settings';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CampaignIcon from '@mui/icons-material/Campaign';

import ExpandMore from '@mui/icons-material/ExpandMore';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../context/LayoutContext';
import '../assets/styles/Sidebar.scss';

const drawerWidth = 200;
const MAX_EXPANDED_MODULES = 1;

const Sidebar = () => {
  const { currentUser, canAccessModule } = useAuth();
  const { settings } = useSettings();
  const { sidebarOpen } = useLayout();
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
            <ListItemButton onClick={() => navigate('/dashboard')}>
              <ListItemIcon><DashboardIcon /></ListItemIcon>
              <ListItemText primary="Dashboard" />
            </ListItemButton>
          )}

          {canAccessModule('leads') && (
            <>
              <ListItemButton onClick={() => toggleModule('leads')}>
                <ListItemIcon><PeopleIcon /></ListItemIcon>
                <ListItemText primary="Leads" />
                {isExpanded('leads') ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={isExpanded('leads')} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <ListItemButton sx={{ pl: 4 }} onClick={() => navigate('/leads')}>
                    <ListItemIcon><PeopleIcon /></ListItemIcon>
                    <ListItemText primary="View Leads" />
                  </ListItemButton>
                  <ListItemButton sx={{ pl: 4 }} onClick={() => navigate('/leads/settings')}>
                    <ListItemIcon><SettingsIcon /></ListItemIcon>
                    <ListItemText primary="Lead Settings" />
                  </ListItemButton>
                </List>
              </Collapse>
            </>
          )}



          {/* PRODUCTS */}
          {canAccessModule('products') && (
            <>
              <ListItemButton onClick={() => toggleModule('products')}>
                <ListItemIcon><Inventory2Icon /></ListItemIcon>
                <ListItemText primary="Products" />
                {isExpanded('products') ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={isExpanded('products')} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <ListItemButton sx={{ pl: 4 }} onClick={() => navigate('/products/list')}>
                    <ListItemIcon><FormatListBulletedIcon /></ListItemIcon>
                    <ListItemText primary="Product List" />
                  </ListItemButton>
                  <ListItemButton sx={{ pl: 4 }} onClick={() => navigate('/products/categories')}>
                    <ListItemIcon><CategoryIcon /></ListItemIcon>
                    <ListItemText primary="Categories" />
                  </ListItemButton>
                  <ListItemButton sx={{ pl: 4 }} onClick={() => navigate('/products/attributes')}>
                    <ListItemIcon><SettingsIcon /></ListItemIcon>
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
                  <ListItemButton sx={{ pl: 4 }} onClick={() => navigate('/quotations')}>
                    <ListItemIcon><FormatListBulletedIcon /></ListItemIcon>
                    <ListItemText primary="Quotation List" />
                  </ListItemButton>

                  <ListItemButton sx={{ pl: 4 }} onClick={() => navigate('/quotations-settings')}>
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
                <ListItemText primary="Work Orders" />
                {isExpanded('work_orders') ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={isExpanded('work_orders')} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <ListItemButton sx={{ pl: 4 }} onClick={() => navigate('/workorders')}>
                    <ListItemIcon><FormatListBulletedIcon /></ListItemIcon>
                    <ListItemText primary="Work Order List" />
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
                <ListItemText primary="KOT" />
                {isExpanded('kots') ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={isExpanded('kots')} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <ListItemButton sx={{ pl: 4 }} onClick={() => navigate('/kots')}>
                    <ListItemIcon><FormatListBulletedIcon /></ListItemIcon>
                    <ListItemText primary="KOT Board" />
                  </ListItemButton>
                  <ListItemButton sx={{ pl: 4 }} onClick={() => navigate('/kots/settings')}>
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
                <ListItemText primary="Delivery" />
                {isExpanded('deliveries') ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={isExpanded('deliveries')} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <ListItemButton sx={{ pl: 4 }} onClick={() => navigate('/deliveries')}>
                    <ListItemIcon><FormatListBulletedIcon /></ListItemIcon>
                    <ListItemText primary="Delivery Board" />
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
                  <ListItemButton sx={{ pl: 4 }} onClick={() => navigate('/invoices')}>
                    <ListItemIcon><FormatListBulletedIcon /></ListItemIcon>
                    <ListItemText primary="Invoice List" />
                  </ListItemButton>

                  <ListItemButton sx={{ pl: 4 }} onClick={() => navigate('/invoice-settings')}>
                    <ListItemIcon><SettingsIcon /></ListItemIcon>
                    <ListItemText primary="Settings" />
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
                  <ListItemButton sx={{ pl: 4 }} onClick={() => navigate('/payment-reminders')}>
                    <ListItemIcon><FormatListBulletedIcon /></ListItemIcon>
                    <ListItemText primary="Pending Payments" />
                  </ListItemButton>

                  <ListItemButton sx={{ pl: 4 }} onClick={() => navigate('/payment-reminders/settings')}>
                    <ListItemIcon><SettingsIcon /></ListItemIcon>
                    <ListItemText primary="Settings" />
                  </ListItemButton>
                </List>
              </Collapse>
            </>
          )}

          {canAccessModule('settings') && (
            <ListItemButton onClick={() => navigate('/settings')}>
              <ListItemIcon><SettingsIcon /></ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItemButton>
          )}

          {canAccessModule('reports') && (
            <ListItemButton onClick={() => navigate('/reports')}>
              <ListItemIcon><AssessmentIcon /></ListItemIcon>
              <ListItemText primary="Reports" />
            </ListItemButton>
          )}

          {canAccessModule('reports') && (
            <>
              <ListItemButton onClick={() => toggleModule('feedback')}>
                <ListItemIcon><CampaignIcon /></ListItemIcon>
                <ListItemText primary="Feedback" />
                {isExpanded('feedback') ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>

              <Collapse in={isExpanded('feedback')} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <ListItemButton sx={{ pl: 4 }} onClick={() => navigate('/feedbacks')}>
                    <ListItemIcon><FormatListBulletedIcon /></ListItemIcon>
                    <ListItemText primary="Feedback List" />
                  </ListItemButton>

                  <ListItemButton sx={{ pl: 4 }} onClick={() => navigate('/feedbacks/settings')}>
                    <ListItemIcon><SettingsIcon /></ListItemIcon>
                    <ListItemText primary="Settings" />
                  </ListItemButton>
                </List>
              </Collapse>
            </>
          )}

          {currentUser?.role === 'admin' && canAccessModule('users') && (
            <ListItemButton onClick={() => navigate('/users')}>
              <ListItemIcon><PeopleIcon /></ListItemIcon>
              <ListItemText primary="Users" />
            </ListItemButton>
          )}

        </List>
      </Drawer>
    </div>
  );
};

export default Sidebar;
