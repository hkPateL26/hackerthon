export type RoleName = 'ADMIN' | 'SUPERVISOR' | 'OPERATOR';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: RoleName;
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  bootstrapAuth: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
}
