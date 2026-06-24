import { useEffect, useRef, useCallback } from 'react';

// ────────────────────────────────────────────────────────────────────────────
// ScheduleIQ v2.0 — Real-time WebSocket Client
//
// Custom hooks that connect to Spring Boot STOMP WebSocket without needing
// external stompjs/sockjs npm dependencies. Each hook handles its own
// subscription topic with auto-reconnect logic.
// ────────────────────────────────────────────────────────────────────────────

const WS_URL = (() => {
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
  return base.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws/websocket';
})();

/**
 * Core WebSocket connection factory.
 * Returns a cleanup function when done.
 */
function createStompConnection(url, topic, onMessage) {
  let socket = null;
  let keepAliveInterval = null;
  let active = true;
  let subId = `sub-${topic.replace(/\//g, '-')}-${Date.now()}`;

  const connect = () => {
    if (!active) return;
    socket = new WebSocket(url);

    socket.onopen = () => {
      if (!active) { socket.close(); return; }
      // STOMP CONNECT frame
      socket.send("CONNECT\naccept-version:1.1,1.0\nheart-beat:20000,20000\n\n\0");

      // Heartbeat ping every 20s
      keepAliveInterval = setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send('\n');
        }
      }, 20000);
    };

    socket.onmessage = (event) => {
      const data = event.data;

      if (data.startsWith('CONNECTED')) {
        // STOMP SUBSCRIBE frame
        socket.send(`SUBSCRIBE\nid:${subId}\ndestination:${topic}\n\n\0`);
      } else if (data.startsWith('MESSAGE')) {
        const bodyIndex = data.indexOf('\n\n');
        if (bodyIndex !== -1) {
          const body = data.substring(bodyIndex + 2, data.lastIndexOf('\0')).trim();
          try {
            const payload = JSON.parse(body);
            if (active) onMessage(payload);
          } catch (e) {
            console.warn(`[WebSocket] Failed to parse JSON from topic ${topic}:`, e);
          }
        }
      }
    };

    socket.onerror = (err) => {
      console.warn(`[WebSocket] Error on topic ${topic}:`, err);
    };

    socket.onclose = () => {
      clearInterval(keepAliveInterval);
      if (active) {
        console.log(`[WebSocket] Disconnected from ${topic}. Reconnecting in 5s...`);
        setTimeout(connect, 5000);
      }
    };
  };

  connect();

  return () => {
    active = false;
    clearInterval(keepAliveInterval);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(`UNSUBSCRIBE\nid:${subId}\n\n\0`);
      socket.close();
    }
  };
}

// ── Hook 1: Alert Center — No-show risk alerts (manager only) ────────────────
/**
 * useWebSocketAlerts
 * Subscribes to /topic/alerts — broadcasts of high no-show risk shifts.
 * Used in App.jsx to surface toast notifications to managers.
 */
export function useWebSocketAlerts(onAlertReceived) {
  const callbackRef = useRef(onAlertReceived);
  useEffect(() => { callbackRef.current = onAlertReceived; }, [onAlertReceived]);

  useEffect(() => {
    const cleanup = createStompConnection(WS_URL, '/topic/alerts', (payload) => {
      callbackRef.current?.(payload);
    });
    return cleanup;
  }, []); // Only mount once
}

// ── Hook 2: Employee Dashboard — Real-time schedule updates ─────────────────
/**
 * useScheduleUpdates
 * Subscribes to /topic/schedule-updates — triggered when a manager publishes.
 * When fired, employees' dashboards auto-refresh shift data.
 *
 * @param {Function} onUpdate  — called with the broadcast payload on publish event
 * @param {boolean}  enabled   — only connect when the employee is logged in
 */
export function useScheduleUpdates(onUpdate, enabled = true) {
  const callbackRef = useRef(onUpdate);
  useEffect(() => { callbackRef.current = onUpdate; }, [onUpdate]);

  useEffect(() => {
    if (!enabled) return;
    const cleanup = createStompConnection(WS_URL, '/topic/schedule-updates', (payload) => {
      console.log('[WebSocket] Schedule published by manager:', payload.managerId);
      callbackRef.current?.(payload);
    });
    return cleanup;
  }, [enabled]);
}

// ── Hook 3: Employee Dashboard — Real-time leave status updates ──────────────
/**
 * useLeaveUpdates
 * Subscribes to /topic/leave-updates — triggered when manager approves/rejects.
 * Employees see immediate APPROVED/REJECTED badge without refreshing.
 *
 * @param {Function} onUpdate   — called with { leaveId, status, employeeId }
 * @param {number}   employeeId — only react to events for this employee
 * @param {boolean}  enabled    — only connect when logged in as employee
 */
export function useLeaveUpdates(onUpdate, employeeId, enabled = true) {
  const callbackRef = useRef(onUpdate);
  useEffect(() => { callbackRef.current = onUpdate; }, [onUpdate]);

  useEffect(() => {
    if (!enabled || !employeeId) return;
    const cleanup = createStompConnection(WS_URL, '/topic/leave-updates', (payload) => {
      // Only react if the event is for this specific employee
      if (payload.employeeId === employeeId || payload.employeeId === -1) {
        console.log(`[WebSocket] Leave [${payload.leaveId}] status → ${payload.status}`);
        callbackRef.current?.(payload);
      }
    });
    return cleanup;
  }, [enabled, employeeId]);
}
