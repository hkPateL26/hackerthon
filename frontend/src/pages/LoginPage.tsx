import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({});

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = 'Official email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid official email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validate()) return;

    const success = await login({ email, password });
    if (success) {
      navigate(from, { replace: true });
    }
  };

  // Local development helper to pre-fill test credentials
  const fillDevCredentials = (roleEmail: string, pass: string) => {
    setEmail(roleEmail);
    setPassword(pass);
    setValidationErrors({});
    clearError();
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>🛡️</div>
        <h1 className={styles.title}>Gujarat Police</h1>
        <p className={styles.subtitle}>CCTV & AI Command Portal</p>

        {error && (
          <div className={styles.alertError} role="alert">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="officer-email">
              Official Email
            </label>
            <input
              id="officer-email"
              type="email"
              className={`${styles.input} ${validationErrors.email ? styles.inputError : ''}`}
              placeholder="officer@police.gujarat.gov.in"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (validationErrors.email) setValidationErrors((prev) => ({ ...prev, email: undefined }));
              }}
              disabled={isLoading}
              autoComplete="username"
            />
            {validationErrors.email && (
              <span className={styles.errorText}>{validationErrors.email}</span>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="officer-password">
              Password
            </label>
            <input
              id="officer-password"
              type="password"
              className={`${styles.input} ${validationErrors.password ? styles.inputError : ''}`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (validationErrors.password) setValidationErrors((prev) => ({ ...prev, password: undefined }));
              }}
              disabled={isLoading}
              autoComplete="current-password"
            />
            {validationErrors.password && (
              <span className={styles.errorText}>{validationErrors.password}</span>
            )}
          </div>

          <button
            type="submit"
            className={styles.button}
            disabled={isLoading}
            id="login-submit-btn"
          >
            {isLoading ? (
              <>
                <span
                  style={{
                    display: 'inline-block',
                    width: '14px',
                    height: '14px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                  }}
                />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* DEV ONLY SHORTCUTS: Gated by import.meta.env.DEV */}
        {import.meta.env.DEV && (
          <div className={styles.devShortcuts}>
            <div className={styles.devTitle}>DEV Quick-Fill (Test Accounts)</div>
            <div className={styles.demoButtonGroup}>
              <button
                type="button"
                className={styles.demoBtn}
                onClick={() => fillDevCredentials('admin@police.gujarat.gov.in', 'Admin@1234')}
              >
                Admin
              </button>
              <button
                type="button"
                className={styles.demoBtn}
                onClick={() => fillDevCredentials('supervisor@police.gujarat.gov.in', 'Supervisor@1234')}
              >
                Supervisor
              </button>
              <button
                type="button"
                className={styles.demoBtn}
                onClick={() => fillDevCredentials('operator@police.gujarat.gov.in', 'Operator@1234')}
              >
                Operator
              </button>
            </div>
          </div>
        )}

        <p className={styles.footerNote}>
          Authorized Personnel Only — Unauthorized access is prohibited by law.
        </p>
      </div>
    </div>
  );
}
