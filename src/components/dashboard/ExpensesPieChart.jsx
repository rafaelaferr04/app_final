import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#ec4899', '#10b981', '#f97316'];

const categoryLabels = {
  salary: 'Salário', freelance: 'Freelance', investment: 'Investimento',
  gift: 'Presente', food: 'Alimentação', transport: 'Transporte',
  housing: 'Habitação', utilities: 'Contas', entertainment: 'Lazer',
  shopping: 'Compras', health: 'Saúde', education: 'Educação',
  savings: 'Poupança', other: 'Outros'
};

export default function ExpensesPieChart({ transactions }) {
  const expenses = transactions.filter(t => t.type === 'expense');

  const expensesByCategory = expenses.reduce((acc, t) => {
    const cat = t.category || 'other';
    acc[cat] = (acc[cat] || 0) + t.amount;
    return acc;
  }, {});

  const chartData = Object.entries(expensesByCategory)
    .map(([category, amount]) => ({
      name: categoryLabels[category] || category,
      value: amount,
      category
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const totalExpenses = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white p-3 sm:p-4 shadow-sm border border-slate-100/80 flex flex-col min-h-[160px] sm:min-h-[200px]"
    >
      <h3 className="text-[11px] sm:text-sm font-semibold text-slate-700 mb-2 leading-tight shrink-0">
        Despesas por Categoria
      </h3>

      {chartData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[10px] text-slate-400 text-center">Sem despesas registadas</p>
        </div>
      ) : (
        /* Mobile: flex-col (pie top, labels below) | sm+: flex-row (pie left, labels right) */
        <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 flex-1 min-h-0">

          {/* Pie — tall on mobile, side on sm+ */}
          <div className="h-[160px] sm:h-auto sm:w-36 md:w-48 shrink-0 sm:self-stretch">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius="55%"
                  outerRadius="90%"
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Labels */}
          <div className="flex-1 flex flex-col justify-center space-y-[3px] sm:space-y-1 min-w-0">
            {chartData.map((item, index) => {
              const pct = totalExpenses > 0
                ? ((item.value / totalExpenses) * 100).toFixed(0)
                : 0;
              return (
                <div key={item.category} className="flex items-center justify-between gap-1 min-w-0">
                  <div className="flex items-center gap-1 min-w-0">
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-[9px] sm:text-[10px] text-slate-600 truncate">{item.name}</span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-700 shrink-0 ml-1">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
