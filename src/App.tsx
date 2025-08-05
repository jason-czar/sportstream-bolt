import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ErrorBoundary from "@/components/error/ErrorBoundary";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { CompactOfflineIndicator } from "@/components/ui/OfflineIndicator";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import CreateEvent from "./pages/CreateEvent";
import JoinAsCamera from "./pages/JoinAsCamera";
import DirectorDashboard from "./pages/DirectorDashboard";
import ViewerPage from "./pages/ViewerPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const { isOnline } = useOnlineStatus();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route 
                path="/create-event" 
                element={
                  <ErrorBoundary>
                    <ProtectedRoute>
                      <CreateEvent />
                    </ProtectedRoute>
                  </ErrorBoundary>
                } 
              />
              <Route 
                path="/join-camera" 
                element={
                  <ErrorBoundary>
                    <ProtectedRoute>
                      <JoinAsCamera />
                    </ProtectedRoute>
                  </ErrorBoundary>
                } 
              />
              <Route 
                path="/director/:eventId" 
                element={
                  <ErrorBoundary>
                    <ProtectedRoute requiredRoles={['admin', 'event_creator', 'director']}>
                      <DirectorDashboard />
                    </ProtectedRoute>
                  </ErrorBoundary>
                } 
              />
              <Route 
                path="/watch/:eventId" 
                element={
                  <ErrorBoundary>
                    <ViewerPage />
                  </ErrorBoundary>
                } 
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
        {!isOnline && (
          <div className="fixed top-4 right-4 z-50">
            <CompactOfflineIndicator />
          </div>
        )}
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
