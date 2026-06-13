import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, FileUp, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const incomeCategories = [
  { value: 'salary', label: 'Salário' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'investment', label: 'Investimento' },
  { value: 'gift', label: 'Presente' },
  { value: 'other', label: 'Outros' }
];

const expenseCategories = [
  { value: 'food', label: 'Alimentação' },
  { value: 'transport', label: 'Transporte' },
  { value: 'housing', label: 'Habitação' },
  { value: 'utilities', label: 'Contas' },
  { value: 'entertainment', label: 'Lazer' },
  { value: 'shopping', label: 'Compras' },
  { value: 'health', label: 'Saúde' },
  { value: 'education', label: 'Educação' },
  { value: 'savings', label: 'Poupança' },
  { value: 'other', label: 'Outros' }
];

export default function AddTransactionSheet({ isOpen, onClose, onSave }) {
  const [view, setView] = useState('form'); // 'form' or 'import'
  const [type, setType] = useState('expense');
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  const categories = type === 'income' ? incomeCategories : expenseCategories;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.title) newErrors.title = 'Campo obrigatório';
    if (!formData.amount) newErrors.amount = 'Campo obrigatório';
    if (!formData.category) newErrors.category = 'Seleciona uma categoria';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    const amount = Math.round(parseFloat(formData.amount) * 100) / 100;
    await onSave({
      ...formData,
      type,
      amount
    });
    setIsSubmitting(false);
    setFormData({ title: '', amount: '', category: '', date: new Date().toISOString().split('T')[0], notes: '' });
    onClose();
  };

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'text/csv',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato não suportado. Usa PDF, Excel ou CSV.');
      return;
    }

    setIsImporting(true);
    const uploadDate = new Date().toISOString().split('T')[0];

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({ file_url });

      if (result.status === 'success' && result.output?.transactions?.length > 0) {
        const transactions = result.output.transactions.map(tx => {
          const amount = parseFloat(tx.amount) || 0;
          const isExpense = amount < 0;

          let txDate = uploadDate;
          if (tx.date) {
            const parsed = new Date(tx.date);
            if (!isNaN(parsed.getTime())) txDate = parsed.toISOString().split('T')[0];
          }

          return {
            title: tx.description || 'Transação importada',
            amount: Math.round(Math.abs(amount) * 100) / 100,
            type: isExpense ? 'expense' : 'income',
            category: tx.category || 'other',
            date: txDate,
            notes: 'Importado automaticamente'
          };
        });

        for (const transaction of transactions) {
          await onSave(transaction);
        }

        toast.success(`${transactions.length} transações importadas e categorizadas!`);
        setView('form');
        setTimeout(() => onClose(), 300);
      } else {
        toast.error('Não foram encontradas transações no ficheiro.');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error?.message?.startsWith('Extract error')
        ? 'Erro ao contactar o servidor de IA. Tenta novamente.'
        : 'Não foi possível processar o ficheiro.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
            
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                {view === 'form' ? 'Adicionar Transação' : 'Importar Ficheiro'}
              </h2>
              <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            {/* View Toggle */}
            <div className="flex gap-2 p-1 rounded-xl bg-slate-100 mb-6">
              <button
                type="button"
                onClick={() => setView('form')}
                className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${
                  view === 'form' 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500'
                }`}
              >
                Manual
              </button>
              <button
                type="button"
                onClick={() => setView('import')}
                className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                  view === 'import' 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500'
                }`}
              >
                <FileUp className="h-4 w-4" />
                Importar
              </button>
            </div>

            {view === 'import' ? (
              <div className="space-y-6">
                <div className="rounded-2xl bg-blue-50 border-2 border-dashed border-blue-200 p-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-700 text-white mb-4 shadow-lg shadow-blue-900/20">
                    <FileUp className="w-8 h-8" />
                  </div>
                  
                  <h3 className="font-bold text-slate-800 mb-2">Importar Transações</h3>
                  <p className="text-sm text-slate-600 mb-6">
                    Carrega um ficheiro PDF, Excel ou CSV — a IA lê, separa por data e categoria, e importa tudo automaticamente
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.csv,.xls,.xlsx"
                    onChange={handleFileImport}
                    className="hidden"
                    disabled={isImporting}
                  />

                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className="w-full h-12 bg-blue-700 hover:bg-blue-800 rounded-xl"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        A processar...
                      </>
                    ) : (
                      <>
                        <FileUp className="mr-2 h-5 w-5" />
                        Escolher Ficheiro
                      </>
                    )}
                  </Button>
                </div>

                <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                  <h4 className="font-semibold text-blue-900 text-sm mb-2">ℹ️ Formatos Suportados</h4>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• <strong>PDF:</strong> Extratos ou documentos com transações</li>
                    <li>• <strong>Excel:</strong> Ficheiros .xls ou .xlsx</li>
                    <li>• <strong>CSV:</strong> Ficheiros .csv exportados do homebanking</li>
                  </ul>
                </div>
              </div>
            ) : (
              <>
                {/* Type Toggle */}
                <div className="flex gap-2 p-1 rounded-xl bg-slate-100 mb-6">
                  <button
                    type="button"
                    onClick={() => { setType('expense'); setFormData({...formData, category: ''}); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
                      type === 'expense' 
                        ? 'bg-white text-rose-600 shadow-sm' 
                        : 'text-slate-500'
                    }`}
                  >
                    <Minus className="h-4 w-4" />
                    Despesa
                  </button>
                  <button
                    type="button"
                    onClick={() => { setType('income'); setFormData({...formData, category: ''}); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
                      type === 'income' 
                        ? 'bg-white text-emerald-600 shadow-sm' 
                        : 'text-slate-500'
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                    Receita
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-base font-bold text-slate-800 mb-2">Descrição</label>
                <Input
                  value={formData.title}
                  onChange={(e) => { setFormData({...formData, title: e.target.value}); setErrors(p => ({...p, title: ''})); }}
                  placeholder="Para que foi?"
                  className={`h-14 rounded-xl text-base ${errors.title ? 'border-rose-400' : 'border-slate-200'}`}
                />
                {errors.title && <p className="text-xs text-rose-500 mt-1">{errors.title}</p>}
              </div>

              <div>
                <Label className="text-slate-700">Valor</Label>
                <div className="relative mt-1.5">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">€</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => { setFormData({...formData, amount: e.target.value}); setErrors(p => ({...p, amount: ''})); }}
                    onWheel={(e) => e.target.blur()}
                    placeholder="0.00"
                    className={`h-12 pl-8 rounded-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${errors.amount ? 'border-rose-400' : 'border-slate-200'}`}
                  />
                </div>
                {errors.amount && <p className="text-xs text-rose-500 mt-1">{errors.amount}</p>}
              </div>

              <div>
                <Label className="text-slate-700">Categoria</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => { setFormData({...formData, category: value}); setErrors(p => ({...p, category: ''})); }}
                >
                  <SelectTrigger className={`mt-1.5 h-12 rounded-xl ${errors.category ? 'border-rose-400' : 'border-slate-200'}`}>
                    <SelectValue placeholder="Selecionar categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-xs text-rose-500 mt-1">{errors.category}</p>}
              </div>

              <div>
                <Label className="text-slate-700">Data</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="mt-1.5 h-12 rounded-xl border-slate-200"
                  required
                />
              </div>

              <div>
                <Label className="text-slate-700">Notas (opcional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Adicionar detalhes..."
                  className="mt-1.5 rounded-xl border-slate-200"
                  rows={2}
                />
              </div>

                  <Button 
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full h-14 rounded-xl text-lg font-semibold ${
                      type === 'income' 
                        ? 'bg-emerald-600 hover:bg-emerald-700' 
                        : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                  >
                    {isSubmitting ? 'A guardar...' : `Adicionar ${type === 'income' ? 'Receita' : 'Despesa'}`}
                  </Button>
                </form>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}