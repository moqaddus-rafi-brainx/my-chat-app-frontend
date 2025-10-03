import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useUser } from '../contexts/UserContext';
import Sidebar from './chat/Sidebar';
import ChatBox from './chat/ChatBox';
import TopBar from './chat/TopBar';

const ChatScreen = () => {
  const { user, isAuthenticated, isLoading, logout } = useUser();
  const navigate = useNavigate();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);

  useEffect(() => {
    // Wait for auth initialization to complete
    if (!isLoading) {
      if (!isAuthenticated || !user) {
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
      />
      <div className="chat-main">
        <TopBar selectedChat={selectedChat} />
        <ChatBox selectedChat={selectedChat} />
      </div>
    </div>
  );
};

export default ChatScreen;
