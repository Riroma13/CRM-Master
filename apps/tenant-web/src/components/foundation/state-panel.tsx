import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type State = 'loading' | 'empty' | 'filtered-empty' | 'error';

interface StatePanelProps {
  state: State;
  label?: string;
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function StatePanel({ state, label = 'content', title, description, onRetry, className }: StatePanelProps) {
  if (state === 'loading') {
    return (
      <div className={cn('space-y-3 rounded-lg border border-[#E2E8F0] bg-white p-5', className)} role="status" aria-label={`Loading ${label}`}>
        <span className="sr-only">Loading {label}</span>
        <div className="h-4 w-2/5 animate-pulse rounded bg-[#E4E2E4]" />
        <div className="h-4 w-full animate-pulse rounded bg-[#E4E2E4]" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-[#E4E2E4]" />
      </div>
    );
  }

  const isError = state === 'error';
  return (
    <div
      className={cn('rounded-lg border border-[#E2E8F0] bg-white p-6 text-center', className)}
      role={isError ? 'alert' : 'status'}
    >
      <h2 className="text-base font-semibold text-[#1B1B1D]">{title ?? (isError ? 'Something went wrong' : 'Nothing to show')}</h2>
      {description ? <p className="mt-1 text-sm text-[#45464D]">{description}</p> : null}
      {isError && onRetry ? (
        <Button type="button" className="mt-4" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
