"use client";

import React from 'react';
import { X, Sparkles, ShieldAlert, ShieldCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  recommendations: any[];
}

export default function RecommendationModal({ isOpen, onClose, recommendations }: Props) {
  if (!isOpen) return null;

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

  const ultraGlassCard = "bg-white/80 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/90 shadow-[0_16px_40px_rgba(4,21,45,0.1),inset_0_2px_4px_rgba(255,255,255,1)] rounded-[24px] p-6 lg:p-8 relative overflow-hidden transition-all duration-400";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 transition-opacity duration-300 opacity-100">
      <div className="absolute inset-0 bg-[#04152d]/40 backdrop-blur-md" onClick={onClose} />
      <div className={`relative w-full max-w-3xl max-h-[90vh] flex flex-col animate-modal-enter ${ultraGlassCard}`}>
        <div className="flex items-center justify-between border-b border-white/60 pb-4 mb-5 shrink-0">
          <h3 className="text-[18px] font-bold text-[#04152d] tracking-tight flex items-center gap-2">
            <Sparkles size={20} className="text-yellow-500" /> Full Recommendation History
          </h3>
          <button onClick={onClose} className="p-2 bg-white/50 hover:bg-white/80 rounded-full border border-white shadow-sm transition-colors outline-none">
            <X size={16} className="text-[#04152d]/60 hover:text-[#04152d]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto hide-scrollbar space-y-4 pr-2">
          {recommendations.length ? (
            recommendations.map((rec: any) => (
              <div key={rec.id} className="bg-white/50 backdrop-blur-md border border-white/80 p-5 rounded-[20px] shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] hover:bg-white/70 transition-colors duration-300">
                <div className="flex items-center gap-2.5 mb-2">
                  {rec.type === 'critical' || rec.type === 'warning' ? <ShieldAlert size={16} className="text-yellow-600" /> : <ShieldCheck size={16} className="text-blue-600" />}
                  <span className="text-[14px] font-bold text-[#04152d]">{rec.title}</span>
                  <span className="ml-auto text-[10.5px] font-semibold text-[#04152d]/50 font-mono bg-white/60 px-2.5 py-1 rounded-md border border-white/80 shrink-0">
                    {new Date(rec.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {formatAIRecommendation(rec.description)}
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-[#04152d]/50 font-semibold text-[13px]">No historical recommendations available.</div>
          )}
        </div>
      </div>
    </div>
  );
}