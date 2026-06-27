import React, { useState, useEffect, useCallback } from 'react';
import { Avatar } from './common/Avatar';
import { 
  CalendarDays, 
  MapPin, 
  Briefcase, 
  ArrowLeftRight, 
  LogOut,
  Clock,
  CheckCircle2,
  CalendarRange,
  FileText,
  XCircle,
  RefreshCw,
  DollarSign,
  AlertTriangle,
  Settings
} from 'lucide-react';
import { useToast } from './common/Toast';
import { Button } from './common/Button';
import { Modal } from './common/Modal';
import { Input } from './common/Input';
import { DarkModeToggle } from './DarkModeToggle';
import * as api from '../api';
import { useScheduleUpdates, useLeaveUpdates } from '../lib/websocket';

export function EmployeeDashboard({ user, onOpenProfile, onLogout }) {
  const { showToast } = useToast();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // Leave state
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [myLeaves, setMyLeaves] = useState([]);

  // Swaps state
  const [marketplaceSwaps, setMarketplaceSwaps] = useState([]);

  useScheduleUpdates(useCallback(() => {
    showToast('📅 New schedule published by your manager! Refreshing your shifts...', 'info');
    fetchMyShifts();
  }, []), true);

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
    fetchMarketplaceSwaps();
  }, []);

  const fetchMyShifts = useCallback(async (showSyncIndicator = false) => {
    if (showSyncIndicator) setSyncing(true);
    else setLoading(true);

    try {
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - 3);
      const endDate = new Date(now);
      endDate.setDate(now.getDate() + 14);

      const startStr = startDate.toISOString().split('T')[0] + 'T00:00:00';
      const endStr = endDate.toISOString().split('T')[0] + 'T23:59:59';

      const myShifts = await api.getShifts(startStr, endStr) || [];
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

  const fetchMarketplaceSwaps = async () => {
    try {
      const data = await api.getSwaps();
      setMarketplaceSwaps(data.filter(s => s.status === 'PENDING') || []);
    } catch (e) {
      console.warn('Failed to load marketplace swaps:', e.message);
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
      case 'CASHIER': return 'text-[#0d9488] bg-[#14b8a6]/20 border border-[#14b8a6]/40';
      case 'STOCKER': return 'text-[#7c3aed] bg-[#8b5cf6]/20 border border-[#8b5cf6]/40';
      case 'LEAD_CASHIER': return 'text-primary bg-primary/20 border border-primary/40';
      case 'DELIVERY_BOY': return 'text-[#d97706] bg-[#f59e0b]/20 border border-[#f59e0b]/40';
      default: return 'text-on-surface bg-surface-variant border border-outline-variant/60';
    }
  };

  const now = new Date();
  const nextShift = shifts.find(s => {
    const end = new Date(s.endTime);
    return s.clockStatus !== 'CLOCKED_OUT' && end >= now;
  });

  const upcomingShifts = shifts.filter(s => s.id !== nextShift?.id && new Date(s.endTime) >= now);

  const scheduledHours = shifts.filter(s => new Date(s.startTime).getTime() >= (now.getTime() - now.getDay() * 86400000)).reduce((acc, s) => {
    return acc + (new Date(s.endTime) - new Date(s.startTime)) / (1000 * 60 * 60);
  }, 0);
  const maxHours = user?.maxHoursPerWeek || 40;
  const earnings = scheduledHours * (user?.baseHourlyRate || 250);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-surface-variant transition-colors duration-200">
      {/* Header section with Theme Toggle & Edit Account */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">
            Hello, {user?.name?.split(' ')[0] || 'Team'} 👋
          </h1>
          <p className="text-sm font-extrabold text-primary mt-1 uppercase tracking-widest">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} • {user?.role?.replace('_', ' ')}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Employee Theme Toggle */}
          <div className="flex items-center gap-2 bg-surface p-1.5 px-3 rounded-full border border-outline-variant/80 shadow-sm" title="Toggle Theme">
            <DarkModeToggle />
          </div>

          <Button 
            variant="outline"
            className="bg-surface border-outline-variant text-[#0d9488] hover:bg-[#14b8a6]/10 font-extrabold shadow-sm transition-all"
            onClick={() => fetchMyShifts(true)}
            disabled={syncing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync'}
          </Button>

          <Button 
            className="bg-[#f59e0b] hover:bg-[#d97706] text-white font-extrabold border-transparent shadow-sm transition-all"
            onClick={() => setIsLeaveModalOpen(true)}
          >
            <CalendarRange className="w-4 h-4 mr-2" />
            Request Leave
          </Button>

          {/* Edit Account Badge */}
          <button
            onClick={onOpenProfile}
            title="Click to edit account"
            className="flex items-center gap-2 bg-surface hover:bg-surface-variant p-1.5 pl-2 pr-3 rounded-full border border-outline-variant shadow-sm transition-all group cursor-pointer"
          >
            <Avatar name={user?.name} size="sm" className="ring-2 ring-primary/30" />
            <span className="text-xs font-extrabold text-on-surface group-hover:text-primary flex items-center gap-1">
              Edit Account <Settings className="w-3 h-3 text-on-surface" />
            </span>
          </button>

          <Button 
            variant="outline"
            className="border-error/40 text-error hover:bg-error/10 font-bold h-9"
            onClick={onLogout}
          >
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Earnings & Hours Tracker (High Contrast) */}
          <div className="bg-surface rounded-2xl p-6 shadow-sm border border-outline-variant/60 flex flex-col sm:flex-row gap-6 items-center transition-colors">
             <div className="w-16 h-16 shrink-0 rounded-2xl bg-gradient-to-br from-[#1e1a8a] to-[#312e9e] flex items-center justify-center text-white shadow-md">
               <DollarSign className="w-8 h-8" />
             </div>
             <div className="flex-1 w-full">
               <div className="flex justify-between items-end mb-3">
                 <div>
                   <p className="text-xs font-extrabold text-primary uppercase tracking-wider">Weekly Earnings Est.</p>
                   <h2 className="text-3xl font-extrabold text-on-surface">₹{earnings.toLocaleString('en-IN')}</h2>
                 </div>
                 <div className="text-right">
                   <p className="text-xs font-extrabold text-primary uppercase tracking-wider">Hours Scheduled</p>
                   <p className="text-xl font-extrabold text-on-surface">
                     <span className={scheduledHours > maxHours ? 'text-error' : 'text-on-surface'}>{scheduledHours.toFixed(1)}</span> / {maxHours} hrs
                   </p>
                 </div>
               </div>
               <div className="w-full h-2.5 bg-surface-variant border border-outline-variant/40 rounded-full overflow-hidden">
                 <div 
                   className={`h-full rounded-full transition-all duration-500 ${scheduledHours > maxHours * 0.9 ? 'bg-[#f59e0b]' : 'bg-[#14b8a6]'}`} 
                   style={{ width: `${Math.min((scheduledHours / maxHours) * 100, 100)}%` }} 
                 />
               </div>
             </div>
          </div>

          {/* Next Shift Hero */}
          {loading ? (
            <div className="bg-surface rounded-2xl p-10 shadow-sm border border-outline-variant/40 text-center flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
              <p className="text-sm font-extrabold text-on-surface">Loading your schedule...</p>
            </div>
          ) : nextShift ? (
            <div className="relative overflow-hidden rounded-2xl shadow-md border border-outline-variant/30">
              <div className="absolute inset-0 bg-gradient-to-br from-[#14b8a6] to-[#0d9488]" />
              <div className="absolute -right-6 -bottom-6 w-40 h-40 bg-surface/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative p-6 sm:p-8 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="bg-black/30 border border-white/40 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider shadow-sm text-white">
                      {nextShift.clockStatus === 'CLOCKED_IN' ? '🟢 Active Shift' : '⏰ Next Shift'}
                    </span>
                    <span className="text-white font-extrabold text-xs bg-black/30 px-2.5 py-1 rounded-md border border-white/20">
                      {getShiftDuration(nextShift.startTime, nextShift.endTime)}
                    </span>
                  </div>

                  <p className="text-white font-extrabold text-xs uppercase tracking-wider mb-1">
                    {formatShiftDateLabel(nextShift.startTime)}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-4xl font-extrabold tracking-tight leading-none text-white">
                      {formatTimeLabel(nextShift.startTime)}
                    </h2>
                    <span className="text-white text-xl font-extrabold">
                      – {formatTimeLabel(nextShift.endTime)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mt-5 text-sm font-extrabold text-white">
                    <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/20">
                      <MapPin className="w-4 h-4 text-white" /> Adyar Store
                    </span>
                    <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/20">
                      <Briefcase className="w-4 h-4 text-white" /> {nextShift.role?.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="w-full sm:w-auto shrink-0">
                  {nextShift.clockStatus !== 'CLOCKED_IN' ? (
                    <Button
                      className="w-full sm:w-40 bg-white text-[#0d9488] hover:bg-white/90 font-extrabold py-4 text-base shadow-lg transition-transform hover:-translate-y-0.5"
                      onClick={() => handleClockIn(nextShift.id)}
                    >
                      <Clock className="w-5 h-5 mr-2" /> Clock In
                    </Button>
                  ) : (
                    <Button
                      className="w-full sm:w-40 bg-[#ef4444] hover:bg-[#dc2626] text-white font-extrabold py-4 text-base shadow-lg border-transparent transition-transform hover:-translate-y-0.5"
                      onClick={() => handleClockOut(nextShift.id)}
                    >
                      <Clock className="w-5 h-5 mr-2" /> Clock Out
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-surface rounded-2xl p-10 text-center border border-outline-variant/40 shadow-sm flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-surface-variant rounded-full flex items-center justify-center mb-4 border border-outline-variant/60">
                <CalendarDays className="w-8 h-8 text-primary" />
              </div>
              <p className="font-extrabold text-on-surface text-xl mb-1">No upcoming shifts</p>
              <p className="text-sm font-bold text-on-surface-variant max-w-sm mx-auto mb-5">You are not scheduled for any upcoming shifts. Check back later or sync to refresh.</p>
              <Button onClick={() => fetchMyShifts(true)} variant="outline" className="font-extrabold">
                Refresh Schedule
              </Button>
            </div>
          )}

          {/* Upcoming Schedule List */}
          {!loading && upcomingShifts.length > 0 && (
            <div className="bg-surface rounded-2xl border border-outline-variant/50 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-outline-variant/40 flex justify-between items-center bg-surface-variant/30">
                <h3 className="text-sm font-extrabold text-on-surface uppercase tracking-wider flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" /> My Upcoming Schedule
                </h3>
                <span className="text-xs font-extrabold text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
                  {upcomingShifts.length} shifts
                </span>
              </div>
              <div className="divide-y divide-outline-variant/30">
                {upcomingShifts.map(s => {
                  const isWaiting = s.status === 'WAITING_SWAP';
                  return (
                    <div key={s.id} className="p-4 hover:bg-surface-variant/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex flex-col items-center justify-center shrink-0 shadow-2xs">
                          <span className="text-[10px] font-extrabold text-primary uppercase">
                            {new Date(s.startTime).toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                          <span className="text-lg font-extrabold text-primary leading-none mt-0.5">
                            {new Date(s.startTime).getDate()}
                          </span>
                        </div>
                        <div>
                          <p className="text-base font-extrabold text-on-surface flex items-center gap-2">
                            {formatTimeLabel(s.startTime)} – {formatTimeLabel(s.endTime)}
                            {isWaiting && (
                              <span className="text-[10px] font-extrabold text-on-warning bg-warning-container px-2 py-0.5 rounded border border-warning uppercase shrink-0">
                                Swap Pending
                              </span>
                            )}
                          </p>
                          <div className="text-xs font-extrabold text-on-surface-variant mt-1.5 flex items-center gap-2">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${getRoleColor(s.role)}`}>
                              {s.role?.replace('_', ' ')}
                            </span>
                            <span className="text-on-surface-variant">•</span>
                            <span className="flex items-center gap-1 font-bold text-on-surface"><Clock className="w-3.5 h-3.5 text-primary" /> {getShiftDuration(s.startTime, s.endTime)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {!isWaiting && (
                        <Button 
                          variant="outline" 
                          className="text-xs font-extrabold h-9 shrink-0 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-colors"
                          onClick={() => handleRequestSwap(s.id)}
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5" /> Request Swap
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          
          {/* Quick Swap Hub (Feature 2) */}
          <div className="bg-surface rounded-2xl border border-outline-variant/50 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-outline-variant/40 flex items-center justify-between bg-surface-variant/30">
              <h3 className="text-sm font-extrabold text-on-surface uppercase tracking-wider flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-[#7c3aed]" /> Swap Hub
              </h3>
              <span className="text-xs font-extrabold text-[#7c3aed] bg-[#7c3aed]/10 border border-[#7c3aed]/30 px-2 py-1 rounded-md">
                {marketplaceSwaps.length} available
              </span>
            </div>
            
            <div className="p-5 flex-1">
              {marketplaceSwaps.length === 0 ? (
                <div className="text-center py-6 text-sm text-on-surface-variant font-extrabold">
                  <AlertTriangle className="w-8 h-8 text-on-surface-variant/60 mx-auto mb-2" />
                  No open shifts on marketplace right now.
                </div>
              ) : (
                <div className="space-y-3">
                  {marketplaceSwaps.slice(0, 4).map(swap => (
                    <div key={swap.id} className="p-3.5 rounded-xl border border-outline-variant/60 bg-surface-variant/30 hover:bg-surface-variant/60 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-xs font-extrabold text-on-surface uppercase">
                            {new Date(swap.shift?.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </p>
                          <p className="text-xs font-bold text-on-surface-variant">
                            {formatTimeLabel(swap.shift?.startTime)} – {formatTimeLabel(swap.shift?.endTime)}
                          </p>
                        </div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${getRoleColor(swap.shift?.role)}`}>
                          {swap.shift?.role?.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-on-surface mb-2.5 flex items-center gap-1.5">
                        <Avatar name={swap.requestedBy?.name || '?'} size="xs" /> {swap.requestedBy?.name || 'A teammate'} is offering this shift.
                      </p>
                      <Button variant="outline" className="w-full text-xs font-extrabold h-8 bg-surface hover:bg-primary/10 hover:text-primary transition-colors">
                        Pick up shift
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Leave Requests */}
          <div className="bg-surface rounded-2xl border border-outline-variant/50 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-outline-variant/40 flex items-center justify-between bg-surface-variant/30">
              <h3 className="text-sm font-extrabold text-on-surface uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#d97706]" /> My Leave
              </h3>
              <button
                onClick={() => setIsLeaveModalOpen(true)}
                className="text-xs font-extrabold text-primary hover:underline"
              >
                + Request
              </button>
            </div>
            
            <div className="p-3">
              {myLeaves.length === 0 ? (
                <div className="text-center py-6 text-sm text-on-surface-variant font-extrabold">
                  <CalendarRange className="w-8 h-8 text-on-surface-variant/60 mx-auto mb-2" />
                  No leave requests yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {myLeaves.slice(0, 5).map(leave => {
                    const statusConfig = {
                      PENDING:  { color: 'text-on-warning bg-warning-container border-warning', icon: <Clock className="w-3.5 h-3.5" /> },
                      APPROVED: { color: 'text-[#15803d] bg-[#f0fdf4] border-[#86efac] dark:bg-[#15803d]/30 dark:text-[#4ade80] dark:border-[#4ade80]/60', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
                      REJECTED: { color: 'text-[#b91c1c] bg-[#fef2f2] border-[#fca5a5] dark:bg-[#b91c1c]/30 dark:text-[#f87171] dark:border-[#f87171]/60', icon: <XCircle className="w-3.5 h-3.5" /> }
                    };
                    const config = statusConfig[leave.status] || statusConfig.PENDING;
                    return (
                      <div
                        key={leave.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-outline-variant/40 bg-surface hover:bg-surface-variant/30 transition-colors"
                      >
                        <div>
                          <p className="text-xs font-extrabold text-on-surface">
                            {new Date(leave.leaveDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </p>
                          <p className="text-xs font-bold text-on-surface-variant mt-0.5 line-clamp-1">{leave.reason || 'Personal'}</p>
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs font-extrabold px-2.5 py-1 rounded-md border ${config.color}`}>
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
      </div>

      {/* Request Leave Modal */}
      <Modal isOpen={isLeaveModalOpen} onClose={() => setIsLeaveModalOpen(false)} title="Request Leave">
        <form onSubmit={handleRequestLeave} className="space-y-5 mt-2">
          <Input
            label="Leave Date"
            type="date"
            value={leaveDate}
            onChange={e => setLeaveDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            required
          />
          <div>
            <label className="block text-sm font-extrabold text-on-surface mb-1.5">Reason for Leave</label>
            <textarea
              className="w-full border border-outline-variant bg-surface text-on-surface rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-sm text-sm font-bold resize-none transition-all placeholder:text-on-surface-variant/60"
              value={leaveReason}
              onChange={e => setLeaveReason(e.target.value)}
              placeholder="e.g. Medical appointment, family occasion"
              rows={3}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/40">
            <Button variant="ghost" type="button" onClick={() => setIsLeaveModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" className="bg-[#f59e0b] hover:bg-[#d97706] text-white border-transparent font-extrabold" isLoading={submittingLeave}>
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
