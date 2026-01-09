import React from 'react';
import { cn } from '../../utils/cn';

interface HeaderProps {
  title: string;
  subtitle?: string;
  backButton?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, backButton, actions, className }) => {
  return (
    <div className={cn("relative w-full overflow-hidden border-b border-gray-200 dark:border-gray-800", className)}>
      <div
        className="absolute inset-0 bg-center bg-no-repeat"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(181, 156, 248, 0.5) 0%, rgba(199, 87, 87, 0) 40%)',
          backgroundPosition: 'center bottom',
        }}
      />
      <div className="relative flex items-center justify-between w-full px-4" style={{ minHeight: '140px' }}>
        <div className="flex items-center">
          {backButton}
          <div className={cn("flex flex-col", backButton ? "ml-4" : "")}>
            <h1 className="text-2xl font-bold">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>
        <div>{actions}</div>
      </div>
    </div>
  );
};
