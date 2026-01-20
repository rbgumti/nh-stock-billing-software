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
import ProtectedRoute from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import NewPatient from "./pages/NewPatient";
import EditPatient from "./pages/EditPatient";
import ViewPatient from "./pages/ViewPatient";
import Stock from "./pages/Stock";
import Invoices from "./pages/Invoices";
import NewInvoice from "./pages/NewInvoice";
import EditInvoice from "./pages/EditInvoice";
import Reports from "./pages/Reports";
import PatientAnalytics from "./pages/PatientAnalytics";
import Appointments from "./pages/Appointments";
import Prescriptions from "./pages/Prescriptions";
import NewPrescription from "./pages/NewPrescription";
import ViewPrescription from "./pages/ViewPrescription";
import EditPrescription from "./pages/EditPrescription";
import Salary from "./pages/Salary";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
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
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                </div>
              </div>
            </SidebarProvider>
          </BrowserRouter>
        </TooltipProvider>
      </PerformanceModeProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
