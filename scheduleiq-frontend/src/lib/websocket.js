import { useEffect } from 'react';

/**
 * Custom Hook to connect to Spring Boot STOMP WebSocket endpoint
 * without needing external stompjs/sockjs npm dependencies.
 * Automatically handles CONNECT, SUBSCRIBE, MESSAGE parsing, and auto-reconnection.
 */
export function useWebSocketAlerts(onAlertReceived) {
  useEffect(() => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    // Map HTTP/S scheme to WS/S scheme
    const wsUrl = apiBaseUrl.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws/websocket';
    
    let socket = null;
    let keepAliveInterval = null;
    let active = true;
    
    const connect = () => {
      if (!active) return;
      console.log('Connecting to ScheduleIQ WebSocket Alerts Stream:', wsUrl);
      
      socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        if (!active) {
          socket.close();
          return;
        }
        console.log('WebSocket connected. Handshaking STOMP protocol...');
        // Send CONNECT frame
        socket.send("CONNECT\naccept-version:1.1,1.0\nheart-beat:10000,10000\n\n\u0000");
        
        // Setup keep-alive ping heartbeats every 10s to keep connection alive
        keepAliveInterval = setInterval(() => {
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send("\n"); // STOMP blank line heartbeat
          }
        }, 10000);
      };
      
      socket.onmessage = (event) => {
        const data = event.data;
        
        if (data.startsWith('CONNECTED')) {
          console.log('STOMP handshake completed. Subscribing to /topic/alerts...');
          // Send SUBSCRIBE frame to match backend topic
          socket.send("SUBSCRIBE\nid:sub-0\ndestination:/topic/alerts\n\n\u0000");
        } 
        else if (data.startsWith('MESSAGE')) {
          // Extract body content between double newline and null character (\u0000)
          const bodyIndex = data.indexOf('\n\n');
          if (bodyIndex !== -1) {
            const body = data.substring(bodyIndex + 2, data.lastIndexOf('\u0000')).trim();
            try {
              const alertObj = JSON.parse(body);
              if (active) {
                onAlertReceived(alertObj);
              }
            } catch (e) {
              console.warn('Failed to parse WebSocket JSON payload:', e);
            }
          }
        }
      };
      
      socket.onerror = (err) => {
        console.error('WebSocket connection error:', err);
      };
      
      socket.onclose = () => {
        clearInterval(keepAliveInterval);
        if (active) {
          console.log('WebSocket connection severed. Attempting reconnect in 5s...');
          setTimeout(connect, 5000);
        }
      };
    };
    
    connect();
    
    return () => {
      active = false;
      clearInterval(keepAliveInterval);
      if (socket) {
        socket.close();
      }
    };
  }, [onAlertReceived]);
}
