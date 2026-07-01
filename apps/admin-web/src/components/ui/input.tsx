import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-1 text-sm text-[#1B1B1D]',
          'ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-[#45464D]/60',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]/20 focus-visible:border-[#0F172A]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
