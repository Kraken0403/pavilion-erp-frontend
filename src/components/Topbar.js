import React, { useMemo, useState } from 'react';
import { Add, AppsOutlined, ExpandMore, GroupsOutlined, HelpOutline, NotificationsNone, Search, SettingsOutlined } from '@mui/icons-material';
import { Avatar, Divider, IconButton, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../assets/styles/Topbar.scss';

const searchablePages = [['Contacts', '/leads'], ['Companies', '/companies'], ['Customers', '/customers'], ['Quotations', '/quotations'], ['Work orders', '/workorders'], ['Invoices', '/invoices'], ['Products', '/products/list'], ['Vendors', '/vendors'], ['Payments', '/payments'], ['Reports', '/reports'], ['Settings', '/settings'], ['Users', '/users']];
const quickCreate = [['Create contact', '/leads?create=1'], ['Create quotation', '/quotation-create'], ['Create invoice', '/invoices?create=1'], ['Create work order', '/workorders?create=1'], ['Add product', '/products/list?create=1']];

function Topbar({ layoutTopbar = false }) {
  const { currentUser, canAccessModule, logout } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [createAnchor, setCreateAnchor] = useState(null);
  const [accountAnchor, setAccountAnchor] = useState(null);
  const results = useMemo(() => searchablePages.filter(([label]) => label.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 6), [search]);
  if (!layoutTopbar) return null;
  const go = (path) => { setSearch(''); setCreateAnchor(null); navigate(path); };
  return <header className="hub-topbar"><div className="hub-topbar__brand"><span>P</span> Pavilion Electronics</div>
    <div className="hub-topbar__search-wrap"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find or Ask" aria-label="Search the workspace" />{search && <div className="hub-topbar__results">{results.map(([label, path]) => <button key={path} onMouseDown={() => go(path)}>{label}</button>)}</div>}</div>
    <Tooltip title="Create"><IconButton className="hub-topbar__create" onClick={(event) => setCreateAnchor(event.currentTarget)}><Add /></IconButton></Tooltip><div className="hub-topbar__spacer" />
    <div className="hub-topbar__tools"><Tooltip title="Help"><IconButton><HelpOutline /></IconButton></Tooltip><Tooltip title="Notifications"><IconButton><NotificationsNone /></IconButton></Tooltip>{canAccessModule('users') && <Tooltip title="Users"><IconButton onClick={() => navigate('/settings?tab=users')}><GroupsOutlined /></IconButton></Tooltip>}{canAccessModule('settings') && <Tooltip title="Settings"><IconButton onClick={() => navigate('/settings')}><SettingsOutlined /></IconButton></Tooltip>}<Tooltip title="More tools"><IconButton><AppsOutlined /></IconButton></Tooltip></div>
    <Divider orientation="vertical" flexItem className="hub-topbar__divider" /><button className="hub-topbar__account" onClick={(event) => setAccountAnchor(event.currentTarget)}><Avatar>{String(currentUser?.name || currentUser?.email || 'U').charAt(0).toUpperCase()}</Avatar><span>{currentUser?.name || currentUser?.email || 'My account'}</span><ExpandMore /></button>
    <Menu anchorEl={createAnchor} open={Boolean(createAnchor)} onClose={() => setCreateAnchor(null)} slotProps={{ paper: { className: 'hub-topbar__menu' } }}>{quickCreate.map(([label, path]) => <MenuItem key={path} onClick={() => go(path)}>{label}</MenuItem>)}</Menu>
    <Menu anchorEl={accountAnchor} open={Boolean(accountAnchor)} onClose={() => setAccountAnchor(null)} slotProps={{ paper: { className: 'hub-topbar__menu' } }}><MenuItem onClick={() => go('/my-account')}><ListItemText primary="My account" secondary="Profile and security" /></MenuItem><MenuItem onClick={() => go('/settings')}><ListItemText primary="Settings" /></MenuItem><Divider /><MenuItem onClick={() => { setAccountAnchor(null); logout(); navigate('/'); }}><ListItemText primary="Sign out" /></MenuItem></Menu>
  </header>;
}

export default Topbar;
