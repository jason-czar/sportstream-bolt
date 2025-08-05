import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import CreateEvent from "./pages/CreateEvent";
import JoinAsCamera from "./pages/JoinAsCamera";
import DirectorDashboard from "./pages/DirectorDashboard";
import ViewerPage from "./pages/ViewerPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
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
                <ProtectedRoute>
                  <CreateEvent />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/join-camera" 
              element={
                <ProtectedRoute>
                  <JoinAsCamera />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/director/:eventId" 
              element={
                <ProtectedRoute requiredRoles={['admin', 'event_creator', 'director']}>
                  <DirectorDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="/watch/:eventId" element={<ViewerPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
