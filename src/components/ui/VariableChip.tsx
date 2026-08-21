import React from 'react';
import { Plus } from 'lucide-react';

interface VariableChipProps {
  name: string;
  description: string;
  onClick: (name: string) => void;
}

export const VariableChip: React.FC<VariableChipProps> = ({ name, description, onClick }) => {
  return (
    <button
      type="button"
      onClick={() => onClick(name)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30 text-xs font-mono font-medium transition-all group cursor-pointer"
      title={`Inserir variável {${name}} - ${description}`}
    >
      <Plus className="w-3.5 h-3.5 text-sky-500 group-hover:rotate-90 transition-transform" />
      <span>{`{${name}}`}</span>
      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans hidden sm:inline">({description})</span>
    </button>
  );
};
