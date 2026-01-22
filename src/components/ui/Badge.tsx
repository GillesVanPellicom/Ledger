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
    blue: 'bg-blue/10 text-blue border-blue/30',
    green: 'bg-green/10 text-green border-green/30',
    red: 'bg-red/10 text-red border-red/30',
    yellow: 'bg-yellow/10 text-yellow border-yellow/30',
    gray: 'bg-text-disabled/10 text-text-disabled border-text-disabled/30',
  };

  return (
    <span
      className={cn(
        'px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border backdrop-blur-sm',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
};

export default Badge;
