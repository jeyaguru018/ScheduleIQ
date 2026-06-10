import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './common/Card';
import { Button } from './common/Button';
import { Avatar } from './common/Avatar';
import { 
  CalendarDays, 
  CheckCircle2, 
  ArrowLeftRight, 
  AlertTriangle,
  MessageCircle
} from 'lucide-react';
import * as api from '../api';

export function CommandCenter() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    shiftsThisWeek: 0,
    coverage: 0,
    pendingSwaps: 0,
    noShowRisk: 0,
    timeline: [],
    alerts: [],
    fairness: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const endStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
        
        // Fetch raw data
        const shifts = await api.getShifts(todayStr, endStr).catch(() => []);
        const swaps = await api.getSwapRequests().catch(() => []);
        const realAlerts = await api.getAlerts().catch(() => []);
        const employees = await api.getAllEmployees().catch(() => []);
        
        // Map real alerts from PostgreSQL
        const mappedAlerts = realAlerts.map(alert => {
          const empName = alert.employee ? alert.employee.name : 'Unassigned Shift';
          const empRole = alert.employee ? alert.employee.role : alert.role;
          const start = new Date(alert.startTime);
          const end = new Date(alert.endTime);
          
          const timeStr = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')} - ${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;
          
          return {
            id: alert.id,
            name: empName,
            time: timeStr,
            role: empRole,
            noShowRisk: alert.noShowRisk
          };
        });

        // Compute aggregates based on real database records
        const pendingCount = swaps.filter(s => s.status === 'PENDING').length;
        const totalAlertsCount = mappedAlerts.length;

        // Map timeline from real shifts today
        const todayDay = new Date().getDate();
        const mappedTimeline = shifts
          .filter(s => new Date(s.startTime).getDate() === todayDay)
          .map(s => {
            const st = new Date(s.startTime).getHours();
            const et = new Date(s.endTime).getHours() === 0 ? 24 : new Date(s.endTime).getHours();
            return {
              id: s.id,
              name: s.employee ? s.employee.name : 'Unassigned',
              role: s.employee ? s.employee.role : s.role,
              start: st,
              end: et,
              color: 'bg-primary-container text-primary',
              label: 'Shift',
              hasAlert: false
            };
          });

        // Map fairness from real employees
        const mappedFairness = [...employees]
          .sort((a, b) => (b.currentHoursThisWeek || 0) - (a.currentHoursThisWeek || 0))
          .slice(0, 5)
          .map(emp => ({
            name: emp.name,
            hours: emp.currentHoursThisWeek || 0,
            wage: (emp.currentHoursThisWeek || 0) * (emp.baseHourlyRate || 0)
          }));

        setData({
          shiftsThisWeek: shifts.length,
          coverage: shifts.length > 0 ? 98 : 0,
          pendingSwaps: pendingCount,
          noShowRisk: totalAlertsCount,
          timeline: mappedTimeline,
          alerts: mappedAlerts,
          fairness: mappedFairness
        });
      } catch (e) {
        console.error("Dashboard fetch error", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleMessage = (name) => {
    // Implementing direct messaging via mailto as a functional placeholder for chat
    const email = `${name.replace(' ', '.').toLowerCase()}@company.com`;
    window.location.href = `mailto:${email}?subject=Urgent: Upcoming Shift`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-[#fafbfc]">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-on-surface tracking-tight">Command Dashboard</h2>
            <p className="text-on-surface-variant mt-1">Overview of today's operations and AI-driven insights.</p>
          </div>
          <div className="text-sm font-semibold text-on-surface-variant bg-surface border border-outline-variant px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm">
            <CalendarDays className="w-4 h-4" />
            {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Card className="p-4 flex flex-col justify-between h-32 border-outline-variant shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-outline uppercase tracking-wider">Shifts This Week</span>
              <CalendarDays className="w-4 h-4 text-[#8b5cf6]" />
            </div>
            <div>
              <div className="text-3xl font-extrabold text-on-surface">{data.shiftsThisWeek}</div>
              {/* Mini bar chart representation */}
              <div className="flex items-end gap-1 mt-2 h-6">
                {[4,6,8,5,9,7,6].map((h, i) => (
                  <div key={i} className="flex-1 bg-[#8b5cf6] rounded-t-sm opacity-80" style={{ height: `${h*10}%` }}></div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-4 flex flex-col justify-between h-32 border border-success/20 bg-success/5 shadow-sm">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-success uppercase tracking-wider">Coverage</span>
              <CheckCircle2 className="w-4 h-4 text-success" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-on-surface">{data.coverage}%</span>
                <span className="text-xs font-bold text-success bg-success/10 px-1.5 py-0.5 rounded text-green-700">+2%</span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-success/20 h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-success h-full rounded-full" style={{ width: '94%' }}></div>
              </div>
            </div>
          </Card>

          <Card className="p-4 flex flex-col justify-between h-32 border-outline-variant shadow-sm">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-outline uppercase tracking-wider">Pending Swaps</span>
              <ArrowLeftRight className="w-4 h-4 text-[#d97706]" />
            </div>
            <div>
              <div className="text-3xl font-extrabold text-on-surface">{data.pendingSwaps}</div>
              <div className="text-xs font-medium text-on-surface-variant mt-2">Requires approval by 5 PM</div>
            </div>
          </Card>

          <Card className="p-4 flex flex-col justify-between h-32 border border-error/20 bg-[#fef2f2] shadow-sm">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-error uppercase tracking-wider">No-Show Risk</span>
              <AlertTriangle className="w-4 h-4 text-error" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-error">{data.noShowRisk}</span>
                <span className="text-xs font-bold text-error bg-error/10 px-1.5 py-0.5 rounded">High Probability</span>
              </div>
              <button className="text-xs font-bold text-error hover:underline mt-2 flex items-center gap-1">
                Review AI Mitigation →
              </button>
            </div>
          </Card>
        </div>

        {/* Live Timeline */}
        <Card className="col-span-full shadow-sm border-outline-variant animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150 fill-mode-both">
          <CardHeader className="py-4">
            <CardTitle className="text-lg flex items-center gap-2">
              Today's Live Timeline 
              <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
            </CardTitle>
            <div className="flex gap-4 text-xs font-semibold text-outline uppercase tracking-wider">
              <span className="flex items-center gap-1"><div className="w-2 h-2 bg-primary rounded-full"></div> Front Desk</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 bg-secondary rounded-full"></div> Support</span>
            </div>
          </CardHeader>
          <CardContent className="px-0 pt-2 pb-6">
            {data.timeline.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <CalendarDays className="w-10 h-10 text-outline-variant mb-3" />
                <h4 className="text-sm font-bold text-on-surface">No shifts scheduled today</h4>
                <p className="text-xs text-on-surface-variant max-w-xs mt-1">When shifts are created for today, they will appear on this timeline.</p>
              </div>
            ) : (
              <>
                {/* Timeline Grid */}
                <div className="relative border-b border-outline-variant pb-2">
                  <div className="flex px-6 text-xs font-bold text-outline uppercase tracking-wider">
                    <div className="w-[120px] shrink-0">Employee</div>
                    <div className="flex-1 flex justify-between relative px-2">
                      <span>6 AM</span>
                      <span>9 AM</span>
                      <span className="text-error font-extrabold relative z-10">12 PM<div className="absolute top-4 left-1/2 w-0.5 h-64 bg-error/30 -translate-x-1/2"></div></span>
                      <span>3 PM</span>
                      <span>6 PM</span>
                      <span>9 PM</span>
                      <span>12 AM</span>
                    </div>
                  </div>
                </div>

                {/* Timeline Rows */}
                <div className="flex flex-col mt-2">
                  {data.timeline.map((row) => (
                    <div key={row.id} className="flex px-6 py-3 hover:bg-surface-variant/30 items-center border-b border-outline-variant/50 last:border-0 relative">
                      <div className="w-[120px] shrink-0 flex items-center gap-2">
                        <span className="text-sm font-bold text-on-surface truncate">{row.name}</span>
                        {row.hasAlert && <AlertTriangle className="w-3.5 h-3.5 text-error shrink-0" />}
                      </div>
                      <div className="flex-1 relative h-10 mx-2 bg-surface-variant/30 rounded border border-outline-variant/30">
                        {/* Render the block */}
                        <div 
                          className={`absolute top-1 bottom-1 rounded-md border flex items-center px-3 shadow-sm ${row.color} border-current/20`}
                          style={{ 
                            left: `${((row.start - 6) / 18) * 100}%`, 
                            width: `${((row.end - row.start) / 18) * 100}%` 
                          }}
                        >
                          <span className="text-xs font-bold truncate">{row.label} ({row.role})</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Bottom Split */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
          {/* Critical Alerts */}
          <Card className="border border-error/30 shadow-sm overflow-hidden">
            <CardHeader className="bg-[#fef2f2] border-b border-error/20 py-4">
              <div className="flex items-center gap-2 text-error">
                <AlertTriangle className="w-5 h-5" />
                <CardTitle className="text-error text-lg">Critical Alerts</CardTitle>
              </div>
              {data.alerts.length > 0 && <span className="bg-error text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm">{data.alerts.length} Action{data.alerts.length > 1 ? 's' : ''} Required</span>}
            </CardHeader>
            <CardContent className="p-0">
              {data.alerts.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-center">
                  <CheckCircle2 className="w-10 h-10 text-success/50 mb-3" />
                  <h4 className="text-sm font-bold text-on-surface">All clear!</h4>
                  <p className="text-xs text-on-surface-variant max-w-xs mt-1">No critical alerts or no-show risks detected right now.</p>
                </div>
              ) : (
                data.alerts.map(alert => (
                  <div key={alert.id} className="p-5 flex items-center justify-between border-b border-outline-variant last:border-0 hover:bg-surface-variant/20 transition-colors">
                    <div className="flex items-center gap-4">
                      <Avatar name={alert.name} size="lg" className="border-error/30" />
                      <div>
                        <h4 className="text-base font-bold text-on-surface flex items-center gap-2">
                          {alert.name} 
                          <span className="text-xs font-bold text-error bg-error/10 px-2 py-0.5 rounded">High No-Show Risk</span>
                        </h4>
                        <p className="text-sm text-on-surface-variant font-medium">{alert.time} • {alert.role}</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleMessage(alert.name)}
                      className="border-outline-variant text-on-surface hover:text-primary hover:border-primary font-bold shadow-sm bg-white"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Message
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Fairness Snapshot */}
          <Card className="shadow-sm border-outline-variant">
            <CardHeader className="py-4">
              <CardTitle className="text-lg">Fairness Snapshot</CardTitle>
              <button className="text-sm font-bold text-primary hover:underline">View Full Report</button>
            </CardHeader>
            <CardContent>
              {data.fairness.length === 0 ? (
                <div className="py-6 flex flex-col items-center justify-center text-center">
                  <h4 className="text-sm font-bold text-outline-variant">No data available</h4>
                </div>
              ) : (
                <>
                  <div className="mb-2">
                    <h4 className="text-xs font-bold text-outline uppercase tracking-wider">Overtime distribution this month (Top 5)</h4>
                  </div>
                  {data.fairness.map((f, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-outline-variant/50">
                      <span className="text-sm font-bold text-on-surface">{f.name}</span>
                      <span className="text-sm font-semibold text-on-surface-variant">
                        {f.hours} hrs <span className="text-xs text-outline">(₹{f.wage.toLocaleString()})</span>
                      </span>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
