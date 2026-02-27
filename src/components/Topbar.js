import React from 'react';
import { AccountCircle, Menu } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { useLocation } from 'react-router-dom';
import '../assets/styles/Topbar.scss'

function Topbar() {
  const location = useLocation();

  // Convert the current URL path to a page title
  const getPageTitle = () => {
    const path = location.pathname;
    // Remove leading slash and replace hyphens or underscores with spaces
    const formattedTitle = path.replace('/', '').replace(/-|_/g, ' ');
    // Capitalize the first letter of each word
    return formattedTitle.charAt(0).toUpperCase() + formattedTitle.slice(1);
  };

  return (
    <div className="topbar">
      <div className="topbar-wrapper">
        <div className="topbar-ops">
          <div className="hamburger">
            <IconButton>
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
            <IconButton>
              <AccountCircle />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Topbar;
