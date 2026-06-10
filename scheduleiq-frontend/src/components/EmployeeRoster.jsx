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
  Plus
} from 'lucide-react';
import * as api from '../api';
import { useToast } from './common/Toast';

export function EmployeeRoster() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { showToast } = useToast();
  
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

  useEffect(() => {
    loadData();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.register(formData);
      setIsAddModalOpen(false);
      showToast("Employee added successfully!");
      loadData();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.updateEmployee(selectedEmp.id, formData);
      setIsEditModalOpen(false);
      setSelectedEmp(null);
      showToast("Employee updated successfully!");
      loadData();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const openEdit = (emp) => {
    setFormData({
      name: emp.name,
      email: emp.email,
      role: emp.role,
      baseHourlyRate: emp.baseHourlyRate,
      maxHoursPerWeek: emp.maxHoursPerWeek
    });
    setSelectedEmp(emp);
    setIsEditModalOpen(true);
  };

  const filtered = employees.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));

  // Helpers for visuals
  const getHoursVisual = (hours, max) => {
    const val = hours || 0; 
    const maxVal = max || 40;
    const pct = Math.min((val / maxVal) * 100, 100);
    let color = 'bg-success';
    let label = 'Optimal';
    if (val === 0) { color = 'bg-surface-variant'; label = 'Unassigned'; }
    else if (val < 30) { color = 'bg-primary'; label = 'Underutilized'; }
    else if (val > 40) { color = 'bg-error'; label = 'Overtime'; }
    
    return (
      <div className="w-full">
        <div className="flex justify-between text-xs font-bold mb-1">
          <span className="text-on-surface">{val} hrs</span>
          <span className={val === 0 ? 'text-outline' : color.replace('bg-', 'text-')}>{label}</span>
        </div>
        <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
          <div className={`${color} h-full rounded-full`} style={{ width: `${pct}%` }}></div>
        </div>
      </div>
    );
  };

  const getFairnessVisual = (empScore) => {
    const score = empScore || 100; 
    let color = 'text-success bg-success/20';
    let dot = 'bg-success';
    if (score < 80) { color = 'text-warning bg-warning/20'; dot = 'bg-warning'; }
    
    return (
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${dot}`}></div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{score}%</span>
      </div>
    );
  };

  return (
    <div className="flex h-full overflow-hidden bg-[#fafbfc]">
      {/* Main Roster View */}
      <div className="flex-1 flex flex-col p-8 overflow-hidden">
        <div className="max-w-6xl w-full mx-auto flex flex-col h-full">
          
          <div className="flex items-center justify-between mb-6 shrink-0">
            <div>
              <h2 className="text-3xl font-bold text-on-surface tracking-tight flex items-center gap-3">
                Employee Roster
                <span className="text-xs font-bold text-outline uppercase tracking-wider bg-surface border border-outline-variant px-2 py-1 rounded-md">
                  {employees.length} Total
                </span>
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" className="bg-white">Role: All</Button>
              <Button variant="outline" className="bg-white">Availability</Button>
              <Button variant="primary" className="bg-[#1e1a8a] text-white" onClick={() => setIsAddModalOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" /> Add Employee
              </Button>
            </div>
          </div>

          <Card className="flex-1 flex flex-col shadow-sm border-outline-variant overflow-hidden min-h-0">
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-outline font-semibold">Loading roster...</div>
            ) : employees.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-surface">
                <div className="w-16 h-16 bg-[#1e1a8a]/10 rounded-full flex items-center justify-center mb-4 text-[#1e1a8a]">
                  <Users className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-on-surface mb-2">Build your team</h3>
                <p className="text-sm text-on-surface-variant max-w-sm mb-6">You haven't added any employees yet. Add your first team member to start scheduling shifts and tracking fairness.</p>
                <Button variant="primary" className="bg-[#1e1a8a] text-white font-bold px-6 py-2 shadow-md" onClick={() => setIsAddModalOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" /> Add First Employee
                </Button>
              </div>
            ) : (
              <>
                <div className="overflow-auto flex-1">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-surface z-10 shadow-sm">
                      <tr className="border-b border-outline-variant">
                        <th className="p-4 font-bold text-xs text-outline uppercase tracking-wider w-1/4">Employee</th>
                        <th className="p-4 font-bold text-xs text-outline uppercase tracking-wider w-[15%]">Role</th>
                        <th className="p-4 font-bold text-xs text-outline uppercase tracking-wider w-[25%]">Weekly Hours <span className="text-[10px] lowercase normal-case ml-1 text-outline-variant">(Cap: 40h)</span></th>
                        <th className="p-4 font-bold text-xs text-outline uppercase tracking-wider w-[15%]">Fairness Score</th>
                        <th className="p-4 font-bold text-xs text-outline uppercase tracking-wider text-right w-[10%]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {filtered.map(emp => (
                        <tr 
                          key={emp.id} 
                          className={`hover:bg-surface-variant/30 cursor-pointer transition-colors ${selectedEmp?.id === emp.id ? 'bg-primary/5' : ''}`}
                          onClick={() => setSelectedEmp(emp)}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={emp.name} size="md" />
                              <div>
                                <div className="font-bold text-sm text-on-surface">{emp.name}</div>
                                <div className="text-xs font-semibold text-on-surface-variant tracking-wider">EMP-{emp.id.toString().padStart(4, '0')}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider ${
                              emp.role === 'MANAGER' ? 'bg-[#1e1a8a]/10 text-[#1e1a8a]' : 
                              emp.role === 'CASHIER' ? 'bg-[#14b8a6]/10 text-[#0d9488]' : 
                              'bg-[#8b5cf6]/10 text-[#7c3aed]'
                            }`}>
                              {emp.role}
                            </span>
                          </td>
                          <td className="p-4 pr-8">
                            {getHoursVisual(emp.currentHoursThisWeek, emp.maxHoursPerWeek)}
                          </td>
                          <td className="p-4">
                            {getFairnessVisual(emp.fairnessScore)}
                          </td>
                          <td className="p-4 text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-outline hover:text-primary"
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
                <div className="p-4 border-t border-outline-variant flex items-center justify-between shrink-0 bg-surface">
                  <span className="text-sm font-semibold text-on-surface-variant">Showing 1-{filtered.length} of {employees.length} employees</span>
                  <div className="flex gap-1 text-sm font-bold text-outline">
                    <Button variant="ghost" size="icon" disabled><span className="text-lg">‹</span></Button>
                    <Button variant="ghost" size="icon" className="bg-primary/10 text-primary">1</Button>
                    <Button variant="ghost" size="icon">2</Button>
                    <Button variant="ghost" size="icon">3</Button>
                    <Button variant="ghost" size="icon"><span className="text-lg">›</span></Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Right Slide-out Profile Panel */}
      {selectedEmp && (
        <div className="w-[400px] bg-surface border-l border-outline-variant flex flex-col shrink-0 animate-in slide-in-from-right duration-300 shadow-2xl z-20 absolute right-0 top-0 bottom-0">
          <div className="p-6 border-b border-outline-variant flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar name={selectedEmp.name} size="xl" className="border-2 border-surface shadow-md" />
              <div>
                <h3 className="text-xl font-bold text-on-surface">{selectedEmp.name}</h3>
                <p className="text-xs font-semibold text-on-surface-variant">EMP-{selectedEmp.id.toString().padStart(4, '0')} • Joined Oct 2022</p>
                <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${selectedEmp.role === 'MANAGER' ? 'bg-[#1e1a8a]/10 text-[#1e1a8a]' : 'bg-[#14b8a6]/10 text-[#0d9488]'}`}>
                  {selectedEmp.role}
                </span>
              </div>
            </div>
            <button onClick={() => setSelectedEmp(null)} className="text-outline hover:text-on-surface">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 flex gap-3 border-b border-outline-variant">
            <Button variant="outline" className="flex-1 font-bold" onClick={() => window.location.href = `mailto:${selectedEmp.email}`}>
              <MessageCircle className="w-4 h-4 mr-2" /> Message
            </Button>
            <Button variant="outline" className="flex-1 font-bold" onClick={() => openEdit(selectedEmp)}>
              <Settings2 className="w-4 h-4 mr-2" /> Adjust
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Weekly Availability */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-on-surface">Weekly Availability</h4>
                <button className="text-xs font-bold text-primary hover:underline">Edit Pattern</button>
              </div>
              
              <div className="p-4 border border-outline-variant rounded-lg bg-surface-variant/20 text-center text-on-surface-variant text-sm font-medium">
                No availability set.
              </div>
            </div>

            {/* Skills & Tags */}
            <div>
              <h4 className="text-sm font-bold text-on-surface mb-3">Skills & Tags</h4>
              <div className="flex flex-wrap gap-2">
                <button className="text-xs font-bold text-outline hover:text-primary border border-dashed border-outline hover:border-primary px-3 py-1 rounded-full flex items-center gap-1 transition-colors">
                  <Plus className="w-3 h-3" /> Add Skill
                </button>
              </div>
            </div>

            {/* Fairness Breakdown */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-on-surface">Fairness Breakdown</h4>
                <span className="text-lg font-extrabold text-success">94%</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-on-surface-variant">Weekend Shifts Assigned</span>
                  <span className="font-bold text-on-surface">2/month <span className="text-xs text-outline font-normal ml-1">[Target: ≤2]</span></span>
                </div>
                <div className="w-full bg-surface-variant h-1.5 rounded-full overflow-hidden mt-1"><div className="bg-success w-full h-full"></div></div>

                <div className="flex justify-between items-center text-sm pt-2">
                  <span className="font-semibold text-on-surface-variant">Clopening Shifts</span>
                  <span className="font-bold text-on-surface">0 <span className="text-xs text-outline font-normal ml-1">[Target: 0]</span></span>
                </div>
                <div className="w-full bg-surface-variant h-1.5 rounded-full overflow-hidden mt-1"><div className="bg-success w-0 h-full"></div></div>
              </div>
              <Button variant="ghost" className="w-full mt-4 text-primary font-bold text-sm">View Full Profile</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Employee">
        <form onSubmit={handleAddSubmit} className="flex flex-col gap-4">
          <Input label="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
          <Input label="Temporary Password" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
          
          <div>
            <label className="block text-label-md font-bold text-on-surface mb-1.5">Role</label>
            <select 
              className="flex h-11 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
              value={formData.role} 
              onChange={e => setFormData({...formData, role: e.target.value})}
            >
              <option value="CASHIER">Cashier</option>
              <option value="MANAGER">Manager</option>
            </select>
          </div>

          <div className="flex gap-4">
            <Input label="Base Hourly Rate (₹)" type="number" value={formData.baseHourlyRate} onChange={e => setFormData({...formData, baseHourlyRate: e.target.value})} required />
            <Input label="Max Hours/Week" type="number" value={formData.maxHoursPerWeek} onChange={e => setFormData({...formData, maxHoursPerWeek: e.target.value})} required />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" type="button" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create Employee</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Employee">
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <Input label="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          <Input label="Email" type="email" value={formData.email} disabled />
          
          <div>
            <label className="block text-label-md font-bold text-on-surface mb-1.5">Role</label>
            <select 
              className="flex h-11 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
              value={formData.role} 
              onChange={e => setFormData({...formData, role: e.target.value})}
            >
              <option value="CASHIER">Cashier</option>
              <option value="MANAGER">Manager</option>
            </select>
          </div>

          <div className="flex gap-4">
            <Input label="Base Hourly Rate (₹)" type="number" value={formData.baseHourlyRate} onChange={e => setFormData({...formData, baseHourlyRate: e.target.value})} required />
            <Input label="Max Hours/Week" type="number" value={formData.maxHoursPerWeek} onChange={e => setFormData({...formData, maxHoursPerWeek: e.target.value})} required />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" type="button" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
