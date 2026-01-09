import React from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  backButton?: React.ReactNode;
  actions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, backButton, actions }) => {
  return (
    <div className="flex items-center justify-between w-full px-4" style={{ minHeight: '140px' }}>
      <div className="flex items-center">
        {backButton}
        <div className="flex flex-col ml-4">
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>
      <div>{actions}</div>
    </div>
  );
};
