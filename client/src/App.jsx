import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import QuotePage from './pages/QuotePage';
import OverlayPrototype from './pages/OverlayPrototype';
import TikiRoomPage from './pages/TikiRoomPage';
import MyTikiPortal from './pages/MyTikiPortal';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Public — 견적서 공유 링크 (인증 불필요) */}
          <Route path="/quote/:id" element={<QuotePage />} />

          {/* Public — Overlay prototype (no auth required) */}
          <Route path="/overlay" element={<OverlayPrototype />} />

          {/* Public — Tiki Room tablet prototype (no auth required) */}
          <Route path="/room" element={<TikiRoomPage />} />

          {/* Public — My Tiki patient portal (magic link) */}
          <Route path="/t/:token" element={<MyTikiPortal />} />

          {/* Protected — /app/* */}
          <Route
            path="/app/*"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
