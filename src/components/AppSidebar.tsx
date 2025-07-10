
import { NavLink, useLocation } from "react-router-dom";
import { Users, Package, Receipt, LayoutDashboard, Plus } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Patients", url: "/patients", icon: Users },
  { title: "Stock", url: "/stock", icon: Package },
  { title: "Invoices", url: "/invoices", icon: Receipt },
];

export function AppSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  console.log("Current path in sidebar:", currentPath);

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  const getNavClass = (path: string) =>
    isActive(path) 
      ? "bg-blue-100 text-blue-900 font-medium" 
      : "hover:bg-gray-100 text-gray-700";

  const handleAddPatientClick = () => {
    console.log("Add Patient link clicked, navigating to /patients/new");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-blue-900">MedManager</h2>
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
                      <span className="ml-3">{item.title}</span>
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
                  <NavLink 
                    to="/patients/new" 
                    className="text-green-700 hover:bg-green-50"
                    onClick={handleAddPatientClick}
                  >
                    <Plus className="h-5 w-5" />
                    <span className="ml-3">Add Patient</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/invoices/new" className="text-green-700 hover:bg-green-50">
                    <Plus className="h-5 w-5" />
                    <span className="ml-3">New Invoice</span>
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
