import React from 'react';
import { cn } from '../../utils/cn';

interface SeparatorProps {
  className?: string;
}

const Separator: React.FC<SeparatorProps> = ({ className }) => {
  return <hr className={cn('border-t border-border', className)} />;
};

export default Separator;
