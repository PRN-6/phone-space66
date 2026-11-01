import { webSocketService } from './webSocketService';
import { useNotificationStore } from '../stores/notificationStore';
import {
  PhoneNotification,
  NotificationDismissPayload,
  NotificationListResponsePayload,
} from '../types/protocol';

class NotificationService {
  public refreshNotifications() {
    webSocketService.sendMessage('NOTIFICATION_LIST_REQUEST', {});
  }

  public dismissNotification(notificationId: string) {
    useNotificationStore.getState().removeNotification(notificationId);
    const payload: NotificationDismissPayload = { notificationId };
    webSocketService.sendMessage('NOTIFICATION_DISMISS_REQUEST', payload);
  }

  public handleNotificationListResponse(payload: NotificationListResponsePayload) {
    useNotificationStore.getState().setNotifications(payload.notifications || []);
  }

  public handleNotificationPosted(notification: PhoneNotification) {
    useNotificationStore.getState().addNotification(notification);
  }

  public handleNotificationRemoved(notificationId: string) {
    useNotificationStore.getState().removeNotification(notificationId);
  }
}

export const notificationService = new NotificationService();

