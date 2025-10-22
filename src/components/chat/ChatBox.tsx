import { useRef, forwardRef, useImperativeHandle } from 'react';
import Messages from './Messages';
import InputField from './InputField';

interface ChatBoxProps {
  selectedChat: string | null;
  selectedMessage?: string | null;
  selectedMessages?: string[];
  isMultiSelectMode?: boolean;
  onMessageSelect?: (messageId: string | null) => void;
  onMessageToggle?: (messageId: string) => void;
  onMultiSelectModeChange?: (enabled: boolean) => void;
  hasLeftConversation?: boolean;
  editingMessage?: { id: string; content: string } | null;
  onEditMessageStart?: (messageId: string, content: string) => void;
  onEditMessageSave?: (content: string) => void;
  onEditMessageCancel?: () => void;
  onPinMessage?: (messageId: string) => void;
  onOpenPinned?: () => void;
}

const ChatBox = forwardRef<{ 
  addOptimisticMessage: (content: string) => void;
  removeMessagesOptimistically: (messageIds: string[]) => void;
  getMessageContent: (messageId: string) => string | null;
  updateMessageOptimistically: (messageId: string, newContent: string) => void;
  handleMessageEdited: (messageId: string, newContent: string, editedAt: string) => void;
  deleteMessageOptimistically: (messageId: string) => void;
  handleMessageDeleted: (messageId: string) => void;
}, ChatBoxProps>(({ 
  selectedChat, 
  selectedMessage, 
  selectedMessages = [],
  isMultiSelectMode = false,
  onMessageSelect, 
  onMessageToggle,
  onMultiSelectModeChange,
  hasLeftConversation = false,
  editingMessage,
  onEditMessageStart,
  onEditMessageSave,
  onEditMessageCancel
}, ref) => {
  const messagesRef = useRef<{ 
    addOptimisticMessage: (content: string) => void;
    removeMessagesOptimistically: (messageIds: string[]) => void;
    getMessageContent: (messageId: string) => string | null;
    updateMessageOptimistically: (messageId: string, newContent: string) => void;
    handleMessageEdited: (messageId: string, newContent: string, editedAt: string) => void;
    deleteMessageOptimistically: (messageId: string) => void;
    handleMessageDeleted: (messageId: string) => void;
  } | null>(null);

  const handleMessageSent = () => {
    // No need to refresh - optimistic updates handle this
    console.log('Message sent - optimistic update already handled');
  };

  const handleOptimisticMessage = (content: string) => {
    if (messagesRef.current) {
      messagesRef.current.addOptimisticMessage(content);
    }
  };

  // Forward ref to parent
  useImperativeHandle(ref, () => ({
    addOptimisticMessage: (content: string) => {
      if (messagesRef.current) {
        messagesRef.current.addOptimisticMessage(content);
      }
    },
    removeMessagesOptimistically: (messageIds: string[]) => {
      if (messagesRef.current) {
        messagesRef.current.removeMessagesOptimistically(messageIds);
      }
    },
    getMessageContent: (messageId: string) => {
      if (messagesRef.current) {
        return messagesRef.current.getMessageContent(messageId);
      }
      return null;
    },
    // Proxy getMessageById if available
    getMessageById: (messageId: string) => {
      if (messagesRef.current && (messagesRef.current as any).getMessageById) {
        return (messagesRef.current as any).getMessageById(messageId);
      }
      return null;
    },
    // Proxy getPinnedMessageIds if available
    getPinnedMessageIds: () => {
      if (messagesRef.current && (messagesRef.current as any).getPinnedMessageIds) {
        return (messagesRef.current as any).getPinnedMessageIds();
      }
      return [];
    },
    // Proxy setMessagePinned if available
    setMessagePinned: (messageId: string, pinned: boolean) => {
      if (messagesRef.current && (messagesRef.current as any).setMessagePinned) {
        (messagesRef.current as any).setMessagePinned(messageId, pinned);
      }
    },
    updateMessageOptimistically: (messageId: string, newContent: string) => {
      if (messagesRef.current) {
        messagesRef.current.updateMessageOptimistically(messageId, newContent);
      }
    },
    handleMessageEdited: (messageId: string, newContent: string, editedAt: string) => {
      if (messagesRef.current) {
        messagesRef.current.handleMessageEdited(messageId, newContent, editedAt);
      }
    },
    deleteMessageOptimistically: (messageId: string) => {
      if (messagesRef.current) {
        messagesRef.current.deleteMessageOptimistically(messageId);
      }
    },
    handleMessageDeleted: (messageId: string) => {
      if (messagesRef.current) {
        messagesRef.current.handleMessageDeleted(messageId);
      }
    }
  }));

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
        selectedMessage={selectedMessage}
        selectedMessages={selectedMessages}
        isMultiSelectMode={isMultiSelectMode}
        onMessageSelect={onMessageSelect}
        onMessageToggle={onMessageToggle}
        onMultiSelectModeChange={onMultiSelectModeChange}
        ref={messagesRef}
      />
      <InputField 
        selectedChat={selectedChat} 
        onMessageSent={handleMessageSent}
        onOptimisticMessage={handleOptimisticMessage}
        disabled={hasLeftConversation}
        editingMessage={editingMessage}
        onEditMessageStart={onEditMessageStart}
        onEditMessageSave={onEditMessageSave}
        onEditMessageCancel={onEditMessageCancel}
      />
    </div>
  );
});

ChatBox.displayName = 'ChatBox';

export default ChatBox;
