import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'blue' | 'emerald' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gold';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'blue',
      size = 'sm',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    // Base styles: squircle geometry, tactile press scaling, heavy font weight, and accessible focus
    const baseStyles =
      'inline-flex items-center justify-center font-extrabold select-none transition-all duration-150 ease-out cursor-pointer active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

    // Visual variants matching the requested squircle & stroke design
    const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
      // 1. Royal Sapphire Blue (exact match to user's uploaded buttons)
      blue: 'bg-[#0062BA] hover:bg-[#00529E] active:bg-[#004687] text-white border border-[#00488A]/40 shadow-xs focus-visible:ring-[#0062BA]/50',

      // 2. Akwaaba Signature Forest Emerald
      emerald: 'bg-[#0F5132] hover:bg-[#0A3D24] active:bg-[#08301C] text-white border border-[#062415]/40 shadow-xs focus-visible:ring-[#0F5132]/50',

      // 3. Secondary Filled Neutral
      secondary:
        'bg-zinc-100 dark:bg-zinc-800/90 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 shadow-2xs focus-visible:ring-zinc-400',

      // 4. Clean Outline
      outline:
        'bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 focus-visible:ring-zinc-400',

      // 5. Minimal Ghost
      ghost:
        'bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white border border-transparent focus-visible:ring-zinc-400',

      // 6. Danger / Destructive
      danger: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white border border-rose-900/30 shadow-xs focus-visible:ring-rose-500',

      // 7. Gold / Host Premium
      gold: 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-zinc-950 border border-amber-700/30 shadow-xs focus-visible:ring-amber-400',
    };

    // Sizing scales (sm: 36px height)
    const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
      sm: 'h-9 px-4 text-xs rounded-xl gap-2',
      md: 'h-11 px-5 text-sm rounded-xl gap-2',
      lg: 'h-12 px-6 text-base rounded-2xl gap-2.5',
      icon: 'h-9 w-9 p-0 rounded-xl',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
