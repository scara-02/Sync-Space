import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate , useLocation } from "react-router-dom";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import Index from "./pages/Index"; // This is the Board
import Dashboard from "./pages/Dashboard"; // This is the new Dashboard
import Auth from "./pages/Auth";

const queryClient = new QueryClient();
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const user = localStorage.getItem("user");
  const location = useLocation(); // <--- Get current URL

  if (!user) {
    // Redirect to Auth, but pass the current location as "state"
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <ConvexProvider client={convex}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster position="bottom-right" />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            
            {/* Dashboard is now the Home Page */}
            <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />

            {/* Board is now a dynamic route with ID */}
            <Route path="/board/:projectId" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ConvexProvider>
);

export default App;