import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'frosted' | 'transparent';
}

const Card: React.FC<CardProps> = ({ className, children, variant = 'default', ...props }) => {
  const baseClasses = "rounded-lg text-font-1";
  
  const variantClasses = {
    default: "border border-border bg-bg-2 shadow-md",
    transparent: "p-4 border border-border rounded-xl space-y-4",
    frosted: "bg-bg-2/50 backdrop-blur-md border border-border shadow-md"
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
