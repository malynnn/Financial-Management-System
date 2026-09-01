"use client";

export const dynamic = 'force-dynamic';

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2, CheckCircle2, Lock, User } from "lucide-react";
import Image from "next/image"; 

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorUrl = searchParams.get("error");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [detectedRole, setDetectedRole] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    // MOCK LOGIN LOGIC: Route based on the username input instead of a real backend API
    const lowerInput = username.toLowerCase();
    let mockRole = "Member";
    let targetRoute = "/member/dashboard";

    if (lowerInput.includes("admin")) {
      mockRole = "Officer/Admin";
      targetRoute = "/admin/dashboard";
    } else if (lowerInput.includes("auditor")) {
      mockRole = "Auditor";
      targetRoute = "/auditor/dashboard";
    } else if (lowerInput.includes("treasurer")) {
      mockRole = "Treasurer";
      targetRoute = "/treasurer/dashboard";
    }

    setDetectedRole(mockRole);

    // Simulate network delay for the UI transition
    setTimeout(() => {
      router.push(targetRoute);
      router.refresh();
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full flex font-sans relative overflow-hidden">
      
      <style jsx global>{`
        @keyframes liquid-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -40px) scale(1.08); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        .glass-blob {
          position: absolute; border-radius: 9999px; filter: blur(100px); pointer-events: none; animation: liquid-drift 20s ease-in-out infinite;
        }
      `}</style>

      {/* Left Side: Solid Logo Container */}
      <div className="hidden lg:flex w-1/2 bg-[#f8f9fa] items-center justify-center p-12 relative z-10 shadow-[20px_0_40px_rgba(0,0,0,0.15)]">
        <Image 
          src="/bdoea-logo-blue.png" 
          alt="BDOEA Logo" 
          width={450} 
          height={250} 
          priority
          className="object-contain"
        />
      </div>

      {/* Right Side: Deep Navy Glass Environment */}
      <div className="w-full lg:w-1/2 bg-[#04152d] relative flex items-center justify-center p-8 z-0">
        
        {/* Dynamic Background Blobs strictly contained within the right side */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="glass-blob w-[500px] h-[500px] bg-blue-600/30 -top-32 -right-20" />
          <div className="glass-blob w-[450px] h-[450px] bg-yellow-400/20 top-1/4 -left-32" style={{ animationDelay: '3s' }} />
          <div className="glass-blob w-[400px] h-[400px] bg-blue-400/20 bottom-0 right-10" style={{ animationDelay: '6s' }} />
        </div>

        {/* Frosted Glass Login Card */}
        <div className="relative z-10 bg-white/80 backdrop-blur-[50px] backdrop-saturate-[200%] border border-white w-full max-w-md rounded-[28px] p-10 lg:p-12 shadow-[0_24px_60px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(255,255,255,1)]">
          
          <h2 className="text-[2.5rem] leading-none font-black text-[#04152d] mb-8 tracking-tight drop-shadow-sm">
            Log In
          </h2>

          {/* Error Display - Glassy */}
          {(errorMessage || errorUrl) && (
            <div className="mb-6 bg-red-50/80 backdrop-blur-md border border-red-200 shadow-[inset_0_1px_2px_rgba(255,255,255,1)] text-red-700 p-4 rounded-[16px] flex items-start gap-3 text-[13px] font-bold">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-500" />
              <p className="leading-relaxed">{errorMessage || "Authentication failed."}</p>
            </div>
          )}

          {/* Role Success Display - Glassy */}
          {detectedRole && (
            <div className="mb-6 bg-emerald-50/80 backdrop-blur-md border border-emerald-200 shadow-[inset_0_1px_2px_rgba(255,255,255,1)] text-emerald-800 p-4 rounded-[16px] flex items-center gap-3 text-sm font-bold">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 border border-emerald-200">
                <CheckCircle2 size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-[14px] font-black text-emerald-900 tracking-tight">Authentication Successful</p>
                <p className="text-[12px] font-bold text-emerald-700/80 mt-0.5">Logging you in as: <span className="font-black uppercase text-emerald-600">{detectedRole}</span></p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[11px] font-black text-[#04152d]/80 uppercase tracking-[0.15em] mb-2">Employee ID</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#04152d]/60" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!!detectedRole}
                  className="w-full pl-11 pr-4 py-3.5 bg-white/90 hover:bg-white backdrop-blur-xl border border-white/90 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] rounded-[14px] text-[13.5px] font-bold focus:bg-white focus:shadow-[0_4px_16px_rgba(4,21,45,0.08)] outline-none transition-all duration-300 disabled:opacity-50 text-[#04152d] placeholder:text-[#04152d]/50 placeholder:font-medium"
                  placeholder="e.g., member, admin, treasurer, auditor"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-[#04152d]/80 uppercase tracking-[0.15em] mb-2">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#04152d]/60" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!!detectedRole}
                  className="w-full pl-11 pr-4 py-3.5 bg-white/90 hover:bg-white backdrop-blur-xl border border-white/90 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] rounded-[14px] text-[13.5px] font-bold focus:bg-white focus:shadow-[0_4px_16px_rgba(4,21,45,0.08)] outline-none transition-all duration-300 disabled:opacity-50 text-[#04152d] placeholder:text-[#04152d]/50 placeholder:font-medium"
                  placeholder="Enter any assigned password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !!detectedRole}
              className="w-full bg-[#04152d] hover:bg-[#04152d]/90 text-white p-4 mt-6 rounded-[14px] font-black text-[14px] shadow-[0_8px_20px_rgba(4,21,45,0.3)] hover:-translate-y-[1px] active:translate-y-[2px] transition-all duration-300 flex justify-center items-center gap-2 disabled:opacity-70 border border-white/10 outline-none"
            >
              {isLoading && !detectedRole ? (
                <><Loader2 size={18} className="animate-spin" /> Verifying Credentials...</>
              ) : detectedRole ? (
                "Redirecting Matrix..."
              ) : (
                "Login"
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-[#04152d] text-white">
        <Loader2 className="animate-spin" size={32} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}