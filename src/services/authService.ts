import { SignupDto, SigninDto, AuthResponse } from '../types/auth';
import { UsersResponse } from '../types/chatTypes';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export const authService = {
  async signup(data: SignupDto): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Signup failed');
      }

      return result;
    } catch (error) {
      throw error;
    }
  },

  async signin(data: SigninDto): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Signin failed');
      }

      return result;
    } catch (error) {
      throw error;
    }
  },

  // Helper function to store token in localStorage
  storeToken(token: string): void {
    localStorage.setItem('access_token', token);
  },

  // Helper function to get token from localStorage
  getToken(): string | null {
    return localStorage.getItem('access_token');
  },

  // Helper function to remove token from localStorage
  removeToken(): void {
    localStorage.removeItem('access_token');
  },


  // Get all users
  async getUsers(): Promise<UsersResponse> {
    try {
      const token = this.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/user`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch users');
      }

      return result;
    } catch (error) {
      throw error;
    }
  },

};
