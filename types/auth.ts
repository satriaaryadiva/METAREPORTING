export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role?: string;
  createdAt: string;
  // Facebook OAuth fields
  fbUserId?: string;
  fbAccessToken?: string;
  loginMethod?: "email" | "facebook";
};

export type FacebookLoginPayload = {
  fbUserId: string;
  fbAccessToken: string;
  name: string;
  email?: string;
  avatarUrl?: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};
