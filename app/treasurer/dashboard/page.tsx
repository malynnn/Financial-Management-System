"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Wallet, ShieldCheck, ShieldAlert, Loader2, ChevronDown, PieChart as PieChartIcon,
  TrendingUp, TrendingDown, Minus, LineChart, Sparkles, History, BellRing, Maximize2, 
  ArrowRightLeft, BrainCircuit, RefreshCw, FileText, AlertTriangle, Search, Calendar, ChevronLeft, ChevronRight, SearchX
} from 'lucide-react';
import { 
  PieChart, Pie, Tooltip as ChartTooltip, ResponsiveContainer, Legend, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, LineChart as RechartsLineChart, Line
} from 'recharts';
import Header from '@/components/Header';
import RecommendationModal from '@/components/dashboard/RecommendationModal';
import AuditLogModal from '@/components/dashboard/AuditLogModal';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';

// mock data
const MOCK_FUNDS = [
  { id: '1', name: 'General Fund', balance: 250000 },
  { id: '2', name: 'Emergency Fund', balance: 75000 },
  { id: '3', name: 'Events Fund', balance: 45000 }
];

const MOCK_LEDGER = Array.from({ length: 45 }).map((_, i) => ({
  id: `tx${i}`, 
  fundId: (i % 3 + 1).toString(), 
  date: new Date(Date.now() - (i * 86400000)).toISOString().split('T')[0], 
  desc: i % 2 === 0 ? 'Member Dues Collection' : 'Office Supplies', 
  amount: (i * 500) + 1000, 
  type: i % 2 === 0 ? 'CASH_IN' : 'CASH_OUT', 
  ref: `REF-00${i + 1}`
}));

const MOCK_ANALYTICS = {
  summary: { total_balance: 370000, net_flow: 12500, total_deposits: 45000, total_withdrawals: 30000, total_loans: 2500 },
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
      { date: 'Aug 25', cumulative: 340000 }, { date: 'Aug 26', cumulative: 350000 },
      { date: 'Aug 27', cumulative: 345000 }, { date: 'Aug 28', cumulative: 360000 },
      { date: 'Aug 29', cumulative: 365000 }, { date: 'Aug 30', cumulative: 370000 }
    ],
    forecast_timeline: [
      { month: 'Sep', projected_assets: 375000, upper_bound: 390000, lower_bound: 360000 },
      { month: 'Oct', projected_assets: 382000, upper_bound: 405000, lower_bound: 365000 },
      { month: 'Nov', projected_assets: 395000, upper_bound: 420000, lower_bound: 370000 },
      { month: 'Dec', projected_assets: 410000, upper_bound: 440000, lower_bound: 385000 }
    ]
  }
};

const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#6366f1', '#ec4899'];
const ITEMS_PER_PAGE = 10;

const CustomAreaTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-xl border border-white p-4 rounded-[16px] shadow-[0_12px_40px_rgba(4,21,45,0.15)] min-w-[200px]">
        <p className="text-[13px] font-bold text-[#04152d] border-b border-[#04152d]/10 pb-2 mb-3">Date: {label}</p>
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-2 text-[12px] font-semibold text-[#04152d]/70">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            Cumulative Assets
          </span>
          <span className="text-[13px] font-bold text-[#04152d]">₱{payload[0].value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomLineTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-xl border border-white p-4 rounded-[16px] shadow-[0_12px_40px_rgba(4,21,45,0.15)] min-w-[220px]">
        <p className="text-[13px] font-bold text-[#04152d] border-b border-[#04152d]/10 pb-2 mb-3">Period: {label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-6 mb-2 last:mb-0">
            <span className="flex items-center gap-2 text-[12px] font-semibold text-[#04152d]/70">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="text-[13px] font-bold text-[#04152d]">₱{entry.value.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-xl border border-white p-4 rounded-[16px] shadow-[0_12px_40px_rgba(4,21,45,0.15)] min-w-[200px]">
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold text-[#04152d]/60 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: payload[0].payload.fill }} />
            {payload[0].name}
          </p>
          <p className="text-[18px] font-bold text-[#04152d] tracking-tight">₱{payload[0].value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>
    );
  }
  return null;
};

export default function TreasurerDashboardPage() {
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  
  const [selectedForecastFund, setSelectedForecastFund] = useState('All');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [printDate, setPrintDate] = useState<string>('');

  const [isRecModalOpen, setIsRecModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  const [selectedFund, setSelectedFund] = useState<any>(MOCK_FUNDS[0]);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setPrintDate(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    setLastRefreshed(new Date());
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedFund, startDate, endDate]);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1e6) return `₱${(value / 1e6).toFixed(1)}M`;
    if (Math.abs(value) >= 1e3) return `₱${(value / 1e3).toFixed(0)}K`;
    return `₱${value}`;
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
    return MOCK_FUNDS.filter(f => f.balance > 0).map((f, index) => ({
      name: f.name,
      value: f.balance,
      fill: CHART_COLORS[index % CHART_COLORS.length]
    }));
  }, []);

  const balanceChartData = useMemo(() => MOCK_ANALYTICS.trends.daily_flow, []);
  
  const forecastTimelineData = useMemo(() => {
    const baseTimeline = MOCK_ANALYTICS.trends.forecast_timeline;
    if (selectedForecastFund === 'All') return baseTimeline;

    const fundData = MOCK_FUNDS.find(f => f.name === selectedForecastFund);
    if (!fundData) return baseTimeline;

    const totalBalance = MOCK_ANALYTICS.summary.total_balance;
    const fundShare = fundData.balance / totalBalance;

    return baseTimeline.map((pt: any) => ({
      month: pt.month,
      projected_assets: pt.projected_assets * fundShare,
      lower_bound: pt.lower_bound * fundShare,
      upper_bound: pt.upper_bound * fundShare
    }));
  }, [selectedForecastFund]);

  const filteredTransactions = useMemo(() => {
    let txs = selectedFund ? MOCK_LEDGER.filter(tx => tx.fundId === selectedFund.id) : [];
    
    if (debouncedSearch) {
      txs = txs.filter(tx => 
        tx.ref.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
        tx.desc.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }

    if (startDate || endDate) {
      txs = txs.filter(tx => {
        const txDate = new Date(tx.date).getTime();
        const sTime = startDate ? new Date(startDate).getTime() : 0;
        const eTime = endDate ? new Date(endDate).getTime() : Infinity;
        return txDate >= sTime && txDate <= eTime;
      });
    }

    return txs;
  }, [debouncedSearch, selectedFund, startDate, endDate]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE) || 1;
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getPageNumbers = () => {
    const maxVisible = 5;
    const pages = [];
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) pages.push(1, 2, 3, 4, '...', totalPages);
      else if (currentPage > totalPages - 3) pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      else pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  const ultraGlassCard = "bg-white/50 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/80 shadow-[0_8px_30px_rgba(4,21,45,0.06),inset_0_2px_3px_rgba(255,255,255,0.9)] rounded-[24px] p-5 md:p-6 relative overflow-hidden transition-all duration-400";
  const iconBtn = "flex items-center justify-center bg-white/70 hover:bg-white/90 backdrop-blur-md border border-white/80 shadow-[0_2px_8px_rgba(4,21,45,0.04),inset_0_1px_2px_rgba(255,255,255,0.8)] hover:shadow-[0_4px_12px_rgba(4,21,45,0.08),inset_0_1px_2px_rgba(255,255,255,1)] rounded-full transition-all duration-300 active:scale-90 text-[#04152d]/60 hover:text-[#04152d]";
  const pillBtn = "px-5 py-2.5 bg-white/70 hover:bg-white/90 backdrop-blur-xl backdrop-saturate-[180%] border border-white/80 shadow-[0_4px_14px_rgba(4,21,45,0.06),inset_0_1px_2px_rgba(255,255,255,1)] hover:shadow-[0_8px_20px_rgba(4,21,45,0.1),inset_0_1px_2px_rgba(255,255,255,1)] hover:-translate-y-0.5 active:scale-95 rounded-full text-[13px] font-semibold text-[#04152d] transition-all duration-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:hover:translate-y-0";
  const glassInput = "pl-4 pr-8 py-2.5 bg-white/60 hover:bg-white/80 focus:bg-white/90 backdrop-blur-xl border border-white/90 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] rounded-[12px] text-[13px] font-semibold text-[#04152d] outline-none transition-all duration-300";
  const pageBtn = "w-8 h-8 flex items-center justify-center rounded-full text-[12px] font-medium transition-all duration-300";

  const renderRecommendationFormat = (rec: any) => {
    const text = rec.description;
    const lines = text.split('\n').filter((line: string) => line.trim().length > 0);
    const elements: React.ReactNode[] = [];
    
    lines.forEach((line: string, i: number) => {
      if (line.startsWith('- ')) {
        elements.push(<li key={i} className="ml-4 list-disc text-[12.5px] font-medium text-[#04152d]/80">{line.replace('- ', '')}</li>);
      } else {
        const parts = line.split(/(\*\*.*?\*\*)/g);
        const formatted = parts.map((part, pI) => {
          if (part.startsWith('**') && part.endsWith('**')) return <strong key={pI} className="font-bold text-[#04152d]">{part.slice(2, -2)}</strong>;
          return part;
        });
        elements.push(<p key={i} className="text-[12.5px] font-medium text-[#04152d]/80 mb-1">{formatted}</p>);
      }
    });

    return <div className="mt-2 line-clamp-3 overflow-hidden">{elements}</div>;
  };

  return (
    <div className="relative flex flex-col min-h-screen bg-[#f4f5f7]">
      
      <style jsx global>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Hidden PDF Layout */}
      <div id="printable-pdf-report" style={{ display: 'none' }} className="absolute left-[-9999px] top-0 w-[850px] bg-white text-black p-10 font-sans shadow-none">
        <div className="border-b-2 border-[#04152d] pb-4 mb-6">
          <h1 className="text-3xl font-bold text-[#04152d]">Financial Forecasting & Analytics Report</h1>
          <p className="text-sm font-semibold text-gray-500 mt-2">Generated on: {printDate}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500 uppercase font-semibold tracking-widest">Total Net Assets</p>
            <p className="text-xl font-bold text-[#04152d]">₱{MOCK_ANALYTICS.summary.total_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500 uppercase font-semibold tracking-widest">Net Cash Flow</p>
            <p className="text-xl font-bold text-[#04152d]">₱{MOCK_ANALYTICS.summary.net_flow.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <h2 className="text-lg font-bold text-[#04152d] mb-3 border-b border-gray-200 pb-2">AI Fund Forecasts</h2>
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
            {MOCK_ANALYTICS.forecasts.map((f: any, i: number) => (
              <tr key={i}>
                <td className="p-3 border border-gray-200 font-semibold">{f.fund}</td>
                <td className="p-3 border border-gray-200">₱{f.projected_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td className="p-3 border border-gray-200 uppercase">{f.trend}</td>
                <td className="p-3 border border-gray-200">{f.confidence}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="text-lg font-bold text-[#04152d] mb-3 border-b border-gray-200 pb-2">AI Strategic Recommendations</h2>
        <div className="space-y-4 mb-8 text-sm">
          {MOCK_ANALYTICS.recommendations.map((r: any) => (
            <div key={r.id} className="p-3 bg-gray-50 border border-gray-200 rounded">
              <p className="font-semibold text-[#04152d] mb-1">{r.title} ({r.type.toUpperCase()})</p>
              <p className="text-gray-700">{r.description}</p>
            </div>
          ))}
        </div>
      </div>

      <RecommendationModal 
        isOpen={isRecModalOpen} 
        onClose={() => setIsRecModalOpen(false)} 
        recommendations={MOCK_ANALYTICS.recommendations} 
      />
      <AuditLogModal 
        isOpen={isAuditModalOpen} 
        onClose={() => setIsAuditModalOpen(false)} 
        auditLogs={MOCK_ANALYTICS.audit_logs} 
      />

      <div className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-white/30 border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <Header />
      </div>

      <div className="p-4 md:p-6 max-w-[1600px] w-full mx-auto space-y-6 animate-fade-in flex-1 relative z-10 mt-2">
        
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${ultraGlassCard}`}>
          <div>
            <h2 className="text-[20px] font-bold tracking-tight text-[#04152d] flex items-center gap-2">
              <TrendingUp size={24} className="text-blue-600" /> Dashboard Analytics
            </h2>
            <p className="text-[12px] font-medium text-[#04152d]/60 mt-1">
              {lastRefreshed ? `Last synchronization: ${lastRefreshed.toLocaleTimeString('en-US', { timeZone: 'Asia/Manila' })} (PHT)` : 'Synthesized parameters derived from validated data.'}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.location.reload()} className={pillBtn}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={exportPDFReport} disabled={isExportingPDF} className={`${pillBtn} !bg-gradient-to-b !from-[#0a1e3f] !to-[#04152d] !text-white hover:!from-[#0f2850] hover:!to-[#061a38] !border-[#04152d]`}>
              {isExportingPDF ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} Export PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className={`${ultraGlassCard} !p-5 flex flex-col xl:flex-row items-start xl:items-center gap-4 group hover:-translate-y-1`}>
            <div className="w-12 h-12 bg-white/90 rounded-[16px] flex items-center justify-center shrink-0 border border-white shadow-sm">
              <Wallet className="text-blue-600" size={22} />
            </div>
            <div className="min-w-0 w-full">
              <span className="block text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest truncate">Total Net Assets</span>
              <p className="text-xl lg:text-2xl font-bold text-[#04152d] tracking-tighter mt-0.5 truncate">
                ₱{MOCK_ANALYTICS.summary.total_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className={`${ultraGlassCard} !p-5 flex flex-col xl:flex-row items-start xl:items-center gap-4 group hover:-translate-y-1`}>
            <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center shrink-0 border border-white shadow-sm ${MOCK_ANALYTICS.summary.net_flow >= 0 ? 'bg-blue-50' : 'bg-yellow-50'}`}>
              <ArrowRightLeft className={MOCK_ANALYTICS.summary.net_flow >= 0 ? 'text-blue-600' : 'text-yellow-600'} size={22} />
            </div>
            <div className="min-w-0 w-full">
              <span className="block text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest truncate">Net Cash Flow</span>
              <p className={`text-xl lg:text-2xl font-bold tracking-tighter mt-0.5 truncate ${MOCK_ANALYTICS.summary.net_flow >= 0 ? 'text-blue-600' : 'text-yellow-600'}`}>
                {MOCK_ANALYTICS.summary.net_flow >= 0 ? '+' : ''} ₱{MOCK_ANALYTICS.summary.net_flow.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className={`${ultraGlassCard} !p-5 flex flex-col xl:flex-row items-start xl:items-center gap-4 group hover:-translate-y-1`}>
            <div className="w-12 h-12 bg-white/90 rounded-[16px] flex items-center justify-center shrink-0 border border-white shadow-sm">
              <TrendingUp className="text-emerald-500" size={22} />
            </div>
            <div className="min-w-0 w-full">
              <span className="block text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest truncate">Total Inflows</span>
              <p className="text-xl lg:text-2xl font-bold text-emerald-600 tracking-tighter mt-0.5 truncate">
                ₱{MOCK_ANALYTICS.summary.total_deposits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className={`${ultraGlassCard} !p-5 flex flex-col xl:flex-row items-start xl:items-center gap-4 group hover:-translate-y-1`}>
            <div className="w-12 h-12 bg-white/90 rounded-[16px] flex items-center justify-center shrink-0 border border-white shadow-sm">
              <TrendingDown className="text-yellow-600" size={22} />
            </div>
            <div className="min-w-0 w-full">
              <span className="block text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest truncate">Total Outflows</span>
              <p className="text-xl lg:text-2xl font-bold text-yellow-600 tracking-tighter mt-0.5 truncate">
                ₱{(MOCK_ANALYTICS.summary.total_withdrawals + MOCK_ANALYTICS.summary.total_loans).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            
            {MOCK_ANALYTICS.shortage_alerts && MOCK_ANALYTICS.shortage_alerts.length > 0 && (
              <div className={`${ultraGlassCard} !border-yellow-300/60 !shadow-[0_12px_32px_rgba(234,179,8,0.1),inset_0_2px_4px_rgba(255,255,255,1)]`}>
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <BellRing size={120} className="text-yellow-600" />
                </div>
                <h3 className="text-[14px] font-bold text-[#04152d] tracking-tight uppercase tracking-[0.15em] border-b border-white/60 pb-3 mb-4 flex items-center gap-2 relative z-10">
                  <BellRing size={18} className="text-yellow-600" /> Projected Shortage Alerts
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                  {MOCK_ANALYTICS.shortage_alerts.map((alert: any) => (
                    <div key={alert.id} className="bg-white/70 backdrop-blur-md border border-white rounded-[16px] p-4 shadow-sm flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-yellow-100/80 flex items-center justify-center shrink-0 border border-yellow-200">
                        <AlertTriangle size={18} className="text-yellow-600" />
                      </div>
                      <div>
                        <h4 className="text-[14px] font-bold text-[#04152d] tracking-tight">{alert.fund} Shortfall Predicted</h4>
                        <p className="text-[12px] font-medium text-[#04152d]/70 mt-1">
                          Estimated deficit of <span className="text-yellow-600 font-bold">₱{alert.shortfall_amount.toLocaleString()}</span> by <span className="font-mono bg-white/60 px-1 rounded">{new Date(alert.predicted_date).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={ultraGlassCard}>
              <h3 className="text-[14px] font-bold text-[#04152d] tracking-tight uppercase tracking-widest border-b border-white/60 pb-3 mb-5 flex items-center gap-2">
                <BrainCircuit size={18} className="text-blue-500" /> AI Fund Forecast Insights
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {MOCK_ANALYTICS.forecasts.map((forecast: any, i: number) => (
                  <div key={i} className="bg-white/40 backdrop-blur-md border border-white/60 rounded-[20px] p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[13px] font-bold text-[#04152d]">{forecast.fund}</span>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-sm ${
                        forecast.trend === 'up' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                        forecast.trend === 'down' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                        'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>
                        {forecast.trend === 'up' ? <TrendingUp size={14} /> : forecast.trend === 'down' ? <TrendingDown size={14} /> : <Minus size={14} />}
                      </div>
                    </div>
                    <span className="block text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest mb-1">Projected Balance</span>
                    <p className={`text-2xl font-bold tracking-tighter ${forecast.trend === 'up' ? 'text-blue-600' : forecast.trend === 'down' ? 'text-yellow-600' : 'text-[#04152d]'}`}>
                      {formatCurrency(forecast.projected_balance)}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-[#04152d]/50">
                      <div className="h-1.5 flex-1 bg-white/50 rounded-full overflow-hidden border border-white/60">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${forecast.confidence}%` }} />
                      </div>
                      <span className="shrink-0">{forecast.confidence}% Confidence</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={ultraGlassCard}>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-white/60 pb-3 mb-5 gap-3">
                <h3 className="text-[14px] font-bold text-[#04152d] tracking-tight uppercase tracking-widest flex items-center gap-2">
                  <LineChart size={18} className="text-blue-500" /> 6-Month Predictive Trajectory
                </h3>
                <div className="relative inline-block w-full sm:w-auto">
                  <select
                    value={selectedForecastFund}
                    onChange={(e) => setSelectedForecastFund(e.target.value)}
                    className={`${glassInput} w-full sm:w-auto appearance-none cursor-pointer`}
                  >
                    {['All', ...MOCK_FUNDS.map(f => f.name)].map(opt => (
                      <option key={opt} value={opt}>{opt} Forecast</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#04152d]/50">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>

              <div className="h-72 sm:h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={forecastTimelineData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(4,21,45,0.08)" />
                    <XAxis dataKey="month" stroke="#04152d" opacity={0.5} fontSize={11} tickLine={false} fontWeight="bold" />
                    <YAxis stroke="#04152d" opacity={0.5} fontSize={11} tickLine={false} fontWeight="bold" tickFormatter={formatCurrency} />
                    <ChartTooltip content={<CustomLineTooltip />} cursor={{ stroke: 'rgba(4,21,45,0.1)', strokeWidth: 2, strokeDasharray: '4 4' }} />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', opacity: 0.7 }} />
                    <Line type="monotone" dataKey="upper_bound" name="Optimistic" stroke="#93c5fd" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    <Line type="monotone" dataKey="projected_assets" name="Projected" stroke="#2563eb" strokeWidth={4} activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }} />
                    <Line type="monotone" dataKey="lower_bound" name="Conservative" stroke="#fcd34d" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={ultraGlassCard}>
              <h3 className="text-[13px] font-bold text-[#04152d] tracking-tight uppercase tracking-widest border-b border-white/60 pb-3 mb-5">
                Historical Baseline (Running Cumulative)
              </h3>
              <div className="h-64 sm:h-80 w-full">
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
                    <ChartTooltip content={<CustomAreaTooltip />} cursor={{ stroke: 'rgba(4,21,45,0.1)', strokeWidth: 2, strokeDasharray: '4 4' }} />
                    <Area type="monotone" dataKey="cumulative" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorCumulative)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          <div className="xl:col-span-1 space-y-6">
            
            <div className={ultraGlassCard}>
              <h3 className="text-[14px] font-bold text-[#04152d] tracking-tight uppercase tracking-widest border-b border-white/60 pb-3 mb-5 flex items-center gap-2">
                <PieChartIcon size={18} className="text-blue-500" /> Current Asset Allocation
              </h3>
              <div className="h-[300px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <PieChart>
                    <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={65} outerRadius={90} paddingAngle={4}>
                      {pieChartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} stroke="rgba(255,255,255,0.6)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<CustomPieTooltip />} />
                    <Legend verticalAlign="bottom" align="center" height={80} iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#04152d', paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={`${ultraGlassCard} flex flex-col`}>
              <div className="flex items-center justify-between border-b border-white/60 pb-4 mb-5">
                <h3 className="text-[14px] font-bold text-[#04152d] tracking-tight uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={18} className="text-yellow-500" /> AI Recommendations
                </h3>
                <button onClick={() => setIsRecModalOpen(true)} className={`${iconBtn} w-8 h-8`} title="Expand Reports">
                  <Maximize2 size={14} />
                </button>
              </div>
              <div className="space-y-4 flex-1 overflow-hidden relative">
                {MOCK_ANALYTICS.recommendations.slice(0, 3).map((rec: any) => (
                  <div key={rec.id} className="bg-white/60 backdrop-blur-md border border-white/90 p-5 rounded-[20px] shadow-sm">
                    <div className="flex items-center gap-2.5 mb-2.5">
                      {rec.type === 'critical' || rec.type === 'warning' ? <ShieldAlert size={16} className="text-yellow-600" /> : <ShieldCheck size={16} className="text-blue-600" />}
                      <span className="text-[13.5px] font-bold text-[#04152d] truncate">{rec.title}</span>
                    </div>
                    {renderRecommendationFormat(rec)}
                    <div className="mt-3">
                      <span className="text-[10px] font-semibold text-[#04152d]/50 font-mono bg-white/50 px-2.5 py-1 rounded-md border border-white/60 inline-block">
                        {new Date(rec.timestamp).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white/40 to-transparent pointer-events-none" />
              </div>
              <button onClick={() => setIsRecModalOpen(true)} className="w-full mt-4 py-3 text-[11.5px] font-bold text-[#04152d]/60 uppercase tracking-widest hover:text-[#04152d] hover:bg-white/40 rounded-xl transition-colors">
                View All
              </button>
            </div>
          </div>
        </div>

        <div className={`!p-0 overflow-hidden flex flex-col ${ultraGlassCard}`}>
          <div className="p-4 md:p-5 border-b border-white/60 bg-white/40 flex flex-col xl:flex-row gap-4 items-center justify-between">
            <div>
              <div className="relative inline-block w-full sm:w-auto">
                <select
                  value={selectedFund?.id || ''}
                  onChange={(e) => {
                    const target = MOCK_FUNDS.find(f => f.id === e.target.value);
                    if (target) setSelectedFund(target);
                  }}
                  className={`${glassInput} w-full appearance-none cursor-pointer font-bold`}
                >
                  {MOCK_FUNDS.map((fund) => (
                    <option key={fund.id} value={fund.id}>{fund.name} Ledger Matrix</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#04152d]/50 pointer-events-none" />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row w-full xl:w-auto gap-3 items-center">
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#04152d]/50" />
                <input type="text" placeholder="Search Matrix Ref or Detail..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className={`${glassInput} w-full`} />
              </div>
              <div className="flex items-center justify-between gap-2 w-full sm:w-auto bg-white/60 border border-white/90 rounded-[12px] px-3 h-[38px] shadow-sm">
                <Calendar size={14} className="text-[#04152d]/50 shrink-0" />
                <input type="date" value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-[12px] font-semibold text-[#04152d] outline-none w-28 [&::-webkit-calendar-picker-indicator]:opacity-50 cursor-pointer" />
                <span className="text-[#04152d]/30">-</span>
                <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-[12px] font-semibold text-[#04152d] outline-none w-28 [&::-webkit-calendar-picker-indicator]:opacity-50 cursor-pointer" />
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left whitespace-nowrap min-w-[700px] border-collapse">
              <thead className="bg-white/60 backdrop-blur-2xl shadow-[0_1px_0_rgba(255,255,255,1)] text-[10px] font-bold text-[#04152d]/50 uppercase tracking-[0.2em]">
                <tr>
                  <th className="py-4 px-6 border-b border-white/50">Date</th>
                  <th className="py-4 px-6 border-b border-white/50">Transaction Detail</th>
                  <th className="py-4 px-6 border-b border-white/50 text-right">Amount</th>
                  <th className="py-4 px-6 border-b border-white/50 text-right">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/60 text-[13px] font-semibold text-[#04152d] bg-white/30">
                {paginatedTransactions.length > 0 ? paginatedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/70 transition-colors duration-300">
                    <td className="py-4 px-6 text-[#04152d]/60 font-medium text-[12px] whitespace-nowrap">{tx.date}</td>
                    <td className="py-4 px-6 text-[13px]">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tx.type === 'CASH_IN' ? 'bg-blue-500' : 'bg-yellow-500'}`}></div>
                        <span className="font-bold text-[#04152d] tracking-tight">{tx.desc}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-bold text-[#04152d] text-[14px] whitespace-nowrap text-right tracking-tight">
                      {tx.type === 'CASH_OUT' ? '- ' : '+ '}₱{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 font-mono text-[11px] text-blue-600 text-right cursor-pointer hover:underline whitespace-nowrap">
                      {tx.ref}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-16 h-16 bg-white/60 border border-white rounded-full flex items-center justify-center shadow-sm">
                          <SearchX size={28} className="text-[#04152d]/30" />
                        </div>
                        <div>
                          <p className="text-[14px] font-bold text-[#04152d] tracking-tight">No ledger entries found</p>
                          <p className="text-[12px] font-medium text-[#04152d]/50 mt-0.5">Try adjusting your date range or search terms.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-white/60 bg-white/40 flex items-center justify-between">
              <p className="text-[12px] text-[#04152d]/60 font-medium hidden sm:block">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} of {filteredTransactions.length} entries
              </p>
              <div className="flex items-center gap-1 mx-auto sm:mx-0">
                <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className={`${pageBtn} bg-white/60 border border-white hover:bg-white shadow-sm disabled:opacity-50`}><ChevronLeft size={16} /></button>
                {getPageNumbers().map((pageNum, idx) => (
                  <button key={idx} onClick={() => typeof pageNum === 'number' ? setCurrentPage(pageNum) : null} disabled={pageNum === '...'} className={`${pageBtn} ${pageNum === currentPage ? 'bg-[#04152d] text-white shadow-md' : 'bg-transparent text-[#04152d]/70 hover:bg-white/60'}`}>
                    {pageNum}
                  </button>
                ))}
                <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className={`${pageBtn} bg-white/60 border border-white hover:bg-white shadow-sm disabled:opacity-50`}><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}