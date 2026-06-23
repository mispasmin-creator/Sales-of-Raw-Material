import React, { useState } from 'react';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  KeyRound,
  ShieldAlert,
  Info
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/button';

export const LoginModule = () => {
  const { login } = useApp();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    const uName = username.trim();
    const uPass = password.trim();

    if (!uName || !uPass) {
      setErrorMsg('Username aur password fill karna mandatory hai.');
      return;
    }

    setLoading(true);
    try {
      const success = await login(uName, uPass);
      if (!success) {
        setErrorMsg('Invalid login details. Account details double-check karein.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Server connect fail. Apps Script configurations check karein.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    alert("Password reset process: contact administrative tech support at admin@fms-enterprise.com.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-navy-950 font-sans transition-colors duration-300 overflow-hidden relative p-4">
      
      {/* Styles for dynamic keyframe-driven UI animations */}
      <style>{`
        @keyframes float-blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(35px, -45px) scale(1.08); }
          66% { transform: translate(-25px, 25px) scale(0.92); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes float-blob-reverse {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(-45px, 35px) scale(0.92); }
          66% { transform: translate(25px, -25px) scale(1.1); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes gradient-bg {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-float {
          animation: float-blob 16s infinite ease-in-out;
        }
        .animate-float-reverse {
          animation: float-blob-reverse 20s infinite ease-in-out;
        }
        .animate-gradient-panel {
          background-size: 200% 200%;
          animation: gradient-bg 12s infinite ease-in-out;
        }
      `}</style>

      {/* Floating gradient blobs for lighting depth */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-12 left-1/4 w-80 h-80 rounded-full bg-brand-200/50 blur-[100px] dark:bg-brand-950/20 animate-float" />
        <div className="absolute bottom-12 right-1/4 w-96 h-96 rounded-full bg-brand-200/40 blur-[110px] dark:bg-brand-950/15 animate-float-reverse" />
      </div>

      {/* Centered Login form container */}
      <div className="flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden z-10 w-full">
        
        {/* Form container card (glassmorphism look) */}
        <div className="w-full max-w-[440px] bg-white/[0.85] backdrop-blur-xl border border-slate-200/60 p-8 sm:p-10 rounded-[32px] shadow-2xl relative z-10 dark:bg-slate-navy-900/90 dark:border-slate-navy-800 space-y-6 transform hover:scale-[1.005] transition-transform duration-300 animate-fade-in">
          
          <div className="flex justify-center mb-2">
            <img src="/logo.png" alt="Logo" className="h-20 w-auto object-contain" />
          </div>

          <div className="space-y-2 text-center">
            <h2 className="text-xl font-extrabold font-heading text-slate-navy-900 dark:text-white">
              Sale Of Raw Material
            </h2>
            <p className="text-xs text-slate-navy-500 dark:text-slate-navy-400 font-semibold">
              Enter your registered username and password to log in.
            </p>
          </div>

          {errorMsg && (
            <div className="bg-red-50 text-red-700 p-3.5 rounded-xl border border-red-150 text-xs flex items-center gap-2.5 font-bold animate-pulse">
              <ShieldAlert className="h-4.5 w-4.5 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Input username */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-navy-700 dark:text-slate-navy-300 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-navy-400" />
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter Your Username"
                required
                className="w-full rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 text-sm text-slate-navy-950 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-navy-800 dark:bg-slate-navy-950 dark:text-white transition-all shadow-xs"
              />
            </div>

            {/* Input password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-navy-700 dark:text-slate-navy-300 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-slate-navy-400" />
                  Password
                </label>
                {/* <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-semibold text-brand-650 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button> */}
              </div>
              
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white/70 pl-4 pr-10 py-2.5 text-sm text-slate-navy-950 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-navy-800 dark:bg-slate-navy-950 dark:text-white transition-all shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-navy-400 hover:text-slate-navy-600 dark:hover:text-slate-navy-200 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center select-none pt-1">
              <input
                id="remember-me"
                type="checkbox"
                defaultChecked
                className="h-4.5 w-4.5 rounded border-slate-350 text-brand-600 focus:ring-brand-500 dark:border-slate-navy-800 dark:bg-slate-navy-950 dark:focus:ring-offset-slate-navy-900 cursor-pointer"
              />
              <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-navy-600 dark:text-slate-navy-400 font-semibold cursor-pointer">
                Remember this session
              </label>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full font-bold h-11 bg-gradient-to-r from-brand-600 to-brand-800 text-white rounded-xl shadow-lg shadow-brand-500/20 hover:from-brand-700 hover:to-brand-900 active:scale-[0.985] transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Sign In Securely
                </>
              )}
            </button>
          </form>


        </div>

        {/* Footer info */}
        {/* <p className="text-center text-[10px] text-slate-navy-400 font-semibold mt-8 tracking-wide uppercase z-10">
          FMS Enterprise Security Version 2.4.0 (Stable)
        </p> */}
      </div>
    </div>
  );
};
export default LoginModule;
