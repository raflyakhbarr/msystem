export type UserData = {
  [key: string]: unknown;
};

export type AuthContextType = {
  token: string | null;
  user: UserData | null;
  isAuthenticated: boolean;
  login: (username: string, password: string, token: string, user: UserData, tokenExpiry?: string | null) => void;
  logout: () => void;
};
