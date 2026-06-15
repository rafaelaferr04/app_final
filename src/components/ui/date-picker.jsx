import * as React from 'react';
import ReactDatePicker, { registerLocale } from 'react-datepicker';
import { pt } from 'date-fns/locale';
import { format, isValid } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';

registerLocale('pt', pt);

/**
 * DatePicker — input DD/MM/AAAA + calendário com seletor de mês/ano.
 * Props:
 *   value: string YYYY-MM-DD  (ou '')
 *   onChange: (isoString: string) => void
 *   wrapperClassName?: string  — classe aplicada ao wrapper (ex: "mt-1.5")
 */
export function DatePicker({ value, onChange, wrapperClassName }) {
  const selected = value && isValid(new Date(value + 'T12:00:00'))
    ? new Date(value + 'T12:00:00')
    : null;

  const handleChange = (date) => {
    onChange(date && isValid(date) ? format(date, 'yyyy-MM-dd') : '');
  };

  return (
    <ReactDatePicker
      selected={selected}
      onChange={handleChange}
      dateFormat="dd/MM/yyyy"
      locale="pt"
      showMonthDropdown
      showYearDropdown
      dropdownMode="select"
      placeholderText="DD/MM/AAAA"
      className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
      wrapperClassName={`w-full ${wrapperClassName ?? ''}`}
      calendarClassName="rounded-xl shadow-lg border border-slate-200 font-sans"
      autoComplete="off"
    />
  );
}
