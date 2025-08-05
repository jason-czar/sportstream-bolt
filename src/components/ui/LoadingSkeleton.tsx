import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'avatar' | 'card' | 'button' | 'video' | 'table-row' | 'event-card';
  lines?: number;
  count?: number;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  className, 
  variant = 'text',
  lines = 1,
  count = 1
}) => {
  const baseClasses = "animate-pulse bg-muted rounded";

  const variants = {
    text: "h-4 w-full",
    avatar: "h-12 w-12 rounded-full",
    card: "h-32 w-full",
    button: "h-10 w-24",
    video: "aspect-video w-full",
    'table-row': "h-16 w-full",
    'event-card': "h-48 w-full"
  };

  // Special layouts for complex variants
  if (variant === 'event-card') {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <div className={cn(baseClasses, "h-6 w-3/4")} />
            <div className={cn(baseClasses, "h-4 w-1/2")} />
            <div className={cn(baseClasses, "h-24 w-full")} />
            <div className="flex gap-2">
              <div className={cn(baseClasses, "h-8 w-16")} />
              <div className={cn(baseClasses, "h-8 w-16")} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'table-row') {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="border rounded p-3 flex items-center space-x-3">
            <div className={cn(baseClasses, "h-8 w-8 rounded")} />
            <div className="flex-1 space-y-2">
              <div className={cn(baseClasses, "h-4 w-1/4")} />
              <div className={cn(baseClasses, "h-3 w-1/3")} />
            </div>
            <div className={cn(baseClasses, "h-6 w-16")} />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div 
            key={i} 
            className={cn(baseClasses, variants.text, i === lines - 1 ? "w-3/4" : "")}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn(baseClasses, variants[variant], className)} />
  );
};

export default LoadingSkeleton;