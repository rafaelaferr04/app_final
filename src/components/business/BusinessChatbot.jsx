import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, X, MessageCircle, Bot, User } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, subMonths } from 'date-fns';
import ReactMarkdown from 'react-markdown';

function buildContext(transactions, kpis, employees, departments) {
  const m = format(new Date(), 'yyyy-MM');
  const prev = format(subMonths(new Date(), 1), 'yyyy-MM');

  const sum = (arr, type, month) =>
    arr.filter(t => (Array.isArray(type) ? type.includes(t.type) : t.type === type) && t.date?.startsWith(month))
       .reduce((s, t) => s + (t.amount || 0), 0);

  const rev  = sum(transactions, 'revenue', m);
  const cost = sum(transactions, ['cost','investment','tax'], m);
  const revP = sum(transactions, 'revenue', prev);
  const growth = revP > 0 ? (((rev - revP) / revP) * 100).toFixed(1) : 'N/A';
  const margin = rev > 0 ? ((rev - cost) / rev * 100).toFixed(1) : '0';
  const active = employees.filter(e => e.status === 'active');
  const satArr = active.filter(e => e.satisfaction_score != null);
  const avgSat = satArr.length ? (satArr.reduce((s,e) => s + e.satisfaction_score, 0) / satArr.length).toFixed(1) : 'N/A';
  const revenuePerEmp = active.length ? (rev / active.length).toFixed(0) : '0';

  const kpiSummary = kpis.map(k => {
    const cv = k.current_value ?? 0;
    const status = k.direction === 'down' ? (cv <= k.target_value ? 'atingido' : 'em risco') : (cv >= k.target_value ? 'atingido' : 'em risco');
    return `${k.name}: ${cv}/${k.target_value}${k.unit || ''} (${status})`;
  }).join('; ');

  const topCats = Object.entries(
    transactions.filter(t => t.date?.startsWith(m) && t.type !== 'revenue')
      .reduce((a, t) => { a[t.category || 'outro'] = (a[t.category || 'outro'] || 0) + t.amount; return a; }, {})
  ).sort((a,b) => b[1]-a[1]).slice(0,5).map(([k,v]) => `${k}: €${v.toFixed(0)}`).join(', ');

  return `És um agente de inteligência de negócios da empresa que usa WiseMoney Business. Tens acesso em tempo real a todos os dados da empresa. Responde SEMPRE em português de Portugal. Sê conciso, direto e usa dados reais quando relevante.

RESUMO DA EMPRESA — ${m}:
• Receita: €${rev.toFixed(0)} (${growth}% vs mês anterior)
• Custos: €${cost.toFixed(0)}
• Resultado líquido: €${(rev - cost).toFixed(0)}
• Margem bruta: ${margin}%
• Colaboradores ativos: ${active.length} | Satisfação média: ${avgSat}/5
• Receita por colaborador: €${revenuePerEmp}
• Departamentos: ${departments.map(d => d.name).join(', ') || 'nenhum'}
• Principais categorias de custo: ${topCats || 'sem dados'}
• KPIs: ${kpiSummary || 'sem KPIs definidos'}
• Transações recentes: ${transactions.slice(0,5).map(t => `${t.title} (${t.type}, €${t.amount})`).join(' | ') || 'nenhuma'}

Pergunta do utilizador: `;
}

export default function BusinessChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Olá! Sou o teu agente de negócios. Posso analisar as tuas finanças, KPIs, equipa e muito mais. O que precisas de saber?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  const { data: transactions = [] } = useQuery({ queryKey: ['business_transactions'], queryFn: () => base44.entities.BusinessTransaction.filter({}, '-date', 200), enabled: open });
  const { data: kpis = [] } = useQuery({ queryKey: ['business_kpis'], queryFn: () => base44.entities.BusinessKPI.filter({ is_active: true }), enabled: open });
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => base44.entities.Employee.filter(), enabled: open });
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: () => base44.entities.Department.filter(), enabled: open });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 150); }, [open]);

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input.trim() };
    setMessages(p => [...p, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const ctx = buildContext(transactions, kpis, employees, departments);
      const reply = await base44.integrations.Core.InvokeLLM({
        prompt: ctx + input.trim(),
        add_context_from_internet: false,
      });
      setMessages(p => [...p, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: 'Ocorreu um erro. Tenta novamente.' }]);
    }
    setLoading(false);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 min-[800px]:bottom-6 z-40 w-13 h-13 w-[52px] h-[52px] rounded-full bg-amber-600 hover:bg-amber-700 text-white shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
      >
        <MessageCircle className="w-5 h-5" />
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              className="fixed inset-4 sm:inset-auto sm:bottom-24 min-[800px]:bottom-6 sm:right-4 min-[800px]:right-6 sm:w-[400px] sm:max-w-[calc(100vw-2rem)] sm:h-[500px] sm:max-h-[calc(100vh-8rem)] min-[800px]:h-[580px] min-[800px]:max-h-[calc(100vh-4rem)] bg-white rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-5 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">Agente Business</p>
                    <p className="text-amber-100 text-xs">IA com acesso aos dados da empresa</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${
                      msg.role === 'user' ? 'bg-amber-600' : 'bg-slate-100'
                    }`}>
                      {msg.role === 'user'
                        ? <User className="w-3.5 h-3.5 text-white" />
                        : <Bot className="w-3.5 h-3.5 text-slate-500" />}
                    </div>
                    <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-amber-600 text-white rounded-tr-sm'
                        : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                    }`}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3">
                      <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {/* Input */}
              <form onSubmit={send} className="px-4 py-3 border-t border-slate-100 flex gap-2 shrink-0">
                <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                  placeholder="Pergunta sobre a tua empresa…"
                  className="flex-1 bg-slate-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-300 transition-all" />
                <button type="submit" disabled={!input.trim() || loading}
                  className="w-10 h-10 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors shrink-0">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
