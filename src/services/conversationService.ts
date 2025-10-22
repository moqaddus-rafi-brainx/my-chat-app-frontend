import { ConversationsResponse, MessagesResponse, CreateConversationDto, CreateConversationResponse } from '../types/chatTypes';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// Helper function to get token from localStorage
const getToken = (): string | null => {
  return localStorage.getItem('access_token');
};

export const conversationService = {
  // Get all conversations with optional filter
  async getConversations(filter?: 'all' | 'direct' | 'group'): Promise<ConversationsResponse> {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      let url = `${API_BASE_URL}/conversation`;
      if (filter && filter !== 'all') {
        url += `?type=${filter}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch conversations');
      }
      return result;
    } catch (error) {
      throw error;
    }
  },

  // Get messages for a specific conversation
  async getMessages(conversationId: string): Promise<MessagesResponse> {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/message/conversation/${conversationId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch messages');
      }
      return result;
    } catch (error) {
      throw error;
    }
  },

  // Send a new message
  async sendMessage(conversationId: string, content: string): Promise<any> {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId,
          content,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to send message');
      }
      return result;
    } catch (error) {
      throw error;
    }
  },

  // Create a new conversation
  async createConversation(data: CreateConversationDto): Promise<CreateConversationResponse> {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      console.log('Create conversation response:', result);

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create conversation');
      }

      return result;
    } catch (error) {
      throw error;
    }
  },

  // Delete a conversation
  async deleteConversation(conversationId: string): Promise<any> {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/conversation/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      console.log('Delete conversation response:', result);
      if (!result.success) {
        throw new Error(result.message || 'Failed to delete conversation');
      }
      return result;
    } catch (error) {
      throw error;
    }
  },

  // Edit a message
  async editMessage(messageId: string, content: string): Promise<any> {
    try {
      console.log('📝 Starting edit message API call:', { messageId, content });
      
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('📝 Making PUT request to edit message...');
      const response = await fetch(`${API_BASE_URL}/message/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      console.log('📝 Edit message response status:', response.status);
      const result = await response.json();
      console.log('📝 Edit message response:', result);
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to edit message');
      }
      
      console.log('📝 Edit message API call successful');
      return result;
    } catch (error) {
      console.error('📝 Edit message API call failed:', error);
      throw error;
    }
  },

  // Delete a message
  async deleteMessage(messageId: string): Promise<any> {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/message/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete message');
      }
      return result;
    } catch (error) {
      throw error;
    }
  },

  // Delete multiple messages
  async deleteMessages(messageIds: string[]): Promise<any> {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/message/bulk-delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ messageIds }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete messages');
      }
      return result;
    } catch (error) {
      throw error;
    }
  },

  // Leave a group conversation
  async leaveGroup(conversationId: string): Promise<any> {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/conversation/${conversationId}/leave`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to leave group');
      }
      return result;
    } catch (error) {
      throw error;
    }
  },

  // Pin a message
  async pinMessage(messageId: string): Promise<any> {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/message/${messageId}/pin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to pin message');
      }
      return result;
    } catch (error) {
      throw error;
    }
  },

  // Unpin a message
  async unpinMessage(messageId: string): Promise<any> {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/message/${messageId}/unpin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to unpin message');
      }
      return result;
    } catch (error) {
      throw error;
    }
  },

  // Remove a member from a conversation (admin only)
  async removeMember(conversationId: string, memberId: string): Promise<any> {
    try {
      console.log('👥 removeMember(): preparing request', { conversationId, memberId });
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/conversation/${conversationId}/member`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        // Backend expects an array of strings in memberIds
        body: JSON.stringify({ memberIds: [String(memberId)] })
      });

      console.log('👥 removeMember(): response status', response.status);
      const result = await response.json();
      console.log('👥 removeMember(): response body', result);
      if (!response.ok) {
        throw new Error(result.message || 'Failed to remove member');
      }
      return result;
    } catch (error) {
      console.error('👥 removeMember(): error', error);
      throw error;
    }
  },

  // Search messages across conversations
  async searchMessages(query: string, conversationId?: string): Promise<any> {
    try {
      console.log('🔍 searchMessages(): preparing search request:', { query, conversationId });
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Use different endpoints based on whether we're searching in a specific conversation
      const url = conversationId 
        ? `${API_BASE_URL}/message/search/conversation/${conversationId}`
        : `${API_BASE_URL}/message/search`;

      const requestBody = { query };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('🔍 searchMessages(): response status:', response.status);
      const result = await response.json();
      console.log('🔍 searchMessages(): response body:', result);

      if (!response.ok) {
        throw new Error(result.message || 'Failed to search messages');
      }
      return result;
    } catch (error) {
      console.error('🔍 searchMessages(): error searching messages:', error);
      throw error;
    }
  },
};
