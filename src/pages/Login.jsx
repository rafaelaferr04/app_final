import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/localDb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, TrendingUp, Shield, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import logo from '../../logo/logo.jpeg';

const ERRORS = {
  'Invalid login credentials':            'Email ou password incorretos.',
  'Email not confirmed':                  'Confirma o teu email antes de entrar.',
  'User already registered':              'Este email já tem conta. Faz login.',
  'Password should be at least 6 characters': 'A password deve ter pelo menos 6 caracteres.',
  'For security purposes, you can only request this once every 60 seconds':
                                          'Aguarda 60 segundos antes de pedir outro email.',
};

function Alert({ type, message }) {
  if (!message) return null;
  const isError = type === 'error';
  return (
    <div className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm ${
      isError ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    }`}>
      {isError
        ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        : <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />}
      <span>{message}</span>
    </div>
  );
}

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'recovery' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', message: string }

  const setError = (msg) => setFeedback({ type: 'error',   message: ERRORS[msg] ?? msg });
  const setSuccess = (msg) => setFeedback({ type: 'success', message: msg });

  const switchMode = (m) => { setMode(m); setFeedback(null); setPassword(''); setConfirmPassword(''); };


  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // AuthContext detects session change automatically — no redirect needed
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (error) throw error;
      // Flag para mostrar selecção de plano após o primeiro login
      localStorage.setItem('wisemoney_show_plans', 'true');
      setSuccess('Conta criada! Verifica o teu email e clica no link de confirmação antes de entrar.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSuccess('Email enviado! Verifica a tua caixa de entrada e segue as instruções.');
    } catch (err) {
      const msg = err.message && err.message !== '{}' ? err.message : (err.error_description || 'Erro ao enviar email. Verifica as definições SMTP.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('As passwords não coincidem.');
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess('Password atualizada! Já podes fazer login.');
      setTimeout(() => switchMode('login'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-800 via-blue-900 to-slate-900 flex flex-col items-center justify-center p-4">
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl overflow-hidden mb-4 shadow-xl">
          <img src={logo} alt="WiseMoney" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">WiseMoney</h1>
        <p className="text-white/70 text-sm">Gere as tuas finanças com inteligência</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8">

        {/* ── DEFINIR NOVA PASSWORD ── */}
        {mode === 'reset' ? (
          <>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Nova password</h2>
            <p className="text-sm text-slate-500 mb-5">
              Escolhe uma nova password para a tua conta.
            </p>
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <Label className="text-slate-700">Nova password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1.5 h-12 rounded-xl border-slate-200"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <Label className="text-slate-700">Confirmar password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1.5 h-12 rounded-xl border-slate-200"
                  required
                  minLength={6}
                />
              </div>
              <Alert type={feedback?.type} message={feedback?.message} />
              <Button
                type="submit"
                disabled={loading || feedback?.type === 'success'}
                className="w-full h-12 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar nova password'}
              </Button>
            </form>
          </>
        ) : mode === 'recovery' ? (
          <>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5 -ml-1"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar ao login
            </button>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Recuperar password</h2>
            <p className="text-sm text-slate-500 mb-5">
              Introduz o teu email e enviamos um link para definires uma nova password.
            </p>

            <form onSubmit={handleRecovery} className="space-y-4">
              <div>
                <Label className="text-slate-700">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="mt-1.5 h-12 rounded-xl border-slate-200"
                  required
                />
              </div>

              <Alert type={feedback?.type} message={feedback?.message} />

              <Button
                type="submit"
                disabled={loading || feedback?.type === 'success'}
                className="w-full h-12 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar email'}
              </Button>
            </form>
          </>
        ) : (
          <>
            {/* ── TOGGLE LOGIN / REGISTO ── */}
            <div className="flex gap-1 p-1 rounded-xl bg-slate-100 mb-6">
              {[['login', 'Entrar'], ['register', 'Criar conta']].map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    mode === m ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <Label className="text-slate-700">Nome</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="O teu nome"
                    className="mt-1.5 h-12 rounded-xl border-slate-200"
                    required
                  />
                </div>
              )}

              <div>
                <Label className="text-slate-700">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="mt-1.5 h-12 rounded-xl border-slate-200"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-slate-700">Password</Label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchMode('recovery')}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Esqueceste a password?
                    </button>
                  )}
                </div>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1.5 h-12 rounded-xl border-slate-200"
                  required
                  minLength={6}
                />
                {mode === 'register' && (
                  <p className="text-xs text-slate-400 mt-1">Mínimo 6 caracteres</p>
                )}
              </div>

              <Alert type={feedback?.type} message={feedback?.message} />

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold"
              >
                {loading
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : mode === 'login' ? 'Entrar' : 'Criar conta'}
              </Button>
            </form>
          </>
        )}
      </div>

      {/* Features */}
      <div className="flex gap-6 mt-8 text-white/60 text-xs">
        <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Controlo financeiro</span>
        <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Dados seguros</span>
      </div>
    </div>
  );
}
