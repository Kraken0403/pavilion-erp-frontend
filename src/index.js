import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';
import App from './App';
import { SettingsProvider } from "./context/SettingsContext";
import { ConfirmProvider } from "./context/ConfirmContext";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <SettingsProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </SettingsProvider>
  </ThemeProvider>
  

);

// If you want to start measuring performance in your app, pass a function