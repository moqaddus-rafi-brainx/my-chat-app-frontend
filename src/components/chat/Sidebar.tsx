import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { conversationService } from '../../services/conversationService';
import { useUser } from '../../contexts/UserContext';
import { Conversation } from '../../types/chatTypes';
import People from './People';
import CreateGroupModal from './CreateGroupModal';
import SearchModal from './SearchModal';

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
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
  onCloseMobileMenu?: () => void;
  onConversationDeleted?: (conversationId: string) => void;
  onSearchMessage?: (conversationId: string, messageId: string) => void;
}

const Sidebar = ({ currentUser, selectedChat, onChatSelect, isMobileMenuOpen: propIsMobileMenuOpen, onToggleMobileMenu: propOnToggleMobileMenu, onCloseMobileMenu: propOnCloseMobileMenu, onConversationDeleted, onSearchMessage }: SidebarProps) => {
  const { logout } = useUser();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'direct' | 'group'>('all');
  
  // Track filter changes for debugging
  useEffect(() => {
    console.log('🔄 Filter changed to:', filter);
  }, [filter]);
  const [internalMobileMenuOpen, setInternalMobileMenuOpen] = useState(false);
  
  // Use prop if provided, otherwise use internal state
  const isMobileMenuOpen = propIsMobileMenuOpen !== undefined ? propIsMobileMenuOpen : internalMobileMenuOpen;
  const [activeTab, setActiveTab] = useState<'chats' | 'people'>('chats');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [unreadConversations, setUnreadConversations] = useState<Set<string>>(new Set());
  const [processedConversations, setProcessedConversations] = useState<Set<string>>(new Set());

  const handleConversationCreated = (conversationId: string) => {
    // Switch to chats tab and select the new conversation
    setActiveTab('chats');
    // Switch to All filter to show the new conversation
    setFilter('all');
    
    // Join the room for the newly created conversation
    import('../../services/socketService').then(({ socketService }) => {
      console.log('🔄 Joining room for newly created conversation:', conversationId);
      console.log('🔄 Currently joined rooms before:', socketService.getJoinedRooms());
      socketService.joinConversationRoom(conversationId);
      console.log('🔄 Currently joined rooms after:', socketService.getJoinedRooms());
    });
    
    onChatSelect(conversationId);
    console.log('🔄 New conversation created, switched to All filter');
  };

  const refreshConversations = async () => {
    if (activeTab === 'chats') {
      try {
        const response = await conversationService.getConversations(filter);
        // Sort conversations by updatedAt in descending order (most recent first)
        const sortedConversations = response.data.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        setConversations(sortedConversations);
      } catch (err) {
        console.error('Error refreshing conversations:', err);
      }
    }
  };

  const removeConversation = (conversationId: string) => {
    console.log('🗑️ Removing conversation from sidebar:', conversationId);
    setConversations(prevConversations => {
      const updatedConversations = prevConversations.filter(conv => conv._id !== conversationId);
      console.log('🗑️ Updated conversations list:', updatedConversations.length);
      console.log('🗑️ Remaining conversations:', updatedConversations.map(c => c._id));
      return updatedConversations;
    });
    
    // Remove from unread conversations if it was there
    setUnreadConversations(prev => {
      const newSet = new Set(prev);
      newSet.delete(conversationId);
      console.log('🗑️ Updated unread conversations:', Array.from(newSet));
      return newSet;
    });
  };

  const markConversationAsLeft = (conversationId: string) => {
    console.log('👋 Marking conversation as left:', conversationId);
    setConversations(prevConversations => {
      const updatedConversations = prevConversations.map(conv => 
        conv._id === conversationId 
          ? { ...conv, hasLeft: true }
          : conv
      );
      console.log('👋 Updated conversations list with left status:', updatedConversations.length);
      return updatedConversations;
    });
  };

  const handleCreateGroup = () => {
    setShowCreateGroup(true);
    setShowDropdown(false);
  };

  const toggleMobileMenu = () => {
    if (propOnToggleMobileMenu) {
      propOnToggleMobileMenu();
    } else {
      setInternalMobileMenuOpen(!internalMobileMenuOpen);
    }
  };

  const closeMobileMenu = () => {
    if (propOnCloseMobileMenu) {
      propOnCloseMobileMenu();
    } else {
      setInternalMobileMenuOpen(false);
    }
  };

  // Handle new conversation creation (from new_conversation and first_message events)
  const handleNewConversation = useCallback((conversationData: any) => {
    console.log('🆕 Sidebar: New conversation received:', conversationData);
    
    // Handle conversation deletion
    if (conversationData && conversationData.type === 'deleted') {
      console.log('🗑️ Sidebar: Conversation deletion received:', conversationData);
      const { conversationId } = conversationData;
      
      // Remove conversation from list
      removeConversation(conversationId);
      return;
    }
    
    if (conversationData && conversationData._id) {
      const conversationId = conversationData._id;
      
      // Check if we've already processed this conversation
      if (processedConversations.has(conversationId)) {
        console.log('🆕 Conversation already processed, skipping:', conversationId);
        return;
      }
      
      // Mark as processed
      setProcessedConversations(prev => new Set([...prev, conversationId]));
      
      const newConversation: Conversation = {
        _id: conversationData._id,
        type: conversationData.type || 'direct', // Default to direct for first_message events
        name: conversationData.name,
        members: conversationData.members || [],
        createdAt: conversationData.createdAt,
        updatedAt: conversationData.updatedAt || conversationData.createdAt,
        __v: conversationData.__v || 0
      };
      
      // For direct conversations, add otherUser info
      if (newConversation.type === 'direct' && newConversation.members.length === 2) {
        const currentUserId = currentUser.id;
        const otherUser = newConversation.members.find(member => member._id !== currentUserId);
        if (otherUser) {
          newConversation.otherUser = {
            id: otherUser._id,
            name: otherUser.name,
            email: otherUser.email
          };
        }
      }
      
      // Add to conversations list if current filter allows it
      const shouldAdd = (filter === 'all') || 
                       (filter === 'direct' && newConversation.type === 'direct') ||
                       (filter === 'group' && newConversation.type === 'group');
      
      if (shouldAdd) {
        setConversations(prevConversations => {
          // Check if conversation already exists in the list
          const exists = prevConversations.some(conv => conv._id === newConversation._id);
          if (exists) {
            console.log('🆕 Conversation already exists in list, skipping');
            return prevConversations;
          }
          
          // Add new conversation to the top
          const updatedConversations = [newConversation, ...prevConversations];
          console.log('🆕 Added new conversation to list:', newConversation.type === 'direct' ? newConversation.otherUser?.name : newConversation.name);
          
          // Join the room for the new conversation
          import('../../services/socketService').then(({ socketService }) => {
            console.log('🆕 Joining room for new conversation:', newConversation._id);
            console.log('🆕 Currently joined rooms before:', socketService.getJoinedRooms());
            socketService.joinConversationRoom(newConversation._id);
            console.log('🆕 Currently joined rooms after:', socketService.getJoinedRooms());
          });
          
          // Mark as unread (green highlight) for first_message events only if not sent by current user
          const currentUserId = currentUser.id;
          // Check if the message was sent by the current user
          const isSentByCurrentUser = conversationData.message?.senderId?._id === currentUserId || 
                                    conversationData.message?.senderId === currentUserId;
          
          if (!isSentByCurrentUser) {
            setUnreadConversations(prev => new Set([...prev, conversationId]));
            console.log('🆕 Marked conversation as unread:', conversationId);
          } else {
            console.log('🆕 Message sent by current user, not marking as unread');
          }
          
          return updatedConversations;
        });
      } else {
        console.log('🆕 Conversation type does not match current filter, not adding to list');
      }
      
      // Clean up processed conversations after 10 seconds to prevent memory leaks
      setTimeout(() => {
        setProcessedConversations(prev => {
          const newSet = new Set(prev);
          newSet.delete(conversationId);
          return newSet;
        });
      }, 10000);
    }
  }, [filter, processedConversations, currentUser.id]);

  // Handle real-time conversation updates when new messages arrive
  const handleNewMessage = useCallback((messageData: any) => {
    console.log('📨 Sidebar: New message received for conversation update:', messageData);
    
    if (messageData.success && messageData.data) {
      const message = messageData.data;
      const conversationId = message.conversationId;
      const senderId = message.senderId._id;
      const currentUserId = currentUser.id;
      
      // Only update for messages not sent by current user
      if (senderId !== currentUserId) {
        console.log('📨 Message from another user, updating conversation list');
        
        // Check if the conversation type matches the current filter
        const shouldHighlight = (conversationType: string) => {
          if (filter === 'all') return true;
          if (filter === 'direct') return conversationType === 'direct';
          if (filter === 'group') return conversationType === 'group';
          return true;
        };
        
        setConversations(prevConversations => {
          const existingConversation = prevConversations.find(conv => conv._id === conversationId);
          
          if (existingConversation) {
            // Check if conversation type matches current filter
            if (!shouldHighlight(existingConversation.type)) {
              console.log('📨 Conversation type does not match current filter, skipping highlight');
              return prevConversations;
            }
            
            // Update existing conversation's updatedAt and move to top
            const updatedConversation = {
              ...existingConversation,
              updatedAt: message.updatedAt || message.createdAt
            };
            
            const otherConversations = prevConversations.filter(conv => conv._id !== conversationId);
            const sortedConversations = [updatedConversation, ...otherConversations].sort((a, b) => 
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
            
            console.log('📨 Updated existing conversation and moved to top');
            
            // Mark conversation as unread (green highlight) since it matches filter
            setUnreadConversations(prev => new Set([...prev, conversationId]));
            console.log('📨 Marked conversation as unread:', conversationId);
            
            return sortedConversations;
          } else {
            // Create new conversation for receiver
            const newConversation: Conversation = {
              _id: conversationId,
              type: 'direct',
              members: [
                {
                  _id: currentUserId,
                  name: currentUser.name,
                  email: currentUser.email
                },
                {
                  _id: senderId,
                  name: message.senderId.name,
                  email: message.senderId.email
                }
              ],
              createdAt: message.createdAt,
              updatedAt: message.updatedAt || message.createdAt,
              __v: 0,
              otherUser: {
                id: senderId,
                name: message.senderId.name,
                email: message.senderId.email
              }
            };
            
            const sortedConversations = [newConversation, ...prevConversations].sort((a, b) => 
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
            
            console.log('📨 Created new conversation for receiver');
            
            // Mark new conversation as unread only if direct conversations are allowed in current filter
            if (shouldHighlight('direct')) {
              setUnreadConversations(prev => new Set([...prev, conversationId]));
              console.log('📨 Marked new direct conversation as unread:', conversationId);
            } else {
              console.log('📨 New direct conversation not allowed in current filter, not marking as unread');
            }
            
            return sortedConversations;
          }
        });
      }
    }
  }, [currentUser.id, filter]);

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
          // Sort conversations by updatedAt in descending order (most recent first)
          const sortedConversations = response.data.sort((a, b) => 
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
          console.log('📋 Conversations sorted by updatedAt:', sortedConversations.map(c => ({
            name: c.type === 'direct' ? c.otherUser?.name : c.name,
            updatedAt: c.updatedAt,
            type: c.type
          })));
          setConversations(sortedConversations);
          
          // Connect to all conversation rooms for real-time notifications
          const conversationIds = sortedConversations.map(conv => conv._id);
          if (conversationIds.length > 0) {
            import('../../services/socketService').then(({ socketService }) => {
              console.log('🔌 Sidebar: Connecting to conversations:', conversationIds);
              console.log('🔌 Sidebar: Currently joined rooms:', socketService.getJoinedRooms());
              socketService.connectToAllConversations(conversationIds);
            });
          }
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

  // Listen for new messages to update conversations
  useEffect(() => {
    if (activeTab === 'chats') {
      // Import socketService dynamically to avoid circular imports
      import('../../services/socketService').then(({ socketService }) => {
        console.log('🔧 Setting up Sidebar message handler...');
        socketService.onNewMessage(handleNewMessage);
        console.log('🔧 Sidebar message handler set up');
        console.log('🔧 Total callbacks after Sidebar registration:', socketService.getCallbackCount());
        
        // Set up new conversation listener
        console.log('🔧 Setting up new conversation handler...');
        socketService.onNewConversation(handleNewConversation);
        console.log('🔧 New conversation handler set up');
      });
    }

    // Clean up callback when effect changes or component unmounts
    return () => {
      import('../../services/socketService').then(({ socketService }) => {
        socketService.removeMessageCallback(handleNewMessage);
        socketService.removeConversationCallback(handleNewConversation);
      });
    };
  }, [activeTab, handleNewMessage, handleNewConversation]); // Added dependencies for proper cleanup

  // Handle conversation selection - mark as read and switch to All filter
  const handleChatSelect = (chatId: string) => {
    // Remove from unread conversations
    setUnreadConversations(prev => {
      const newSet = new Set(prev);
      newSet.delete(chatId);
      return newSet;
    });
    
    // Switch to All filter when a conversation is selected
    if (filter !== 'all') {
      console.log('🔄 Switching to All filter to show selected conversation');
      setFilter('all');
    }
    
    // Close mobile menu on mobile devices
    closeMobileMenu();
    
    // Call the original handler
    onChatSelect(chatId);
  };

  // Listen for conversation deletion events
  useEffect(() => {
    if (onConversationDeleted) {
      // Store the callback to be called when a conversation is deleted
      const handleDeletion = (conversationId: string) => {
        console.log('🗑️ Sidebar: Conversation deleted, removing from list:', conversationId);
        removeConversation(conversationId);
      };
      
      // Store the callback in a way that can be called from parent
      // We'll use a custom event or direct function call
      (window as any).handleSidebarConversationDeletion = handleDeletion;
    }
    
    // Store the callback for conversation left
    (window as any).handleSidebarConversationLeft = markConversationAsLeft;
    
    return () => {
      // Clean up
      delete (window as any).handleSidebarConversationDeletion;
      delete (window as any).handleSidebarConversationLeft;
    };
  }, [onConversationDeleted]);

  // Refresh conversations when selected chat changes (to update order after new messages)
  useEffect(() => {
    if (selectedChat && activeTab === 'chats') {
      // Add a small delay to allow the backend to update the conversation's updatedAt
      const timeoutId = setTimeout(() => {
        refreshConversations();
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [selectedChat, activeTab]);

  const getConversationDisplayName = (conversation: Conversation) => {
    if (conversation.type === 'direct' && conversation.otherUser) {
      return conversation.otherUser.name;
    } else if (conversation.type === 'group' && conversation.name) {
      return conversation.name;
    }
    return 'Unknown';
  };

  const getConversationAvatar = () => {
    // For now, using placeholder. In a real app, you might have avatar URLs
    return 'https://via.placeholder.com/40';
  };

  const getConversationPreview = () => {
    // For now, return empty string to remove hardcoded preview text
    // In a real app, you might want to show the last message content
    return '';
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString();
    }
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
          {/* Mobile menu toggle button */}
          <button 
            className="mobile-toggle-btn"
            onClick={toggleMobileMenu}
            title="Toggle Menu"
          >
            <span>{isMobileMenuOpen ? '✕' : '☰'}</span>
          </button>
          
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
                  onClick={() => setShowGlobalSearch(true)}
                >
                  <span>🔍</span> Search Messages
                </button>
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
              title="Show all conversations"
            >
              All
            </button>
            <button 
              className={`filter-btn ${filter === 'direct' ? 'active' : ''}`}
              onClick={() => setFilter('direct')}
              title="Show only direct conversations"
            >
              Direct
            </button>
            <button 
              className={`filter-btn ${filter === 'group' ? 'active' : ''}`}
              onClick={() => setFilter('group')}
              title="Show only group conversations"
            >
              Group
            </button>
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
              className={`chat-item ${selectedChat === conversation._id ? 'active' : ''} ${unreadConversations.has(conversation._id) ? 'unread' : ''} ${conversation.hasLeft ? 'left' : ''}`}
              onClick={() => handleChatSelect(conversation._id)}
            >
              <img 
                src={getConversationAvatar()} 
                alt={getConversationDisplayName(conversation)} 
                className="chat-avatar" 
              />
              <div className="chat-info">
                <div className="chat-header">
                  <h4>{getConversationDisplayName(conversation)}</h4>
                  <span className="timestamp">
                    {getRelativeTime(conversation.updatedAt)}
                  </span>
                </div>
                {getConversationPreview() && (
                  <div className="chat-preview">
                    <p>{getConversationPreview()}</p>
                  </div>
                )}
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

      {/* Global Search Modal */}
      <SearchModal
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
        onMessageClick={(conversationId, messageId) => {
          if (onSearchMessage) {
            onSearchMessage(conversationId, messageId);
          }
        }}
        title="Search All Messages"
      />
    </div>
  );
};

export default Sidebar;
