interface UserData {
  [key: string]: unknown;
}

interface AuthState {
  token: string | null;
  user: UserData | null;
  username: string | null;
  password: string | null;
  tokenExpiry: string | null;
}

class AuthManager {
  private state: AuthState = {
    token: null,
    user: null,
    username: null,
    password: null,
    tokenExpiry: null,
  };

  private listeners: Set<(state: AuthState) => void> = new Set();

  getState(): AuthState {
    return { ...this.state };
  }

  getToken(): string | null {
    return this.state.token;
  }

  getUser(): UserData | null {
    return this.state.user;
  }

  isAuthenticated(): boolean {
    return !!this.state.token;
  }

  getCredentials(): { username: string | null; password: string | null } {
    return {
      username: this.state.username,
      password: this.state.password,
    };
  }

  getTokenExpiry(): string | null {
    return this.state.tokenExpiry;
  }

  setAuth(token: string, user: UserData, username: string, password: string, tokenExpiry: string | null = null) {
    this.state = {
      token,
      user,
      username,
      password,
      tokenExpiry,
    };
    this.notifyListeners();
  }

  updateToken(token: string, tokenExpiry: string | null = null) {
    this.state.token = token;
    if (tokenExpiry) {
      this.state.tokenExpiry = tokenExpiry;
    }
    this.notifyListeners();
  }

  clearAuth() {
    this.state = {
      token: null,
      user: null,
      username: null,
      password: null,
      tokenExpiry: null,
    };
    this.notifyListeners();
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  clearLegacyStorage() {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('hashedPassword');
    localStorage.removeItem('tokenExpiry');
    localStorage.removeItem('lastRenewal');
  }
}

// Export singleton instance
export const authManager = new AuthManager();
