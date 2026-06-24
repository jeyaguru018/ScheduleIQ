import React, { useState, useEffect, useCallback } from 'react';
import { Card } from './common/Card';
import { Button } from './common/Button';
import { Avatar } from './common/Avatar';
import { Modal } from './common/Modal';
import {
  AlertCircle, 
  Store, 
  Search, 
  UserCheck, 
  CheckCircle2, 
  Clock,
  CalendarRange,
  X,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Bell,
  Shield
} from 'lucide-react';
import * as api from '../api';
import { useToast } from './common/Toast';

export function AlertCenter() {
  const [alerts, setAlerts] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [backups, setBackups] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [processingLeave, setProcessingLeave] = useState(null); // track which leave is being processed
  const { showToast } = useToast();

  const loadData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [alertData, leaveData] = await Promise.all([
        api.getAlerts().catch(() => []),
        api.getAllLeaves().catch(() => [])
      ]);
      setAlerts(alertData || []);
      setLeaves((leaveData || []).filter(l => l.status === 'PENDING'));
    } catch (e) {
      console.warn('Failed to load alert center data:', e.message);
      setAlerts([]);
      setLeaves([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleFindReplacement = async (alertItem) => {
    setSelectedAlert(alertItem);
    setIsBackupModalOpen(true);
    setLoadingBackups(true);
    try {
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
      showToast('Replacement assigned successfully! Shift coverage is secured.', 'success');
      setIsBackupModalOpen(false);
      setSelectedAlert(null);
      await loadData(true);
    } catch (e) {
      showToast(e.message || 'Failed to assign replacement.', 'error');
    }
  };

  const handleApproveLeave = async (leaveId, employeeName) => {
    setProcessingLeave(leaveId);
    try {
      await api.approveLeave(leaveId);
      showToast(`✅ Leave approved for ${employeeName}. Their schedule will be updated accordingly.`, 'success');
      await loadData(true);
    } catch (e) {
      showToast(e.message || 'Failed to approve leave.', 'error');
    } finally {
      setProcessingLeave(null);
    }
  };

  const handleRejectLeave = async (leaveId, employeeName) => {
    setProcessingLeave(leaveId);
    try {
      await api.rejectLeave(leaveId);
      showToast(`Leave request rejected for ${employeeName}.`, 'success');
      await loadData(true);
    } catch (e) {
      showToast(e.message || 'Failed to reject leave.', 'error');
    } finally {
      setProcessingLeave(null);
    }
  };

  const formatShiftTime = (startStr, endStr) => {
    if (!startStr || !endStr) return '';
    const start = new Date(startStr);
    const end = new Date(endStr);
    const dateStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
    const startH = start.getHours().toString().padStart(2, '0');
    const startM = start.getMinutes().toString().padStart(2, '0');
    const endH = end.getHours().toString().padStart(2, '0');
    const endM = end.getMinutes().toString().padStart(2, '0');
    const isNight = start.getHours() >= 18 || start.getHours() < 6;
    return `${dateStr} • ${startH}:${startM} – ${endH}:${endM} (${isNight ? '🌙 Night' : '☀️ Day'})`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#fafbfc]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#1e1a8a]/20 border-t-[#1e1a8a] rounded-full animate-spin" />
          <p className="text-sm font-semibold text-on-surface-variant">Loading Alert Center...</p>
        </div>
      </div>
    );
  }

  const totalActionItems = alerts.length + leaves.length;

  return (
    <div className="flex-1 overflow-y-auto bg-surface-variant">
      <div className="w-full max-w-screen-2xl mx-auto p-6 pb-10 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-on-surface tracking-tight flex items-center gap-2">
              <Bell className="w-6 h-6 text-[#1e1a8a]" />Alert Center
            </h2>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Manage no-show risks and pending leave requests for your team.
            </p>
          </div>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 text-sm font-bold text-[#1e1a8a] bg-white border border-outline-variant px-4 py-2 rounded-xl hover:shadow-md transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Summary Banner */}
        {totalActionItems > 0 ? (
          <div className="bg-gradient-to-r from-[#fef2f2] to-[#fff5f5] border border-error/20 rounded-2xl p-5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-error flex items-center justify-center shadow-md shrink-0">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-error">{totalActionItems} Action{totalActionItems > 1 ? 's' : ''} Required</h3>
                <p className="text-sm text-error/70 mt-0.5">
                  {alerts.length > 0 && `${alerts.length} no-show risk${alerts.length > 1 ? 's' : ''}`}
                  {alerts.length > 0 && leaves.length > 0 && ' · '}
                  {leaves.length > 0 && `${leaves.length} pending leave${leaves.length > 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-error/80 bg-error/10 px-3 py-1.5 rounded-lg">Requires Attention</span>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-[#f0fdf4] to-[#ecfdf5] border border-[#10b981]/20 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-[#10b981] flex items-center justify-center shadow-md shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: '#10b981' }}>All Clear!</h3>
              <p className="text-sm mt-0.5" style={{ color: '#059669' }}>No active alerts or pending requests right now.</p>
            </div>
          </div>
        )}

        {/* No-Show Risk Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-error" />
              No-Show Risk Alerts
              <span className="text-xs font-bold text-error bg-error/10 px-2 py-0.5 rounded-full">{alerts.length}</span>
            </h3>

            {alerts.map(alertItem => {
              const riskPct = Math.round(alertItem.noShowRisk * 100);
              const empName = alertItem.employee ? alertItem.employee.name : 'Open Shift';
              const empRole = alertItem.employee ? alertItem.employee.role : alertItem.role;
              const isHighRisk = riskPct >= 50;

              return (
                <Card key={alertItem.id} className="shadow-md border-error/20 overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    {/* Left: Risk Info */}
                    <div className="flex-1 p-5 md:border-r border-outline-variant/40">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={empName} size="lg" className="border-2 border-error/15 shadow-sm" />
                          <div>
                            <h4 className="text-base font-bold text-on-surface">{empName}</h4>
                            <p className="text-xs text-on-surface-variant font-medium mt-0.5 flex items-center gap-1">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border ${
                                empRole === 'CASHIER' ? 'bg-[#14b8a6]/10 text-[#0d9488] border-[#14b8a6]/20' :
                                empRole === 'STOCKER' ? 'bg-[#8b5cf6]/10 text-[#7c3aed] border-[#8b5cf6]/20' :
                                'bg-surface-variant text-outline border-outline-variant'
                              }`}>{empRole?.replace('_', ' ')}</span>
                            </p>
                            <p className="text-xs text-on-surface-variant mt-1">{formatShiftTime(alertItem.startTime, alertItem.endTime)}</p>
                          </div>
                        </div>
                        <span className={`border text-[10px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 ${
                          isHighRisk ? 'bg-[#fef2f2] text-error border-error/20' : 'bg-[#fffbeb] text-[#b45309] border-[#fcd34d]'
                        }`}>
                          <AlertCircle className="w-3.5 h-3.5" />
                          {isHighRisk ? 'Critical' : 'Moderate'}
                        </span>
                      </div>

                      {/* Risk bar */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[10px] font-bold text-outline uppercase tracking-wider">AI No-Show Risk</span>
                          <span className={`text-sm font-extrabold ${isHighRisk ? 'text-error' : 'text-[#b45309]'}`}>{riskPct}%</span>
                        </div>
                        <div className="w-full h-2 bg-surface-variant rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isHighRisk ? 'bg-error' : 'bg-[#f59e0b]'}`}
                            style={{ width: `${riskPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-4 bg-surface-variant/30 p-2.5 rounded-xl border border-outline-variant/30">
                        <span className="text-[10px] font-bold text-outline uppercase tracking-wider shrink-0">AI Factors:</span>
                        <div className="flex gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-error bg-error/10 px-2 py-1 rounded-lg">
                            Reliability: {alertItem.employee ? Math.round(alertItem.employee.reliabilityScore * 100) : 0}%
                          </span>
                          {alertItem.noShowRisk > 0.5 && (
                            <span className="text-[10px] font-bold text-[#b45309] bg-[#fffbeb] px-2 py-1 rounded-lg border border-[#fcd34d]">Night Shift Fatigue</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Action */}
                    <div className="md:w-52 p-5 flex flex-col justify-center gap-3 bg-[#fafbfc]">
                      <p className="text-[10px] font-bold text-outline uppercase tracking-wider">Operational Impact</p>
                      <div className="flex items-start gap-2">
                        <Store className="w-4 h-4 text-[#d97706] shrink-0 mt-0.5" />
                        <p className="text-sm font-bold text-on-surface leading-snug">
                          Store under-coverage by 1 {empRole?.replace('_', ' ')} during service peak
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        className="w-full bg-[#1e1a8a] hover:bg-[#1e1a8a]/90 text-white shadow-sm py-2.5 font-bold mt-1"
                        onClick={() => handleFindReplacement(alertItem)}
                      >
                        <Search className="w-4 h-4 mr-2" />Find Replacement
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pending Leave Requests */}
        <div>
          <h3 className="text-base font-bold text-on-surface flex items-center gap-2 mb-4">
            <CalendarRange className="w-4 h-4 text-[#1e1a8a]" />
            Pending Leave Requests
            {leaves.length > 0 && (
              <span className="text-xs font-bold text-[#b45309] bg-[#fffbeb] px-2 py-0.5 rounded-full border border-[#fcd34d]">{leaves.length} pending</span>
            )}
          </h3>

          {leaves.length === 0 ? (
            <div className="p-8 text-center bg-white border border-dashed border-outline-variant rounded-2xl shadow-sm">
              <CalendarRange className="w-10 h-10 text-outline-variant mx-auto mb-3" />
              <h4 className="text-sm font-bold text-on-surface">No pending leave requests</h4>
              <p className="text-xs text-on-surface-variant mt-1">All leave requests have been processed. You're caught up!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaves.map(l => {
                const isProcessing = processingLeave === l.id;
                const empName = l.employee ? l.employee.name : 'Unknown Employee';
                const leaveDate = new Date(l.leaveDate);

                return (
                  <Card key={l.id} className="border-outline-variant/40 shadow-sm overflow-hidden">
                    <div className="p-5 flex items-center gap-4">
                      <Avatar name={empName} size="lg" className="border-2 border-[#f59e0b]/20 shadow-sm shrink-0" />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-on-surface">{empName}</h4>
                          <span className="text-[9px] font-bold text-[#b45309] bg-[#fffbeb] px-2 py-0.5 rounded-full border border-[#fcd34d] uppercase tracking-wider flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />Pending Review
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">
                            <CalendarRange className="w-3.5 h-3.5 text-[#1e1a8a]" />
                            {leaveDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>

                        <p className="text-xs text-on-surface-variant mt-1.5 italic">
                          "{l.reason || 'No reason provided'}"
                        </p>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-error border-error/20 hover:bg-error/5 font-bold px-3 py-2 rounded-xl"
                          onClick={() => handleRejectLeave(l.id, empName)}
                          isLoading={isProcessing}
                          disabled={isProcessing}
                        >
                          {!isProcessing && <ThumbsDown className="w-3.5 h-3.5 mr-1.5" />}
                          Reject
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          className="bg-[#1e1a8a] text-white hover:bg-[#1e1a8a]/90 font-bold px-3 py-2 rounded-xl shadow-sm"
                          onClick={() => handleApproveLeave(l.id, empName)}
                          isLoading={isProcessing}
                          disabled={isProcessing}
                        >
                          {!isProcessing && <ThumbsUp className="w-3.5 h-3.5 mr-1.5" />}
                          Approve
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Backup Cover Modal */}
      <Modal
        isOpen={isBackupModalOpen}
        onClose={() => { setIsBackupModalOpen(false); setSelectedAlert(null); }}
        title="Find Shift Replacement"
      >
        <div className="space-y-4">
          {selectedAlert && (
            <div className="bg-surface-variant/30 rounded-xl p-3 border border-outline-variant/40 text-sm font-semibold text-on-surface-variant">
              <span className="text-on-surface font-bold">{selectedAlert.employee?.name || 'Open Shift'}</span>
              {' '}· {formatShiftTime(selectedAlert.startTime, selectedAlert.endTime)}
            </div>
          )}

          {loadingBackups ? (
            <div className="p-8 text-center">
              <div className="w-10 h-10 border-4 border-[#1e1a8a]/20 border-t-[#1e1a8a] rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-outline">Calculating eligible replacements...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="p-8 text-center">
              <UserCheck className="w-10 h-10 text-outline-variant mx-auto mb-3" />
              <p className="text-sm font-bold text-on-surface">No eligible replacements found</p>
              <p className="text-xs text-on-surface-variant mt-1">All available staff are either on leave, working another shift, or exceed hour limits.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-on-surface-variant">The following staff are available, match the required skills, and don't violate rest-hour rules:</p>
              <div className="divide-y divide-outline-variant max-h-72 overflow-y-auto pr-1 rounded-xl border border-outline-variant/40">
                {backups.map(worker => (
                  <div key={worker.id} className="py-3 px-4 flex items-center justify-between hover:bg-surface-variant/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar name={worker.name} size="md" />
                      <div>
                        <div className="font-bold text-sm text-on-surface">{worker.name}</div>
                        <div className="text-xs font-semibold text-on-surface-variant">
                          Reliability: <span className="text-success">{Math.round(worker.reliabilityScore * 100)}%</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="success"
                      size="sm"
                      className="bg-success text-white font-bold rounded-xl shadow-sm"
                      onClick={() => handleAssignReplacement(worker.id)}
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1.5" />Assign
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
