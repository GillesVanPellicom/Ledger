import React, { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface ButtonGroupProps {
  children: ReactNode;
  className?: string;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({ children, className }) => {
  const count = React.Children.count(children);
  return (
    <div className={cn("inline-flex shadow-sm", className)}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        
        const isFirst = index === 0;
        const isLast = index === count - 1;
        
        return React.cloneElement(child as React.ReactElement<any>, {
          className: cn(
            child.props.className,
            "h-10",
            "shadow-none",
            "relative focus:z-10",
            !isFirst && "-ml-px",
            !isLast && "rounded-r-none",
            !isFirst && "rounded-l-none",
          )
        });
      })}
    </div>
  );
};

export default ButtonGroup;
