import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import ProtectedRoute from "@/components/ProtectedRoute";
import NotFound from "@/pages/NotFound";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Patients = lazy(() => import("@/pages/Patients"));
const NewPatient = lazy(() => import("@/pages/NewPatient"));
const EditPatient = lazy(() => import("@/pages/EditPatient"));
const ViewPatient = lazy(() => import("@/pages/ViewPatient"));
const Stock = lazy(() => import("@/pages/Stock"));
const Invoices = lazy(() => import("@/pages/Invoices"));
const NewInvoice = lazy(() => import("@/pages/NewInvoice"));
const EditInvoice = lazy(() => import("@/pages/EditInvoice"));
const Reports = lazy(() => import("@/pages/Reports"));
const PatientAnalytics = lazy(() => import("@/pages/PatientAnalytics"));
const Appointments = lazy(() => import("@/pages/Appointments"));
const Prescriptions = lazy(() => import("@/pages/Prescriptions"));
const NewPrescription = lazy(() => import("@/pages/NewPrescription"));
const ViewPrescription = lazy(() => import("@/pages/ViewPrescription"));
const EditPrescription = lazy(() => import("@/pages/EditPrescription"));
const Salary = lazy(() => import("@/pages/Salary"));
const AdminPanel = lazy(() => import("@/pages/AdminPanel"));

const PageFallback = () => (
  <div className="flex items-center justify-center h-32">
    <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
  </div>
);

export default function AuthenticatedApp() {
  return (
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
            <Suspense fallback={<PageFallback />}>
              <Routes>
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
  );
}
