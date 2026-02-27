// theme.js
import { createTheme } from '@mui/material/styles';

const FONT_STACK = 'Poppins, Inter, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const theme = createTheme({
  spacing: 8, // default is 8px; can change to 4 or anything

  palette: {
    primary: {
      main: '#2c3e50'
    },
    secondary: {
      main: '#e67e22'
    },
    background: {
      default: '#f5f5f5'
    }
  },

  typography: {
    fontFamily: FONT_STACK,
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },

  shape: {
    borderRadius: 10
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        'html, body, #root': {
          fontFamily: FONT_STACK,
          backgroundColor: '#f7f8fa',
        },
      },
    },
    MuiContainer: {
      defaultProps: {
        maxWidth: false,
        disableGutters: true
      },
      styleOverrides: {
        root: {
          maxWidth: '100% !important',
          paddingLeft: 0,
          paddingRight: 0,
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: '#fff',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            fontWeight: 700,
          },
        },
      },
    }
  }
  
});

export default theme;
