import { useCallback, useRef } from 'react';
import { createRateLimiter } from '@/lib/validation';

interface SecurityConfig {
  maxRequestsPerMinute?: number;
  maxRequestsPerHour?: number;
  enableCSP?: boolean;
}

export const useSecurity = (config: SecurityConfig = {}) => {
  const {
    maxRequestsPerMinute = 60,
    maxRequestsPerHour = 1000,
    enableCSP = true
  } = config;

  // Rate limiters
  const minuteRateLimiter = useRef(createRateLimiter(maxRequestsPerMinute, 60000));
  const hourRateLimiter = useRef(createRateLimiter(maxRequestsPerHour, 3600000));

  // Check if user can make a request
  const checkRateLimit = useCallback((identifier: string): boolean => {
    return minuteRateLimiter.current(identifier) && hourRateLimiter.current(identifier);
  }, []);

  // Secure API call wrapper
  const secureApiCall = useCallback(async <T,>(
    identifier: string,
    apiCall: () => Promise<T>,
    options: { 
      skipRateLimit?: boolean;
      retryOnFailure?: boolean;
    } = {}
  ): Promise<{ data: T | null; error: string | null }> => {
    try {
      // Rate limiting check
      if (!options.skipRateLimit && !checkRateLimit(identifier)) {
        return {
          data: null,
          error: 'Rate limit exceeded. Please wait before making more requests.'
        };
      }

      const result = await apiCall();
      return { data: result, error: null };
    } catch (error) {
      console.error('Secure API call failed:', error);
      
      if (options.retryOnFailure) {
        // Simple retry mechanism
        try {
          const retryResult = await apiCall();
          return { data: retryResult, error: null };
        } catch (retryError) {
          return {
            data: null,
            error: 'Request failed after retry. Please try again later.'
          };
        }
      }
      
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Request failed'
      };
    }
  }, [checkRateLimit]);

  // Input sanitization
  const sanitizeAndValidate = useCallback(<T,>(
    data: unknown,
    validator: (data: unknown) => T
  ): { valid: boolean; data: T | null; errors: string[] } => {
    try {
      const validatedData = validator(data);
      return { valid: true, data: validatedData, errors: [] };
    } catch (error) {
      const errors = error instanceof Error ? [error.message] : ['Validation failed'];
      return { valid: false, data: null, errors };
    }
  }, []);

  // Session validation
  const validateSession = useCallback((session: any): boolean => {
    if (!session?.user?.id) return false;
    if (!session?.access_token) return false;
    
    // Check if token is not expired
    const expiresAt = session.expires_at;
    if (expiresAt && Date.now() / 1000 > expiresAt) return false;
    
    return true;
  }, []);

  // CSRF protection helper
  const generateCSRFToken = useCallback((): string => {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }, []);

  return {
    checkRateLimit,
    secureApiCall,
    sanitizeAndValidate,
    validateSession,
    generateCSRFToken
  };
};