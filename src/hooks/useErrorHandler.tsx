import { useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface ErrorHandlerOptions {
  showToast?: boolean;
  title?: string;
  fallbackMessage?: string;
  onError?: (error: Error) => void;
}

export const useErrorHandler = () => {
  const handleError = useCallback((
    error: unknown,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      title = 'Error',
      fallbackMessage = 'An unexpected error occurred. Please try again.',
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

    if (showToast) {
      toast({
        title,
        description: message,
        variant: 'destructive'
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

  return {
    handleError,
    handleAsyncError
  };
};