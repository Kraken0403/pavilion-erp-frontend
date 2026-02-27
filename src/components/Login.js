import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { login as loginService } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import {
  TextField,
  InputAdornment,
  Checkbox,
  FormControlLabel,
  Button
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import '../assets/styles/Login.scss';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        <h2>
          Login to <span>Zoans LMS!</span>
        </h2>
        <hr />

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
            type="password"
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
            Login
          </Button>

          {error && <p className="error-message">{error}</p>}
        </form>
      </div>
    </div>
  );
};

export default Login;
