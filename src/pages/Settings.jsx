import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Target, Wallet, LogOut, ChevronRight, Save, Loader2, Building2, XCircle, Download, FileSpreadsheet } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BankConnectionModal from '../components/settings/BankConnectionModal';
import * as XLSX from 'xlsx';

export default function Settings() {
  const [user, setUser] = useState(null);
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
    {
      title: 'Conta',
      items: [{ icon: User, label: 'Perfil', value: user?.full_name || user?.email || 'A carregar...', disabled: true }]
    },
    {
      title: 'Configurações Financeiras',
      items: [
        { icon: Wallet, label: 'Orçamento Mensal', value: userProfile?.monthly_budget ? `€${userProfile.monthly_budget.toLocaleString('pt-PT')}` : 'Não definido', onClick: () => { setBudgetInput(userProfile?.monthly_budget?.toString() || ''); setShowBudgetDialog(true); } },
        { icon: Target, label: 'Objetivo Financeiro', value: userProfile?.financial_goal?.replace('_', ' ') || 'Não definido', isSelect: true, options: [{ value: 'save_more', label: 'Poupar Mais' }, { value: 'reduce_debt', label: 'Reduzir Dívidas' }, { value: 'invest', label: 'Começar a Investir' }, { value: 'emergency_fund', label: 'Criar Fundo de Emergência' }, { value: 'retirement', label: 'Planear Reforma' }], onSelect: handleUpdateGoal }
      ]
    },
    {
      title: 'Integração Bancária',
      items: [{ icon: Building2, label: 'Conexão com Banco', value: userProfile?.bank_connected ? `Conectado (${userProfile.bank_provider})` : 'Não conectado', onClick: () => !userProfile?.bank_connected && setShowBankModal(true), showDisconnect: userProfile?.bank_connected, onDisconnect: handleDisconnectBank }]
    },
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
        {settingsGroups.map((group, gi) => (
          <motion.div key={group.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.1 }}>
            <h3 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">{group.title}</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100">
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
                    <div key={item.label} className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="rounded-xl bg-slate-100 p-2"><Icon className="h-5 w-5 text-slate-600" /></div>
                        <span className="font-medium text-slate-800">{item.label}</span>
                      </div>
                      <Select value={userProfile?.financial_goal || ''} onValueChange={item.onSelect} disabled={isSaving}>
                        <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Selecionar objetivo" /></SelectTrigger>
                        <SelectContent>
                          {item.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
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

        {/* Export */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Dados</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
            <button onClick={() => { setExportError(''); setShowExportDialog(true); }}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-2"><Download className="h-5 w-5 text-slate-600" /></div>
                <span className="font-medium text-slate-800">Exportar Transações</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        </motion.div>

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
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                {[{ id: 'xlsx', label: 'Excel (.xlsx)' }, { id: 'csv', label: 'CSV (.csv)' }].map(f => (
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
                <Input type="number" value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} placeholder="3.000" className="h-12 pl-8 rounded-xl" />
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
