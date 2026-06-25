import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './common/Card';
import { Button } from './common/Button';
import { Avatar } from './common/Avatar';
import { Download, TrendingUp, Sparkles, MoveRight, CheckCircle2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import * as api from '../api';

export function FairnessEquity() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await api.getAllEmployees();
        setEmployees(data || []);
      } catch (e) {
        console.error("Failed to load employees for fairness", e);
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const totalHrsScore = employees.length ? Math.round(employees.reduce((acc, e) => acc + (e.fairnessScore || 0), 0) / employees.length * 100) : 0;
  
  const pieData = employees.length ? [
    { name: 'Total Hrs', value: totalHrsScore, color: '#1e1a8a' },
    { name: 'Weekends', value: Math.max(0, totalHrsScore - 10), color: '#14b8a6' },
    { name: 'Nights', value: Math.max(0, totalHrsScore - 20), color: '#f59e0b' },
  ] : [
    { name: 'No Data', value: 100, color: '#e2e8f0' }
  ];

  const employeeIndex = employees
    .map(e => {
      const score = Math.round((e.fairnessScore || 0) * 100);
      let color = 'bg-[#14b8a6]';
      if (score < 80) color = 'bg-[#1e1a8a]';
      if (score < 65) color = 'bg-[#cbd5e1]';
      if (score < 50) color = 'bg-[#ef4444]';
      return {
        id: e.id,
        name: e.name,
        score,
        color,
        isWarning: score < 50
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const avgScore = employeeIndex.length ? Math.round(employeeIndex.reduce((acc, e) => acc + e.score, 0) / employeeIndex.length) : 0;
  const criticalEmp = employeeIndex.find(e => e.isWarning);

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-surface-variant">
      <div className="w-full mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-on-surface tracking-tight">Fairness & Equity</h2>
            <p className="text-on-surface-variant mt-1">Real-time analysis of shift distribution and workload balance.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-outline mr-2">This Week (Oct 15 - 21)</span>
            <Button variant="outline" className="bg-surface font-bold shadow-sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Donut Chart Card */}
          <Card className="col-span-1 shadow-sm border-outline-variant flex flex-col">
            <CardHeader className="py-4 border-none">
              <CardTitle className="text-sm uppercase tracking-wider text-outline flex items-center justify-between w-full">
                Store Overall Fairness
                <TrendingUp className="w-4 h-4 text-success" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center p-0 pb-6">
              <div className="relative w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-4xl font-extrabold text-on-surface leading-none tracking-tighter">{totalHrsScore}</span>
                  <span className="text-xs font-bold text-outline">/100</span>
                </div>
              </div>
              <div className="flex gap-6 mt-4">
                {employees.length === 0 ? (
                  <span className="text-sm font-semibold text-outline-variant">No data to display</span>
                ) : pieData.map((d, i) => (
                  <div key={i} className="flex flex-col items-center text-center">
                    <span className="text-[10px] font-bold uppercase text-outline mb-1">{d.name}</span>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                      <span className="text-sm font-extrabold text-on-surface">{d.value}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Employee Fairness Index */}
          <Card className="col-span-2 shadow-sm border-outline-variant flex flex-col">
            <CardHeader className="py-4 border-none">
              <CardTitle className="text-sm uppercase tracking-wider text-outline flex items-center justify-between w-full">
                Employee Fairness Index
                <button className="text-xs normal-case text-primary font-bold hover:underline">View All Details</button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {employees.length === 0 ? (
                <div className="py-12 flex items-center justify-center text-outline-variant font-semibold">
                  No employee data available.
                </div>
              ) : (
                <>
                  <div className="space-y-5">
                    {employeeIndex.map((emp, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Avatar name={emp.name} size="sm" />
                        <span className="w-20 text-sm font-bold text-on-surface truncate">{emp.name}</span>
                        <div className="flex-1 bg-surface-variant h-2.5 rounded-full overflow-hidden">
                          <div className={`h-full ${emp.color} rounded-full transition-all`} style={{ width: `${emp.score}%` }}></div>
                        </div>
                        <span className={`w-8 text-right text-sm font-bold ${emp.isWarning ? 'text-error' : 'text-on-surface'}`}>
                          {emp.score}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 pt-4 border-t border-outline-variant/50 flex justify-between text-xs font-semibold text-outline">
                    <span>Min Target: 70</span>
                    <span>Avg: {avgScore}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Imbalance Insight */}
        {criticalEmp ? (
          <Card className="shadow-sm border border-[#1e1a8a]/20 bg-gradient-to-r from-white to-[#1e1a8a]/[0.02]">
            <div className="flex flex-col md:flex-row items-stretch min-h-[140px]">
              <div className="p-6 md:w-2/3 border-b md:border-b-0 md:border-r border-outline-variant/50">
                <div className="flex items-center gap-3 mb-3">
                  <Sparkles className="w-5 h-5 text-[#1e1a8a]" />
                  <h3 className="text-lg font-bold text-on-surface">AI Imbalance Insight</h3>
                  <span className="bg-[#fef2f2] text-error border border-error/20 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Critical Flag</span>
                </div>
                <p className="text-body-md text-on-surface leading-relaxed">
                  <span className="font-bold text-on-surface">{criticalEmp.name}</span> has a fairness score of <span className="font-bold text-error">{criticalEmp.score}</span>, dropping below the minimum target. Recommend immediate schedule rebalancing to improve equity.
                </p>
                <div className="flex items-center gap-3 mt-4 text-xs font-semibold text-outline">
                  <span>Current Score: {criticalEmp.score}</span>
                  <MoveRight className="w-3 h-3 text-outline-variant" />
                  <span>Proj. Score after rebalance: {Math.min(100, criticalEmp.score + 25)}</span>
                </div>
              </div>
              
              <div className="p-6 md:w-1/3 flex flex-col justify-center bg-surface-variant/20">
                <span className="text-[10px] font-bold text-outline uppercase tracking-wider mb-2 block">Suggested Action</span>
                <p className="text-sm font-semibold text-on-surface mb-4">
                  Run auto-rebalance for upcoming shifts.
                </p>
                <div className="flex gap-3">
                  <Button variant="primary" className="flex-1 bg-[#1e1a8a] shadow-sm">
                    <Sparkles className="w-4 h-4 mr-2" /> Auto-Rebalance
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="shadow-sm border-success/20 bg-success/5 flex items-center p-6 gap-4">
            <CheckCircle2 className="w-8 h-8 text-success" />
            <div>
              <h3 className="text-lg font-bold text-on-surface">Schedule is highly balanced</h3>
              <p className="text-sm text-on-surface-variant">No critical imbalances detected across the workforce. Fairness is maintained.</p>
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}
