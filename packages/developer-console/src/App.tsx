import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import AppsPage from '@/pages/AppsPage';
import DocsPage from '@/pages/DocsPage';
import SettingsPage from '@/pages/SettingsPage';
import OAuthCallback from '@/pages/OAuthCallback';
import GoogleCallback from '@/pages/GoogleCallback';
import SSOCallback from '@/pages/SSOCallback';
import { Layout } from '@/components/Layout';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token, user, loading } = useAuth();

  // Show loading while:
  // 1. Initial auth state is being determined (loading=true)
  // 2. Token exists but user hasn't been fetched yet (means we're still validating)
  if (loading || (token && !user)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  // Only redirect to login if there's no token (user explicitly logged out or never logged in)
  // If token exists but user is null at this point, it means validation failed and token was cleared
  return token ? <>{children}</> : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />
      <Route path="/auth/callback" element={<SSOCallback />} />
      <Route path="/auth/callback/google" element={<GoogleCallback />} />

      {/* Protected routes with Layout */}
      <Route element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/apps" element={<AppsPage />} />
        <Route path="/docs/:section?" element={<DocsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Catch-all route - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
