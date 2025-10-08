import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import Sidebar from './chat/Sidebar';
import ChatBox from './chat/ChatBox';
import TopBar from './chat/TopBar';

const ChatScreen = () => {
  const { user, isAuthenticated, isLoading } = useUser();
  const navigate = useNavigate();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  console.log('ChatScreen - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading, 'user:', user);

  useEffect(() => {
    console.log('ChatScreen useEffect - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading, 'user:', user);
    // Wait for auth initialization to complete
    if (!isLoading) {
      if (!isAuthenticated || !user) {
        console.log('Redirecting to signin...');
        // Redirect to signin if not authenticated
        navigate('/signin');
        return;
      }
    }
  }, [isAuthenticated, user, isLoading, navigate]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Redirecting...</div>;
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="chat-screen">
      <Sidebar 
        currentUser={{
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: 'https://via.placeholder.com/40' // You can add avatar to your user model
        }}
        selectedChat={selectedChat}
        onChatSelect={setSelectedChat}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={toggleMobileMenu}
        onCloseMobileMenu={closeMobileMenu}
      />
      <div className="chat-main">
        {/* Mobile menu toggle button */}
        <button 
          className="mobile-menu-toggle"
          onClick={toggleMobileMenu}
          title="Toggle Menu"
        >
          <span>☰</span>
        </button>
        <TopBar selectedChat={selectedChat} />
        <ChatBox selectedChat={selectedChat} />
      </div>
    </div>
  );
};

export default ChatScreen;
