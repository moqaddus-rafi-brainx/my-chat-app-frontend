import React, { useState, useEffect } from 'react';
import { notificationService, Notification } from '../utils/notifications';

const NotificationToast: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    console.log('🔔 NotificationToast: Setting up subscription');
    const unsubscribe = notificationService.subscribe((notifications) => {
      console.log('🔔 NotificationToast: Received notifications:', notifications);
      setNotifications(notifications);
    });
    return unsubscribe;
  }, []);

  const handleRemove = (id: string) => {
    notificationService.removeNotification(id);
  };

  console.log('🔔 NotificationToast render - notifications count:', notifications.length);
  console.log('🔔 NotificationToast render - notifications:', notifications);

  if (notifications.length === 0) {
    console.log('🔔 NotificationToast: No notifications to display');
    return null;
  }

  console.log('🔔 NotificationToast: Rendering notifications');
  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type}`}
          onClick={() => handleRemove(notification.id)}
        >
          <div className="notification-content">
            <div className="notification-title">{notification.title}</div>
            <div className="notification-message">{notification.message}</div>
          </div>
          <button
            className="notification-close"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove(notification.id);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;
