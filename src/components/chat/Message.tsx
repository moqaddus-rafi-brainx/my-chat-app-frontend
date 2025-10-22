import { Message as MessageType } from '../../types/chatTypes';

interface MessageProps {
  message: MessageType;
  currentUserId: string;
  isSelected?: boolean;
  isMultiSelectMode?: boolean;
  onSelect?: (messageId: string) => void;
  onToggleSelection?: (messageId: string) => void;
}

const Message = ({ 
  message, 
  currentUserId, 
  isSelected = false, 
  isMultiSelectMode = false,
  onSelect, 
  onToggleSelection 
}: MessageProps) => {
  console.log('💬 Message component rendering:', { 
    messageId: message._id, 
    content: message.content, 
    senderId: message.senderId._id, 
    currentUserId,
    isSelected
  });
  const isOwn = message.senderId._id === currentUserId;
  console.log('💬 Is own message:', isOwn, 'Is selected:', isSelected);
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleClick = () => {
    // Allow selection of any message that is not deleted (for pinning)
    if (message.is_deleted) return;
    
    if (isMultiSelectMode && onToggleSelection) {
      onToggleSelection(message._id);
    } else if (onSelect) {
      onSelect(message._id);
    }
  };

  // Handle system messages differently
  if (message.isSystemMessage) {
    return (
      <div className="message system">
        <div className="message-content">
          <div className="message-bubble">
            <p>{message.content}</p>
          </div>
          <div className="message-meta">
            <span className="timestamp">{formatTime(message.createdAt)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      id={`message-${message._id}`}
      className={`message ${isOwn ? 'own' : 'other'} ${isSelected ? 'selected' : ''} ${!isOwn ? 'not-selectable' : ''}`}
    >
      {isMultiSelectMode && isOwn && !message.is_deleted && (
        <div className="message-checkbox">
          <input 
            type="checkbox" 
            checked={isSelected}
            onChange={() => {}} // Handled by parent click
            className="message-checkbox-input"
          />
        </div>
      )}
      <div className="message-content">
        <div 
          className={`message-bubble ${!message.is_deleted ? 'clickable' : ''} ${isSelected ? 'selected' : ''} ${message.is_deleted ? 'deleted' : ''}`}
          onClick={handleClick}
        >
          <p>
            {message.is_deleted ? 'Message deleted' : message.content}
            {message.is_pinned && !message.is_deleted && (
              <span className="pin-indicator" title="Pinned"> 📌</span>
            )}
          </p>
        </div>
        <div className="message-meta">
          <span className="timestamp">{formatTime(message.createdAt)}</span>
          {(message.is_edited || message.editedAt) && !message.is_deleted && (
            <span className="edited-indicator">edited</span>
          )}
          {!isOwn && (
            <span className="sender-name">{message.senderId.name}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Message;
