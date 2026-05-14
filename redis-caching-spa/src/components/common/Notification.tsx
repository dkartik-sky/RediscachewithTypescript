/**
 * Notification.tsx
 *
 * React Feature #13 – Portals (toast notifications)
 *
 * Renders toast notifications in a fixed overlay via createPortal,
 * independent of component tree positioning.
 */

import { createPortal } from 'react-dom';
import type { Notification } from '../../types';

interface Props {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

export function NotificationContainer({ notifications, onRemove }: Props) {
  if (notifications.length === 0) return null;

  return createPortal(
    <div className="notification-container">
      {notifications.map((n) => (
        <div key={n.id} className={`notification notification--${n.type}`}>
          <span>{n.message}</span>
          <button onClick={() => onRemove(n.id)} aria-label="Dismiss">✕</button>
        </div>
      ))}
    </div>,
    document.body
  );
}
