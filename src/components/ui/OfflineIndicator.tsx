import React from 'react';
import { WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  className?: string;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ className }) => {
  return (
    <div className={cn(
      "fixed top-4 left-1/2 transform -translate-x-1/2 z-50",
      "bg-destructive text-destructive-foreground",
      "px-4 py-2 rounded-lg shadow-lg",
      "flex items-center space-x-2",
      "animate-in slide-in-from-top-2 duration-300",
      className
    )}>
      <WifiOff className="h-4 w-4" />
      <span className="text-sm font-medium">You are offline</span>
    </div>
  );
};

export default OfflineIndicator;