import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/authService';
import { User } from '../types/auth';

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated on app load
    const initializeAuth = () => {
      try {
        const token = authService.getToken();
        if (token) {
          // You could decode the JWT token to get user info, or make an API call
          // For now, we'll try to get user info from localStorage
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            const userData = JSON.parse(storedUser);
            setUser(userData);
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear invalid data
        authService.removeToken();
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const logout = () => {
    authService.removeToken();
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    
    // Disconnect WebSocket to prevent using old user's context
    import('../services/socketService').then(({ socketService }) => {
      socketService.disconnect();
      console.log('🔌 WebSocket disconnected on logout');
    });
    
    // Navigation will be handled by the component that calls logout
  };

  // Update isAuthenticated when user changes
  useEffect(() => {
    console.log('User changed:', user);
    console.log('Setting isAuthenticated to:', !!user);
    setIsAuthenticated(!!user);
  }, [user]);

  const value = {
    user,
    setUser,
    isAuthenticated,
    isLoading,
    logout,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
