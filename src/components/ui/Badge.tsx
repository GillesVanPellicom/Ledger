import React from 'react';
import { cn } from '../../utils/cn';

export type BadgeVariant = 'blue' | 'green' | 'red' | 'yellow' | 'gray';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'blue', className }) => {
  const variants = {
    blue: 'text-blue border-blue',
    green: 'text-green border-green',
    red: 'text-red border-red',
    yellow: 'text-yellow border-yellow',
    gray: 'text-text-disabled border-text-disabled',
  };

  return (
    <span
      className={cn(
        'px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border backdrop-blur-md',
        variants[variant],
        className
      )}
      style={{ backgroundColor: 'color-mix(in srgb, currentColor, transparent 92%)' }}
    >
      {children}
    </span>
  );
};

export default Badge;
