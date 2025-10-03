import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { conversationService } from '../../services/conversationService';
import { useUser } from '../../contexts/UserContext';
import { Conversation } from '../../types/chatTypes';
import People from './People';
import CreateGroupModal from './CreateGroupModal';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

interface SidebarProps {
  currentUser: User;
  selectedChat: string | null;
  onChatSelect: (chatId: string) => void;
}

const Sidebar = ({ currentUser, selectedChat, onChatSelect }: SidebarProps) => {
  const { logout } = useUser();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'direct' | 'group'>('all');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chats' | 'people'>('chats');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const handleConversationCreated = (conversationId: string) => {
    // Switch to chats tab and select the new conversation
    setActiveTab('chats');
    onChatSelect(conversationId);
    // Refresh conversations to include the new one
    setFilter('all');
  };

  const handleCreateGroup = () => {
    setShowCreateGroup(true);
    setShowDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown && !(event.target as Element).closest('.dropdown-container')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  useEffect(() => {
    if (activeTab === 'chats') {
      const fetchConversations = async () => {
        try {
          setLoading(true);
          const response = await conversationService.getConversations(filter);
          setConversations(response.data);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load conversations');
          console.error('Error fetching conversations:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchConversations();
    }
  }, [filter, activeTab]);

  const getConversationDisplayName = (conversation: Conversation) => {
    if (conversation.type === 'direct' && conversation.otherUser) {
      return conversation.otherUser.name;
    } else if (conversation.type === 'group' && conversation.name) {
      return conversation.name;
    }
    return 'Unknown';
  };

  const getConversationAvatar = (conversation: Conversation) => {
    // For now, using placeholder. In a real app, you might have avatar URLs
    return 'https://via.placeholder.com/40';
  };

  const getConversationPreview = (conversation: Conversation) => {
    if (conversation.type === 'direct' && conversation.otherUser) {
      return `Direct message with ${conversation.otherUser.name}`;
    } else if (conversation.type === 'group') {
      return `Group: ${conversation.members.length} members`;
    }
    return 'Unknown conversation type';
  };

  return (
    <div className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="user-profile">
          <img src={currentUser.avatar} alt={currentUser.name} className="user-avatar" />
          <div className="user-info">
            <h3>{currentUser.name}</h3>
            <p>{currentUser.email}</p>
          </div>
        </div>
        <div className="header-actions">
          <div className="dropdown-container">
            <button 
              className="dropdown-btn" 
              onClick={() => setShowDropdown(!showDropdown)}
              title="Menu"
            >
              <span>⋮</span>
            </button>
            {showDropdown && (
              <div className="dropdown-menu">
                <button 
                  className="dropdown-item" 
                  onClick={handleCreateGroup}
                >
                  <span>👥</span> Create Group
                </button>
                <button 
                  className="dropdown-item logout" 
                  onClick={handleLogout}
                >
                  <span>🚪</span> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="sidebar-tabs">
        <button 
          className={`tab-btn ${activeTab === 'chats' ? 'active' : ''}`}
          onClick={() => setActiveTab('chats')}
        >
          Chats
        </button>
        <button 
          className={`tab-btn ${activeTab === 'people' ? 'active' : ''}`}
          onClick={() => setActiveTab('people')}
        >
          People
        </button>
      </div>

      {activeTab === 'chats' && (
        <>
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button 
              className={`filter-btn ${filter === 'direct' ? 'active' : ''}`}
              onClick={() => setFilter('direct')}
            >
              Direct
            </button>
            <button 
              className={`filter-btn ${filter === 'group' ? 'active' : ''}`}
              onClick={() => setFilter('group')}
            >
              Group
            </button>
          </div>

          <div className="search-bar">
            <input 
              type="text" 
              placeholder="Search conversations..." 
              className="search-input"
            />
          </div>

          <div className="chats-list">
        {loading ? (
          <div className="loading-state">
            <p>Loading conversations...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="retry-btn"
            >
              Retry
            </button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="empty-state">
            <p>No conversations yet</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <div 
              key={conversation._id}
              className={`chat-item ${selectedChat === conversation._id ? 'active' : ''}`}
              onClick={() => onChatSelect(conversation._id)}
            >
              <img 
                src={getConversationAvatar(conversation)} 
                alt={getConversationDisplayName(conversation)} 
                className="chat-avatar" 
              />
              <div className="chat-info">
                <div className="chat-header">
                  <h4>{getConversationDisplayName(conversation)}</h4>
                  <span className="timestamp">
                    {new Date(conversation.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="chat-preview">
                  <p>{getConversationPreview(conversation)}</p>
                </div>
              </div>
            </div>
          ))
        )}
          </div>
        </>
      )}

      {activeTab === 'people' && (
        <People onConversationCreated={handleConversationCreated} />
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <CreateGroupModal 
          onClose={() => setShowCreateGroup(false)}
          onGroupCreated={handleConversationCreated}
        />
      )}
    </div>
  );
};

export default Sidebar;
