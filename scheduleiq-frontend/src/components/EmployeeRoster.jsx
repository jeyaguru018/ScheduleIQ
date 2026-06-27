import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from './common/Card';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { Modal } from './common/Modal';
import { Avatar } from './common/Avatar';
import { 
  Users, 
  SearchIcon, 
  UserPlus, 
  Pencil, 
  X,
  MessageCircle,
  Settings2,
  Check,
  Plus,
  Send,
  Calendar,
  Tag,
  BarChart2,
  Clock,
  Star,
  ChevronRight,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';
import * as api from '../api';
import { useToast } from './common/Toast';

// Local storage helpers for persisting skills and availability per employee
const getStoredSkills = (empId) => {
  try {
    return JSON.parse(localStorage.getItem(`siq_skills_${empId}`) || '[]');
  } catch {
    return [];
  }
};
const saveStoredSkills = (empId, skills) => {
  try {
    localStorage.setItem(`siq_skills_${empId}`, JSON.stringify(skills));
  } catch (e) {
    console.warn('Failed to save skills to localStorage:', e);
  }
};
const getStoredAvailability = (empId) => {
  try {
    return JSON.parse(localStorage.getItem(`siq_avail_${empId}`) || 'null');
  } catch {
    return null;
  }
};
const saveStoredAvailability = (empId, avail) => {
  try {
    localStorage.setItem(`siq_avail_${empId}`, JSON.stringify(avail));
  } catch (e) {
    console.warn('Failed to save availability to localStorage:', e);
  }
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SLOTS = ['Morning (6am–2pm)', 'Evening (2pm–10pm)', 'Night (10pm–6am)', 'Unavailable'];

const DEFAULT_AVAIL = DAYS.map(() => 'Morning (6am–2pm)');

export function EmployeeRoster() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { showToast } = useToast();
  
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Sidebar panel sub-views
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sentMessages, setSentMessages] = useState([]);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);
  const [availability, setAvailability] = useState(DEFAULT_AVAIL);
  const [isSkillsOpen, setIsSkillsOpen] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [skills, setSkills] = useState([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'CASHIER', baseHourlyRate: '', maxHoursPerWeek: 40
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getAllEmployees();
      setEmployees(data);
    } catch (e) {
      console.error("Failed to load employees", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Load skills and availability whenever selected employee changes
  useEffect(() => {
    if (selectedEmp) {
      setSkills(getStoredSkills(selectedEmp.id));
      setAvailability(getStoredAvailability(selectedEmp.id) || DEFAULT_AVAIL);
      setIsMessageOpen(false);
      setIsAvailabilityOpen(false);
      setIsSkillsOpen(false);
      setIsProfileOpen(false);
      setMessageText('');
      setSentMessages([]);
    }
  }, [selectedEmp?.id]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createEmployee(formData);
      setIsAddModalOpen(false);
      showToast("Employee added successfully!");
      // Optimistic UI update since cache might take a moment to invalidate on errors
      setEmployees(prev => [...prev, { id: Date.now(), ...formData, fairnessScore: 100 }]);
      setFormData({ name: '', email: '', password: '', role: 'CASHIER', baseHourlyRate: '', maxHoursPerWeek: 40 });
      setTimeout(loadData, 1000);
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.updateEmployee(selectedEmp.id, formData);
      setIsEditModalOpen(false);
      showToast("Employee updated successfully!");
      // Optimistic update
      setEmployees(prev => prev.map(emp => emp.id === selectedEmp.id ? { ...emp, ...formData } : emp));
      setSelectedEmp(null);
      setTimeout(loadData, 1000);
    } catch (e) { showToast(e.message, 'error'); }
  };

  const openEdit = (emp) => {
    setFormData({ name: emp.name, email: emp.email, role: emp.role, baseHourlyRate: emp.baseHourlyRate, maxHoursPerWeek: emp.maxHoursPerWeek });
    setSelectedEmp(emp);
    setIsEditModalOpen(true);
  };

  const getEmpDisplayId = (emp) => {
    if (emp.role === 'MANAGER') return 'MANAGER';
    const nonManagers = employees.filter(e => e.role !== 'MANAGER').sort((a, b) => a.id - b.id);
    const idx = nonManagers.findIndex(e => e.id === emp.id);
    return `EMP-${(idx !== -1 ? idx + 1 : 1).toString().padStart(4, '0')}`;
  };

  // ── Message Panel ───────────────────────────────────────────────────────────
  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    setSentMessages(prev => [...prev, { text: messageText.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setMessageText('');
    showToast(`Message sent to ${selectedEmp.name}!`, 'success');
  };

  // ── Availability Panel ──────────────────────────────────────────────────────
  const handleSaveAvailability = () => {
    saveStoredAvailability(selectedEmp.id, availability);
    setIsAvailabilityOpen(false);
    showToast('Availability pattern saved!', 'success');
  };

  // ── Skills Panel ────────────────────────────────────────────────────────────
  const handleAddSkill = () => {
    const s = newSkill.trim();
    if (!s || skills.includes(s)) return;
    const updated = [...skills, s];
    setSkills(updated);
    saveStoredSkills(selectedEmp.id, updated);
    setNewSkill('');
    showToast(`Skill "${s}" added!`, 'success');
  };

  const handleRemoveSkill = (skill) => {
    const updated = skills.filter(s => s !== skill);
    setSkills(updated);
    saveStoredSkills(selectedEmp.id, updated);
  };

  const filtered = employees.filter(emp =>
    emp.name?.toLowerCase().includes(search.toLowerCase()) ||
    emp.email?.toLowerCase().includes(search.toLowerCase()) ||
    emp.role?.toLowerCase().includes(search.toLowerCase())
  );

  const roleColor = (role) => {
    switch (role) {
      case 'MANAGER': return 'bg-primary/10 text-primary';
      case 'CASHIER': return 'bg-teal-50 text-teal-700';
      case 'STOCKER': return 'bg-purple-50 text-purple-700';
      case 'LEAD_CASHIER': return 'bg-blue-50 text-blue-700';
      case 'DELIVERY_BOY': return 'bg-amber-50 text-amber-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="flex-1 flex gap-0 overflow-hidden h-full relative">
      {/* Main Table Panel */}
      <div className="flex-1 overflow-y-auto p-8 min-w-0">
        <Card className="shadow-3d-card border-outline-variant/30 rounded-2xl overflow-hidden">
          {/* Header */}
          <CardHeader className="px-6 py-5 border-b border-outline-variant bg-surface">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center shadow-3d-btn">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-on-surface">Employee Roster</CardTitle>
                  <p className="text-xs text-on-surface-variant mt-0.5">Manage credentials, rates, and weekly hour caps.</p>
                </div>
              </div>
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-primary hover:bg-primary/90 text-on-primary font-bold shadow-3d-btn-primary active-press"
              >
                <UserPlus className="w-4 h-4 mr-2" />Add Employee
              </Button>
            </div>
          </CardHeader>

          {loading ? (
            <div className="p-12 text-center text-on-surface-variant">Loading team...</div>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-outline-variant flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-sm font-bold text-on-surface-variant bg-surface-variant/40 px-3 py-1.5 rounded-lg">
                  <Users className="w-4 h-4" />
                  Team Directory
                  <span className="ml-1 bg-primary/10 text-primary text-xs font-extrabold px-2 py-0.5 rounded-full">
                    {filtered.length} TOTAL
                  </span>
                </div>
                <div className="flex-1 relative max-w-xs">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                  <input
                    type="text"
                    placeholder="Search employees..."
                    className="pl-9 h-9 w-full rounded-xl border border-outline-variant bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-[#1e1a8a]/30 shadow-sm"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-variant/30">
                      <th className="px-6 py-3 text-[10px] font-bold text-outline uppercase tracking-widest">Employee</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-outline uppercase tracking-widest">Role</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-outline uppercase tracking-widest">Weekly Hours</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-outline uppercase tracking-widest">Fairness Score</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-outline uppercase tracking-widest w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((emp) => (
                      <tr
                        key={emp.id}
                        onClick={() => setSelectedEmp(emp)}
                        className={`border-b border-outline-variant/50 cursor-pointer hover-lift transition-all ${selectedEmp?.id === emp.id ? 'bg-primary/4 shadow-3d-active' : 'hover:bg-surface-variant/30'}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={emp.name} size="md" className="shadow-3d-btn" />
                            <div>
                              <p className="font-bold text-on-surface text-sm">{emp.name}</p>
                              <p className="text-xs text-on-surface-variant">{getEmpDisplayId(emp)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${roleColor(emp.role)}`}>
                            {emp.role?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <span className="font-bold text-sm text-on-surface">0h</span>
                            <span className="text-xs text-outline ml-1">/ {emp.maxHoursPerWeek}h cap</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-surface-variant rounded-full overflow-hidden max-w-[80px]">
                              <div className="h-full bg-success rounded-full" style={{ width: `${emp.fairnessScore || 100}%` }} />
                            </div>
                            <span className="text-sm font-bold text-on-surface">{emp.fairnessScore || 100}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-on-surface hover:text-primary shadow-3d-btn active-press"
                            onClick={(e) => { e.stopPropagation(); openEdit(emp); }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* ── Right Slide-out Profile Panel ─────────────────────────────────── */}
      {selectedEmp && (
        <div className="w-[400px] bg-surface border-l border-outline-variant flex flex-col shrink-0 animate-in slide-in-from-right duration-300 shadow-2xl z-20 absolute right-0 top-0 bottom-0 overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b border-outline-variant flex items-start justify-between sticky top-0 bg-surface z-10">
            <div className="flex items-center gap-4">
              <Avatar name={selectedEmp.name} size="xl" className="border-2 border-surface shadow-3d-card" />
              <div>
                <h3 className="text-xl font-bold text-on-surface">{selectedEmp.name}</h3>
                <p className="text-xs font-semibold text-on-surface-variant">{getEmpDisplayId(selectedEmp)} • Joined {new Date(selectedEmp.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${selectedEmp.role === 'MANAGER' ? 'bg-primary/10 text-primary' : 'bg-[#14b8a6]/10 text-[#0d9488]'}`}>
                  {selectedEmp.role}
                </span>
              </div>
            </div>
            <button onClick={() => setSelectedEmp(null)} className="text-outline hover:text-on-surface w-8 h-8 rounded-full hover:bg-surface-variant flex items-center justify-center transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="p-5 flex gap-3 border-b border-outline-variant">
            <button
              onClick={() => { setIsMessageOpen(v => !v); setIsAvailabilityOpen(false); setIsSkillsOpen(false); setIsProfileOpen(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition-all active-press shadow-3d-btn ${isMessageOpen ? 'bg-primary text-on-primary border-primary' : 'bg-surface text-on-surface border-outline-variant hover:border-primary/30 hover:bg-primary/5'}`}
            >
              <MessageCircle className="w-4 h-4" /> Message
            </button>
            <button
              onClick={() => { openEdit(selectedEmp); }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border bg-surface text-on-surface border-outline-variant hover:border-primary/30 hover:bg-primary/5 transition-all active-press shadow-3d-btn"
            >
              <Settings2 className="w-4 h-4" /> Adjust
            </button>
          </div>

          {/* Message Panel */}
          {isMessageOpen && (
            <div className="mx-5 mt-4 mb-2 rounded-xl border border-outline-variant bg-surface-variant/20 overflow-hidden">
              <div className="px-4 py-3 border-b border-outline-variant flex items-center gap-2 bg-surface">
                <MessageCircle className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-on-surface">Message {selectedEmp.name.split(' ')[0]}</span>
              </div>
              <div className="p-3 min-h-[100px] max-h-[160px] overflow-y-auto flex flex-col gap-2">
                {sentMessages.length === 0 && (
                  <p className="text-xs text-outline text-center py-4">No messages yet. Send a shift update or note below.</p>
                )}
                {sentMessages.map((m, i) => (
                  <div key={i} className="flex justify-end">
                    <div className="bg-primary text-on-primary text-xs rounded-xl rounded-tr-sm px-3 py-2 max-w-[80%]">
                      <p>{m.text}</p>
                      <p className="text-on-primary/60 text-[9px] mt-1">{m.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 p-3 bg-surface border-t border-outline-variant">
                <input
                  type="text"
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }}
                  placeholder="Type a message..."
                  className="flex-1 text-sm border border-outline-variant rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1e1a8a]/30"
                />
                <button
                  onClick={handleSendMessage}
                  className="w-9 h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center hover:bg-primary/90 active-press shadow-3d-btn-primary"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Details Sections */}
          <div className="flex-1 p-5 space-y-5">
            {/* Weekly Availability */}
            <div className="rounded-xl border border-outline-variant bg-surface overflow-hidden shadow-3d-card">
              <button
                onClick={() => { setIsAvailabilityOpen(v => !v); setIsMessageOpen(false); setIsSkillsOpen(false); setIsProfileOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-variant/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-on-surface">Weekly Availability</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-outline">{isAvailabilityOpen ? 'Close' : 'Edit Pattern'}</span>
                  <ChevronRight className={`w-4 h-4 text-outline transition-transform duration-200 ${isAvailabilityOpen ? 'rotate-90' : ''}`} />
                </div>
              </button>
              {isAvailabilityOpen && (
                <div className="px-4 pb-4 border-t border-outline-variant">
                  <p className="text-xs text-on-surface-variant mt-3 mb-3">Set preferred shift time for each day of the week.</p>
                  <div className="space-y-2">
                    {DAYS.map((day, i) => (
                      <div key={day} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-on-surface-variant w-8">{day}</span>
                        <select
                          value={availability[i]}
                          onChange={e => { const a = [...availability]; a[i] = e.target.value; setAvailability(a); }}
                          className="flex-1 text-xs border border-outline-variant rounded-lg px-2 py-1.5 bg-surface focus:outline-none focus:ring-2 focus:ring-[#1e1a8a]/30"
                        >
                          {SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleSaveAvailability}
                    className="w-full mt-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-bold hover:bg-primary/90 active-press shadow-3d-btn-primary"
                  >
                    <Check className="w-3.5 h-3.5 inline mr-1" />Save Availability
                  </button>
                </div>
              )}
            </div>

            {/* Skills & Tags */}
            <div className="rounded-xl border border-outline-variant bg-surface overflow-hidden shadow-3d-card">
              <button
                onClick={() => { setIsSkillsOpen(v => !v); setIsMessageOpen(false); setIsAvailabilityOpen(false); setIsProfileOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-variant/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#0d9488]" />
                  <span className="text-sm font-bold text-on-surface">Skills & Tags</span>
                  {skills.length > 0 && (
                    <span className="text-[10px] font-extrabold bg-[#0d9488]/10 text-[#0d9488] px-1.5 py-0.5 rounded-full">{skills.length}</span>
                  )}
                </div>
                <ChevronRight className={`w-4 h-4 text-outline transition-transform duration-200 ${isSkillsOpen ? 'rotate-90' : ''}`} />
              </button>
              {isSkillsOpen && (
                <div className="px-4 pb-4 border-t border-outline-variant">
                  <div className="flex flex-wrap gap-2 mt-3 mb-3">
                    {skills.length === 0 && (
                      <p className="text-xs text-outline py-1">No skills added yet.</p>
                    )}
                    {skills.map(skill => (
                      <span key={skill} className="flex items-center gap-1 text-xs font-bold bg-[#0d9488]/10 text-[#0d9488] px-2.5 py-1 rounded-full">
                        {skill}
                        <button onClick={() => handleRemoveSkill(skill)} className="ml-1 text-[#0d9488]/60 hover:text-[#0d9488]">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={e => setNewSkill(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddSkill(); }}
                      placeholder="e.g. Forklift, Cash Handling..."
                      className="flex-1 text-xs border border-outline-variant rounded-lg px-3 py-2 bg-surface focus:outline-none focus:ring-2 focus:ring-[#0d9488]/30"
                    />
                    <button
                      onClick={handleAddSkill}
                      className="w-9 h-9 rounded-lg bg-[#0d9488] text-white flex items-center justify-center hover:bg-[#0d9488]/90 active-press shadow-3d-btn"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Fairness Breakdown */}
            <div className="rounded-xl border border-outline-variant bg-surface overflow-hidden shadow-3d-card">
              <button
                onClick={() => { setIsProfileOpen(v => !v); setIsMessageOpen(false); setIsAvailabilityOpen(false); setIsSkillsOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-variant/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-[#7c3aed]" />
                  <span className="text-sm font-bold text-on-surface">Fairness Breakdown</span>
                  <span className="text-sm font-extrabold text-success">{selectedEmp.fairnessScore || 94}%</span>
                </div>
                <ChevronRight className={`w-4 h-4 text-outline transition-transform duration-200 ${isProfileOpen ? 'rotate-90' : ''}`} />
              </button>
              {isProfileOpen && (
                <div className="px-4 pb-5 border-t border-outline-variant">
                  {/* Full Profile Stats */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {[
                      { label: 'Reliability', value: `${Math.round((selectedEmp.reliabilityScore || 0.95) * 100)}%`, icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
                      { label: 'Fairness', value: `${selectedEmp.fairnessScore || 94}%`, icon: Shield, color: 'text-success', bg: 'bg-green-50' },
                      { label: 'Max hrs/wk', value: `${selectedEmp.maxHoursPerWeek}h`, icon: Clock, color: 'text-primary', bg: 'bg-primary/5' },
                      { label: 'Hourly Rate', value: `₹${selectedEmp.baseHourlyRate}/h`, icon: BarChart2, color: 'text-[#0d9488]', bg: 'bg-teal-50' },
                    ].map(m => (
                      <div key={m.label} className={`flex items-center gap-3 p-3 rounded-xl ${m.bg} border border-white shadow-sm`}>
                        <div className={`w-8 h-8 rounded-lg bg-surface flex items-center justify-center shadow-sm`}>
                          <m.icon className={`w-4 h-4 ${m.color}`} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-outline uppercase tracking-wider">{m.label}</p>
                          <p className="text-sm font-extrabold text-on-surface">{m.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 mt-4">
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-semibold text-on-surface-variant">Weekend Shifts</span>
                        <span className="font-bold text-on-surface">2/mo <span className="text-outline font-normal">[Target: ≤2]</span></span>
                      </div>
                      <div className="w-full bg-surface-variant h-2 rounded-full overflow-hidden">
                        <div className="bg-success h-full rounded-full" style={{ width: '100%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-semibold text-on-surface-variant">Clopening Shifts</span>
                        <span className="font-bold text-on-surface">0 <span className="text-outline font-normal">[Target: 0]</span></span>
                      </div>
                      <div className="w-full bg-surface-variant h-2 rounded-full overflow-hidden">
                        <div className="bg-success h-full rounded-full" style={{ width: '0%' }} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 rounded-xl bg-surface-variant/40 border border-outline-variant">
                    <p className="text-xs font-semibold text-on-surface-variant">Skills</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {skills.length === 0
                        ? <span className="text-xs text-outline">No skills tagged yet</span>
                        : skills.map(s => (
                          <span key={s} className="text-[10px] font-bold bg-surface text-on-surface px-2 py-0.5 rounded-full border border-outline-variant">{s}</span>
                        ))
                      }
                    </div>
                  </div>

                  <p className="text-[10px] text-outline text-center mt-4">
                    Email: {selectedEmp.email}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add Employee Modal ─────────────────────────────────────────────── */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Employee">
        <form onSubmit={handleAddSubmit} className="flex flex-col gap-4">
          <Input label="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
          <Input 
            label="Temporary Password" 
            type={showPassword ? "text" : "password"} 
            value={formData.password} 
            onChange={e => setFormData({...formData, password: e.target.value})} 
            endIcon={showPassword ? EyeOff : Eye}
            onEndIconClick={() => setShowPassword(!showPassword)}
            required 
          />
          <div>
            <label className="block text-label-md font-bold text-on-surface mb-1.5">Role</label>
            <select className="flex h-11 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
              <option value="CASHIER">Cashier</option>
              <option value="LEAD_CASHIER">Lead Cashier</option>
              <option value="STOCKER">Stocker</option>
              <option value="DELIVERY_BOY">Delivery Boy</option>
            </select>
          </div>
          <div className="flex gap-4">
            <Input label="Base Hourly Rate (₹)" type="number" value={formData.baseHourlyRate} onChange={e => setFormData({...formData, baseHourlyRate: e.target.value})} required />
            <Input label="Max Hours/Week" type="number" value={formData.maxHoursPerWeek} onChange={e => setFormData({...formData, maxHoursPerWeek: e.target.value})} required />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" type="button" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" className="shadow-3d-btn-primary active-press">Create Employee</Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Employee Modal ────────────────────────────────────────────── */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Employee">
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <Input label="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          <Input label="Email" type="email" value={formData.email} disabled />
          <div>
            <label className="block text-label-md font-bold text-on-surface mb-1.5">Role</label>
            <select className="flex h-11 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
              <option value="CASHIER">Cashier</option>
              <option value="LEAD_CASHIER">Lead Cashier</option>
              <option value="STOCKER">Stocker</option>
              <option value="DELIVERY_BOY">Delivery Boy</option>
            </select>
          </div>
          <div className="flex gap-4">
            <Input label="Base Hourly Rate (₹)" type="number" value={formData.baseHourlyRate} onChange={e => setFormData({...formData, baseHourlyRate: e.target.value})} required />
            <Input label="Max Hours/Week" type="number" value={formData.maxHoursPerWeek} onChange={e => setFormData({...formData, maxHoursPerWeek: e.target.value})} required />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" type="button" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" className="shadow-3d-btn-primary active-press">Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
