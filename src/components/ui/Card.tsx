import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'frosted';
}

const Card: React.FC<CardProps> = ({ className, children, variant = 'default', ...props }) => {
  const baseClasses = "rounded-lg text-gray-950 dark:text-gray-50";
  
  const variantClasses = {
    default: "border border-gray-200 dark:border-gray-800 bg-neutral-50 dark:bg-zinc-950 shadow-md",
    transparent: "p-4 border border-gray-200 dark:border-gray-800 rounded-xl space-y-4",
    frosted: "bg-neutral-100 dark:bg-white/10 backdrop-blur-md border border-white/20 shadow-md"
  };

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
