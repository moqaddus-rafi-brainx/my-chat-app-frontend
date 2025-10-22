import { useState, useEffect, useRef } from 'react';
import { socketService } from '../../services/socketService';

interface InputFieldProps {
  selectedChat: string;
  onMessageSent?: () => void;
  onOptimisticMessage?: (content: string) => void;
  disabled?: boolean;
  editingMessage?: { id: string; content: string } | null;
  onEditMessageStart?: (messageId: string, content: string) => void;
  onEditMessageSave?: (content: string) => void;
  onEditMessageCancel?: () => void;
}

const InputField = ({ 
  selectedChat, 
  onMessageSent, 
  onOptimisticMessage, 
  disabled = false,
  editingMessage,
  onEditMessageStart: _onEditMessageStart,
  onEditMessageSave,
  onEditMessageCancel
}: InputFieldProps) => {
  const [message, setMessage] = useState('');
  const typingTimeoutRef = useRef<number | null>(null);
  const isTypingRef = useRef<boolean>(false);

  // Handle edit mode
  useEffect(() => {
    if (editingMessage) {
      setMessage(editingMessage.content);
    } else {
      setMessage('');
    }
  }, [editingMessage]);

  const sendMessage = async () => {
    console.log('sendMessage called with:', { message: message.trim(), editingMessage });
    if (disabled) {
      console.log('Cannot send message: user has left the conversation');
      return;
    }
    if (message.trim()) {
      const messageContent = message.trim();
      
      try {
        if (editingMessage) {
          // Handle edit message
          console.log('Saving edited message...');
          if (onEditMessageSave) {
            onEditMessageSave(messageContent);
          }
        } else {
          // Handle new message
          console.log('Sending new message via WebSocket...');

          // Stop typing indicator when sending message
          if (isTypingRef.current) {
            console.log('⌨️ User sent message, stopping typing indicator');
            socketService.emitStopTyping(selectedChat);
            isTypingRef.current = false;
          }

          // Clear typing timeout
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
          }

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
    } else if (e.key === 'Escape' && editingMessage) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Escape key pressed, canceling edit...');
      handleCancelEdit();
    }
  };

  const handleCancelEdit = () => {
    // Stop typing indicator when canceling edit
    if (isTypingRef.current) {
      console.log('⌨️ User canceled edit, stopping typing indicator');
      socketService.emitStopTyping(selectedChat);
      isTypingRef.current = false;
    }

    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (onEditMessageCancel) {
      onEditMessageCancel();
    }
  };

  // Handle typing detection
  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    setMessage(newMessage);

    // Don't emit typing events if disabled or in edit mode
    if (disabled || editingMessage) {
      return;
    }

    // Only emit typing event if user just started typing (not already typing)
    if (!isTypingRef.current) {
      console.log('⌨️ User started typing in conversation:', selectedChat);
      socketService.emitTyping(selectedChat);
      isTypingRef.current = true;
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to emit stop typing after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      console.log('⌨️ User stopped typing in conversation:', selectedChat);
      socketService.emitStopTyping(selectedChat);
      isTypingRef.current = false;
    }, 2000);
  };

  // Cleanup typing timeout and stop typing indicator on unmount or conversation change
  useEffect(() => {
    return () => {
      // Stop typing indicator when component unmounts or conversation changes
      if (isTypingRef.current) {
        console.log('⌨️ Component unmounting or conversation changing, stopping typing indicator');
        socketService.emitStopTyping(selectedChat);
        isTypingRef.current = false;
      }

      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [selectedChat]); // Re-run when conversation changes

  return (
    <div className={`input-field ${editingMessage ? 'edit-mode' : ''}`}>
      <form onSubmit={handleSubmit} className="message-form" noValidate>
        <div className="input-container">
          {editingMessage && (
            <div className="edit-indicator">
              <span className="edit-label">Editing message</span>
            </div>
          )}
          <textarea
            value={message}
            onChange={handleTyping}
            onKeyPress={handleKeyPress}
            placeholder={
              disabled 
                ? "You can no longer send messages to this chat" 
                : editingMessage 
                  ? "Edit your message..." 
                  : "Type a message..."
            }
            className={`message-input ${editingMessage ? 'edit-mode' : ''}`}
            rows={1}
            disabled={disabled}
            autoFocus={!!editingMessage}
          />
          <div className="action-buttons">
            {editingMessage ? (
              <>
                <button 
                  type="button"
                  className="cancel-btn"
                  onClick={handleCancelEdit}
                  title="Cancel Edit"
                >
                  <span>✕</span>
                </button>
                <button 
                  type="submit" 
                  className="save-btn"
                  disabled={!message.trim() || disabled}
                  title="Save Changes"
                >
                  <span>✓</span>
                </button>
              </>
            ) : (
              <button 
                type="submit" 
                className="send-btn"
                disabled={!message.trim() || disabled}
                title={disabled ? "Cannot send messages" : "Send Message"}
              >
                <span>➤</span>
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default InputField;
