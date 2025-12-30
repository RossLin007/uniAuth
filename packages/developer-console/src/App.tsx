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

  // Show loading while validating token
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  // Only allow access if both token exists AND user is loaded (validation passed)
  // This prevents showing protected pages with an expired token
  return (token && user) ? <>{children}</> : <Navigate to="/login" />;
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
