"use client";

export const dynamic = 'force-dynamic';

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { 
  AlertCircle, Loader2, CheckCircle2, Lock, User, Shield, 
  Briefcase, FileCheck, ClipboardCheck, ArrowRight, Eye, EyeOff, KeyRound
} from "lucide-react";
import Image from "next/image"; 

const TEST_ACCOUNTS = [
  { 
    label: 'Collecting Officer', 
    email: 'collecting.officer@fms.com', 
    role: 'Collecting Officer', 
    icon: ClipboardCheck, 
    route: '/collecting-officer',
    badge: 'Collections'
  },
  { 
    label: 'Disbursing Officer', 
    email: 'disbursing.officer@fms.com', 
    role: 'Disbursing Officer', 
    icon: Briefcase, 
    route: '/disbursing-officer',
    badge: 'Disbursements'
  },
  { 
    label: 'Auditor', 
    email: 'auditor@fms.com', 
    role: 'Auditor', 
    icon: FileCheck, 
    route: '/auditor',
    badge: 'Compliance'
  },
  { 
    label: 'System Admin', 
    email: 'admin@fms.com', 
    role: 'System Admin', 
    icon: Shield, 
    route: '/admin',
    badge: 'Governance'
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorUrl = searchParams.get("error");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [detectedRole, setDetectedRole] = useState<string | null>(null);

  const performLogin = async (loginEmail: string, loginPass: string, overrideRoute?: string) => {
    setIsLoading(true);
    setErrorMessage("");

    const lowerInput = loginEmail.toLowerCase();
    let role = "Collecting Officer";
    let targetRoute = overrideRoute || "/collecting-officer";

    if (!overrideRoute) {
      if (lowerInput.includes("admin") || lowerInput.includes("system")) {
        role = "System Admin";
        targetRoute = "/admin";
      } else if (lowerInput.includes("auditor")) {
        role = "Auditor";
        targetRoute = "/auditor";
      } else if (lowerInput.includes("disbursing") || lowerInput.includes("disbursement")) {
        role = "Disbursing Officer";
        targetRoute = "/disbursing-officer";
      } else if (lowerInput.includes("collecting") || lowerInput.includes("treasurer")) {
        role = "Collecting Officer";
        targetRoute = "/collecting-officer";
      }
    } else {
      const match = TEST_ACCOUNTS.find(a => a.route === overrideRoute);
      if (match) role = match.role;
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
      }, 700);
    } catch {
      setTimeout(() => {
        router.push(targetRoute);
        router.refresh();
      }, 700);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(username, password);
  };

  const handleQuickLogin = async (acc: typeof TEST_ACCOUNTS[0]) => {
    setSelectedRole(acc.role);
    setUsername(acc.email);
    setPassword("password123");
    await performLogin(acc.email, "password123", acc.route);
  };

  return (
    <div className="min-h-screen w-full flex font-sans relative overflow-hidden bg-[#04152d]">
      
      <style jsx global>{`
        @keyframes liquid-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(35px, -45px) scale(1.08); }
          66% { transform: translate(-25px, 25px) scale(0.94); }
        }
        .glass-blob {
          position: absolute; 
          border-radius: 9999px; 
          filter: blur(110px); 
          pointer-events: none; 
          animation: liquid-drift 22s ease-in-out infinite;
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

      {/* Right Side: Clean Login Panel */}
      <div className="w-full lg:w-1/2 relative flex items-center justify-center p-6 lg:p-10 z-0 min-h-screen">
        
        {/* Ambient background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="glass-blob w-[500px] h-[500px] bg-blue-600/30 -top-32 -right-20" />
          <div className="glass-blob w-[450px] h-[450px] bg-yellow-400/20 top-1/4 -left-32" style={{ animationDelay: '3s' }} />
          <div className="glass-blob w-[400px] h-[400px] bg-blue-400/20 bottom-0 right-10" style={{ animationDelay: '6s' }} />
        </div>

        {/* Clean Glass Card */}
        <div className="relative z-10 w-full max-w-[420px] bg-white/90 backdrop-blur-[40px] border border-white rounded-[24px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
          
          <h2 className="text-[28px] font-black text-[#04152d] mb-5 tracking-tight">
            Log In
          </h2>

          {/* Clean 2x2 Quick Role Selector */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            {TEST_ACCOUNTS.map((acc) => {
              const Icon = acc.icon;
              const isSelected = selectedRole === acc.role;
              return (
                <button
                  key={acc.email}
                  type="button"
                  disabled={isLoading || !!detectedRole}
                  onClick={() => handleQuickLogin(acc)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#04152d] text-white border-[#04152d]'
                      : 'bg-gray-50/90 hover:bg-gray-100/90 text-[#04152d] border-gray-200'
                  }`}
                >
                  <Icon size={16} className={isSelected ? 'text-amber-400' : 'text-[#04152d]/60'} />
                  <span className="text-[12px] font-bold truncate">{acc.role}</span>
                </button>
              );
            })}
          </div>

          {/* Error notification banner */}
          {(errorMessage || errorUrl) && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl flex items-center gap-2 text-[12px] font-bold">
              <AlertCircle size={15} className="shrink-0 text-rose-600" />
              <p>{errorMessage || "Authentication failed. Please verify credentials."}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[#04152d]/70 uppercase tracking-wider mb-1.5">
                Email / Employee ID
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#04152d]/40" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!!detectedRole || isLoading}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl text-[13px] font-medium text-[#04152d] placeholder:text-[#04152d]/30 focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
                  placeholder="Enter email"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#04152d]/70 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#04152d]/40" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!!detectedRole || isLoading}
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl text-[13px] font-medium text-[#04152d] placeholder:text-[#04152d]/30 focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#04152d]/40 hover:text-[#04152d] transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !!detectedRole}
              className="w-full mt-2 py-3 bg-[#04152d] hover:bg-[#071f43] text-white rounded-xl font-bold text-[13.5px] transition-all flex justify-center items-center gap-2 disabled:opacity-70 cursor-pointer shadow-xs"
            >
              {isLoading && !detectedRole ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : detectedRole ? (
                <span>Redirecting...</span>
              ) : (
                "Log In"
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