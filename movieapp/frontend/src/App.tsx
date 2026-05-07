import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, CssBaseline, AppBar, Toolbar, Typography, Container, Box } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import MovieListWithIframe from './components/MovieListWithIframe';
import MovieDetails from './components/MovieDetails';
import UserDetailsPage from './components/UserDetailsPage';
import PaymentPage from './components/PaymentPage';
import Logo from './components/Logo';
import { store } from './store/store';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <AppBar position="static">
            <Toolbar>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1 }}>
                <Logo size="xlarge" />
                <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', fontSize: '1.8rem', letterSpacing: '0.5px', color: 'white' }}>
                  TicketsVenue
                </Typography>
              </Box>
            </Toolbar>
          </AppBar>
          <Container>
            <Routes>
              <Route path="/" element={<MovieListWithIframe />} />
              <Route path="/movie/:id" element={<MovieDetails />} />
              <Route path="/user-details" element={<UserDetailsPage />} />
              <Route path="/payment" element={<PaymentPage />} />
            </Routes>
          </Container>
        </Router>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
