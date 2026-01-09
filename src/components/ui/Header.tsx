import React from 'react';
import { cn } from '../../utils/cn';

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
  const baseSize = 160;
  const circleSize = baseSize * 10;

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden border-b border-gray-200 dark:border-gray-800',
        className
      )}
    >
      {/* Large circles */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          width: circleSize,
          height: circleSize,
          top: -510,
          left: '-30%',
          background:
            'radial-gradient(circle, rgba(135,94,242,1) 0%, rgba(199,87,87,0) 25%)',
        }}
      />
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          width: circleSize,
          height: circleSize,
          top: -510,
          left: '25%',
          background:
            'radial-gradient(circle, rgba(135,94,242,1) 0%, rgba(199,87,87,0) 20%)',
        }}
      />
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          width: circleSize,
          height: circleSize,
          top: -510,
          left: '35%',
          background:
            'radial-gradient(circle, rgba(135,94,242,1) 0%, rgba(199,87,87,0) 20%)',
        }}
      />

      {/* Content */}
      <div
        className="relative backdrop-blur-md flex items-center"
        style={{ minHeight: `${minHeight}px` }}
      >
        <div className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full', contentClassName)}>
          {/* Flex row for header content, vertically centered */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              {backButton && (
                <div className="mr-4 flex items-center">{backButton}</div>
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