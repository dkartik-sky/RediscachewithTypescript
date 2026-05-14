/**
 * useProductHub.ts
 *
 * React Feature #8 – Custom Hook (WebSocket / SignalR)
 *
 * Manages the SignalR lifecycle: connect, subscribe, cleanup.
 * Dispatches product change events directly into the Products context.
 */

import { useEffect } from 'react';
import { productHubConnection } from '../services/signalRClient';
import type { Product } from '../types';
import { useProductsContext } from '../context/ProductsContext';

export function useProductHub() {
  const { dispatch } = useProductsContext();

  useEffect(() => {
    // Register server-to-client event handlers
    productHubConnection.on('ProductCreated', (product: Product) => {
      dispatch({ type: 'WEBSOCKET_UPDATE', payload: product });
    });

    productHubConnection.on('ProductUpdated', (product: Product) => {
      dispatch({ type: 'WEBSOCKET_UPDATE', payload: product });
    });

    productHubConnection.on('ProductDeleted', (id: number) => {
      dispatch({ type: 'WEBSOCKET_DELETE', payload: id });
    });

    // Start connection if not already connected
    if (productHubConnection.state === 'Disconnected') {
      productHubConnection
        .start()
        .then(() => console.log('[SignalR] Connected to ProductHub'))
        .catch((err) => console.error('[SignalR] Connection failed:', err));
    }

    // Cleanup: remove handlers on unmount
    return () => {
      productHubConnection.off('ProductCreated');
      productHubConnection.off('ProductUpdated');
      productHubConnection.off('ProductDeleted');
    };
  }, [dispatch]);
}
