import { SignupDto, SigninDto, AuthResponse } from '../types/auth';
import { UsersResponse } from '../types/chatTypes';

// Ensure the API_BASE_URL is properly formatted with protocol
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  // If the URL doesn't start with http:// or https://, add https://
  if (!envUrl.startsWith('http://') && !envUrl.startsWith('https://')) {
    return `https://${envUrl}`;
  }
  return envUrl;
};

const API_BASE_URL = getApiBaseUrl();

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
      console.log('🔐 Signin attempt to:', `${API_BASE_URL}/auth/signin`);
      console.log('🔐 Request data:', data);
      
      const response = await fetch(`${API_BASE_URL}/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      console.log('🔐 Response status:', response.status);
      console.log('🔐 Response headers:', Object.fromEntries(response.headers.entries()));

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.log('🔐 Non-JSON response:', text);
        throw new Error(`Server returned ${response.status}: ${text}`);
      }

      const result = await response.json();
      console.log('🔐 Response data:', result);

      if (!response.ok) {
        throw new Error(result.message || `Signin failed with status ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('🔐 Signin error:', error);
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
