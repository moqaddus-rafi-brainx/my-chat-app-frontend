import { useState, useEffect } from 'react';
import { conversationService } from '../../services/conversationService';
import { Conversation } from '../../types/chatTypes';
import { useUser } from '../../contexts/UserContext';
import DeleteGroupModal from './DeleteGroupModal';
import SearchModal from './SearchModal';

interface TopBarProps {
  selectedChat: string | null;
  onConversationDeleted?: (conversationId: string) => void;
  onConversationLeft?: (conversationId: string) => void;
  selectedMessage?: string | null;
  selectedMessages?: string[];
  isMultiSelectMode?: boolean;
  onEditMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onDeleteMessages?: (messageIds: string[]) => void;
  onToggleMultiSelect?: () => void;
  onClearSelection?: () => void;
  onPinMessage?: (messageId: string) => void;
  onUnpinMessage?: (messageId: string) => void;
  onOpenPinned?: () => void;
  canEditSelected?: boolean;
  canDeleteSelected?: boolean;
  canBulkDelete?: boolean;
  isSelectedPinned?: boolean;
  onSearchMessage?: (conversationId: string, messageId: string) => void;
}

const TopBar = ({ 
  selectedChat, 
  onConversationDeleted, 
  onConversationLeft,
  selectedMessage, 
  selectedMessages = [],
  isMultiSelectMode = false,
  onEditMessage, 
  onDeleteMessage, 
  onDeleteMessages,
  onToggleMultiSelect,
  onClearSelection,
  onPinMessage,
  onOpenPinned,
  onUnpinMessage,
  canEditSelected = false,
  canDeleteSelected = false,
  canBulkDelete = false,
  isSelectedPinned = false,
  onSearchMessage
}: TopBarProps) => {
  const { user } = useUser();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [showGroupOptions, setShowGroupOptions] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [showRemoveMember, setShowRemoveMember] = useState(false);
  const [members, setMembers] = useState<{ _id: string; name: string; email: string }[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);

  useEffect(() => {
    if (selectedChat) {
      const fetchConversationDetails = async () => {
        try {
          const response = await conversationService.getConversations();
          const foundConversation = response.data.find(conv => conv._id === selectedChat);
          setConversation(foundConversation || null);
          if (foundConversation) {
            setMembers((foundConversation.members || []) as any);
          } else {
            setMembers([]);
          }
        } catch (error) {
          console.error('Error fetching conversation details:', error);
          setConversation(null);
          setMembers([]);
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

  const getTypingIndicatorText = () => {
    if (typingUsers.size === 0) return null;
    
    const typingArray = Array.from(typingUsers);
    
    if (typingArray.length === 1) {
      return `${typingArray[0]} is typing...`;
    } else if (typingArray.length === 2) {
      return `${typingArray[0]} and ${typingArray[1]} are typing...`;
    } else {
      return `${typingArray[0]} and ${typingArray.length - 1} others are typing...`;
    }
  };

  const isGroupAdmin = (conversation: Conversation) => {
    return conversation.type === 'group' && 
           conversation.adminId && 
           user && 
           conversation.adminId === user._id;
  };

  const handleGroupOptions = () => {
    setShowGroupOptions(!showGroupOptions);
  };

  const handleDeleteGroup = () => {
    setShowDeleteModal(true);
    setShowGroupOptions(false);
  };

  const handleConfirmDelete = async () => {
    if (!conversation || !selectedChat) return;
    
    setIsDeleting(true);
    try {
      console.log('Deleting group:', selectedChat);
      await conversationService.deleteConversation(selectedChat);
      console.log('Group deleted successfully');
      
      // Notify parent component to remove conversation from sidebar
      if (onConversationDeleted) {
        onConversationDeleted(selectedChat);
      }
      
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting group:', error);
      // TODO: Show error message to user
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  const handleRemoveParticipant = () => {
    setShowRemoveMember(true);
    setShowGroupOptions(false);
  };

  const handleLeaveGroup = async () => {
    if (!conversation || !selectedChat) return;

    try {
      console.log('Leaving group:', selectedChat);
      await conversationService.leaveGroup(selectedChat);
      console.log('Successfully left group');
      
      // Mark conversation as left instead of removing it
      if (onConversationLeft) {
        onConversationLeft(selectedChat);
      }
      
      setShowGroupOptions(false);
    } catch (error) {
      console.error('Error leaving group:', error);
      // TODO: Show error message to user
    }
  };

  // Message action handlers
  const handleEditMessage = () => {
    if (selectedMessage && onEditMessage) {
      onEditMessage(selectedMessage);
    }
  };

  const handleDeleteMessage = () => {
    if (selectedMessage && onDeleteMessage) {
      onDeleteMessage(selectedMessage);
    }
  };

  // Use the handler in the delete button
  const handleDeleteClick = () => {
    if (isMultiSelectMode && selectedMessages.length > 0) {
      handleDeleteMessages();
    } else if (selectedMessage) {
      handleDeleteMessage();
    }
  };

  const handleDeleteMessages = () => {
    if (isMultiSelectMode && selectedMessages.length > 0 && onDeleteMessages) {
      onDeleteMessages(selectedMessages);
    } else if (selectedMessage && onDeleteMessage) {
      onDeleteMessage(selectedMessage);
    }
  };

  const handleToggleMultiSelect = () => {
    if (onToggleMultiSelect) {
      onToggleMultiSelect();
    }
  };

  const handleClearSelection = () => {
    if (onClearSelection) {
      onClearSelection();
    }
  };


  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showGroupOptions && !(event.target as Element).closest('.group-options')) {
        setShowGroupOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showGroupOptions]);

  // Listen for conversation deletion, user left events, and typing events
  useEffect(() => {
    if (selectedChat) {
      // Import socketService dynamically to avoid circular imports
      import('../../services/socketService').then(({ socketService }) => {
        console.log('🔧 Setting up TopBar conversation event handlers...');
        
        // Handle conversation deletion and user left events
        socketService.onNewConversation((conversationData: any) => {
          if (conversationData && conversationData.type === 'deleted') {
            console.log('🗑️ TopBar: Conversation deletion received:', conversationData);
            const { conversationId } = conversationData;
            
            // If the current conversation was deleted, notify parent
            if (selectedChat === conversationId && onConversationDeleted) {
              console.log('🗑️ TopBar: Current conversation was deleted, notifying parent');
              onConversationDeleted(conversationId);
            }
          } else if (conversationData && conversationData.type === 'user_left') {
            console.log('👋 TopBar: User left group received:', conversationData);
            const { conversationId, isCurrentUser } = conversationData;
            
            // If current user left, mark conversation as left instead of removing
            if (selectedChat === conversationId && isCurrentUser && onConversationLeft) {
              console.log('👋 TopBar: Current user left group, marking as left');
              onConversationLeft(conversationId);
            }
          } else if (conversationData && conversationData.type === 'typing') {
            console.log('⌨️ TopBar: User typing received:', conversationData);
            const { userId, userName, conversationId } = conversationData;
            
            console.log('⌨️ TopBar: Typing event details:', { userId, userName, conversationId, selectedChat });
            
            // Only handle typing events for the current conversation
            if (selectedChat === conversationId && userId) {
              // Use userName if available, otherwise fallback to userId or "Someone"
              const displayName = userName || userId || 'Someone';
              console.log('⌨️ TopBar: Adding user to typing list:', displayName);
              setTypingUsers(prev => new Set([...prev, displayName]));
            } else {
              console.log('⌨️ TopBar: Typing event ignored - conditions not met:', {
                selectedChat,
                conversationId,
                userId,
                userName
              });
            }
          } else if (conversationData && conversationData.type === 'stop_typing') {
            console.log('⌨️ TopBar: User stopped typing received:', conversationData);
            const { userId, userName, conversationId } = conversationData;
            
            console.log('⌨️ TopBar: Stop typing event details:', { userId, userName, conversationId, selectedChat });
            
            // Only handle stop typing events for the current conversation
            if (selectedChat === conversationId && userId) {
              // Use userName if available, otherwise fallback to userId or "Someone"
              const displayName = userName || userId || 'Someone';
              console.log('⌨️ TopBar: Removing user from typing list:', displayName);
              setTypingUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(displayName);
                return newSet;
              });
            } else {
              console.log('⌨️ TopBar: Stop typing event ignored - conditions not met:', {
                selectedChat,
                conversationId,
                userId,
                userName
              });
            }
          } else if (conversationData && conversationData.type === 'member_removed') {
            const { conversationId } = conversationData;
            if (selectedChat === conversationId) {
              // The current user was removed; mark as left in parent via onConversationLeft
              if (onConversationLeft) {
                onConversationLeft(conversationId);
              }
            }
          }
        });
        
        console.log('🔧 TopBar conversation event handlers set up');
      });
    }
    
    // Clear typing users when conversation changes
    return () => {
      setTypingUsers(new Set());
    };
  }, [selectedChat, onConversationDeleted, onConversationLeft]);


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
          <img 
            src="https://via.placeholder.com/40" 
            alt={getDisplayName(conversation)} 
            className="chat-avatar" 
          />
          <div className="chat-details">
            <h3>{getDisplayName(conversation)}</h3>
            {getTypingIndicatorText() && (
              <p className="typing-indicator">{getTypingIndicatorText()}</p>
            )}
          </div>
        </div>
        

        {/* Message options when messages are selected */}
        {(selectedMessage || (isMultiSelectMode && selectedMessages.length > 0)) && (
          <div className="message-actions">
            {!isMultiSelectMode && selectedMessage && canEditSelected && (
              <button 
                className="message-action-btn edit"
                onClick={handleEditMessage}
                title="Edit Message"
              >
                ✏️ Edit
              </button>
            )}
            {!isMultiSelectMode && selectedMessage && !isSelectedPinned && (
              <button 
                className="message-action-btn pin active"
                onClick={() => onPinMessage && selectedMessage && onPinMessage(selectedMessage)}
                title="Pin Message"
              >
                📌 Pin
              </button>
            )}
            {!isMultiSelectMode && selectedMessage && isSelectedPinned && (
              <button 
                className="message-action-btn pin active"
                onClick={() => onUnpinMessage && selectedMessage && onUnpinMessage(selectedMessage)}
                title="Unpin Message"
              >
                📌 Unpin
              </button>
            )}
            {((!isMultiSelectMode && selectedMessage && canDeleteSelected) || (isMultiSelectMode && selectedMessages.length > 0 && canBulkDelete)) && (
            <button 
              className="message-action-btn delete"
              onClick={handleDeleteClick}
              title={isMultiSelectMode 
                ? `Delete ${selectedMessages.length} Messages`
                : 'Delete Message'}
            >
              🗑️ {isMultiSelectMode ? `Delete (${selectedMessages.length})` : 'Delete'}
            </button>)}
            {isMultiSelectMode && (
              <button 
                className="message-action-btn clear"
                onClick={handleClearSelection}
                title="Clear Selection"
              >
                ✕ Clear
              </button>
            )}
          </div>
        )}

        {/* Multi-select toggle button */}
        {!selectedMessage && !isMultiSelectMode && (
          <button 
            className="multi-select-toggle"
            onClick={handleToggleMultiSelect}
            title="Select Multiple Messages"
          >
            ☑️ Select
          </button>
        )}


        {/* Conversation-specific search icon */}
        {!selectedMessage && (
          <button 
            className="group-options-btn"
            onClick={() => setShowSearchModal(true)}
            title="Search in this conversation"
          >
            🔍
          </button>
        )}

        {/* Pinned messages icon - visible for all conversation types */}
        {!selectedMessage && (
          <button 
            className="group-options-btn"
            onClick={() => onOpenPinned && onOpenPinned()}
            title="View Pinned Messages"
          >
            📌
          </button>
        )}

        {/* Group options for group conversations */}
        {conversation.type === 'group' && !selectedMessage && (
          <div className="group-options">
            <button 
              className="group-options-btn"
              onClick={handleGroupOptions}
              title="Group Options"
            >
              ⋮
            </button>
            
            {showGroupOptions && (
              <div className="group-options-dropdown">
                {isGroupAdmin(conversation) ? (
                  // Admin options
                  <>
                    <button 
                      className="group-option-btn delete"
                      onClick={handleDeleteGroup}
                    >
                      🗑️ Delete Group
                    </button>
                    <button 
                      className="group-option-btn remove"
                      onClick={handleRemoveParticipant}
                    >
                      👥 Remove Participant
                    </button>
                    <button 
                      className="group-option-btn leave"
                      onClick={handleLeaveGroup}
                    >
                      🚪 Leave Group
                    </button>
                  </>
                ) : (
                  // Member options
                  <button 
                    className="group-option-btn leave"
                    onClick={handleLeaveGroup}
                  >
                    🚪 Leave Group
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Delete Group Modal */}
      <DeleteGroupModal
        isOpen={showDeleteModal}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        groupName={conversation?.name || 'Unknown Group'}
        isDeleting={isDeleting}
      />

      {/* Remove Member Modal */}
      {showRemoveMember && conversation && conversation.type === 'group' && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Remove Member</h3>
              <button className="modal-close" onClick={() => setShowRemoveMember(false)}>✕</button>
            </div>
            <div className="modal-content">
              {members.length === 0 ? (
                <p>No members found.</p>
              ) : (
                <ul className="pinned-message-list">
                  {members
                    .filter(m => m._id !== user?._id)
                    .map(m => (
                    <li key={m._id} className="pinned-message-item">
                      <div className="pinned-message-meta">
                        <span className="pinned-sender">{m.name}</span>
                        <span className="pinned-time">{m.email}</span>
                      </div>
                      <button 
                        className="message-action-btn delete"
                        disabled={removing === m._id}
                        onClick={async () => {
                          if (!selectedChat) return;
                          setRemoving(m._id);
                          try {
                            await conversationService.removeMember(selectedChat, m._id);
                            setMembers(prev => prev.filter(x => x._id !== m._id));
                          } catch (e) {
                            console.error('Failed to remove member', e);
                          } finally {
                            setRemoving(null);
                          }
                        }}
                      >
                        {removing === m._id ? 'Removing...' : 'Remove'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onMessageClick={(conversationId, messageId) => {
          if (onSearchMessage) {
            onSearchMessage(conversationId, messageId);
          }
        }}
        conversationId={selectedChat || undefined}
        title="Search in this conversation"
      />
    </div>
  );
};

export default TopBar;
 
// Render remove member modal at the end of the component
// (Injected before export above)
