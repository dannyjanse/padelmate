import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import CreateMatchNight from './components/CreateMatchNight';
import MatchNightDetail from './components/MatchNightDetail';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/create-match-night" element={
              <ProtectedRoute>
                <CreateMatchNight />
              </ProtectedRoute>
            } />
            <Route path="/match-night/:id" element={
              <ProtectedRoute>
                <MatchNightDetail />
              </ProtectedRoute>
            } />
            <Route path="/" element={<Navigate to="/login" replace />} />
            {/* Add more routes here as we build them */}
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
