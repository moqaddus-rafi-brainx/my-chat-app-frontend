import { useRef } from 'react';
import Messages from './Messages';
import InputField from './InputField';

interface ChatBoxProps {
  selectedChat: string | null;
}

const ChatBox = ({ selectedChat }: ChatBoxProps) => {
  const messagesRef = useRef<{ addOptimisticMessage: (content: string) => void } | null>(null);

  const handleMessageSent = () => {
    // No need to refresh - optimistic updates handle this
    console.log('Message sent - optimistic update already handled');
  };

  const handleOptimisticMessage = (content: string) => {
    if (messagesRef.current) {
      messagesRef.current.addOptimisticMessage(content);
    }
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
      <Messages 
        selectedChat={selectedChat} 
        ref={messagesRef}
      />
      <InputField 
        selectedChat={selectedChat} 
        onMessageSent={handleMessageSent}
        onOptimisticMessage={handleOptimisticMessage}
      />
    </div>
  );
};

export default ChatBox;
