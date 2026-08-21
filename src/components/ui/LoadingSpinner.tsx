import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner: React.FC<{ label?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  label = 'Carregando dados da SYNTECH DC...',
  size = 'md',
}) => {
  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }[size];

  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-3">
      <Loader2 className={`${sizeClass} animate-spin text-sky-500`} />
      {label && <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>}
    </div>
  );
};
