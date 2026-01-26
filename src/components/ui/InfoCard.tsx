import React from 'react';
import { Info, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

type InfoCardVariant = 'info' | 'warning' | 'danger';

interface InfoCardProps {
  variant?: InfoCardVariant;
  title: string;
  message: string;
  children?: React.ReactNode;
  noCard?: boolean;
  className?: string;
}

const variantConfig = {
  info: {
    icon: Info,
    color: 'text-blue',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow',
  },
  danger: {
    icon: AlertCircle,
    color: 'text-red',
  },
};

const InfoCard: React.FC<InfoCardProps> = ({ variant = 'info', title, message, children, noCard = false, className }) => {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div className={cn(
      "p-4 flex items-center gap-4",
      !noCard && "rounded-xl bg-bg-2 border border-border",
      className
    )}>
      <Icon className={cn('h-8 w-8 shrink-0', config.color)} />
      <div className="flex-grow">
        <p className={cn('font-semibold', config.color)}>{title}</p>
        <p className="text-sm text-font-1">{message}</p>
      </div>
      {children && <div className="flex-shrink-0">{children}</div>}
    </div>
  );
};

export default InfoCard;
