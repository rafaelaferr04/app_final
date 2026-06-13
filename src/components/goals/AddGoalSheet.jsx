import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const goalIcons = ['🏠', '🚗', '✈️', '💍', '🎓', '💻', '📱', '🏖️', '🎯', '💰', '🎁', '🏥'];

export default function AddGoalSheet({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    target_amount: '',
    current_amount: '0',
    deadline: '',
    icon: '🎯',
    priority: 'medium'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.target_amount) return;
    
    setIsSubmitting(true);
    await onSave({
      ...formData,
      target_amount: parseFloat(formData.target_amount),
      current_amount: parseFloat(formData.current_amount) || 0
    });
    setIsSubmitting(false);
    setFormData({ title: '', target_amount: '', current_amount: '0', deadline: '', icon: '🎯', priority: 'medium' });
    onClose();
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
              <h2 className="text-xl font-bold text-slate-800">Nova Meta de Poupança</h2>
              <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-slate-700">Escolhe um Ícone</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {goalIcons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({...formData, icon})}
                      className={`h-12 w-12 rounded-xl text-2xl flex items-center justify-center transition-all ${
                        formData.icon === icon 
                          ? 'bg-blue-100 ring-2 ring-blue-600' 
                          : 'bg-slate-100 hover:bg-slate-200'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-slate-700">Nome da Meta</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Ex: Fundo de Emergência, Férias"
                  className="mt-1.5 h-12 rounded-xl border-slate-200"
                  required
                />
              </div>

              <div>
                <Label className="text-slate-700">Valor Objetivo</Label>
                <div className="relative mt-1.5">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">€</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.target_amount}
                    onChange={(e) => setFormData({...formData, target_amount: e.target.value})}
                    placeholder="10.000"
                    className="h-12 pl-8 rounded-xl border-slate-200"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-700">Já Poupado (opcional)</Label>
                <div className="relative mt-1.5">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">€</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.current_amount}
                    onChange={(e) => setFormData({...formData, current_amount: e.target.value})}
                    placeholder="0"
                    className="h-12 pl-8 rounded-xl border-slate-200"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-700">Data Limite (opcional)</Label>
                <Input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                  className="mt-1.5 h-12 rounded-xl border-slate-200"
                />
              </div>

              <div>
                <Label className="text-slate-700">Prioridade</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value) => setFormData({...formData, priority: value})}
                >
                  <SelectTrigger className="mt-1.5 h-12 rounded-xl border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit"
                disabled={isSubmitting}
                className="w-full h-14 rounded-xl text-lg font-semibold bg-blue-700 hover:bg-blue-800"
              >
                {isSubmitting ? 'A criar...' : 'Criar Meta'}
              </Button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}