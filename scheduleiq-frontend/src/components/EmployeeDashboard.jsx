import React, { useState, useEffect, useCallback } from 'react';
import { Avatar } from './common/Avatar';
import { 
  Bell, 
  CalendarDays, 
  MapPin, 
  Briefcase, 
  ArrowRightLeft, 
  Home, 
  User as UserIcon,
  LogOut,
  Clock,
  CheckCircle2,
  CalendarRange,
  FileText,
  XCircle,
  RefreshCw,
  ChevronRight,
  Zap,
  Wifi
} from 'lucide-react';
import { SparklesIcon } from './AiGenerator';
import { useToast } from './common/Toast';
import { Button } from './common/Button';
import { Modal } from './common/Modal';
import { Input } from './common/Input';
import * as api from '../api';
import { useScheduleUpdates, useLeaveUpdates } from '../lib/websocket';

export function EmployeeDashboard({ user, onOpenProfile, onLogout }) {
  const { showToast } = useToast();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  
  // Leave state
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [myLeaves, setMyLeaves] = useState([]);

  // ── v2.0: Real-time WebSocket — auto-refresh when manager publishes schedule ──
  useScheduleUpdates(useCallback((payload) => {
    setLiveConnected(true);
    showToast(`📅 New schedule published by your manager! Refreshing your shifts...`, 'info');
    fetchMyShifts();
  }, []), true);

  // ── v2.0: Real-time WebSocket — auto-update leave status when approved/rejected ──
  useLeaveUpdates(useCallback((payload) => {
    const msg = payload.status === 'APPROVED'
      ? '✅ Your leave request was approved!'
      : '❌ Your leave request was declined.';
    showToast(msg, payload.status === 'APPROVED' ? 'success' : 'error');
    fetchMyLeaves();
  }, []), user?.employeeId, true);

  useEffect(() => {
    fetchMyShifts();
    fetchMyLeaves();
  }, []);

  const fetchMyShifts = useCallback(async (showSyncIndicator = false) => {
    if (showSyncIndicator) setSyncing(true);
    else setLoading(true);

    try {
      // Show upcoming shifts: 3 days back and 14 days forward
      // This ensures just-published schedules for next week are visible
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - 3);

      const endDate = new Date(now);
      endDate.setDate(now.getDate() + 14);

      const startStr = startDate.toISOString().split('T')[0] + 'T00:00:00';
      const endStr = endDate.toISOString().split('T')[0] + 'T23:59:59';

      const myShifts = await api.getShifts(startStr, endStr) || [];

      // Backend already scopes to this employee's shifts
      // Sort by start time ascending
      myShifts.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
      setShifts(myShifts);

      if (showSyncIndicator) {
        showToast(`Schedule synced! ${myShifts.length} shift${myShifts.length !== 1 ? 's' : ''} found.`, 'success');
      }
    } catch (e) {
      console.error('Failed to load employee shifts:', e);
      if (showSyncIndicator) showToast('Failed to sync schedule. Try again.', 'error');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [showToast]);

  const fetchMyLeaves = async () => {
    try {
      const data = await api.getMyLeaves();
      setMyLeaves(data || []);
    } catch (e) {
      console.warn('Failed to load my leaves:', e.message);
    }
  };

  const handleClockIn = async (shiftId) => {
    try {
      await api.clockInShift(shiftId);
      showToast('Successfully clocked in! Work time started.', 'success');
      fetchMyShifts();
    } catch (e) {
      showToast(e.message || 'Failed to clock in.', 'error');
    }
  };

  const handleClockOut = async (shiftId) => {
    try {
      await api.clockOutShift(shiftId);
      showToast('Successfully clocked out! Timesheet saved.', 'success');
      fetchMyShifts();
    } catch (e) {
      showToast(e.message || 'Failed to clock out.', 'error');
    }
  };

  const handleRequestSwap = async (shiftId) => {
    try {
      await api.createSwapRequest(shiftId, null);
      showToast('Shift swap request posted to Marketplace!', 'success');
      fetchMyShifts();
    } catch (e) {
      showToast(e.message || 'Failed to submit swap request.', 'error');
    }
  };

  const handleRequestLeave = async (e) => {
    e.preventDefault();
    setSubmittingLeave(true);
    try {
      await api.requestLeave(leaveDate, leaveReason);
      showToast('Leave request submitted! Your manager will review it.', 'success');
      setIsLeaveModalOpen(false);
      setLeaveDate('');
      setLeaveReason('');
      await fetchMyLeaves();
    } catch (e) {
      showToast(e.message || 'Failed to submit leave request.', 'error');
    } finally {
      setSubmittingLeave(false);
    }
  };

  const formatShiftDateLabel = (startTimeStr) => {
    const d = new Date(startTimeStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const formatTimeLabel = (timeStr) => {
    const d = new Date(timeStr);
    let hours = d.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${mins} ${ampm}`;
  };

  const getShiftDuration = (startStr, endStr) => {
    const diff = (new Date(endStr) - new Date(startStr)) / (1000 * 60 * 60);
    return `${diff}h`;
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'CASHIER': return 'text-[#0d9488] bg-[#14b8a6]/10';
      case 'STOCKER': return 'text-[#7c3aed] bg-[#8b5cf6]/10';
      case 'LEAD_CASHIER': return 'text-[#1e1a8a] bg-[#1e1a8a]/10';
      case 'DELIVERY_BOY': return 'text-[#d97706] bg-[#f59e0b]/10';
      default: return 'text-outline bg-surface-variant';
    }
  };

  // Next shift = first shift that is not fully clocked out and is in the future (or active)
  const now = new Date();
  const nextShift = shifts.find(s => {
    const end = new Date(s.endTime);
    return s.clockStatus !== 'CLOCKED_OUT' && end >= now;
  });

  // Upcoming shifts (excluding nextShift)
  const upcomingShifts = shifts.filter(s => s.id !== nextShift?.id);

  // Today's stats
  const todayShifts = shifts.filter(s => {
    const d = new Date(s.startTime);
    return d.toDateString() === now.toDateString();
  });

  return (
    <div className="flex-1 bg-gradient-to-br from-[#f0f4ff] to-[#fafbfc] flex justify-center items-center h-full overflow-hidden">
      <div className="w-full max-w-[420px] h-full bg-surface shadow-2xl relative flex flex-col overflow-hidden sm:rounded-3xl sm:h-[900px] border border-outline-variant/30">

        {/* Gradient Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#1e1a8a] to-[#312e9e] px-6 pt-10 pb-8 shrink-0">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-surface/5 rounded-full blur-2xl" />
          <div className="absolute -left-4 bottom-0 w-28 h-28 bg-surface/5 rounded-full blur-xl" />
          
          <div className="relative flex justify-between items-start mb-6">
            <div>
              <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <h1 className="text-2xl font-bold text-white">
                Hello, {user?.name?.split(' ')[0] || 'Team'} 👋
              </h1>
              <p className="text-white/60 text-sm mt-0.5">{user?.role?.replace('_', ' ')}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="w-9 h-9 rounded-full bg-surface/10 flex items-center justify-center text-white/80 hover:bg-surface/20 transition-all border border-white/10"
                onClick={() => setIsLeaveModalOpen(true)}
                title="Request Leave"
              >
                <CalendarRange className="w-4 h-4" />
              </button>
              <button onClick={onOpenProfile}>
                <Avatar name={user?.name || 'User'} size="md" className="border-2 border-white/40 shadow-lg" />
              </button>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="flex gap-3 relative">
            <div className="flex-1 bg-surface/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="text-2xl font-bold text-white">{shifts.length}</div>
              <div className="text-[10px] font-semibold text-white/60 uppercase tracking-wider mt-0.5">Upcoming Shifts</div>
            </div>
            <div className="flex-1 bg-surface/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="text-2xl font-bold text-white">
                {shifts.reduce((acc, s) => {
                  const h = (new Date(s.endTime) - new Date(s.startTime)) / (1000 * 60 * 60);
                  return acc + h;
                }, 0).toFixed(0)}h
              </div>
              <div className="text-[10px] font-semibold text-white/60 uppercase tracking-wider mt-0.5">Hours Scheduled</div>
            </div>
            <div className="flex-1 bg-surface/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="text-2xl font-bold text-white">{myLeaves.filter(l => l.status === 'PENDING').length}</div>
              <div className="text-[10px] font-semibold text-white/60 uppercase tracking-wider mt-0.5">Pending Leave</div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide bg-[#fafbfc]">
          <div className="px-5 py-5 space-y-5">

            {/* Next Shift Hero Card */}
            {loading ? (
              <div className="bg-surface rounded-2xl p-6 shadow-sm border border-outline-variant/30 text-center">
                <div className="w-8 h-8 border-4 border-[#1e1a8a]/30 border-t-[#1e1a8a] rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm font-semibold text-on-surface-variant">Loading your schedule...</p>
              </div>
            ) : nextShift ? (
              <div className="relative overflow-hidden rounded-2xl shadow-lg">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#14b8a6] to-[#0d9488]" />
                <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-surface/10 rounded-full blur-xl" />
                <div className="absolute -left-2 -top-2 w-20 h-20 bg-surface/5 rounded-full" />

                <div className="relative p-6 text-white">
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-surface/20 border border-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                      {nextShift.clockStatus === 'CLOCKED_IN' ? '🟢 Active Shift' : '⏰ Next Shift'}
                    </span>
                    <span className="text-white/70 text-xs font-semibold">
                      {getShiftDuration(nextShift.startTime, nextShift.endTime)}
                    </span>
                  </div>

                  <div className="mb-5">
                    <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1">
                      {formatShiftDateLabel(nextShift.startTime)}
                    </p>
                    <h2 className="text-3xl font-extrabold tracking-tight leading-none">
                      {formatTimeLabel(nextShift.startTime)}
                    </h2>
                    <p className="text-white/80 text-base font-semibold mt-0.5">
                      – {formatTimeLabel(nextShift.endTime)}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 mb-5 text-sm font-semibold text-white/80">
                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-white/60" />Adyar Store</span>
                    <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-white/60" />{nextShift.role?.replace('_', ' ')}</span>
                  </div>

                  {nextShift.clockStatus !== 'CLOCKED_IN' ? (
                    <Button
                      className="w-full bg-surface text-[#0d9488] hover:bg-surface/90 font-bold py-3 shadow-md"
                      onClick={() => handleClockIn(nextShift.id)}
                    >
                      <Clock className="w-4 h-4 mr-2" />Clock In
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold py-3 shadow-md border-transparent"
                      onClick={() => handleClockOut(nextShift.id)}
                    >
                      <Clock className="w-4 h-4 mr-2" />Clock Out
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-surface rounded-2xl p-6 text-center border border-outline-variant/30 shadow-sm">
                <CalendarDays className="w-10 h-10 text-outline-variant mx-auto mb-2" />
                <p className="font-bold text-on-surface text-sm">No upcoming shifts found</p>
                <p className="text-xs text-on-surface-variant mt-1">Your manager hasn't published a schedule yet. Tap Sync to refresh.</p>
                <button
                  onClick={() => fetchMyShifts(true)}
                  className="mt-3 text-xs font-bold text-[#1e1a8a] hover:underline flex items-center gap-1 mx-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />Sync now
                </button>
              </div>
            )}

            {/* Upcoming Roster */}
            {!loading && upcomingShifts.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-[#1e1a8a]" />My Schedule
                </h3>
                <div className="space-y-2">
                  {upcomingShifts.map(s => {
                    const isClockedOut = s.clockStatus === 'CLOCKED_OUT';
                    return (
                      <div
                        key={s.id}
                        className={`flex items-center justify-between p-4 rounded-xl border shadow-sm bg-surface transition-all ${
                          isClockedOut ? 'opacity-50 border-outline-variant/30' :
                          s.status === 'WAITING_SWAP' ? 'border-l-4 border-l-[#f59e0b] border-outline-variant/50' :
                          'border-outline-variant/40 hover:shadow-md hover:-translate-y-0.5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#1e1a8a]/5 flex flex-col items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-[#1e1a8a] uppercase">
                              {new Date(s.startTime).toLocaleDateString('en-US', { month: 'short' })}
                            </span>
                            <span className="text-base font-extrabold text-[#1e1a8a] leading-none">
                              {new Date(s.startTime).getDate()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-on-surface">
                              {formatTimeLabel(s.startTime)} – {formatTimeLabel(s.endTime)}
                            </p>
                            <p className="text-xs font-semibold text-on-surface-variant mt-0.5 flex items-center gap-1.5">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${getRoleColor(s.role)}`}>{s.role?.replace('_', ' ')}</span>
                              <span className="text-outline">•</span>
                              {getShiftDuration(s.startTime, s.endTime)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isClockedOut ? (
                            <span className="text-[9px] font-bold text-outline bg-surface-variant px-2 py-1 rounded uppercase tracking-wider">Done</span>
                          ) : s.status === 'WAITING_SWAP' ? (
                            <span className="text-[9px] font-bold text-on-warning bg-warning-container px-2 py-1 rounded border border-warning uppercase">Swap Pending</span>
                          ) : (
                            <button
                              className="text-xs font-bold text-[#1e1a8a] border border-[#1e1a8a]/20 px-2.5 py-1.5 rounded-lg hover:bg-[#1e1a8a]/5 transition-colors"
                              onClick={() => handleRequestSwap(s.id)}
                            >
                              Swap
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* My Leave Requests */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#1e1a8a]" />Leave Requests
                </h3>
                <button
                  onClick={() => setIsLeaveModalOpen(true)}
                  className="text-xs font-bold text-[#1e1a8a] hover:underline flex items-center gap-1"
                >
                  + Request Leave
                </button>
              </div>
              {myLeaves.length === 0 ? (
                <div className="text-center py-5 text-sm text-outline-variant font-semibold bg-surface rounded-xl border border-outline-variant/30 shadow-sm">
                  <CalendarRange className="w-8 h-8 text-outline-variant mx-auto mb-1.5" />
                  No leave requests yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {myLeaves.slice(0, 5).map(leave => {
                    const statusConfig = {
                      PENDING:  { color: 'bg-warning-container text-on-warning border-warning', icon: <Clock className="w-3.5 h-3.5" /> },
                      APPROVED: { color: 'bg-[#f0fdf4] text-[#15803d] border-[#86efac]', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
                      REJECTED: { color: 'bg-[#fef2f2] text-[#b91c1c] border-[#fca5a5]', icon: <XCircle className="w-3.5 h-3.5" /> }
                    };
                    const config = statusConfig[leave.status] || statusConfig.PENDING;
                    return (
                      <div
                        key={leave.id}
                        className={`flex items-center justify-between p-3.5 rounded-xl border bg-surface shadow-sm ${
                          leave.status === 'APPROVED' ? 'border-[#86efac]/50' :
                          leave.status === 'REJECTED' ? 'border-[#fca5a5]/50' : 'border-outline-variant/30'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-bold text-on-surface">
                            {new Date(leave.leaveDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </p>
                          <p className="text-xs font-medium text-on-surface-variant mt-0.5">{leave.reason || 'Personal'}</p>
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border ${config.color}`}>
                          {config.icon}
                          {leave.status}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="absolute bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-md border-t border-outline-variant/30 flex justify-around items-center px-4 py-3 pb-safe z-20">
          <button className="flex flex-col items-center gap-1 group">
            <div className="w-10 h-7 rounded-full bg-[#1e1a8a]/10 flex items-center justify-center group-hover:bg-[#1e1a8a]/20 transition-colors">
              <Home className="w-4 h-4 text-[#1e1a8a]" />
            </div>
            <span className="text-[9px] font-bold text-[#1e1a8a] uppercase tracking-wider">Home</span>
          </button>

          <button
            className="flex flex-col items-center gap-1 group"
            onClick={() => fetchMyShifts(true)}
            disabled={syncing}
          >
            <div className="w-10 h-7 rounded-full bg-surface-variant flex items-center justify-center group-hover:bg-surface-variant/70 transition-colors">
              <RefreshCw className={`w-4 h-4 text-outline ${syncing ? 'animate-spin text-[#1e1a8a]' : ''}`} />
            </div>
            <span className="text-[9px] font-bold text-outline uppercase tracking-wider">{syncing ? 'Syncing' : 'Sync'}</span>
          </button>

          <button
            className="flex flex-col items-center gap-1 group"
            onClick={() => setIsLeaveModalOpen(true)}
          >
            <div className="w-10 h-7 rounded-full bg-surface-variant flex items-center justify-center group-hover:bg-surface-variant/70 transition-colors relative">
              <CalendarRange className="w-4 h-4 text-outline" />
              {myLeaves.filter(l => l.status === 'PENDING').length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#f59e0b] text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                  {myLeaves.filter(l => l.status === 'PENDING').length}
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold text-outline uppercase tracking-wider">Leave</span>
          </button>

          <button
            onClick={() => { onLogout(); }}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="w-10 h-7 rounded-full bg-surface-variant flex items-center justify-center group-hover:bg-error/10 transition-colors">
              <LogOut className="w-4 h-4 text-outline group-hover:text-error transition-colors" />
            </div>
            <span className="text-[9px] font-bold text-outline uppercase tracking-wider">Logout</span>
          </button>
        </div>

        {/* Request Leave Modal */}
        <Modal isOpen={isLeaveModalOpen} onClose={() => setIsLeaveModalOpen(false)} title="Request Leave">
          <form onSubmit={handleRequestLeave} className="space-y-4">
            <Input
              label="Leave Date"
              type="date"
              value={leaveDate}
              onChange={e => setLeaveDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
            <div>
              <label className="block text-sm font-bold text-on-surface mb-1.5">Reason for Leave</label>
              <textarea
                className="w-full border border-outline-variant rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-[#1e1a8a]/30 focus:border-[#1e1a8a] shadow-sm text-sm resize-none transition-all"
                value={leaveReason}
                onChange={e => setLeaveReason(e.target.value)}
                placeholder="e.g. Medical appointment, family occasion"
                rows={3}
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" type="button" onClick={() => setIsLeaveModalOpen(false)}>Cancel</Button>
              <Button variant="primary" type="submit" className="bg-[#1e1a8a] text-white" isLoading={submittingLeave}>
                Submit Request
              </Button>
            </div>
          </form>
        </Modal>

      </div>
    </div>
  );
}
