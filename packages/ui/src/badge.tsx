import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-[0.25rem] border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[#F0EDEF] text-[#45464D]',
        secondary: 'border-transparent bg-[#D5E3FD] text-[#57657B]',
        destructive: 'border-transparent bg-[#FFDAD6] text-[#93000A]',
        success: 'border-transparent bg-[#D1FAE5] text-[#065F46]',
        warning: 'border-transparent bg-[#FEF3C7] text-[#92400E]',
        critical: 'border-transparent bg-[#FEE2E2] text-[#991B1B]',
        outline: 'text-[#45464D] border-[#E2E8F0]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
