import { useState } from 'react';
import { socketService } from '../../services/socketService';

interface InputFieldProps {
  selectedChat: string;
  onMessageSent?: () => void;
  onOptimisticMessage?: (content: string) => void;
}

const InputField = ({ selectedChat, onMessageSent, onOptimisticMessage }: InputFieldProps) => {
  const [message, setMessage] = useState('');

  const sendMessage = async () => {
    console.log('sendMessage called with:', { message: message.trim() });
    if (message.trim()) {
      const messageContent = message.trim();
      
      try {
        console.log('Sending message via WebSocket...');

        // Add optimistic message to UI immediately
        if (onOptimisticMessage) {
          onOptimisticMessage(messageContent);
        }

        // Send message via WebSocket for real-time delivery
        socketService.sendMessage(selectedChat, messageContent);

        setMessage('');
        console.log('Message sent successfully');

        // Trigger callback if needed
        if (onMessageSent) {
          onMessageSent();
        }
      } catch (error) {
        console.error('Error sending message:', error);
        // You could show an error message to the user here
      }
    } else {
      console.log('Message not sent: empty message');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Form submitted, sending message...');
    sendMessage();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Enter key pressed, sending message...');
      sendMessage();
    }
  };

  return (
    <div className="input-field">
      <form onSubmit={handleSubmit} className="message-form" noValidate>
        <div className="input-container">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="message-input"
            rows={1}
          />
          <button 
            type="submit" 
            className="send-btn"
            disabled={!message.trim()}
            title="Send Message"
          >
            <span>➤</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default InputField;
