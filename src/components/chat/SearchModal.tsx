import React, { useState, useEffect, useRef } from 'react';
import { conversationService } from '../../services/conversationService';

interface SearchResult {
  _id: string;
  content: string;
  senderId: {
    _id: string;
    name: string;
    email: string;
  };
  conversationId: string | { _id: string; type: string; members: any[] }; // Can be string or object
  is_edited: boolean;
  is_pinned: boolean;
  createdAt: string;
  updatedAt: string;
  conversationDisplayName: string;
  conversationType: string;
  conversationName: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMessageClick: (conversationId: string, messageId: string) => void;
  conversationId?: string; // If provided, search only in this conversation
  title?: string; // Custom title for the modal
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onMessageClick, conversationId, title = "Search Messages" }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Clear state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setError(null);
    }
  }, [isOpen]);

  // Search with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await conversationService.searchMessages(query.trim(), conversationId);
        if (response.success && response.data) {
          setResults(response.data.messages || []);
        } else {
          setError('No messages found');
          setResults([]);
        }
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to search messages');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, conversationId]);

  const handleMessageClick = (result: SearchResult) => {
    // Extract conversation ID - handle both string and object formats
    const conversationId = typeof result.conversationId === 'string' 
      ? result.conversationId 
      : result.conversationId._id;
    
    console.log('🔍 SearchModal: Message clicked:', { 
      conversationId, 
      messageId: result._id,
      originalConversationId: result.conversationId 
    });
    
    onMessageClick(conversationId, result._id);
    onClose();
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          <div className="search-input-container">
            <input
              ref={inputRef}
              type="text"
              placeholder={conversationId ? "Search in this conversation..." : "Search all messages..."}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search-input"
            />
            {isLoading && <div className="search-loading">🔍</div>}
          </div>

          {error && (
            <div className="search-error">
              {error}
            </div>
          )}

          {results.length > 0 && (
            <div className="search-results">
              <div className="search-results-header">
                Found {results.length} message{results.length !== 1 ? 's' : ''}
              </div>
              
              <div className="search-results-list">
                {results.map((result) => (
                  <div
                    key={result._id}
                    className="search-result-item"
                    onClick={() => handleMessageClick(result)}
                  >
                    {!conversationId && (
                      <div className="search-result-header">
                        <span className="conversation-name">
                          {result.conversationDisplayName}
                        </span>
                        <span className="message-time">
                          {formatTime(result.createdAt)}
                        </span>
                      </div>
                    )}
                    
                    {conversationId && (
                      <div className="search-result-header">
                        <span className="message-time">
                          {formatTime(result.createdAt)}
                        </span>
                      </div>
                    )}
                    
                    <div className="search-result-content">
                      <span className="sender-name">
                        {result.senderId.name}:
                      </span>
                      <span className="message-content">
                        {truncateContent(result.content)}
                      </span>
                    </div>
                    
                    {result.is_edited && (
                      <span className="edited-indicator">edited</span>
                    )}
                    {result.is_pinned && (
                      <span className="pinned-indicator">📌</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {query.trim() && !isLoading && results.length === 0 && !error && (
            <div className="search-no-results">
              No messages found for "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
