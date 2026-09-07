import React from 'react';
import { Close } from '@mui/icons-material';
import { Drawer, IconButton } from '@mui/material';

export default function EntityFormDrawer({ open, title, onClose, children }) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ className: 'erp-entity-drawer' }}
    >
      <header className="erp-entity-drawer__header">
        <h2>{title}</h2>
        <IconButton aria-label="Close form" onClick={onClose}><Close /></IconButton>
      </header>
      <div className="erp-entity-drawer__body">{children}</div>
    </Drawer>
  );
}
