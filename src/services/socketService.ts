import { io, Socket } from 'socket.io-client';
import { notificationService } from '../utils/notifications';

class SocketService {
  public socket: Socket | null = null;
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
    const API_BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:4000';
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
    console.log('🏠 joinAllConversations called with:', conversationIds);
    console.log('🏠 Socket connected:', this.socket?.connected);
    console.log('🏠 Socket ID:', this.socket?.id);
    console.log('🏠 Current joined rooms:', Array.from(this.joinedRooms));
    
    if (this.socket?.connected) {
      const newRooms: string[] = [];
      
      conversationIds.forEach(conversationId => {
        if (!this.joinedRooms.has(conversationId)) {
          console.log(`🏠 Emitting join_conversation for: ${conversationId}`);
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
    } else {
      console.log('⚠️ Cannot join conversations: socket not connected');
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

  // Emit typing event
  emitTyping(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('typing', { conversationId });
      console.log('⌨️ Typing event emitted for conversation:', conversationId);
    } else {
      console.warn('Socket not connected - cannot emit typing event');
    }
  }

  // Emit stop typing event
  emitStopTyping(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('stop_typing', { conversationId });
      console.log('⌨️ Stop typing event emitted for conversation:', conversationId);
    } else {
      console.warn('Socket not connected - cannot emit stop typing event');
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

  // Test function to manually trigger conversation deletion (for debugging)
  testConversationDeleted(): void {
    console.log('🧪 Testing conversation_deleted event manually...');
    const testData = {
      success: true,
      message: 'Conversation deleted by admin',
      data: {
        conversationId: 'test-conversation-id',
        conversationName: 'Test Group',
        conversationType: 'group',
        deletedBy: 'other-user-id'
      }
    };
    
    // Manually trigger the event handler
    this.socket?.emit('conversation_deleted', testData);
    
    // Also call the handler directly
    console.log('🧪 Calling conversation_deleted handler directly...');
    this.handleConversationDeleted(testData);
  }

  // Extract the conversation_deleted handler for testing
  private handleConversationDeleted(data: any): void {
    console.log('🗑️ Socket received conversation_deleted event:', data);
    
    if (data?.success && data?.data) {
      const { conversationId, conversationName, conversationType, deletedBy } = data.data;
      console.log('🗑️ Processing deletion:', { conversationId, conversationName, deletedBy });
      
      // Get current user ID from token
      const currentUserId = this.getCurrentUserId();
      console.log('🗑️ Current user ID:', currentUserId);
      console.log('🗑️ Deleted by ID:', deletedBy);
      console.log('🗑️ ID comparison:', {
        currentUserId,
        deletedBy,
        areEqual: currentUserId === deletedBy,
        currentUserIdType: typeof currentUserId,
        deletedByType: typeof deletedBy
      });
      
      // Only show notification if not deleted by current user
      if (currentUserId && deletedBy !== currentUserId) {
        console.log('🗑️ Showing notification for other user');
        this.showConversationDeletedNotification(conversationName, deletedBy);
      } else {
        console.log('🗑️ Skipping notification - conversation deleted by current user');
        console.log('🗑️ This means the current user deleted the group themselves');
        
        // TEMPORARY: Force show notification for testing
        console.log('🧪 TEMPORARY: Forcing notification to show for testing');
        this.showConversationDeletedNotification(conversationName, deletedBy);
      }
      
      // Call all conversation callbacks with deletion data
      this.conversationCallbacks.forEach((callback, index) => {
        try {
          callback({
            type: 'deleted',
            conversationId,
            conversationName,
            conversationType,
            deletedBy
          });
          console.log(`🗑️ Conversation deletion callback ${index + 1} called successfully`);
        } catch (error) {
          console.error(`🗑️ Error calling conversation deletion callback ${index + 1}:`, error);
        }
      });
    }
  }

  // Check if socket is connected
  isSocketConnected(): boolean {
    return this.socket ? this.socket.connected : false;
  }

  // Reconnect socket if disconnected
  async reconnectIfNeeded(): Promise<void> {
    if (!this.socket || !this.socket.connected) {
      console.log('🔄 Socket disconnected, attempting to reconnect...');
      try {
        // Get all conversations and reconnect
        const { conversationService } = await import('../services/conversationService');
        const response = await conversationService.getConversations();
        
        if (response.success && response.data) {
          const conversationIds = response.data.map(conv => conv._id);
          this.connectToAllConversations(conversationIds);
          console.log('🔄 Socket reconnected successfully');
        }
      } catch (error) {
        console.error('🔄 Failed to reconnect socket:', error);
      }
    }
  }

  // Rejoin all conversations (used on reconnection)
  private async rejoinAllConversations(): Promise<void> {
    try {
      console.log('🔄 Rejoining all conversations after reconnection...');
      
      // Get all conversations from the conversation service
      const { conversationService } = await import('../services/conversationService');
      const response = await conversationService.getConversations();
      
      if (response.success && response.data) {
        const conversationIds = response.data.map(conv => conv._id);
        console.log('🔄 Found conversations to rejoin:', conversationIds);
        
        // Join all conversations
        this.joinAllConversations(conversationIds);
      } else {
        console.log('🔄 No conversations found to rejoin');
      }
    } catch (error) {
      console.error('🔄 Error rejoining conversations:', error);
    }
  }

  // Get current user ID from token
  private getCurrentUserId(): string | null {
    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        return null;
      }
      
      // Decode JWT token to get user ID
      const tokenParts = token.split('.');
      
      if (tokenParts.length !== 3) {
        return null;
      }
      
      const payload = JSON.parse(atob(tokenParts[1]));
      
      // Try multiple possible user ID fields
      const userId = payload.id || payload.userId || payload._id || payload.sub || payload.user_id;
      
      if (!userId) {
        return null;
      }
      
      return userId.toString();
    } catch (error) {
      console.error('🔍 Error getting current user ID from token:', error);
      return null;
    }
  }

  // Show notification for conversation deletion
  private showConversationDeletedNotification(conversationName: string, deletedBy: string): void {
    try {
      console.log('🗑️ Attempting to show notification for:', conversationName);
      
      const notificationId = notificationService.addNotification({
        type: 'info',
        title: 'Group Deleted',
        message: `"${conversationName}" was deleted by Admin`
      });
      console.log('🗑️ Notification added with ID:', notificationId);
      console.log('🗑️ Notification for conversation deleted by:', deletedBy);
    } catch (error) {
      console.error('Error showing conversation deleted notification:', error);
    }
  }


  // Fetch user left notification with admin logic
  private async fetchUserLeftNotificationWithAdmin(
    conversationId: string, 
    leftByUserId: string, 
    wasAdmin: boolean, 
    newAdminId: string | null, 
    currentUserId: string | null
  ): Promise<{ leftUserName: string; conversationName: string; adminMessage?: string } | null> {
    try {
      // Import conversationService dynamically to avoid circular imports
      const { conversationService } = await import('../services/conversationService');
      
      // Get all conversations to find the one with the user who left
      const response = await conversationService.getConversations();
      
      // Find the conversation
      const conversation = response.data.find(conv => conv._id === conversationId);
      if (!conversation) {
        console.log('👋 Conversation not found:', conversationId);
        return null;
      }
      
      const conversationName = conversation.name || 'Direct chat';
      
      // Find the user who left in the conversation members
      const leftUser = conversation.members.find((member: any) => 
        member._id === leftByUserId || member.id === leftByUserId
      );
      
      let leftUserName = 'A member';
      
      if (leftUser) {
        leftUserName = leftUser.name || 'Unknown';
      }
      
      // Handle admin transfer logic
      let adminMessage: string | undefined;
      
      if (wasAdmin && newAdminId) {
        if (currentUserId && newAdminId === currentUserId) {
          // Current user is the new admin
          adminMessage = 'You are the new admin';
          console.log('👋 You are the new admin');
        } else {
          // Find the new admin's name
          const newAdmin = conversation.members.find((member: any) => 
            member._id === newAdminId || member.id === newAdminId
          );
          
          if (newAdmin) {
            adminMessage = `${newAdmin.name} is the new admin`;
            console.log('👋 New admin:', newAdmin.name);
          } else {
            adminMessage = 'Admin role transferred';
          }
        }
      }
      
      return {
        leftUserName,
        conversationName,
        adminMessage
      };
    } catch (error) {
      console.error('👋 Error fetching user left notification with admin details:', error);
      return null;
    }
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
      console.log('✅ Socket ID:', this.socket?.id);
      console.log('✅ Connected at:', new Date().toISOString());
      
      // Rejoin all conversations on reconnection
      this.rejoinAllConversations();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      console.log('❌ Disconnected at:', new Date().toISOString());
      
      // Clear joined rooms on disconnect so we rejoin them on reconnect
      console.log('❌ Clearing joined rooms:', Array.from(this.joinedRooms));
      this.joinedRooms.clear();
    });

    this.socket.on('connect_error', (error) => {
      console.error('🚨 WebSocket connection error:', error);
      console.error('🚨 Connection error at:', new Date().toISOString());
    });

    // Debug: Log all socket events to see what's being received
    this.socket.onAny((eventName, ...args) => {
      console.log(`🔍 Socket event received: ${eventName}`, args);
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
      if (eventName === 'conversation_deleted') {
        console.log('🗑️ conversation_deleted event detected via onAny!');
      }
      if (eventName === 'user_left_group') {
        console.log('👋 user_left_group event detected via onAny!');
        console.log('👋 onAny args:', args);
      }
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

    // Set up conversation_deleted listener
    this.socket.on('conversation_deleted', (data) => {
      console.log('🗑️ Socket received conversation_deleted event via socket.on');
      this.handleConversationDeleted(data);
    });

    // Set up user_left_group listener
    this.socket.on('user_left_group', (data) => {
      console.log('👋 USER_LEFT_GROUP EVENT RECEIVED');
      
      if (data?.success && data?.data) {
        const { conversationId, leftMembers, leftBy, wasAdmin, newAdminId } = data.data;
        console.log('👋 Data:', { conversationId, leftBy, wasAdmin, newAdminId });
        
        // Get current user ID from token
        const currentUserId = this.getCurrentUserId();
        console.log('👋 Current user ID:', currentUserId);
        
        // Call all conversation callbacks with user left data
        this.conversationCallbacks.forEach((callback, index) => {
          try {
            const callbackData = {
              type: 'user_left',
              conversationId,
              leftMembers,
              leftBy,
              wasAdmin,
              newAdminId,
              isCurrentUser: currentUserId === leftBy
            };
            callback(callbackData);
          } catch (error) {
            console.error(`👋 Error calling user left group callback ${index + 1}:`, error);
          }
        });

        // Show notification for user left event
        this.fetchUserLeftNotificationWithAdmin(conversationId, leftBy, wasAdmin, newAdminId, currentUserId).then((result) => {
          if (result) {
            const { leftUserName, conversationName, adminMessage } = result;
            
            // Build the main message
            let message = `${leftUserName} left "${conversationName}"`;
            
            // Add admin transfer message if applicable
            if (adminMessage) {
              message += ` - ${adminMessage}`;
            }
            
            const notificationData = {
              type: 'info' as const,
              title: 'Member Left Group',
              message: message
            };
            console.log('👋 NOTIFICATION:', notificationData);
            notificationService.addNotification(notificationData);
          } else {
            // Fallback notification
            const notificationData = {
              type: 'info' as const,
              title: 'Member Left Group',
              message: 'A member left the group'
            };
            console.log('👋 FALLBACK NOTIFICATION:', notificationData);
            notificationService.addNotification(notificationData);
          }
        }).catch((error) => {
          console.error('👋 Error fetching user details:', error);
          // Fallback notification
          const notificationData = {
            type: 'info' as const,
            title: 'Member Left Group',
            message: 'A member left the group'
          };
          notificationService.addNotification(notificationData);
        });
      } else {
        console.log('👋 Invalid event data structure:', data);
      }
    });

    // Set up message_edited listener
    this.socket.on('message_edited', (data) => {
      console.log('✏️ MESSAGE_EDITED EVENT RECEIVED');
      console.log('✏️ Socket connected:', this.socket?.connected);
      console.log('✏️ Socket ID:', this.socket?.id);
      console.log('✏️ Event received at:', new Date().toISOString());
      console.log('✏️ Raw event data:', JSON.stringify(data, null, 2));
      
      if (data?.success && data?.data) {
        const { messageId, conversationId, content, editedBy, editedAt } = data.data;
        console.log('✏️ Data:', { messageId, conversationId, content, editedBy, editedAt });
        
        // Call all conversation callbacks with message edited data
        this.conversationCallbacks.forEach((callback, index) => {
          try {
            const callbackData = {
              type: 'message_edited',
              messageId,
              conversationId,
              content,
              editedBy,
              editedAt
            };
            callback(callbackData);
            console.log(`✏️ Message edited callback ${index + 1} executed successfully`);
          } catch (error) {
            console.error(`✏️ Error calling message edited callback ${index + 1}:`, error);
          }
        });
      } else {
        console.log('✏️ Invalid message edited event data structure:', data);
      }
    });

    // Set up message_deleted listener
    this.socket.on('message_deleted', (data) => {
      console.log('🗑️ MESSAGE_DELETED EVENT RECEIVED');
      console.log('🗑️ Socket connected:', this.socket?.connected);
      console.log('🗑️ Socket ID:', this.socket?.id);
      console.log('🗑️ Event received at:', new Date().toISOString());
      console.log('🗑️ Raw event data:', JSON.stringify(data, null, 2));
      
      if (data?.success && data?.data) {
        const { messageId, conversationId, deletedBy } = data.data;
        console.log('🗑️ Data:', { messageId, conversationId, deletedBy });
        
        // Call all conversation callbacks with message deleted data
        this.conversationCallbacks.forEach((callback, index) => {
          try {
            const callbackData = {
              type: 'message_deleted',
              messageId,
              conversationId,
              deletedBy
            };
            callback(callbackData);
            console.log(`🗑️ Message deleted callback ${index + 1} executed successfully`);
          } catch (error) {
            console.error(`🗑️ Error calling message deleted callback ${index + 1}:`, error);
          }
        });
      } else {
        console.log('🗑️ Invalid message deleted event data structure:', data);
      }
    });

    // Set up message_pinned listener
    this.socket.on('message_pinned', (data) => {
      console.log('📌 MESSAGE_PINNED EVENT RECEIVED');
      console.log('📌 Socket connected:', this.socket?.connected);
      console.log('📌 Socket ID:', this.socket?.id);
      console.log('📌 Event received at:', new Date().toISOString());
      console.log('📌 Raw event data:', JSON.stringify(data, null, 2));

      if (data?.success && data?.data) {
        const { messageId, conversationId, pinnedBy, is_pinned, updatedAt } = data.data;
        console.log('📌 Data:', { messageId, conversationId, pinnedBy, is_pinned, updatedAt });

        this.conversationCallbacks.forEach((callback, index) => {
          try {
            const callbackData = {
              type: 'message_pinned',
              messageId,
              conversationId,
              pinnedBy,
              is_pinned: Boolean(is_pinned),
              updatedAt
            };
            callback(callbackData);
            console.log(`📌 Message pinned callback ${index + 1} executed successfully`);
          } catch (error) {
            console.error(`📌 Error calling message pinned callback ${index + 1}:`, error);
          }
        });
      } else {
        console.log('📌 Invalid message pinned event data structure:', data);
      }
    });

    // Set up message_unpinned listener
    this.socket.on('message_unpinned', (data) => {
      console.log('📌 MESSAGE_UNPINNED EVENT RECEIVED');
      console.log('📌 Socket connected:', this.socket?.connected);
      console.log('📌 Socket ID:', this.socket?.id);
      console.log('📌 Event received at:', new Date().toISOString());
      console.log('📌 Raw event data:', JSON.stringify(data, null, 2));

      if (data?.success && data?.data) {
        const { messageId, conversationId, unpinnedBy, is_pinned, updatedAt } = data.data;
        console.log('📌 Unpinned Data:', { messageId, conversationId, unpinnedBy, is_pinned, updatedAt });

        this.conversationCallbacks.forEach((callback, index) => {
          try {
            const callbackData = {
              type: 'message_unpinned',
              messageId,
              conversationId,
              unpinnedBy,
              is_pinned: Boolean(is_pinned),
              updatedAt
            };
            callback(callbackData);
            console.log(`📌 Message unpinned callback ${index + 1} executed successfully`);
          } catch (error) {
            console.error(`📌 Error calling message unpinned callback ${index + 1}:`, error);
          }
        });
      } else {
        console.log('📌 Invalid message unpinned event data structure:', data);
      }
    });

    // Set up member_removed listener (sent to removed user)
    this.socket.on('member_removed', (data) => {
      console.log('👥 MEMBER_REMOVED EVENT RECEIVED');
      console.log('👥 Raw event data:', JSON.stringify(data, null, 2));
      if (data?.success && data?.data) {
        const { conversationId, removedBy } = data.data;
        this.conversationCallbacks.forEach((callback, index) => {
          try {
            callback({ type: 'member_removed', conversationId, removedBy });
          } catch (e) {
            console.error('👥 Error notifying member_removed callback', index + 1, e);
          }
        });
      } else {
        console.log('👥 Invalid member_removed event data structure:', data);
      }
    });
    // Set up typing event listeners
    this.socket.on('user_typing', (data) => {
      console.log('⌨️ USER_TYPING EVENT RECEIVED');
      console.log('⌨️ Socket connected:', this.socket?.connected);
      console.log('⌨️ Socket ID:', this.socket?.id);
      console.log('⌨️ Event received at:', new Date().toISOString());
      console.log('⌨️ Raw event data:', JSON.stringify(data, null, 2));
      
      if (data?.success && data?.data) {
        const { userId, userName, conversationId } = data.data;
        console.log('⌨️ User typing data extracted:', { userId, userName, conversationId });
        console.log('⌨️ userName type:', typeof userName, 'value:', userName);
        
        // Call all conversation callbacks with typing data
        this.conversationCallbacks.forEach((callback, index) => {
          try {
            const callbackData = {
              type: 'typing',
              userId,
              userName,
              conversationId
            };
            callback(callbackData);
            console.log(`⌨️ Typing callback ${index + 1} executed successfully with data:`, callbackData);
          } catch (error) {
            console.error(`⌨️ Error calling typing callback ${index + 1}:`, error);
          }
        });
      } else {
        console.log('⌨️ Invalid user typing event data structure:', data);
        console.log('⌨️ data.success:', data?.success);
        console.log('⌨️ data.data:', data?.data);
      }
    });

    this.socket.on('user_stopped_typing', (data) => {
      console.log('⌨️ USER_STOPPED_TYPING EVENT RECEIVED');
      console.log('⌨️ Socket connected:', this.socket?.connected);
      console.log('⌨️ Socket ID:', this.socket?.id);
      console.log('⌨️ Event received at:', new Date().toISOString());
      console.log('⌨️ Raw event data:', JSON.stringify(data, null, 2));
      
      if (data?.success && data?.data) {
        const { userId, userName, conversationId } = data.data;
        console.log('⌨️ User stopped typing data extracted:', { userId, userName, conversationId });
        console.log('⌨️ userName type:', typeof userName, 'value:', userName);
        
        // Call all conversation callbacks with stop typing data
        this.conversationCallbacks.forEach((callback, index) => {
          try {
            const callbackData = {
              type: 'stop_typing',
              userId,
              userName,
              conversationId
            };
            callback(callbackData);
            console.log(`⌨️ Stop typing callback ${index + 1} executed successfully with data:`, callbackData);
          } catch (error) {
            console.error(`⌨️ Error calling stop typing callback ${index + 1}:`, error);
          }
        });
      } else {
        console.log('⌨️ Invalid user stopped typing event data structure:', data);
        console.log('⌨️ data.success:', data?.success);
        console.log('⌨️ data.data:', data?.data);
      }
    });
  }
}

// Export singleton instance
export const socketService = new SocketService();

// Expose test function globally for debugging
(window as any).testConversationDeleted = () => {
  socketService.testConversationDeleted();
};

// Expose test function for user_left_group event
(window as any).testUserLeftGroup = () => {
  console.log('🧪 Testing user_left_group event manually...');
  const testData = {
    success: true,
    message: 'A user has left the conversation',
    data: {
      conversationId: 'test-conversation-id',
      leftMembers: [{ name: 'Test User', _id: 'test-user-id' }],
      leftBy: 'test-user-id',
      wasAdmin: false,
      newAdminId: null
    }
  };
  
  // Manually trigger the event handler
  console.log('🧪 Manually triggering user_left_group event with data:', testData);
  
  // Simulate the event by calling the handler directly
  if (socketService.socket) {
    socketService.socket.emit('user_left_group', testData);
  }
};

export default socketService;
