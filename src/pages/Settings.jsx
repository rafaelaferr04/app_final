import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Target, Wallet, LogOut, ChevronRight, Save, Loader2, Building2, XCircle, Download, FileSpreadsheet, Crown, Code2, HeadphonesIcon, CalendarCheck, Copy, Check, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { usePlan, PLAN_INFO } from '@/lib/PlanContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BankConnectionModal from '../components/settings/BankConnectionModal';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Settings() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const { plan, profile: planProfile, cancelSubscription, reactivateSubscription, isCancelled, renewalDate, isBusiness } = usePlan();
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [showOnboardingDialog, setShowOnboardingDialog] = useState(false);
  const [showSupportDialog, setShowSupportDialog] = useState(false);

  // Deterministic fake API key based on user email
  const apiKey = planProfile?.id
    ? `wm_live_${planProfile.id.replace(/-/g, '').slice(0, 24)}`
    : 'wm_live_••••••••••••••••••••••••';

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
  };
  const [isReactivating, setIsReactivating] = useState(false);
  const planInfo = PLAN_INFO[plan] || null;
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: userProfiles = [] } = useQuery({
    queryKey: ['userProfile', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });
      if (profiles.length === 0) {
        const p = await base44.entities.UserProfile.create({ total_xp: 0, current_level: 1, streak_days: 0, notifications_enabled: true });
        return [p];
      }
      return profiles;
    },
    enabled: !!user
  });

  const userProfile = userProfiles[0];

  const createProfile = useMutation({
    mutationFn: (data) => base44.entities.UserProfile.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userProfile'] })
  });

  const updateProfile = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UserProfile.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userProfile'] })
  });

  const handleToggleNotifications = async (enabled) => {
    setIsSaving(true);
    if (userProfile) await updateProfile.mutateAsync({ id: userProfile.id, data: { notifications_enabled: enabled } });
    else await createProfile.mutateAsync({ notifications_enabled: enabled });
    setIsSaving(false);
  };

  const handleUpdateBudget = async () => {
    if (!budgetInput) return;
    setIsSaving(true);
    if (userProfile) await updateProfile.mutateAsync({ id: userProfile.id, data: { monthly_budget: parseFloat(budgetInput) } });
    else await createProfile.mutateAsync({ monthly_budget: parseFloat(budgetInput) });
    setIsSaving(false);
    setShowBudgetDialog(false);
    setBudgetInput('');
  };

  const handleUpdateGoal = async (goal) => {
    setIsSaving(true);
    if (userProfile) await updateProfile.mutateAsync({ id: userProfile.id, data: { financial_goal: goal } });
    else await createProfile.mutateAsync({ financial_goal: goal });
    setIsSaving(false);
  };

  const handleConnectBank = async (provider) => {
    setIsSaving(true);
    const data = { bank_connected: true, bank_provider: provider.id, bank_access_token: provider.access_token, bank_last_sync: new Date().toISOString() };
    if (userProfile) await updateProfile.mutateAsync({ id: userProfile.id, data });
    else await createProfile.mutateAsync(data);
    setIsSaving(false);
    setShowBankModal(false);
  };

  const handleDisconnectBank = async () => {
    setIsSaving(true);
    if (userProfile) await updateProfile.mutateAsync({ id: userProfile.id, data: { bank_connected: false, bank_provider: null, bank_access_token: null, bank_last_sync: null } });
    setIsSaving(false);
  };

  const CATEGORY_LABELS = {
    food: 'Alimentação', transport: 'Transportes', housing: 'Habitação',
    utilities: 'Serviços', entertainment: 'Lazer', shopping: 'Compras',
    health: 'Saúde', education: 'Educação', savings: 'Poupança',
    salary: 'Salário', freelance: 'Freelance', investment: 'Investimento',
    gift: 'Presente', other: 'Outro'
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportError('');
    try {
      const all = await base44.entities.Transaction.filter({ created_by: user.email });
      let filtered = all;
      if (exportFrom) filtered = filtered.filter(t => t.date >= exportFrom);
      if (exportTo) filtered = filtered.filter(t => t.date <= exportTo);
      filtered.sort((a, b) => b.date.localeCompare(a.date));

      if (filtered.length === 0) {
        setExportError('Não há transações no período selecionado.');
        setIsExporting(false);
        return;
      }

      const fmtDate = (d) => { const [y, m, day] = d.split('-'); return `${day}-${m}-${y}`; };

      const rows = filtered.map(t => ({
        'Data': fmtDate(t.date),
        'Descrição': t.title || '',
        'Tipo': t.type === 'income' ? 'Receita' : 'Despesa',
        'Categoria': CATEGORY_LABELS[t.category] || t.category || '',
        'Valor (€)': t.type === 'expense' ? -Math.abs(t.amount) : Math.abs(t.amount),
        'Notas': t.notes || ''
      }));

      const suffix = exportFrom && exportTo ? `${exportFrom}_${exportTo}` : exportFrom || exportTo || 'todas';

      if (exportFormat === 'csv') {
        const headers = Object.keys(rows[0]);
        const csvContent = [
          headers.join(';'),
          ...rows.map(r => headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(';'))
        ].join('\n');
        const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wisemoney_transacoes_${suffix}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (exportFormat === 'pdf') {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.setTextColor(30, 58, 138);
        doc.text('WiseMoney — Transações', 14, 16);
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Exportado em ${new Date().toLocaleDateString('pt-PT')}${exportFrom || exportTo ? `  |  Período: ${exportFrom ? fmtDate(exportFrom) : '—'} a ${exportTo ? fmtDate(exportTo) : '—'}` : ''}`, 14, 23);
        autoTable(doc, {
          startY: 28,
          head: [['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor (€)', 'Notas']],
          body: rows.map(r => Object.values(r)),
          headStyles: { fillColor: [30, 58, 138], fontSize: 8, fontStyle: 'bold' },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [241, 245, 249] },
          columnStyles: { 4: { halign: 'right' } },
          margin: { left: 14, right: 14 },
        });
        doc.save(`wisemoney_transacoes_${suffix}.pdf`);
      } else {
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [{ wch: 12 }, { wch: 32 }, { wch: 10 }, { wch: 16 }, { wch: 12 }, { wch: 28 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Transações');
        XLSX.writeFile(wb, `wisemoney_transacoes_${suffix}.xlsx`);
      }
      setShowExportDialog(false);
    } catch (err) {
      setExportError('Erro ao exportar. Tenta de novo.');
    } finally {
      setIsExporting(false);
    }
  };

  const settingsGroups = [
    ...(!isBusiness ? [
      {
        title: 'Configurações Financeiras',
        gridItems: true,
        colSpan: 2,
        items: [
          { icon: Wallet, label: 'Orçamento Mensal', value: userProfile?.monthly_budget ? `€${userProfile.monthly_budget.toLocaleString('pt-PT')}` : 'Não definido', onClick: () => { setBudgetInput(userProfile?.monthly_budget?.toString() || ''); setShowBudgetDialog(true); } },
          { icon: Target, label: 'Objetivo Financeiro', value: userProfile?.financial_goal?.replace('_', ' ') || 'Não definido', isSelect: true, options: [{ value: 'save_more', label: 'Poupar Mais' }, { value: 'reduce_debt', label: 'Reduzir Dívidas' }, { value: 'invest', label: 'Começar a Investir' }, { value: 'emergency_fund', label: 'Criar Fundo de Emergência' }, { value: 'retirement', label: 'Planear Reforma' }], onSelect: handleUpdateGoal }
        ]
      },
      {
        title: 'Integração Bancária',
        items: [{ icon: Building2, label: 'Conexão com Banco', value: userProfile?.bank_connected ? `Conectado (${userProfile.bank_provider})` : 'Não conectado', onClick: () => !userProfile?.bank_connected && setShowBankModal(true), showDisconnect: userProfile?.bank_connected, onDisconnect: handleDisconnectBank, locked: plan === 'free_trial' }]
      },
    ] : []),
    {
      title: 'Preferências',
      items: [{ icon: Bell, label: 'Notificações', isToggle: true, value: userProfile?.notifications_enabled ?? true, onToggle: handleToggleNotifications }]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Profile card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur text-2xl">
            {user?.full_name?.charAt(0)?.toUpperCase() || '👤'}
          </div>
          <div>
            <h2 className="text-xl font-bold">{user?.full_name || 'User'}</h2>
            <p className="text-sm text-blue-200">{user?.email}</p>
          </div>
        </div>
      </motion.div>

      {/* Settings groups */}
      <div className="space-y-6">
        <div className={isBusiness ? "space-y-6" : "grid grid-cols-1 md:grid-cols-2 gap-6 items-start"}>
        {settingsGroups.map((group, gi) => (
          <motion.div key={group.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.1 }} className={group.colSpan === 2 ? 'md:col-span-2' : ''}>
            <h3 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">{group.title}</h3>
            <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden ${group.gridItems ? 'grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100' : 'divide-y divide-slate-100'}`}>
              {group.items.map((item) => {
                const Icon = item.icon;

                if (item.isToggle) {
                  return (
                    <div key={item.label} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-slate-100 p-2"><Icon className="h-5 w-5 text-slate-600" /></div>
                        <span className="font-medium text-slate-800">{item.label}</span>
                      </div>
                      <Switch checked={item.value} onCheckedChange={item.onToggle} disabled={isSaving} />
                    </div>
                  );
                }

                if (item.isSelect) {
                  return (
                    <div key={item.label} className="p-4 flex items-center gap-3">
                      <div className="rounded-xl bg-slate-100 p-2 shrink-0"><Icon className="h-5 w-5 text-slate-600" /></div>
                      <span className="font-medium text-slate-800 text-sm shrink-0">{item.label}</span>
                      <div className="flex-1 min-w-0">
                        <Select value={userProfile?.financial_goal || ''} onValueChange={item.onSelect} disabled={isSaving}>
                          <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                          <SelectContent>
                            {item.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                }

                if (item.locked) {
                  return (
                    <div key={item.label} className="flex items-center justify-between p-4 opacity-60">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-slate-100 p-2"><Icon className="h-5 w-5 text-slate-400" /></div>
                        <div>
                          <span className="font-medium text-slate-500">{item.label}</span>
                          <p className="text-xs text-slate-400">Disponível nos planos pagos</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                        <Lock className="w-3 h-3" /> Bloqueado
                      </div>
                    </div>
                  );
                }

                if (item.showDisconnect) {
                  return (
                    <div key={item.label} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-emerald-100 p-2"><Icon className="h-5 w-5 text-emerald-600" /></div>
                          <div>
                            <span className="font-medium text-slate-800 block">{item.label}</span>
                            <span className="text-xs text-emerald-600">{item.value}</span>
                          </div>
                        </div>
                      </div>
                      <Button onClick={item.onDisconnect} variant="outline" className="w-full h-10 text-rose-600 border-rose-200 hover:bg-rose-50" disabled={isSaving}>
                        <XCircle className="mr-2 h-4 w-4" />
                        Desconectar Banco
                      </Button>
                    </div>
                  );
                }

                return (
                  <button key={item.label} onClick={item.onClick} disabled={item.disabled}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors disabled:opacity-50">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-slate-100 p-2"><Icon className="h-5 w-5 text-slate-600" /></div>
                      <span className="font-medium text-slate-800">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">{item.value}</span>
                      {!item.disabled && <ChevronRight className="h-4 w-4 text-slate-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        ))}
        </div>

        {/* Subscrição + Dados lado a lado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Plano activo */}
        {planInfo && (() => {
          const fmtRenewal = renewalDate
            ? new Date(renewalDate + 'T12:00:00').toLocaleDateString('pt-PT')
            : null;

          return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <h3 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Subscrição</h3>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-xl p-2 ${plan === 'free_trial' ? 'bg-slate-100' : plan === 'premium' ? 'bg-blue-100' : plan === 'premium_plus' ? 'bg-violet-100' : 'bg-amber-100'}`}>
                      <Crown className={`h-5 w-5 ${plan === 'free_trial' ? 'text-slate-600' : plan === 'premium' ? 'text-blue-700' : plan === 'premium_plus' ? 'text-violet-700' : 'text-amber-600'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{planInfo.name}</p>
                      <p className="text-xs text-slate-400">
                        {planInfo.price ? `€${planInfo.price}/mês` : 'Grátis por 2 meses'}
                        {fmtRenewal && ` · até ${fmtRenewal}`}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${plan === 'free_trial' ? 'bg-slate-100 text-slate-600' : plan === 'premium' ? 'bg-blue-100 text-blue-700' : plan === 'premium_plus' ? 'bg-violet-100 text-violet-700' : 'bg-amber-100 text-amber-700'}`}>
                    {planInfo.badge}
                  </span>
                </div>

                {/* Cancelled state banner + reactivate */}
                {isCancelled && (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                      Subscrição cancelada — terás acesso até <strong>{fmtRenewal}</strong>.
                    </p>
                    <Button
                      onClick={async () => {
                        setIsReactivating(true);
                        await reactivateSubscription();
                        setIsReactivating(false);
                      }}
                      disabled={isReactivating}
                      className="w-full h-12 rounded-xl border border-blue-200 bg-white text-blue-700 hover:bg-blue-100 hover:border-blue-300 font-medium text-sm transition-colors"
                    >
                      {isReactivating
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : 'Reativar subscrição'}
                    </Button>
                  </div>
                )}

                <div className="mt-3 flex flex-col gap-2">
                  {!isCancelled && (
                    <button onClick={() => navigate('/PlanSelection')}
                      className="w-full py-2.5 rounded-xl border border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
                      <ChevronRight className="w-4 h-4" />
                      Mudar Plano
                    </button>
                  )}

                  {/* Cancel link — hidden if already cancelled or free trial */}
                  {!isCancelled && plan !== 'free_trial' && (
                    <button
                      onClick={() => setShowCancelDialog(true)}
                      className="text-xs text-slate-400 underline hover:text-rose-500 transition-colors text-left mt-1"
                    >
                      Cancelar subscrição
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })()}

        {/* Dados — segunda célula da grelha Subscrição+Dados */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Dados</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
            {plan === 'free_trial' ? (
              <div className="flex items-center justify-between p-4 opacity-60">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-slate-100 p-2"><Download className="h-5 w-5 text-slate-400" /></div>
                  <div>
                    <span className="font-medium text-slate-500">Exportar Transações</span>
                    <p className="text-xs text-slate-400">Disponível nos planos pagos</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                  <Lock className="w-3 h-3" /> Bloqueado
                </div>
              </div>
            ) : (
              <button onClick={() => { setExportError(''); setShowExportDialog(true); }}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-slate-100 p-2"><Download className="h-5 w-5 text-slate-600" /></div>
                  <span className="font-medium text-slate-800">Exportar Transações</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>
        </motion.div>
        </div>

        {/* Business Resources — full width, 3 cols inside */}
        {isBusiness && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <h3 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Recursos Business</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">

                {/* API Access */}
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="rounded-xl bg-amber-100 p-2"><Code2 className="h-5 w-5 text-amber-700" /></div>
                    <div>
                      <p className="font-medium text-slate-800">Acesso API</p>
                      <p className="text-xs text-slate-400">Integra o WiseMoney nos teus sistemas</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                    <code className="flex-1 text-xs text-slate-600 font-mono truncate">{apiKey}</code>
                    <button onClick={handleCopyApiKey} className="shrink-0 text-slate-400 hover:text-amber-600 transition-colors">
                      {apiKeyCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Support 24/7 */}
                <button onClick={() => setShowSupportDialog(true)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-amber-100 p-2"><HeadphonesIcon className="h-5 w-5 text-amber-700" /></div>
                    <div className="text-left">
                      <p className="font-medium text-slate-800">Suporte Dedicado 24/7</p>
                      <p className="text-xs text-slate-400">Fala com a nossa equipa a qualquer hora</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                </button>

                {/* Onboarding */}
                <button onClick={() => setShowOnboardingDialog(true)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-amber-100 p-2"><CalendarCheck className="h-5 w-5 text-amber-700" /></div>
                    <div className="text-left">
                      <p className="font-medium text-slate-800">Onboarding Personalizado</p>
                      <p className="text-xs text-slate-400">Sessão de configuração com um especialista</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                </button>

              </div>
            </div>
          </motion.div>
        )}

        {/* Logout */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Button onClick={() => base44.auth.logout()} variant="outline"
            className="w-full h-14 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700">
            <LogOut className="mr-2 h-5 w-5" />
            Terminar Sessão
          </Button>
        </motion.div>

        <div className="text-center pt-2">
          <p className="text-sm text-slate-400">WiseMoney v1.0</p>
          <p className="text-xs text-slate-400 mt-1">Feito com 💚 para a tua jornada financeira</p>
        </div>
      </div>

      <BankConnectionModal isOpen={showBankModal} onClose={() => setShowBankModal(false)} onConnect={handleConnectBank} />

      {/* Support dialog */}
      <Dialog open={showSupportDialog} onOpenChange={setShowSupportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HeadphonesIcon className="h-5 w-5 text-amber-600" />
              Suporte Dedicado 24/7
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {[
              { label: 'Email prioritário', value: 'business@wisemoney.pt', sub: 'Resposta em menos de 2 horas' },
              { label: 'WhatsApp Business', value: '+351 910 000 000', sub: 'Disponível 24h / 7 dias' },
              { label: 'Videochamada', value: 'Agendar sessão', sub: 'Via Google Meet ou Zoom', onClick: () => { setShowSupportDialog(false); setShowOnboardingDialog(true); } },
            ].map(item => (
              <div key={item.label}
                onClick={item.onClick}
                className={`flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 ${item.onClick ? 'cursor-pointer hover:bg-amber-50 hover:border-amber-200 transition-colors' : ''}`}>
                <div>
                  <p className="text-sm font-medium text-slate-800">{item.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.sub}</p>
                </div>
                <span className="text-sm text-amber-700 font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Onboarding dialog */}
      <Dialog open={showOnboardingDialog} onOpenChange={setShowOnboardingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-amber-600" />
              Onboarding Personalizado
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-slate-600 leading-relaxed">
              A nossa equipa irá configurar o WiseMoney Business de acordo com as necessidades específicas da tua empresa — departamentos, KPIs, integrações e fluxos de trabalho.
            </p>
            <div className="space-y-2">
              {['Configuração inicial guiada', 'Importação de dados existentes', 'Formação da equipa (até 2h)', 'Revisão ao fim de 30 dias'].map(item => (
                <div key={item} className="flex items-center gap-2 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-amber-600 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <Button
              onClick={() => { window.open('mailto:onboarding@wisemoney.pt?subject=Onboarding%20Business', '_blank'); setShowOnboardingDialog(false); }}
              className="w-full h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium"
            >
              Agendar sessão
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel subscription dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <XCircle className="h-5 w-5" />
              Cancelar Subscrição
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-slate-700 leading-relaxed">
              Ao cancelar, continuarás a ter acesso ao <strong>{planInfo?.name}</strong> até{' '}
              <strong>
                {renewalDate
                  ? new Date(renewalDate + 'T12:00:00').toLocaleDateString('pt-PT')
                  : '—'}
              </strong>
              . A partir dessa data perderás acesso às funcionalidades do plano.
            </p>
            <p className="text-sm text-slate-500">Tens a certeza que queres cancelar?</p>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => setShowCancelDialog(false)} className="flex-1 h-11 rounded-xl">
                Manter plano
              </Button>
              <Button
                onClick={async () => {
                  setIsCancelling(true);
                  await cancelSubscription();
                  setIsCancelling(false);
                  setShowCancelDialog(false);
                }}
                disabled={isCancelling}
                className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sim, cancelar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-blue-700" />
              Exportar Transações
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-700 text-sm">Data início</Label>
                <Input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)} className="mt-1.5 h-11 rounded-xl" />
              </div>
              <div>
                <Label className="text-slate-700 text-sm">Data fim</Label>
                <Input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)} className="mt-1.5 h-11 rounded-xl" />
              </div>
            </div>
            <p className="text-xs text-slate-400">Deixa em branco para exportar todas as transações.</p>

            <div>
              <Label className="text-slate-700 text-sm">Formato</Label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {[{ id: 'xlsx', label: 'Excel (.xlsx)' }, { id: 'csv', label: 'CSV (.csv)' }, { id: 'pdf', label: 'PDF (.pdf)' }].map(f => (
                  <button key={f.id} type="button" onClick={() => setExportFormat(f.id)}
                    className={`h-11 rounded-xl border text-sm font-medium transition-all ${
                      exportFormat === f.id
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                    }`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {exportError && (
              <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">{exportError}</p>
            )}

            <Button onClick={handleExport} disabled={isExporting}
              className="w-full h-12 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold">
              {isExporting
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A exportar...</>
                : <><Download className="mr-2 h-4 w-4" />Exportar</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showBudgetDialog} onOpenChange={setShowBudgetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Definir Orçamento Mensal</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Valor do Orçamento Mensal</Label>
              <div className="relative mt-1.5">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">€</span>
                <Input type="number" value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} onWheel={(e) => e.target.blur()} placeholder="3.000" className="h-12 pl-8 rounded-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
              </div>
            </div>
            <Button onClick={handleUpdateBudget} disabled={!budgetInput || isSaving} className="w-full h-12 bg-blue-700 hover:bg-blue-800">
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="mr-2 h-4 w-4" />Guardar Orçamento</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
