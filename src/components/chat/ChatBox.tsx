import { useState } from 'react';
import Messages from './Messages';
import InputField from './InputField';

interface ChatBoxProps {
  selectedChat: string | null;
}

const ChatBox = ({ selectedChat }: ChatBoxProps) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleMessageSent = () => {
    // Trigger a refresh of messages by updating the key
    setRefreshKey(prev => prev + 1);
  };

  if (!selectedChat) {
    return (
      <div className="chat-box empty">
        <div className="empty-state">
          <h2>Welcome to ChatApp</h2>
          <p>Select a conversation to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-box">
      <Messages key={refreshKey} selectedChat={selectedChat} />
      <InputField 
        selectedChat={selectedChat} 
        onMessageSent={handleMessageSent}
      />
    </div>
  );
};

export default ChatBox;
