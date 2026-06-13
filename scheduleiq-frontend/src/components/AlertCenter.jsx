import React, { useState, useEffect } from 'react';
import { Card } from './common/Card';
import { Button } from './common/Button';
import { Avatar } from './common/Avatar';
import { Modal } from './common/Modal';
import { AlertCircle, ArrowRight, Store, Search, UserCheck, CheckCircle2 } from 'lucide-react';
import * as api from '../api';
import { useToast } from './common/Toast';

export function AlertCenter() {
  const [alerts, setAlerts] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [backups, setBackups] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadAlerts();
    loadLeaves();
  }, []);

  const loadLeaves = async () => {
    try {
      const data = await api.getAllLeaves();
      setLeaves(data.filter(l => l.status === 'PENDING') || []);
    } catch (e) {
      console.warn("Failed to load leaves: ", e.message);
    }
  };

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await api.getAlerts();
      setAlerts(data || []);
    } catch (e) {
      console.warn("Failed to load alerts: ", e.message);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFindReplacement = async (alertItem) => {
    setSelectedAlert(alertItem);
    setIsBackupModalOpen(true);
    setLoadingBackups(true);
    try {
      // Fetch eligible backups from PostgreSQL via the ML constraint logic
      const data = await api.getBackupWorkers(alertItem.id);
      setBackups(data || []);
    } catch (e) {
      setBackups([]);
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleAssignReplacement = async (workerId) => {
    if (!selectedAlert) return;
    try {
      await api.assignShiftEmployee(selectedAlert.id, workerId);
      showToast("Replacement cashier assigned successfully!");
      setIsBackupModalOpen(false);
      setSelectedAlert(null);
      // Reload alerts list
      await loadAlerts();
    } catch (e) {
      showToast(e.message || "Failed to assign replacement.", 'error');
    }
  };

  const handleApproveLeave = async (leaveId) => {
    try {
      await api.approveLeave(leaveId);
      showToast("Leave request approved successfully!");
      await loadLeaves();
      await loadAlerts();
    } catch (e) {
      showToast(e.message || "Failed to approve leave.", 'error');
    }
  };

  const handleRejectLeave = async (leaveId) => {
    try {
      await api.rejectLeave(leaveId);
      showToast("Leave request rejected.");
      await loadLeaves();
    } catch (e) {
      showToast(e.message || "Failed to reject leave.", 'error');
    }
  };

  const formatShiftTime = (startStr, endStr) => {
    if (!startStr || !endStr) return '';
    const start = new Date(startStr);
    const end = new Date(endStr);
    const options = { month: 'short', day: 'numeric' };
    const dateStr = start.toLocaleDateString('en-US', options);
    const startHours = start.getHours().toString().padStart(2, '0');
    const startMins = start.getMinutes().toString().padStart(2, '0');
    const endHours = end.getHours().toString().padStart(2, '0');
    const endMins = end.getMinutes().toString().padStart(2, '0');
    return `${dateStr} • ${startHours}:${startMins} - ${endHours}:${endMins} (${start.getHours() >= 18 || start.getHours() < 6 ? 'Night Shift' : 'Day Shift'})`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-[#fafbfc]">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex justify-between items-center shrink-0">
          <h2 className="text-3xl font-bold text-on-surface tracking-tight">Alert Center</h2>
        </div>

        {/* Global Alert Banner */}
        <div className="bg-[#fef2f2] border border-error/20 rounded-xl p-4 flex items-start justify-between shadow-sm shrink-0">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-error flex items-center justify-center shrink-0 shadow-sm">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-error">{alerts.length} Critical Attendance Risks Flagged</h3>
              <p className="text-sm font-semibold text-error/80 mt-1">AI model recommends re-assigning shifts immediately to ensure coverage.</p>
            </div>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-6">
          {alerts.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center bg-surface border border-outline-variant border-dashed rounded-xl">
              <CheckCircle2 className="w-16 h-16 text-success/50 mb-4" />
              <h3 className="text-xl font-bold text-on-surface mb-2">No critical alerts</h3>
              <p className="text-sm text-on-surface-variant max-w-sm">Your schedule is solid! AI hasn't detected any high no-show risks or coverage gaps at this moment.</p>
            </div>
          ) : alerts.map((alertItem) => {
            const riskPct = Math.round(alertItem.noShowRisk * 100);
            const empName = alertItem.employee ? alertItem.employee.name : 'Open Shift';
            const empRole = alertItem.employee ? alertItem.employee.role : alertItem.role;
            const isHighRisk = riskPct >= 50;

            return (
              <Card key={alertItem.id} className="shadow-md border-error/30 overflow-hidden flex flex-col md:flex-row">
                
                {/* Left Side: Risk Details */}
                <div className="md:w-2/3 p-6 md:border-r border-outline-variant/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <Avatar name={empName} size="lg" className="border-2 border-error/20" />
                        <div>
                          <h4 className="text-lg font-bold text-on-surface">{empName}</h4>
                          <p className="text-xs font-semibold text-on-surface-variant flex items-center gap-1 mt-1">
                            {formatShiftTime(alertItem.startTime, alertItem.endTime)}
                          </p>
                        </div>
                      </div>
                      <span className={`border text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider flex items-center gap-1 ${
                        isHighRisk 
                          ? 'bg-[#fef2f2] text-error border-error/20' 
                          : 'bg-[#fffbeb] text-warning border-warning/20'
                      }`}>
                        <AlertCircle className="w-3.5 h-3.5" /> {isHighRisk ? 'Critical' : 'Moderate'} Risk
                      </span>
                    </div>

                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-outline uppercase tracking-wider">AI Prediction Risk Score</span>
                        <span className={`text-sm font-extrabold ${isHighRisk ? 'text-error' : 'text-warning'}`}>{riskPct}% Risk</span>
                      </div>
                      <div className="w-full h-2.5 bg-surface-variant rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${isHighRisk ? 'bg-error' : 'bg-warning'}`} style={{ width: `${riskPct}%` }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-surface-variant/30 p-3 rounded-lg border border-outline-variant/50">
                    <span className="text-[10px] font-bold text-outline uppercase tracking-wider shrink-0">AI Factors:</span>
                    <div className="flex gap-2">
                      <span className="text-xs font-bold text-error bg-error/10 px-2 py-1 rounded">Reliability: {alertItem.employee ? Math.round(alertItem.employee.reliabilityScore * 100) : 0}%</span>
                      {alertItem.noShowRisk > 0.5 && (
                        <span className="text-xs font-bold text-[#b45309] bg-[#fffbeb] px-2 py-1 rounded border border-[#fcd34d]">Night shift fatigue</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side: Impact & Action */}
                <div className="md:w-1/3 p-6 flex flex-col justify-center bg-[#fafbfc]">
                  <span className="text-[10px] font-bold text-outline uppercase tracking-wider mb-2 block">Operational Impact</span>
                  <div className="flex items-start gap-2 mb-6">
                    <Store className="w-5 h-5 text-[#d97706] shrink-0 mt-0.5" />
                    <p className="text-sm font-bold text-on-surface leading-tight">
                      Store under-coverage by 1 {empRole} during service peak.
                    </p>
                  </div>
                  <Button 
                    variant="primary" 
                    className="w-full bg-[#1e1a8a] hover:bg-[#1e1a8a]/90 text-white shadow-sm py-3 text-base font-bold"
                    onClick={() => handleFindReplacement(alertItem)}
                  >
                    <Search className="w-4 h-4 mr-2" /> Find Replacement
                  </Button>
                </div>

              </Card>
          })}
        </div>

        {/* Pending Leave Requests */}
        <div className="pt-6 border-t border-outline-variant/60">
          <h3 className="text-xl font-bold text-on-surface mb-4">Pending Leave Requests ({leaves.length})</h3>
          {leaves.length === 0 ? (
            <div className="p-6 text-center text-sm font-semibold text-outline bg-surface border border-dashed border-outline-variant rounded-xl shadow-sm">
              No pending leave requests.
            </div>
          ) : (
            <div className="space-y-4">
              {leaves.map(l => (
                <Card key={l.id} className="p-5 border-outline-variant shadow-sm flex items-center justify-between bg-surface">
                  <div className="flex items-center gap-4">
                    <Avatar name={l.employee ? l.employee.name : 'Employee'} size="md" />
                    <div>
                      <h4 className="font-bold text-sm text-on-surface">{l.employee ? l.employee.name : 'Unknown Employee'}</h4>
                      <p className="text-xs font-semibold text-outline-variant mt-0.5">Requested Date: {l.leaveDate}</p>
                      <p className="text-xs text-on-surface-variant font-medium mt-1">Reason: "{l.reason}"</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="text-error border-error/20 hover:bg-error/5 font-bold text-xs px-3 py-1.5"
                      onClick={() => handleRejectLeave(l.id)}
                    >
                      Reject
                    </Button>
                    <Button 
                      variant="primary" 
                      className="bg-[#1e1a8a] text-white hover:bg-[#1e1a8a]/90 font-bold text-xs px-3 py-1.5 shadow-sm"
                      onClick={() => handleApproveLeave(l.id)}
                    >
                      Approve
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Backup Cover Modal */}
      <Modal 
        isOpen={isBackupModalOpen} 
        onClose={() => { setIsBackupModalOpen(false); setSelectedAlert(null); }} 
        title={`Eligible Coverage Replacements`}
      >
        {loadingBackups ? (
          <div className="p-8 text-center text-sm font-semibold text-outline">
            Calculating constraint matching algorithms...
          </div>
        ) : backups.length === 0 ? (
          <div className="p-8 text-center text-sm font-semibold text-outline">
            No eligible replacement cashiers found for this period.
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-on-surface-variant font-medium">The following casher staff are currently available, match required skills, and do not violate rest-hour rules:</p>
            <div className="divide-y divide-outline-variant max-h-80 overflow-y-auto pr-1">
              {backups.map(worker => (
                <div key={worker.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={worker.name} size="md" />
                    <div>
                      <div className="font-bold text-sm text-on-surface">{worker.name}</div>
                      <div className="text-xs font-semibold text-on-surface-variant">Reliability Score: {Math.round(worker.reliabilityScore * 100)}%</div>
                    </div>
                  </div>
                  <Button 
                    variant="success" 
                    size="sm" 
                    className="bg-success text-white font-bold"
                    onClick={() => handleAssignReplacement(worker.id)}
                  >
                    <UserCheck className="w-4 h-4 mr-1.5" /> Assign Cover
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
