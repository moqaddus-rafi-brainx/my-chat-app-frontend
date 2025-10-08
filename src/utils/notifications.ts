// Simple notification system
export interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
}

class NotificationService {
  private notifications: Notification[] = [];
  private listeners: ((notifications: Notification[]) => void)[] = [];
  private processedConversations: Set<string> = new Set(); // Track processed conversations

  // Add a new notification
  addNotification(notification: Omit<Notification, 'id'>): string {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = {
      id,
      duration: 5000, // 5 seconds default
      ...notification
    };

    this.notifications.push(newNotification);
    this.notifyListeners();

    // Auto-remove after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        this.removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }

  // Add conversation notification with duplicate prevention
  addConversationNotification(conversationId: string, notification: Omit<Notification, 'id'>): string | null {
    // Check if we've already processed this conversation
    if (this.processedConversations.has(conversationId)) {
      console.log('🔄 Conversation notification already shown, skipping:', conversationId);
      return null;
    }

    // Mark as processed
    this.processedConversations.add(conversationId);
    
    // Add the notification
    const id = this.addNotification(notification);
    
    // Clean up processed conversations after 10 seconds to prevent memory leaks
    setTimeout(() => {
      this.processedConversations.delete(conversationId);
    }, 10000);

    return id;
  }

  // Remove a notification
  removeNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  // Get all notifications
  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  // Subscribe to notification changes
  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  // Clear all notifications
  clearAll(): void {
    this.notifications = [];
    this.notifyListeners();
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
