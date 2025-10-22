import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { conversationService } from '../../services/conversationService';
import { socketService } from '../../services/socketService';
import { useUser } from '../../contexts/UserContext';
import { Message as MessageType } from '../../types/chatTypes';
import Message from './Message';

interface MessagesProps {
  selectedChat: string;
  selectedMessage?: string | null;
  selectedMessages?: string[];
  isMultiSelectMode?: boolean;
  onMessageSelect?: (messageId: string | null) => void;
  onMessageToggle?: (messageId: string) => void;
  onMultiSelectModeChange?: (enabled: boolean) => void;
}

export interface MessagesRef {
  addOptimisticMessage: (content: string) => void;
  removeMessagesOptimistically: (messageIds: string[]) => void;
  getMessageContent: (messageId: string) => string | null;
  // Return full message object by id (for pinned modal)
  getMessageById?: (messageId: string) => MessageType | null;
  setMessagePinned?: (messageId: string, pinned: boolean) => void;
  getPinnedMessageIds?: () => string[];
  updateMessageOptimistically: (messageId: string, newContent: string) => void;
  handleMessageEdited: (messageId: string, newContent: string, editedAt: string) => void;
  deleteMessageOptimistically: (messageId: string) => void;
  handleMessageDeleted: (messageId: string) => void;
}

const Messages = forwardRef<MessagesRef, MessagesProps>(({ 
  selectedChat, 
  selectedMessage, 
  selectedMessages = [], 
  isMultiSelectMode = false,
  onMessageSelect, 
  onMessageToggle,
  onMultiSelectModeChange: _onMultiSelectModeChange 
}, ref) => {
  const { user } = useUser();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [processedMessageIds, setProcessedMessageIds] = useState<Set<string>>(new Set());
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const connectionTimeoutRef = useRef<number | null>(null);

  // Debug selectedChat changes
  useEffect(() => {
    console.log('📥 Messages: selectedChat prop changed to:', selectedChat);
  }, [selectedChat]);

  // Debug selectedMessage changes
  useEffect(() => {
    console.log('📥 Messages: selectedMessage prop changed to:', selectedMessage);
  }, [selectedMessage]);

  // Function to add optimistic message (called from InputField)
  const addOptimisticMessage = (content: string) => {
    if (!user) return;

    const optimisticMessage: MessageType = {
      _id: `temp_${Date.now()}_${Math.random()}`, // Temporary ID
      content: content,
      senderId: {
        _id: user._id,
        name: user.name,
        email: user.email
      },
      conversationId: selectedChat,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      __v: 0
    };

    console.log('Adding optimistic message:', optimisticMessage);
    setMessages(prev => {
      const newMessages = [...prev, optimisticMessage];
      console.log('Updated messages list with optimistic message:', newMessages);
      return newMessages;
    });
  };

  // Only fetch messages when conversation changes (not on every WebSocket message)
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedChat || !user) {
        console.log('📥 Messages: Skipping fetch - selectedChat:', selectedChat, 'user:', !!user);
        return;
      }

      try {
        setLoading(true);
        setError('');
        console.log('📥 Messages: Fetching initial messages for conversation:', selectedChat);
        const response = await conversationService.getMessages(selectedChat);
        const normalized = (response.data || []).map((m: any) => ({
          ...m,
          is_pinned: typeof m.is_pinned === 'boolean' ? m.is_pinned : Boolean(m.isPinned),
        }));
        setMessages(normalized);
        // No need to seed pinned list here; ChatScreen manages modal's ids.
        console.log('📥 Messages: Initial messages loaded:', response.data.length, 'messages');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load messages');
        console.error('📥 Messages: Error fetching messages:', err);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch when conversation changes, not on every re-render
    fetchMessages();
  }, [selectedChat]); // Removed 'user' dependency to prevent unnecessary fetches

  // Handle new messages from WebSocket
  // NOTE: This should ADD the new message directly, NOT fetch all messages again
  const handleNewMessage = useCallback((response: any) => {
      console.log('🎯 handleNewMessage called with:', response);
      console.log('🎯 Current selectedChat:', selectedChat);
      console.log('🎯 Current user ID:', user?._id);
      
      // Handle both array and single object formats
      let responseItem;
      if (Array.isArray(response) && response.length > 0) {
        responseItem = response[0];
        console.log('Array response item:', responseItem);
      } else if (response && typeof response === 'object') {
        responseItem = response;
        console.log('Single object response:', responseItem);
      } else {
        console.log('Invalid response format:', response);
        return;
      }
      
      if (responseItem.success && responseItem.data) {
        const message = responseItem.data;
        console.log('Extracted message from response.data:', message);
          
          // Process the message data
          if (message && message.content && message.senderId && message.conversationId) {
            // Convert ObjectId to string if needed
            const processedMessage = {
              _id: message._id?.toString() || message._id,
              content: message.content,
              senderId: {
                _id: message.senderId._id?.toString() || message.senderId._id,
                name: message.senderId.name,
                email: message.senderId.email
              },
              conversationId: message.conversationId,
              createdAt: message.createdAt || new Date().toISOString(),
              updatedAt: message.updatedAt || new Date().toISOString(),
              __v: message.__v || 0
            };
            
            console.log('Processed message:', processedMessage);
            console.log('Current selectedChat:', selectedChat);
            console.log('Message conversationId:', processedMessage.conversationId);
            console.log('Conversation ID match:', processedMessage.conversationId === selectedChat);
            console.log('Current user ID:', user?._id);
            console.log('Message sender ID:', processedMessage.senderId._id);
            console.log('Is from current user:', processedMessage.senderId._id === user?._id);
            
            // Check if message has already been processed to prevent duplicates
            if (processedMessageIds.has(processedMessage._id)) {
              console.log('⚠️ Message already processed, skipping:', processedMessage._id);
              return;
            }
            
            // Mark message as processed
            setProcessedMessageIds(prev => new Set([...prev, processedMessage._id]));
            
            // Process messages for current conversation or other conversations
            if (processedMessage.conversationId === selectedChat) {
              console.log('✅ Message is for current conversation');
              
              // If message is from current user, update existing optimistic message
              if (processedMessage.senderId._id === user?._id) {
                console.log('🔄 Updating optimistic message with real data:', processedMessage);
                setMessages(prev => {
                  // Check if message already exists with real ID
                  const messageExists = prev.some(msg => msg._id === processedMessage._id);
                  if (messageExists) {
                    console.log('⚠️ Message already exists with real ID, skipping update:', processedMessage._id);
                    return prev;
                  }
                  
                  const updatedMessages = prev.map(msg => 
                    msg._id.startsWith('temp_') && msg.content === processedMessage.content 
                      ? processedMessage 
                      : msg
                  );
                  console.log('✅ Updated optimistic message in list:', updatedMessages);
                  return updatedMessages;
                });
              } else {
                // If message is from another user, add it to the list (check for duplicates)
                console.log('➕ Adding new message from another user:', processedMessage);
                setMessages(prev => {
                  console.log('📝 Current messages before adding:', prev);
                  
                  // Check if message already exists to prevent duplicates
                  const messageExists = prev.some(msg => msg._id === processedMessage._id);
                  if (messageExists) {
                    console.log('⚠️ Message already exists, skipping duplicate:', processedMessage._id);
                    return prev;
                  }
                  
                  const newMessages = [...prev, processedMessage];
                  console.log('📝 New messages after adding:', newMessages);
                  return newMessages;
                });
              }
            } else {
              console.log('📨 Message for different conversation, updating sidebar');
              console.log('Expected conversationId:', selectedChat);
              console.log('Message conversationId:', processedMessage.conversationId);
              
              // Notify parent component to update conversation list and mark as unread
              // This will be handled by the global message handler in Sidebar
            }
          } else {
            console.log('Invalid message data format:', message);
          }
        } else {
          console.log('Invalid response format - missing success or data:', responseItem);
        }
  }, [selectedChat, user, processedMessageIds]);

  // WebSocket integration - Connect to specific conversation
  useEffect(() => {
    if (!selectedChat) return;

    console.log(`Opening conversation: ${selectedChat}`);
    
    // Clear any existing timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }
    
    // Set current conversation (connection already established for all conversations)
    if (selectedChat) {
      socketService.connectToConversation(selectedChat);
    }

    console.log('🔧 Setting up WebSocket message listener...');
    console.log('🔧 Socket connected:', socketService.isConnected());
    console.log('🔧 Total callbacks before registration:', socketService.getCallbackCount());
    socketService.onNewMessage(handleNewMessage);
    console.log('🔧 WebSocket message listener set up');
    console.log('🔧 Total callbacks after registration:', socketService.getCallbackCount());
    console.log('🔧 Registered callback function:', handleNewMessage);

    // Set up conversation event listener
    const conversationCallback = (conversationData: any) => {
      if (conversationData && conversationData.type === 'user_left' && conversationData.isCurrentUser) {
        console.log('👋 Current user left group, adding system message');
        const systemMessage: MessageType = {
          _id: `system_${Date.now()}`,
          content: 'You can no longer send messages to this chat',
          senderId: {
            _id: 'system',
            name: 'System',
            email: ''
          },
          conversationId: selectedChat,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          __v: 0,
          isSystemMessage: true
        };
        setMessages(prev => [...prev, systemMessage]);
      } else if (conversationData && conversationData.type === 'message_edited') {
        console.log('✏️ Messages: Message edited received:', conversationData);
        const { messageId, conversationId, content, editedAt } = conversationData;
        
        // Only update if it's for the current conversation
        if (selectedChat === conversationId) {
          console.log('✏️ Messages: Updating message in current conversation');
          handleMessageEdited(messageId, content, editedAt);
        }
      } else if (conversationData && conversationData.type === 'message_deleted') {
        console.log('🗑️ Messages: Message deleted received:', conversationData);
        const { messageId, conversationId } = conversationData;
        
        // Only update if it's for the current conversation
        if (selectedChat === conversationId) {
          console.log('🗑️ Messages: Marking message as deleted in current conversation');
          handleMessageDeleted(messageId);
        }
      } else if (conversationData && conversationData.type === 'message_pinned') {
        console.log('📌 Messages: Message pinned received:', conversationData);
        const { messageId, conversationId, is_pinned } = conversationData;
        if (selectedChat === conversationId) {
          if ((conversationData as any).pinnedBy) {
            // Append system message about pin
            const sys: MessageType = {
              _id: `system_${Date.now()}`,
              content: 'A message was pinned',
              senderId: { _id: 'system', name: 'System', email: '' },
              conversationId: selectedChat,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              __v: 0,
              isSystemMessage: true
            };
            setMessages(prev => [...prev, sys]);
          }
          setMessages(prev => prev.map(m => m._id === messageId ? { ...m, is_pinned: Boolean(is_pinned) } : m));
        }
      } else if (conversationData && conversationData.type === 'message_unpinned') {
        console.log('📌 Messages: Message unpinned received:', conversationData);
        const { messageId, conversationId, is_pinned } = conversationData;
        if (selectedChat === conversationId) {
          setMessages(prev => prev.map(m => m._id === messageId ? { ...m, is_pinned: Boolean(is_pinned) } : m));
        }
      } else if (conversationData && conversationData.type === 'member_removed') {
        console.log('👥 Messages: Member removed event received:', conversationData);
        const { conversationId } = conversationData;
        if (selectedChat === conversationId) {
          const systemMessage: MessageType = {
            _id: `system_${Date.now()}`,
            content: 'You have been removed from the conversation',
            senderId: { _id: 'system', name: 'System', email: '' },
            conversationId: selectedChat,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            __v: 0,
            isSystemMessage: true
          };
          setMessages(prev => [...prev, systemMessage]);
        }
      }
    };

    socketService.onNewConversation(conversationCallback);

    // Cleanup: clear timeout when component unmounts or chat changes
    return () => {
      console.log(`Cleaning up conversation: ${selectedChat}`);
      // Clear timeout if component unmounts
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      // Remove the callbacks when component unmounts or conversation changes
      socketService.removeMessageCallback(handleNewMessage);
      socketService.removeConversationCallback(conversationCallback);
      // Don't leave the conversation room - we want to stay connected to all rooms
      // The global connection will handle all conversations
    };
  }, [selectedChat, handleNewMessage]);


  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clear processed message IDs when conversation changes
  useEffect(() => {
    setProcessedMessageIds(new Set());
  }, [selectedChat]);


  // Handle scroll detection for scroll-to-bottom button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollToBottom(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [messages]);

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handle message selection
  const handleMessageSelect = (messageId: string) => {
    if (onMessageSelect) {
      // If the same message is clicked, deselect it
      if (selectedMessage === messageId) {
        onMessageSelect(null);
      } else {
        onMessageSelect(messageId);
      }
    }
  };

  // Handle message toggle for multi-select
  const handleMessageToggle = (messageId: string) => {
    if (onMessageToggle) {
      onMessageToggle(messageId);
    }
  };


  // Optimistically remove messages from the list
  const removeMessagesOptimistically = (messageIds: string[]) => {
    setMessages(prev => prev.filter(msg => !messageIds.includes(msg._id)));
  };

  // Function to get message content by ID (for editing)
  const getMessageContent = (messageId: string): string | null => {
    const message = messages.find(msg => msg._id === messageId);
    return message ? message.content : null;
  };

  const getMessageById = (messageId: string): MessageType | null => {
    const message = messages.find(msg => msg._id === messageId);
    return message || null;
  };

  const setMessagePinned = (messageId: string, pinned: boolean) => {
    setMessages(prev => prev.map(msg =>
      msg._id === messageId ? { ...msg, is_pinned: pinned } : msg
    ));
  };

  const getPinnedMessageIds = (): string[] => {
    return messages.filter(m => (m as any).is_pinned || (m as any).isPinned).map(m => m._id);
  };

  // Function to update message content optimistically (for editing)
  const updateMessageOptimistically = (messageId: string, newContent: string) => {
    setMessages(prev => prev.map(msg => 
      msg._id === messageId 
        ? { ...msg, content: newContent }
        : msg
    ));
  };

  // Function to handle message edited event from socket
  const handleMessageEdited = (messageId: string, newContent: string, editedAt: string) => {
    setMessages(prev => prev.map(msg => 
      msg._id === messageId 
        ? { ...msg, content: newContent, editedAt }
        : msg
    ));
  };

  // Function to delete message optimistically (mark as deleted)
  const deleteMessageOptimistically = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg._id === messageId 
        ? { ...msg, is_deleted: true }
        : msg
    ));
  };

  // Function to handle message deleted event from socket
  const handleMessageDeleted = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg._id === messageId 
        ? { ...msg, is_deleted: true }
        : msg
    ));
  };

  // Function to scroll to a specific message
  const scrollToMessage = (messageId: string) => {
    console.log('🔍 Messages: Scrolling to message:', messageId);
    
    const scrollToElement = (element: HTMLElement) => {
      console.log('🔍 Messages: Scrolling to element and highlighting');
      
      // Ensure the messages container is visible
      const messagesContainer = messagesContainerRef.current;
      if (messagesContainer) {
        console.log('🔍 Messages: Messages container found, scrolling...');
        
        // Log element and container info for debugging
        console.log('🔍 Messages: Element info:', {
          elementId: element.id,
          elementOffsetTop: element.offsetTop,
          elementOffsetHeight: element.offsetHeight,
          containerScrollTop: messagesContainer.scrollTop,
          containerScrollHeight: messagesContainer.scrollHeight,
          containerClientHeight: messagesContainer.clientHeight
        });
        
        // Use scrollIntoView with better options
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
        
        // Log scroll position after scroll
        setTimeout(() => {
          console.log('🔍 Messages: After scroll - container scrollTop:', messagesContainer.scrollTop);
        }, 100);
        
        // Add search highlight effects
        element.classList.add('search-highlight');
        element.classList.add('search-selected');
        
        // Remove search highlight effects after 4 seconds, but keep selection
        setTimeout(() => {
          element.classList.remove('search-highlight');
          element.classList.remove('search-selected');
        }, 4000);
        
        console.log('🔍 Messages: Successfully scrolled and highlighted message');
      } else {
        console.log('🔍 Messages: Messages container not found!');
      }
    };
    
    // Add a small delay to ensure messages are fully rendered
    setTimeout(() => {
      // Find the message element by ID
      const messageElement = document.getElementById(`message-${messageId}`);
      if (messageElement) {
        console.log('🔍 Messages: Found message element after delay');
        scrollToElement(messageElement);
      } else {
        console.log('🔍 Messages: Message element not found, waiting for messages to load');
        // If message not found, wait a bit and try again with multiple attempts
        let attempts = 0;
        const maxAttempts = 20;
        
        const retryScroll = () => {
          attempts++;
          console.log(`🔍 Messages: Retry attempt ${attempts}/${maxAttempts}`);
          
          const retryElement = document.getElementById(`message-${messageId}`);
          if (retryElement) {
            console.log('🔍 Messages: Found message element on retry');
            scrollToElement(retryElement);
          } else if (attempts < maxAttempts) {
            // Wait with progressive delays
            setTimeout(retryScroll, 300 + (attempts * 100));
          } else {
            console.log('🔍 Messages: Max retry attempts reached, message element not found');
          }
        };
        
        // Start retry after a short delay
        setTimeout(retryScroll, 300);
      }
    }, 100); // Small delay to ensure DOM is ready
  };

  // Expose the optimistic message function to parent via ref
  useImperativeHandle(ref, () => ({
    addOptimisticMessage,
    removeMessagesOptimistically,
    getMessageContent,
    getMessageById,
    setMessagePinned,
    getPinnedMessageIds,
    updateMessageOptimistically,
    handleMessageEdited,
    deleteMessageOptimistically,
    handleMessageDeleted,
    scrollToMessage
  }));

  if (loading) {
    return (
      <div className="messages-container loading" ref={messagesContainerRef}>
        <div className="loading-state">
          <p>Loading messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="messages-container" ref={messagesContainerRef}>
        <div className="error-state">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="retry-btn"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  console.log('🎨 Rendering messages:', messages.length, 'messages');
  console.log('🎨 Selected chat:', selectedChat);
  console.log('🎨 Selected message:', selectedMessage);
  console.log('🎨 Is multi-select mode:', isMultiSelectMode);
  console.log('🎨 Selected messages array:', selectedMessages);

  return (
    <div className="messages-container" ref={messagesContainerRef}>
      <div className="messages-list">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isSelected = isMultiSelectMode ? selectedMessages.includes(message._id) : selectedMessage === message._id;
            console.log(`🎨 Message ${message._id}: isSelected = ${isSelected}, selectedMessage = ${selectedMessage}`);
            return (
              <Message 
                key={message._id} 
                message={message} 
                currentUserId={user?._id || ''}
                isSelected={isSelected}
                isMultiSelectMode={isMultiSelectMode}
                onSelect={handleMessageSelect}
                onToggleSelection={handleMessageToggle}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      {showScrollToBottom && (
        <button 
          className="scroll-to-bottom-btn"
          onClick={scrollToBottom}
          title="Scroll to bottom"
        >
          ↓
        </button>
      )}
    </div>
  );
});

Messages.displayName = 'Messages';

export default Messages;
