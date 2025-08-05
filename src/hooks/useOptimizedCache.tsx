import { useState, useEffect, useCallback, useRef } from 'react';
import { performanceMonitor } from '@/utils/performance';

interface CacheConfig {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size
  staleWhileRevalidate?: boolean; // Return stale data while fetching fresh data
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  hits: number;
}

class OptimizedCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize = 100, defaultTTL = 5 * 60 * 1000) { // 5 minutes default
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  set(key: string, data: T, ttl?: number): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
      hits: 0
    });

    performanceMonitor.markStart('cache-set');
    performanceMonitor.markEnd('cache-set');
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count
    entry.hits++;
    
    performanceMonitor.markStart('cache-hit');
    performanceMonitor.markEnd('cache-hit');
    
    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && Date.now() <= entry.expiresAt;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  getStats() {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    const averageAge = entries.reduce((sum, entry) => sum + (Date.now() - entry.timestamp), 0) / entries.length;
    
    return {
      size: this.cache.size,
      totalHits,
      averageAge: averageAge || 0,
      hitRate: totalHits / (totalHits + 1) * 100 // Rough estimate
    };
  }

  private evictOldest(): void {
    // Evict the entry with the oldest timestamp and lowest hit count
    let oldestKey: string | null = null;
    let oldestScore = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      // Score based on age and inverse of hit count
      const score = (Date.now() - entry.timestamp) / (entry.hits + 1);
      
      if (score < oldestScore) {
        oldestScore = score;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

export function useOptimizedCache<T>(config: CacheConfig = {}) {
  const cache = useRef(new OptimizedCache<T>(config.maxSize, config.ttl));
  const [cacheStats, setCacheStats] = useState(() => cache.current.getStats());

  const set = useCallback((key: string, data: T, ttl?: number) => {
    cache.current.set(key, data, ttl);
    setCacheStats(cache.current.getStats());
  }, []);

  const get = useCallback((key: string): T | null => {
    const result = cache.current.get(key);
    setCacheStats(cache.current.getStats());
    return result;
  }, []);

  const invalidate = useCallback((key: string) => {
    cache.current.delete(key);
    setCacheStats(cache.current.getStats());
  }, []);

  const clear = useCallback(() => {
    cache.current.clear();
    setCacheStats(cache.current.getStats());
  }, []);

  // Enhanced caching with stale-while-revalidate pattern
  const getOrFetch = useCallback(async function<K>(
    key: string,
    fetchFn: () => Promise<K>,
    options: { ttl?: number; staleWhileRevalidate?: boolean } = {}
  ): Promise<K> {
    performanceMonitor.markStart(`cache-operation-${key}`);
    
    const cachedData = get(key) as unknown as K | null;
    
    // Return cached data if available and not using stale-while-revalidate
    if (cachedData && !options.staleWhileRevalidate) {
      performanceMonitor.markEnd(`cache-operation-${key}`);
      return cachedData;
    }

    // Fetch fresh data
    try {
      const freshData = await fetchFn();
      set(key, freshData as unknown as T, options.ttl);
      performanceMonitor.markEnd(`cache-operation-${key}`);
      return freshData;
    } catch (error) {
      // Return cached data if fetch fails
      if (cachedData) {
        performanceMonitor.markEnd(`cache-operation-${key}`);
        return cachedData;
      }
      throw error;
    }
  }, [get, set]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cache.current.clear();
    };
  }, []);

  return {
    set,
    get,
    invalidate,
    clear,
    getOrFetch,
    has: cache.current.has.bind(cache.current),
    size: cache.current.size.bind(cache.current),
    stats: cacheStats
  };
}