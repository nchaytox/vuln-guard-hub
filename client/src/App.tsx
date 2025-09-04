import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "@/components/ProtectedRoute";
import MyScans from "./pages/MyScans";
import NotFound from "./pages/NotFound";

import { VulnerabilityProvider, useVulnerability } from './context/VulnerabilityContext';

const VulnerabilityList = () => {
  const { vulnerabilities, loading } = useVulnerability();

  if (loading) return <p className="text-center text-gray-500">Loading vulnerabilities...</p>;

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Detected Vulnerabilities</h2>
      <ul className="space-y-4">
        {vulnerabilities.map(vuln => (
          <li key={vuln.id} className="border p-4 rounded shadow">
            <h3 className="font-semibold">{vuln.packageName}</h3>
            <p className="text-sm">{vuln.description}</p>
            <span className={`px-2 py-1 rounded text-white text-xs ${
              vuln.severity === 'CRITICAL' ? 'bg-red-800' :
              vuln.severity === 'HIGH' ? 'bg-red-500' :
              vuln.severity === 'MEDIUM' ? 'bg-yellow-400' : 'bg-green-500'
            }`}>
              {vuln.severity}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};



const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/scans" element={<ProtectedRoute><MyScans /></ProtectedRoute>} />
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
