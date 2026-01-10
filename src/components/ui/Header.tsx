import React from 'react';
import { cn } from '../../utils/cn';
import { BackgroundGradientAnimation } from './background-gradient-animation';

interface HeaderProps {
  title: string;
  subtitle?: string;
  backButton?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  minHeight?: number;
  variant?: 'default' | 'centered-box' | 'three-boxes' | 'two-boxes' | 'tabs';
  centeredContent?: React.ReactNode;
  leftBoxContent?: React.ReactNode;
  rightBoxContent?: React.ReactNode;
  tabs?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  backButton,
  actions,
  children,
  className,
  minHeight = 170,
  variant = 'default',
  centeredContent,
  leftBoxContent,
  rightBoxContent,
  tabs,
}) => {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden border-b border-gray-200 dark:border-gray-800',
        className
      )}
      style={{ minHeight: `${minHeight}px` }}
    >
      <BackgroundGradientAnimation
        gradientBackgroundStart="#000000"
        gradientBackgroundEnd="#000000"
        color="135, 94, 242"
        pointerColor="135, 94, 242"
        interactive={false}
        containerClassName="absolute inset-0"
      />

      <div className="absolute inset-0 backdrop-blur-md">
        {variant === 'centered-box' && (
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-1/6 h-full flex items-center justify-center">
            {centeredContent}
          </div>
        )}

        {variant === 'three-boxes' && (
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-1/2 h-full flex">
            <div className="w-1/3 h-full flex items-center justify-center">
              {leftBoxContent}
            </div>
            <div className="w-1/3 h-full flex items-center justify-center">
              {centeredContent}
            </div>
            <div className="w-1/3 h-full flex items-center justify-center">
              {rightBoxContent}
            </div>
          </div>
        )}

        {variant === 'two-boxes' && (
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-1/3 h-full flex">
            <div className="w-1/2 h-full flex items-center justify-center">
              {leftBoxContent}
            </div>
            <div className="w-1/2 h-full flex items-center justify-center">
              {rightBoxContent}
            </div>
          </div>
        )}

        <div className="relative w-full h-full flex items-center justify-between px-[100px]">
          <div className="relative flex items-baseline gap-8">
            {backButton && (
              <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2">
                {backButton}
              </div>
            )}
            <div className="flex items-baseline gap-8">
              <div className="relative">
                <h1 className="text-2xl font-bold">{title}</h1>
                {subtitle && (
                  <p className="absolute top-full left-0 text-sm text-gray-500 whitespace-nowrap">{subtitle}</p>
                )}
              </div>
              {variant === 'tabs' ? tabs : children}
            </div>
          </div>

          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
};
