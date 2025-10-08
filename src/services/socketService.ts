import { io, Socket } from 'socket.io-client';
import { notificationService } from '../utils/notifications';

class SocketService {
  private socket: Socket | null = null;
  private currentConversationId: string | null = null;
  private isConnecting: boolean = false;
  private token: string | null = null;
  private messageCallbacks: ((message: any) => void)[] = [];
  private conversationCallbacks: ((conversation: any) => void)[] = [];
  private joinedRooms: Set<string> = new Set(); // Track joined rooms to prevent duplicates

  // Connect to WebSocket and join all conversation rooms after login
  connectToAllConversations(conversationIds: string[]): void {
    console.log(`🔌 Connecting to all conversations:`, conversationIds);

    // Always get fresh token from localStorage to ensure we have the current user's token
    this.token = localStorage.getItem('access_token');
    if (!this.token) {
      console.warn('No authentication token found. WebSocket connection will not be established.');
      return;
    }

    console.log('🔑 Using fresh token for WebSocket connection:', this.token.substring(0, 20) + '...');

    // Prevent multiple simultaneous connections
    if (this.isConnecting) {
      console.log('Already connecting, skipping...');
      return;
    }

    this.isConnecting = true;

    // If socket exists, disconnect it first to ensure fresh connection with new token
    if (this.socket) {
      console.log('Disconnecting existing socket to ensure fresh connection...');
      this.socket.disconnect();
      this.socket = null;
    }

    // Create new connection with fresh token
    console.log('Creating new socket connection with fresh token...');
    const API_BASE_URL = 'http://localhost:4000';
    this.socket = io(API_BASE_URL, {
      auth: {
        token: this.token
      },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
    });

    // Set up event listeners
    this.setupEventListeners();

    // Join all conversation rooms when connected
    if (this.socket.connected) {
      this.joinAllConversations(conversationIds);
      this.isConnecting = false;
    } else {
      this.socket.on('connect', () => {
        console.log('✅ WebSocket connected');
        this.joinAllConversations(conversationIds);
        this.isConnecting = false;
      });
    }
  }

  // Set current conversation (rooms already joined globally)
  connectToConversation(conversationId: string): void {
    console.log(`📱 Setting current conversation: ${conversationId}`);
    
    // Just set the current conversation ID - no need to join room again
    // since we already joined all rooms in connectToAllConversations
    this.currentConversationId = conversationId;
    
    console.log(`📱 Current conversation set to: ${conversationId}`);
  }

  // Leave specific conversation room (but keep global connection)
  leaveConversation(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave_conversation', { conversationId });
      console.log(`🚪 Left conversation room: ${conversationId}`);
    }
    
    // Don't disconnect the entire socket - we want to stay connected to all rooms
    // Just clear the current conversation
    this.currentConversationId = null;
  }

  // Disconnect from all conversations (logout)
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('🔌 Disconnected from all conversations');
    }
    
    this.currentConversationId = null;
    this.joinedRooms.clear(); // Clear joined rooms tracking
    this.token = null; // Clear cached token
    // Clear all callbacks on disconnect
    this.clearAllCallbacks();
  }

  // Refresh token for existing connection
  refreshToken(): void {
    const newToken = localStorage.getItem('access_token');
    if (newToken && this.socket) {
      this.token = newToken;
      console.log('🔑 Token refreshed for WebSocket connection');
    }
  }


  // Join all conversation rooms
  private joinAllConversations(conversationIds: string[]): void {
    if (this.socket?.connected) {
      const newRooms: string[] = [];
      
      conversationIds.forEach(conversationId => {
        if (!this.joinedRooms.has(conversationId)) {
          this.socket!.emit('join_conversation', { conversationId });
          this.joinedRooms.add(conversationId);
          newRooms.push(conversationId);
          console.log(`🏠 Joined conversation: ${conversationId}`);
        } else {
          console.log(`🏠 Already joined conversation: ${conversationId}`);
        }
      });
      
      if (newRooms.length > 0) {
        console.log(`🏠 Joined ${newRooms.length} new conversations (${this.joinedRooms.size} total)`);
      } else {
        console.log(`🏠 All ${conversationIds.length} conversations already joined`);
      }
    }
  }

  // Join a specific conversation room
  joinConversationRoom(conversationId: string): void {
    if (this.socket?.connected) {
      if (!this.joinedRooms.has(conversationId)) {
        this.socket.emit('join_conversation', { conversationId });
        this.joinedRooms.add(conversationId);
        console.log(`🏠 Joined new conversation room: ${conversationId}`);
        console.log(`🏠 Total joined rooms: ${this.joinedRooms.size}`);
      } else {
        console.log(`🏠 Already joined conversation room: ${conversationId}`);
      }
    } else {
      console.warn('🏠 Cannot join room - socket not connected');
    }
  }

  // Send message
  sendMessage(conversationId: string, content: string): void {
    if (this.socket?.connected) {
      this.socket.emit('send_message', { conversationId, content });
      console.log('📤 Message sent:', content);
    } else {
      console.warn('Socket not connected');
    }
  }

  // Listen for new messages
  onNewMessage(callback: (message: any) => void): void {
    console.log('🔧 Setting up new_message listener...');
    
    // Check if callback already exists to prevent duplicates
    const callbackExists = this.messageCallbacks.includes(callback);
    if (callbackExists) {
      console.log('⚠️ Callback already exists, skipping duplicate registration');
      return;
    }
    
    // Add the callback to the array
    this.messageCallbacks.push(callback);
    console.log('🔧 Callback added, total callbacks:', this.messageCallbacks.length);
  }

  // Remove a specific callback
  removeMessageCallback(callback: (message: any) => void): void {
    const index = this.messageCallbacks.indexOf(callback);
    if (index > -1) {
      this.messageCallbacks.splice(index, 1);
      console.log('🔧 Callback removed, total callbacks:', this.messageCallbacks.length);
    }
  }

  // Clear all callbacks
  clearAllCallbacks(): void {
    this.messageCallbacks = [];
    console.log('🔧 All callbacks cleared');
  }

  // Get callback count for debugging
  getCallbackCount(): number {
    return this.messageCallbacks.length;
  }

  // Add conversation callback
  onNewConversation(callback: (conversation: any) => void): void {
    this.conversationCallbacks.push(callback);
    console.log(`📞 Added conversation callback. Total callbacks: ${this.conversationCallbacks.length}`);
  }

  // Remove conversation callback
  removeConversationCallback(callback: (conversation: any) => void): void {
    this.conversationCallbacks = this.conversationCallbacks.filter(cb => cb !== callback);
    console.log(`📞 Removed conversation callback. Total callbacks: ${this.conversationCallbacks.length}`);
  }

  // Listen for connection events
  onConnection(callback: () => void): void {
    if (this.socket) {
      this.socket.on('connect', callback);
    }
  }

  // Listen for disconnection events
  onDisconnection(callback: () => void): void {
    if (this.socket) {
      this.socket.on('disconnect', callback);
    }
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Check if connected to specific conversation
  isConnectedToConversation(conversationId: string): boolean {
    return Boolean(this.socket?.connected && this.currentConversationId === conversationId);
  }

  // Get current conversation ID
  getCurrentConversationId(): string | null {
    return this.currentConversationId;
  }


  // Get joined rooms for debugging
  getJoinedRooms(): string[] {
    return Array.from(this.joinedRooms);
  }

  // Check if a specific room is joined
  isRoomJoined(conversationId: string): boolean {
    return this.joinedRooms.has(conversationId);
  }

  // Show notification for new conversation
  private showNewConversationNotification(conversation: any): void {
    const conversationId = conversation._id;
    const conversationName = conversation.name || 'New Group';
    const memberCount = conversation.members?.length || 0;
    
    // Use duplicate-prevention method
    notificationService.addConversationNotification(conversationId, {
      type: 'success',
      title: 'New Group Created',
      message: `"${conversationName}" with ${memberCount} members`,
      duration: 5000
    });
  }

  // Show notification for first message in direct conversation
  private showFirstMessageNotification(conversation: any, message: any): void {
    const conversationId = conversation._id;
    const senderName = message.senderId?.name || 'Someone';
    const messageContent = message.content || 'New message';
    
    // Use duplicate-prevention method
    notificationService.addConversationNotification(conversationId, {
      type: 'info',
      title: `New Message from ${senderName}`,
      message: messageContent,
      duration: 5000
    });
  }

  // Set up event listeners
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🚨 WebSocket connection error:', error);
    });

    this.socket.on('joined_conversation', (data) => {
      console.log('✅ Joined conversation:', data);
    });

    this.socket.on('authenticated', () => {
      console.log('✅ WebSocket authenticated successfully');
    });

    this.socket.on('unauthorized', (error) => {
      console.error('❌ WebSocket authentication failed:', error);
    });

    // Debug: Listen for all events
    this.socket.onAny((eventName, ...args) => {
      console.log('🔍 Socket event received:', eventName, args);
    });

    // Set up new_message listener immediately
    this.socket.on('new_message', (message) => {
      console.log('📨 Received new_message event:', message);
      console.log('📨 Message type:', typeof message);
      console.log('📨 Message content:', message?.content || message?.data?.content);
      console.log('📨 Message sender:', message?.senderId || message?.data?.senderId);
      console.log('📨 Conversation ID:', message?.conversationId || message?.data?.conversationId);
      console.log('📨 Full message object:', JSON.stringify(message, null, 2));
      console.log('📨 Total registered callbacks:', this.messageCallbacks.length);
      console.log('📨 Callbacks:', this.messageCallbacks);
      
      this.messageCallbacks.forEach((callback, index) => {
        try {
          console.log(`📨 Calling callback ${index + 1}:`, callback);
          callback(message);
          console.log(`📨 Callback ${index + 1} completed successfully`);
        } catch (error) {
          console.error(`🔔 Error calling callback ${index + 1}:`, error);
        }
      });
    });

    // Set up new_conversation listener
    this.socket.on('new_conversation', (data) => {
      console.log('🆕 Socket received new_conversation event:', data);
      console.log('🆕 Event type:', typeof data);
      console.log('🆕 Is array:', Array.isArray(data));
      console.log('🆕 Success:', data?.success);
      console.log('🆕 Message:', data?.message);
      console.log('🆕 Data:', data?.data);
      if (data?.data) {
        console.log('🆕 Conversation ID:', data.data._id);
        console.log('🆕 Conversation type:', data.data.type);
        console.log('🆕 Conversation name:', data.data.name);
        console.log('🆕 Members count:', data.data.members?.length);
        console.log('🆕 Members:', data.data.members?.map((m: any) => ({ id: m._id, name: m.name })));
        
        // Show notification for new conversation
        this.showNewConversationNotification(data.data);
        
        // Call all conversation callbacks
        this.conversationCallbacks.forEach((callback, index) => {
          try {
            callback(data.data);
            console.log(`🆕 Conversation callback ${index + 1} called successfully`);
          } catch (error) {
            console.error(`🆕 Error calling conversation callback ${index + 1}:`, error);
          }
        });
      }
    });

    // Set up first_message listener (for new direct conversations)
    this.socket.on('first_message', (data) => {
      console.log('💬 Socket received first_message event:', data);
      console.log('💬 Event type:', typeof data);
      console.log('💬 Success:', data?.success);
      console.log('💬 Message:', data?.message);
      console.log('💬 Data:', data?.data);
      
      if (data?.success && data?.data) {
        const { conversation, message } = data.data;
        console.log('💬 Conversation ID:', conversation._id);
        console.log('💬 Conversation type:', conversation.type);
        console.log('💬 Message content:', message.content);
        console.log('💬 Message sender:', message.senderId);
        
        // Show notification for first message
        this.showFirstMessageNotification(conversation, message);
        
        // Call all conversation callbacks with the conversation data and message info
        this.conversationCallbacks.forEach((callback, index) => {
          try {
            // Pass conversation data with message info for sender checking
            const conversationWithMessage = {
              ...conversation,
              message: message
            };
            callback(conversationWithMessage);
            console.log(`💬 First message conversation callback ${index + 1} called successfully`);
          } catch (error) {
            console.error(`💬 Error calling first message conversation callback ${index + 1}:`, error);
          }
        });
      }
    });
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
