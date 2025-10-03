import { useState, useEffect } from 'react';
import { conversationService } from '../../services/conversationService';
import { Conversation } from '../../types/chatTypes';

interface TopBarProps {
  selectedChat: string | null;
}

const TopBar = ({ selectedChat }: TopBarProps) => {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (selectedChat) {
      const fetchConversationDetails = async () => {
        try {
          setLoading(true);
          const response = await conversationService.getConversations();
          const foundConversation = response.data.find(conv => conv._id === selectedChat);
          setConversation(foundConversation || null);
        } catch (error) {
          console.error('Error fetching conversation details:', error);
          setConversation(null);
        } finally {
          setLoading(false);
        }
      };

      fetchConversationDetails();
    } else {
      setConversation(null);
    }
  }, [selectedChat]);

  const getDisplayName = (conversation: Conversation) => {
    if (conversation.type === 'direct' && conversation.otherUser) {
      return conversation.otherUser.name;
    } else if (conversation.type === 'group' && conversation.name) {
      return conversation.name;
    }
    return 'Unknown';
  };

  const getStatusText = (conversation: Conversation) => {
    if (conversation.type === 'direct') {
      return 'Online'; // You might want to implement real online status
    } else if (conversation.type === 'group') {
      return `${conversation.members.length} members`;
    }
    return '';
  };

  if (!selectedChat || !conversation) {
    return (
      <div className="topbar">
        <div className="topbar-content">
          <h2>ChatApp</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="topbar">
      <div className="topbar-content">
        <div className="chat-info">
          <button 
            className="mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            title="Menu"
          >
            <span>☰</span>
          </button>
          <img 
            src="https://via.placeholder.com/40" 
            alt={getDisplayName(conversation)} 
            className="chat-avatar" 
          />
          <div className="chat-details">
            <h3>{getDisplayName(conversation)}</h3>
            <p className="status">{getStatusText(conversation)}</p>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="action-btn" title="Video Call">
            <span>📹</span>
          </button>
          <button className="action-btn" title="Voice Call">
            <span>📞</span>
          </button>
          <button className="action-btn" title="More Options">
            <span>⋯</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
