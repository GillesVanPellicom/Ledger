import React, { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface ButtonGroupProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'ghost-bordered';
}

/**
 * ButtonGroup component that ensures only the outer corners of the group are rounded.
 * Supports a 'ghost-bordered' variant for transparent buttons with a shared border.
 */
export const ButtonGroup: React.FC<ButtonGroupProps> = ({ children, className, variant = 'default' }) => {
  const childrenArray = React.Children.toArray(children).filter(React.isValidElement);
  const count = childrenArray.length;

  return (
    <div className={cn("inline-flex shadow-sm isolate", className)}>
      {childrenArray.map((child, index) => {
        const isFirst = index === 0;
        const isLast = index === count - 1;

        // Determine rounding classes with !important to override component defaults
        let roundingClasses = '!rounded-none';
        if (count === 1) {
          roundingClasses = '!rounded-lg';
        } else if (isFirst) {
          roundingClasses = '!rounded-l-lg !rounded-r-none';
        } else if (isLast) {
          roundingClasses = '!rounded-r-lg !rounded-l-none';
        }

        const variantClasses = variant === 'ghost-bordered' 
          ? 'border border-gray-200 dark:border-gray-700 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50' 
          : '';

        const applyStyles = (element: React.ReactElement<any>): React.ReactElement<any> => {
          const props = element.props as Record<string, any>;
          const type = element.type as any;
          const name = typeof type === 'string' ? type : (type.displayName || type.name || '');

          if (name === 'Tooltip' && React.isValidElement(props.children)) {
            return React.cloneElement(element, {
              children: applyStyles(props.children as React.ReactElement<any>)
            });
          }

          return React.cloneElement(element, {
            className: cn(
              props.className,
              roundingClasses,
              variantClasses,
              'relative focus:z-10',
              !isFirst && '-ml-px',
              'shadow-none'
            )
          });
        };

        return <React.Fragment key={index}>{applyStyles(child as React.ReactElement)}</React.Fragment>;
      })}
    </div>
  );
};

export default ButtonGroup;
