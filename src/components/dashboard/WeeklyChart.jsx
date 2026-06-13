import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from 'recharts';
import { subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

const DAY_NAMES = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export default function WeeklyChart({ transactions }) {
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayExpenses = transactions
      .filter(t =>
        t.type === 'expense' &&
        t.date &&
        isWithinInterval(new Date(t.date), { start: startOfDay(date), end: endOfDay(date) })
      )
      .reduce((sum, t) => sum + t.amount, 0);
    return { name: DAY_NAMES[date.getDay()], value: dayExpenses, isToday: i === 6 };
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white p-3 sm:p-4 shadow-sm border border-slate-100 flex flex-col min-h-[160px] sm:min-h-[200px]"
    >
      <h3 className="text-[11px] sm:text-sm font-semibold text-slate-700 mb-2 leading-tight shrink-0">
        Gastos da Semana
      </h3>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeklyData} barCategoryGap="25%">
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fill: '#94a3b8' }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {weeklyData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isToday ? '#8b5cf6' : '#c4b5fd'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
