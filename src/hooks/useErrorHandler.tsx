import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface ErrorHandlerOptions {
  showToast?: boolean;
  title?: string;
  fallbackMessage?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
  onError?: (error: Error) => void;
}

interface ErrorLog {
  error: Error;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
  resolved: boolean;
}

export const useErrorHandler = () => {
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const handleError = useCallback((
    error: unknown,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      title = 'Error',
      fallbackMessage = 'An unexpected error occurred. Please try again.',
      severity = 'medium',
      context,
      onError
    } = options;

    console.error('Error handled:', error);

    let message = fallbackMessage;
    let errorObj: Error;

    if (error instanceof Error) {
      errorObj = error;
      message = error.message || fallbackMessage;
    } else if (typeof error === 'string') {
      errorObj = new Error(error);
      message = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorObj = new Error(String(error.message));
      message = String(error.message);
    } else {
      errorObj = new Error('Unknown error');
    }

    // Handle specific Supabase errors
    if (message.includes('JWT expired')) {
      message = 'Your session has expired. Please sign in again.';
    } else if (message.includes('Network')) {
      message = 'Network error. Please check your connection and try again.';
    } else if (message.includes('permission')) {
      message = 'You don\'t have permission to perform this action.';
    }

    // Log error for tracking
    const errorLog: ErrorLog = {
      error: errorObj,
      timestamp: Date.now(),
      severity,
      context,
      resolved: false
    };

    setErrorLogs(prev => [errorLog, ...prev.slice(0, 99)]); // Keep last 100 errors

    if (showToast) {
      const variant = severity === 'critical' || severity === 'high' ? 'destructive' : 'default';
      toast({
        title,
        description: message,
        variant
      });
    }

    if (onError) {
      onError(errorObj);
    }

    return { error: errorObj, message };
  }, []);

  const handleAsyncError = useCallback(async <T,>(
    asyncFn: () => Promise<T>,
    options: ErrorHandlerOptions = {}
  ): Promise<{ data?: T; error?: Error }> => {
    try {
      const data = await asyncFn();
      return { data };
    } catch (error) {
      const { error: handledError } = handleError(error, options);
      return { error: handledError };
    }
  }, [handleError]);

  const markErrorResolved = useCallback((timestamp: number) => {
    setErrorLogs(prev => 
      prev.map(log => 
        log.timestamp === timestamp ? { ...log, resolved: true } : log
      )
    );
  }, []);

  const clearErrorLogs = useCallback(() => {
    setErrorLogs([]);
  }, []);

  return {
    handleError,
    handleAsyncError,
    errorLogs,
    markErrorResolved,
    clearErrorLogs,
    unresolvedErrors: errorLogs.filter(log => !log.resolved)
  };
};