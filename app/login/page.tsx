"use client";

export const dynamic = 'force-dynamic';

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertCircle, Loader2, CheckCircle2, Lock, User, Shield, Briefcase, FileCheck, Users } from "lucide-react";
import Image from "next/image"; 

const TEST_ACCOUNTS = [
  { label: 'Member (Juan Dela Cruz)', email: 'member@fms.com', role: 'Member', icon: Users, route: '/member/dashboard' },
  { label: 'Treasurer (Maria Santos)', email: 'treasurer@fms.com', role: 'Treasurer', icon: Briefcase, route: '/treasurer/dashboard' },
  { label: 'Auditor (Audit Inspector)', email: 'auditor@fms.com', role: 'Auditor', icon: FileCheck, route: '/auditor/collections' },
  { label: 'Officer / Admin', email: 'admin@fms.com', role: 'Officer/Admin', icon: Shield, route: '/admin/dashboard' },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorUrl = searchParams.get("error");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [detectedRole, setDetectedRole] = useState<string | null>(null);

  const performLogin = async (loginEmail: string, loginPass: string) => {
    setIsLoading(true);
    setErrorMessage("");

    const lowerInput = loginEmail.toLowerCase();
    let role = "Member";
    let targetRoute = "/member/dashboard";

    if (lowerInput.includes("admin")) {
      role = "Officer/Admin";
      targetRoute = "/admin/dashboard";
    } else if (lowerInput.includes("auditor")) {
      role = "Auditor";
      targetRoute = "/auditor/collections";
    } else if (lowerInput.includes("treasurer")) {
      role = "Treasurer";
      targetRoute = "/treasurer/dashboard";
    }

    setDetectedRole(role);

    try {
      const res = await signIn('credentials', {
        email: loginEmail,
        password: loginPass || 'password123',
        redirect: false,
      });

      if (res?.error) {
        setErrorMessage("Authentication failed. Please check credentials.");
        setIsLoading(false);
        setDetectedRole(null);
        return;
      }

      setTimeout(() => {
        router.push(targetRoute);
        router.refresh();
      }, 800);
    } catch {
      setTimeout(() => {
        router.push(targetRoute);
        router.refresh();
      }, 800);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(username, password);
  };

  const handleQuickLogin = async (acc: typeof TEST_ACCOUNTS[0]) => {
    setUsername(acc.email);
    setPassword("password123");
    await performLogin(acc.email, "password123");
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
      <div className="w-full lg:w-1/2 bg-[#04152d] relative flex items-center justify-center p-6 lg:p-8 z-0">
        
        {/* Dynamic Background Blobs strictly contained within the right side */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="glass-blob w-[500px] h-[500px] bg-blue-600/30 -top-32 -right-20" />
          <div className="glass-blob w-[450px] h-[450px] bg-yellow-400/20 top-1/4 -left-32" style={{ animationDelay: '3s' }} />
          <div className="glass-blob w-[400px] h-[400px] bg-blue-400/20 bottom-0 right-10" style={{ animationDelay: '6s' }} />
        </div>

        {/* Frosted Glass Login Card */}
        <div className="relative z-10 bg-white/85 backdrop-blur-[50px] backdrop-saturate-[200%] border border-white w-full max-w-md rounded-[28px] p-8 lg:p-10 shadow-[0_24px_60px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(255,255,255,1)]">
          
          <h2 className="text-[2.2rem] leading-none font-black text-[#04152d] mb-6 tracking-tight drop-shadow-sm">
            Sign In
          </h2>

          {/* Error Display */}
          {(errorMessage || errorUrl) && (
            <div className="mb-5 bg-red-50/90 backdrop-blur-md border border-red-200 text-red-700 p-3.5 rounded-[16px] flex items-start gap-2.5 text-[12.5px] font-bold animate-fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
              <p className="leading-relaxed">{errorMessage || "Authentication failed."}</p>
            </div>
          )}

          {/* Role Success Display */}
          {detectedRole && (
            <div className="mb-5 bg-emerald-50/90 backdrop-blur-md border border-emerald-200 text-emerald-800 p-3.5 rounded-[16px] flex items-center gap-3 text-sm font-bold animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 border border-emerald-200">
                <CheckCircle2 size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-[13px] font-black text-emerald-900 tracking-tight">Authenticating Session</p>
                <p className="text-[11px] font-bold text-emerald-700/80 mt-0.5">Active Role: <span className="font-black uppercase text-emerald-600">{detectedRole}</span></p>
              </div>
            </div>
          )}

          {/* Quick Demo Role Switcher Buttons */}
          <div className="mb-6 p-3 bg-blue-50/50 border border-blue-100/80 rounded-[18px]">
            <p className="text-[10px] font-black text-blue-900/70 uppercase tracking-widest mb-2 flex items-center gap-1">
              ⚡ Quick Test Accounts (1-Click Switch)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {TEST_ACCOUNTS.map((acc) => {
                const Icon = acc.icon;
                return (
                  <button
                    key={acc.email}
                    type="button"
                    disabled={isLoading || !!detectedRole}
                    onClick={() => handleQuickLogin(acc)}
                    className="p-2 bg-white hover:bg-blue-600 hover:text-white border border-blue-200/60 rounded-[12px] text-left transition-all duration-200 shadow-sm group active:scale-95 disabled:opacity-50"
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Icon size={13} className="text-blue-600 group-hover:text-white" />
                      <span className="text-[11px] font-black tracking-tight">{acc.role}</span>
                    </div>
                    <p className="text-[9.5px] font-medium opacity-70 truncate">{acc.email}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-black text-[#04152d]/80 uppercase tracking-[0.15em] mb-1.5">Email / Employee ID</label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#04152d]/60" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!!detectedRole || isLoading}
                  className="w-full pl-11 pr-4 py-3 bg-white/90 hover:bg-white backdrop-blur-xl border border-white/90 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] rounded-[14px] text-[13px] font-bold focus:bg-white focus:shadow-[0_4px_16px_rgba(4,21,45,0.08)] outline-none transition-all duration-300 disabled:opacity-50 text-[#04152d] placeholder:text-[#04152d]/40 placeholder:font-medium"
                  placeholder="e.g. member@fms.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-[#04152d]/80 uppercase tracking-[0.15em] mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#04152d]/60" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!!detectedRole || isLoading}
                  className="w-full pl-11 pr-4 py-3 bg-white/90 hover:bg-white backdrop-blur-xl border border-white/90 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] rounded-[14px] text-[13px] font-bold focus:bg-white focus:shadow-[0_4px_16px_rgba(4,21,45,0.08)] outline-none transition-all duration-300 disabled:opacity-50 text-[#04152d] placeholder:text-[#04152d]/40 placeholder:font-medium"
                  placeholder="Enter password (default: password123)"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !!detectedRole}
              className="w-full bg-[#04152d] hover:bg-[#04152d]/90 text-white p-3.5 mt-4 rounded-[14px] font-black text-[13.5px] shadow-[0_8px_20px_rgba(4,21,45,0.3)] hover:-translate-y-[1px] active:translate-y-[2px] transition-all duration-300 flex justify-center items-center gap-2 disabled:opacity-70 border border-white/10 outline-none"
            >
              {isLoading && !detectedRole ? (
                <><Loader2 size={16} className="animate-spin" /> Verifying Credentials...</>
              ) : detectedRole ? (
                "Connecting Session..."
              ) : (
                "Sign In"
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