import React from 'react';
import { cn } from '../../utils/cn';
import { BackgroundGradientAnimation } from '../../components/ui/background-gradient-animation';
import { useSettingsStore } from '../../store/useSettingsStore';

interface WizardHeaderProps {
  title?: string;
  subtitle?: string;
  backButton?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  minHeight?: number;
  variant?: 'default' | 'centered-box';
  centeredContent?: React.ReactNode;
}

export const WizardHeader: React.FC<WizardHeaderProps> = ({
  title,
  subtitle,
  backButton,
  actions,
  children,
  className,
  minHeight = 170,
  variant = 'default',
  centeredContent,
}) => {
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
          <div className="absolute inset-0 bg-bg" />
          <BackgroundGradientAnimation
            gradientBackgroundStart="var(--color-bg)"
            gradientBackgroundEnd="var(--color-bg)"
            color="135, 94, 242"
            pointerColor="135, 94, 242"
            // interactive={false} // Removed interactive prop
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

          <div className="relative w-full h-full flex items-center justify-between px-[100px]">
            <div className="relative flex items-center gap-8">
              <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2">
                {backButton}
              </div>
              <div className="flex items-center gap-8">
                <div className="relative">
                  {title && <h1 className="text-2xl font-bold text-font-1">{title}</h1>}
                  {subtitle && (
                    <p className="absolute top-full left-0 text-sm text-font-2 whitespace-nowrap">{subtitle}</p>
                  )}
                </div>
                {children}
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
        className="sticky z-40 border-b border-border pointer-events-none"
        style={{ 
          top: `${rowHeight * 2}px`, 
          height: '0px',
        }}
      />
    </div>
  );
};
