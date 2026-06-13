import React, { useState, useEffect } from 'react';
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
  Coffee,
  CheckCircle2,
  CalendarRange
} from 'lucide-react';
import { SparklesIcon } from './AiGenerator';
import { useToast } from './common/Toast';
import { Button } from './common/Button';
import { Modal } from './common/Modal';
import { Input } from './common/Input';
import * as api from '../api';

export function EmployeeDashboard({ user, onOpenProfile, onLogout }) {
  const { showToast } = useToast();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Leave request state
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);

  useEffect(() => {
    fetchMyShifts();
  }, []);

  const fetchMyShifts = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const monday = new Date(today);
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      monday.setDate(diff);

      const startOfWeek = monday.toISOString().split('T')[0] + 'T00:00:00';
      const tempEnd = new Date(monday);
      tempEnd.setDate(monday.getDate() + 6);
      const endOfWeek = tempEnd.toISOString().split('T')[0] + 'T23:59:59';

      const allShifts = await api.getShifts(startOfWeek, endOfWeek) || [];
      // Filter shifts assigned to logged-in user
      const myShifts = allShifts.filter(s => s.employee && s.employee.name === user.name);
      
      // Sort shifts by start time
      myShifts.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
      setShifts(myShifts);
    } catch (e) {
      console.error("Failed to load employee shifts:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async (shiftId) => {
    try {
      await api.clockInShift(shiftId);
      showToast("Successfully clocked in! Work time started.", "success");
      fetchMyShifts();
    } catch (e) {
      showToast(e.message || "Failed to clock in.", "error");
    }
  };

  const handleClockOut = async (shiftId) => {
    try {
      await api.clockOutShift(shiftId);
      showToast("Successfully clocked out! Timesheet saved.", "success");
      fetchMyShifts();
    } catch (e) {
      showToast(e.message || "Failed to clock out.", "error");
    }
  };

  const handleRequestSwap = async (shiftId) => {
    try {
      await api.createSwapRequest(shiftId, null); // post to swap marketplace
      showToast("Shift swap request posted to Marketplace!", "success");
      fetchMyShifts();
    } catch (e) {
      showToast(e.message || "Failed to submit swap request.", "error");
    }
  };

  const handleRequestLeave = async (e) => {
    e.preventDefault();
    setSubmittingLeave(true);
    try {
      await api.requestLeave(leaveDate, leaveReason);
      showToast("Leave request submitted to Manager!", "success");
      setIsLeaveModalOpen(false);
      setLeaveDate('');
      setLeaveReason('');
    } catch (e) {
      showToast(e.message || "Failed to submit leave request.", "error");
    } finally {
      setSubmittingLeave(false);
    }
  };

  const formatShiftDateLabel = (startTimeStr) => {
    const d = new Date(startTimeStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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

  // Find next shift (not clocked out yet)
  const nextShift = shifts.find(s => s.clockStatus !== 'CLOCKED_OUT');

  return (
    <div className="flex-1 bg-surface-variant flex justify-center items-center h-full overflow-hidden">
      <div className="w-full max-w-[400px] h-full bg-surface shadow-2xl relative flex flex-col overflow-hidden sm:rounded-3xl sm:h-[850px] border border-outline-variant">
        
        {/* Header */}
        <header className="px-6 pt-8 pb-4 flex justify-between items-center bg-surface z-10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#1e1a8a] rounded flex items-center justify-center">
              <SparklesIcon className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-[#1e1a8a]">ScheduleIQ</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant hover:text-error transition-colors relative" onClick={onLogout} title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant relative" onClick={() => setIsLeaveModalOpen(true)} title="Request Leave">
              <CalendarRange className="w-5 h-5" />
            </button>
            <button onClick={onOpenProfile}>
              <Avatar name={user?.name || 'User'} size="md" className="border-2 border-surface shadow-sm" />
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
          <div className="px-6 space-y-6">
            
            {/* Greeting */}
            <div>
              <h1 className="text-2xl font-bold text-on-surface">Hello, {user?.name?.split(' ')[0] || 'Team Member'} 👋</h1>
              <p className="text-sm text-on-surface-variant mt-1">Manage your shifts and check-in times below.</p>
            </div>

            {/* Next Shift / Time Clock Hero Card */}
            {nextShift ? (
              <div className="bg-[#1e1a8a] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border border-white/10">
                    {nextShift.clockStatus === 'CLOCKED_IN' ? '🔴 Active Shift' : 'Next Shift'}
                  </span>
                  <CalendarDays className="w-5 h-5 text-white/80" />
                </div>
                
                <div className="mb-4">
                  <p className="text-xs font-bold text-white/80 uppercase tracking-wider mb-1">
                    {formatShiftDateLabel(nextShift.startTime)}
                  </p>
                  <h2 className="text-[28px] font-extrabold leading-tight tracking-tight">
                    {formatTimeLabel(nextShift.startTime)}<br/>– {formatTimeLabel(nextShift.endTime)}
                  </h2>
                </div>
                
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-3 text-sm font-semibold text-white/90">
                    <MapPin className="w-4 h-4 text-white/60" /> Adyar Store
                  </div>
                  <div className="flex items-center gap-3 text-sm font-semibold text-white/90">
                    <Briefcase className="w-4 h-4 text-white/60" /> {nextShift.role}
                  </div>
                </div>

                {/* Clock In / Out Buttons */}
                <div className="pt-2">
                  {nextShift.clockStatus !== 'CLOCKED_IN' ? (
                    <Button 
                      className="w-full bg-[#14b8a6] hover:bg-[#0d9488] text-white font-bold py-3 shadow-md"
                      onClick={() => handleClockIn(nextShift.id)}
                    >
                      <Clock className="w-4 h-4 mr-2" /> Clock In
                    </Button>
                  ) : (
                    <Button 
                      className="w-full bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold py-3 shadow-md border-transparent"
                      onClick={() => handleClockOut(nextShift.id)}
                    >
                      <Clock className="w-4 h-4 mr-2" /> Clock Out
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-[#f1f5f9] border border-outline-variant/50 p-6 rounded-2xl text-center text-outline-variant font-bold">
                No active or upcoming shifts scheduled.
              </div>
            )}

            {/* Timeline */}
            <div>
              <h3 className="text-lg font-bold text-on-surface mb-4">My Roster This Week</h3>
              
              {loading ? (
                <div className="text-center py-8 text-sm text-outline-variant font-semibold">Loading your shifts...</div>
              ) : shifts.length === 0 ? (
                <div className="text-center py-8 text-sm text-outline-variant font-semibold">No shifts assigned to you this week.</div>
              ) : (
                <div className="space-y-3">
                  {shifts.map((s) => {
                    const isClockedOut = s.clockStatus === 'CLOCKED_OUT';
                    const isClockedIn = s.clockStatus === 'CLOCKED_IN';
                    
                    return (
                      <div 
                        key={s.id} 
                        className={`relative flex items-center justify-between pl-6 py-4 border rounded-xl shadow-sm ${
                          isClockedOut ? 'bg-surface-variant/30 border-outline-variant/50' : 
                          isClockedIn ? 'border-l-4 border-l-[#14b8a6] bg-white border-outline-variant' :
                          s.status === 'WAITING_SWAP' ? 'border-l-4 border-l-[#f59e0b] bg-white border-outline-variant' :
                          'bg-white border-outline-variant'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold text-[#1e1a8a] uppercase tracking-wider">
                            {formatShiftDateLabel(s.startTime)}
                          </p>
                          <p className="text-base font-bold text-on-surface mt-0.5">
                            {formatTimeLabel(s.startTime)} – {formatTimeLabel(s.endTime)}
                          </p>
                          <p className="text-xs font-semibold text-on-surface-variant mt-1">
                            {s.role} • Adyar Store
                          </p>
                        </div>
                        
                        <div className="mr-4">
                          {isClockedOut ? (
                            <span className="text-[10px] font-bold text-outline bg-surface-variant px-2 py-1 rounded uppercase tracking-wider">
                              Clocked Out
                            </span>
                          ) : s.status === 'WAITING_SWAP' ? (
                            <span className="text-[10px] font-bold text-[#b45309] bg-[#fffbeb] px-2 py-1 rounded border border-[#fcd34d] uppercase tracking-wider">
                              In Swap
                            </span>
                          ) : (
                            <button 
                              className="text-xs font-bold text-[#1e1a8a] border border-[#1e1a8a]/30 px-3 py-1.5 rounded-lg hover:bg-[#1e1a8a]/5 transition-colors"
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
              )}
            </div>
            
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-surface border-t border-outline-variant flex justify-around items-center px-6 pb-2 z-20">
          <button className="flex flex-col items-center gap-1 text-[#1e1a8a]">
            <div className="w-12 h-8 rounded-full bg-[#1e1a8a]/10 flex items-center justify-center">
              <Home className="w-5 h-5 text-[#1e1a8a]" />
            </div>
            <span className="text-[10px] font-bold">Home</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-outline hover:text-on-surface transition-colors mt-2" onClick={() => fetchMyShifts()}>
            <CalendarDays className="w-6 h-6" />
            <span className="text-[10px] font-bold">Sync</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-outline hover:text-on-surface transition-colors mt-2" onClick={() => setIsLeaveModalOpen(true)}>
            <CalendarRange className="w-6 h-6" />
            <span className="text-[10px] font-bold">Leave</span>
          </button>
          <button onClick={onOpenProfile} className="flex flex-col items-center gap-1 text-outline hover:text-on-surface transition-colors mt-2">
            <UserIcon className="w-6 h-6" />
            <span className="text-[10px] font-bold">Profile</span>
          </button>
        </div>

        {/* Request Leave Modal */}
        <Modal isOpen={isLeaveModalOpen} onClose={() => setIsLeaveModalOpen(false)} title="Submit Leave Request">
          <form onSubmit={handleRequestLeave} className="space-y-4">
            <Input 
              label="Leave Date" 
              type="date"
              value={leaveDate}
              onChange={e => setLeaveDate(e.target.value)}
              required 
            />
            <div>
              <label className="block text-sm font-bold text-on-surface mb-1">Reason for Leave</label>
              <textarea 
                className="w-full border border-outline-variant rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary shadow-sm text-sm"
                value={leaveReason}
                onChange={e => setLeaveReason(e.target.value)}
                placeholder="e.g. Medical appointment, family occasion"
                rows={3}
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" type="button" onClick={() => setIsLeaveModalOpen(false)}>Cancel</Button>
              <Button variant="primary" type="submit" className="bg-[#1e1a8a] text-white" isLoading={submittingLeave}>Submit Request</Button>
            </div>
          </form>
        </Modal>

      </div>
    </div>
  );
}
