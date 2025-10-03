import { useState } from 'react';
import { conversationService } from '../../services/conversationService';

interface InputFieldProps {
  selectedChat: string;
  onMessageSent?: () => void;
}

const InputField = ({ selectedChat, onMessageSent }: InputFieldProps) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !sending) {
      try {
        setSending(true);
        await conversationService.sendMessage(selectedChat, message.trim());
        setMessage('');
        // Trigger message refresh in parent component
        if (onMessageSent) {
          onMessageSent();
        }
      } catch (error) {
        console.error('Error sending message:', error);
        // You could show an error message to the user here
      } finally {
        setSending(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="input-field">
      <form onSubmit={handleSubmit} className="message-form">
        <div className="input-container">
          <button type="button" className="attach-btn" title="Attach File">
            <span>📎</span>
          </button>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="message-input"
            rows={1}
          />
          <button type="button" className="emoji-btn" title="Add Emoji">
            <span>😊</span>
          </button>
          <button 
            type="submit" 
            className="send-btn"
            disabled={!message.trim() || sending}
            title="Send Message"
          >
            <span>{sending ? '⏳' : '➤'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default InputField;
