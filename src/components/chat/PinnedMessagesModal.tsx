import { Message } from '../../types/chatTypes';

interface PinnedMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  pinnedMessageIds: string[];
  resolveMessage: (id: string) => Message | null;
}

const PinnedMessagesModal = ({ isOpen, onClose, pinnedMessageIds, resolveMessage }: PinnedMessagesModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal pinned-messages-modal">
        <div className="modal-header">
          <h3>Pinned Messages</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-content">
          {pinnedMessageIds.length === 0 ? (
            <p>No pinned messages yet.</p>
          ) : (
            <ul className="pinned-message-list">
              {pinnedMessageIds.map(id => {
                const msg = resolveMessage(id);
                if (!msg) return (
                  <li key={id} className="pinned-message-item missing">Message unavailable</li>
                );
                return (
                  <li key={id} className="pinned-message-item">
                    <div className="pinned-message-meta">
                      <span className="pinned-sender">{msg.senderId.name}</span>
                      <span className="pinned-time">{new Date(msg.createdAt).toLocaleString()}</span>
                    </div>
                    <div className={`pinned-message-content ${msg.is_deleted ? 'deleted' : ''}`}>
                      {msg.is_deleted ? 'Message deleted' : msg.content}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default PinnedMessagesModal;


