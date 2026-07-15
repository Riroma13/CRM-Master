import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-[0.25rem] text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: 'bg-[#0F172A] text-white hover:bg-[#0F172A]/90',
        destructive: 'bg-[#EF4444] text-white hover:bg-[#EF4444]/90',
        outline: 'border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC]',
        secondary: 'bg-[#F0EDEF] text-[#1B1B1D] hover:bg-[#E4E2E4]',
        ghost: 'text-[#45464D] hover:bg-[#F0EDEF] hover:text-[#1B1B1D]',
        link: 'text-[#0F172A] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-[0.25rem] px-3 text-xs',
        lg: 'h-10 rounded-[0.25rem] px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
