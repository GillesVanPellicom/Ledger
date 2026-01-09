import React from 'react';
import { cn } from '../../utils/cn';

interface HeaderProps {
  title: string;
  subtitle?: string;
  backButton?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  backButton,
  actions,
  className,
  contentClassName,
}) => {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden border-b border-gray-200 dark:border-gray-800",
        className
      )}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(
              circle at 20% 210%,
              rgba(181, 156, 248, 1) 0%,
              rgba(199, 87, 87, 0) 25%
            ),
            radial-gradient(
              circle at 70% 195%,
              rgba(181, 156, 248, 1) 0%,
              rgba(199, 87, 87, 0) 25%
            )
          `,
          backgroundRepeat: 'no-repeat',
        }}
      />

      <div
        className={cn("relative flex items-center justify-between w-full px-4 backdrop-blur-md", contentClassName)}
        style={{ minHeight: '140px' }}
      >
        <div className="flex items-center">
          {backButton}
          <div className={cn("flex flex-col", backButton ? "ml-4" : "")}>
            <h1 className="text-2xl font-bold">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
        </div>
        <div>{actions}</div>
      </div>
    </div>
  );
};
