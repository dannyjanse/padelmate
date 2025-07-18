import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import MatchNightDetails from './pages/MatchNightDetails'
import CreateMatchNight from './pages/CreateMatchNight'
import EditMatchNight from './pages/EditMatchNight'
import DatabaseSetup from './pages/DatabaseSetup'
import Layout from './components/Layout'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="database-setup" element={<DatabaseSetup />} />
              <Route path="match-nights/new" element={<CreateMatchNight />} />
              <Route path="match-nights/:id" element={<MatchNightDetails />} />
              <Route path="match-nights/:id/edit" element={<EditMatchNight />} />
            </Route>
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App 