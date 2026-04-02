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

// ⚠️ DEV MODE: Check apakah authentication harus dibypass
const BYPASS_AUTH = import.meta.env.VITE_BYPASS_AUTH === 'true' || import.meta.env.NODE_ENV === 'development';

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
    // 🔓 BYPASS MODE: Return mock state untuk development
    if (BYPASS_AUTH && !this.state.token) {
      return {
        token: 'dev_bypass_token',
        user: {
          id: 0,
          username: 'dev_user',
          email: 'dev@example.com',
          role: 'admin',
        },
        username: 'dev_user',
        password: null,
        tokenExpiry: null,
      };
    }
    return { ...this.state };
  }

  getToken(): string | null {
    if (BYPASS_AUTH) {
      return 'dev_bypass_token';
    }
    return this.state.token;
  }

  getUser(): UserData | null {
    if (BYPASS_AUTH) {
      return {
        id: 0,
        username: 'dev_user',
        email: 'dev@example.com',
        role: 'admin',
      };
    }
    return this.state.user;
  }

  isAuthenticated(): boolean {
    // 🔓 BYPASS MODE: Selalu return true di development
    if (BYPASS_AUTH) {
      console.log('🔓 [AuthManager] AUTH BYPASS MODE - Always authenticated');
      return true;
    }
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
    console.log('🔑 [AuthManager] Token SET:', token);
    console.log('🔑 [AuthManager] Token Expiry:', tokenExpiry);
    console.log('🔑 [AuthManager] User:', username);
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
