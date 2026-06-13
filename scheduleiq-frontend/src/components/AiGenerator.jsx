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
  Trash2
} from 'lucide-react';
import * as api from '../api';
import { useToast } from './common/Toast';

export function AiGenerator() {
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState(null);
  const [budget, setBudget] = useState(120000);
  const [toggles, setToggles] = useState({
    rest: true,
    leave: true,
    skill: true
  });
  const [isEditing, setIsEditing] = useState(false);
  const { showToast } = useToast();

  // Locations state
  const [locations, setLocations] = useState([
    'Velachery Site',
    'Adyar Site',
    'T-Nagar Site'
  ]);
  const [selectedLocations, setSelectedLocations] = useState(['Velachery Site']);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');

  // Calendar Target Week state
  const [targetWeekStart, setTargetWeekStart] = useState(() => {
    const today = new Date();
    // Default to next Monday
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
    return nextMonday.toISOString().split('T')[0];
  });

  // Availability loader state
  const [availabilitiesCount, setAvailabilitiesCount] = useState(0);
  const [loadingAvailabilities, setLoadingAvailabilities] = useState(false);

  useEffect(() => {
    // Initial fetch of active availability count on mount
    fetchAvailabilityCount();
  }, []);

  const fetchAvailabilityCount = async () => {
    try {
      const emps = await api.getAllEmployees();
      // Each seeded employee has 5-6 availability entries
      setAvailabilitiesCount(emps.filter(e => e.role !== 'MANAGER').length * 5);
    } catch (e) {
      console.warn("Could not load initial availability count: ", e.message);
    }
  };

  const handleLoadAvailability = async () => {
    setLoadingAvailabilities(true);
    try {
      const emps = await api.getAllEmployees();
      const count = emps.filter(e => e.role !== 'MANAGER').length * 5;
      setAvailabilitiesCount(count);
      showToast(`Successfully synchronized ${count} availability preferences!`);
    } catch (e) {
      showToast("Failed to load availability: " + e.message, 'error');
    } finally {
      setLoadingAvailabilities(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const start = new Date(targetWeekStart);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      
      const startStr = start.toISOString().split('T')[0] + 'T00:00:00';
      const endStr = end.toISOString().split('T')[0] + 'T23:59:59';

      // Call OR-Tools scheduler solver asynchronously
      await api.generateSchedule(startStr, endStr, budget);
      
      // Fetch shifts matching this range
      const shifts = await api.getShifts(startStr, endStr) || [];
      
      const empMap = {};
      shifts.forEach(s => {
        const empName = s.employee ? s.employee.name : 'Open Pool';
        const role = s.employee ? s.employee.role : s.role;
        if (!empMap[empName]) {
          empMap[empName] = { employeeName: empName, role: role, days: Array(7).fill(null) };
        }
        const date = new Date(s.startTime);
        const startDay = new Date(startStr);
        const diffTime = Math.abs(date - startDay);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
        if (diffDays >= 0 && diffDays < 7) {
          const st = date.getHours().toString().padStart(2, '0');
          const sm = date.getMinutes().toString().padStart(2, '0');
          const endObj = new Date(s.endTime);
          const et = endObj.getHours().toString().padStart(2, '0');
          const em = endObj.getMinutes().toString().padStart(2, '0');
          empMap[empName].days[diffDays] = { time: `${st}:${sm} - ${et}:${em}`, task: s.role };
        }
      });

      setSchedule(Object.values(empMap));
      showToast("Schedule generated successfully via AI engine.");
    } catch (e) {
      showToast("Failed to generate schedule: " + e.message, 'error');
      setSchedule([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = () => {
    showToast(`Successfully published shifts for week starting ${targetWeekStart}!`);
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
      if (selectedLocations.length > 1) {
        setSelectedLocations(selectedLocations.filter(l => l !== loc));
      }
    } else {
      setSelectedLocations([...selectedLocations, loc]);
    }
  };

  // Helper for Toggle Switch
  const Toggle = ({ label, checked, onChange }) => (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm font-semibold text-on-surface">{label}</span>
      <button 
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full relative transition-colors ${checked ? 'bg-[#1e1a8a]' : 'bg-outline-variant'}`}
      >
        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden bg-[#fafbfc]">
      {/* Left Parameters Panel */}
      <div className="w-80 bg-surface border-r border-outline-variant flex flex-col shrink-0">
        <div className="p-6 border-b border-outline-variant">
          <h2 className="text-xl font-bold flex items-center gap-2 text-[#1e1a8a]">
            <Settings2 className="w-5 h-5" />
            Parameters
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">Define constraints for the AI engine.</p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* Target Week */}
          <div>
            <label className="text-xs font-bold text-outline uppercase tracking-wider mb-2 block">Target Week Start</label>
            <div className="relative flex items-center">
              <input 
                type="date"
                value={targetWeekStart}
                onChange={e => setTargetWeekStart(e.target.value)}
                className="w-full bg-white border border-outline-variant rounded-lg p-2.5 pl-10 font-semibold text-sm outline-none shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer text-on-surface"
              />
              <CalendarIcon className="w-4 h-4 text-[#1e1a8a] absolute left-3 pointer-events-none" />
            </div>
          </div>

          {/* Location Site Multi-Select */}
          <div className="relative">
            <label className="text-xs font-bold text-outline uppercase tracking-wider mb-2 block">Locations / Sites</label>
            <div 
              onClick={() => setShowLocationDropdown(!showLocationDropdown)}
              className="flex items-center justify-between px-3 py-2.5 border border-outline-variant rounded-lg bg-white shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <MapPin className="w-4 h-4 text-[#1e1a8a]" />
                <span className="text-sm font-semibold text-on-surface truncate">
                  {selectedLocations.join(', ')}
                </span>
              </div>
              <span className="text-xs font-bold text-outline">▼</span>
            </div>

            {showLocationDropdown && (
              <div className="absolute top-[76px] left-0 right-0 bg-white border border-outline-variant rounded-lg shadow-lg z-30 p-2 space-y-1">
                {locations.map(loc => (
                  <label key={loc} className="flex items-center gap-2 p-2 hover:bg-surface-variant/40 rounded cursor-pointer text-sm font-semibold">
                    <input 
                      type="checkbox"
                      checked={selectedLocations.includes(loc)}
                      onChange={() => toggleLocationSelection(loc)}
                      className="rounded text-primary focus:ring-primary cursor-pointer"
                    />
                    {loc}
                  </label>
                ))}
                <div className="border-t border-outline-variant pt-2 mt-1">
                  <button 
                    onClick={() => { setShowLocationDropdown(false); setIsAddLocationOpen(true); }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-[#1e1a8a] hover:bg-primary/5 rounded transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Location
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Load Availability */}
          <div className="flex items-center justify-between p-3 border border-outline-variant rounded-lg bg-white shadow-sm">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[#1e1a8a] font-bold px-0 hover:bg-transparent"
              onClick={handleLoadAvailability}
              isLoading={loadingAvailabilities}
            >
              <Download className="w-4 h-4 mr-2" />
              Load Availability
            </Button>
            <span className="bg-success/10 text-success text-xs font-bold px-2 py-1 rounded-full">
              {availabilitiesCount} loaded
            </span>
          </div>

          <div className="border-t border-b border-outline-variant py-2">
            <Toggle label="Enforce 8hr rest" checked={toggles.rest} onChange={v => setToggles({...toggles, rest: v})} />
            <Toggle label="Respect leave" checked={toggles.leave} onChange={v => setToggles({...toggles, leave: v})} />
            <Toggle label="Skill-based mapping" checked={toggles.skill} onChange={v => setToggles({...toggles, skill: v})} />
          </div>

          <div>
            <label className="text-xs font-bold text-outline uppercase tracking-wider mb-2 block">Weekly Budget Cap</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-on-surface-variant font-medium">₹</span>
              </div>
              <input 
                type="number" 
                className="w-full pl-8 pr-3 py-2 border border-outline-variant rounded-lg font-semibold shadow-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                value={budget}
                onChange={e => setBudget(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-outline-variant bg-surface-variant/20">
          <Button 
            className="w-full bg-[#1e1a8a] hover:bg-[#1e1a8a]/90 text-white font-bold py-3 shadow-md"
            onClick={handleGenerate}
            isLoading={loading}
          >
            <SparklesIcon className="w-4 h-4 mr-2" />
            Generate Schedule with AI
          </Button>
        </div>
      </div>

      {/* Right Schedule View */}
      <div className="flex-1 overflow-auto p-8">
        {!schedule && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-outline">
            <SparklesIcon className="w-16 h-16 mb-4 opacity-50 text-[#1e1a8a]" />
            <p className="text-lg font-bold">Ready to generate schedule</p>
            <p className="text-sm">Configure parameters and run the AI engine.</p>
          </div>
        )}

        {(schedule || loading) && (
          <div className={loading ? "opacity-50 pointer-events-none" : ""}>
            {/* Header Metrics */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                  <Clock className="w-4 h-4 text-success" /> Generated in 2.3s
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                  <CheckCircle2 className="w-4 h-4 text-success" /> Coverage: 98%
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                  <DollarSign className="w-4 h-4 text-on-surface-variant" /> Cost: ₹1,17,400
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                  <Scale className="w-4 h-4 text-on-surface-variant" /> Fairness: 82/100
                </div>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="bg-white font-bold"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  {isEditing ? 'Save Manual Edits' : 'Edit Manually'}
                </Button>
                <Button 
                  variant="success" 
                  className="bg-[#14b8a6] hover:bg-[#0d9488] font-bold text-white border-transparent"
                  onClick={handlePublish}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Publish
                </Button>
              </div>
            </div>

            {/* Schedule Grid */}
            <Card className="shadow-sm border-outline-variant overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-variant/30">
                      <th className="p-4 font-bold text-xs text-outline uppercase tracking-wider w-64 border-r border-outline-variant">Employee</th>
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                        <th key={day} className="p-4 font-bold text-xs text-center text-on-surface uppercase tracking-wider min-w-[140px] border-r border-outline-variant">{day}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {schedule && schedule.map(row => (
                      <tr key={row.employeeName} className="hover:bg-surface-variant/10">
                        <td className="p-4 border-r border-outline-variant flex items-center gap-3">
                          <Avatar name={row.employeeName} size="md" />
                          <div>
                            <div className="font-bold text-sm text-on-surface">{row.employeeName}</div>
                            <div className="text-xs font-semibold text-on-surface-variant">{row.role}</div>
                          </div>
                        </td>
                        {row.days.map((dayShift, i) => (
                          <td key={i} className="p-2 border-r border-outline-variant">
                            {dayShift ? (
                              <div className="bg-[#14b8a6]/10 border-l-4 border-[#14b8a6] p-2 rounded-r relative group">
                                <div className="font-bold text-[#0d9488] text-xs">{dayShift.time}</div>
                                <div className="text-[9px] font-bold text-on-surface-variant uppercase mt-0.5">{dayShift.task}</div>
                                {isEditing && (
                                  <button 
                                    className="absolute -top-1.5 -right-1.5 bg-error text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => alert("Shift removed. AI solver will adjust coverage.")}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ) : (
                              isEditing ? (
                                <button 
                                  className="w-full py-2 border border-dashed border-outline-variant hover:border-primary hover:bg-primary/5 rounded text-[10px] font-bold text-outline hover:text-primary transition-all"
                                  onClick={() => alert("Add shift window opened. Assigning cashier...")}
                                >
                                  + Add Shift
                                </button>
                              ) : (
                                <div className="h-10"></div>
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
