import { useState } from 'react';
import { FileDown, Loader2, Check, AlertCircle } from 'lucide-react';
import type { InterestItem } from '../types';

interface ExportToObsidianButtonProps {
  item: InterestItem;
  onExport: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

/**
 * Button to export a single interest to Obsidian
 * Shows loading state and success/error feedback
 */
export function ExportToObsidianButton({
  item,
  onExport,
  disabled = false,
  size = 'sm',
}: ExportToObsidianButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (disabled || status === 'loading') return;

    setStatus('loading');

    try {
      await onExport();
      setStatus('success');

      // Reset after showing success
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const padding = size === 'sm' ? 'p-1.5' : 'p-2';

  const Icon = {
    idle: FileDown,
    loading: Loader2,
    success: Check,
    error: AlertCircle,
  }[status];

  const colorClass = {
    idle: 'text-gray-400 hover:text-purple-600',
    loading: 'text-purple-500',
    success: 'text-green-500',
    error: 'text-red-500',
  }[status];

  const title = {
    idle: item.obsidianPath ? 'Re-export to Obsidian' : 'Export to Obsidian',
    loading: 'Exporting...',
    success: 'Exported!',
    error: 'Export failed',
  }[status];

  return (
    <button
      onClick={handleClick}
      disabled={disabled || status === 'loading'}
      className={`${padding} ${colorClass} rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
      title={disabled ? 'Obsidian not connected' : title}
    >
      <Icon className={`${iconSize} ${status === 'loading' ? 'animate-spin' : ''}`} />
    </button>
  );
}

export default ExportToObsidianButton;
