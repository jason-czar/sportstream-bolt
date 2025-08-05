import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  variant?: 'default' | 'destructive' | 'warning';
  className?: string;
  showIcon?: boolean;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'Error',
  message,
  onRetry,
  variant = 'destructive',
  className,
  showIcon = true
}) => {
  const variantStyles = {
    default: 'border-muted',
    destructive: 'border-destructive/20 bg-destructive/5',
    warning: 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950'
  };

  const iconColor = {
    default: 'text-muted-foreground',
    destructive: 'text-destructive',
    warning: 'text-orange-500'
  };

  return (
    <Card className={cn(variantStyles[variant], className)}>
      <CardContent className="pt-6">
        <div className="flex items-start space-x-3">
          {showIcon && (
            <AlertTriangle className={cn("h-5 w-5 mt-0.5", iconColor[variant])} />
          )}
          <div className="flex-1 space-y-2">
            <h4 className="font-medium text-sm">{title}</h4>
            <p className="text-sm text-muted-foreground">{message}</p>
            {onRetry && (
              <Button 
                onClick={onRetry} 
                variant="outline" 
                size="sm"
                className="mt-3"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ErrorMessage;