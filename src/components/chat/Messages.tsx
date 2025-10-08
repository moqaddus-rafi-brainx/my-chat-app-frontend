import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { conversationService } from '../../services/conversationService';
import { socketService } from '../../services/socketService';
import { useUser } from '../../contexts/UserContext';
import { Message as MessageType } from '../../types/chatTypes';
import Message from './Message';

interface MessagesProps {
  selectedChat: string;
}

export interface MessagesRef {
  addOptimisticMessage: (content: string) => void;
}

const Messages = forwardRef<MessagesRef, MessagesProps>(({ selectedChat }, ref) => {
  const { user } = useUser();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [processedMessageIds, setProcessedMessageIds] = useState<Set<string>>(new Set());
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const connectionTimeoutRef = useRef<number | null>(null);

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
      if (!selectedChat || !user) return;

      try {
        setLoading(true);
        setError('');
        console.log('📥 Fetching initial messages for conversation:', selectedChat);
        const response = await conversationService.getMessages(selectedChat);
        setMessages(response.data);
        console.log('📥 Initial messages loaded:', response.data.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load messages');
        console.error('Error fetching messages:', err);
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

    // Cleanup: clear timeout when component unmounts or chat changes
    return () => {
      console.log(`Cleaning up conversation: ${selectedChat}`);
      // Clear timeout if component unmounts
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      // Remove the callback when component unmounts or conversation changes
      socketService.removeMessageCallback(handleNewMessage);
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

  // Expose the optimistic message function to parent via ref
  useImperativeHandle(ref, () => ({
    addOptimisticMessage
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
  console.log('🎨 Messages data:', messages);
  console.log('🎨 Selected chat:', selectedChat);
  console.log('🎨 User ID:', user?._id);

  return (
    <div className="messages-container" ref={messagesContainerRef}>
      <div className="messages-list">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <Message 
              key={message._id} 
              message={message} 
              currentUserId={user?._id || ''} 
            />
          ))
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
