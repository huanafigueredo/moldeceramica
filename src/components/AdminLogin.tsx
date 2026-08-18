import React, { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { Flame, Lock, AlertTriangle, Loader2 } from 'lucide-react';
import { signInAdmin, useAdminSession } from '../lib/adminAuth';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useAdminSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-clay-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-terracotta-500" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const authError = await signInAdmin(email, password);
    setLoading(false);
    if (authError) {
      setError('E-mail ou senha incorretos.');
      return;
    }
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-clay-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-terracotta-100 shadow-sm p-8">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-11 h-11 rounded-xl bg-terracotta-500 flex items-center justify-center text-white shadow-sm mb-4">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="font-serif text-xl font-bold text-clay-900">Painel Admin</h1>
          <p className="text-xs text-clay-900/50 mt-1">Acesso restrito à administradora do CeraMold</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-clay-900 uppercase tracking-wider opacity-60 mb-2">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-clay-50 border border-terracotta-100 focus:border-terracotta-500 rounded-2xl px-4 py-3 text-clay-900 text-sm focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-clay-900 uppercase tracking-wider opacity-60 mb-2">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-clay-50 border border-terracotta-100 focus:border-terracotta-500 rounded-2xl px-4 py-3 text-clay-900 text-sm focus:outline-none transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-terracotta-500 hover:bg-terracotta-600 disabled:opacity-50 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
            Entrar
          </button>
        </form>

        <Link to="/" className="block text-center text-xs text-clay-900/40 hover:text-clay-900/70 mt-6">
          ← Voltar para o CeraMold
        </Link>
      </div>
    </div>
  );
}
