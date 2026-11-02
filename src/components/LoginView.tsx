import React, { useState } from 'react';
import { login, SessionUser } from '../auth';
import { LockKeyhole, UserRound, ShieldCheck } from 'lucide-react';
import talogo from '../../talogo-crop.png';
import logoTa from '../../logo-ta.png';

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
      const session = login(username, password);
      setLoading(false);
      if (!session) {
        setError('Username atau password salah.');
        return;
      }
      onLoginSuccess(session);
    }, 250);
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f8f8] p-5 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Latar lembut tanpa kontras berlebihan. */}
      <div className="pointer-events-none absolute -left-20 top-[-7rem] h-80 w-80 rounded-full bg-teal-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-16 h-96 w-96 rounded-full bg-slate-200/65 blur-3xl" />

      <section className="relative w-full max-w-[360px] rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6">
        <header className="mb-6 text-center">
          <div className="mx-auto mb-3 flex w-full items-center justify-center">
            <img
              src={logoTa}
              alt="Logo"
              className="h-12 w-auto max-w-full object-contain"
            />
          </div>
          <div className="mx-auto flex h-14 w-full items-center justify-center px-4">
            <img
              src={talogo}
              alt="Logo Telkom Akses"
              className="h-9 w-auto max-w-full object-contain"
            />
          </div>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-teal-700">
            Project Prelim
          </p>
          <h1 className="mt-1 text-lg font-bold tracking-tight text-slate-800">Masuk ke PROPERE</h1>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            Gunakan akun Admin atau Verifikator yang terdaftar.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Username
            </label>
            <div className="relative">
              <UserRound className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                autoComplete="username"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-9 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Password
            </label>
            <div className="relative">
              <LockKeyhole className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-9 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                required
              />
            </div>
            {error && (
              <p role="alert" className="mt-2 text-[11px] font-medium text-rose-600">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" />
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        <footer className="mt-5 border-t border-slate-100 pt-3 text-center text-[10px] text-slate-400">
          Akses sistem terbatas untuk pengguna terdaftar.
        </footer>
      </section>
    </main>
  );
};