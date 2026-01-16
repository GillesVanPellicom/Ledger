import React from 'react';
import { cn } from '../../utils/cn';
import { BackgroundGradientAnimation } from './background-gradient-animation';
import { useSettingsStore } from '../../store/useSettingsStore';

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
  const theme = useSettingsStore((state) => state.settings.theme);
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const rowHeight = minHeight / 4;

  return (
    <div
      className={cn(
        'w-full',
        className
      )}
      style={{ display: 'contents' }}
    >
      {/* Shared Seamless Background: Sticky logic to match header rows exactly */}
      <div 
        className="sticky z-30 pointer-events-none" 
        style={{ 
          height: '0px', 
          top: `-${rowHeight * 2}px`,
          overflow: 'visible'
        }}
      >
        <div 
          className="absolute left-0 right-0 overflow-hidden"
          style={{ height: `${minHeight}px`, top: '0px' }}
        >
          <div className="absolute inset-0 bg-white dark:bg-black" />
          <BackgroundGradientAnimation
            gradientBackgroundStart={isDarkMode ? '#000000' : '#FFFFFF'}
            gradientBackgroundEnd={isDarkMode ? '#000000' : '#FFFFFF'}
            color="135, 94, 242"
            pointerColor="135, 94, 242"
            interactive={false}
            containerClassName="absolute inset-0 opacity-90"
          />
        </div>
      </div>

      {/* Row 1: Top 1/4 - Scrolls away */}
      <div 
        className="relative z-40" 
        style={{ height: `${rowHeight}px` }}
      >
        {/* Row 1 is empty space, background shows through from the sticky container */}
      </div>

      {/* Row 2 & 3: Middle 2/4 - Sticks to top */}
      <div 
        className="sticky top-0 z-50"
        style={{ height: `${rowHeight * 2}px` }}
      >
        <div className="absolute inset-0 overflow-hidden">
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

      {/* Row 4: Bottom 1/4 - Scrolls away */}
      <div 
        className="relative z-40" 
        style={{ height: `${rowHeight}px` }}
      >
        {/* Row 4 is empty space, background shows through from the sticky container */}
      </div>

      {/* Sticky Border Element */}
      <div 
        className="sticky z-[51] border-b border-gray-200 dark:border-gray-800 pointer-events-none"
        style={{ 
          top: `${rowHeight * 2}px`, 
          height: '0px',
        }}
      />
    </div>
  );
};
