import React from 'react';
import { InformationCircleIcon, ExclamationTriangleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';
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
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    icon: InformationCircleIcon,
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-800 dark:text-blue-200',
    messageColor: 'text-blue-700 dark:text-blue-300',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    icon: ExclamationTriangleIcon,
    iconColor: 'text-yellow-500',
    titleColor: 'text-yellow-800 dark:text-yellow-200',
    messageColor: 'text-yellow-700 dark:text-yellow-300',
  },
  danger: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    icon: ExclamationCircleIcon,
    iconColor: 'text-red-500',
    titleColor: 'text-red-800 dark:text-red-200',
    messageColor: 'text-red-700 dark:text-red-300',
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
