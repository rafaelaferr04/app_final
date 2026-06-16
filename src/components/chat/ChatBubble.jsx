import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Sparkles, User, Loader2, Lightbulb, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { usePlan } from '@/lib/PlanContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth } from 'date-fns';
import { pt } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';

const CATEGORY_LABELS = {
  salary: 'Salário', freelance: 'Freelance', investment: 'Investimento', gift: 'Presente',
  food: 'Alimentação', transport: 'Transporte', housing: 'Habitação', utilities: 'Contas',
  entertainment: 'Lazer', shopping: 'Compras', health: 'Saúde', education: 'Educação',
  savings: 'Poupança', other: 'Outros',
};

const BASE_SYSTEM = `Tu és o Finny, consultor financeiro IA do WiseMoney, amigável e objetivo.
O teu papel é ajudar o utilizador com finanças pessoais — orçamentos, poupança, investimento e gestão de gastos.
Responde sempre em português de Portugal. Sê conciso, prático e encorajador.`;

const AGENT_SYSTEM = `Tu és o Finny, o consultor financeiro IA pessoal do utilizador no WiseMoney.
Tens acesso completo aos dados financeiros reais do utilizador (abaixo).
O teu papel é analisar esses dados e dar conselhos personalizados e específicos, como um mentor financeiro.
Quando o utilizador fizer perguntas, usa sempre os dados reais para fundamentar as tuas respostas.
Dá sugestões concretas com valores específicos sempre que possível.
Responde em português de Portugal. Sê direto, empático e acionável.`;

const QUICK = ['Como poupar mais?', 'Regra 50/30/20?', 'Fundo de emergência?', 'Como investir?'];
const QUICK_AGENT = ['Onde posso reduzir gastos?', 'Como estão as minhas finanças?', 'Estou a cumprir o orçamento?', 'Onde gasto mais?'];

function buildFinancialContext(transactions, goals, profile) {
  if (!transactions?.length) return '';
  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthTx = transactions.filter(t => t.date >= monthStart);

  const income   = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const byCategory = {};
  monthTx.filter(t => t.type === 'expense').forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  });
  const catSummary = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([c, v]) => `  - ${CATEGORY_LABELS[c] || c}: €${v.toFixed(2)}`)
    .join('\n') || '  (sem despesas)';

  const recentTx = transactions.slice(0, 15)
    .map(t => `  - ${t.date}: ${t.title} ${t.type === 'income' ? '+' : '-'}€${t.amount.toFixed(2)} [${CATEGORY_LABELS[t.category] || t.category}]`)
    .join('\n');

  const goalsSummary = goals?.length
    ? goals.map(g => `  - ${g.title}: €${g.current_amount}/${g.target_amount} (${g.target_amount > 0 ? Math.round(g.current_amount/g.target_amount*100) : 0}%)`).join('\n')
    : '  (sem metas activas)';

  return `

=== DADOS FINANCEIROS REAIS ===
Mês actual: ${format(now, 'MMMM yyyy', { locale: pt })}
Receitas este mês: €${income.toFixed(2)}
Despesas este mês: €${expenses.toFixed(2)}
Saldo mensal: €${(income - expenses).toFixed(2)}
${profile?.monthly_budget ? `Orçamento mensal: €${profile.monthly_budget} (${expenses > 0 ? Math.round(expenses/profile.monthly_budget*100) : 0}% utilizado)` : ''}

Despesas por categoria (este mês):
${catSummary}

Últimas 15 transações:
${recentTx}

Metas de poupança:
${goalsSummary}
================================`;
}

export default function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: 'Olá! 👋 Sou o Finny, o teu assistente financeiro. Como posso ajudar?'
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [panelSize, setPanelSize] = useState(null); // null = tamanho original por defeito
  const { user } = useAuth();
  const { isFreeTrial, isPremiumPlus, getChatQuestionsLeft, useChatQuestion } = usePlan();
  const navigate = useNavigate();
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);
  const isResizing = useRef(false);
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // Fechar ao clicar fora
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current?.contains(e.target) || buttonRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Resize custom (arrasto no canto superior esquerdo)
  useEffect(() => {
    const onMove = (e) => {
      if (!isResizing.current) return;
      const dx = resizeStart.current.x - e.clientX;
      const dy = resizeStart.current.y - e.clientY;
      setPanelSize({
        width:  Math.max(280, Math.min(720, resizeStart.current.w + dx)),
        height: Math.max(260, Math.min(Math.floor(window.innerHeight * 0.88), resizeStart.current.h + dy)),
      });
    };
    const onUp = () => { isResizing.current = false; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  // Fetch financial data for Premium Plus agent mode
  const { data: agentTransactions = [] } = useQuery({
    queryKey: ['chat-transactions', user?.email],
    queryFn: () => user ? base44.entities.Transaction.filter({ created_by: user.email }, '-date', 200) : [],
    enabled: !!user && isPremiumPlus,
  });
  const { data: agentGoals = [] } = useQuery({
    queryKey: ['chat-goals', user?.email],
    queryFn: () => user ? base44.entities.SavingsGoal.filter({ created_by: user.email }) : [],
    enabled: !!user && isPremiumPlus,
  });
  const { data: agentProfiles = [] } = useQuery({
    queryKey: ['chat-profile', user?.email],
    queryFn: () => user ? base44.entities.UserProfile.filter({ created_by: user.email }) : [],
    enabled: !!user && isPremiumPlus,
  });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 200); }, [open]);

  const questionsLeft = isFreeTrial ? getChatQuestionsLeft() : Infinity;
  const isBlocked = isFreeTrial && questionsLeft <= 0;

  const getSystemPrompt = () => {
    if (isPremiumPlus) {
      const ctx = buildFinancialContext(agentTransactions, agentGoals, agentProfiles[0]);
      return AGENT_SYSTEM + ctx;
    }
    return BASE_SYSTEM;
  };

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    if (isBlocked) return;

    if (isFreeTrial) useChatQuestion();

    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setInput('');
    setLoading(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: msg,
        system: getSystemPrompt(),
      });
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      const detail = err?.message ? ` (${err.message})` : '';
      setMessages(prev => [...prev, { role: 'assistant', content: `Não consegui responder agora.${detail} Tenta de novo.` }]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = isPremiumPlus ? QUICK_AGENT : QUICK;

  return (
    <>
      {/* Floating button */}
      <motion.button
        ref={buttonRef}
        onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-20 right-3 md:bottom-6 md:right-6 z-[60] w-12 h-12 md:w-14 md:h-14 rounded-full bg-blue-900 hover:bg-blue-950 text-white shadow-xl shadow-blue-900/40 flex items-center justify-center transition-colors"
        title="Finny — Assistente Financeiro"
      >
        <AnimatePresence mode="wait">
          {open
            ? <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><X className="w-5 h-5 md:w-6 md:h-6" /></motion.span>
            : <motion.span key="msg" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><MessageCircle className="w-5 h-5 md:w-6 md:h-6" /></motion.span>
          }
        </AnimatePresence>
        {isPremiumPlus && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-violet-500 rounded-full flex items-center justify-center">
            <Sparkles className="w-2.5 h-2.5 text-white" />
          </span>
        )}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-[8.5rem] right-4 md:bottom-24 md:right-6 z-[60] w-[340px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
            style={panelSize
              ? { width: panelSize.width, height: panelSize.height }
              : { height: 'min(460px, calc(100dvh - 12rem))' }
            }
          >
            {/* Pega de resize — apenas em ecrãs grandes */}
            <div
              onMouseDown={(e) => {
                isResizing.current = true;
                const rect = panelRef.current?.getBoundingClientRect();
                resizeStart.current = {
                  x: e.clientX, y: e.clientY,
                  w: rect?.width  ?? 340,
                  h: rect?.height ?? 460,
                };
                e.preventDefault();
              }}
              className="absolute top-0 left-0 w-5 h-5 hidden md:flex items-center justify-center cursor-nw-resize z-10 group"
              title="Arrastar para redimensionar"
            >
              <div className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-blue-400 transition-colors" />
            </div>
            {/* Header */}
            <div className={`flex items-center gap-3 px-4 py-3 text-white shrink-0 ${isPremiumPlus ? 'bg-gradient-to-r from-violet-700 to-blue-800' : 'bg-gradient-to-r from-blue-700 to-blue-900'}`}>
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Finny {isPremiumPlus && <span className="text-violet-200 text-[10px] ml-1">• IA Avançada</span>}</p>
                <p className={`text-xs ${isPremiumPlus ? 'text-violet-200' : 'text-blue-200'}`}>
                  {isPremiumPlus ? 'Agente financeiro pessoal' : 'Assistente Financeiro IA'}
                </p>
              </div>
              {isFreeTrial && (
                <div className="text-xs bg-white/15 rounded-full px-2 py-0.5 shrink-0">
                  {questionsLeft}/5
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white ${
                    m.role === 'user' ? 'bg-slate-600' : isPremiumPlus ? 'bg-gradient-to-br from-violet-500 to-blue-600' : 'bg-gradient-to-br from-blue-500 to-blue-700'
                  }`}>
                    {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                  </div>
                  <div className={`max-w-[78%] rounded-xl px-3 py-2 text-xs ${
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
                  <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${isPremiumPlus ? 'bg-gradient-to-br from-violet-500 to-blue-600' : 'bg-gradient-to-br from-blue-500 to-blue-700'}`}>
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl rounded-tl-none px-3 py-2">
                    <div className="flex gap-1 items-center h-4">
                      {[0, 0.2, 0.4].map(d => (
                        <motion.div key={d} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: d }}
                          className={`w-1.5 h-1.5 rounded-full ${isPremiumPlus ? 'bg-violet-400' : 'bg-blue-400'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Blocked state for free trial */}
            {isBlocked ? (
              <div className="px-4 py-4 border-t border-slate-100 text-center shrink-0">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                  <Lock className="w-5 h-5 text-blue-700" />
                </div>
                <p className="text-xs font-semibold text-slate-800 mb-0.5">Limite diário atingido</p>
                <p className="text-xs text-slate-500 mb-3">Upgrade para chat ilimitado</p>
                <button onClick={() => { setOpen(false); navigate('/PlanSelection'); }}
                  className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-colors">
                  Ver planos WisePremium
                </button>
              </div>
            ) : (
              <>
                {/* Quick prompts */}
                {messages.length <= 1 && (
                  <div className="px-3 pb-2 shrink-0">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-xs text-slate-500">Sugestões</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {quickPrompts.map(q => (
                        <button key={q} onClick={() => send(q)}
                          className={`text-xs px-2.5 py-1.5 rounded-full border transition ${isPremiumPlus ? 'bg-violet-50 text-violet-700 border-violet-100 hover:bg-violet-100' : 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100'}`}>
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
                    placeholder={isPremiumPlus ? 'Pergunta com base nos teus dados...' : 'Pergunta ao Finny...'}
                    className="flex-1 h-10 rounded-xl text-xs border-slate-200"
                    disabled={loading}
                  />
                  <Button type="submit" disabled={loading || !input.trim()}
                    className={`h-10 w-10 rounded-xl p-0 shrink-0 ${isPremiumPlus ? 'bg-violet-700 hover:bg-violet-800' : 'bg-blue-700 hover:bg-blue-800'}`}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
