import React, { useState, useEffect } from 'react';
import { Card } from './common/Card';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { Avatar } from './common/Avatar';
import { Modal } from './common/Modal';
import { 
  Settings2, 
  Calendar as CalendarIcon, 
  MapPin, 
  Download, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Scale, 
  Edit3, 
  Send,
  Plus,
  Trash2,
  AlertTriangle,
  Users,
  RefreshCw,
  X,
  TrendingUp
} from 'lucide-react';
import * as api from '../api';
import { useToast } from './common/Toast';

export function AiGenerator() {
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [schedule, setSchedule] = useState(null);
  const [publishedRange, setPublishedRange] = useState(null);
  const [generationMetrics, setGenerationMetrics] = useState({ duration: '0', coverage: 0, cost: 0, assigned: 0, total: 0 });
  const [budget, setBudget] = useState(120000);
  const [toggles, setToggles] = useState({ rest: true, leave: true, skill: true });
  const [isEditing, setIsEditing] = useState(false);
  const { showToast } = useToast();
  const [employees, setEmployees] = useState([]);

  // Locations
  const [locations, setLocations] = useState(['Velachery Site', 'Adyar Site', 'T-Nagar Site']);
  const [selectedLocations, setSelectedLocations] = useState(['Velachery Site']);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');

  // Calendar Target Week
  const [targetWeekStart, setTargetWeekStart] = useState(() => {
    const today = new Date();
    const nextMonday = new Date(today);
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    return nextMonday.toISOString().split('T')[0];
  });

  // Progress state during generation
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const emps = await api.getAllEmployees();
      setEmployees(emps.filter(e => e.role !== 'MANAGER'));
    } catch (e) {
      console.warn('Could not load employees:', e.message);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setSchedule(null);
    setGenerationProgress(0);
    setGenerationStatus('Initializing AI engine...');
    const genStartTime = Date.now();

    try {
      const start = new Date(targetWeekStart);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      const startStr = start.toISOString().split('T')[0] + 'T00:00:00';
      const endStr = end.toISOString().split('T')[0] + 'T23:59:59';

      console.log('[AiGenerator] Starting generation:', { startStr, endStr, budget });
      setGenerationStatus('Submitting schedule request...');
      setGenerationProgress(10);

      const jobRes = await api.generateSchedule(startStr, endStr, budget);
      const jobId = jobRes.jobId;
      console.log('[AiGenerator] Job created:', jobId);

      setGenerationStatus('Constraint solver running...');
      setGenerationProgress(20);

      // Poll for job completion
      let status = 'PENDING';
      let attempts = 0;
      const maxAttempts = 60; // 90 seconds max

      while ((status === 'PENDING' || status === 'RUNNING') && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        try {
          const jobInfo = await api.getJobStatus(jobId);
          status = jobInfo.status;
          const serverProgress = jobInfo.progressPct || 0;
          setGenerationProgress(Math.max(20, serverProgress));

          const statusMessages = {
            'PENDING': 'Solver queued...',
            'RUNNING': serverProgress < 40 ? 'Loading constraints...' :
                       serverProgress < 70 ? 'Running CP-SAT optimizer...' :
                       serverProgress < 90 ? 'Finalizing assignments...' : 'Saving shifts...'
          };
          setGenerationStatus(statusMessages[status] || 'Processing...');
          console.log(`[AiGenerator] Poll #${attempts + 1}: status=${status}, progress=${serverProgress}%`);
        } catch (pollErr) {
          console.warn('[AiGenerator] Poll error:', pollErr.message);
        }
        attempts++;
      }

      if (status === 'FAILED') {
        const jobInfo = await api.getJobStatus(jobId).catch(() => ({}));
        throw new Error(jobInfo.errorMessage || 'Schedule generation failed.');
      }
      if (status === 'PENDING' || status === 'RUNNING') {
        throw new Error('Generation timed out. The solver is taking too long. Please try again.');
      }

      setGenerationProgress(95);
      setGenerationStatus('Fetching generated shifts...');
      console.log('[AiGenerator] Solver completed. Fetching shifts...');

      const shifts = await api.getShifts(startStr, endStr) || [];
      console.log(`[AiGenerator] Fetched ${shifts.length} shifts`);

      if (shifts.length === 0) {
        showToast('No shifts were created. Make sure you have employees in your team.', 'error');
        setSchedule(null);
        return;
      }

      // Build schedule grid — only include shifts with assigned employees
      const empMap = {};
      let totalAssignedHours = 0;
      let totalCost = 0;
      let assignedShiftCount = 0;
      let unassignedCount = 0;

      shifts.forEach(s => {
        if (!s.employee) {
          unassignedCount++;
          return; // Skip unassigned shifts — no "Open Pool"
        }

        const empId = s.employee.id;
        const empName = s.employee.name;
        const role = s.employee.role;

        if (!empMap[empId]) {
          empMap[empId] = { employeeId: empId, employeeName: empName, role, days: Array(7).fill(null) };
        }

        const shiftDate = new Date(s.startTime);
        const startDay = new Date(startStr);
        // Safe day calculation using date parts only
        const shiftDateOnly = new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate());
        const startDateOnly = new Date(startDay.getFullYear(), startDay.getMonth(), startDay.getDate());
        const daysDiff = Math.round((shiftDateOnly - startDateOnly) / (1000 * 60 * 60 * 24));

        if (daysDiff >= 0 && daysDiff < 7) {
          const st = new Date(s.startTime);
          const et = new Date(s.endTime);
          const stH = st.getHours().toString().padStart(2, '0');
          const stM = st.getMinutes().toString().padStart(2, '0');
          const etH = et.getHours().toString().padStart(2, '0');
          const etM = et.getMinutes().toString().padStart(2, '0');
          empMap[empId].days[daysDiff] = {
            time: `${stH}:${stM} – ${etH}:${etM}`,
            task: s.role?.replace('_', ' '),
            shiftId: s.id
          };

          const durationHours = (et - st) / (1000 * 60 * 60);
          totalAssignedHours += durationHours;
          totalCost += durationHours * (s.employee.baseHourlyRate || 100);
          assignedShiftCount++;
        }
      });

      const scheduleResult = Object.values(empMap);
      const genDuration = ((Date.now() - genStartTime) / 1000).toFixed(1);
      const coveragePct = shifts.length > 0 ? Math.round((assignedShiftCount / shifts.length) * 100) : 0;

      setGenerationMetrics({
        duration: genDuration,
        coverage: coveragePct,
        cost: Math.round(totalCost),
        assigned: assignedShiftCount,
        total: shifts.length
      });
      setSchedule(scheduleResult);
      setPublishedRange({ startStr, endStr });
      setGenerationProgress(100);

      const unassignedMsg = unassignedCount > 0 ? ` (${unassignedCount} shifts unassigned due to constraints)` : '';
      showToast(`Schedule generated! ${assignedShiftCount}/${shifts.length} shifts assigned${unassignedMsg}.`, 'success');
      console.log(`[AiGenerator] Done: ${scheduleResult.length} employee rows, coverage=${coveragePct}%`);

    } catch (e) {
      console.error('[AiGenerator] Generation failed:', e);
      showToast('Failed to generate schedule: ' + e.message, 'error');
      setSchedule(null);
      setGenerationProgress(0);
    } finally {
      setLoading(false);
      setGenerationStatus('');
    }
  };

  const handlePublish = async () => {
    if (!publishedRange) return;
    setPublishing(true);
    try {
      const result = await api.publishSchedule(publishedRange.startStr, publishedRange.endStr);
      showToast(`✅ ${result.publishedCount} shifts published! Employees can now see their schedules.`, 'success');
    } catch (e) {
      showToast('Failed to publish schedule: ' + e.message, 'error');
    } finally {
      setPublishing(false);
    }
  };

  const handleAddLocation = (e) => {
    e.preventDefault();
    if (newLocationName.trim() && !locations.includes(newLocationName.trim())) {
      setLocations([...locations, newLocationName.trim()]);
      setSelectedLocations([...selectedLocations, newLocationName.trim()]);
      setNewLocationName('');
      setIsAddLocationOpen(false);
    }
  };

  const toggleLocationSelection = (loc) => {
    if (selectedLocations.includes(loc)) {
      if (selectedLocations.length > 1) setSelectedLocations(selectedLocations.filter(l => l !== loc));
    } else {
      setSelectedLocations([...selectedLocations, loc]);
    }
  };

  const getComplianceViolations = () => {
    if (!schedule) return [];
    const violations = [];
    schedule.forEach(row => {
      let totalHours = 0;
      row.days.forEach((dayShift, index) => {
        if (!dayShift) return;
        const parts = dayShift.time.split(' – ');
        if (parts.length === 2) {
          const [sh] = parts[0].split(':').map(Number);
          const [eh] = parts[1].split(':').map(Number);
          let diff = eh - sh;
          if (diff < 0) diff += 24;
          totalHours += diff;

          const nextDayShift = row.days[index + 1];
          if (nextDayShift) {
            const nextParts = nextDayShift.time.split(' – ');
            if (nextParts.length === 2) {
              const [nsh] = nextParts[0].split(':').map(Number);
              let restHours = nsh - eh;
              if (restHours < 0) restHours += 24;
              if (eh >= 14 && nsh <= 9 && restHours < 11) {
                violations.push({
                  type: 'clopening',
                  employee: row.employeeName,
                  message: `⚠️ Rest Period: ${row.employeeName} works late shift ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]} → early shift ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index + 1]} (${restHours}h rest)`
                });
              }
            }
          }
        }
      });
      if (totalHours > 40) {
        violations.push({
          type: 'overtime',
          employee: row.employeeName,
          message: `⚠️ Overtime: ${row.employeeName} is scheduled ${totalHours}h (cap: 40h)`
        });
      }
    });
    return violations;
  };

  const getDailyCoverage = (dayIdx) => {
    if (!schedule) return { pct: 100, status: 'optimal', label: 'Optimal', count: 0 };
    let assigned = 0;
    schedule.forEach(row => { if (row.days[dayIdx]) assigned++; });
    const target = Math.max(1, employees.length);
    const pct = Math.round((assigned / target) * 100);
    if (assigned === 0) return { pct: 0, status: 'empty', label: 'No Cover', count: 0 };
    if (assigned < target) return { pct, status: 'understaffed', label: `${assigned}/${target}`, count: assigned };
    return { pct: 100, status: 'optimal', label: `${assigned}/${target}`, count: assigned };
  };

  const Toggle = ({ label, checked, onChange, description }) => (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <span className="text-sm font-semibold text-on-surface">{label}</span>
        {description && <p className="text-[10px] text-outline mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full relative transition-all duration-200 shrink-0 ${checked ? 'bg-[#1e1a8a]' : 'bg-outline-variant'}`}
        type="button"
      >
        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-all duration-200 ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );

  // Compute days of the week for display
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(targetWeekStart);
    d.setDate(d.getDate() + i);
    return {
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' })
    };
  });

  return (
    <div className="flex h-full overflow-hidden bg-[#fafbfc]">

      {/* ── Left Parameters Panel ── */}
      <div className="w-80 bg-white border-r border-outline-variant flex flex-col shrink-0 shadow-sm">
        <div className="p-6 border-b border-outline-variant bg-gradient-to-br from-[#1e1a8a] to-[#312e9e]">
          <h2 className="text-lg font-bold flex items-center gap-2 text-white">
            <Settings2 className="w-5 h-5" />Parameters
          </h2>
          <p className="text-white/60 text-xs mt-1">Configure AI constraints and generate the optimal roster.</p>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-5">

          {/* Team summary */}
          <div className="bg-[#1e1a8a]/5 rounded-xl p-3 border border-[#1e1a8a]/10 flex items-center gap-3">
            <div className="w-9 h-9 bg-[#1e1a8a]/10 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-[#1e1a8a]" />
            </div>
            <div>
              <div className="text-sm font-bold text-on-surface">{employees.length} Employee{employees.length !== 1 ? 's' : ''} in Team</div>
              <div className="text-[10px] text-outline">{employees.map(e => e.name.split(' ')[0]).join(', ') || 'No employees yet'}</div>
            </div>
          </div>

          {/* Target Week */}
          <div>
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider mb-2 block">Target Week Start</label>
            <div className="relative flex items-center">
              <input
                type="date"
                value={targetWeekStart}
                onChange={e => setTargetWeekStart(e.target.value)}
                className="w-full bg-white border border-outline-variant rounded-xl p-2.5 pl-10 font-semibold text-sm outline-none shadow-sm focus:border-[#1e1a8a] focus:ring-2 focus:ring-[#1e1a8a]/20 cursor-pointer text-on-surface"
              />
              <CalendarIcon className="w-4 h-4 text-[#1e1a8a] absolute left-3 pointer-events-none" />
            </div>
            <p className="text-[10px] text-outline mt-1.5">
              Week: {new Date(targetWeekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {(() => { const e = new Date(targetWeekStart); e.setDate(e.getDate() + 6); return e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); })()}
            </p>
          </div>

          {/* Location Multi-Select */}
          <div className="relative">
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider mb-2 block">Locations / Sites</label>
            <div
              onClick={() => setShowLocationDropdown(!showLocationDropdown)}
              className="flex items-center justify-between px-3 py-2.5 border border-outline-variant rounded-xl bg-white shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <MapPin className="w-4 h-4 text-[#1e1a8a] shrink-0" />
                <span className="text-sm font-semibold text-on-surface truncate">{selectedLocations.join(', ')}</span>
              </div>
              <span className="text-xs font-bold text-outline shrink-0">▼</span>
            </div>
            {showLocationDropdown && (
              <div className="absolute top-full left-0 right-0 bg-white border border-outline-variant rounded-xl shadow-xl z-30 p-2 space-y-1 mt-1">
                {locations.map(loc => (
                  <label key={loc} className="flex items-center gap-2 p-2 hover:bg-surface-variant/40 rounded-lg cursor-pointer text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={selectedLocations.includes(loc)}
                      onChange={() => toggleLocationSelection(loc)}
                      className="rounded text-[#1e1a8a] focus:ring-[#1e1a8a] cursor-pointer"
                    />
                    {loc}
                  </label>
                ))}
                <div className="border-t border-outline-variant pt-2 mt-1">
                  <button
                    onClick={() => { setShowLocationDropdown(false); setIsAddLocationOpen(true); }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-[#1e1a8a] hover:bg-[#1e1a8a]/5 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />Add Location
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Constraint Toggles */}
          <div className="border border-outline-variant rounded-xl p-4 space-y-1 bg-white shadow-sm">
            <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-3">Constraint Rules</p>
            <Toggle label="Enforce 8hr rest period" checked={toggles.rest} onChange={v => setToggles({ ...toggles, rest: v })} description="Prevent back-to-back overnight shifts" />
            <div className="border-t border-outline-variant/40" />
            <Toggle label="Respect approved leave" checked={toggles.leave} onChange={v => setToggles({ ...toggles, leave: v })} description="Block employees on approved leave days" />
            <div className="border-t border-outline-variant/40" />
            <Toggle label="Skill-based matching" checked={toggles.skill} onChange={v => setToggles({ ...toggles, skill: v })} description="Assign employees by their role" />
          </div>

          {/* Budget */}
          <div>
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider mb-2 block">Weekly Budget Cap</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <span className="text-on-surface-variant font-bold text-sm">₹</span>
              </div>
              <input
                type="number"
                className="w-full pl-8 pr-3 py-2.5 border border-outline-variant rounded-xl font-semibold shadow-sm focus:ring-2 focus:ring-[#1e1a8a]/20 focus:border-[#1e1a8a] outline-none text-sm"
                value={budget}
                onChange={e => setBudget(Number(e.target.value))}
              />
            </div>
            <p className="text-[10px] text-outline mt-1">Estimated weekly wages ceiling</p>
          </div>

        </div>

        {/* Generate Button */}
        <div className="p-5 border-t border-outline-variant bg-white">
          <Button
            className="w-full bg-gradient-to-r from-[#1e1a8a] to-[#312e9e] hover:from-[#1e1a8a]/90 hover:to-[#312e9e]/90 text-white font-bold py-3 shadow-lg rounded-xl"
            onClick={handleGenerate}
            isLoading={loading}
          >
            {!loading && <SparklesIcon className="w-4 h-4 mr-2" />}
            {loading ? generationStatus || 'Generating...' : 'Generate Schedule with AI'}
          </Button>

          {/* Progress Bar */}
          {loading && (
            <div className="mt-3">
              <div className="flex justify-between text-[10px] font-semibold text-outline mb-1">
                <span>Progress</span>
                <span>{generationProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-surface-variant rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#1e1a8a] to-[#14b8a6] rounded-full transition-all duration-700"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right Schedule View ── */}
      <div className="flex-1 overflow-auto p-6">
        {!schedule && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-outline">
            <div className="w-20 h-20 bg-[#1e1a8a]/5 rounded-2xl flex items-center justify-center mb-5">
              <SparklesIcon className="w-10 h-10 text-[#1e1a8a]/40" />
            </div>
            <p className="text-xl font-bold text-on-surface mb-1">Ready to generate schedule</p>
            <p className="text-sm text-on-surface-variant max-w-xs text-center">
              Configure your parameters on the left and click "Generate Schedule with AI" to create an optimized roster.
            </p>
            {employees.length === 0 && (
              <div className="mt-6 bg-[#fffbeb] border border-[#fcd34d] rounded-xl p-4 flex items-start gap-3 max-w-sm">
                <AlertTriangle className="w-5 h-5 text-[#b45309] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-[#b45309]">No employees in team</p>
                  <p className="text-xs text-[#92400e] mt-0.5">Add employees to the Roster before generating a schedule.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-[#1e1a8a]/5 flex items-center justify-center mb-6 relative">
              <SparklesIcon className="w-10 h-10 text-[#1e1a8a]" />
              <div className="absolute inset-0 rounded-2xl border-4 border-[#1e1a8a]/20 border-t-[#1e1a8a] animate-spin" />
            </div>
            <h3 className="text-lg font-bold text-on-surface mb-1">{generationStatus}</h3>
            <p className="text-sm text-on-surface-variant text-center max-w-xs">
              The AI constraint solver is optimizing shift assignments respecting all rules.
            </p>
            <div className="mt-6 w-64 h-2 bg-surface-variant rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#1e1a8a] to-[#14b8a6] rounded-full transition-all duration-700"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
            <p className="text-xs font-bold text-outline mt-2">{generationProgress}% complete</p>
          </div>
        )}

        {schedule && schedule.length > 0 && !loading && (
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-on-surface">Generated Schedule</h2>
                <p className="text-sm text-on-surface-variant mt-0.5">
                  Week of {new Date(targetWeekStart).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="bg-white font-bold border-outline-variant shadow-sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  {isEditing ? 'Done Editing' : 'Edit'}
                </Button>
                <Button
                  className="bg-gradient-to-r from-[#14b8a6] to-[#0d9488] hover:from-[#0d9488] hover:to-[#0f766e] font-bold text-white border-transparent shadow-md px-5"
                  onClick={handlePublish}
                  isLoading={publishing}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Publish to Staff
                </Button>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { icon: <Clock className="w-4 h-4 text-[#1e1a8a]" />, label: 'Generated in', value: `${generationMetrics.duration}s` },
                { icon: <CheckCircle2 className="w-4 h-4 text-success" />, label: 'Coverage', value: `${generationMetrics.coverage}%` },
                { icon: <DollarSign className="w-4 h-4 text-[#8b5cf6]" />, label: 'Est. Cost', value: `₹${generationMetrics.cost.toLocaleString()}` },
                { icon: <TrendingUp className="w-4 h-4 text-[#14b8a6]" />, label: 'Assigned', value: `${generationMetrics.assigned}/${generationMetrics.total}` }
              ].map((m, i) => (
                <div key={i} className="bg-white rounded-xl p-3 border border-outline-variant/40 shadow-sm flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-variant/50 flex items-center justify-center shrink-0">{m.icon}</div>
                  <div>
                    <div className="text-[10px] font-bold text-outline uppercase tracking-wider">{m.label}</div>
                    <div className="text-base font-extrabold text-on-surface">{m.value}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-5 items-start">
              {/* Schedule Grid */}
              <div className="flex-1 min-w-0">
                <Card className="shadow-sm border-outline-variant/40 overflow-hidden rounded-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-outline-variant bg-surface-variant/20">
                          <th className="p-4 font-bold text-xs text-outline uppercase tracking-wider w-52 border-r border-outline-variant">Employee</th>
                          {weekDays.map((day, idx) => {
                            const cov = getDailyCoverage(idx);
                            return (
                              <th key={idx} className="p-3 font-bold text-xs text-center text-on-surface uppercase tracking-wider min-w-[130px] border-r border-outline-variant last:border-r-0">
                                <div className="font-bold">{day.label}</div>
                                <div className="text-[10px] font-semibold text-outline normal-case font-normal mt-0.5">{day.month} {day.date}</div>
                                <div className="flex items-center justify-center gap-1 mt-1">
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    cov.status === 'empty' ? 'bg-outline-variant' :
                                    cov.status === 'understaffed' ? 'bg-[#ef4444]' : 'bg-[#10b981]'
                                  }`} />
                                  <span className="text-[9px] text-outline font-semibold">{cov.label}</span>
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/40">
                        {schedule.map(row => (
                          <tr key={row.employeeId} className="hover:bg-surface-variant/10 transition-colors">
                            <td className="p-4 border-r border-outline-variant">
                              <div className="flex items-center gap-3">
                                <Avatar name={row.employeeName} size="md" />
                                <div>
                                  <div className="font-bold text-sm text-on-surface">{row.employeeName}</div>
                                  <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mt-0.5">{row.role?.replace('_', ' ')}</div>
                                </div>
                              </div>
                            </td>
                            {row.days.map((dayShift, i) => (
                              <td key={i} className="p-2 border-r border-outline-variant/40 last:border-r-0">
                                {dayShift ? (
                                  <div className="bg-gradient-to-br from-[#14b8a6]/10 to-[#0d9488]/5 border-l-[3px] border-[#14b8a6] p-2.5 rounded-r-lg relative group">
                                    <div className="font-bold text-[#0d9488] text-[11px] leading-snug">{dayShift.time}</div>
                                    <div className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider mt-0.5">{dayShift.task}</div>
                                    {isEditing && (
                                      <button
                                        className="absolute -top-1.5 -right-1.5 bg-error text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                        onClick={() => {
                                          const updated = schedule.map(r => {
                                            if (r.employeeId !== row.employeeId) return r;
                                            const newDays = [...r.days];
                                            newDays[i] = null;
                                            return { ...r, days: newDays };
                                          });
                                          setSchedule(updated);
                                        }}
                                      >✕</button>
                                    )}
                                  </div>
                                ) : (
                                  isEditing ? (
                                    <button className="w-full py-3 border border-dashed border-outline-variant hover:border-[#14b8a6] hover:bg-[#14b8a6]/5 rounded-lg text-[10px] font-bold text-outline hover:text-[#14b8a6] transition-all">
                                      + Add
                                    </button>
                                  ) : (
                                    <div className="h-12 flex items-center justify-center">
                                      <span className="w-1 h-1 rounded-full bg-outline-variant" />
                                    </div>
                                  )
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              {/* Compliance Panel */}
              <div className="w-72 shrink-0">
                <Card className="p-5 border-outline-variant/40 shadow-sm bg-white rounded-xl space-y-4">
                  <div className="border-b border-outline-variant pb-3">
                    <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                      <Scale className="w-4 h-4 text-[#1e1a8a]" />Labor Compliance
                    </h3>
                    <p className="text-[10px] text-on-surface-variant mt-0.5">Real-time labor law check</p>
                  </div>

                  {/* Score */}
                  <div className="flex items-center gap-3 bg-[#fafbfc] p-3 rounded-xl border border-outline-variant/40">
                    <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center text-sm font-extrabold ${
                      getComplianceViolations().length === 0
                        ? 'border-[#14b8a6] text-[#0d9488] bg-[#14b8a6]/5'
                        : 'border-[#f59e0b] text-[#b45309] bg-[#f59e0b]/5'
                    }`}>
                      {Math.max(0, 100 - getComplianceViolations().length * 10)}%
                    </div>
                    <div>
                      <div className="text-sm font-bold text-on-surface">Compliance Score</div>
                      <div className="text-xs text-on-surface-variant font-medium">
                        {getComplianceViolations().length === 0 ? 'Fully compliant ✓' : `${getComplianceViolations().length} issue${getComplianceViolations().length > 1 ? 's' : ''} detected`}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {getComplianceViolations().length === 0 ? (
                      <div className="p-4 bg-[#f0fdf4] border border-[#b9f6ca] rounded-xl text-center">
                        <CheckCircle2 className="w-7 h-7 text-[#14b8a6] mx-auto mb-1.5" />
                        <div className="text-xs font-bold text-[#15803d]">All Clear</div>
                        <p className="text-[10px] text-[#1b5e20] mt-1">Schedule adheres to all rest period and weekly hour guidelines.</p>
                      </div>
                    ) : (
                      getComplianceViolations().map((v, idx) => (
                        <div key={idx} className="p-3 bg-[#fff8e1] border border-[#ffe082] rounded-xl text-xs font-semibold text-[#7f5f00] flex gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#f59e0b] mt-0.5" />
                          <p className="leading-relaxed">{v.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Location Modal */}
      <Modal isOpen={isAddLocationOpen} onClose={() => setIsAddLocationOpen(false)} title="Register Store Location">
        <form onSubmit={handleAddLocation} className="space-y-4">
          <Input
            label="Location Name"
            value={newLocationName}
            onChange={e => setNewLocationName(e.target.value)}
            placeholder="e.g. Adyar Site, Warehouse-B"
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsAddLocationOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" className="bg-[#1e1a8a] text-white">Create Location</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export const SparklesIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3v3M12 18v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M3 12h3M18 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
  </svg>
);
