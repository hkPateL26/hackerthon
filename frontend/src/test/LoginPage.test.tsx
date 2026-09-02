import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { useAuthStore } from '../store/authStore';

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  it('renders login page with Gujarat Police header and input fields', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Gujarat Police')).toBeInTheDocument();
    expect(screen.getByLabelText('Official Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('displays client validation errors on empty submission', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Official email address is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('displays validation error on invalid email format', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Official Email'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'ValidPass123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid official email address')).toBeInTheDocument();
    });
  });

  it('displays server error alert when auth fails', () => {
    useAuthStore.setState({
      error: 'Invalid email address or password',
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email address or password');
  });
});
