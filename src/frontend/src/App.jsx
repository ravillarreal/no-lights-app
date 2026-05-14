import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import MapPage from './pages/MapPage'
import DashboardPage from './pages/DashboardPage'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <Routes>
      <Route path="/"          element={<LandingPage />} />
      <Route path="/login"     element={<LoginPage />} />
      <Route path="/mapa"      element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="*"          element={<Navigate to="/" replace />} />
    </Routes>
  )
}
