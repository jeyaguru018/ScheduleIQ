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
      await api.createEmployee(formData);
      setIsAddModalOpen(false);
      setFormData({
        name: '', email: '', password: '', role: 'CASHIER', baseHourlyRate: '', maxHoursPerWeek: 40
      });
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

  const getEmpDisplayId = (empId) => {
    const idx = employees.findIndex(e => e.id === empId);
    return `EMP-${(idx !== -1 ? idx + 1 : 1).toString().padStart(4, '0')}`;
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
    else if (pct > 90) { color = 'bg-error'; label = 'Overworked'; }
    else if (pct < 50) { color = 'bg-warning'; label = 'Under-utilized'; }

    return (
      <div className="flex flex-col gap-1 w-full max-w-[120px]">
        <div className="flex justify-between text-xs font-bold">
          <span className="text-on-surface">{val}h</span>
          <span className={`text-[10px] uppercase px-1.5 py-0.2 rounded ${
            color === 'bg-success' ? 'text-success bg-success/10' :
            color === 'bg-error' ? 'text-error bg-error/10' :
            color === 'bg-warning' ? 'text-warning bg-warning/10' : 'text-on-surface-variant bg-surface-variant'
          }`}>{label}</span>
        </div>
        <div className="w-full h-1.5 bg-surface-variant rounded-full overflow-hidden">
          <div className={`h-full ${color}`} style={{ width: `${pct}%` }}></div>
        </div>
      </div>
    );
  };

  const getFairnessVisual = (score) => {
    const val = score || 100;
    let color = 'text-success bg-success/10';
    if (val < 70) color = 'text-error bg-error/10';
    else if (val < 85) color = 'text-warning bg-warning/10';

    return (
      <span className={`text-xs font-extrabold px-2 py-1 rounded-md ${color}`}>
        {val}%
      </span>
    );
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-surface relative">
      <div className="flex-1 flex flex-col p-8 overflow-y-auto min-w-0">
        <div className="flex flex-col gap-6 max-w-5xl w-full mx-auto pb-12">
          {/* Header */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl text-on-surface font-extrabold tracking-tight">Employee Roster</h1>
                <p className="text-sm text-on-surface-variant">Manage credentials, rates, and weekly hour caps.</p>
              </div>
            </div>
            <Button 
              variant="primary" 
              className="flex items-center gap-2"
              onClick={() => setIsAddModalOpen(true)}
            >
              <UserPlus className="w-4 h-4" />
              Add Employee
            </Button>
          </div>

          {/* Roster Table Card */}
          <Card className="flex flex-col overflow-hidden min-h-[300px]">
            <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-outline-variant py-4 shrink-0 bg-surface">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold">Team Directory</CardTitle>
                <span className="text-xs font-bold px-2 py-0.5 bg-surface-variant text-on-surface-variant rounded-full uppercase tracking-wider">{employees.length} Total</span>
              </div>
              <div className="flex gap-3 w-72">
                <div className="relative w-full">
                  <span className="absolute inset-y-0 left-3 flex items-center text-outline pointer-events-none">
                    <SearchIcon className="w-4 h-4" />
                  </span>
                  <input 
                    type="text" 
                    placeholder="Search employees..." 
                    className="w-full pl-9 pr-4 py-2 text-sm bg-surface-variant border border-outline-variant rounded-lg text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-colors"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>

            {loading ? (
              <div className="flex-1 flex items-center justify-center py-20 bg-surface">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-semibold text-on-surface-variant">Loading roster...</span>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 bg-surface">
                <Users className="w-12 h-12 text-outline mb-4" />
                <p className="text-base text-on-surface font-semibold">No employees found</p>
                <p className="text-sm text-on-surface-variant">Try searching for another name or add a new employee.</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-x-auto min-h-0 bg-surface">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-outline-variant text-[11px] font-bold text-outline uppercase tracking-wider bg-surface-variant/40">
                        <th className="p-4">Employee</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Weekly Hours</th>
                        <th className="p-4">Fairness Score</th>
                        <th className="p-4 text-right">Actions</th>
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
                                <div className="text-xs font-semibold text-on-surface-variant tracking-wider">{getEmpDisplayId(emp.id)}</div>
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
                <p className="text-xs font-semibold text-on-surface-variant">{getEmpDisplayId(selectedEmp.id)} • Joined Oct 2022</p>
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
            <Button variant="primary" type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
