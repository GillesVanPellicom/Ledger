import React from 'react';
import { cn } from '../../utils/cn';

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

const PageWrapper: React.FC<PageWrapperProps> = ({ children, className }) => {
  return (
    <div className={cn('px-[100px]', className)}>
      {children}
    </div>
  );
};

export default PageWrapper;