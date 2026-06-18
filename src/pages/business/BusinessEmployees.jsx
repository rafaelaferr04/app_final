import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, Users, Building2, Star, X, Loader2, Upload, ArrowUpDown, ChevronUp, ChevronDown, SlidersHorizontal, KeyRound, Eye, EyeOff } from 'lucide-react';
import ImportEmployeesModal from '@/components/business/ImportEmployeesModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { usePlan, hashPassword } from '@/lib/PlanContext';

// ─── Employee Modal ───────────────────────────────────────────────
function EmployeeModal({ isOpen, onClose, onSave, editEmp, departments }) {
  const { businessId, isBusinessAdmin } = usePlan();
  const empty = () => ({ name: '', role: '', department: '', hire_date: '', salary: '', status: 'active', satisfaction_score: '', courses_completed: 0 });
  const [form, setForm] = useState(empty());
  const [bizUsername, setBizUsername] = useState('');
  const [bizPassword, setBizPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [updateSalary, setUpdateSalary] = useState(false);
  const [salaryEffectiveDate, setSalaryEffectiveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (editEmp) {
      setForm({ name: editEmp.name || '', role: editEmp.role || '', department: editEmp.department || '', hire_date: editEmp.hire_date || '', salary: editEmp.salary ?? '', status: editEmp.status || 'active', satisfaction_score: editEmp.satisfaction_score ?? '', courses_completed: editEmp.courses_completed || 0 });
    } else {
      setForm(empty());
      setBizUsername('');
      setBizPassword('');
    }
    setUpdateSalary(false);
    setSalaryEffectiveDate(new Date().toISOString().split('T')[0]);
  }, [editEmp, isOpen]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Nome obrigatório');
    if (!form.hire_date) return toast.error('Data de entrada obrigatória');
    setSaving(true);
    try {
      await onSave(
        { ...form, salary: form.salary !== '' ? parseFloat(form.salary) : null, satisfaction_score: form.satisfaction_score !== '' ? parseFloat(form.satisfaction_score) : null },
        editEmp?.id,
        { bizUsername: bizUsername.trim(), bizPassword, updateSalary, salaryEffectiveDate }
      );
    } finally {
      setSaving(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[75] flex items-start justify-center pt-4 sm:pt-10 px-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-y-auto max-h-[88vh] p-5 z-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">{editEmp ? 'Editar Colaborador' : 'Novo Colaborador'}</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Nome *</Label>
                  <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nome completo" className="mt-1.5 h-11 rounded-xl" />
                </div>
                <div>
                  <Label>Cargo / Função</Label>
                  <Input value={form.role} onChange={e => set('role', e.target.value)} placeholder="Ex: Gestor de Projeto" className="mt-1.5 h-11 rounded-xl" />
                </div>
                <div>
                  <Label>Departamento</Label>
                  <select value={form.department} onChange={e => set('department', e.target.value)} className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <option value="">— Nenhum —</option>
                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Data de Entrada *</Label>
                  <Input type="date" value={form.hire_date} onChange={e => set('hire_date', e.target.value)} className="mt-1.5 h-11 rounded-xl" />
                </div>
                <div>
                  <Label>Estado</Label>
                  <select value={form.status} onChange={e => set('status', e.target.value)} className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                    <option value="leave">Licença</option>
                  </select>
                </div>
                <div>
                  <Label>Salário Bruto Mensal (€)</Label>
                  <Input type="number" value={form.salary} onChange={e => set('salary', e.target.value)} placeholder="0.00" className="mt-1.5 h-11 rounded-xl" />
                </div>
                <div>
                  <Label>Score de Satisfação (0–5)</Label>
                  <Input type="number" min="0" max="5" step="0.1" value={form.satisfaction_score} onChange={e => set('satisfaction_score', e.target.value)} placeholder="Ex: 4.2" className="mt-1.5 h-11 rounded-xl" />
                </div>
              </div>

              {/* Salary update — only when editing */}
              {editEmp && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={updateSalary} onChange={e => setUpdateSalary(e.target.checked)}
                      className="w-4 h-4 rounded accent-amber-600 cursor-pointer" />
                    <span className="text-sm font-medium text-slate-700">Registar como atualização salarial</span>
                  </label>
                  <p className="text-xs text-slate-400 leading-relaxed">Assinala se o salário mudou intencionalmente. Assim os cálculos financeiros usam o valor correto a partir dessa data.</p>
                  {updateSalary && (
                    <div>
                      <Label className="text-xs text-slate-600">Data de entrada em vigor</Label>
                      <Input type="date" value={salaryEffectiveDate} onChange={e => setSalaryEffectiveDate(e.target.value)}
                        className="mt-1 h-9 rounded-xl text-sm" />
                    </div>
                  )}
                </div>
              )}

              {/* Business access credentials — admin only */}
              {isBusinessAdmin && (
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    <p className="text-sm font-semibold text-slate-700">Acesso ao WiseMoney Business</p>
                    <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">opcional</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">Cria credenciais para que o colaborador possa aceder à conta empresarial.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Username</Label>
                      <Input value={bizUsername} onChange={e => setBizUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                        placeholder="joao.silva" className="mt-1.5 h-11 rounded-xl" />
                    </div>
                    <div>
                      <Label className="text-xs">Password</Label>
                      <div className="relative mt-1.5">
                        <Input type={showPwd ? 'text' : 'password'} value={bizPassword} onChange={e => setBizPassword(e.target.value)}
                          placeholder="Min. 6 chars" className="h-11 rounded-xl pr-9" />
                        <button type="button" onClick={() => setShowPwd(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancelar</button>
                <Button onClick={handleSave} disabled={saving} className="flex-1 h-11 rounded-xl bg-amber-600 hover:bg-amber-700 font-semibold">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editEmp ? 'Guardar' : 'Adicionar'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Department Modal ───────────────────────────────────────────────
function DeptModal({ isOpen, onClose, onSave, editDept }) {
  const empty = () => ({ name: '', budget_monthly: '', manager: '' });
  const [form, setForm] = useState(empty());
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setForm(editDept ? { name: editDept.name || '', budget_monthly: editDept.budget_monthly ?? '', manager: editDept.manager || '' } : empty());
  }, [editDept, isOpen]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Nome obrigatório');
    setSaving(true);
    await onSave({ ...form, budget_monthly: form.budget_monthly !== '' ? parseFloat(form.budget_monthly) : 0 }, editDept?.id);
    setSaving(false); onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center px-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-5 z-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">{editDept ? 'Editar Departamento' : 'Novo Departamento'}</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              <div><Label>Nome *</Label><Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Marketing" className="mt-1.5 h-11 rounded-xl" /></div>
              <div><Label>Gestor Responsável</Label><Input value={form.manager} onChange={e => set('manager', e.target.value)} placeholder="Nome do responsável" className="mt-1.5 h-11 rounded-xl" /></div>
              <div><Label>Orçamento Mensal (€)</Label><Input type="number" value={form.budget_monthly} onChange={e => set('budget_monthly', e.target.value)} placeholder="0.00" className="mt-1.5 h-11 rounded-xl" /></div>
              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancelar</button>
                <Button onClick={handleSave} disabled={saving} className="flex-1 h-11 rounded-xl bg-amber-600 hover:bg-amber-700 font-semibold">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editDept ? 'Guardar' : 'Criar'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Team Picker ──────────────────────────────────────────────────────────────
function TeamPicker({ isOpen, onClose, onEmployee, onDept, onImport }) {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
          className="relative bg-white rounded-2xl p-5 w-full max-w-sm z-10 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="font-semibold text-slate-800">Adicionar à Equipa</p>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <button onClick={() => { onClose(); onEmployee(); }}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50 transition-colors text-left">
            <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">Novo Colaborador</p>
              <p className="text-xs text-slate-400">Adicionar membro à equipa</p>
            </div>
          </button>
          <button onClick={() => { onClose(); onDept(); }}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-colors text-left">
            <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">Novo Departamento</p>
              <p className="text-xs text-slate-400">Criar e organizar por área</p>
            </div>
          </button>
          <button onClick={() => { onClose(); onImport(); }}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors text-left">
            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">Importar Ficheiro</p>
              <p className="text-xs text-slate-400">CSV com colaboradores ou departamentos</p>
            </div>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ─── Main Page ───────────────────────────────────────────────────
export default function BusinessEmployees() {
  const qc = useQueryClient();
  const [teamPicker, setTeamPicker] = useState(false);
  const [empModal, setEmpModal] = useState(false);
  const [deptModal, setDeptModal] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [importTab, setImportTab] = useState('employees');
  const [editEmp, setEditEmp] = useState(null);
  const [editDept, setEditDept] = useState(null);
  const [activeTab, setActiveTab] = useState('employees');
  const [deptFilter, setDeptFilter] = useState('all');
  const [empSort, setEmpSort] = useState({ field: null, dir: 'asc' });
  const [deptSort, setDeptSort] = useState({ field: null, dir: 'asc' });

  const { data: employees = [] } = useQuery({ queryKey: ['employees_all'], queryFn: () => base44.entities.Employee.filter() });
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: () => base44.entities.Department.filter() });

  const toggleEmpSort = (field) => setEmpSort(prev =>
    prev.field === field ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' }
  );
  const toggleDeptSort = (field) => setDeptSort(prev =>
    prev.field === field ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' }
  );

  // Employees scoped to the active department filter (used for both the list and the top stats)
  const statEmps = useMemo(() =>
    deptFilter === 'all' ? employees : employees.filter(e => e.department === deptFilter),
    [employees, deptFilter]);

  const filtered = useMemo(() => {
    let list = [...statEmps];
    if (empSort.field) {
      list.sort((a, b) => {
        const aVal = a[empSort.field] ?? (empSort.field === 'hire_date' ? '' : -Infinity);
        const bVal = b[empSort.field] ?? (empSort.field === 'hire_date' ? '' : -Infinity);
        if (empSort.field === 'hire_date') return empSort.dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        return empSort.dir === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }
    return list;
  }, [statEmps, empSort]);

  const avgSatisfaction = useMemo(() => {
    const active = statEmps.filter(e => e.status === 'active' && e.satisfaction_score != null);
    return active.length > 0 ? (active.reduce((s, e) => s + e.satisfaction_score, 0) / active.length).toFixed(1) : '—';
  }, [statEmps]);

  const totalSalaryCost = useMemo(() =>
    statEmps.filter(e => e.status === 'active').reduce((s, e) => s + (e.salary || 0), 0),
    [statEmps]);

  const handleSaveEmp = async (data, id, { bizUsername, bizPassword, updateSalary, salaryEffectiveDate } = {}) => {
    const me = await base44.auth.me();
    let emp;
    if (id) {
      await base44.entities.Employee.update(id, data);
      emp = { id, ...data };
      toast.success('Colaborador atualizado');
    } else {
      emp = await base44.entities.Employee.create({ ...data, created_by: me.email });
      toast.success('Colaborador adicionado');
    }

    // Record salary history if explicitly requested (edit only)
    if (id && updateSalary && data.salary != null && salaryEffectiveDate) {
      try {
        await base44.entities.SalaryHistory.create({
          employee_id: id,
          salary: data.salary,
          effective_date: salaryEffectiveDate,
        });
        qc.invalidateQueries({ queryKey: ['salary_history'] });
      } catch (e) {
        toast.error('Erro ao guardar histórico salarial');
      }
    }

    // Create/update business member credentials if provided
    if (bizUsername && bizPassword && bizPassword.length >= 6) {
      try {
        const pwdHash = await hashPassword(bizPassword);
        const businessId = localStorage.getItem('wm_business_id');
        if (businessId) {
          // Check if a member record already exists for this username
          const existing = await base44.entities.BusinessMember.filter({ business_id: businessId, member_username: bizUsername });
          if (existing.length > 0) {
            await base44.entities.BusinessMember.update(existing[0].id, { member_password: pwdHash, display_name: data.name, is_active: true });
          } else {
            await base44.entities.BusinessMember.create({ business_id: businessId, member_username: bizUsername, member_password: pwdHash, display_name: data.name, role: 'member', is_active: true });
          }
          toast.success(`Acesso criado para @${bizUsername}`);
        }
      } catch (e) {
        toast.error('Erro ao criar credenciais: ' + (e.message || ''));
      }
    }

    qc.invalidateQueries({ queryKey: ['employees_all'] });
    qc.invalidateQueries({ queryKey: ['employees'] });
    setEditEmp(null);
  };

  const handleSaveDept = async (data, id) => {
    const me = await base44.auth.me();
    if (id) { await base44.entities.Department.update(id, data); toast.success('Departamento atualizado'); }
    else { await base44.entities.Department.create({ ...data, created_by: me.email }); toast.success('Departamento criado'); }
    qc.invalidateQueries({ queryKey: ['departments'] });
    setEditDept(null);
  };

  const handleDeleteEmp = async (id) => { await base44.entities.Employee.delete(id); qc.invalidateQueries({ queryKey: ['employees_all'] }); qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Eliminado'); };
  const handleDeleteDept = async (id) => { await base44.entities.Department.delete(id); qc.invalidateQueries({ queryKey: ['departments'] }); toast.success('Eliminado'); };

  const STATUS_LABEL = { active: 'Ativo', inactive: 'Inativo', leave: 'Licença' };
  const STATUS_COLOR = { active: 'text-emerald-700 bg-emerald-50', inactive: 'text-slate-500 bg-slate-100', leave: 'text-amber-700 bg-amber-50' };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Equipa</h1>
        <button onClick={() => setTeamPicker(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" /> Adicionar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { l: 'Colaboradores Ativos', v: statEmps.filter(e => e.status === 'active').length, icon: '👥' },
          { l: 'Satisfação Média', v: `${avgSatisfaction}/5`, icon: '⭐' },
          { l: 'Custo Mensal Total', v: `€${totalSalaryCost.toLocaleString('pt-PT')}`, icon: '💼' },
        ].map(s => (
          <div key={s.l} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <p className="text-xl font-bold text-slate-900">{s.v}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.l}</p>
            {deptFilter !== 'all' && <p className="text-[10px] text-amber-600 font-medium mt-0.5 truncate">{deptFilter}</p>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
        {[{ k: 'employees', l: 'Colaboradores' }, { k: 'departments', l: 'Departamentos' }].map(t => (
          <button key={t.k} onClick={() => setActiveTab(t.k)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === t.k ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Employees tab */}
      {activeTab === 'employees' && (
        <div className="space-y-3">
          {/* Dept filter */}
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setDeptFilter('all')} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${deptFilter === 'all' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Todos</button>
            {departments.map(d => (
              <button key={d.id} onClick={() => setDeptFilter(deptFilter === d.name ? 'all' : d.name)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${deptFilter === d.name ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {d.name}
              </button>
            ))}
          </div>
          {/* Sort buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-400 flex items-center gap-1"><SlidersHorizontal className="w-3 h-3" /> Ordenar:</span>
            {[
              { field: 'salary', label: 'Salário' },
              { field: 'hire_date', label: 'Data Entrada' },
              { field: 'satisfaction_score', label: 'Score' },
            ].map(({ field, label }) => {
              const active = empSort.field === field;
              const SortIcon = active ? (empSort.dir === 'asc' ? ChevronUp : ChevronDown) : ArrowUpDown;
              return (
                <button key={field} onClick={() => toggleEmpSort(field)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${active ? 'bg-amber-600 text-white border-amber-600' : 'bg-white border-slate-200 text-slate-600 hover:border-amber-200'}`}>
                  <SortIcon className="w-3 h-3" />{label}
                </button>
              );
            })}
            {empSort.field && (
              <button onClick={() => setEmpSort({ field: null, dir: 'asc' })} className="text-xs text-slate-400 hover:text-slate-600 underline">limpar</button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-14 text-slate-400">
              <Users className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-slate-500 font-medium">Sem colaboradores</p>
              <button onClick={() => { setEditEmp(null); setEmpModal(true); }} className="mt-3 flex items-center gap-1 px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition-colors">
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <AnimatePresence>
                {filtered.map((emp, i) => (
                  <motion.div key={emp.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.04 }}
                    className="bg-white rounded-xl border border-slate-100 shadow-sm p-2.5 hover:border-amber-200 transition-all group">
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-sm font-bold text-amber-700 shrink-0">
                        {(emp.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditEmp(emp); setEmpModal(true); }} className="p-1 rounded-md hover:bg-slate-100 text-slate-400"><Pencil className="w-3 h-3" /></button>
                        <button onClick={() => handleDeleteEmp(emp.id)} className="p-1 rounded-md hover:bg-red-50 text-red-400"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                    <p className="text-xs font-bold text-slate-800 leading-tight truncate">{emp.name}</p>
                    <span className={`text-[9px] font-semibold px-1 py-0.5 rounded-full ${STATUS_COLOR[emp.status]}`}>{STATUS_LABEL[emp.status]}</span>
                    {emp.role && <p className="text-[10px] text-slate-500 mt-1 truncate">{emp.role}</p>}
                    {emp.department && <p className="text-[10px] text-slate-400 truncate">{emp.department}</p>}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                      <div className="min-w-0">
                        {emp.salary && <p className="text-[10px] font-semibold text-slate-600 truncate">€{Number(emp.salary).toLocaleString('pt-PT')}</p>}
                        {emp.hire_date && <p className="text-[9px] text-slate-400 truncate">{emp.hire_date.slice(0, 7)}</p>}
                      </div>
                      {emp.satisfaction_score != null && (
                        <div className="flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0">
                          <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                          <span className="text-[10px] font-bold text-amber-700">{emp.satisfaction_score}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Departments tab */}
      {activeTab === 'departments' && (
        <div className="space-y-3">
          {/* Sort buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-400 flex items-center gap-1"><SlidersHorizontal className="w-3 h-3" /> Ordenar:</span>
            {[
              { field: 'budget_monthly', label: 'Orçamento' },
              { field: 'headcount', label: 'Nº Colaboradores' },
            ].map(({ field, label }) => {
              const active = deptSort.field === field;
              const SortIcon = active ? (deptSort.dir === 'asc' ? ChevronUp : ChevronDown) : ArrowUpDown;
              return (
                <button key={field} onClick={() => toggleDeptSort(field)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${active ? 'bg-amber-600 text-white border-amber-600' : 'bg-white border-slate-200 text-slate-600 hover:border-amber-200'}`}>
                  <SortIcon className="w-3 h-3" />{label}
                </button>
              );
            })}
            {deptSort.field && (
              <button onClick={() => setDeptSort({ field: null, dir: 'asc' })} className="text-xs text-slate-400 hover:text-slate-600 underline">limpar</button>
            )}
          </div>
          {departments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-14 text-slate-400">
              <Building2 className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-slate-500 font-medium">Sem departamentos</p>
              <button onClick={() => { setEditDept(null); setDeptModal(true); }} className="mt-3 flex items-center gap-1 px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition-colors">
                <Plus className="w-4 h-4" /> Criar departamento
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {(deptSort.field ? [...departments].sort((a, b) => {
                const hcA = employees.filter(e => e.department === a.name && e.status === 'active').length;
                const hcB = employees.filter(e => e.department === b.name && e.status === 'active').length;
                const aVal = deptSort.field === 'headcount' ? hcA : (a.budget_monthly || 0);
                const bVal = deptSort.field === 'headcount' ? hcB : (b.budget_monthly || 0);
                return deptSort.dir === 'asc' ? aVal - bVal : bVal - aVal;
              }) : departments).map((dept, i) => {
                const headcount = employees.filter(e => e.department === dept.name && e.status === 'active').length;
                const totalSalary = employees.filter(e => e.department === dept.name && e.status === 'active').reduce((s, e) => s + (e.salary || 0), 0);
                const budgetUsedPct = dept.budget_monthly > 0 ? Math.min(Math.round((totalSalary / dept.budget_monthly) * 100), 100) : 0;
                return (
                  <motion.div key={dept.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="bg-white rounded-xl border border-slate-100 shadow-sm p-2.5 hover:border-amber-200 transition-all group">
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditDept(dept); setDeptModal(true); }} className="p-1 rounded-md hover:bg-slate-100 text-slate-400"><Pencil className="w-3 h-3" /></button>
                        <button onClick={() => handleDeleteDept(dept.id)} className="p-1 rounded-md hover:bg-red-50 text-red-400"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                    <p className="text-xs font-bold text-slate-800 truncate">{dept.name}</p>
                    {dept.manager && <p className="text-[10px] text-slate-500 truncate">👤 {dept.manager}</p>}
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                      <Users className="w-2.5 h-2.5" /><span>{headcount}</span>
                      {dept.budget_monthly > 0 && <span className="ml-auto font-medium text-slate-700">€{Number(dept.budget_monthly / 1000).toFixed(0)}k</span>}
                    </div>
                    {dept.budget_monthly > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-[9px] text-slate-400 mb-0.5">
                          <span>Salários</span>
                          <span className={budgetUsedPct >= 100 ? 'text-red-500 font-semibold' : ''}>{budgetUsedPct}%</span>
                        </div>
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${budgetUsedPct >= 100 ? 'bg-red-500' : budgetUsedPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${budgetUsedPct}%` }} />
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <TeamPicker
        isOpen={teamPicker}
        onClose={() => setTeamPicker(false)}
        onEmployee={() => { setEditEmp(null); setEmpModal(true); }}
        onDept={() => { setEditDept(null); setDeptModal(true); }}
        onImport={() => { setImportTab('employees'); setImportModal(true); }}
      />
      <EmployeeModal isOpen={empModal} onClose={() => { setEmpModal(false); setEditEmp(null); }} onSave={handleSaveEmp} editEmp={editEmp} departments={departments} />
      <DeptModal isOpen={deptModal} onClose={() => { setDeptModal(false); setEditDept(null); }} onSave={handleSaveDept} editDept={editDept} />
      <ImportEmployeesModal isOpen={importModal} onClose={() => setImportModal(false)} defaultTab={importTab} />
    </div>
  );
}
