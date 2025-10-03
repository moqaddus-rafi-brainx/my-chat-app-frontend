import { useState, useEffect } from 'react';
import { authService } from '../../services/authService';
import { conversationService } from '../../services/conversationService';
import { useUser } from '../../contexts/UserContext';
import { UserData } from '../../types/chatTypes';

interface PeopleProps {
  onConversationCreated?: (conversationId: string) => void;
}

const People = ({ onConversationCreated }: PeopleProps) => {
  const { user: currentUser } = useUser();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creatingConversation, setCreatingConversation] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await authService.getUsers();
        // Filter out current user from the list
        const otherUsers = response.data.filter(user => user._id !== currentUser?._id);
        console.log('Current user:', currentUser);
        console.log('All users from API:', response.data);
        console.log('Filtered users (excluding current user):', otherUsers);
        setUsers(otherUsers);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users');
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser]);

  const handleStartChat = async (userId: string) => {
    if (!currentUser) return;

    console.log('Creating conversation with:', {
      currentUserId: currentUser._id,
      selectedUserId: userId,
      members: [userId]
    });

    try {
      setCreatingConversation(userId);
      const response = await conversationService.createConversation({
        members: [userId],
        type: 'direct'
      });

      // Notify parent component about the new conversation
      if (onConversationCreated) {
        onConversationCreated(response.data._id);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      // You could show an error message to the user here
    } finally {
      setCreatingConversation(null);
    }
  };

  if (loading) {
    return (
      <div className="people-container">
        <div className="loading-state">
          <p>Loading people...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="people-container">
        <div className="error-state">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="retry-btn"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="people-container">
      <div className="people-list">
        {users.length === 0 ? (
          <div className="empty-state">
            <p>No other users found</p>
          </div>
        ) : (
          users.map((user) => (
            <div key={user._id} className="person-item">
              <div className="person-avatar">
                <span>{user.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="person-info">
                <h4>{user.name}</h4>
                <p>{user.email}</p>
              </div>
              <button 
                className="start-chat-btn" 
                title="Start Chat"
                onClick={() => handleStartChat(user._id)}
                disabled={creatingConversation === user._id}
              >
                <span>
                  {creatingConversation === user._id ? '⏳' : '💬'}
                </span>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default People;
