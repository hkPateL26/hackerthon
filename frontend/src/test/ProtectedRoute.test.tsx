import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { useAuthStore } from '../store/authStore';

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  it('shows loading indicator while session bootstrap is in progress', () => {
    useAuthStore.setState({ isLoading: true });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Protected Dashboard Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/VERIFYING POLICE COMMAND CREDENTIALS/i)).toBeInTheDocument();
    expect(screen.queryByText('Protected Dashboard Content')).not.toBeInTheDocument();
  });

  it('redirects to /login when user is unauthenticated', () => {
    useAuthStore.setState({ isAuthenticated: false, isLoading: false });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Protected Dashboard Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Screen</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Login Screen')).toBeInTheDocument();
    expect(screen.queryByText('Protected Dashboard Content')).not.toBeInTheDocument();
  });

  it('renders protected child component when user is authenticated', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: 'u1',
        email: 'officer@police.gov.in',
        fullName: 'Officer Kumar',
        role: 'OPERATOR',
        permissions: [],
        isActive: true,
      },
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Protected Dashboard Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Protected Dashboard Content')).toBeInTheDocument();
  });

  it('shows 403 Restricted Access when user role is not permitted', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: 'u1',
        email: 'operator@police.gov.in',
        fullName: 'Demo Operator',
        role: 'OPERATOR',
        permissions: [],
        isActive: true,
      },
    });

    render(
      <MemoryRouter initialEntries={['/admin-settings']}>
        <Routes>
          <Route
            path="/admin-settings"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <div>Admin Only Settings</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/403 — Restricted Access/i)).toBeInTheDocument();
    expect(screen.queryByText('Admin Only Settings')).not.toBeInTheDocument();
  });
});
