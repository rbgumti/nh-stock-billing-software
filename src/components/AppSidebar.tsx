import { NavLink, useLocation } from "react-router-dom";
import { Users, Package, Receipt, LayoutDashboard, Plus, BarChart3, Activity, Calendar, FileText } from "lucide-react";
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
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
      : "hover:bg-sidebar-accent/50 text-sidebar-foreground";

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent>
        <div className="p-4 border-b border-sidebar-border bg-sidebar">
          {!collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <img 
                src={navjeevanLogo} 
                alt="Navjeevan Hospital Logo" 
                className="w-20 h-20 object-contain"
              />
              <div className="text-center">
                <h2 className="text-lg font-bold text-sidebar-foreground tracking-wide">NAVJEEVAN</h2>
                <p className="text-xs text-sidebar-primary">Hospital Sirhind</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <img 
                src={navjeevanLogo} 
                alt="NH Logo" 
                className="w-8 h-8 object-contain"
              />
            </div>
          )}
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClass(item.url)}>
                      <item.icon className="h-5 w-5" />
                      {!collapsed && <span className="ml-3">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/patients/new" className="text-sidebar-primary hover:bg-sidebar-accent/30">
                    <Plus className="h-5 w-5" />
                    {!collapsed && <span className="ml-3">Add Patient</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/prescriptions/new" className="text-sidebar-primary hover:bg-sidebar-accent/30">
                    <Plus className="h-5 w-5" />
                    {!collapsed && <span className="ml-3">New Prescription</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/invoices/new" className="text-sidebar-primary hover:bg-sidebar-accent/30">
                    <Plus className="h-5 w-5" />
                    {!collapsed && <span className="ml-3">New Invoice</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
