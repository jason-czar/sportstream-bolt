import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({ 
  loading = false,
  loadingText,
  children,
  disabled,
  className,
  ...props 
}) => {
  return (
    <Button 
      disabled={loading || disabled}
      className={cn(className)}
      {...props}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {loading ? (loadingText || children) : children}
    </Button>
  );
};

export default LoadingButton;