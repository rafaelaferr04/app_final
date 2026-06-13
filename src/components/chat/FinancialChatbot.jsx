import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2, Sparkles, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';

const FINANCIAL_ADVISOR_PROMPT = `Tu és um consultor financeiro de IA amigável e solidário chamado "Finny". O teu papel é:

1. Fornecer conselhos financeiros práticos para gestão de finanças pessoais
2. Oferecer apoio emocional e encorajamento sobre questões de dinheiro
3. Explicar conceitos financeiros de forma simples e fácil de entender
4. Ajudar os utilizadores a criar orçamentos, planos de poupança e metas financeiras
5. Fornecer mensagens motivacionais e celebrar conquistas financeiras
6. Responder perguntas sobre investimento, poupança, gestão de dívidas e planeamento financeiro
7. Ser empático sobre stress e ansiedade financeira

Diretrizes:
- Sê sempre encorajador e positivo
- Usa emojis com moderação para manter o tom amigável 🌟
- Divide tópicos complexos em passos simples
- Celebra pequenas vitórias e progressos
- Fornece conselhos práticos
- Se perguntarem sobre investimentos específicos, lembra que não és um consultor financeiro licenciado e devem consultar profissionais para decisões importantes
- Foca em construir hábitos financeiros saudáveis
- Responde SEMPRE em português de Portugal

Pergunta do utilizador: `;

export default function FinancialChatbot({ isOpen, onClose, initialMessages = [] }) {
  const [messages, setMessages] = useState(initialMessages.length > 0 ? initialMessages : [
    {
      role: 'assistant',
      content: "Olá! 👋 Sou o Finny, o teu assistente financeiro pessoal! Estou aqui para te ajudar com orçamentos, dicas de poupança, compreender finanças ou apenas conversar sobre os teus objetivos financeiros. O que tens em mente hoje?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: FINANCIAL_ADVISOR_PROMPT + input.trim(),
      add_context_from_internet: false
    });

    setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    setIsLoading(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-auto md:bottom-4 md:right-4 md:w-[400px] md:h-[600px] bg-white rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold">Finny</h3>
                    <p className="text-xs text-emerald-100">O Teu Assistente Financeiro</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="rounded-full p-2 hover:bg-white/20 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                    message.role === 'user' 
                      ? 'bg-slate-700' 
                      : 'bg-gradient-to-br from-emerald-400 to-teal-500'
                  }`}>
                    {message.role === 'user' ? (
                      <User className="h-4 w-4 text-white" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-slate-700 text-white rounded-tr-sm'
                      : 'bg-white shadow-sm border border-slate-100 rounded-tl-sm'
                  }`}>
                    <ReactMarkdown className="text-sm prose prose-sm max-w-none">
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </motion.div>
              ))}
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-slate-100">
                    <div className="flex gap-1">
                      <motion.div
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                        className="h-2 w-2 rounded-full bg-emerald-400"
                      />
                      <motion.div
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                        className="h-2 w-2 rounded-full bg-teal-400"
                      />
                      <motion.div
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                        className="h-2 w-2 rounded-full bg-cyan-400"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-4 bg-white border-t border-slate-100">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pergunta-me sobre finanças..."
                  className="flex-1 h-12 rounded-xl border-slate-200"
                  disabled={isLoading}
                />
                <Button 
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="h-12 w-12 rounded-xl bg-emerald-600 hover:bg-emerald-700"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}