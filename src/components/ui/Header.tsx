import React, { useMemo } from 'react';
import { cn } from '../../utils/cn';
import { BackgroundGradientAnimation } from './background-gradient-animation';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Button from './Button';
import Tooltip from './Tooltip';

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
  const rowHeight = minHeight / 4;
  const navigate = useNavigate();
  const location = useLocation();

  const mainRoutes = useMemo(() => ['/', '/income', '/reference-data', '/analytics', '/payment-methods', '/entities'], []);
  const isMainRoute = mainRoutes.includes(location.pathname);

  const defaultBackButton = useMemo(() => !isMainRoute ? (
    <Tooltip content="Go Back">
      <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-5 w-5" />
      </Button>
    </Tooltip>
  ) : null, [isMainRoute, navigate]);

  return (
    <div
      className={cn(
        'w-full',
        className
      )}
      style={{ display: 'contents' }}
    >
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
            containerClassName="absolute inset-0 opacity-90"
          />
        </div>
      </div>

      <div 
        className="relative z-40" 
        style={{ height: `${rowHeight}px` }}
      />

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
            <div className="relative flex items-center gap-8">
              <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2">
                {backButton !== undefined ? backButton : defaultBackButton}
              </div>
              <div className="flex items-center gap-8">
                <div className="relative">
                  <h1 className="text-2xl font-bold text-font-1">{title}</h1>
                  {subtitle && (
                    <p className="absolute top-full left-0 text-sm text-font-2 whitespace-nowrap">{subtitle}</p>
                  )}
                </div>
                {variant === 'tabs' ? (
                  <div className="flex items-center h-full">
                    {tabs}
                  </div>
                ) : children}
              </div>
            </div>

            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </div>
      </div>

      <div 
        className="relative z-40" 
        style={{ height: `${rowHeight}px` }}
      />

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
