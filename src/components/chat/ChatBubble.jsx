import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Sparkles, User, Loader2, Lightbulb } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';

const SYSTEM_PROMPT = `Tu és um consultor financeiro de IA amigável e solidário chamado "Finny". O teu papel é:
1. Fornecer conselhos financeiros práticos para gestão de finanças pessoais
2. Oferecer apoio emocional e encorajamento sobre questões de dinheiro
3. Explicar conceitos financeiros de forma simples e fácil de entender
4. Ajudar os utilizadores a criar orçamentos, planos de poupança e metas financeiras
5. Responder em português de Portugal. Sê sempre encorajador e conciso.`;

const QUICK = [
  "Como poupar mais?",
  "Regra 50/30/20?",
  "Fundo de emergência?",
  "Como investir?",
];

export default function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: 'Olá! 👋 Sou o Finny, o teu assistente financeiro. Como posso ajudar?'
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setInput('');
    setLoading(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({ prompt: msg, system: SYSTEM_PROMPT });
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      if (user) {
        base44.entities.ChatMessage.create({ role: 'user', content: msg }).catch(() => {});
        base44.entities.ChatMessage.create({ role: 'assistant', content: response }).catch(() => {});
      }
    } catch (err) {
      const detail = err?.message ? ` (${err.message})` : '';
      setMessages(prev => [...prev, { role: 'assistant', content: `Não consegui responder agora.${detail} Verifica a ligação e tenta de novo.` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-20 right-3 md:bottom-6 md:right-6 z-50 w-12 h-12 md:w-14 md:h-14 rounded-full bg-blue-900 hover:bg-blue-950 text-white shadow-xl shadow-blue-900/40 flex items-center justify-center transition-colors"
        title="Finny — Assistente Financeiro"
      >
        <AnimatePresence mode="wait">
          {open
            ? <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><X className="w-5 h-5 md:w-6 md:h-6" /></motion.span>
            : <motion.span key="msg" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><MessageCircle className="w-5 h-5 md:w-6 md:h-6" /></motion.span>
          }
        </AnimatePresence>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-[8.5rem] right-4 md:bottom-24 md:right-6 z-50 w-[340px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
            style={{ height: 'min(460px, calc(100dvh - 12rem))' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-700 to-blue-900 text-white shrink-0">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-4.5 h-4.5 w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Finny</p>
                <p className="text-xs text-blue-200">Assistente Financeiro IA</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white ${
                    m.role === 'user' ? 'bg-slate-600' : 'bg-gradient-to-br from-blue-500 to-blue-700'
                  }`}>
                    {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                  </div>
                  <div className={`max-w-[78%] rounded-xl px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-slate-700 text-white rounded-tr-none'
                      : 'bg-slate-50 border border-slate-100 text-slate-800 rounded-tl-none'
                  }`}>
                    {m.role === 'user'
                      ? <p>{m.content}</p>
                      : <ReactMarkdown className="prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{m.content}</ReactMarkdown>
                    }
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-2">
                  <div className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl rounded-tl-none px-3 py-2">
                    <div className="flex gap-1 items-center h-4">
                      {[0, 0.2, 0.4].map(d => (
                        <motion.div key={d} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: d }}
                          className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Quick prompts */}
            {messages.length <= 1 && (
              <div className="px-3 pb-2 shrink-0">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs text-slate-500">Sugestões</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK.map(q => (
                    <button key={q} onClick={() => send(q)}
                      className="text-xs px-2.5 py-1.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 transition">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <form onSubmit={(e) => { e.preventDefault(); send(); }}
              className="flex gap-2 px-3 py-3 border-t border-slate-100 shrink-0">
              <Input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Pergunta ao Finny..."
                className="flex-1 h-10 rounded-xl text-sm border-slate-200"
                disabled={loading}
              />
              <Button type="submit" disabled={loading || !input.trim()}
                className="h-10 w-10 rounded-xl bg-blue-700 hover:bg-blue-800 p-0 shrink-0">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
