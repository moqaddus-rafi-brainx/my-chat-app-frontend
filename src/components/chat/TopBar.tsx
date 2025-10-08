import { useState, useEffect } from 'react';
import { conversationService } from '../../services/conversationService';
import { Conversation } from '../../types/chatTypes';
import { useUser } from '../../contexts/UserContext';

interface TopBarProps {
  selectedChat: string | null;
}

const TopBar = ({ selectedChat }: TopBarProps) => {
  const { user } = useUser();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [showGroupOptions, setShowGroupOptions] = useState(false);

  useEffect(() => {
    if (selectedChat) {
      const fetchConversationDetails = async () => {
        try {
          const response = await conversationService.getConversations();
          const foundConversation = response.data.find(conv => conv._id === selectedChat);
          setConversation(foundConversation || null);
        } catch (error) {
          console.error('Error fetching conversation details:', error);
          setConversation(null);
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

  const isGroupAdmin = (conversation: Conversation) => {
    return conversation.type === 'group' && 
           conversation.adminId && 
           user && 
           conversation.adminId === user._id;
  };

  const handleGroupOptions = () => {
    setShowGroupOptions(!showGroupOptions);
  };

  const handleDeleteGroup = async () => {
    if (!conversation || !selectedChat) return;
    
    try {
      console.log('Deleting group:', selectedChat);
      await conversationService.deleteConversation(selectedChat);
      console.log('Group deleted successfully');
      setShowGroupOptions(false);
      // TODO: Navigate away from deleted conversation or refresh conversation list
    } catch (error) {
      console.error('Error deleting group:', error);
      // TODO: Show error message to user
    }
  };

  const handleRemoveParticipant = () => {
    console.log('Remove participant clicked');
    // TODO: Implement remove participant functionality
    setShowGroupOptions(false);
  };

  const handleLeaveGroup = () => {
    console.log('Leave group clicked');
    // TODO: Implement leave group functionality
    setShowGroupOptions(false);
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
          </div>
        </div>
        
        {/* Group options for group conversations */}
        {conversation.type === 'group' && (
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
    </div>
  );
};

export default TopBar;
