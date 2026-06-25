import React, { useState, useEffect } from 'react';
import { Card } from './common/Card';
import { Button } from './common/Button';
import { Avatar } from './common/Avatar';
import { CheckCircle2, AlertTriangle, ArrowRightLeft, X, Check, SearchX } from 'lucide-react';
import * as api from '../api';
import { useToast } from './common/Toast';

export function SwapMarketplace() {
  const [activeTab, setActiveTab] = useState('pending');
  const [swaps, setSwaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const [selectedSwapForBackup, setSelectedSwapForBackup] = useState(null);
  const [backupRecommendations, setBackupRecommendations] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);

  useEffect(() => {
    loadSwaps();
  }, []);

  const loadSwaps = async () => {
    setLoading(true);
    try {
      const data = await api.getSwapRequests();
      
      if (data && data.length > 0) {
        // Map real backend data
        const mapped = data.map(mapSwapRequest);
        setSwaps(mapped);
      } else {
        setSwaps([]);
      }
    } catch (e) {
      console.warn("Failed to load swaps:", e.message);
      setSwaps([]);
    } finally {
      setLoading(false);
    }
  };

  const loadBackupsForShift = async (shiftId) => {
    setLoadingBackups(true);
    try {
      const data = await api.getBackupWorkers(shiftId);
      setBackupRecommendations(data || []);
    } catch (e) {
      showToast("Failed to load backups: " + e.message, 'error');
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleAssignBackup = async (shiftId, employeeId, swapId) => {
    try {
      await api.assignShiftEmployee(shiftId, employeeId);
      await api.approveSwap(swapId);
      showToast("Backup worker assigned and swap resolved successfully!");
      setSelectedSwapForBackup(null);
      loadSwaps();
    } catch (e) {
      showToast("Failed to assign backup: " + e.message, 'error');
    }
  };

  const handleAction = async (id, action) => {
    try {
      if (action === 'APPROVE' || action === 'OVERRIDE') {
        await api.approveSwap(id);
        showToast("Shift swap approved successfully!");
      } else {
        showToast("Shift swap request rejected.");
      }
      
      // Reload swaps from DB after action
      await loadSwaps();
    } catch (e) {
      showToast("Failed to process swap: " + e.message, 'error');
    }
  };

  const mapSwapRequest = (swap) => {
    const initiatorName = swap.requester ? swap.requester.name : 'Unknown Staff';
    const initiatorRole = swap.requester ? swap.requester.role : 'CASHIER';
    
    const recipientName = swap.targetEmployee ? swap.targetEmployee.name : 'Open Pool / Cover';
    const recipientRole = swap.targetEmployee ? swap.targetEmployee.role : 'CASHIER';

    const givingUpTime = swap.requesterShift 
      ? formatShiftTime(swap.requesterShift.startTime, swap.requesterShift.endTime)
      : 'No shift assigned';

    const takingShiftTime = swap.targetShift
      ? formatShiftTime(swap.targetShift.startTime, swap.targetShift.endTime)
      : 'Cover Request (No Trade)';

    const hasViolation = swap.requesterShift ? (swap.requesterShift.noShowRisk > 0.20) : false;

    return {
      id: swap.id,
      status: swap.status || 'PENDING',
      rawSwap: swap,
      initiator: { name: initiatorName, role: initiatorRole },
      recipient: { name: recipientName, role: recipientRole },
      givingUp: givingUpTime,
      takingShift: takingShiftTime,
      hasViolation: hasViolation,
      message: hasViolation 
        ? `Attendance Risk Warning: AI predicts a ${Math.round(swap.requesterShift.noShowRisk * 100)}% reliability shortfall for this cashier.`
        : 'No constraint violations. AI projection indicates neutral impact on departmental coverage.'
    };
  };

  const formatShiftTime = (startStr, endStr) => {
    if (!startStr || !endStr) return 'TBD';
    const s = new Date(startStr);
    const e = new Date(endStr);
    const timeOpts = { hour: 'numeric', minute: '2-digit' };
    return `${s.toLocaleDateString()} ${s.toLocaleTimeString([], timeOpts)} - ${e.toLocaleTimeString([], timeOpts)}`;
  };

  const filteredSwaps = swaps.filter(s => 
    activeTab === 'pending' ? s.status === 'PENDING' : s.status === 'APPROVED'
  );

  const pendingCount = swaps.filter(s => s.status === 'PENDING').length;
  const approvedCount = swaps.filter(s => s.status === 'APPROVED').length;

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-surface-variant">
      <div className="w-full mx-auto space-y-6">
        
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div>
            <h2 className="text-3xl font-bold text-on-surface tracking-tight">Swap Marketplace</h2>
            <p className="text-on-surface-variant mt-1">Review and manage peer-to-peer schedule exchanges.</p>
          </div>
          <div className="flex items-center bg-surface border border-outline-variant p-1 rounded-lg shadow-sm">
            <button className="px-4 py-1.5 rounded bg-surface-variant text-sm font-bold text-on-surface">All Shifts</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-8 border-b border-outline-variant mb-6 shrink-0">
          <button 
            className={`pb-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'pending' ? 'border-[#1e1a8a] text-[#1e1a8a]' : 'border-transparent text-outline hover:text-on-surface'}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Review <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'pending' ? 'bg-[#1e1a8a]/10 text-[#1e1a8a]' : 'bg-surface-variant text-outline'}`}>{pendingCount}</span>
          </button>
          <button 
            className={`pb-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'approved' ? 'border-[#1e1a8a] text-[#1e1a8a]' : 'border-transparent text-outline hover:text-on-surface'}`}
            onClick={() => setActiveTab('approved')}
          >
            Approved <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'approved' ? 'bg-[#1e1a8a]/10 text-[#1e1a8a]' : 'bg-surface-variant text-outline'}`}>{approvedCount}</span>
          </button>
        </div>

        {/* Swap Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredSwaps.length === 0 ? (
            <div className="col-span-2 py-20 flex flex-col items-center justify-center text-center bg-surface border border-outline-variant border-dashed rounded-xl">
              <div className="w-16 h-16 bg-surface-variant/50 rounded-full flex items-center justify-center mb-4 text-outline">
                <SearchX className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-on-surface mb-2">No {activeTab} swaps</h3>
              <p className="text-sm text-on-surface-variant max-w-sm">
                There are currently no shift exchange requests in this category. When employees request trades, they will appear here for your review.
              </p>
            </div>
          ) : (
            filteredSwaps.map((swap) => (
              <Card key={swap.id} className="shadow-sm border-outline-variant overflow-hidden flex flex-col">
                {/* Alert Banner */}
                <div className={`px-4 py-3 border-b flex gap-3 text-sm font-semibold ${
                  swap.hasViolation 
                    ? 'bg-[#fef2f2] border-error/20 text-[#b91c1c]' 
                    : 'bg-[#f0fdf4] border-success/20 text-[#15803d]'
                }`}>
                  {swap.hasViolation ? <AlertTriangle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
                  <p>{swap.message}</p>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-8 relative">
                    <div className="absolute left-1/2 top-1/2 w-1/3 h-px bg-outline-variant -translate-x-1/2 -translate-y-1/2 -z-10"></div>
                    
                    {/* Initiator */}
                    <div className="w-[45%] text-left bg-surface pr-2">
                      <div className="text-[10px] font-bold text-outline uppercase tracking-wider mb-3">Initiator</div>
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar name={swap.initiator.name} size="md" />
                        <div>
                          <div className="text-sm font-bold text-on-surface truncate max-w-[120px]">{swap.initiator.name}</div>
                          <div className="text-xs font-medium text-on-surface-variant">{swap.initiator.role}</div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-outline uppercase tracking-wider">Giving up:</div>
                        <div className="text-xs font-semibold text-on-surface bg-surface-variant/50 border border-outline-variant/50 px-2 py-1 rounded inline-block truncate max-w-full">{swap.givingUp}</div>
                      </div>
                    </div>

                    {/* Icon */}
                    <div className="w-8 h-8 rounded-full bg-surface border border-outline-variant flex items-center justify-center shrink-0 z-10 shadow-sm text-primary">
                      <ArrowRightLeft className="w-4 h-4" />
                    </div>

                    {/* Recipient */}
                    <div className="w-[45%] text-right bg-surface pl-2">
                      <div className="text-[10px] font-bold text-outline uppercase tracking-wider mb-3">Recipient</div>
                      <div className="flex items-center justify-end gap-3 mb-4">
                        <div className="text-right">
                          <div className="text-sm font-bold text-on-surface truncate max-w-[120px]">{swap.recipient.name}</div>
                          <div className="text-xs font-medium text-on-surface-variant">{swap.recipient.role}</div>
                        </div>
                        <Avatar name={swap.recipient.name} size="md" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-outline uppercase tracking-wider">Taking shift:</div>
                        <div className="text-xs font-semibold text-on-warning bg-warning-container border border-warning px-2 py-1 rounded inline-block truncate max-w-full">{swap.takingShift}</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {activeTab === 'pending' && (
                    <div className="flex justify-between items-center pt-6 border-t border-outline-variant gap-2 flex-wrap">
                      <Button variant="dangerGhost" className="font-bold px-0 hover:bg-transparent" onClick={() => handleAction(swap.id, 'REJECT')}>
                        <X className="w-4 h-4 mr-2" /> Reject
                      </Button>
                      <Button 
                        variant="outline" 
                        className="font-bold text-[#1e1a8a] border-[#1e1a8a] hover:bg-[#1e1a8a]/5 shadow-sm text-xs py-1.5 px-3"
                        onClick={() => {
                          setSelectedSwapForBackup(swap);
                          if (swap.rawSwap && swap.rawSwap.requesterShift) {
                            loadBackupsForShift(swap.rawSwap.requesterShift.id);
                          }
                        }}
                      >
                        <ArrowRightLeft className="w-4 h-4 mr-2" /> AI Backups
                      </Button>
                      {swap.hasViolation ? (
                        <Button variant="outline" className="font-bold border-error text-error hover:bg-error/5 shadow-sm text-xs py-1.5 px-3" onClick={() => handleAction(swap.id, 'OVERRIDE')}>
                          <AlertTriangle className="w-4 h-4 mr-2" /> Override
                        </Button>
                      ) : (
                        <Button variant="success" className="font-bold border-transparent text-xs py-1.5 px-3" onClick={() => handleAction(swap.id, 'APPROVE')}>
                          <Check className="w-4 h-4 mr-2 text-white" /> Approve
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
        
      </div>

      {/* Right Slide-out AI Backup Recommendations Panel */}
      {selectedSwapForBackup && (
        <div className="w-[400px] bg-surface border-l border-outline-variant flex flex-col shrink-0 animate-in slide-in-from-right duration-300 shadow-2xl z-20 absolute right-0 top-0 bottom-0">
          <div className="p-6 border-b border-outline-variant flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-on-surface">AI Backup Recommendations</h3>
              <p className="text-xs font-semibold text-on-surface-variant mt-1">Eligible replacements for {selectedSwapForBackup.initiator.name}'s shift</p>
            </div>
            <button onClick={() => setSelectedSwapForBackup(null)} className="text-outline hover:text-on-surface">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {loadingBackups ? (
              <div className="h-full flex items-center justify-center text-outline font-semibold">Analyzing qualifications and reliability...</div>
            ) : backupRecommendations.length === 0 ? (
              <div className="p-4 bg-surface-variant/20 border border-outline-variant rounded-lg text-center text-on-surface-variant text-sm font-semibold">
                No eligible backup workers found. All other employees have leave requests or overlapping shifts.
              </div>
            ) : (
              backupRecommendations.map(emp => (
                <div key={emp.id} className="p-4 border border-outline-variant rounded-xl flex items-center justify-between hover:shadow-md transition-shadow bg-surface">
                  <div className="flex items-center gap-3">
                    <Avatar name={emp.name} size="md" />
                    <div>
                      <div className="font-bold text-sm text-on-surface">{emp.name}</div>
                      <div className="text-xs font-semibold text-success flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {Math.round(emp.reliabilityScore * 100)}% Reliability
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="primary" 
                    size="sm"
                    className="bg-[#1e1a8a] text-white text-xs font-bold py-1.5 px-3"
                    onClick={() => {
                      if (selectedSwapForBackup.rawSwap && selectedSwapForBackup.rawSwap.requesterShift) {
                        handleAssignBackup(selectedSwapForBackup.rawSwap.requesterShift.id, emp.id, selectedSwapForBackup.id);
                      }
                    }}
                  >
                    Assign
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
}
