import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { login as loginService } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import {
  TextField,
  InputAdornment,
  Checkbox,
  FormControlLabel,
  Button,
  IconButton
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import '../assets/styles/Login.scss';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth(); // ✅ correct usage
  const navigate = useNavigate();

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
  
    try {
      const data = await loginService(email, password);
  
      // 🔥 FIX: accessToken, not token
      if (!data?.accessToken || !data?.user) {
        throw new Error('Invalid login response');
      }
  
      // ✅ SINGLE source of truth
      login(data.user, data.accessToken);
  
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
  
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err?.message || 'Failed to log in. Please try again.');
    }
  };
  

  return (
    <div className="login">
      <div className="login-wrapper">
        <div className="login-brand-mark">P</div>
        <div className="login-heading"><span>Welcome back</span><h2>Sign in to Pavilion ERP</h2><p>Manage your sales, operations, and finance from one workspace.</p></div>

        <form className="login-form" onSubmit={handleLogin}>
          <TextField
            label="Email"
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon />
                </InputAdornment>
              ),
            }}
            margin="normal"
          />

          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton aria-label={showPassword ? 'Hide password' : 'Show password'} edge="end" onClick={() => setShowPassword((current) => !current)} onMouseDown={(event) => event.preventDefault()}>
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            margin="normal"
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                color="primary"
              />
            }
            label="Remember Me"
          />

          <Button type="submit" variant="contained" fullWidth>
            Sign in
          </Button>

          {error && <p className="error-message">{error}</p>}
        </form>
      </div>
    </div>
  );
};

export default Login;
