import React, { useEffect, useState } from 'react';
import { AccountCircle, Logout, Menu, Person } from '@mui/icons-material';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu as MuiMenu,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLayout } from '../context/LayoutContext';
import { useAuth } from '../context/AuthContext';
import { logout as logoutService } from '../services/authService';
import { getMyProfile, updateMyProfile } from '../services/userServices';
import ConfirmDialog from './ui/ConfirmDialog';
import '../assets/styles/Topbar.scss'

function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleSidebar } = useLayout();
  const { currentUser, logout, updateCurrentUser } = useAuth();
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone_number: '',
  });

  const isMenuOpen = Boolean(menuAnchor);

  // Convert the current URL path to a page title
  const getPageTitle = () => {
    const path = location.pathname;
    // Remove leading slash and replace hyphens or underscores with spaces
    const formattedTitle = path.replace('/', '').replace(/-|_/g, ' ');
    // Capitalize the first letter of each word
    return formattedTitle.charAt(0).toUpperCase() + formattedTitle.slice(1);
  };

  const openMenu = (event) => setMenuAnchor(event.currentTarget);
  const closeMenu = () => setMenuAnchor(null);

  const handleOpenProfile = async () => {
    closeMenu();
    setProfileOpen(true);
    setProfileLoading(true);
    setProfileError('');

    try {
      const profile = await getMyProfile();
      setProfileForm({
        name: profile?.name || currentUser?.name || '',
        email: profile?.email || currentUser?.email || '',
        phone_number: profile?.phone_number || '',
      });
    } catch (error) {
      setProfileError(error?.response?.data?.error || 'Failed to load profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleProfileChange = (field, value) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileError('');

    try {
      const result = await updateMyProfile(profileForm);
      const updatedUser = result?.user;

      if (updatedUser) {
        updateCurrentUser({
          name: updatedUser.name,
          email: updatedUser.email,
          phone_number: updatedUser.phone_number || null,
        });
      }

      setProfileOpen(false);
    } catch (error) {
      setProfileError(error?.response?.data?.error || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutService();
    } catch {
    }
    logout();
    navigate('/');
  };

  const handleRequestLogout = () => {
    closeMenu();
    setLogoutDialogOpen(true);
  };

  useEffect(() => {
    if (!profileOpen) {
      setProfileError('');
    }
  }, [profileOpen]);

  return (
    <div className="topbar">
      <div className="topbar-wrapper">
        <div className="topbar-ops">
          <div className="hamburger">
            <IconButton onClick={toggleSidebar}>
              <Menu />
            </IconButton>
          </div>
          <div className="topbar-page-title">
            <h2>
              {getPageTitle() || 'Home'} {/* Fallback to 'Home' if the path is '/' */}
            </h2>
          </div>
        </div>
        <div className="topbar-profile">
          <div className="profile-picture">
            <IconButton onClick={openMenu}>
              <AccountCircle />
            </IconButton>

            <MuiMenu
              anchorEl={menuAnchor}
              open={isMenuOpen}
              onClose={closeMenu}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem onClick={handleOpenProfile}>
                <Person fontSize="small" style={{ marginRight: 8 }} />
                Profile
              </MenuItem>
              <MenuItem onClick={handleRequestLogout}>
                <Logout fontSize="small" style={{ marginRight: 8 }} />
                Logout
              </MenuItem>
            </MuiMenu>
          </div>
        </div>
      </div>

      <Dialog open={profileOpen} onClose={() => setProfileOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogContent>
          {profileError ? (
            <Typography color="error" sx={{ mb: 2 }}>
              {profileError}
            </Typography>
          ) : null}

          <TextField
            fullWidth
            margin="normal"
            label="Name"
            value={profileForm.name}
            onChange={(e) => handleProfileChange('name', e.target.value)}
            disabled={profileLoading || savingProfile}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Email"
            value={profileForm.email}
            onChange={(e) => handleProfileChange('email', e.target.value)}
            disabled={profileLoading || savingProfile}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Phone Number"
            value={profileForm.phone_number}
            onChange={(e) => handleProfileChange('phone_number', e.target.value)}
            disabled={profileLoading || savingProfile}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfileOpen(false)} disabled={savingProfile}>Cancel</Button>
          <Button onClick={handleSaveProfile} variant="contained" disabled={profileLoading || savingProfile}>
            {savingProfile ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={logoutDialogOpen}
        title="Confirm Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        cancelText="Cancel"
        onConfirm={() => {
          setLogoutDialogOpen(false);
          handleLogout();
        }}
        onCancel={() => setLogoutDialogOpen(false)}
      />
    </div>
  );
}

export default Topbar;
