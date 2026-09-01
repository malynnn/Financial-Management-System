"use client";

export const dynamic = 'force-dynamic';

import React, { useState, useMemo, Suspense, useEffect } from 'react';
import { 
  Wallet, CheckCircle2, ShieldCheck, ShieldAlert,
  Loader2, ChevronDown, PieChart as PieChartIcon,
  TrendingUp, TrendingDown, Minus, LineChart, Sparkles,
  History, BellRing, Maximize2, X, ArrowRightLeft, RefreshCw, 
  FileText, AlertTriangle, Search, Download
} from 'lucide-react';
import { 
  PieChart, Pie, Tooltip as ChartTooltip, ResponsiveContainer, Legend, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, LineChart as RechartsLineChart, Line
} from 'recharts';
import Header from '@/components/Header';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';

const CHART_COLORS = ['#04152d', '#2563eb', '#eab308', '#60a5fa', '#fef08a', '#1e3a8a'];

function TreasurerDashboardContent() {
  const [funds, setFunds] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [analyticsResult, setAnalyticsResult] = useState<any | null>(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [selectedForecastFund, setSelectedForecastFund] = useState('All');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [printDate, setPrintDate] = useState<string>('');

  const [recModalState, setRecModalState] = useState<'closed' | 'open' | 'closing'>('closed');
  const [auditModalState, setAuditModalState] = useState<'closed' | 'open' | 'closing'>('closed');

  const [selectedFund, setSelectedFund] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setPrintDate(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));

    const fetchAllData = async () => {
      try {
        setIsLoading(true);
        setIsAnalyticsLoading(true);
        
        // MOCK DATA INJECTION: Replaces failing fetch requests
        setTimeout(() => {
          const mockFunds = [
            { id: '1', name: 'General Fund', balance: 250000 },
            { id: '2', name: 'Emergency Fund', balance: 75000 },
            { id: '3', name: 'Events Fund', balance: 45000 }
          ];

          const mockLedger = [
            { id: 'tx1', fundId: '1', date: '2026-08-25', desc: 'Member Dues Collection', amount: 15000, type: 'CASH_IN', ref: 'REF-001' },
            { id: 'tx2', fundId: '1', date: '2026-08-26', desc: 'Office Supplies', amount: 3500, type: 'CASH_OUT', ref: 'REF-002' },
            { id: 'tx3', fundId: '2', date: '2026-08-27', desc: 'Medical Assistance', amount: 10000, type: 'CASH_OUT', ref: 'REF-003' }
          ];

          const mockAnalytics = {
            summary: {
              total_balance: 370000,
              net_flow: 12500,
              total_deposits: 45000,
              total_withdrawals: 30000,
              total_loans: 2500
            },
            forecasts: [
              { fund: 'General Fund', projected_balance: 265000, trend: 'up', confidence: 92 },
              { fund: 'Emergency Fund', projected_balance: 70000, trend: 'down', confidence: 85 },
              { fund: 'Events Fund', projected_balance: 48000, trend: 'up', confidence: 88 }
            ],
            shortage_alerts: [
              { id: 1, fund: 'Emergency Fund', shortfall_amount: 5000, predicted_date: '2026-10-15' }
            ],
            recommendations: [
              { id: 1, type: 'critical', title: 'Rebalance Emergency Fund', description: 'The Emergency Fund is projected to dip below the minimum threshold. **Action Required:** Transfer ₱5,000 from the General Fund.\n- Immediate transfer recommended\n- Monitor closely for the next 30 days', timestamp: new Date().toISOString() },
              { id: 2, type: 'success', title: 'Healthy General Fund Growth', description: 'General Fund shows consistent month-over-month growth. Current trajectory supports upcoming planned disbursements.', timestamp: new Date(Date.now() - 86400000).toISOString() }
            ],
            audit_logs: [
              { id: 1, action: 'Generated AI Financial Forecast', actor: 'Treasurer', status: 'success', timestamp: new Date().toISOString() }
            ],
            trends: {
              daily_flow: [
                { date: 'Aug 25', cumulative: 340000 },
                { date: 'Aug 26', cumulative: 350000 },
                { date: 'Aug 27', cumulative: 345000 },
                { date: 'Aug 28', cumulative: 360000 },
                { date: 'Aug 29', cumulative: 365000 },
                { date: 'Aug 30', cumulative: 370000 }
              ],
              forecast_timeline: [
                { month: 'Sep', projected_assets: 375000, upper_bound: 390000, lower_bound: 360000 },
                { month: 'Oct', projected_assets: 382000, upper_bound: 405000, lower_bound: 365000 },
                { month: 'Nov', projected_assets: 395000, upper_bound: 420000, lower_bound: 370000 },
                { month: 'Dec', projected_assets: 410000, upper_bound: 440000, lower_bound: 385000 }
              ]
            }
          };

          setFunds(mockFunds);
          setLedger(mockLedger);
          setSelectedFund(mockFunds[0]);
          setAnalyticsResult(mockAnalytics);
          setLastRefreshed(new Date());

          setIsLoading(false);
          setIsAnalyticsLoading(false);
        }, 800);

      } catch (err) {
        console.error('Failed to set mock data', err);
        setIsLoading(false);
        setIsAnalyticsLoading(false);
      }
    };
    
    fetchAllData();
  }, []);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1e6) return `₱${(value / 1e6).toFixed(1)}M`;
    if (Math.abs(value) >= 1e3) return `₱${(value / 1e3).toFixed(0)}K`;
    return `₱${value}`;
  };

  const formatAIRecommendation = (text: string) => {
    if (!text) return null;
    
    const renderText = (str: string) => {
      const parts = str.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-black text-[#04152d]">{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    };

    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const elements: React.ReactNode[] = [];
    let currentList: React.ReactNode[] = [];

    lines.forEach((line, i) => {
      const lineStr = line.trim();
      const isBullet = lineStr.startsWith('- ') || lineStr.startsWith('* ') || lineStr.startsWith('• ');
      const isNumbered = /^\d+\.\s/.test(lineStr);

      if (isBullet || isNumbered) {
        const cleanLine = lineStr.replace(/^[-*•]\s|^\d+\.\s/, '');
        currentList.push(<li key={i} className="pl-1">{renderText(cleanLine)}</li>);
      } else {
        if (currentList.length > 0) {
          elements.push(<ul key={`ul-${i}`} className="list-disc pl-5 space-y-1.5 marker:text-blue-500 mb-3">{currentList}</ul>);
          currentList = [];
        }
        elements.push(<p key={`p-${i}`} className="mb-3 last:mb-0">{renderText(lineStr)}</p>);
      }
    });

    if (currentList.length > 0) {
      elements.push(<ul key="ul-end" className="list-disc pl-5 space-y-1.5 marker:text-blue-500 mb-3 last:mb-0">{currentList}</ul>);
    }

    return <div className="text-[12.5px] font-medium text-[#04152d]/80 leading-relaxed mt-2">{elements}</div>;
  };

  const closeRecModal = () => {
    setRecModalState('closing');
    setTimeout(() => setRecModalState('closed'), 300);
  };

  const closeAuditModal = () => {
    setAuditModalState('closing');
    setTimeout(() => setAuditModalState('closed'), 300);
  };

  const exportPDFReport = async () => {
    const element = document.getElementById('printable-pdf-report');
    if (!element) return;
    setIsExportingPDF(true);
    
    element.style.display = 'block';

    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Financial_Forecasting_Report_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      element.style.display = 'none';
      setIsExportingPDF(false);
    }
  };

  const pieChartData = useMemo(() => {
    return funds.filter(f => f.balance > 0).map((f, index) => ({
      name: f.name,
      value: f.balance,
      fill: CHART_COLORS[index % CHART_COLORS.length]
    }));
  }, [funds]);

  const balanceChartData = useMemo(() => analyticsResult?.trends?.daily_flow || [], [analyticsResult]);
  
  const forecastTimelineData = useMemo(() => {
    if (!analyticsResult?.trends?.forecast_timeline) return [];
    const baseTimeline = analyticsResult.trends.forecast_timeline;
    
    if (selectedForecastFund === 'All') return baseTimeline;

    const fundData = funds.find(f => f.name === selectedForecastFund);
    if (!fundData) return baseTimeline;

    const totalBalance = analyticsResult.summary?.total_balance || 1;
    const fundShare = fundData.balance / totalBalance;

    return baseTimeline.map((pt: any) => ({
      month: pt.month,
      projected_assets: pt.projected_assets * fundShare,
      lower_bound: pt.lower_bound * fundShare,
      upper_bound: pt.upper_bound * fundShare
    }));
  }, [analyticsResult, selectedForecastFund, funds]);

  const baseActiveTransactions = selectedFund ? ledger.filter(tx => tx.fundId === selectedFund.id) : [];
  const activeTransactions = baseActiveTransactions.filter(tx => 
    JSON.stringify(tx).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const ultraGlassCard = "glass-sheen bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/80 shadow-[0_10px_30px_rgba(4,21,45,0.06),0_1px_1px_rgba(255,255,255,0.6),inset_0_2px_3px_rgba(255,255,255,0.9)] rounded-[24px] p-5 md:p-6 transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)]";
  const iconBtn = "glass-sheen flex items-center justify-center bg-white/70 hover:bg-white/90 backdrop-blur-md border border-white/80 shadow-[0_2px_8px_rgba(4,21,45,0.04),inset_0_1px_2px_rgba(255,255,255,0.8)] hover:shadow-[0_4px_12px_rgba(4,21,45,0.08),inset_0_1px_2px_rgba(255,255,255,1)] rounded-full transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] active:scale-90 text-[#04152d]/60 hover:text-[#04152d]";
  const pillBtn = "glass-sheen px-5 py-2.5 bg-white/70 hover:bg-white/90 backdrop-blur-xl backdrop-saturate-[180%] border border-white/80 shadow-[0_4px_14px_rgba(4,21,45,0.06),inset_0_1px_2px_rgba(255,255,255,1)] hover:shadow-[0_8px_20px_rgba(4,21,45,0.1),inset_0_1px_2px_rgba(255,255,255,1)] hover:-translate-y-0.5 active:scale-95 active:translate-y-0 rounded-full text-[13px] font-black text-[#04152d] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:hover:translate-y-0";

  return (
    <div className="relative flex flex-col min-h-screen bg-[#f4f5f7]">
      
      <style jsx global>{`
        @keyframes modal-fade-in {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes modal-fade-out {
          from { opacity: 1; transform: scale(1) translateY(0); }
          to { opacity: 0; transform: scale(0.95) translateY(10px); }
        }
        .animate-modal-enter { animation: modal-fade-in 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
        .animate-modal-exit { animation: modal-fade-out 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards; }

        .glass-sheen { position: relative; overflow: hidden; isolation: isolate; }
        .glass-sheen::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(128deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.14) 28%, rgba(255,255,255,0) 46%), radial-gradient(130% 110% at 12% -18%, rgba(255,255,255,0.55), rgba(255,255,255,0) 58%);
          opacity: 0.85; transition: opacity 0.35s ease; pointer-events: none; z-index: 1;
        }
        .glass-sheen:hover::before { opacity: 1; }
        .glass-sheen::after {
          content: ''; position: absolute; inset: 0;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -10px 18px -14px rgba(4,21,45,0.15), inset 1px 0 0 rgba(255,255,255,0.4), inset -1px 0 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.1);
          transition: box-shadow 0.35s ease; pointer-events: none; z-index: 1; border-radius: inherit;
        }
        .glass-sheen:hover::after {
          box-shadow: inset 0 1px 0 rgba(255,255,255,1), inset 0 -10px 20px -12px rgba(4,21,45,0.2), inset 1px 0 0 rgba(255,255,255,0.6), inset -1px 0 0 rgba(255,255,255,0.2), inset 0 0 0 1px rgba(255,255,255,0.4);
        }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Hidden layout exclusively for PDF Generation */}
      <div id="printable-pdf-report" style={{ display: 'none' }} className="absolute left-[-9999px] top-0 w-[850px] bg-white text-black p-10 font-sans shadow-none">
        <div className="border-b-2 border-[#04152d] pb-4 mb-6">
          <h1 className="text-3xl font-black text-[#04152d]">Financial Forecasting & Analytics Report</h1>
          <p className="text-sm font-bold text-gray-500 mt-2">Generated on: {printDate}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Total Net Assets</p>
            <p className="text-xl font-black text-[#04152d]">₱{analyticsResult?.summary?.total_balance.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Net Cash Flow</p>
            <p className="text-xl font-black text-[#04152d]">₱{analyticsResult?.summary?.net_flow.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</p>
          </div>
        </div>

        <h2 className="text-lg font-black text-[#04152d] mb-3 border-b border-gray-200 pb-2">AI Fund Forecasts</h2>
        {analyticsResult?.forecasts?.length ? (
          <table className="w-full text-left mb-8 border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-600 uppercase text-xs">
                <th className="p-3 border border-gray-200">Fund Designation</th>
                <th className="p-3 border border-gray-200">Projected Balance</th>
                <th className="p-3 border border-gray-200">Trend</th>
                <th className="p-3 border border-gray-200">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {analyticsResult.forecasts.map((f: any, i: number) => (
                <tr key={i}>
                  <td className="p-3 border border-gray-200 font-bold">{f.fund}</td>
                  <td className="p-3 border border-gray-200">₱{f.projected_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 border border-gray-200 uppercase">{f.trend}</td>
                  <td className="p-3 border border-gray-200">{f.confidence}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mb-8 text-sm text-gray-600">No projected data available.</p>
        )}

        <h2 className="text-lg font-black text-[#04152d] mb-3 border-b border-gray-200 pb-2">Projected Shortage Alerts</h2>
        {analyticsResult?.shortage_alerts?.length ? (
          <ul className="list-disc pl-5 mb-8 text-sm">
            {analyticsResult.shortage_alerts.map((a: any) => (
              <li key={a.id} className="mb-2">
                <strong>{a.fund}:</strong> Estimated deficit of ₱{a.shortfall_amount.toLocaleString()} predicted by {new Date(a.predicted_date).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })}.
              </li>
            ))}
          </ul>
        ) : <p className="mb-8 text-sm text-gray-600">No projected shortages detected at this time.</p>}

        <h2 className="text-lg font-black text-[#04152d] mb-3 border-b border-gray-200 pb-2">AI Strategic Recommendations</h2>
        {analyticsResult?.recommendations?.length ? (
          <div className="space-y-4 mb-8 text-sm">
            {analyticsResult.recommendations.map((r: any) => (
              <div key={r.id} className="p-3 bg-gray-50 border border-gray-200 rounded">
                <p className="font-black text-[#04152d] mb-1">{r.title} ({r.type.toUpperCase()})</p>
                <p className="text-gray-700">{r.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-8 text-sm text-gray-600">No recommendations available.</p>
        )}
      </div>

      {/* Recommendation Modal */}
      {recModalState !== 'closed' && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 transition-opacity duration-300 ${recModalState === 'closing' ? 'opacity-0' : 'opacity-100'}`}>
          <div className="absolute inset-0 bg-[#04152d]/40 backdrop-blur-md" onClick={closeRecModal} />
          <div className={`relative w-full max-w-3xl max-h-[85vh] flex flex-col ${recModalState === 'closing' ? 'animate-modal-exit' : 'animate-modal-enter'} ${ultraGlassCard}`}>
            <div className="flex items-center justify-between border-b border-white/60 pb-4 mb-4">
              <h3 className="text-[17px] font-black text-[#04152d] tracking-tight flex items-center gap-2">
                <Sparkles size={20} className="text-yellow-500" /> Full Recommendation History
              </h3>
              <div className="absolute top-6 right-6 z-20">
                <button onClick={closeRecModal} className={`${iconBtn} w-8 h-8`}>
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto hide-scrollbar space-y-4 pr-2">
              {analyticsResult?.recommendations?.length ? (
                analyticsResult.recommendations.map((rec: any) => (
                  <div key={rec.id} className="bg-white/50 backdrop-blur-md border border-white/80 p-5 rounded-[20px] shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] hover:bg-white/70 transition-colors duration-300">
                    <div className="flex items-center gap-2.5 mb-2">
                      {rec.type === 'critical' || rec.type === 'warning' ? <ShieldAlert size={16} className="text-yellow-600" /> : <ShieldCheck size={16} className="text-blue-600" />}
                      <span className="text-[14px] font-black text-[#04152d]">{rec.title}</span>
                      <span className="ml-auto text-[10.5px] font-bold text-[#04152d]/50 font-mono bg-white/60 px-2.5 py-1 rounded-md border border-white/80 shrink-0">
                        {new Date(rec.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {formatAIRecommendation(rec.description)}
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-gray-500 font-bold text-sm">No historical recommendations available.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Modal */}
      {auditModalState !== 'closed' && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 transition-opacity duration-300 ${auditModalState === 'closing' ? 'opacity-0' : 'opacity-100'}`}>
          <div className="absolute inset-0 bg-[#04152d]/40 backdrop-blur-md" onClick={closeAuditModal} />
          <div className={`relative w-full max-w-4xl max-h-[85vh] flex flex-col ${auditModalState === 'closing' ? 'animate-modal-exit' : 'animate-modal-enter'} ${ultraGlassCard}`}>
            <div className="flex items-center justify-between border-b border-white/60 pb-4 mb-4">
              <h3 className="text-[17px] font-black text-[#04152d] tracking-tight flex items-center gap-2">
                <History size={20} className="text-blue-600" /> System Audit Logs
              </h3>
              <div className="absolute top-6 right-6 z-20">
                <button onClick={closeAuditModal} className={`${iconBtn} w-8 h-8`}>
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto hide-scrollbar rounded-[16px] border border-white/70 bg-white/30">
              <table className="w-full text-left">
                <thead className="bg-white/60 backdrop-blur-md shadow-[0_1px_0_rgba(255,255,255,0.9)] text-[10px] font-black text-[#04152d]/60 uppercase tracking-[0.2em] sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap">Timestamp (PHT)</th>
                    <th className="px-6 py-4">Action Sequence</th>
                    <th className="px-6 py-4 whitespace-nowrap">Actor</th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/60 text-[12.5px] font-bold text-[#04152d]">
                  {analyticsResult?.audit_logs?.length ? (
                    analyticsResult.audit_logs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-white/60 transition-colors duration-300">
                        <td className="px-6 py-3.5 font-mono text-[11px] opacity-70 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="px-6 py-3.5 tracking-tight whitespace-normal break-words min-w-[300px] leading-relaxed">
                          {log.action}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap"><span className="bg-white/80 px-2.5 py-1 rounded-md border border-white shadow-sm">{log.actor}</span></td>
                        <td className="px-6 py-3.5 text-right whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-1 text-[9px] font-black rounded-full uppercase tracking-widest border border-white/80 shadow-sm ${
                            log.status === 'success' ? 'bg-blue-50 text-blue-700' : 'bg-yellow-50 text-yellow-700'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-16 text-center text-gray-500 font-bold text-sm">No system logs recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-white/30 border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <Header />
      </div>

      <div className="p-4 md:p-6 max-w-[1600px] w-full mx-auto space-y-6 animate-fade-in flex-1 relative z-10">
        
        {isLoading || isAnalyticsLoading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white/50 backdrop-blur-[40px] border border-white/80 rounded-[28px] shadow-sm max-w-md mx-auto">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-[14px] font-black text-[#04152d] tracking-tight">Initializing AI Dashboard...</p>
          </div>
        ) : (
          <>
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${ultraGlassCard}`}>
              <div>
                <h2 className="text-[20px] font-black tracking-tight text-[#04152d] flex items-center gap-2">
                  <TrendingUp size={24} className="text-blue-600" /> Dashboard Analytics
                </h2>
                <p className="text-[12px] font-bold text-[#04152d]/60 mt-1">
                  {lastRefreshed ? `Last synchronization: ${lastRefreshed.toLocaleTimeString('en-US', { timeZone: 'Asia/Manila' })} (PHT)` : 'Synthesized parameters derived from validated data.'}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => window.location.reload()} className={pillBtn}>
                  <RefreshCw size={14} /> Refresh
                </button>
                <button onClick={exportPDFReport} disabled={isExportingPDF} className={`${pillBtn} !bg-[#04152d] !text-white hover:!bg-[#04152d]/90 !shadow-[0_6px_16px_rgba(4,21,45,0.25)] border-white/20`}>
                  {isExportingPDF ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} Export PDF
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {funds.map((fund, index) => {
                const isBlue = index % 2 === 0;
                return (
                  <div key={fund.id} className="glass-sheen bg-white/50 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/80 shadow-[0_8px_24px_rgba(4,21,45,0.04),inset_0_2px_3px_rgba(255,255,255,0.9)] rounded-[24px] p-5 flex flex-col group hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(4,21,45,0.08),inset_0_2px_3px_rgba(255,255,255,1)] hover:bg-white/60 transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)]">
                    <div className="flex justify-between items-start mb-3 relative z-10">
                      <div className="w-10 h-10 bg-white/90 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(4,21,45,0.06),inset_0_1px_2px_rgba(255,255,255,1)] group-hover:scale-110 transition-transform duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] border border-white">
                        <Wallet size={18} strokeWidth={2.5} className={isBlue ? 'text-blue-600' : 'text-yellow-500'} />
                      </div>
                    </div>
                    <div className="relative z-10">
                      <h3 className="text-[10px] font-black text-[#04152d]/50 uppercase tracking-[0.16em] mb-1.5 truncate text-left">{fund.name}</h3>
                      <p className="text-2xl lg:text-[26px] font-black text-[#04152d] tracking-tighter truncate text-left">
                        ₱{fund.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {analyticsResult && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="glass-sheen bg-white/50 backdrop-blur-[40px] border border-white/80 shadow-[0_8px_24px_rgba(4,21,45,0.04),inset_0_1px_2px_rgba(255,255,255,0.9)] rounded-[24px] p-5 lg:p-6 flex flex-col xl:flex-row items-start xl:items-center gap-4 group hover:-translate-y-1 transition-all duration-400">
                  <div className="w-12 h-12 bg-white/90 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_4px_10px_rgba(4,21,45,0.06)] border border-white">
                    <Wallet className="text-blue-600" size={22} />
                  </div>
                  <div className="min-w-0 w-full">
                    <span className="block text-[10px] font-black text-[#04152d]/50 uppercase tracking-widest truncate">Total Net Assets</span>
                    <p className="text-xl lg:text-2xl font-black text-[#04152d] tracking-tighter mt-0.5 truncate" title={`₱${analyticsResult.summary.total_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}>
                      ₱{analyticsResult.summary.total_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="glass-sheen bg-white/50 backdrop-blur-[40px] border border-white/80 shadow-[0_8px_24px_rgba(4,21,45,0.04),inset_0_1px_2px_rgba(255,255,255,0.9)] rounded-[24px] p-5 lg:p-6 flex flex-col xl:flex-row items-start xl:items-center gap-4 group hover:-translate-y-1 transition-all duration-400">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_4px_10px_rgba(4,21,45,0.06)] border border-white ${analyticsResult.summary.net_flow >= 0 ? 'bg-blue-50' : 'bg-yellow-50'}`}>
                    <ArrowRightLeft className={analyticsResult.summary.net_flow >= 0 ? 'text-blue-600' : 'text-yellow-600'} size={22} />
                  </div>
                  <div className="min-w-0 w-full">
                    <span className="block text-[10px] font-black text-[#04152d]/50 uppercase tracking-widest truncate">Net Cash Flow</span>
                    <p className={`text-xl lg:text-2xl font-black tracking-tighter mt-0.5 truncate ${analyticsResult.summary.net_flow >= 0 ? 'text-blue-600' : 'text-yellow-600'}`} title={`${analyticsResult.summary.net_flow >= 0 ? '+' : ''} ₱${analyticsResult.summary.net_flow.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}>
                      {analyticsResult.summary.net_flow >= 0 ? '+' : ''} ₱{analyticsResult.summary.net_flow.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="glass-sheen bg-white/50 backdrop-blur-[40px] border border-white/80 shadow-[0_8px_24px_rgba(4,21,45,0.04),inset_0_1px_2px_rgba(255,255,255,0.9)] rounded-[24px] p-5 lg:p-6 flex flex-col xl:flex-row items-start xl:items-center gap-4 group hover:-translate-y-1 transition-all duration-400">
                  <div className="w-12 h-12 bg-white/90 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_4px_10px_rgba(4,21,45,0.06)] border border-white">
                    <TrendingUp className="text-blue-500" size={22} />
                  </div>
                  <div className="min-w-0 w-full">
                    <span className="block text-[10px] font-black text-[#04152d]/50 uppercase tracking-widest truncate">Total Inflows</span>
                    <p className="text-xl lg:text-2xl font-black text-blue-600 tracking-tighter mt-0.5 truncate" title={`₱${analyticsResult.summary.total_deposits.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}>
                      ₱{analyticsResult.summary.total_deposits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="glass-sheen bg-white/50 backdrop-blur-[40px] border border-white/80 shadow-[0_8px_24px_rgba(4,21,45,0.04),inset_0_1px_2px_rgba(255,255,255,0.9)] rounded-[24px] p-5 lg:p-6 flex flex-col xl:flex-row items-start xl:items-center gap-4 group hover:-translate-y-1 transition-all duration-400">
                  <div className="w-12 h-12 bg-white/90 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_4px_10px_rgba(4,21,45,0.06)] border border-white">
                    <TrendingDown className="text-yellow-600" size={22} />
                  </div>
                  <div className="min-w-0 w-full">
                    <span className="block text-[10px] font-black text-[#04152d]/50 uppercase tracking-widest truncate">Total Outflows</span>
                    <p className="text-xl lg:text-2xl font-black text-yellow-600 tracking-tighter mt-0.5 truncate" title={`₱${(analyticsResult.summary.total_withdrawals + analyticsResult.summary.total_loans).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}>
                      ₱{(analyticsResult.summary.total_withdrawals + analyticsResult.summary.total_loans).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {analyticsResult && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                  
                  {analyticsResult.shortage_alerts && analyticsResult.shortage_alerts.length > 0 && (
                    <div className="glass-sheen bg-white/60 backdrop-blur-[40px] backdrop-saturate-[200%] border border-yellow-300/60 shadow-[0_12px_32px_rgba(234,179,8,0.1),inset_0_2px_4px_rgba(255,255,255,1)] rounded-[24px] p-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <BellRing size={120} className="text-yellow-600" />
                      </div>
                      <h3 className="text-[14px] font-black text-[#04152d] tracking-tight uppercase tracking-[0.15em] border-b border-white/80 pb-3 mb-4 flex items-center gap-2 relative z-10">
                        <BellRing size={18} className="text-yellow-600" /> Projected Shortage Alerts
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                        {analyticsResult.shortage_alerts.map((alert: any) => (
                          <div key={alert.id} className="bg-white/70 backdrop-blur-md border border-white rounded-[16px] p-4 shadow-sm flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-yellow-100/80 flex items-center justify-center shrink-0 border border-yellow-200">
                              <AlertTriangle size={18} className="text-yellow-600" />
                            </div>
                            <div>
                              <h4 className="text-[14px] font-black text-[#04152d] tracking-tight">{alert.fund} Shortfall Predicted</h4>
                              <p className="text-[12px] font-bold text-[#04152d]/70 mt-1">
                                Estimated deficit of <span className="text-yellow-600 font-black">₱{alert.shortfall_amount.toLocaleString()}</span> by <span className="font-mono bg-white/60 px-1 rounded">{new Date(alert.predicted_date).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analyticsResult.forecasts && analyticsResult.forecasts.length > 0 && (
                    <div className={ultraGlassCard}>
                      <h3 className="text-[14px] font-black text-[#04152d] tracking-tight uppercase tracking-widest border-b border-white/60 pb-3 mb-5 flex items-center gap-2">
                        <LineChart size={18} className="text-blue-500" /> AI Fund Forecast Insights
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {analyticsResult.forecasts.map((forecast: any, i: number) => (
                          <div key={i} className="bg-white/40 backdrop-blur-md border border-white rounded-[20px] p-5 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)] hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[13px] font-black text-[#04152d]">{forecast.fund}</span>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-sm ${
                                forecast.trend === 'up' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                forecast.trend === 'down' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                                'bg-gray-50 text-gray-600 border-gray-200'
                              }`}>
                                {forecast.trend === 'up' ? <TrendingUp size={14} /> : forecast.trend === 'down' ? <TrendingDown size={14} /> : <Minus size={14} />}
                              </div>
                            </div>
                            <span className="block text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest mb-1">Projected Balance</span>
                            <p className={`text-2xl font-black tracking-tighter ${
                                forecast.trend === 'up' ? 'text-blue-600' :
                                forecast.trend === 'down' ? 'text-yellow-600' :
                                'text-[#04152d]'
                              }`}
                              title={`₱${forecast.projected_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                            >
                              {formatCurrency(forecast.projected_balance)}
                            </p>
                            <div className="mt-4 flex items-center gap-2 text-[11px] font-bold text-[#04152d]/50">
                              <div className="h-1.5 flex-1 bg-white/50 rounded-full overflow-hidden border border-white/60">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${forecast.confidence}%` }} />
                              </div>
                              <span className="shrink-0">{forecast.confidence}% Confidence</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={ultraGlassCard}>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-white/60 pb-3 mb-5 gap-3">
                      <h3 className="text-[14px] font-black text-[#04152d] tracking-tight uppercase tracking-widest flex items-center gap-2">
                        <LineChart size={18} className="text-blue-500" /> 6-Month Predictive Trajectory
                      </h3>
                      <div className="relative inline-block w-full sm:w-auto">
                        <select
                          value={selectedForecastFund}
                          onChange={(e) => setSelectedForecastFund(e.target.value)}
                          className="appearance-none bg-white/50 backdrop-blur-2xl rounded-full border border-white/80 shadow-[inset_0_2px_4px_rgba(255,255,255,0.95),0_4px_12px_rgba(4,21,45,0.05)] pl-5 pr-10 py-2 font-black text-[12px] tracking-tight text-[#04152d] cursor-pointer outline-none hover:bg-white/70 transition-all w-full sm:w-auto"
                        >
                          {['All', ...funds.map(f => f.name)].map(opt => (
                            <option key={opt} value={opt}>{opt} Forecast</option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#04152d]/50">
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>

                    <div className="h-72 sm:h-96 w-full">
                      {forecastTimelineData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsLineChart data={forecastTimelineData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(4,21,45,0.08)" />
                            <XAxis dataKey="month" stroke="#04152d" opacity={0.5} fontSize={11} tickLine={false} fontWeight="bold" />
                            <YAxis stroke="#04152d" opacity={0.5} fontSize={11} tickLine={false} fontWeight="bold" tickFormatter={formatCurrency} />
                            <ChartTooltip 
                              formatter={(value: any, name: any) => [`₱${Number(value).toLocaleString('en-US', { minimumFractionDigits: 0 })}`, name === 'projected_assets' ? 'Projected Balance' : name === 'upper_bound' ? 'Optimistic' : 'Conservative']}
                              contentStyle={{ backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 12px 30px rgba(4,21,45,0.1)', fontSize: '12px', fontWeight: '900', color: '#04152d' }}
                            />
                            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '900', color: '#04152d' }} />
                            <Line type="monotone" dataKey="upper_bound" name="Optimistic" stroke="#93c5fd" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                            <Line type="monotone" dataKey="projected_assets" name="Projected" stroke="#2563eb" strokeWidth={4} activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }} />
                            <Line type="monotone" dataKey="lower_bound" name="Conservative" stroke="#fcd34d" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                          </RechartsLineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-[#04152d]/40 font-bold">Projection matrix unavailable</div>
                      )}
                    </div>
                  </div>

                  <div className={ultraGlassCard}>
                    <h3 className="text-[13px] font-black text-[#04152d] tracking-tight uppercase tracking-widest border-b border-white/60 pb-3 mb-5">
                      Historical Baseline (Running Cumulative)
                    </h3>
                    <div className="h-64 sm:h-80 w-full">
                      {balanceChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={balanceChartData} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(4,21,45,0.06)" />
                            <XAxis dataKey="date" stroke="#04152d" opacity={0.5} fontSize={10} tickLine={false} fontWeight="bold" />
                            <YAxis stroke="#04152d" opacity={0.5} fontSize={10} tickLine={false} fontWeight="bold" tickFormatter={formatCurrency} />
                            <ChartTooltip 
                              formatter={(value: any) => [`₱${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Assets Balance']}
                              contentStyle={{ backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 8px 30px rgba(4,21,45,0.08)', fontSize: '11.5px', fontWeight: '900' }}
                            />
                            <Area type="monotone" dataKey="cumulative" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorCumulative)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-[#04152d]/40 font-bold">Historical data unavailable</div>
                      )}
                    </div>
                  </div>

                </div>

                <div className="xl:col-span-1 space-y-6">
                  
                  <div className={ultraGlassCard}>
                    <h3 className="text-[14px] font-black text-[#04152d] tracking-tight uppercase tracking-widest border-b border-white/60 pb-3 mb-5 flex items-center gap-2">
                      <PieChartIcon size={18} className="text-blue-500" /> Current Asset Allocation
                    </h3>
                    <div className="h-[300px] w-full flex items-center justify-center">
                      {pieChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                          <PieChart>
                            <Pie
                              data={pieChartData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="45%"
                              innerRadius={65}
                              outerRadius={90}
                              paddingAngle={4}
                            >
                              {pieChartData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} stroke="rgba(255,255,255,0.6)" strokeWidth={2} />
                              ))}
                            </Pie>
                            <ChartTooltip 
                              formatter={(value: any) => [`₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 0 })}`, 'Balance']}
                              contentStyle={{ backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 8px 30px rgba(4,21,45,0.08)', fontSize: '11.5px', fontWeight: '900' }}
                            />
                            <Legend 
                              verticalAlign="bottom" 
                              align="center"
                              height={80}
                              iconType="circle" 
                              iconSize={10} 
                              wrapperStyle={{ fontSize: '11px', fontWeight: '900', color: '#04152d', paddingTop: '20px' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-[#04152d]/40 font-bold">Allocation data unavailable</div>
                      )}
                    </div>
                  </div>

                  <div className={`${ultraGlassCard} flex flex-col`}>
                    <div className="flex items-center justify-between border-b border-white/60 pb-4 mb-5">
                      <h3 className="text-[14px] font-black text-[#04152d] tracking-tight uppercase tracking-widest flex items-center gap-2">
                        <Sparkles size={18} className="text-yellow-500" /> AI Recommendations
                      </h3>
                      <button onClick={() => setRecModalState('open')} className={`${iconBtn} w-8 h-8`} title="Expand Reports">
                        <Maximize2 size={14} />
                      </button>
                    </div>
                    <div className="space-y-4 flex-1 overflow-hidden relative">
                      {analyticsResult.recommendations?.length ? (
                        analyticsResult.recommendations.slice(0, 3).map((rec: any) => (
                          <div key={rec.id} className="bg-white/60 backdrop-blur-md border border-white/90 p-5 rounded-[20px] shadow-[inset_0_1px_2px_rgba(255,255,255,1)]">
                            <div className="flex items-center gap-2.5 mb-2.5">
                              {rec.type === 'critical' || rec.type === 'warning' ? <ShieldAlert size={16} className="text-yellow-600" /> : <ShieldCheck size={16} className="text-blue-600" />}
                              <span className="text-[13.5px] font-black text-[#04152d] truncate">{rec.title}</span>
                            </div>
                            
                            <div className="line-clamp-3 overflow-hidden">
                              {formatAIRecommendation(rec.description)}
                            </div>

                            <div className="mt-3">
                              <span className="text-[10px] font-bold text-[#04152d]/40 font-mono bg-white/50 px-2.5 py-1 rounded-md border border-white/60 inline-block">
                                {new Date(rec.timestamp).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10 text-gray-500 font-bold text-sm">No recommendations available.</div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white/40 to-transparent pointer-events-none" />
                    </div>
                    <button onClick={() => setRecModalState('open')} className="w-full mt-4 py-3 text-[11.5px] font-black text-[#04152d]/60 uppercase tracking-widest hover:text-[#04152d] hover:bg-white/40 rounded-xl transition-colors">
                      View All
                    </button>
                  </div>

                  <div className={`${ultraGlassCard} flex flex-col`}>
                    <div className="flex items-center justify-between border-b border-white/60 pb-4 mb-5">
                      <h3 className="text-[14px] font-black text-[#04152d] tracking-tight uppercase tracking-widest flex items-center gap-2">
                        <History size={18} className="text-blue-600" /> System Audit Logs
                      </h3>
                      <button onClick={() => setAuditModalState('open')} className={`${iconBtn} w-8 h-8`} title="Expand Logs">
                        <Maximize2 size={14} />
                      </button>
                    </div>
                    <div className="space-y-3 flex-1 overflow-hidden relative">
                      {analyticsResult.audit_logs?.length ? (
                        analyticsResult.audit_logs.slice(0, 5).map((log: any) => (
                          <div key={log.id} className="flex items-start justify-between py-3 border-b border-white/50 last:border-0">
                            <div className="overflow-hidden pr-3">
                              <p className="text-[12.5px] font-black text-[#04152d] leading-snug line-clamp-2">{log.action}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] font-bold text-[#04152d]/60 bg-white/50 px-2 py-0.5 rounded border border-white/60 truncate max-w-[120px]">{log.actor}</span>
                                <span className="text-[10px] font-mono font-bold text-[#04152d]/40">
                                  {new Date(log.timestamp).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`px-2.5 py-1 rounded border text-[9px] font-black uppercase tracking-widest shadow-sm ${
                                log.status === 'success' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-yellow-50 border-yellow-200 text-yellow-700'
                              }`}>
                                {log.status}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10 text-gray-500 font-bold text-sm">No system logs recorded.</div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/40 to-transparent pointer-events-none" />
                    </div>
                    <button onClick={() => setAuditModalState('open')} className="w-full mt-4 py-3 text-[11.5px] font-black text-[#04152d]/60 uppercase tracking-widest hover:text-[#04152d] hover:bg-white/40 rounded-xl transition-colors">
                      View All
                    </button>
                  </div>

                </div>
              </div>
            )}

            <div className={`!p-0 overflow-hidden flex flex-col !rounded-[24px] ${ultraGlassCard}`}>
              <div className="p-6 md:p-8 border-b border-white/60 flex flex-wrap gap-5 justify-between items-center bg-white/40 backdrop-blur-2xl backdrop-saturate-[190%]">
                <div>
                  <div className="flex items-center gap-3 relative">
                    <div className="relative inline-block w-full sm:w-auto">
                      <select
                        value={selectedFund?.id || ''}
                        onChange={(e) => {
                          const target = funds.find(f => f.id === e.target.value);
                          if (target) setSelectedFund(target);
                        }}
                        className="appearance-none bg-white/50 backdrop-blur-2xl rounded-full border border-white/80 shadow-[inset_0_2px_4px_rgba(255,255,255,0.95),0_4px_12px_rgba(4,21,45,0.05)] pl-6 pr-10 py-3 font-black text-[13px] tracking-tight text-[#04152d] cursor-pointer outline-none hover:bg-white/70 transition-all w-full sm:w-auto"
                      >
                        {funds.map((fund) => (
                          <option key={fund.id} value={fund.id}>{fund.name} Matrix</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#04152d]/50">
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#04152d]/60 font-bold mt-2 ml-2 text-left">Monthly transaction history</p>
                </div>
                
                <div className="flex items-center gap-4 text-[11px] font-bold text-[#04152d]/60 bg-white/50 px-4 py-2 rounded-full border border-white/60">
                  <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]"></div> Cash In</span>
                  <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]"></div> Cash Out</span>
                </div>
              </div>
              
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left whitespace-nowrap min-w-[700px] border-collapse">
                  <thead className="bg-white/60 backdrop-blur-2xl backdrop-saturate-[200%] shadow-[0_1px_0_rgba(255,255,255,1)] text-[10px] font-black text-[#04152d]/50 uppercase tracking-[0.2em]">
                    <tr>
                      <th className="py-4 px-6 border-b border-white/50 text-left">Date</th>
                      <th className="py-4 px-6 border-b border-white/50 text-left">Transaction Detail</th>
                      <th className="py-4 px-6 border-b border-white/50 text-left">Amount</th>
                      <th className="py-4 px-6 border-b border-white/50 text-left">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/60 text-[13.5px] font-bold text-[#04152d] bg-white/30 backdrop-blur-xl backdrop-saturate-[180%]">
                    {activeTransactions.length > 0 ? activeTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/70 hover:backdrop-blur-xl hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]">
                        <td className="py-4 px-6 text-[#04152d]/60 font-medium text-[12px] whitespace-nowrap text-left">{tx.date}</td>
                        <td className="py-4 px-6 text-[13px] text-left">
                          <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)] ${tx.type === 'CASH_IN' || tx.type === 'Credit' ? 'bg-blue-500' : 'bg-yellow-500'}`}></div>
                            <span className="font-black text-[#04152d] tracking-tight">{tx.desc}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-black text-[#04152d] text-[15px] whitespace-nowrap text-left tracking-tighter">
                          {tx.type === 'CASH_OUT' || tx.type === 'Debit' ? '- ' : '+ '}₱{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6 font-mono text-[11px] text-blue-600 cursor-pointer hover:underline whitespace-nowrap text-left">
                          {tx.ref}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="py-24 text-center text-[#04152d]/40 font-black text-[11px] uppercase tracking-widest text-left">
                          No transactions recorded for this matrix.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </>
        )}
      </div>
    </div>
  );
}

export default function TreasurerDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7] text-[#04152d]">
        <Loader2 className="animate-spin w-10 h-10" />
      </div>
    }>
      <TreasurerDashboardContent />
    </Suspense>
  );
}