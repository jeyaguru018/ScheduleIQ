/**
 * ScheduleIQ API Service Layer — Production Hardened
 * - Centralized HTTP communication with Spring Boot backend
 * - Automatic retry with exponential backoff for transient network failures
 * - Request timeout (20s) to prevent indefinitely hanging API calls
 * - Consistent error normalization across all endpoints
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// ── Request Timeout Helper ─────────────────────────────────────────────────────

function withTimeout(promise, ms = 20000) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Request timed out after ${ms / 1000}s`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// ── Token Management ──────────────────────────────────────────────────────────
// Note: Tokens stored in sessionStorage (cleared on tab close).
// For maximum XSS resistance, the backend should set HttpOnly cookies via
// the Set-Cookie header on login — this api.js also sends credentials: 'include'
// so that any future HttpOnly cookie upgrade works without frontend changes.

export function getToken() {
  return sessionStorage.getItem('scheduleiq_token');
}

export function setToken(token) {
  sessionStorage.setItem('scheduleiq_token', token);
}

export function clearToken() {
  sessionStorage.removeItem('scheduleiq_token');
  sessionStorage.removeItem('scheduleiq_user');
}

export function getUser() {
  const raw = sessionStorage.getItem('scheduleiq_user');
  return raw ? JSON.parse(raw) : null;
}

export function setUser(user) {
  sessionStorage.setItem('scheduleiq_user', JSON.stringify(user));
}

// ── Core Fetch Wrapper with Retry ─────────────────────────────────────────────

async function apiFetch(path, options = {}, retries = 2) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const requestTimeout = options.timeout !== undefined ? options.timeout : 20000;
  const maxRetries = options.retries !== undefined ? options.retries : retries;

  try {
    const fetchPromise = fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include',  // Include cookies for future HttpOnly JWT support
    });

    const response = await withTimeout(fetchPromise, requestTimeout);

    if (response.status === 401) {
      clearToken();
      window.location.reload();
      throw new Error('Session expired. Please login again.');
    }

    if (response.status === 429) {
      throw new Error('Too many requests. Please wait a moment before trying again.');
    }

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errBody.message || errBody.error || `HTTP ${response.status}`);
    }

    if (response.status === 204) return null;
    return response.json();

  } catch (err) {
    // Retry on network errors or server errors (5xx), but NOT on 4xx client errors
    const isNetworkError = err.name === 'TypeError' || err.message.includes('timed out') || err.message.includes('fetch');
    const shouldRetry = isNetworkError && maxRetries > 0;

    if (shouldRetry) {
      const delay = (3 - maxRetries) * 1000; // 1s, 2s exponential backoff
      console.warn(`[API] Retrying ${path} in ${delay}ms... (${maxRetries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return apiFetch(path, { ...options, retries: maxRetries - 1 }, maxRetries - 1);
    }
    throw err;
  }
}

// ── Auth Endpoints ────────────────────────────────────────────────────────────

export async function login(email, password) {
  const data = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    timeout: 5000,
    retries: 0
  });
  setToken(data.token);
  setUser({ name: data.name, role: data.role, employeeId: data.employeeId });
  return data;
}

export async function register(payload) {
  const data = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
    timeout: 5000,
    retries: 0
  });
  setToken(data.token);
  setUser({ name: data.name, role: data.role, employeeId: data.employeeId });
  return data;
}

export async function createEmployee(payload) {
  // Call register but do NOT overwrite session token
  return apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function logout() {
  clearToken();
}

// ── Employee Endpoints ────────────────────────────────────────────────────────

export async function getAllEmployees() {
  return apiFetch('/api/employees');
}

export async function getMyProfile() {
  return apiFetch('/api/employees/me');
}

export async function updateMyProfile(updates) {
  return apiFetch('/api/employees/me', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function updateEmployee(id, updates) {
  return apiFetch(`/api/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteEmployee(id) {
  return apiFetch(`/api/employees/${id}`, { method: 'DELETE' });
}

// ── Schedule Endpoints ────────────────────────────────────────────────────────

export async function generateSchedule(weekStart, weekEnd, budgetCap) {
  return apiFetch(
    `/api/schedule/generate?weekStart=${weekStart}&weekEnd=${weekEnd}&budgetCap=${budgetCap}`,
    { method: 'POST' }
  );
}

export async function getJobStatus(jobId) {
  return apiFetch(`/api/schedule/job/${jobId}`);
}

export async function getShifts(start, end) {
  return apiFetch(`/api/schedule/shifts?start=${start}&end=${end}`);
}

export async function assignShiftEmployee(shiftId, employeeId) {
  return apiFetch(`/api/schedule/shifts/${shiftId}/assign?employeeId=${employeeId}`, { method: 'PUT' });
}

// ── Shift Swap Endpoints ──────────────────────────────────────────────────────

export async function getSwapRequests() {
  return apiFetch('/api/swaps');
}

export async function createSwapRequest(shiftId, targetEmployeeId) {
  return apiFetch('/api/swaps', {
    method: 'POST',
    body: JSON.stringify({ shiftId, targetEmployeeId }),
  });
}

export async function approveSwap(swapId) {
  return apiFetch(`/api/swaps/${swapId}/approve`, { method: 'PATCH' });
}

// ── Leave Endpoints ───────────────────────────────────────────────────────────

export async function getAllLeaves() {
  return apiFetch('/api/leave');
}

export async function getMyLeaves() {
  return apiFetch('/api/leave/my');
}

export async function requestLeave(leaveDate, reason) {
  return apiFetch('/api/leave', {
    method: 'POST',
    body: JSON.stringify({ leaveDate, reason }),
  });
}

export async function approveLeave(id) {
  return apiFetch(`/api/leave/${id}/approve`, { method: 'PATCH' });
}

export async function rejectLeave(id) {
  return apiFetch(`/api/leave/${id}/reject`, { method: 'PATCH' });
}

// ── ML / Attendance Endpoints ─────────────────────────────────────────────────

export async function evaluateNoShowRisks(start, end) {
  return apiFetch(`/api/attendance/evaluate?start=${start}&end=${end}`, { method: 'POST' });
}

export async function getBackupWorkers(shiftId) {
  return apiFetch(`/api/attendance/backups/${shiftId}`);
}

export async function getAlerts(threshold = 0.15) {
  return apiFetch(`/api/attendance/alerts?threshold=${threshold}`);
}

export async function getDemandSignals(start, end) {
  return apiFetch(`/api/demand?start=${start}&end=${end}`);
}

export async function clockInShift(shiftId) {
  return apiFetch(`/api/schedule/shifts/${shiftId}/clock-in`, { method: 'PUT' });
}

export async function clockOutShift(shiftId) {
  return apiFetch(`/api/schedule/shifts/${shiftId}/clock-out`, { method: 'PUT' });
}

// ── Health Check ──────────────────────────────────────────────────────────────

export async function healthCheck() {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/health`);
    return res.ok;
  } catch {
    return false;
  }
}
