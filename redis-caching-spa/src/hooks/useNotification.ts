/**
 * useNotification.ts
 *
 * React Feature #8 – Custom Hook
 *
 * Manages transient toast notifications shown via a Portal.
 */

import { useCallback, useState } from 'react';
import type { Notification } from '../types';

export function useNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback(
    (message: string, type: Notification['type'] = 'info') => {
      const id = crypto.randomUUID();
      setNotifications((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 3500);
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return { notifications, addNotification, removeNotification };
}
