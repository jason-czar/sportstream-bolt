import { useRef, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

export const useOptimizedCache = <T,>(defaultExpiry: number = 30000) => {
  const cache = useRef<Map<string, CacheEntry<T>>>(new Map());

  const get = useCallback((key: string): T | null => {
    const entry = cache.current.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiry) {
      cache.current.delete(key);
      return null;
    }

    return entry.data;
  }, []);

  const set = useCallback((key: string, data: T, expiry?: number) => {
    const now = Date.now();
    cache.current.set(key, {
      data,
      timestamp: now,
      expiry: now + (expiry || defaultExpiry)
    });
  }, [defaultExpiry]);

  const clear = useCallback((pattern?: string) => {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const key of cache.current.keys()) {
        if (regex.test(key)) {
          cache.current.delete(key);
        }
      }
    } else {
      cache.current.clear();
    }
  }, []);

  const has = useCallback((key: string): boolean => {
    const entry = cache.current.get(key);
    if (!entry) return false;
    
    const now = Date.now();
    if (now > entry.expiry) {
      cache.current.delete(key);
      return false;
    }
    
    return true;
  }, []);

  return { get, set, clear, has };
};