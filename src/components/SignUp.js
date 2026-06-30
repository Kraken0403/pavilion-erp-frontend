import React, { useState, useEffect } from 'react';
import { signup } from '../services/authService';
import { getAllUsers, deleteUser } from '../services/userServices';
import { jwtDecode } from 'jwt-decode';
import {
  Button,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Box,
  Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

function SignUp() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'salesperson',
  });

  const [users, setUsers] = useState([]); // Store registered users
  const [isFormVisible, setIsFormVisible] = useState(false); // Toggle form visibility
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loggedInUser, setLoggedInUser] = useState(null);

  // Fetch all users on component load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const decoded = jwtDecode(token);
      setCurrentUserId(decoded.id); // Replace 'id' with the appropriate field from your token payload
      setLoggedInUser(decoded)
    }
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      alert('Failed to fetch users.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const response = await signup(formData);
      alert(response.message);
      fetchUsers(); // Refresh users list after signup
      setFormData({ name: '', email: '', password: '', role: 'salesperson' });
      setIsFormVisible(false);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(userId);
        alert('User deleted successfully.');
        fetchUsers(); // Refresh users list after deletion
      } catch (error) {
        alert('Failed to delete user.');
      }
    }
  };

  const toggleForm = () => {
    setIsFormVisible(!isFormVisible);
  };

  return (
    <Box sx={{ maxWidth: '600px', margin: 'auto', padding: '20px' }}>
      <h2>User Management</h2>
      <Button
        variant="contained"
        color="primary"
        onClick={toggleForm}
        sx={{ marginBottom: '20px' }}
      >
        {isFormVisible ? 'Close Form' : 'Add User'}
      </Button>

      {isFormVisible && (
        <Box
          sx={{
            border: '1px solid #ccc',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px',
          }}
        >
          <h3>Sign Up</h3>
          <form onSubmit={handleSignup}>
            <TextField
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              fullWidth
              sx={{ marginBottom: '10px' }}
            />
            <TextField
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              fullWidth
              sx={{ marginBottom: '10px' }}
            />
            <TextField
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              fullWidth
              sx={{ marginBottom: '10px' }}
            />
            <FormControl fullWidth sx={{ marginBottom: '10px' }}>
              <InputLabel id="role-label">Role</InputLabel>
              <Select
                labelId="role-label"
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
              >
                <MenuItem value="salesperson">Salesperson</MenuItem>
                <MenuItem value="supervisor">Supervisor</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
            <Button type="submit" variant="contained" color="success" fullWidth>
              Sign Up
            </Button>
          </form>
        </Box>
      )}

      <Box>
        <h3>Registered Users</h3>
        {users.length > 0 ? (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Email</strong></TableCell>
                  <TableCell><strong>Role</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                                
                {users.map((user) => (
                <TableRow key={user.id}>
                    <TableCell>
                    {user.name}
                    {user.id === currentUserId && (
                        <Chip label="You" color="primary" size="small" style={{ marginLeft: '8px' }} />
                    )}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                    <IconButton
                        color="error"
                        onClick={() => handleDelete(user.id)}
                        disabled={user.role === 'admin' || user.email === loggedInUser.email}
                    >
                        <DeleteIcon />
                    </IconButton>
                    </TableCell>
                </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <p>No users registered yet.</p>
        )}
      </Box>
    </Box>
  );
}

export default SignUp;
