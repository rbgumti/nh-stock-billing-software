import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster"; 
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PerformanceModeProvider } from "@/hooks/usePerformanceMode";
import { ThemeProvider } from "next-themes";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { AuthProvider } from "@/hooks/useAuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy load Dashboard too - it pulls in recharts which is heavy
const Dashboard = lazy(() => import("./pages/Dashboard"));

// Lazy load heavy pages for faster initial load
const Patients = lazy(() => import("./pages/Patients"));
const NewPatient = lazy(() => import("./pages/NewPatient"));
const EditPatient = lazy(() => import("./pages/EditPatient"));
const ViewPatient = lazy(() => import("./pages/ViewPatient"));
const Stock = lazy(() => import("./pages/Stock"));
const Invoices = lazy(() => import("./pages/Invoices"));
const NewInvoice = lazy(() => import("./pages/NewInvoice"));
const EditInvoice = lazy(() => import("./pages/EditInvoice"));
const Reports = lazy(() => import("./pages/Reports"));
const PatientAnalytics = lazy(() => import("./pages/PatientAnalytics"));
const Appointments = lazy(() => import("./pages/Appointments"));
const Prescriptions = lazy(() => import("./pages/Prescriptions"));
const NewPrescription = lazy(() => import("./pages/NewPrescription"));
const ViewPrescription = lazy(() => import("./pages/ViewPrescription"));
const EditPrescription = lazy(() => import("./pages/EditPrescription"));
const Salary = lazy(() => import("./pages/Salary"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - avoid refetching on every mount
      gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
      refetchOnWindowFocus: false, // prevent refetch on tab switch
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
      <PerformanceModeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SidebarProvider>
              <div className="min-h-screen flex w-full">
                <AppSidebar />
                <div className="flex-1 flex flex-col">
                  <header className="h-12 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-4 sticky top-0 z-40">
                    <SidebarTrigger />
                    <div className="flex items-center gap-2">
                      <ThemeSwitcher />
                      <ThemeToggle />
                    </div>
                  </header>
                  <main className="flex-1 overflow-auto">
                    <Suspense fallback={<div className="flex items-center justify-center h-32"><div className="animate-pulse text-muted-foreground">Loading...</div></div>}>
                    <Routes>
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                      <Route path="/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
                      <Route path="/patients/new" element={<ProtectedRoute><NewPatient /></ProtectedRoute>} />
                      <Route path="/patients/view/:id" element={<ProtectedRoute><ViewPatient /></ProtectedRoute>} />
                      <Route path="/patients/edit/:id" element={<ProtectedRoute><EditPatient /></ProtectedRoute>} />
                      <Route path="/stock" element={<ProtectedRoute><Stock /></ProtectedRoute>} />
                      <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
                      <Route path="/invoices/new" element={<ProtectedRoute><NewInvoice /></ProtectedRoute>} />
                      <Route path="/invoices/edit/:id" element={<ProtectedRoute><EditInvoice /></ProtectedRoute>} />
                      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                      <Route path="/analytics/patients" element={<ProtectedRoute><PatientAnalytics /></ProtectedRoute>} />
                      <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
                      <Route path="/prescriptions" element={<ProtectedRoute><Prescriptions /></ProtectedRoute>} />
                      <Route path="/prescriptions/new" element={<ProtectedRoute><NewPrescription /></ProtectedRoute>} />
                      <Route path="/prescriptions/view/:id" element={<ProtectedRoute><ViewPrescription /></ProtectedRoute>} />
                      <Route path="/prescriptions/edit/:id" element={<ProtectedRoute><EditPrescription /></ProtectedRoute>} />
                      <Route path="/salary" element={<ProtectedRoute><Salary /></ProtectedRoute>} />
                      <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                    </Suspense>
                  </main>
                </div>
              </div>
            </SidebarProvider>
          </BrowserRouter>
        </TooltipProvider>
      </PerformanceModeProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
