import React, { useState } from 'react';
import { Drawer, List, ListItemIcon, ListItemText, Toolbar, Collapse } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CategoryIcon from '@mui/icons-material/Category';
import ListItemButton from '@mui/material/ListItemButton';
import ProductionQuantityLimitsIcon from '@mui/icons-material/ProductionQuantityLimits';
import LogoutIcon from '@mui/icons-material/Logout';
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

import ExpandMore from '@mui/icons-material/ExpandMore';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useNavigate } from 'react-router-dom';
import '../assets/styles/Sidebar.scss';

const drawerWidth = 200;

const Sidebar = () => {
  const { logout, canAccessModule } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const isCateringBusiness = settings?.business_type === 'CATERING';

  const [leadsOpen, setLeadsOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [workOrdersOpen, setWorkOrdersOpen] = useState(false);
  const [quotationsOpen, setQuotationsOpen] = useState(false);
  const [invoicesOpen, setInvoicesOpen] = useState(false);
  const [kotOpen, setKotOpen] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="sidebar">
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant="permanent"
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
              <ListItemButton onClick={() => setLeadsOpen(!leadsOpen)}>
                <ListItemIcon><PeopleIcon /></ListItemIcon>
                <ListItemText primary="Leads" />
                {leadsOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={leadsOpen} timeout="auto" unmountOnExit>
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
              <ListItemButton onClick={() => setProductsOpen(!productsOpen)}>
                <ListItemIcon><Inventory2Icon /></ListItemIcon>
                <ListItemText primary="Products" />
                {productsOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={productsOpen} timeout="auto" unmountOnExit>
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
              <ListItemButton onClick={() => setQuotationsOpen(!quotationsOpen)}>
                <ListItemIcon><ArticleIcon /></ListItemIcon>
                <ListItemText primary="Quotations" />
                {quotationsOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>

              <Collapse in={quotationsOpen} timeout="auto" unmountOnExit>
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
              <ListItemButton onClick={() => setWorkOrdersOpen(!workOrdersOpen)}>
                <ListItemIcon><ProductionQuantityLimitsIcon /></ListItemIcon>
                <ListItemText primary="Work Orders" />
                {workOrdersOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={workOrdersOpen} timeout="auto" unmountOnExit>
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
              <ListItemButton onClick={() => setKotOpen(!kotOpen)}>
                <ListItemIcon><RestaurantMenuIcon /></ListItemIcon>
                <ListItemText primary="KOT" />
                {kotOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={kotOpen} timeout="auto" unmountOnExit>
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
              <ListItemButton onClick={() => setDeliveryOpen(!deliveryOpen)}>
                <ListItemIcon><LocalShippingIcon /></ListItemIcon>
                <ListItemText primary="Delivery" />
                {deliveryOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={deliveryOpen} timeout="auto" unmountOnExit>
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
              <ListItemButton onClick={() => setInvoicesOpen(!invoicesOpen)}>
                <ListItemIcon><ReceiptLongIcon /></ListItemIcon>
                <ListItemText primary="Invoices" />
                {invoicesOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>

              <Collapse in={invoicesOpen} timeout="auto" unmountOnExit>
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

          {canAccessModule('users') && (
            <ListItemButton onClick={() => navigate('/users')}>
              <ListItemIcon><PeopleIcon /></ListItemIcon>
              <ListItemText primary="Users" />
            </ListItemButton>
          )}

          <ListItemButton onClick={handleLogout}>
            <ListItemIcon><LogoutIcon /></ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>

        </List>
      </Drawer>
    </div>
  );
};

export default Sidebar;
