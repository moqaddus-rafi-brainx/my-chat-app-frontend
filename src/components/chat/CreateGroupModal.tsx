import { useState, useEffect } from 'react';
import { conversationService } from '../../services/conversationService';
import { authService } from '../../services/authService';
import { useUser } from '../../contexts/UserContext';
import { UserData } from '../../types/chatTypes';

interface CreateGroupModalProps {
  onClose: () => void;
  onGroupCreated: (conversationId: string) => void;
}

const CreateGroupModal = ({ onClose, onGroupCreated }: CreateGroupModalProps) => {
  const { user: currentUser } = useUser();
  const [groupName, setGroupName] = useState('');
  const [users, setUsers] = useState<UserData[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await authService.getUsers();
        // Filter out current user from the list
        const otherUsers = response.data.filter(user => user._id !== currentUser?._id);
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

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('Please enter a group name');
      return;
    }

    if (selectedUsers.length === 0) {
      setError('Please select at least one member');
      return;
    }

    try {
      setCreating(true);
      setError('');
      
      const response = await conversationService.createConversation({
        name: groupName.trim(),
        members: selectedUsers,
        type: 'group'
      });

      onGroupCreated(response.data._id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
      console.error('Error creating group:', err);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal">
          <div className="modal-header">
            <h2>Create Group</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <div className="loading-state">
              <p>Loading users...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Create Group</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="groupName">Group Name</label>
            <input
              id="groupName"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Select Members</label>
            <div className="users-list">
              {users.map((user) => (
                <div 
                  key={user._id} 
                  className={`user-item ${selectedUsers.includes(user._id) ? 'selected' : ''}`}
                  onClick={() => handleUserToggle(user._id)}
                >
                  <div className="user-avatar">
                    <span>{user.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="user-info">
                    <h4>{user.name}</h4>
                    <p>{user.email}</p>
                  </div>
                  <div className="checkbox">
                    {selectedUsers.includes(user._id) ? '✓' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}

          <div className="modal-actions">
            <button 
              className="btn-secondary" 
              onClick={onClose}
              disabled={creating}
            >
              Cancel
            </button>
            <button 
              className="btn-primary" 
              onClick={handleCreateGroup}
              disabled={creating || !groupName.trim() || selectedUsers.length === 0}
            >
              {creating ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
