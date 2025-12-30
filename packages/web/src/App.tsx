import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import CallbackPage from './pages/CallbackPage';
import HomePage from './pages/HomePage';
import AuthorizePage from './pages/AuthorizePage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import { api } from './utils/api';

/**
 * Protected Route Component
 * 路由保护组件
 */
function PrivateRoute({ children }: { children: JSX.Element }) {
    const { isAuthenticated, isValidating, user } = useAuthStore();

    // Show loading while validating token
    if (isValidating) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-slate-400">Loading...</div>
            </div>
        );
    }

    // Only allow access if authenticated AND user is loaded
    if (!isAuthenticated || !user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

function App() {
    return (
        <Routes>
            <Route
                path="/"
                element={
                    <PrivateRoute>
                        <HomePage />
                    </PrivateRoute>
                }
            />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/callback/:provider" element={<CallbackPage />} />
            <Route path="/auth/callback/:provider" element={<CallbackPage />} />

            {/* Legal Pages (Public) */}
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />

            {/* OAuth Provider Routes */}
            <Route path="/oauth2/authorize" element={
                <PrivateRoute>
                    <AuthorizePage />
                </PrivateRoute>
            } />
        </Routes>
    );
}

export default App;

