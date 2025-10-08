import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './contexts/UserContext';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import ChatScreen from './components/ChatScreen';
import NotificationToast from './components/NotificationToast';
import './App.css';

function AppContent() {
  const { isAuthenticated, isLoading } = useUser();

  console.log('AppContent - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);

  if (isLoading) {
    return (
      <div className="app">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          fontSize: '1.2rem',
          color: '#666'
        }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Navigate to={isAuthenticated ? "/chat" : "/signin"} replace />} />
        <Route path="/signin" element={isAuthenticated ? <Navigate to="/chat" replace /> : <SignIn />} />
        <Route path="/signup" element={isAuthenticated ? <Navigate to="/chat" replace /> : <SignUp />} />
        <Route path="/chat" element={isAuthenticated ? <ChatScreen /> : <Navigate to="/signin" replace />} />
      </Routes>
      <NotificationToast />
    </div>
  );
}

function App() {
  return (
    <UserProvider>
      <Router>
        <AppContent />
      </Router>
    </UserProvider>
  );
}

export default App;
