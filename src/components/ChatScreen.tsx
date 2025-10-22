import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { conversationService } from '../services/conversationService';
import Sidebar from './chat/Sidebar';
import ChatBox from './chat/ChatBox';
import TopBar from './chat/TopBar';
import PinnedMessagesModal from './chat/PinnedMessagesModal';

interface PinnedLazyProps {
  isOpen: boolean;
  onClose: () => void;
  pinnedIds: string[];
  resolve: (id: string) => any;
}

const PinnedMessagesModalLazyWrapper = ({ isOpen, onClose, pinnedIds, resolve }: PinnedLazyProps) => {
  return (
    <PinnedMessagesModal 
      isOpen={isOpen}
      onClose={onClose}
      pinnedMessageIds={pinnedIds}
      resolveMessage={resolve}
    />
  );
};

const ChatScreen = () => {
  const { user, isAuthenticated, isLoading } = useUser();
  const navigate = useNavigate();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [leftConversations, setLeftConversations] = useState<Set<string>>(new Set());
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string } | null>(null);
  const messagesRef = useRef<{ 
    addOptimisticMessage: (content: string) => void;
    removeMessagesOptimistically: (messageIds: string[]) => void;
    getMessageContent: (messageId: string) => string | null;
    getPinnedMessageIds?: () => string[];
    setMessagePinned?: (messageId: string, pinned: boolean) => void;
    updateMessageOptimistically: (messageId: string, newContent: string) => void;
    handleMessageEdited: (messageId: string, newContent: string, editedAt: string) => void;
    deleteMessageOptimistically: (messageId: string) => void;
    handleMessageDeleted: (messageId: string) => void;
    scrollToMessage?: (messageId: string) => void;
  } | null>(null);

  const [isPinnedModalOpen, setIsPinnedModalOpen] = useState(false);
  const [pinnedByConversation, setPinnedByConversation] = useState<Record<string, string[]>>({});

  console.log('ChatScreen - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading, 'user:', user);

  // Debug selectedChat changes
  useEffect(() => {
    console.log('🔍 ChatScreen: selectedChat changed to:', selectedChat);
  }, [selectedChat]);

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

  const handleConversationDeleted = (conversationId: string) => {
    console.log('🗑️ ChatScreen: Conversation deleted:', conversationId);
    // Clear selected chat if it was the deleted conversation
    if (selectedChat === conversationId) {
      console.log('🗑️ ChatScreen: Clearing selected chat as it was deleted');
      setSelectedChat(null);
    }
    // Notify sidebar to remove conversation from its list
    if ((window as any).handleSidebarConversationDeletion) {
      (window as any).handleSidebarConversationDeletion(conversationId);
    }
  };

  const handleConversationLeft = (conversationId: string) => {
    console.log('👋 ChatScreen: User left conversation:', conversationId);
    // Track that user left this conversation
    setLeftConversations(prev => new Set([...prev, conversationId]));
    // Notify sidebar to mark conversation as left (red styling)
    if ((window as any).handleSidebarConversationLeft) {
      (window as any).handleSidebarConversationLeft(conversationId);
    }
  };

  // Clear selected messages when chat changes
  useEffect(() => {
    setSelectedMessage(null);
    setSelectedMessages([]);
    setIsMultiSelectMode(false);
  }, [selectedChat]);

  // Message action handlers
  const handleEditMessage = (messageId: string) => {
    console.log('Edit message:', messageId);
    // Get the message content from the messages list
    if (messagesRef.current) {
      const content = messagesRef.current.getMessageContent(messageId);
      if (content) {
        setEditingMessage({ id: messageId, content });
        setSelectedMessage(null); // Clear selection when editing
      } else {
        console.error('Message content not found for ID:', messageId);
      }
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      console.log('Delete message:', messageId);
      
      // Optimistically mark message as deleted
      if (messagesRef.current) {
        messagesRef.current.deleteMessageOptimistically(messageId);
      }
      
      // Make the API call
      await conversationService.deleteMessage(messageId);
      console.log('Message deleted successfully');
      
      // Clear selection after deletion
      setSelectedMessage(null);
      
    } catch (error) {
      console.error('Error deleting message:', error);
      
      // Revert the optimistic update on error
      if (messagesRef.current) {
        // We would need to revert the is_deleted flag, but for now just log the error
        console.log('Failed to delete message, optimistic update remains');
      }
      
      // TODO: Show error notification to user
    }
  };

  const handleDeleteMessages = async (messageIds: string[]) => {
    try {
      console.log('Delete messages:', messageIds);
      
      // Optimistically mark messages as deleted
      if (messagesRef.current) {
        messageIds.forEach(messageId => {
          messagesRef.current!.deleteMessageOptimistically(messageId);
        });
      }
      
      // Delete messages one by one
      for (const messageId of messageIds) {
        try {
          await conversationService.deleteMessage(messageId);
          console.log('Message deleted:', messageId);
        } catch (error) {
          console.error('Error deleting message:', messageId, error);
          // TODO: Show error notification to user
        }
      }
      
      // Clear selection after deletion
      setSelectedMessages([]);
      setSelectedMessage(null);
      setIsMultiSelectMode(false);
    } catch (error) {
      console.error('Error deleting messages:', error);
    }
  };

  // Pin a single message
  const handlePinMessage = (messageId: string) => {
    if (!selectedChat) return;
    // Optimistic update
    setPinnedByConversation(prev => {
      const list = prev[selectedChat] || [];
      if (list.includes(messageId)) return prev;
      return { ...prev, [selectedChat]: [...list, messageId] };
    });
    // Also mark the message as pinned in messages list optimistically
    if (messagesRef.current && (messagesRef.current as any).setMessagePinned) {
      (messagesRef.current as any).setMessagePinned(messageId, true);
    }
    // Clear selection after pin to remove highlight and action bar
    setSelectedMessage(null);
    setIsMultiSelectMode(false);

    // Call backend API
    conversationService.pinMessage(messageId).catch(err => {
      console.error('Failed to pin message:', err);
      // Revert optimistic update
      setPinnedByConversation(prev => {
        const list = prev[selectedChat!] || [];
        return { ...prev, [selectedChat!]: list.filter(id => id !== messageId) };
      });
      if (messagesRef.current && (messagesRef.current as any).setMessagePinned) {
        (messagesRef.current as any).setMessagePinned(messageId, false);
      }
    });
  };

  const handleUnpinMessage = (messageId: string) => {
    if (!selectedChat) return;
    // Optimistically update message and pinned list
    if (messagesRef.current && (messagesRef.current as any).setMessagePinned) {
      (messagesRef.current as any).setMessagePinned(messageId, false);
    }
    setPinnedByConversation(prev => {
      const list = prev[selectedChat] || [];
      if (!list.includes(messageId)) return prev;
      return { ...prev, [selectedChat]: list.filter(id => id !== messageId) };
    });

    // Deselect after unpin for immediate UX feedback
    if (selectedMessage === messageId) {
      setSelectedMessage(null);
      setIsMultiSelectMode(false);
    }

    conversationService.unpinMessage(messageId).catch(err => {
      console.error('Failed to unpin message:', err);
      // Revert
      if (messagesRef.current && (messagesRef.current as any).setMessagePinned) {
        (messagesRef.current as any).setMessagePinned(messageId, true);
      }
      setPinnedByConversation(prev => {
        const list = prev[selectedChat!] || [];
        if (list.includes(messageId)) return prev;
        return { ...prev, [selectedChat!]: [...list, messageId] };
      });
    });
  };

  const handleOpenPinned = () => {
    if (selectedChat && messagesRef.current && (messagesRef.current as any).getPinnedMessageIds) {
      const ids = (messagesRef.current as any).getPinnedMessageIds();
      setPinnedByConversation(prev => ({ ...prev, [selectedChat]: ids }));
    }
    setIsPinnedModalOpen(true);
  };

  const handleClosePinned = () => {
    setIsPinnedModalOpen(false);
  };

  // Handle search message click - switch to conversation and scroll to message
  const handleSearchMessage = async (conversationId: string, messageId: string) => {
    console.log('🔍 ChatScreen: Search message clicked:', { conversationId, messageId });
    console.log('🔍 ChatScreen: Current selectedChat:', selectedChat);
    
    // If already in the correct conversation, select and scroll to the message
    if (selectedChat === conversationId) {
      console.log('🔍 ChatScreen: Already in conversation, selecting and scrolling to message');
      setSelectedMessage(messageId);
      if (messagesRef.current && messagesRef.current.scrollToMessage) {
        messagesRef.current.scrollToMessage(messageId);
      }
      return;
    }

    // Switch to the conversation
    console.log('🔍 ChatScreen: Switching to conversation:', conversationId);
    setSelectedChat(conversationId);
    
    // Clear any existing selections to ensure clean state
    setSelectedMessages([]);
    setIsMultiSelectMode(false);
    
    // Set the searched message as selected after a short delay to ensure conversation switch is complete
    setTimeout(() => {
      console.log('🔍 ChatScreen: Setting selected message after conversation switch:', messageId);
      setSelectedMessage(messageId);
      
      // Start scroll attempts after setting the selection
      attemptScroll();
    }, 100);
    
    // Wait for messages to load, then scroll to the message
    // Use a more robust approach with multiple attempts
    const attemptScroll = (attempts = 0) => {
      if (attempts > 25) {
        console.log('🔍 ChatScreen: Max scroll attempts reached');
        return;
      }
      
      setTimeout(() => {
        console.log(`🔍 ChatScreen: Attempt ${attempts + 1} - Current selectedChat:`, selectedChat);
        console.log(`🔍 ChatScreen: Messages ref available:`, !!messagesRef.current);
        
        if (messagesRef.current && messagesRef.current.scrollToMessage) {
          console.log(`🔍 ChatScreen: Attempting to scroll to message (attempt ${attempts + 1})`);
          messagesRef.current.scrollToMessage(messageId);
          
          // Check if the message was found and scrolled to
          const messageElement = document.getElementById(`message-${messageId}`);
          if (!messageElement) {
            console.log('🔍 ChatScreen: Message element not found, retrying...');
            attemptScroll(attempts + 1);
          } else {
            console.log('🔍 ChatScreen: Successfully scrolled to message');
            // Additional check to ensure the message is visible
            const rect = messageElement.getBoundingClientRect();
            const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
            console.log('🔍 ChatScreen: Message visibility check:', { isVisible, rect });
            
            if (!isVisible) {
              console.log('🔍 ChatScreen: Message not fully visible, retrying scroll...');
              attemptScroll(attempts + 1);
            }
          }
        } else {
          console.log('🔍 ChatScreen: Messages ref not ready, retrying...');
          attemptScroll(attempts + 1);
        }
      }, 200 + (attempts * 100)); // Shorter delays for faster response
    };
  };

  // Multi-select handlers
  const handleToggleMultiSelect = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    if (isMultiSelectMode) {
      setSelectedMessages([]);
      setSelectedMessage(null);
    }
  };

  const handleMessageToggle = (messageId: string) => {
    setSelectedMessages(prev => {
      if (prev.includes(messageId)) {
        return prev.filter(id => id !== messageId);
      } else {
        return [...prev, messageId];
      }
    });
  };

  const handleClearSelection = () => {
    setSelectedMessages([]);
    setSelectedMessage(null);
    setIsMultiSelectMode(false);
  };

  // Edit message handlers
  const handleEditMessageStart = (messageId: string, content: string) => {
    setEditingMessage({ id: messageId, content });
    setSelectedMessage(null); // Clear selection when editing
  };

  const handleEditMessageSave = async (newContent: string) => {
    if (!editingMessage) return;
    
    // Store the original message data for error handling
    const originalMessage = { ...editingMessage };
    
    try {
      console.log('Saving edited message:', editingMessage.id, newContent);
      
      // Check socket connection status before making API call
      const { socketService } = await import('../services/socketService');
      console.log('Socket connected before edit:', socketService.isSocketConnected());
      
      // Attempt to reconnect if disconnected
      if (!socketService.isSocketConnected()) {
        console.log('Socket disconnected before edit, attempting to reconnect...');
        await socketService.reconnectIfNeeded();
      }
      
      // Update the message optimistically first
      if (messagesRef.current) {
        messagesRef.current.updateMessageOptimistically(editingMessage.id, newContent);
      }
      
      // Make the API call
      await conversationService.editMessage(editingMessage.id, newContent);
      console.log('Message edited successfully');
      
      // Check socket connection status after API call
      console.log('Socket connected after edit:', socketService.isSocketConnected());
      
      // Attempt to reconnect if disconnected after API call
      if (!socketService.isSocketConnected()) {
        console.log('Socket disconnected after edit, attempting to reconnect...');
        await socketService.reconnectIfNeeded();
      }
      
      // Clear edit state only after successful API call
      setEditingMessage(null);
      
    } catch (error) {
      console.error('Error editing message:', error);
      
      // Check socket connection status on error
      const { socketService } = await import('../services/socketService');
      console.log('Socket connected on error:', socketService.isSocketConnected());
      
      // Revert the optimistic update on error
      if (messagesRef.current) {
        messagesRef.current.updateMessageOptimistically(originalMessage.id, originalMessage.content);
      }
      
      // TODO: Show error notification to user
    }
  };

  const handleEditMessageCancel = () => {
    setEditingMessage(null);
  };

  // Seed pinned ids into modal from current messages after initial fetch
  useEffect(() => {
    if (!selectedChat) return;
    const getPinned = () => {
      if (messagesRef.current && (messagesRef.current as any).getPinnedMessageIds) {
        const ids = (messagesRef.current as any).getPinnedMessageIds();
        setPinnedByConversation(prev => ({ ...prev, [selectedChat]: ids }));
      }
    };
    const t = setTimeout(getPinned, 150);
    return () => clearTimeout(t);
  }, [selectedChat]);

  // Update pinned ids when message_pinned events arrive
  useEffect(() => {
    if (!selectedChat) return;
    let unsubscribed = false;
    import('../services/socketService').then(({ socketService }) => {
      socketService.onNewConversation((conversationData: any) => {
        if (unsubscribed) return;
        if (conversationData && conversationData.type === 'message_pinned') {
          const { messageId, conversationId, is_pinned } = conversationData;
          if (conversationId === selectedChat) {
            setPinnedByConversation(prev => {
              const list = prev[selectedChat] || [];
              if (is_pinned) {
                if (list.includes(messageId)) return prev;
                return { ...prev, [selectedChat]: [...list, messageId] };
              } else {
                if (!list.includes(messageId)) return prev;
                return { ...prev, [selectedChat]: list.filter(id => id !== messageId) };
              }
            });
          }
        } else if (conversationData && conversationData.type === 'message_unpinned') {
          const { messageId, conversationId } = conversationData;
          if (conversationId === selectedChat) {
            setPinnedByConversation(prev => {
              const list = prev[selectedChat] || [];
              if (!list.includes(messageId)) return prev;
              return { ...prev, [selectedChat]: list.filter(id => id !== messageId) };
            });
          }
        }
      });
    });
    return () => {
      unsubscribed = true;
    };
  }, [selectedChat]);

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
        onConversationDeleted={handleConversationDeleted}
        onSearchMessage={handleSearchMessage}
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
        <TopBar 
          selectedChat={selectedChat} 
          onConversationDeleted={handleConversationDeleted}
          onConversationLeft={handleConversationLeft}
          selectedMessage={selectedMessage}
          selectedMessages={selectedMessages}
          isMultiSelectMode={isMultiSelectMode}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onDeleteMessages={handleDeleteMessages}
          onToggleMultiSelect={handleToggleMultiSelect}
          onClearSelection={handleClearSelection}
          onPinMessage={handlePinMessage}
          onUnpinMessage={handleUnpinMessage}
          onOpenPinned={handleOpenPinned}
          onSearchMessage={handleSearchMessage}
          canEditSelected={(() => {
            if (!selectedMessage || !messagesRef.current) return false;
            const getById = (messagesRef.current as any).getMessageById as ((id: string)=>any) | undefined;
            const msg = getById ? getById(selectedMessage) : null;
            return Boolean(msg && msg.senderId && msg.senderId._id === user._id && !msg.is_deleted);
          })()}
          canDeleteSelected={(() => {
            if (!selectedMessage || !messagesRef.current) return false;
            const getById = (messagesRef.current as any).getMessageById as ((id: string)=>any) | undefined;
            const msg = getById ? getById(selectedMessage) : null;
            return Boolean(msg && msg.senderId && msg.senderId._id === user._id && !msg.is_deleted);
          })()}
          canBulkDelete={(() => {
            if (!selectedMessages.length || !messagesRef.current) return false;
            const getById = (messagesRef.current as any).getMessageById as ((id: string)=>any) | undefined;
            if (!getById) return false;
            return selectedMessages.every(id => {
              const msg = getById(id);
              return msg && msg.senderId && msg.senderId._id === user._id && !msg.is_deleted;
            });
          })()}
          isSelectedPinned={(() => {
            if (!selectedMessage || !messagesRef.current) return false;
            const getById = (messagesRef.current as any).getMessageById as ((id: string)=>any) | undefined;
            const msg = getById ? getById(selectedMessage) : null;
            return Boolean(msg && (msg.is_pinned || (msg as any).isPinned));
          })()}
        />
        <ChatBox 
          selectedChat={selectedChat}
          selectedMessage={selectedMessage}
          selectedMessages={selectedMessages}
          isMultiSelectMode={isMultiSelectMode}
          onMessageSelect={setSelectedMessage}
          onMessageToggle={handleMessageToggle}
          onMultiSelectModeChange={setIsMultiSelectMode}
          hasLeftConversation={selectedChat ? leftConversations.has(selectedChat) : false}
          editingMessage={editingMessage}
          onEditMessageStart={handleEditMessageStart}
          onEditMessageSave={handleEditMessageSave}
          onEditMessageCancel={handleEditMessageCancel}
          onPinMessage={handlePinMessage}
          onOpenPinned={handleOpenPinned}
          ref={messagesRef}
        />
      {isPinnedModalOpen && selectedChat && (
        <PinnedMessagesModalLazyWrapper 
          isOpen={isPinnedModalOpen}
          onClose={handleClosePinned}
          pinnedIds={(messagesRef.current && (messagesRef.current as any).getPinnedMessageIds
            ? (messagesRef.current as any).getPinnedMessageIds()
            : (pinnedByConversation[selectedChat] || []))}
          resolve={(id) => (messagesRef.current && (messagesRef.current as any).getMessageById ? (messagesRef.current as any).getMessageById(id) : null)}
        />
      )}
      </div>
    </div>
  );
};

export default ChatScreen;
