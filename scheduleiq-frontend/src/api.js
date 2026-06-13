/**
 * ScheduleIQ API Service Layer
 * Centralizes all HTTP communication with the Spring Boot backend.
 * All functions return the parsed JSON response or throw an error.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// ── Token Management ──────────────────────────────────────────────────────────

export function getToken() {
  return localStorage.getItem('scheduleiq_token');
}

export function setToken(token) {
  localStorage.setItem('scheduleiq_token', token);
}

export function clearToken() {
  localStorage.removeItem('scheduleiq_token');
  localStorage.removeItem('scheduleiq_user');
}

export function getUser() {
  const raw = localStorage.getItem('scheduleiq_user');
  return raw ? JSON.parse(raw) : null;
}

export function setUser(user) {
  localStorage.setItem('scheduleiq_user', JSON.stringify(user));
}

// ── Core Fetch Wrapper ────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (response.status === 401) {
    clearToken();
    window.location.reload();
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errBody.error || `HTTP ${response.status}`);
  }

  // Return null for 204 No Content
  if (response.status === 204) return null;
  return response.json();
}

// ── Auth Endpoints ────────────────────────────────────────────────────────────

export async function login(email, password) {
  const data = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  setUser({ name: data.name, role: data.role, employeeId: data.employeeId });
  return data;
}

export async function register(payload) {
  const data = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setToken(data.token);
  setUser({ name: data.name, role: data.role, employeeId: data.employeeId });
  return data;
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

// ── Health Check ──────────────────────────────────────────────────────────────

export async function healthCheck() {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/health`);
    return res.ok;
  } catch {
    return false;
  }
}
