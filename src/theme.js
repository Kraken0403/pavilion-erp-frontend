// theme.js
import { createTheme } from '@mui/material/styles';

const flowbiteBorder = '#d1d5db';
const flowbiteFocus = '#1c64f2';

const theme = createTheme({
  spacing: 8,

  palette: {
    primary: {
      main: flowbiteFocus
    },
    secondary: {
      main: '#057a55'
    },
    background: {
      default: '#f9fafb',
      paper: '#ffffff'
    },
    text: {
      primary: '#111827',
      secondary: '#6b7280'
    }
  },

  typography: {
    fontFamily: 'Inter, sans-serif',
    button: {
      textTransform: 'none',
      fontWeight: 600
    }
  },

  shape: {
    borderRadius: 8
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f9fafb',
          color: '#111827'
        }
      }
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
          paddingRight: 0
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: '1px solid #e5e7eb',
          boxShadow: 'none'
        }
      }
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          minHeight: 38,
          padding: '8px 14px',
          textTransform: 'none',
          fontWeight: 600
        }
      }
    },
    MuiTextField: {
      defaultProps: {
        size: 'small'
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#f9fafb',
          fontSize: 14,
          color: '#111827',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: flowbiteBorder
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#9ca3af'
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: flowbiteFocus,
            borderWidth: 1
          },
          '&.Mui-focused': {
            boxShadow: '0 0 0 1px rgba(28, 100, 242, 0.18)'
          },
          '&.Mui-disabled': {
            backgroundColor: '#f3f4f6',
            color: '#6b7280'
          }
        },
        input: {
          padding: '9px 12px',
          fontSize: 14
        },
        multiline: {
          padding: '9px 12px'
        }
      }
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#6b7280',
          fontSize: 14,
          '&.Mui-focused': {
            color: flowbiteFocus
          }
        }
      }
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: 14
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: '#f9fafb',
          color: '#6b7280',
          fontSize: 12,
          fontWeight: 700
        },
        body: {
          color: '#374151',
          fontSize: 14
        }
      }
    }
  }
});

export default theme;
