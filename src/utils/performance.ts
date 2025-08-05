// Performance monitoring utilities
export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  apiLatency: number;
  cacheHitRate: number;
  bundleSize: number;
}

class PerformanceMonitor {
  private metrics: Map<string, number> = new Map();
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeObservers();
  }

  private initializeObservers() {
    // Monitor navigation timing
    if ('PerformanceObserver' in window) {
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.metrics.set('loadTime', navEntry.loadEventEnd - navEntry.fetchStart);
            this.metrics.set('renderTime', navEntry.domContentLoadedEventEnd - navEntry.fetchStart);
          }
        }
      });

      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navigationObserver);

      // Monitor resource timing for API calls
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resourceEntry = entry as PerformanceResourceTiming;
          if (resourceEntry.name.includes('/api/') || resourceEntry.name.includes('/rest/')) {
            const latency = resourceEntry.responseEnd - resourceEntry.requestStart;
            this.updateApiLatency(latency);
          }
        }
      });

      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    }
  }

  private updateApiLatency(latency: number) {
    const currentLatency = this.metrics.get('apiLatency') || 0;
    const currentCount = this.metrics.get('apiCallCount') || 0;
    
    // Calculate running average
    const newAverage = (currentLatency * currentCount + latency) / (currentCount + 1);
    
    this.metrics.set('apiLatency', newAverage);
    this.metrics.set('apiCallCount', currentCount + 1);
  }

  markStart(label: string): void {
    performance.mark(`${label}-start`);
  }

  markEnd(label: string): number {
    performance.mark(`${label}-end`);
    performance.measure(label, `${label}-start`, `${label}-end`);
    
    const measure = performance.getEntriesByName(label)[0];
    const duration = measure?.duration || 0;
    
    this.metrics.set(label, duration);
    return duration;
  }

  getMetrics(): PerformanceMetrics {
    return {
      loadTime: this.metrics.get('loadTime') || 0,
      renderTime: this.metrics.get('renderTime') || 0,
      apiLatency: this.metrics.get('apiLatency') || 0,
      cacheHitRate: this.calculateCacheHitRate(),
      bundleSize: this.estimateBundleSize(),
    };
  }

  private calculateCacheHitRate(): number {
    // Calculate based on successful cache retrievals vs total requests
    const cacheHits = this.metrics.get('cacheHits') || 0;
    const totalRequests = this.metrics.get('totalRequests') || 1;
    return (cacheHits / totalRequests) * 100;
  }

  private estimateBundleSize(): number {
    // Estimate based on resource entries
    let totalSize = 0;
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    resources.forEach((resource) => {
      if (resource.name.includes('.js') || resource.name.includes('.css')) {
        totalSize += resource.transferSize || 0;
      }
    });
    
    return totalSize;
  }

  logMetrics(): void {
    console.group('🔍 Performance Metrics');
    const metrics = this.getMetrics();
    console.log('Load Time:', `${metrics.loadTime.toFixed(2)}ms`);
    console.log('Render Time:', `${metrics.renderTime.toFixed(2)}ms`);
    console.log('API Latency:', `${metrics.apiLatency.toFixed(2)}ms`);
    console.log('Cache Hit Rate:', `${metrics.cacheHitRate.toFixed(1)}%`);
    console.log('Bundle Size:', `${(metrics.bundleSize / 1024).toFixed(1)}KB`);
    console.groupEnd();
  }

  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Utility functions
export const measureAsync = async <T>(
  label: string,
  asyncFunction: () => Promise<T>
): Promise<T> => {
  performanceMonitor.markStart(label);
  try {
    const result = await asyncFunction();
    performanceMonitor.markEnd(label);
    return result;
  } catch (error) {
    performanceMonitor.markEnd(label);
    throw error;
  }
};

export const measureSync = <T>(
  label: string,
  syncFunction: () => T
): T => {
  performanceMonitor.markStart(label);
  try {
    const result = syncFunction();
    performanceMonitor.markEnd(label);
    return result;
  } catch (error) {
    performanceMonitor.markEnd(label);
    throw error;
  }
};

// React hook for performance monitoring
export const usePerformanceMonitoring = () => {
  const logMetrics = () => performanceMonitor.logMetrics();
  const getMetrics = () => performanceMonitor.getMetrics();
  
  return { logMetrics, getMetrics };
};