import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const TYPES = [
  { value: 'revenue',    label: 'Receita',    color: 'emerald' },
  { value: 'cost',       label: 'Custo',      color: 'red' },
  { value: 'investment', label: 'Investimento', color: 'blue' },
  { value: 'tax',        label: 'Imposto',    color: 'amber' },
];

const CATEGORIES = {
  revenue:    [{ v: 'sales', l: 'Vendas', e: '💰' }, { v: 'services', l: 'Serviços', e: '🔧' }, { v: 'investment_income', l: 'Rendimentos', e: '📈' }, { v: 'other_revenue', l: 'Outros', e: '📦' }],
  cost:       [{ v: 'salaries', l: 'Salários', e: '👥' }, { v: 'suppliers', l: 'Fornecedores', e: '🏭' }, { v: 'marketing', l: 'Marketing', e: '📢' }, { v: 'infrastructure', l: 'Infraestrutura', e: '🏢' }, { v: 'software', l: 'Software', e: '💻' }, { v: 'travel', l: 'Viagens', e: '✈️' }, { v: 'training', l: 'Formação', e: '📚' }, { v: 'equipment', l: 'Equipamento', e: '🔩' }, { v: 'other_cost', l: 'Outros', e: '📦' }],
  investment: [{ v: 'rd', l: 'I&D', e: '🔬' }, { v: 'capital', l: 'Capital', e: '🏗️' }, { v: 'other_inv', l: 'Outros', e: '📦' }],
  tax:        [{ v: 'vat', l: 'IVA', e: '🧾' }, { v: 'irc', l: 'IRC', e: '🏦' }, { v: 'ss', l: 'Seg. Social', e: '🛡️' }, { v: 'other_tax', l: 'Outros', e: '📄' }],
};

const PAYMENT_METHODS = [
  { v: 'transfer', l: 'Transferência' }, { v: 'card', l: 'Cartão' }, { v: 'check', l: 'Cheque' }, { v: 'direct_debit', l: 'Débito Direto' }, { v: 'cash', l: 'Numerário' },
];

const STATUS_OPTS = [
  { v: 'draft', l: 'Rascunho' }, { v: 'pending', l: 'Pend. Aprovação' }, { v: 'approved', l: 'Aprovado' }, { v: 'paid', l: 'Pago' },
];

const empty = () => ({
  title: '', amount: '', type: 'cost', category: '',
  department: '', project: '', entity_name: '', invoice_number: '',
  payment_method: 'transfer', status: 'approved',
  date: new Date().toISOString().split('T')[0], notes: '',
});

export default function AddBusinessTransactionSheet({ isOpen, onClose, onSave, departments = [], editTransaction = null }) {
  const [form, setForm] = useState(empty());
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editTransaction) {
      setForm({
        title:          editTransaction.title          || '',
        amount:         editTransaction.amount != null ? String(editTransaction.amount) : '',
        type:           editTransaction.type           || 'cost',
        category:       editTransaction.category       || '',
        department:     editTransaction.department     || '',
        project:        editTransaction.project        || '',
        entity_name:    editTransaction.entity_name    || '',
        invoice_number: editTransaction.invoice_number || '',
        payment_method: editTransaction.payment_method || 'transfer',
        status:         editTransaction.status         || 'approved',
        date:           editTransaction.date           || new Date().toISOString().split('T')[0],
        notes:          editTransaction.notes          || '',
      });
      setErrors({});
    } else if (isOpen) {
      setForm(empty());
      setErrors({});
    }
  }, [editTransaction, isOpen]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleTypeChange = (t) => { setForm(p => ({ ...p, type: t, category: '' })); };

  const validate = () => {
    const e = {};
    if (!form.title) e.title = 'Obrigatório';
    if (!form.amount || isNaN(parseFloat(form.amount))) e.amount = 'Valor inválido';
    if (!form.category) e.category = 'Seleciona uma categoria';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    await onSave({ ...form, amount: Math.abs(parseFloat(form.amount)) }, editTransaction?.id);
    setSaving(false);
    if (!editTransaction) { setForm(empty()); setErrors({}); }
    onClose();
  };

  const cats = CATEGORIES[form.type] || [];

  const typeColor = { revenue: 'emerald', cost: 'red', investment: 'blue', tax: 'amber' }[form.type];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[65]" />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-3xl bg-white shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="p-5">
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-800">{editTransaction ? 'Editar Transação' : 'Nova Transação'}</h2>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
              </div>

              {/* Type selector */}
              <div className="flex gap-1.5 mb-5">
                {TYPES.map(t => (
                  <button key={t.value} type="button" onClick={() => handleTypeChange(t.value)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all border ${form.type === t.value ? `border-${t.color}-500 bg-${t.color}-50 text-${t.color}-700` : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                {/* Description */}
                <div>
                  <Label className="text-slate-700">Descrição *</Label>
                  <Input value={form.title} onChange={e => set('title', e.target.value)}
                    placeholder="Ex: Fatura Fornecedor ABC" className={`mt-1.5 h-11 rounded-xl ${errors.title ? 'border-rose-400' : ''}`} />
                  {errors.title && <p className="text-xs text-rose-500 mt-1">{errors.title}</p>}
                </div>

                {/* Amount + Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-700">Valor (€) *</Label>
                    <Input type="number" step="0.01" min="0" value={form.amount}
                      onChange={e => set('amount', e.target.value)} onWheel={e => e.target.blur()}
                      placeholder="0.00" className={`mt-1.5 h-11 rounded-xl ${errors.amount ? 'border-rose-400' : ''}`} />
                    {errors.amount && <p className="text-xs text-rose-500 mt-1">{errors.amount}</p>}
                  </div>
                  <div>
                    <Label className="text-slate-700">Data</Label>
                    <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="mt-1.5 h-11 rounded-xl" />
                  </div>
                </div>

                {/* Category grid */}
                <div>
                  <Label className="text-slate-700">Categoria *</Label>
                  <div className={`mt-1.5 grid grid-cols-4 sm:grid-cols-5 gap-1.5 p-2 rounded-xl border ${errors.category ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
                    {cats.map(cat => {
                      const sel = form.category === cat.v;
                      return (
                        <button key={cat.v} type="button" onClick={() => { set('category', cat.v); setErrors(p => ({ ...p, category: '' })); }}
                          className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg text-center transition-all ${sel ? 'bg-amber-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
                          <span className="text-base leading-none">{cat.e}</span>
                          <span className="text-[9px] font-medium leading-tight">{cat.l}</span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.category && <p className="text-xs text-rose-500 mt-1">{errors.category}</p>}
                </div>

                {/* Department + Project */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-700">Departamento</Label>
                    <select value={form.department} onChange={e => set('department', e.target.value)}
                      className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500">
                      <option value="">— Nenhum —</option>
                      {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-slate-700">Projeto</Label>
                    <Input value={form.project} onChange={e => set('project', e.target.value)}
                      placeholder="Opcional" className="mt-1.5 h-11 rounded-xl" />
                  </div>
                </div>

                {/* Entity + Invoice */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-700">Entidade (fornecedor/cliente)</Label>
                    <Input value={form.entity_name} onChange={e => set('entity_name', e.target.value)}
                      placeholder="Nome da empresa" className="mt-1.5 h-11 rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-slate-700">Nº Fatura</Label>
                    <Input value={form.invoice_number} onChange={e => set('invoice_number', e.target.value)}
                      placeholder="FT2026/001" className="mt-1.5 h-11 rounded-xl" />
                  </div>
                </div>

                {/* Payment method + Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-700">Método de Pagamento</Label>
                    <select value={form.payment_method} onChange={e => set('payment_method', e.target.value)}
                      className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500">
                      {PAYMENT_METHODS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-slate-700">Estado</Label>
                    <select value={form.status} onChange={e => set('status', e.target.value)}
                      className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500">
                      {STATUS_OPTS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label className="text-slate-700">Notas</Label>
                  <Textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                    placeholder="Observações..." className="mt-1.5 rounded-xl" rows={2} />
                </div>

                <div className="flex justify-center pt-2 pb-4">
                  <Button onClick={handleSave} disabled={saving}
                    className="px-12 h-12 rounded-xl text-base font-semibold bg-amber-600 hover:bg-amber-700">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editTransaction ? 'Guardar Alterações' : 'Guardar Transação'}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
