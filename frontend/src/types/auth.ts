export interface User {
  id: number;
  email: string;
  name: string;
  image: string;
  token: string;
}

export interface AuthError {
  message: string;
  code?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: AuthError | null;
}
