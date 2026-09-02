import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import type { RoleName } from '../../types/auth';

interface ProtectedRouteProps {
  allowedRoles?: RoleName[];
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#0a0e1a',
          color: '#00d4ff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(0, 212, 255, 0.2)',
            borderTopColor: '#00d4ff',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            marginBottom: '1rem',
          }}
        />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <div style={{ fontSize: '0.875rem', letterSpacing: '0.05em', color: '#94a3b8' }}>
          VERIFYING POLICE COMMAND CREDENTIALS...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#f87171',
          backgroundColor: '#0a0e1a',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>403 — Restricted Access</h2>
        <p style={{ color: '#94a3b8', maxWidth: '400px', fontSize: '0.875rem' }}>
          Your role (<strong style={{ color: '#f87171' }}>{user.role}</strong>) does not have authorization
          to view this section. Required roles: {allowedRoles.join(', ')}.
        </p>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};
