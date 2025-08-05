import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface OfflineIndicatorProps {
  className?: string;
  showWhenOnline?: boolean;
}

export function OfflineIndicator({ className, showWhenOnline = false }: OfflineIndicatorProps) {
  const isOnline = useOnlineStatus();

  if (isOnline && !showWhenOnline) {
    return null;
  }

  return (
    <Alert 
      variant={isOnline ? "default" : "destructive"} 
      className={cn("border-l-4", className)}
    >
      {isOnline ? (
        <Wifi className="h-4 w-4" />
      ) : (
        <WifiOff className="h-4 w-4" />
      )}
      <AlertDescription>
        {isOnline 
          ? "Connected - All features available"
          : "You're offline - Some features may be limited"
        }
      </AlertDescription>
    </Alert>
  );
}

// Compact version for status bars
export function CompactOfflineIndicator({ className }: { className?: string }) {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1 bg-destructive/10 text-destructive text-sm rounded-full",
      className
    )}>
      <WifiOff className="h-3 w-3" />
      <span>Offline</span>
    </div>
  );
}

export default OfflineIndicator;