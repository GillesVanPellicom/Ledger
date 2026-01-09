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
  contentClassName?: string;
  minHeight?: number;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  backButton,
  actions,
  children,
  className,
  contentClassName,
  minHeight = 170,
}) => {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden border-b border-gray-200 dark:border-gray-800',
        className
      )}
    >
      <BackgroundGradientAnimation
        gradientBackgroundStart="#000000"
        gradientBackgroundEnd="#000000"
        firstColor="135, 94, 242"
        secondColor="135, 94, 242"
        thirdColor="135, 94, 242"
        fourthColor="135, 94, 242"
        fifthColor="135, 94, 242"
        pointerColor="135, 94, 242"
        interactive={false}
        style={{ height: `${minHeight}px` }}
      />

      {/* Content */}
      <div
        className="relative backdrop-blur-md flex items-center"
        style={{ minHeight: `${minHeight}px` }}
      >
        <div className="w-full px-[100px]">
          <div className="relative flex items-center justify-between w-full">
            <div className="flex items-center">
              {backButton && (
                <div className="absolute right-full mr-4">{backButton}</div>
              )}
              <div>
                <h1 className="text-2xl font-bold">{title}</h1>
                {subtitle && (
                  <p className="text-sm text-gray-500">{subtitle}</p>
                )}
              </div>
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>
    </div>
  );
};