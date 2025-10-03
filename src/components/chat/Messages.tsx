import { useState, useEffect, useRef } from 'react';
import { conversationService } from '../../services/conversationService';
import { useUser } from '../../contexts/UserContext';
import { Message as MessageType } from '../../types/chatTypes';
import Message from './Message';

interface MessagesProps {
  selectedChat: string;
}

const Messages = ({ selectedChat }: MessagesProps) => {
  const { user } = useUser();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedChat || !user) return;

      try {
        setLoading(true);
        setError('');
        const response = await conversationService.getMessages(selectedChat);
        setMessages(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load messages');
        console.error('Error fetching messages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [selectedChat, user]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <div className="messages-container">
        <div className="loading-state">
          <p>Loading messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="messages-container">
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

  return (
    <div className="messages-container">
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
    </div>
  );
};

export default Messages;
