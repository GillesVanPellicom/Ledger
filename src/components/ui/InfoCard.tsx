import React from 'react';
import { Info, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

type InfoCardVariant = 'info' | 'warning' | 'danger';

interface InfoCardProps {
  variant?: InfoCardVariant;
  title: string;
  message: string;
  children?: React.ReactNode;
}

const variantConfig = {
  info: {
    bg: 'bg-blue/10',
    icon: Info,
    iconColor: 'text-blue',
    titleColor: 'text-blue',
    messageColor: 'text-blue',
  },
  warning: {
    bg: 'bg-yellow/10',
    icon: AlertTriangle,
    iconColor: 'text-yellow',
    titleColor: 'text-yellow',
    messageColor: 'text-yellow',
  },
  danger: {
    bg: 'bg-red/10',
    icon: AlertCircle,
    iconColor: 'text-red',
    titleColor: 'text-red',
    messageColor: 'text-red',
  },
};

const InfoCard: React.FC<InfoCardProps> = ({ variant = 'info', title, message, children }) => {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div className={cn('p-4 rounded-lg flex items-center gap-4', config.bg)}>
      <Icon className={cn('h-8 w-8', config.iconColor)} />
      <div className="flex-grow">
        <p className={cn('font-semibold', config.titleColor)}>{title}</p>
        <p className={cn('text-sm', config.messageColor)}>{message}</p>
      </div>
      {children && <div className="flex-shrink-0">{children}</div>}
    </div>
  );
};

export default InfoCard;
