import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, isAdmin, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-300">
        <div className="w-10 h-10 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin mb-3"></div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <ShieldAlert className="w-4 h-4 text-teal-500" />
          <span>Verifying Cadastral Personnel Credentials...</span>
        </div>
      </div>
    );
  }

  // Redirect unauthenticated or unapproved users to /login
  if (!isAuthenticated || !user || !user.isApproved) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If route requires admin role and user is not an admin, redirect to dashboard
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : null;
};
