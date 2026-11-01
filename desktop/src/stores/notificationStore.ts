import { create } from 'zustand';
import { PhoneNotification } from '../types/protocol';

interface NotificationState {
  notifications: PhoneNotification[];
  unreadCount: number;
  isDrawerOpen: boolean;

  setNotifications: (list: PhoneNotification[]) => void;
  addNotification: (notif: PhoneNotification) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  toggleDrawer: (open?: boolean) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isDrawerOpen: false,

  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.length,
    }),

  addNotification: (notif) =>
    set((state) => {
      const filtered = state.notifications.filter((n) => n.id !== notif.id);
      return {
        notifications: [notif, ...filtered],
        unreadCount: state.unreadCount + 1,
      };
    }),

  removeNotification: (id) =>
    set((state) => {
      const nextList = state.notifications.filter((n) => n.id !== id);
      return {
        notifications: nextList,
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    }),

  clearAll: () =>
    set({
      notifications: [],
      unreadCount: 0,
    }),

  toggleDrawer: (open) =>
    set((state) => ({
      isDrawerOpen: open !== undefined ? open : !state.isDrawerOpen,
      unreadCount: (open === true || (open === undefined && !state.isDrawerOpen)) ? 0 : state.unreadCount,
    })),
}));

