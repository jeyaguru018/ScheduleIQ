import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './common/Card';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { Avatar } from './common/Avatar';
import { useToast } from './common/Toast';
import { 
  MapPin, 
  Send, 
  Sparkles, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  User,
  RefreshCw,
  Cpu
} from 'lucide-react';
import * as api from '../api';

export function ControlRoom() {
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [swaps, setSwaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commandText, setCommandText] = useState('');
  const [chatLog, setChatLog] = useState([
    { sender: 'ai', text: 'Welcome to the Live Control Room. I am your operations assistant. You can control the store schedule or run ML diagnostics using plain English commands! Try typing: "evaluate no-show risks" or "assign Ananya to shift #1".' }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { showToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const endStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      
      const [fetchedShifts, fetchedEmployees, fetchedLeaves, fetchedSwaps] = await Promise.all([
        api.getShifts(todayStr + 'T00:00:00', endStr + 'T23:59:59').catch(() => []),
        api.getAllEmployees().catch(() => []),
        api.getAllLeaves().catch(() => []),
        api.getSwapRequests().catch(() => [])
      ]);

      setShifts(fetchedShifts);
      setEmployees(fetchedEmployees);
      setLeaves(fetchedLeaves);
      setSwaps(fetchedSwaps);
    } catch (e) {
      showToast("Failed to sync store operations data: " + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter shifts to just "today"
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayShifts = shifts.filter(s => s.startTime.startsWith(todayDateStr));

  // Determine who is currently on-duty in which zone
  const getZoneStaff = (zoneRole) => {
    return todayShifts.filter(s => {
      if (!s.employee) return false;
      // Map role to store zone
      if (zoneRole === 'CASHIER' && (s.role === 'CASHIER' || s.role === 'LEAD_CASHIER')) return true;
      if (zoneRole === 'STOCKER' && s.role === 'STOCKER') return true;
      if (zoneRole === 'DELIVERY' && s.role === 'DELIVERY_BOY') return true;
      return false;
    });
  };

  const cashiersOnDuty = getZoneStaff('CASHIER');
  const stockersOnDuty = getZoneStaff('STOCKER');
  const deliveryOnDuty = getZoneStaff('DELIVERY');

  const handleSendCommand = async (e) => {
    e.preventDefault();
    if (!commandText.trim()) return;

    const cmd = commandText.trim();
    setChatLog(prev => [...prev, { sender: 'user', text: cmd }]);
    setCommandText('');
    setIsProcessing(true);

    // AI thinking timeout simulation
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const lowerCmd = cmd.toLowerCase();

      // COMMAND 1: "evaluate no-show risks" or "run risk classifier"
      if (lowerCmd.includes('evaluate') || lowerCmd.includes('no-show') || lowerCmd.includes('risk')) {
        const todayStr = new Date().toISOString().split('T')[0];
        const endStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
        await api.evaluateNoShowRisks(todayStr + 'T00:00:00', endStr + 'T23:59:59');
        setChatLog(prev => [...prev, { 
          sender: 'ai', 
          text: '✅ Triggered scikit-learn No-Show Classifier. Evaluated all shifts for the upcoming week and updated risk indexes in the PostgreSQL database ledger.' 
        }]);
        showToast("No-show risks evaluated successfully!");
        loadData();
      }
      
      // COMMAND 2: "assign [employee name] to shift #[id]"
      else if (lowerCmd.includes('assign') && lowerCmd.includes('shift')) {
        const assignMatch = cmd.match(/assign\s+([A-Za-z\s]+)\s+to\s+shift\s+#?(\d+)/i);
        if (assignMatch) {
          const empName = assignMatch[1].trim();
          const shiftId = parseInt(assignMatch[2]);
          
          const emp = employees.find(e => e.name.toLowerCase().includes(empName.toLowerCase()));
          const shift = shifts.find(s => s.id === shiftId);

          if (!emp) {
            setChatLog(prev => [...prev, { sender: 'ai', text: `❌ Could not find an employee matching "${empName}" in the roster.` }]);
          } else if (!shift) {
            setChatLog(prev => [...prev, { sender: 'ai', text: `❌ Could not find shift #${shiftId} in the system.` }]);
          } else {
            await api.assignShiftEmployee(shiftId, emp.id);
            setChatLog(prev => [...prev, { 
              sender: 'ai', 
              text: `✅ Roster Updated: Assigned ${emp.name} (${emp.role}) to shift #${shiftId} (${new Date(shift.startTime).getHours()}:00 - ${new Date(shift.endTime).getHours()}:00).` 
            }]);
            showToast(`Assigned ${emp.name} to shift #${shiftId}`);
            loadData();
          }
        } else {
          setChatLog(prev => [...prev, { sender: 'ai', text: '❌ Invalid assign command format. Use: "assign [name] to shift #[id]".' }]);
        }
      }

      // COMMAND 3: "approve swap #[id]"
      else if (lowerCmd.includes('approve') && lowerCmd.includes('swap')) {
        const swapMatch = cmd.match(/approve\s+swap\s+#?(\d+)/i);
        if (swapMatch) {
          const swapId = parseInt(swapMatch[1]);
          const swapReq = swaps.find(s => s.id === swapId);

          if (!swapReq) {
            setChatLog(prev => [...prev, { sender: 'ai', text: `❌ Could not find swap request #${swapId}.` }]);
          } else {
            await api.approveSwap(swapId);
            setChatLog(prev => [...prev, { sender: 'ai', text: `✅ Swap Request #${swapId} approved. Shift schedules have been swapped in PostgreSQL transaction.` }]);
            showToast("Approved shift swap!");
            loadData();
          }
        } else {
          setChatLog(prev => [...prev, { sender: 'ai', text: '❌ Invalid swap approval format. Use: "approve swap #[id]".' }]);
        }
      }

      // COMMAND 4: "approve leave #[id]" or "reject leave #[id]"
      else if (lowerCmd.includes('leave') && (lowerCmd.includes('approve') || lowerCmd.includes('reject'))) {
        const leaveMatch = cmd.match(/(approve|reject)\s+leave\s+#?(\d+)/i);
        if (leaveMatch) {
          const action = leaveMatch[1].toLowerCase();
          const leaveId = parseInt(leaveMatch[2]);
          const leaveReq = leaves.find(l => l.id === leaveId);

          if (!leaveReq) {
            setChatLog(prev => [...prev, { sender: 'ai', text: `❌ Could not find leave request #${leaveId}.` }]);
          } else {
            if (action === 'approve') {
              await api.approveLeave(leaveId);
              setChatLog(prev => [...prev, { sender: 'ai', text: `✅ Leave request #${leaveId} for ${leaveReq.employee.name} approved.` }]);
            } else {
              await api.rejectLeave(leaveId);
              setChatLog(prev => [...prev, { sender: 'ai', text: `❌ Leave request #${leaveId} for ${leaveReq.employee.name} rejected.` }]);
            }
            showToast(`Leave request updated.`);
            loadData();
          }
        } else {
          setChatLog(prev => [...prev, { sender: 'ai', text: '❌ Invalid leave command. Use: "approve leave #[id]" or "reject leave #[id]".' }]);
        }
      }

      // NO MATCH FALLBACK
      else {
        setChatLog(prev => [...prev, { 
          sender: 'ai', 
          text: `🤖 I understood your message, but I couldn't map it to an exact system command. Try using one of these templates:\n- "evaluate no-show risks"\n- "assign [employee name] to shift #[id]"\n- "approve swap #[id]"\n- "approve leave #[id]"` 
        }]);
      }

    } catch (e) {
      setChatLog(prev => [...prev, { sender: 'ai', text: `❌ API Error executing command: ${e.message}` }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-surface-variant">
      <div className="w-full mx-auto space-y-6 flex flex-col h-[calc(100vh-140px)] min-h-0 flex-1">
        
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-3xl font-bold text-on-surface tracking-tight flex items-center gap-2">
              <Cpu className="w-8 h-8 text-primary animate-pulse" />
              Live Operations Control Center
            </h2>
            <p className="text-on-surface-variant mt-1">Real-time floor allocations and interactive natural language assistant.</p>
          </div>
          <Button variant="outline" className="bg-surface" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" /> Reload Feed
          </Button>
        </div>

        {/* Core Layout Split */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
          
          {/* Left Side: Store Floorplan & Duty Status */}
          <div className="flex-1 bg-surface border border-outline-variant rounded-2xl p-6 flex flex-col overflow-hidden shadow-sm">
            <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" /> Live Store Map (Chennai Store #1)
            </h3>
            
            <div className="flex-1 relative border border-dashed border-outline-variant rounded-xl p-4 bg-surface-variant grid grid-cols-2 grid-rows-2 gap-4">
              
              {/* Zone A: Checkout Desks (Cashiers) */}
              <div className="border border-outline-variant rounded-xl p-4 bg-surface shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-extrabold text-[#10b981] bg-[#10b981]/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Checkout Zone</span>
                  <span className="text-[10px] font-bold text-outline uppercase">{cashiersOnDuty.length} Active</span>
                </div>
                <div className="flex-1 flex flex-wrap gap-3 items-center justify-center">
                  {cashiersOnDuty.length === 0 ? (
                    <span className="text-xs text-outline italic">No cashiers currently clocked in.</span>
                  ) : (
                    cashiersOnDuty.map(s => (
                      <div key={s.id} className="flex flex-col items-center gap-1 group relative">
                        <Avatar name={s.employee.name} size="md" className={s.clockStatus === 'CLOCKED_IN' ? 'ring-2 ring-[#10b981] ring-offset-2' : ''} />
                        <span className="text-[10px] font-bold text-on-surface truncate max-w-[80px]">{s.employee.name}</span>
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 bg-slate-950 text-white text-[9px] p-2 rounded shadow-xl hidden group-hover:block z-30 w-32 pointer-events-none">
                          <p className="font-bold">{s.employee.name}</p>
                          <p className="text-slate-400">Shift #{s.id}</p>
                          <p className="text-[#10b981] font-bold">{s.clockStatus || 'EXPECTED'}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Zone B: Inventory & Stockroom (Stockers) */}
              <div className="border border-outline-variant rounded-xl p-4 bg-surface shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-extrabold text-[#8b5cf6] bg-[#8b5cf6]/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Stockroom</span>
                  <span className="text-[10px] font-bold text-outline uppercase">{stockersOnDuty.length} Active</span>
                </div>
                <div className="flex-1 flex flex-wrap gap-3 items-center justify-center">
                  {stockersOnDuty.length === 0 ? (
                    <span className="text-xs text-outline italic">No stockers currently scheduled.</span>
                  ) : (
                    stockersOnDuty.map(s => (
                      <div key={s.id} className="flex flex-col items-center gap-1 group relative">
                        <Avatar name={s.employee.name} size="md" className={s.clockStatus === 'CLOCKED_IN' ? 'ring-2 ring-[#8b5cf6] ring-offset-2' : ''} />
                        <span className="text-[10px] font-bold text-on-surface truncate max-w-[80px]">{s.employee.name}</span>
                        <div className="absolute bottom-full mb-2 bg-slate-955 text-white text-[9px] p-2 rounded shadow-xl hidden group-hover:block z-30 w-32 pointer-events-none">
                          <p className="font-bold">{s.employee.name}</p>
                          <p className="text-slate-400">Shift #{s.id}</p>
                          <p className="text-[#8b5cf6] font-bold">{s.clockStatus || 'EXPECTED'}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Zone C: Delivery Dispatch (Delivery Boys) */}
              <div className="border border-outline-variant rounded-xl p-4 bg-surface shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-extrabold text-[#f59e0b] bg-[#f59e0b]/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Delivery Hub</span>
                  <span className="text-[10px] font-bold text-outline uppercase">{deliveryOnDuty.length} Active</span>
                </div>
                <div className="flex-1 flex flex-wrap gap-3 items-center justify-center">
                  {deliveryOnDuty.length === 0 ? (
                    <span className="text-xs text-outline italic">No delivery staff clocked in.</span>
                  ) : (
                    deliveryOnDuty.map(s => (
                      <div key={s.id} className="flex flex-col items-center gap-1 group relative">
                        <Avatar name={s.employee.name} size="md" className={s.clockStatus === 'CLOCKED_IN' ? 'ring-2 ring-[#f59e0b] ring-offset-2' : ''} />
                        <span className="text-[10px] font-bold text-on-surface truncate max-w-[80px]">{s.employee.name}</span>
                        <div className="absolute bottom-full mb-2 bg-slate-955 text-white text-[9px] p-2 rounded shadow-xl hidden group-hover:block z-30 w-32 pointer-events-none">
                          <p className="font-bold">{s.employee.name}</p>
                          <p className="text-slate-400">Shift #{s.id}</p>
                          <p className="text-[#f59e0b] font-bold">{s.clockStatus || 'EXPECTED'}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Zone D: Off-Duty / Backup Pool */}
              <div className="border border-outline-variant rounded-xl p-4 bg-surface shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-extrabold text-[#3b82f6] bg-[#3b82f6]/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Off-Duty Pool</span>
                  <span className="text-[10px] font-bold text-outline uppercase">Available</span>
                </div>
                <div className="flex-1 flex flex-wrap gap-2 items-center justify-start overflow-y-auto max-h-[120px] p-1">
                  {employees.length === 0 ? (
                    <span className="text-xs text-outline italic">No employees registered.</span>
                  ) : (
                    employees.filter(e => e.role !== 'MANAGER' && !todayShifts.some(s => s.employee && s.employee.id === e.id)).map(emp => (
                      <div key={emp.id} className="flex items-center gap-1.5 bg-surface-variant border border-outline-variant/60 rounded-full px-2 py-0.5 animate-in fade-in duration-200">
                        <Avatar name={emp.name} size="xs" />
                        <span className="text-[9px] font-extrabold text-on-surface">{emp.name}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Right Side: Natural Language Command Assistant */}
          <div className="w-full lg:w-96 bg-surface border border-outline-variant rounded-2xl flex flex-col overflow-hidden shadow-sm">
            <div className="p-4 border-b border-outline-variant bg-surface flex items-center justify-between shrink-0">
              <h3 className="font-bold text-on-surface flex items-center gap-2 text-sm uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-primary" /> Command Assistant
              </h3>
              <span className="text-[9px] font-extrabold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Agent Online</span>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatLog.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-xl p-3.5 text-xs leading-relaxed ${
                    msg.sender === 'user' 
                      ? 'bg-primary text-on-primary rounded-tr-none' 
                      : 'bg-surface-variant text-on-surface border border-outline-variant/60 rounded-tl-none font-medium'
                  }`}>
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-surface-variant border border-outline-variant/60 rounded-xl rounded-tl-none p-3.5 flex items-center gap-2 text-xs font-semibold text-outline">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-outline animate-bounce"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-outline animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-outline animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                    Processing operations command...
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendCommand} className="p-4 border-t border-outline-variant shrink-0 bg-surface flex gap-2">
              <Input 
                value={commandText} 
                onChange={e => setCommandText(e.target.value)} 
                placeholder="Type commands here..." 
                disabled={isProcessing}
                className="flex-1 h-10 text-xs shadow-sm bg-surface"
              />
              <Button type="submit" variant="primary" className="bg-primary h-10 w-10 p-0 flex items-center justify-center shrink-0 shadow" disabled={isProcessing}>
                <Send className="w-4 h-4 text-white" />
              </Button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
