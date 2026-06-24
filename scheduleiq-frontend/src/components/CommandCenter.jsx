import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './common/Card';
import { Button } from './common/Button';
import { Avatar } from './common/Avatar';
import {
  CalendarDays,
  CheckCircle2,
  ArrowLeftRight,
  AlertTriangle,
  MessageCircle,
  DollarSign,
  CalendarRange,
  Clock,
  ChevronRight,
  TrendingUp,
  Users,
  RefreshCw,
  Zap
} from 'lucide-react';
import * as api from '../api';

const HOUR_START = 6;
const HOUR_SPAN = 18; // 6 AM to midnight

export function CommandCenter() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0); // index into upcoming 7 days
  const [expandedAlert, setExpandedAlert] = useState(null);
  const [data, setData] = useState({
    shiftsThisWeek: 0,
    coverage: 0,
    pendingSwaps: 0,
    noShowRisk: 0,
    totalCost: 0,
    timelineByDay: [],   // array of 7 arrays of shift objects
    weekDays: [],        // array of {label, date, fullDate}
    alerts: [],
    fairness: []
  });

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      // Fetch next 7 days of shifts (from today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 7);

      const todayStr = today.toISOString().split('T')[0] + 'T00:00:00';
      const endStr = endDate.toISOString().split('T')[0] + 'T23:59:59';

      const [shifts, swaps, realAlerts, employees, pendingLeaves] = await Promise.all([
        api.getShifts(todayStr, endStr).catch(() => []),
        api.getSwapRequests().catch(() => []),
        api.getAlerts().catch(() => []),
        api.getAllEmployees().catch(() => []),
        api.getAllLeaves().catch(() => [])
      ]);

      // Build 7-day arrays
      const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        return {
          label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' }),
          date: d.getDate(),
          month: d.toLocaleDateString('en-US', { month: 'short' }),
          fullDate: d.toDateString(),
          isToday: i === 0
        };
      });

      const timelineByDay = weekDays.map(dayObj => {
        return shifts
          .filter(s => new Date(s.startTime).toDateString() === dayObj.fullDate)
          .map(s => {
            const st = new Date(s.startTime);
            const et = new Date(s.endTime);
            return {
              id: s.id,
              name: s.employee ? s.employee.name : 'Unassigned',
              role: s.employee ? s.employee.role : s.role,
              startHour: st.getHours() + st.getMinutes() / 60,
              endHour: et.getHours() === 0 ? 24 : et.getHours() + et.getMinutes() / 60,
              startStr: `${st.getHours().toString().padStart(2, '0')}:${st.getMinutes().toString().padStart(2, '0')}`,
              endStr: `${et.getHours().toString().padStart(2, '0')}:${et.getMinutes().toString().padStart(2, '0')}`,
              isAssigned: !!s.employee,
              status: s.status,
              clockStatus: s.clockStatus
            };
          });
      });

      // Map no-show risk alerts
      const mappedAlerts = realAlerts.map(alert => ({
        id: alert.id,
        name: alert.employee ? alert.employee.name : 'Unassigned Shift',
        time: (() => {
          const st = new Date(alert.startTime);
          const et = new Date(alert.endTime);
          return `${st.getHours().toString().padStart(2,'0')}:${st.getMinutes().toString().padStart(2,'0')} – ${et.getHours().toString().padStart(2,'0')}:${et.getMinutes().toString().padStart(2,'0')}`;
        })(),
        role: alert.employee ? alert.employee.role : alert.role,
        noShowRisk: alert.noShowRisk,
        type: 'no-show'
      }));

      // Map pending leave alerts
      const leaveAlerts = (pendingLeaves || []).filter(l => l.status === 'PENDING').map(leave => ({
        id: `leave-${leave.id}`,
        name: leave.employee ? leave.employee.name : 'Employee',
        time: new Date(leave.leaveDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        role: leave.reason || 'Personal leave',
        noShowRisk: null,
        type: 'leave',
        leaveId: leave.id
      }));

      const allAlerts = [...leaveAlerts, ...mappedAlerts];

      // Compute coverage: % of shifts that have an assigned employee
      const assignedShifts = shifts.filter(s => s.employee != null).length;
      const realCoverage = shifts.length > 0 ? Math.round((assignedShifts / shifts.length) * 100) : 0;

      // Compute fairness from actual assigned shifts this week
      const employeeHoursMap = {};
      shifts.forEach(s => {
        if (!s.employee) return;
        const durationH = (new Date(s.endTime) - new Date(s.startTime)) / (1000 * 60 * 60);
        employeeHoursMap[s.employee.id] = (employeeHoursMap[s.employee.id] || 0) + durationH;
      });

      const mappedFairness = [...employees]
        .filter(e => e.role !== 'MANAGER')
        .map(emp => ({
          name: emp.name,
          role: emp.role,
          hours: Math.round((employeeHoursMap[emp.id] || 0) * 10) / 10,
          wage: (employeeHoursMap[emp.id] || 0) * (emp.baseHourlyRate || 0)
        }))
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 5);

      const totalWages = mappedFairness.reduce((sum, f) => sum + f.wage, 0);

      setData({
        shiftsThisWeek: shifts.length,
        coverage: realCoverage,
        pendingSwaps: swaps.filter(s => s.status === 'PENDING').length,
        noShowRisk: allAlerts.length,
        totalCost: totalWages,
        timelineByDay,
        weekDays,
        alerts: allAlerts,
        fairness: mappedFairness
      });
    } catch (e) {
      console.error('Dashboard fetch error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleMessage = (name) => {
    const email = `${name.replace(' ', '.').toLowerCase()}@company.com`;
    window.location.href = `mailto:${email}?subject=Urgent: Upcoming Shift`;
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'CASHIER': return 'bg-[#14b8a6]/20 text-[#0d9488] border-[#14b8a6]/30';
      case 'STOCKER': return 'bg-[#8b5cf6]/20 text-[#7c3aed] border-[#8b5cf6]/30';
      case 'LEAD_CASHIER': return 'bg-[#1e1a8a]/10 text-[#1e1a8a] border-[#1e1a8a]/20';
      case 'DELIVERY_BOY': return 'bg-[#f59e0b]/20 text-[#b45309] border-[#f59e0b]/30';
      default: return 'bg-surface-variant text-outline border-outline-variant';
    }
  };

  const getShiftBarColor = (role, clockStatus) => {
    if (clockStatus === 'CLOCKED_IN') return 'bg-[#14b8a6] border-[#0d9488]';
    if (clockStatus === 'CLOCKED_OUT') return 'bg-surface-variant border-outline-variant';
    switch (role) {
      case 'CASHIER': return 'bg-[#1e1a8a] border-[#1e1a8a]/80';
      case 'STOCKER': return 'bg-[#7c3aed] border-[#7c3aed]/80';
      case 'LEAD_CASHIER': return 'bg-[#0d9488] border-[#0d9488]/80';
      case 'DELIVERY_BOY': return 'bg-[#d97706] border-[#d97706]/80';
      default: return 'bg-on-surface-variant border-outline';
    }
  };

  const currentHour = new Date().getHours() + new Date().getMinutes() / 60;
  const todayShifts = data.timelineByDay[0] || [];
  const selectedDayShifts = data.timelineByDay[selectedDay] || [];

  const timeLabels = ['6 AM', '9 AM', '12 PM', '3 PM', '6 PM', '9 PM', '12 AM'];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-variant">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#1e1a8a]/20 border-t-[#1e1a8a] rounded-full animate-spin" />
          <p className="text-sm font-semibold text-on-surface-variant">Loading Command Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-surface-variant">
      <div className="w-full max-w-screen-2xl mx-auto p-6 pb-10 space-y-5">

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-on-surface tracking-tight">Command Center</h2>
            <p className="text-sm text-on-surface-variant mt-0.5">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => fetchData(true)}
            className="flex items-center gap-2 text-sm font-bold text-[#1e1a8a] bg-white border border-outline-variant px-4 py-2 rounded-xl hover:shadow-md transition-all"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-[#1e1a8a] to-[#312e9e] border-0 shadow-lg text-white overflow-hidden relative">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/5 rounded-full" />
            <div className="flex justify-between items-start mb-3 relative">
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Weekly Cost</span>
              <DollarSign className="w-4 h-4 text-white/40" />
            </div>
            <div className="text-2xl font-extrabold text-white">₹{data.totalCost?.toLocaleString('en-IN')}</div>
            <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-white h-full rounded-full transition-all" style={{ width: `${Math.min((data.totalCost / 120000) * 100, 100)}%` }} />
            </div>
            <div className="flex justify-between text-[9px] font-bold text-white/50 mt-1">
              <span>{Math.round((data.totalCost / 120000) * 100)}% of cap</span>
              <span>₹1,20,000</span>
            </div>
          </Card>

          <Card className="p-4 bg-white border border-success/20 shadow-sm overflow-hidden relative">
            <div className="absolute -right-2 -top-2 w-14 h-14 bg-success/5 rounded-full" />
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-bold text-success uppercase tracking-wider">Coverage</span>
              <CheckCircle2 className="w-4 h-4 text-success" />
            </div>
            <div className="text-2xl font-extrabold text-on-surface">{data.coverage}%</div>
            <div className="w-full bg-success/10 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-success h-full rounded-full transition-all" style={{ width: `${data.coverage}%` }} />
            </div>
            <div className="text-[10px] font-semibold text-on-surface-variant mt-1">{data.shiftsThisWeek} shifts scheduled</div>
          </Card>

          <Card className="p-4 bg-white border border-outline-variant shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Pending Swaps</span>
              <ArrowLeftRight className="w-4 h-4 text-[#d97706]" />
            </div>
            <div className="text-2xl font-extrabold text-on-surface">{data.pendingSwaps}</div>
            <div className="text-[10px] font-semibold text-on-surface-variant mt-3">
              {data.pendingSwaps === 0 ? 'No pending swap requests' : 'Requires approval by 5 PM'}
            </div>
          </Card>

          <Card className={`p-4 border shadow-sm overflow-hidden relative ${data.noShowRisk > 0 ? 'bg-[#fef2f2] border-error/20' : 'bg-white border-outline-variant'}`}>
            <div className="flex justify-between items-start mb-3">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${data.noShowRisk > 0 ? 'text-error' : 'text-outline'}`}>Critical Alerts</span>
              <AlertTriangle className={`w-4 h-4 ${data.noShowRisk > 0 ? 'text-error' : 'text-outline-variant'}`} />
            </div>
            <div className={`text-2xl font-extrabold ${data.noShowRisk > 0 ? 'text-error' : 'text-on-surface'}`}>{data.noShowRisk}</div>
            <div className="text-[10px] font-semibold text-on-surface-variant mt-3">
              {data.noShowRisk === 0 ? 'All clear! No active risks' : `${data.noShowRisk} action${data.noShowRisk > 1 ? 's' : ''} required`}
            </div>
          </Card>
        </div>

        {/* Interactive Timeline */}
        <Card className="border-outline-variant/40 shadow-sm overflow-hidden">
          <CardHeader className="py-4 border-b border-outline-variant/40 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#1e1a8a]" />
                  Shift Timeline
                  {selectedDay === 0 && <span className="w-2 h-2 rounded-full bg-success animate-pulse ml-1" />}
                </CardTitle>
                <p className="text-xs text-on-surface-variant mt-0.5">Click a day to view its shift schedule</p>
              </div>
              <div className="text-xs font-semibold text-on-surface-variant bg-surface-variant px-3 py-1.5 rounded-lg">
                {selectedDayShifts.length} shift{selectedDayShifts.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Day Selector */}
            <div className="flex gap-1.5 mt-4 overflow-x-auto pb-1">
              {data.weekDays.map((day, idx) => {
                const dayShifts = data.timelineByDay[idx] || [];
                const isActive = idx === selectedDay;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDay(idx)}
                    className={`flex flex-col items-center px-3 py-2 rounded-xl border transition-all shrink-0 ${
                      isActive
                        ? 'bg-[#1e1a8a] border-[#1e1a8a] text-white shadow-md'
                        : 'bg-white border-outline-variant text-on-surface hover:border-[#1e1a8a]/30 hover:bg-[#1e1a8a]/5'
                    }`}
                  >
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? 'text-white/70' : 'text-outline'}`}>{day.label}</span>
                    <span className={`text-base font-extrabold leading-tight ${isActive ? 'text-white' : 'text-on-surface'}`}>{day.date}</span>
                    {dayShifts.length > 0 && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 ${
                        isActive ? 'bg-white/20 text-white' : 'bg-[#14b8a6]/10 text-[#0d9488]'
                      }`}>
                        {dayShifts.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </CardHeader>

          <CardContent className="p-0 bg-white">
            {selectedDayShifts.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                <CalendarDays className="w-10 h-10 text-outline-variant mb-3" />
                <h4 className="text-sm font-bold text-on-surface">
                  No shifts for {data.weekDays[selectedDay]?.label || 'this day'}
                </h4>
                <p className="text-xs text-on-surface-variant max-w-xs mt-1">
                  Generate and publish a schedule from the AI Generator to see shifts here.
                </p>
              </div>
            ) : (
              <div className="p-5">
                {/* Time ruler */}
                <div className="flex pl-36 pr-2 mb-2">
                  {timeLabels.map((label, i) => (
                    <div key={i} className="flex-1 text-[9px] font-bold text-outline uppercase tracking-wider text-center">
                      {label}
                    </div>
                  ))}
                </div>

                {/* Shift rows */}
                <div className="space-y-2 relative">
                  {/* Current time marker — only show for today */}
                  {selectedDay === 0 && currentHour >= HOUR_START && currentHour <= HOUR_START + HOUR_SPAN && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-error/60 z-10 pointer-events-none"
                      style={{ left: `calc(144px + ${((currentHour - HOUR_START) / HOUR_SPAN) * (100 - 0)}% * (100% - 144px) / 100)` }}
                    >
                      <div className="w-2.5 h-2.5 bg-error rounded-full -ml-1 -mt-0.5" />
                    </div>
                  )}

                  {selectedDayShifts.map((row, i) => {
                    const leftPct = Math.max(0, ((row.startHour - HOUR_START) / HOUR_SPAN) * 100);
                    const widthPct = Math.max(1, ((row.endHour - row.startHour) / HOUR_SPAN) * 100);
                    const barColor = getShiftBarColor(row.role, row.clockStatus);

                    return (
                      <div key={row.id} className="flex items-center gap-3 group">
                        {/* Employee label */}
                        <div className="w-36 shrink-0 flex items-center gap-2">
                          <Avatar name={row.name} size="sm" />
                          <div className="overflow-hidden">
                            <div className="text-xs font-bold text-on-surface truncate">{row.name}</div>
                            <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider inline-block mt-0.5 border ${getRoleColor(row.role)}`}>
                              {row.role?.replace('_', ' ')}
                            </div>
                          </div>
                        </div>

                        {/* Timeline bar */}
                        <div className="flex-1 relative h-10 bg-surface-variant/20 rounded-lg border border-outline-variant/20 overflow-hidden">
                          {/* Grid lines */}
                          {[0, 1, 2, 3, 4, 5].map(g => (
                            <div key={g} className="absolute inset-y-0 border-l border-outline-variant/15" style={{ left: `${(g / 6) * 100}%` }} />
                          ))}

                          {/* Shift bar */}
                          <div
                            className={`absolute top-1 bottom-1 rounded-md border ${barColor} text-white flex items-center px-2 shadow-sm transition-all group-hover:brightness-110 cursor-default`}
                            style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: '2rem' }}
                            title={`${row.name}: ${row.startStr} – ${row.endStr}`}
                          >
                            <span className="text-[10px] font-bold truncate opacity-90">
                              {row.startStr} – {row.endStr}
                            </span>
                            {row.clockStatus === 'CLOCKED_IN' && (
                              <span className="ml-1 shrink-0 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex gap-4 mt-4 pt-3 border-t border-outline-variant/30">
                  {[
                    { color: 'bg-[#1e1a8a]', label: 'Cashier' },
                    { color: 'bg-[#7c3aed]', label: 'Stocker' },
                    { color: 'bg-[#14b8a6]', label: 'Active (Clocked In)' },
                    { color: 'bg-surface-variant border border-outline-variant', label: 'Completed' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] font-semibold text-outline">
                      <div className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
                      {item.label}
                    </div>
                  ))}
                  {selectedDay === 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-error ml-auto">
                      <div className="w-0.5 h-3.5 bg-error/60 rounded" />
                      Current Time
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom Split */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Critical Alerts */}
          <Card className="border border-error/20 shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#fef2f2] to-[#fff5f5] border-b border-error/15 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-error">
                  <AlertTriangle className="w-4 h-4" />
                  <CardTitle className="text-error text-base">Critical Alerts</CardTitle>
                </div>
                {data.alerts.length > 0 && (
                  <span className="bg-error text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                    {data.alerts.length} Action{data.alerts.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-80 overflow-y-auto">
              {data.alerts.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-center">
                  <CheckCircle2 className="w-10 h-10 text-success/50 mb-3" />
                  <h4 className="text-sm font-bold text-on-surface">All Clear!</h4>
                  <p className="text-xs text-on-surface-variant mt-1">No critical alerts or no-show risks right now.</p>
                </div>
              ) : (
                data.alerts.map(alert => (
                  <div
                    key={alert.id}
                    className="p-4 flex items-center justify-between border-b border-outline-variant/40 last:border-0 hover:bg-surface-variant/10 transition-colors cursor-pointer"
                    onClick={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={alert.name} size="md" className={alert.type === 'leave' ? 'border-[#f59e0b]/30' : 'border-error/30'} />
                      <div>
                        <h4 className="text-sm font-bold text-on-surface flex items-center gap-2 flex-wrap">
                          {alert.name}
                          {alert.type === 'leave' ? (
                            <span className="text-[9px] font-bold text-[#b45309] bg-[#fffbeb] px-2 py-0.5 rounded-full border border-[#fcd34d]">Pending Leave</span>
                          ) : (
                            <span className="text-[9px] font-bold text-error bg-error/10 px-2 py-0.5 rounded-full">High No-Show Risk</span>
                          )}
                        </h4>
                        <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                          {alert.type === 'leave' ? (
                            <><CalendarRange className="w-3 h-3 inline mr-1" />{alert.time} • {alert.role}</>
                          ) : (
                            <>{alert.time} • {alert.role}</>
                          )}
                        </p>
                        {expandedAlert === alert.id && (
                          <p className="text-[10px] text-outline mt-1.5">
                            {alert.type === 'leave'
                              ? 'Go to Alert Center → Pending Leave Requests to approve or reject.'
                              : `No-show risk: ${Math.round(alert.noShowRisk * 100)}%. Use "Find Replacement" in Alert Center.`}
                          </p>
                        )}
                      </div>
                    </div>
                    {alert.type === 'leave' ? (
                      <span className="text-[9px] font-bold text-[#b45309] bg-[#fffbeb] px-2.5 py-1.5 rounded-lg border border-[#fcd34d] whitespace-nowrap">Review →</span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleMessage(alert.name); }}
                        className="border-outline-variant text-on-surface hover:text-[#1e1a8a] hover:border-[#1e1a8a]/30 font-bold shadow-sm bg-white whitespace-nowrap"
                      >
                        <MessageCircle className="w-3.5 h-3.5 mr-1.5" />Message
                      </Button>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Fairness Snapshot */}
          <Card className="shadow-sm border-outline-variant/40 overflow-hidden">
            <CardHeader className="py-4 border-b border-outline-variant/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#8b5cf6]" />Fairness Snapshot
                </CardTitle>
                <span className="text-[10px] font-bold text-outline bg-surface-variant px-2.5 py-1 rounded-lg uppercase tracking-wider">This Week</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {data.fairness.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-center">
                  <Users className="w-10 h-10 text-outline-variant mb-3" />
                  <h4 className="text-sm font-bold text-on-surface">No data yet</h4>
                  <p className="text-xs text-on-surface-variant mt-1">Generate and publish a schedule to see fairness metrics.</p>
                </div>
              ) : (
                <div>
                  <div className="px-5 py-3 border-b border-outline-variant/40">
                    <p className="text-[10px] font-bold text-outline uppercase tracking-wider">Top 5 by Hours Worked</p>
                  </div>
                  {data.fairness.map((f, i) => {
                    const maxHours = Math.max(...data.fairness.map(x => x.hours), 1);
                    const pct = Math.round((f.hours / maxHours) * 100);
                    return (
                      <div key={i} className="flex items-center px-5 py-3 border-b border-outline-variant/30 last:border-0 hover:bg-surface-variant/10 transition-colors">
                        <span className="text-sm font-extrabold text-outline w-5 shrink-0">{i + 1}</span>
                        <Avatar name={f.name} size="sm" className="mx-3 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-bold text-on-surface truncate">{f.name}</span>
                            <span className="text-xs font-bold text-on-surface-variant ml-2 shrink-0">{f.hours}h</span>
                          </div>
                          <div className="w-full h-1.5 bg-surface-variant rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${i === 0 ? 'bg-[#8b5cf6]' : i === 1 ? 'bg-[#1e1a8a]' : 'bg-[#14b8a6]'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-outline ml-3 shrink-0">₹{f.wage.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
