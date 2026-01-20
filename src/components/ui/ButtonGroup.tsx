import React, { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface ButtonGroupProps {
  children: ReactNode;
  className?: string;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({ children, className }) => {
  const count = React.Children.count(children);

  return (
    <div className={cn("inline-flex shadow-sm isolate", className)}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;

        const isFirst = index === 0;
        const isLast = index === count - 1;
        const isMiddle = !isFirst && !isLast;

        // Helper function to strip rounded classes from any string
        const stripRounded = (str: string | undefined) => {
          if (!str) return '';
          return str
            .split(' ')
            .filter(cls => !cls.startsWith('rounded'))
            .join(' ');
        };

        // Recursively apply styles through wrapper components
        const applyStyles = (element: React.ReactElement<any>): React.ReactElement<any> => {
          const props = element.props as Record<string, any>;

          // Check if this element has a single valid element child (wrapper pattern)
          if (
            props.children &&
            React.isValidElement(props.children) &&
            !props.className?.includes('px') && // Not a button-like element
            props.children.type !== 'button' // Explicitly not a button
          ) {
            // This is a wrapper, recurse into the child
            return React.cloneElement(element, {
              children: applyStyles(props.children as React.ReactElement<any>)
            });
          }

          // This is the actual button element, apply the styles
          return React.cloneElement(element, {
            className: cn(
              stripRounded(props.className),
              'shadow-none',
              'relative focus:z-10',
              !isFirst && '-ml-px',
              isFirst && 'rounded-l-lg rounded-r-none',
              isLast && 'rounded-r-lg rounded-l-none',
              isMiddle && 'rounded-none',
              // Ensure borders are visible between buttons
              !isLast && 'border-r-gray-200 dark:border-r-gray-700'
            )
          });
        };

        return applyStyles(child);
      })}
    </div>
  );
};

export default ButtonGroup;
