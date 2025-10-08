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
      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete conversation');
      }
      return result;
    } catch (error) {
      throw error;
    }
  },
};
