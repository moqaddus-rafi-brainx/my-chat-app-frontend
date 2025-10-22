import { useState } from 'react';

interface DeleteGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  groupName: string;
  isDeleting?: boolean;
}

const DeleteGroupModal = ({ isOpen, onClose, onConfirm, groupName, isDeleting = false }: DeleteGroupModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content delete-group-modal">
        <div className="modal-header">
          <h3>Delete Group</h3>
          <button className="modal-close-btn" onClick={onClose} disabled={isDeleting}>
            ✕
          </button>
        </div>
        
        <div className="modal-body">
          <div className="warning-icon">
            ⚠️
          </div>
          <p>
            Are you sure you want to delete <strong>"{groupName}"</strong>?
          </p>
          <p className="warning-text">
            This action cannot be undone. All messages and data in this group will be permanently deleted.
          </p>
        </div>
        
        <div className="modal-footer">
          <button 
            className="modal-btn cancel-btn" 
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button 
            className="modal-btn delete-btn" 
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Group'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteGroupModal;
