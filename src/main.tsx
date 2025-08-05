import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from './utils/serviceWorker';
import { performanceMonitor } from './utils/performance';

// Performance monitoring
performanceMonitor.markStart('app-initialization');

// Register service worker for offline functionality
registerServiceWorker({
  onUpdate: (registration) => {
    console.log('[SW] New content available, please refresh');
    // You could show a toast here asking user to refresh
  },
  onSuccess: (registration) => {
    console.log('[SW] Content cached for offline use');
  },
  onError: (error) => {
    console.error('[SW] Service worker registration failed:', error);
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);

// Log performance metrics after initial render
performanceMonitor.markEnd('app-initialization');
setTimeout(() => {
  performanceMonitor.logMetrics();
}, 2000);
