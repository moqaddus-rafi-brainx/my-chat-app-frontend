import { Message as MessageType } from '../../types/chatTypes';

interface MessageProps {
  message: MessageType;
  currentUserId: string;
}

const Message = ({ message, currentUserId }: MessageProps) => {
  console.log('💬 Message component rendering:', { 
    messageId: message._id, 
    content: message.content, 
    senderId: message.senderId._id, 
    currentUserId 
  });
  const isOwn = message.senderId._id === currentUserId;
  console.log('💬 Is own message:', isOwn);
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`message ${isOwn ? 'own' : 'other'}`}>
      <div className="message-content">
        <div className="message-bubble">
          <p>{message.content}</p>
        </div>
        <div className="message-meta">
          <span className="timestamp">{formatTime(message.createdAt)}</span>
          {!isOwn && (
            <span className="sender-name">{message.senderId.name}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Message;
