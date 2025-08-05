import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'avatar' | 'card' | 'button' | 'video';
  lines?: number;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  className, 
  variant = 'text',
  lines = 1 
}) => {
  const baseClasses = "animate-pulse bg-muted rounded";

  const variants = {
    text: "h-4 w-full",
    avatar: "h-12 w-12 rounded-full",
    card: "h-32 w-full",
    button: "h-10 w-24",
    video: "aspect-video w-full"
  };

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