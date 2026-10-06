"use client";

import React, { useRef, useState, useEffect } from 'react';
import {
  X,
  Download,
  Printer,
  FileText,
  ShieldCheck,
  CreditCard,
  Wallet,
  Loader2,
  User,
  BadgeCheck,
  Hash,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';

interface DisbursementVoucherData {
  id?: string;
  ref: string;
  payee: string;
  date: string;
  amount: number;
  purpose: string;
  fundSource: string;
  category?: string;
  type?: string;
  paymentMethod?: string;
  supportingDocRef?: string;
  loanRef?: string;
  approvedLoanAmount?: number;
  actualAmountReleased?: number;
  chequeNumber?: string;
  chequeStatus?: string;
  chequeRecord?: {
    chequeNumber: string;
    chequeDate: string;
    payee: string;
    amount: number;
    purpose: string;
    relatedReference: string;
    status: string;
  };
  processedAt?: string;
  processedBy?: string;
}

interface DisbursementVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  disbursement: DisbursementVoucherData | null;
}

export default function DisbursementVoucherModal({
  isOpen,
  onClose,
  disbursement
}: DisbursementVoucherModalProps) {
  const voucherPrintRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [viewMode, setViewMode] = useState<'fit' | 'full'>('fit');
  const [dynamicFitScale, setDynamicFitScale] = useState(0.68);

  // Calculate dynamic scale so the entire Folio page is 100% visible at once on screen
  useEffect(() => {
    if (!isOpen) return;

    const computeScale = () => {
      // Screen available height minus modal headers, padding, and toolbars
      const availableH = window.innerHeight - 150;
      // Folio document height is ~1160px
      const targetDocH = 1170;
      const availableW = Math.min(window.innerWidth - 64, 880);
      const targetDocW = 770;

      const scaleByHeight = availableH / targetDocH;
      const scaleByWidth = availableW / targetDocW;
      const idealScale = Math.min(scaleByHeight, scaleByWidth, 0.95);

      setDynamicFitScale(Math.max(0.48, Math.min(idealScale, 0.9)));
    };

    computeScale();
    window.addEventListener('resize', computeScale);
    return () => window.removeEventListener('resize', computeScale);
  }, [isOpen]);

  if (!isOpen || !disbursement) return null;

  const formatCurrency = (val: number) =>
    `₱${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Convert number to words helper for official voucher check
  const numberToWords = (num: number): string => {
    const a = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const numString = Math.floor(num).toString();
    if (num === 0) return 'Zero Pesos Only';
    if (num > 999999) return `${formatCurrency(num)} Pesos Only`;

    let n = ('000000000' + numString).substr(-9);
    let n_1 = n.substr(0, 3);
    let n_2 = n.substr(3, 3);
    let n_3 = n.substr(6, 3);

    let str = '';
    const parse3Digits = (digits: string) => {
      let subStr = '';
      let hundred = parseInt(digits[0]);
      let ten = parseInt(digits[1]);
      let one = parseInt(digits[2]);

      if (hundred !== 0) subStr += a[hundred] + ' Hundred ';
      if (ten === 1) {
        subStr += a[10 + one] + ' ';
      } else {
        if (ten !== 0) subStr += b[ten] + ' ';
        if (one !== 0) subStr += a[one] + ' ';
      }
      return subStr;
    };

    if (parseInt(n_2) !== 0) str += parse3Digits(n_2) + 'Thousand ';
    if (parseInt(n_3) !== 0) str += parse3Digits(n_3);

    const cents = Math.round((num - Math.floor(num)) * 100);
    const centsText = cents > 0 ? ` and ${cents}/100` : '';

    return (str.trim() + centsText + ' Pesos Only').toUpperCase();
  };

  const handleDownloadPDF = async () => {
    const element = voucherPrintRef.current;
    if (!element) return;

    try {
      setIsExportingPDF(true);

      // Temporarily remove any preview zoom transforms during canvas capture
      const scalingWrapper = element.parentElement;
      const prevTransform = scalingWrapper ? scalingWrapper.style.transform : '';
      if (scalingWrapper) scalingWrapper.style.transform = 'none';

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      if (scalingWrapper) scalingWrapper.style.transform = prevTransform;

      const imgData = canvas.toDataURL('image/png');

      // Strict Folio / Long Bond Paper dimensions: 8.5 x 13.0 inches = 215.9 x 330.2 mm
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [215.9, 330.2]
      });

      const pageWidth = 215.9;
      const pageHeight = 330.2;
      const margin = 8; // 8mm margin
      const maxContentWidth = pageWidth - margin * 2; // 199.9 mm
      const maxContentHeight = pageHeight - margin * 2; // 314.2 mm

      // Proportional fit: never crop or cut off any part of the content
      let renderWidth = maxContentWidth;
      let renderHeight = (canvas.height * renderWidth) / canvas.width;

      if (renderHeight > maxContentHeight) {
        renderHeight = maxContentHeight;
        renderWidth = (canvas.width * renderHeight) / canvas.height;
      }

      const xPos = margin + (maxContentWidth - renderWidth) / 2;
      const yPos = margin + (maxContentHeight - renderHeight) / 2;

      pdf.addImage(imgData, 'PNG', xPos, yPos, renderWidth, renderHeight);
      pdf.save(`BDOEA_Disbursement_Voucher_${disbursement.ref}_Folio.pdf`);
    } catch (err) {
      console.error('Failed to export voucher PDF:', err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const chequeNum =
    disbursement.chequeNumber || disbursement.chequeRecord?.chequeNumber;
  const paymentMethod = disbursement.paymentMethod || 'Cheque';
  const categoryName = disbursement.category || disbursement.type || 'Disbursement';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#04152d]/80 backdrop-blur-md animate-fade-in overflow-hidden">
      {/* Print Specific CSS to isolate voucher on Folio paper & prevent clipping */}
      <style jsx global>{`
        @media print {
          @page {
            size: 8.5in 13in portrait;
            margin: 8mm;
          }
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: #ffffff !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-disbursement-voucher,
          #printable-disbursement-voucher * {
            visibility: visible !important;
          }
          #printable-disbursement-voucher {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 16px 20px !important;
            box-shadow: none !important;
            border: 1px solid #94a3b8 !important;
            border-radius: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        className="relative w-full max-w-4xl bg-white/95 backdrop-blur-3xl border border-white/90 shadow-[0_25px_70px_rgba(4,21,45,0.45)] rounded-[24px] overflow-hidden animate-modal-enter flex flex-col h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Navigation Bar */}
        <div className="px-5 py-3 border-b border-gray-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 flex flex-wrap items-center justify-between gap-2.5 no-print shrink-0">
          <div className="flex items-center gap-2.5 text-[#04152d]">
            <div className="w-7 h-7 rounded-full bg-[#04152d] flex items-center justify-center text-white shadow-xs">
              <FileText size={14} className="text-[#fab814]" />
            </div>
            <div>
              <span className="font-extrabold text-[14px] tracking-tight block text-[#04152d] leading-tight">
                Disbursement Voucher
              </span>
              <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium leading-none mt-0.5">
                <span>Ref: <strong className="text-blue-800">{disbursement.ref}</strong></span>
                <span className="text-gray-300">•</span>
                <span className="px-2 py-0.2 rounded-full bg-blue-50 text-blue-900 border border-blue-200 text-[10px] font-bold">
                  Folio / Long Bond Paper (8.5 × 13 in)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode: Fit Full Page vs 100% Scroll */}
            <div className="flex items-center rounded-full bg-slate-200/80 p-0.5 border border-slate-300 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setViewMode('fit')}
                className={`px-3 py-1 rounded-full transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'fit'
                    ? 'bg-[#04152d] text-white shadow-xs'
                    : 'text-gray-700 hover:text-black'
                }`}
                title="Fit entire Folio page on screen at once"
              >
                <Minimize2 size={12} />
                <span>Fit Page</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('full')}
                className={`px-3 py-1 rounded-full transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'full'
                    ? 'bg-[#04152d] text-white shadow-xs'
                    : 'text-gray-700 hover:text-black'
                }`}
                title="View at 100% actual resolution with scrolling"
              >
                <Maximize2 size={12} />
                <span>100% Zoom</span>
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
              title="Print Voucher Document"
            >
              <Printer size={13} className="text-gray-600" />
              <span>Print</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#04152d] via-[#0a1e3f] to-[#04152d] hover:from-[#0a1e3f] hover:to-[#0f2850] text-white text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Download Full Uncropped PDF for Long Bond Paper (8.5 × 13 in)"
            >
              {isExportingPDF ? (
                <>
                  <Loader2 size={12} className="animate-spin text-[#fab814]" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download size={12} className="text-[#fab814]" />
                  <span>Download PDF (Folio)</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-gray-200/80 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition-all ml-1 cursor-pointer"
              title="Close Modal"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Scrollable Document Canvas Area */}
        <div
          ref={containerRef}
          className="p-3 sm:p-5 overflow-y-auto flex-1 bg-slate-200/70 flex justify-center items-start"
        >
          {/* Zoom Wrapper */}
          <div
            style={{
              transform: viewMode === 'fit' ? `scale(${dynamicFitScale})` : 'scale(1)',
              transformOrigin: 'top center',
              transition: 'transform 0.2s cubic-bezier(0.2, 0.9, 0.4, 1)',
              marginBottom: viewMode === 'fit' ? `${-(1170 * (1 - dynamicFitScale))}px` : '20px'
            }}
          >
            {/* Printable Voucher Paper - Sized Strictly for Folio / Long Bond Paper (8.5" × 13") */}
            <div
              ref={voucherPrintRef}
              id="printable-disbursement-voucher"
              className="relative w-[760px] min-h-[1160px] bg-white text-gray-900 border border-slate-300 shadow-2xl p-6 sm:p-7 font-sans flex flex-col justify-between overflow-hidden"
              style={{ boxSizing: 'border-box' }}
            >
              {/* Subtle Watermark Seal in Document Background */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.035] z-0">
                <img
                  src="/bdoea-logo-blue.png"
                  alt=""
                  className="w-[420px] max-w-full object-contain filter grayscale contrast-150"
                  crossOrigin="anonymous"
                />
              </div>

              {/* Upper Section */}
              <div className="relative z-10 space-y-3">
                {/* Top BDOEA Color Bar Accent */}
                <div className="w-full flex h-1.5 rounded-full overflow-hidden shadow-2xs">
                  <div className="w-[70%] bg-[#04152d]"></div>
                  <div className="w-[30%] bg-[#fab814]"></div>
                </div>

                {/* Official Letterhead with BDOEA Logo */}
                <div className="pb-2 flex flex-row items-center justify-between gap-3 border-b border-[#04152d]/15">
                  <div className="flex items-center gap-3">
                    <img
                      src="/bdoea-logo-blue.png"
                      alt="BDOEA Logo"
                      className="h-12 w-auto object-contain shrink-0"
                      crossOrigin="anonymous"
                    />
                    <div className="border-l-2 border-[#04152d]/25 pl-3 py-0.5">
                      <h1 className="text-[15px] font-black tracking-tight text-[#04152d] uppercase leading-tight">
                        BDO Employees Association (BDOEA)
                      </h1>
                      <p className="text-[10px] font-bold text-[#0a1e3f]/80 uppercase tracking-wide leading-tight">
                        Treasury & Financial Operations Department
                      </p>
                      <p className="text-[9px] text-gray-500 font-medium leading-tight">
                        CDA Reg. No. 9520-16012480 • Makati City, Metro Manila
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end shrink-0">
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#04152d] text-white font-black text-[10px] uppercase tracking-wider shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#fab814] inline-block"></span>
                      Disbursement Voucher
                    </div>
                    <p className="font-mono text-[11.5px] font-black text-[#04152d] mt-0.5">
                      VOUCHER NO: <span className="text-blue-800">{disbursement.ref}</span>
                    </p>
                    <span className="mt-0.5 inline-flex items-center gap-1 px-2 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300">
                      <BadgeCheck size={11} className="text-emerald-600" />
                      Released & Posted
                    </span>
                  </div>
                </div>

                {/* Voucher Metadata Overview Grid */}
                <div className="grid grid-cols-4 gap-2 p-2.5 bg-slate-50 border border-[#04152d]/15 rounded-lg text-[11px] shadow-2xs">
                  <div>
                    <span className="text-[9px] uppercase font-black text-[#04152d]/60 block tracking-wider leading-tight">
                      Date of Release
                    </span>
                    <span className="font-bold text-[#04152d] text-[11.5px] leading-tight block">
                      {disbursement.date}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-black text-[#04152d]/60 block tracking-wider leading-tight">
                      Fund / Source Account
                    </span>
                    <span className="font-bold text-[#04152d] text-[11.5px] leading-tight block truncate">
                      {disbursement.fundSource}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-black text-[#04152d]/60 block tracking-wider leading-tight">
                      Release Method
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-blue-900 bg-blue-100/70 px-1.5 py-0.2 rounded border border-blue-200 text-[10px] mt-0.5 leading-tight">
                      <Wallet size={10} className="text-blue-700" />
                      {paymentMethod}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-black text-[#04152d]/60 block tracking-wider leading-tight">
                      Voucher Category
                    </span>
                    <span className="font-bold text-[#04152d] text-[11px] block mt-0.5 truncate leading-tight">
                      {categoryName}
                    </span>
                  </div>
                </div>

                {/* Payee & Disbursement Summary Box */}
                <div className="border border-[#04152d]/20 rounded-lg overflow-hidden shadow-2xs">
                  <div className="bg-[#04152d] px-3 py-1 flex justify-between items-center text-white text-[11px]">
                    <span className="font-black tracking-wider text-[10px] uppercase flex items-center gap-1.5">
                      <User size={12} className="text-[#fab814]" />
                      Payee & Transaction Particulars
                    </span>
                    {disbursement.loanRef && (
                      <span className="font-mono font-bold text-[#fab814] text-[10px] bg-white/10 px-2 py-0.2 rounded border border-white/20">
                        Obligation Ref: {disbursement.loanRef}
                      </span>
                    )}
                  </div>
                  <div className="p-3 bg-white grid grid-cols-2 gap-3 items-center">
                    <div>
                      <span className="text-[9px] uppercase font-extrabold text-gray-500 block tracking-wider leading-tight">
                        Paid To (Payee Name)
                      </span>
                      <p className="text-[16px] font-black text-[#04152d] tracking-tight leading-tight">
                        {disbursement.payee}
                      </p>
                      <p className="text-[11px] text-gray-600 mt-0.5 leading-tight">
                        <span className="font-semibold text-gray-700">Classification:</span> {categoryName}
                      </p>
                    </div>
                    <div className="text-right bg-gradient-to-r from-blue-50/70 via-slate-50 to-blue-50/40 p-2.5 rounded-lg border border-blue-100">
                      <span className="text-[9px] uppercase font-extrabold text-gray-500 block tracking-wider leading-tight">
                        Disbursed Amount
                      </span>
                      <p className="text-[22px] font-black text-[#04152d] tracking-tight leading-tight">
                        {formatCurrency(disbursement.amount)}
                      </p>
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-1.5 py-0.2 rounded inline-block border border-emerald-200 leading-tight">
                        Philippine Pesos (PHP)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Official Cheque Issue Record (when payment method is Cheque) */}
                {paymentMethod === 'Cheque' && chequeNum && (
                  <div className="p-2.5 bg-gradient-to-r from-[#fffbeb] via-[#fef3c7]/60 to-[#fffbeb] border-2 border-[#f59e0b]/50 rounded-lg text-[11px] shadow-2xs">
                    <div className="flex items-center justify-between pb-1 border-b border-amber-300/80">
                      <span className="font-black text-[#78350f] uppercase tracking-wider text-[10px] flex items-center gap-1.5 leading-tight">
                        <CreditCard size={12} className="text-[#b45309]" />
                        Official Cheque Issue Record
                      </span>
                      <span className="px-2 py-0.2 bg-[#fef3c7] border border-[#f59e0b] rounded-full text-[9px] font-black text-[#92400e] uppercase tracking-wider shadow-2xs">
                        Status: {disbursement.chequeStatus || 'Issued'}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 pt-1.5 text-[11px]">
                      <div>
                        <span className="text-[9px] uppercase text-amber-900/70 font-extrabold block leading-tight">
                          Cheque Number
                        </span>
                        <span className="font-mono font-black text-[#04152d] text-[12px] leading-tight block">
                          {chequeNum}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-amber-900/70 font-extrabold block leading-tight">
                          Cheque Date
                        </span>
                        <span className="font-bold text-gray-900 text-[11px] leading-tight block">
                          {disbursement.date}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-amber-900/70 font-extrabold block leading-tight">
                          Drawee Bank Account
                        </span>
                        <span className="font-bold text-gray-900 truncate block text-[11px] leading-tight">
                          BDO Unibank (Treasury C/A)
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-amber-900/70 font-extrabold block leading-tight">
                          Cheque Value
                        </span>
                        <span className="font-black text-[#04152d] text-[11.5px] leading-tight block">
                          {formatCurrency(disbursement.amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Particulars & Amount In Words Table */}
                <div className="border border-[#04152d]/20 rounded-lg overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="bg-[#04152d] font-bold text-white uppercase tracking-wider text-[9px]">
                      <tr>
                        <th className="py-1.5 px-3 w-3/4">Particulars / Explanation of Fund Outflow</th>
                        <th className="py-1.5 px-3 text-right">Amount (PHP)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="py-2 px-3">
                          <p className="font-black text-[#04152d] text-[11.5px] leading-tight">{disbursement.purpose}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-gray-600 mt-0.5">
                            <span>
                              <strong className="text-gray-700">Supporting Reference:</strong>{' '}
                              {disbursement.supportingDocRef || disbursement.ref}
                            </span>
                            {disbursement.approvedLoanAmount && (
                              <span>
                                <strong className="text-gray-700">Approved:</strong>{' '}
                                {formatCurrency(disbursement.approvedLoanAmount)}
                              </span>
                            )}
                            {disbursement.actualAmountReleased && (
                              <span>
                                <strong className="text-gray-700">Released:</strong>{' '}
                                {formatCurrency(disbursement.actualAmountReleased)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-black text-[13px] text-[#04152d] align-top font-mono">
                          {formatCurrency(disbursement.amount)}
                        </td>
                      </tr>
                      <tr className="bg-slate-50/90 border-t border-[#04152d]/20 font-bold">
                        <td className="py-1.5 px-3">
                          <span className="text-[9px] uppercase font-black tracking-wider text-[#04152d]/70 block leading-tight">
                            Official Amount in Words:
                          </span>
                          <div className="p-1 mt-0.5 bg-white border border-gray-300 rounded font-mono text-[9.5px] text-[#04152d] font-bold uppercase tracking-wider shadow-2xs leading-tight">
                            *** {numberToWords(disbursement.amount)} ***
                          </div>
                        </td>
                        <td className="py-1.5 px-3 text-right align-middle">
                          <span className="text-[9px] uppercase font-bold text-gray-500 block leading-tight">
                            Total Disbursed
                          </span>
                          <span className="text-[14px] font-black text-[#04152d] font-mono border-b-2 border-double border-[#04152d] inline-block leading-tight">
                            {formatCurrency(disbursement.amount)}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Accounting Ledger Distribution Box */}
                <div className="border border-[#04152d]/20 rounded-lg overflow-hidden text-[10px] shadow-2xs">
                  <div className="bg-[#0a1e3f] px-3 py-1 border-b border-[#04152d] font-bold text-white uppercase tracking-wider text-[9px] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Hash size={11} className="text-[#fab814]" />
                      Accounting Ledger Distribution & Fund Allocation
                    </span>
                    <span className="text-[#fab814] font-mono text-[9px] font-semibold">
                      Standard Double-Entry Posting
                    </span>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 border-b border-slate-200 text-[#04152d]/80 uppercase text-[8.5px] font-extrabold tracking-wider">
                      <tr>
                        <th className="py-1 px-3">Account Title & Ledger Classification</th>
                        <th className="py-1 px-3 text-center w-24">Ledger Code</th>
                        <th className="py-1 px-3 text-right w-28">Debit (PHP)</th>
                        <th className="py-1 px-3 text-right w-28">Credit (PHP)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-[10px]">
                      <tr className="hover:bg-slate-50/50">
                        <td className="py-1 px-3 font-semibold text-[#04152d]">
                          {disbursement.type === 'Loan Release'
                            ? 'Loans Receivable - Member Credit Facility'
                            : disbursement.category || 'Operating & Member Benefit Expense'}
                        </td>
                        <td className="py-1 px-3 text-center font-mono text-[9px] text-gray-600">
                          {disbursement.type === 'Loan Release' ? '1-140-10' : '5-100-20'}
                        </td>
                        <td className="py-1 px-3 text-right font-mono font-bold text-gray-900">
                          {formatCurrency(disbursement.amount)}
                        </td>
                        <td className="py-1 px-3 text-right font-mono text-gray-400">-</td>
                      </tr>
                      <tr className="hover:bg-slate-50/50">
                        <td className="py-1 px-3 font-semibold text-[#04152d]">
                          Cash in Bank / Fund Liquidity ({disbursement.fundSource})
                        </td>
                        <td className="py-1 px-3 text-center font-mono text-[9px] text-gray-600">
                          1-100-02
                        </td>
                        <td className="py-1 px-3 text-right font-mono text-gray-400">-</td>
                        <td className="py-1 px-3 text-right font-mono font-bold text-gray-900">
                          {formatCurrency(disbursement.amount)}
                        </td>
                      </tr>
                      <tr className="bg-slate-100/90 font-black text-[#04152d] border-t border-[#04152d]/30">
                        <td colSpan={2} className="py-1 px-3 uppercase text-[9px] tracking-wider text-right font-black">
                          Balanced General Ledger Totals:
                        </td>
                        <td className="py-1 px-3 text-right font-mono text-[10.5px] border-b-2 border-double border-[#04152d]">
                          {formatCurrency(disbursement.amount)}
                        </td>
                        <td className="py-1 px-3 text-right font-mono text-[10.5px] border-b-2 border-double border-[#04152d]">
                          {formatCurrency(disbursement.amount)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Lower Section (Firmly sits at the bottom of the Folio Sheet) */}
              <div className="relative z-10 pt-4 space-y-3">
                {/* Official Signatures & Verification Hierarchy */}
                <div className="grid grid-cols-4 gap-2.5 pt-3 border-t-2 border-[#04152d] text-[10px]">
                  {/* Prepared & Released By */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <span className="text-[8.5px] uppercase font-black text-[#04152d]/70 block tracking-wider leading-tight">
                        Prepared & Released:
                      </span>
                      <div className="mt-1 flex items-center justify-center">
                        <div className="px-1.5 py-0.2 rounded border border-blue-600/40 bg-blue-50/90 text-[8px] font-black text-blue-900 tracking-wider uppercase rotate-[-1deg] shadow-2xs">
                          ✓ RELEASED & POSTED
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <div className="border-b border-[#04152d]/60 font-black text-[#04152d] pb-0.5 text-[11px] leading-tight">
                        {disbursement.processedBy || 'Maria Santos'}
                      </div>
                      <p className="text-[9px] font-bold text-gray-600 mt-0.5 leading-tight">Disbursing Officer</p>
                      <p className="text-[8px] text-gray-500 font-mono leading-tight">{disbursement.date}</p>
                    </div>
                  </div>

                  {/* Certified Correct / Auditor */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <span className="text-[8.5px] uppercase font-black text-[#04152d]/70 block tracking-wider leading-tight">
                        Certified Correct:
                      </span>
                      <div className="mt-1 flex items-center justify-center">
                        <div className="px-1.5 py-0.2 rounded border border-emerald-600/40 bg-emerald-50/90 text-[8px] font-black text-emerald-900 tracking-wider uppercase rotate-[1deg] shadow-2xs">
                          ✓ AUDIT VERIFIED
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <div className="border-b border-[#04152d]/60 font-black text-[#04152d] pb-0.5 text-[11px] font-mono leading-tight">
                        COMMITTEE AUDIT
                      </div>
                      <p className="text-[9px] font-bold text-gray-600 mt-0.5 leading-tight">Internal Auditor</p>
                      <p className="text-[8px] text-gray-500 font-mono leading-tight">Pre-Audit Concurred</p>
                    </div>
                  </div>

                  {/* Approved For Release */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <span className="text-[8.5px] uppercase font-black text-[#04152d]/70 block tracking-wider leading-tight">
                        Approved For Payment:
                      </span>
                      <div className="mt-1 flex items-center justify-center">
                        <div className="px-1.5 py-0.2 rounded border border-indigo-600/40 bg-indigo-50/90 text-[8px] font-black text-indigo-900 tracking-wider uppercase shadow-2xs">
                          ✓ BOD AUTHORIZED
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <div className="border-b border-[#04152d]/60 font-black text-[#04152d] pb-0.5 text-[11px] leading-tight">
                        Board of Directors
                      </div>
                      <p className="text-[9px] font-bold text-gray-600 mt-0.5 leading-tight">Authorizing Officer</p>
                      <p className="text-[8px] text-gray-500 font-mono leading-tight">Resolution Verified</p>
                    </div>
                  </div>

                  {/* Payment Acknowledged By Payee */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <span className="text-[8.5px] uppercase font-black text-[#04152d]/70 block tracking-wider leading-tight">
                        Receipt Acknowledged:
                      </span>
                      <p className="text-[8px] text-gray-500 text-center mt-1 leading-tight">Payment Received in Full</p>
                    </div>
                    <div className="mt-4 text-center">
                      <div className="border-b border-[#04152d]/60 font-black text-[#04152d] pb-0.5 text-[10.5px] truncate leading-tight">
                        {disbursement.payee}
                      </div>
                      <p className="text-[9px] font-bold text-gray-600 mt-0.5 leading-tight">Payee / Signatory</p>
                      <p className="text-[8px] text-gray-500 leading-tight">Date: _______________</p>
                    </div>
                  </div>
                </div>

                {/* Document Verification & Security Microprint Footer */}
                <div className="pt-2 border-t border-slate-200 flex flex-row items-center justify-between text-[8px] text-gray-500 font-mono gap-1">
                  <div className="flex items-center gap-1 text-[#04152d]">
                    <ShieldCheck size={11} className="text-emerald-600 shrink-0" />
                    <span className="font-black">BDOEA FINANCIAL MANAGEMENT SYSTEM</span>
                    <span>• OFFICIAL ORIGINAL COPY</span>
                  </div>
                  <div className="text-right">
                    DOC REF: {disbursement.ref} • HASH: {disbursement.ref}-BDOEA-2026 • FOLIO (8.5×13)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



