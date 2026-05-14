/**
 * signalRClient.ts
 *
 * Singleton SignalR connection to the .NET ProductHub.
 * Shared across the app so only one WS connection is opened.
 */

import * as signalR from '@microsoft/signalr';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5168';

export const productHubConnection = new signalR.HubConnectionBuilder()
  .withUrl(`${BASE_URL}/hubs/products`)
  .withAutomaticReconnect()
  .configureLogging(signalR.LogLevel.Information)
  .build();
