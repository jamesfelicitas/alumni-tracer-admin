import React, { useState } from 'react';
import { TextField, Button, Container, Typography, Box } from '@mui/material';
import CookieOutLined from '@mui/icons-material/CookieOutlined';
import Stack from '@mui/material/Stack';

import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('navigating to /home');
    // Handle login logic here
    navigate('/home/dashboard');
  };

  return (
    <Container maxWidth="sm">
      <Box mt={10} p={4} boxShadow={3} borderRadius={2}>
        <Stack 
            direction="column" 
            spacing={2} 
            sx={{ 
              justifyContent: 'center', 
              alignItems: 'center', 
              width: '100%', 
            }}
          >
            {/*
             <Avatar 
              alt="Remy Sharp" 
              src="/static/images/avatar/5.jpg" 
              sx={{ 
                width: 100, 
                height: 100, 
              }}
              />
            */}
           
            {/* Replace Avatar with Material Icon */}
              <CookieOutLined sx={{ 
                fontSize: 200, // Adjust the size of the icon
              }} />
          </Stack>
        <Typography variant="h5" gutterBottom>Login</Typography>

        {/* Hidden dummy fields to suppress browser autofill */}
        <form onSubmit={handleLogin} autoComplete="off">
          <input type="text" name="fakeusernameremembered" style={{ display: 'none' }} />
          <input type="password" name="fakepasswordremembered" style={{ display: 'none' }} />

          <TextField
            label="Email"
            type="email"
            name="user_email"
            autoComplete="off"
            fullWidth
            margin="normal"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <TextField
            label="Password"
            type="password"
            name="user_pass"
            autoComplete="new-password"
            fullWidth
            margin="normal"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
            Login
          </Button>
        </form>
      </Box>
    </Container>
  );
};

export default Login;
