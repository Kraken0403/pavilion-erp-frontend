import React, { useEffect, useMemo, useState } from 'react';
import { AccountCircle, ArrowBack, Logout, Menu, NotificationsNone, Person } from '@mui/icons-material';
import {
  Badge,
  Button,
  Chip,
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
import { useRouteHistory } from '../context/RouteHistoryContext';
import { logout as logoutService } from '../services/authService';
import { getMyProfile, updateMyProfile } from '../services/userServices';
import { useNotification } from '../context/NotificationContext';
import ConfirmDialog from './ui/ConfirmDialog';
import '../assets/styles/Topbar.scss'

function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleSidebar } = useLayout();
  const { canGoBack, goBack } = useRouteHistory();
  const { currentUser, logout, updateCurrentUser } = useAuth();
  const {
    unreadNotifications,
    totalUnseen,
    fetchNotifications,
    fetchBubbleCounts,
    markNotificationSeen,
    markAllNotificationsSeen,
  } = useNotification();
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
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
  const isNotificationOpen = Boolean(notificationAnchor);

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

  const openNotifications = async (event) => {
    setNotificationAnchor(event.currentTarget);
    await fetchNotifications();
    await fetchBubbleCounts();
  };

  const closeNotifications = () => setNotificationAnchor(null);

  const getNotificationFallbackRoute = (notification) => {
    if (!notification) return '/dashboard';

    if (notification.module === 'leads' && notification.source_id) {
      return `/leads/${notification.source_id}/edit`;
    }

    if (notification.module === 'work_orders' && notification.source_id) {
      return `/workorders/${notification.source_id}`;
    }

    if (notification.module === 'kot') return '/kots';
    if (notification.module === 'delivery') return '/deliveries';
    if (notification.module === 'feedback') return '/feedbacks';

    return '/dashboard';
  };

  const formatNotificationTime = () => {
    const now = new Date();

    return now.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: true,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatModuleLabel = (module) => {
    const key = String(module || '').trim().toLowerCase();
    if (key === 'leads') return 'Leads';
    if (key === 'work_orders') return 'Work Orders';
    if (key === 'kot') return 'KOT';
    if (key === 'delivery') return 'Delivery';
    if (key === 'feedback') return 'Feedback';

    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const toTitleCase = (value) => {
    return String(value || '')
      .split('_')
      .join(' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const getNotificationActionDetails = (action) => {
    const raw = String(action || '').trim();
    if (!raw) return { message: 'Update', statusChange: '' };

    const transitionMatch = raw.match(/\(([^)]+)->([^)]+)\)/);
    const statusChange = transitionMatch
      ? `${toTitleCase(transitionMatch[1].trim())} -> ${toTitleCase(transitionMatch[2].trim())}`
      : '';

    const message = raw.replace(/\(([^)]+)->([^)]+)\)/g, '').replace(/\s+/g, ' ').trim() || 'Update';

    return { message, statusChange };
  };

  const getChangeBadgeLabel = (notification) => {
    const action = String(notification?.action || '').toLowerCase();
    if (!action) return 'UPDATED';
    return /(create|new|added)/.test(action) ? 'NEW' : 'UPDATED';
  };

  const appendQueryParam = (path, key, value) => {
    if (!path) return path;
    const safeValue = Number(value || 0);
    if (!safeValue) return path;

    const joiner = path.includes('?') ? '&' : '?';
    return `${path}${joiner}${key}=${safeValue}`;
  };

  const appendTextQueryParam = (path, key, value) => {
    if (!path) return path;
    const safeValue = String(value || '').trim();
    if (!safeValue) return path;

    const joiner = path.includes('?') ? '&' : '?';
    return `${path}${joiner}${key}=${encodeURIComponent(safeValue)}`;
  };

  const extractWorkOrderNumber = (notification) => {
    const action = String(notification?.action || '');
    const match = action.match(/WO\/\d{4}\/\d+/i);
    return match ? match[0].toUpperCase() : '';
  };

  const handleNotificationClick = async (notification) => {
    if (!notification) return;

    if (!notification.isSeen) {
      await markNotificationSeen(notification.id);
    }

    closeNotifications();

    let finalRoute = notification.module === 'leads' && notification.source_id
      ? `/leads/${notification.source_id}/edit`
      : (notification.redirect_url || getNotificationFallbackRoute(notification));

    if (notification.module === 'kot' && notification.source_id) {
      finalRoute = appendQueryParam('/kots', 'focusKotId', notification.source_id);
      finalRoute = appendTextQueryParam(finalRoute, 'focusWoNo', extractWorkOrderNumber(notification));
      finalRoute = appendTextQueryParam(finalRoute, 'range', 'all');
    }

    if (notification.module === 'delivery' && notification.source_id) {
      finalRoute = appendQueryParam('/deliveries', 'focusDeliveryId', notification.source_id);
      finalRoute = appendTextQueryParam(finalRoute, 'range', 'all');
    }

    if (notification.module === 'feedback' && notification.source_id) {
      finalRoute = appendQueryParam('/feedbacks', 'focusFeedbackId', notification.source_id);
    }

    navigate(finalRoute);
    await fetchBubbleCounts();
  };

  const latestUnreadNotifications = useMemo(() => {
    return [...unreadNotifications]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [unreadNotifications]);

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
          {canGoBack ? (
            <div className="back-button">
              <IconButton onClick={goBack}>
                <ArrowBack />
              </IconButton>
            </div>
          ) : null}
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
          <div className="notification-bell">
            <IconButton onClick={openNotifications}>
              <Badge badgeContent={totalUnseen} color="error">
                <NotificationsNone />
              </Badge>
            </IconButton>

            <MuiMenu
              anchorEl={notificationAnchor}
              open={isNotificationOpen}
              onClose={closeNotifications}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{
                sx: {
                  width: 420,
                  maxHeight: 520,
                  borderRadius: 2,
                  border: '1px solid #e5e9f2',
                  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
                  p: 0,
                }
              }}
            >
              {unreadNotifications.length ? (
                <div style={{ padding: '10px 12px', borderBottom: '1px solid #edf1f7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1f2937' }}>
                    Notifications
                  </Typography>
                  <Button
                    size="small"
                    onClick={async () => {
                      await markAllNotificationsSeen();
                      await fetchBubbleCounts();
                      closeNotifications();
                    }}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                  >
                    Mark all as read
                  </Button>
                </div>
              ) : null}

              {latestUnreadNotifications.length ? (
                latestUnreadNotifications.slice(0, 20).map((notification) => {
                  const actionDetails = getNotificationActionDetails(notification.action);
                  const showFeedbackBadge = String(notification?.module || '').toLowerCase() === 'feedback';
                  const feedbackBadgeLabel = showFeedbackBadge ? getChangeBadgeLabel(notification) : '';

                  return (
                    <MenuItem
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      sx={{
                        mx: 1,
                        my: 0.5,
                        py: 1,
                        borderRadius: 1.5,
                        alignItems: 'flex-start',
                        border: '1px solid #edf1f7',
                        background: '#fff',
                        whiteSpace: 'normal',
                      }}
                    >
                      <div style={{ width: '100%' }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: '#111827',
                            lineHeight: 1.4,
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {actionDetails.message}
                        </Typography>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, gap: 8 }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {actionDetails.statusChange ? (
                              <Typography variant="caption" sx={{ color: '#6b7280' }}>
                                {actionDetails.statusChange}
                              </Typography>
                            ) : null}
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <Typography variant="caption" sx={{ color: '#111827', fontWeight: 700 }}>
                                {formatModuleLabel(notification.module)}
                              </Typography>
                              {feedbackBadgeLabel ? (
                                <Chip
                                  label={feedbackBadgeLabel}
                                  size="small"
                                  color={feedbackBadgeLabel === 'NEW' ? 'error' : 'warning'}
                                  sx={{ height: 18, fontSize: 10, fontWeight: 700 }}
                                />
                              ) : null}
                            </div>
                          </div>
                          <Typography variant="caption" sx={{ color: '#6b7280', whiteSpace: 'nowrap' }}>
                            {formatNotificationTime(notification.created_at)}
                          </Typography>
                        </div>
                      </div>
                    </MenuItem>
                  );
                })
              ) : (
                <MenuItem disabled>
                  <Typography variant="body2">No unread notifications</Typography>
                </MenuItem>
              )}
            </MuiMenu>
          </div>

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
