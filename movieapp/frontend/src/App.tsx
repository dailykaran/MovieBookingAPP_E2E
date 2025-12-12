import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, CssBaseline, AppBar, Toolbar, Typography, Container } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import MovieList from './components/MovieList';
import MovieDetails from './components/MovieDetails';
import UserDetailsPage from './components/UserDetailsPage';
import PaymentPage from './components/PaymentPage';
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
              <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold', fontSize: '1.5rem' }}>
                ShowGlow
              </Typography>
            </Toolbar>
          </AppBar>
          <Container>
            <Routes>
              <Route path="/" element={<MovieList />} />
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
