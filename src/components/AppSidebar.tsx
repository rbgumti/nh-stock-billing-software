import { NavLink, useLocation } from "react-router-dom";
import { Users, Package, Receipt, LayoutDashboard, Plus, BarChart3, Activity, Calendar, FileText, Sparkles } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import navjeevanLogo from "@/assets/NH_LOGO.png";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Patients", url: "/patients", icon: Users },
  { title: "Appointments", url: "/appointments", icon: Calendar },
  { title: "Prescriptions", url: "/prescriptions", icon: FileText },
  { title: "Patient Analytics", url: "/analytics/patients", icon: Activity },
  { title: "Stock", url: "/stock", icon: Package },
  { title: "Invoices", url: "/invoices", icon: Receipt },
  { title: "Reports", url: "/reports", icon: BarChart3 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  const getNavClass = (path: string) =>
    isActive(path) 
      ? "bg-gradient-to-r from-gold/20 to-gold/10 text-gold border-l-2 border-gold font-semibold shadow-sm" 
      : "hover:bg-white/5 text-sidebar-foreground/80 hover:text-sidebar-foreground transition-all duration-200";

  return (
    <Sidebar className={`${collapsed ? "w-14" : "w-64"} border-r-0`} collapsible="icon">
      <SidebarContent className="bg-gradient-to-b from-purple via-purple/95 to-purple/90 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gold/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-20 left-0 w-24 h-24 bg-cyan/10 rounded-full blur-2xl -translate-x-1/2" />
        <div className="absolute bottom-0 right-0 w-20 h-20 bg-pink/10 rounded-full blur-2xl translate-y-1/2" />
        
        {/* Header */}
        <div className="relative p-4 border-b border-white/10">
          {!collapsed ? (
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gold/20 rounded-full blur-xl animate-pulse" />
                <img 
                  src={navjeevanLogo} 
                  alt="Navjeevan Hospital Logo" 
                  className="w-20 h-20 object-contain relative z-10 drop-shadow-lg"
                />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-white tracking-wider flex items-center gap-2 justify-center">
                  <Sparkles className="w-4 h-4 text-gold" />
                  NAVJEEVAN
                  <Sparkles className="w-4 h-4 text-gold" />
                </h2>
                <p className="text-sm text-gold font-medium tracking-wide">Hospital Sirhind</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gold/30 rounded-full blur-md" />
                <img 
                  src={navjeevanLogo} 
                  alt="NH Logo" 
                  className="w-8 h-8 object-contain relative z-10"
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Navigation */}
        <SidebarGroup className="relative z-10">
          <SidebarGroupLabel className="text-white/50 uppercase text-[10px] tracking-widest font-semibold mb-1">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={`${getNavClass(item.url)} rounded-lg mx-1 group`}
                    >
                      <item.icon className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${isActive(item.url) ? 'text-gold' : ''}`} />
                      {!collapsed && <span className="ml-3">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick Actions */}
        <SidebarGroup className="relative z-10 mt-2">
          <SidebarGroupLabel className="text-white/50 uppercase text-[10px] tracking-widest font-semibold mb-1">
            Quick Actions
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/patients/new" 
                    className="text-gold hover:bg-gold/10 rounded-lg mx-1 transition-all duration-200 group border border-gold/20 hover:border-gold/40"
                  >
                    <Plus className="h-5 w-5 transition-transform duration-200 group-hover:rotate-90" />
                    {!collapsed && <span className="ml-3 font-medium">Add Patient</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/prescriptions/new" 
                    className="text-cyan hover:bg-cyan/10 rounded-lg mx-1 transition-all duration-200 group border border-cyan/20 hover:border-cyan/40"
                  >
                    <Plus className="h-5 w-5 transition-transform duration-200 group-hover:rotate-90" />
                    {!collapsed && <span className="ml-3 font-medium">New Prescription</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/invoices/new" 
                    className="text-pink hover:bg-pink/10 rounded-lg mx-1 transition-all duration-200 group border border-pink/20 hover:border-pink/40"
                  >
                    <Plus className="h-5 w-5 transition-transform duration-200 group-hover:rotate-90" />
                    {!collapsed && <span className="ml-3 font-medium">New Invoice</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Footer decoration */}
        <div className="mt-auto p-4 relative z-10">
          {!collapsed && (
            <div className="text-center">
              <div className="h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent mb-3" />
              <p className="text-[10px] text-white/40 tracking-wide">Powered by Lovable</p>
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
