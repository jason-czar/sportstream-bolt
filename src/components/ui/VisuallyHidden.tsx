import React from 'react';
import { cn } from '@/lib/utils';

interface VisuallyHiddenProps {
  children: React.ReactNode;
  className?: string;
}

const VisuallyHidden: React.FC<VisuallyHiddenProps> = ({ children, className }) => {
  return (
    <span 
      className={cn(
        "absolute w-px h-px p-0 -m-px overflow-hidden clip-rect-0 whitespace-nowrap border-0",
        className
      )}
    >
      {children}
    </span>
  );
};

export default VisuallyHidden;