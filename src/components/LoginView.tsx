import React, { useState } from 'react';
import { login, SessionUser } from '../auth';
import { Lock, User, ShieldCheck, Sparkles } from 'lucide-react';
import talogo from '../../talogo-crop.png';

interface LoginViewProps {
  onLoginSuccess: (session: SessionUser) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setTimeout(() => {
      const s = login(username, password);
      setLoading(false);
      if (!s) {
        setError('Username atau password salah.');
        return;
      }
      onLoginSuccess(s);
    }, 250);
  };

  return (
    <div
      className="relative isolate min-h-screen w-full flex items-center justify-center p-4 font-['Plus_Jakarta_Sans',sans-serif]"
      style={{ backgroundColor: '#6b1220' }}
    >
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-950/90 via-slate-950/70 to-teal-950/40" />
      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-[28px] shadow-2xl border border-white/70 p-6 md:p-8">
        <div className="flex flex-col items-center gap-4 text-center mb-7">
          <div className="flex h-24 w-full items-center justify-center rounded-3xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 px-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <img
              src={talogo}
              alt="Logo Telkom Akses"
              className="h-16 w-auto max-w-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-[0.18em] text-slate-900 flex items-center justify-center gap-2">
              PROPERE <Sparkles className="h-4 w-4 text-amber-500" />
            </h1>
            <p className="mt-1.5 text-xs font-medium text-slate-500">
              Login terpisah untuk Admin &amp; Verifikator
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin / verifikator"
                className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-slate-200 bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-500 text-sm font-medium text-slate-800"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-slate-200 bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-500 text-sm font-medium text-slate-800"
                required
              />
            </div>
            {error && (
              <p className="mt-2 text-[11px] font-semibold text-rose-600">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 px-4 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{loading ? 'Memproses...' : 'Masuk'}</span>
          </button>
        </form>

        <div className="mt-5 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
          <div className="p-2 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-700">Admin</span>
            <div className="mt-0.5">admin / pas123</div>
          </div>
          <div className="p-2 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-700">Verifikator</span>
            <div className="mt-0.5">verifikator / pass123</div>
          </div>
        </div>
      </div>
    </div>
  );
};