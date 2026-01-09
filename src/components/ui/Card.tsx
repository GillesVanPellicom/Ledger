import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'frosted';
}

const Card: React.FC<CardProps> = ({ className, children, variant = 'default', ...props }) => {
  const baseClasses = "rounded-xl text-gray-950 dark:text-gray-50";
  
  const variantClasses = {
    default: "border border-gray-200 dark:border-gray-800 bg-white dark:bg-zinc-950 shadow-sm",
    frosted: "bg-black/10 dark:bg-white/10 backdrop-blur-md border border-white/20"
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
