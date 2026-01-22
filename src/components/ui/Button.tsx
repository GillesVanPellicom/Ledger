import React, {ButtonHTMLAttributes} from 'react';
import {cn} from '../../utils/cn';

const variants = {
  primary: 'bg-accent hover:bg-accent-hover text-white shadow-lg border border-accent-hover',
  secondary: 'bg-field-disabled text-font-1 hover:bg-field-hover shadow-lg border border-border',
  danger: 'bg-danger hover:bg-danger-hover text-white shadow-sm border border-danger-hover',
  ghost: 'bg-transparent hover:bg-field-hover text-font-2',
  minimal: 'inline-flex items-center justify-center p-0 m-0 bg-transparent border-0 appearance-none focus:outline-none',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
  icon: 'p-2 h-10 w-10',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'minimal';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
                                         children,
                                         variant = 'primary',
                                         size = 'md',
                                         className,
                                         disabled,
                                         loading,
                                         type = 'button',
                                         ...props
                                       }) => {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
             xmlns="http://www.w3.org/2000/svg"
             fill="none"
             viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;
