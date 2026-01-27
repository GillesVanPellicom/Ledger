import React, { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface ButtonGroupProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'ghost-bordered' | 'toggle';
  fullWidth?: boolean;
}

/**
 * ButtonGroup component that ensures only the outer corners of the group are rounded.
 * Supports a 'ghost-bordered' variant for transparent buttons with a shared border.
 * Supports a 'toggle' variant for segmented control style selection.
 */
export const ButtonGroup: React.FC<ButtonGroupProps> = ({ children, className, variant = 'default', fullWidth = false }) => {
  const childrenArray = React.Children.toArray(children).filter(React.isValidElement);
  const count = childrenArray.length;

  const containerClasses = variant === 'toggle'
    ? "inline-flex p-1 border border-border bg-field-disabled rounded-lg shadow-sm isolate gap-1"
    : "inline-flex shadow-sm isolate border border-border rounded-lg overflow-hidden divide-x divide-border";

  return (
    <div className={cn(containerClasses, fullWidth && "flex w-full", className)}>
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

        let variantClasses = '';
        if (variant === 'ghost-bordered') {
          variantClasses = 'bg-transparent hover:bg-field-hover';
        } else if (variant === 'toggle') {
          roundingClasses = '!rounded-md'; // Toggles usually have smaller rounding for inner items
          variantClasses = 'transition-all duration-200';
        }

        const applyStyles = (element: React.ReactElement<any>): React.ReactElement<any> => {
          const props = element.props as Record<string, any>;
          
          // Check if it's a Tooltip. In production, component names are minified.
          // We check for 'content' prop which is unique to our Tooltip.
          const isTooltip = props.content !== undefined;

          if (isTooltip && React.isValidElement(props.children)) {
            return React.cloneElement(element, {
              children: applyStyles(props.children as React.ReactElement<any>),
              className: cn(props.className, fullWidth && "flex-1")
            });
          }

          // For toggle variant, we expect buttons to have an 'active' prop or similar
          let activeClasses = '';
          if (variant === 'toggle') {
             const isActive = props.active || props.className?.includes('bg-field') || props.className?.includes('bg-bg-2') || props.className?.includes('bg-gray-100');
             activeClasses = isActive 
               ? 'bg-field text-font-1 shadow-sm hover:bg-field-hover z-20'
               : 'bg-transparent text-font-2 hover:bg-field-hover z-10';
          }

          return React.cloneElement(element, {
            className: cn(
              props.className,
              roundingClasses,
              variantClasses,
              activeClasses,
              fullWidth && "flex-1",
              'relative focus:z-30 focus:ring-2 focus:ring-accent focus:ring-inset',
              '!shadow-none !border-0' // Force remove individual borders and shadows
            )
          });
        };

        return <React.Fragment key={index}>{applyStyles(child as React.ReactElement)}</React.Fragment>;
      })}
    </div>
  );
};

export default ButtonGroup;
