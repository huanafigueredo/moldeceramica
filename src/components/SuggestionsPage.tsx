import React, { useState } from 'react';
import { Lightbulb, Send, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import AppHeader from './AppHeader';
import { supabase } from '../lib/supabaseClient';

export default function SuggestionsPage() {
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError(null);

    const { error: insertError } = await supabase.from('suggestions').insert({
      message: message.trim(),
      name: name.trim() || null,
      contact: contact.trim() || null,
    });

    setSending(false);
    if (insertError) {
      setError('Não foi possível enviar sua sugestão agora. Tenta de novo em instantes?');
      return;
    }
    setSent(true);
    setMessage('');
    setName('');
    setContact('');
  };

  return (
    <div className="min-h-screen bg-clay-50 text-clay-900 flex flex-col justify-between">
      <AppHeader />

      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 w-full">
        <div className="bg-white rounded-3xl border border-terracotta-100 p-8 md:p-10 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-11 h-11 rounded-xl bg-terracotta-500 flex items-center justify-center text-white shadow-sm">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold text-clay-900">Sugestões</h1>
              <p className="text-xs text-clay-900/50">Conta pra gente o que falta, o que travou ou o que você queria que o CeraMold fizesse.</p>
            </div>
          </div>

          {sent ? (
            <div className="flex flex-col items-center text-center gap-3 py-10">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
              <h2 className="font-serif text-lg font-bold text-clay-900">Sugestão enviada!</h2>
              <p className="text-sm text-clay-900/50 max-w-xs">Obrigado — vamos ler com calma.</p>
              <button
                onClick={() => setSent(false)}
                className="text-xs font-bold text-terracotta-600 hover:text-terracotta-700 mt-2"
              >
                Enviar outra sugestão
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-clay-900 uppercase tracking-wider opacity-60 mb-2">
                  Sua sugestão
                </label>
                <textarea
                  required
                  maxLength={2000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder="Ex: seria ótimo ter um molde pra travessa oval..."
                  className="w-full bg-clay-50 border border-terracotta-100 focus:border-terracotta-500 rounded-2xl px-4 py-3 text-clay-900 text-sm focus:outline-none transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-clay-900 uppercase tracking-wider opacity-60 mb-2">
                    Nome <span className="normal-case font-normal opacity-60">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-clay-50 border border-terracotta-100 focus:border-terracotta-500 rounded-2xl px-4 py-3 text-clay-900 text-sm focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-clay-900 uppercase tracking-wider opacity-60 mb-2">
                    Contato <span className="normal-case font-normal opacity-60">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e-mail ou @instagram"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="w-full bg-clay-50 border border-terracotta-100 focus:border-terracotta-500 rounded-2xl px-4 py-3 text-clay-900 text-sm focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={sending || !message.trim()}
                className="w-full py-3.5 bg-terracotta-500 hover:bg-terracotta-600 disabled:opacity-50 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-sm"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar sugestão
              </button>
            </form>
          )}
        </div>
      </main>

      <footer className="no-print border-t border-terracotta-100/50 py-6 bg-white/40 text-center text-xs text-clay-900/50">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} CeraMold Engine.</p>
        </div>
      </footer>
    </div>
  );
}
