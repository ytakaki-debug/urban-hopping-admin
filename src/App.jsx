import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Spots from './pages/Spots'
import Posts from './pages/Posts'
import SpotRequests from './pages/SpotRequests'
import Promotions from './pages/Promotions'

function ProtectedRoute({ children }) {
  const { session } = useAuth()
  if (session === undefined) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { session } = useAuth()
  if (session === undefined) return <LoadingScreen />
  if (session) return <Navigate to="/" replace />
  return children
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>
      読み込み中...
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"  element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/"       element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/spots"  element={<ProtectedRoute><Spots /></ProtectedRoute>} />
      <Route path="/posts"          element={<ProtectedRoute><Posts /></ProtectedRoute>} />
      <Route path="/spot-requests" element={<ProtectedRoute><SpotRequests /></ProtectedRoute>} />
      <Route path="/promotions"   element={<ProtectedRoute><Promotions /></ProtectedRoute>} />
      <Route path="*"              element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
