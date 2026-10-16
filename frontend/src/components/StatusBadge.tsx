import React from 'react';
import { IncidentStatus } from '../types';

interface Props {
  status: IncidentStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  const st = (status || 'OPEN').toUpperCase();

  const styles = {
    OPEN: 'bg-rose-50 text-rose-700 border-rose-200',
    INVESTIGATING: 'bg-amber-50 text-amber-700 border-amber-200',
    RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }[st] || 'bg-slate-50 text-slate-700 border-slate-200';

  const dotColors = {
    OPEN: 'bg-rose-500',
    INVESTIGATING: 'bg-amber-500',
    RESOLVED: 'bg-emerald-500',
  }[st] || 'bg-slate-400';

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono tracking-wider uppercase font-medium ${styles} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColors}`} />
      {st}
    </span>
  );
};
