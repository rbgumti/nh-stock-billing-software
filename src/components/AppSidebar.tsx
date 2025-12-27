import { NavLink, useLocation } from "react-router-dom";
import { Users, Package, Receipt, LayoutDashboard, Plus, BarChart3, Activity, Calendar, FileText, Sparkles, ChevronRight } from "lucide-react";
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
  { title: "Dashboard", url: "/", icon: LayoutDashboard, color: "from-violet-500 to-purple-600" },
  { title: "Patients", url: "/patients", icon: Users, color: "from-blue-500 to-cyan-500" },
  { title: "Appointments", url: "/appointments", icon: Calendar, color: "from-emerald-500 to-teal-500" },
  { title: "Prescriptions", url: "/prescriptions", icon: FileText, color: "from-amber-500 to-orange-500" },
  { title: "Patient Analytics", url: "/analytics/patients", icon: Activity, color: "from-pink-500 to-rose-500" },
  { title: "Stock", url: "/stock", icon: Package, color: "from-indigo-500 to-blue-500" },
  { title: "Invoices", url: "/invoices", icon: Receipt, color: "from-green-500 to-emerald-500" },
  { title: "Reports", url: "/reports", icon: BarChart3, color: "from-purple-500 to-violet-500" },
];

const quickActions = [
  { title: "Add Patient", url: "/patients/new", color: "from-blue-500 to-cyan-500", hoverBg: "hover:bg-blue-500/10" },
  { title: "New Prescription", url: "/prescriptions/new", color: "from-amber-500 to-orange-500", hoverBg: "hover:bg-amber-500/10" },
  { title: "New Invoice", url: "/invoices/new", color: "from-green-500 to-emerald-500", hoverBg: "hover:bg-green-500/10" },
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

  return (
    <Sidebar className={`${collapsed ? "w-14" : "w-64"} border-r-0`} collapsible="icon">
      <SidebarContent className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-cyan-600/10 animate-pulse" />
        
        {/* Floating orbs */}
        <div className="absolute top-10 right-2 w-20 h-20 bg-gradient-to-br from-violet-500/30 to-purple-600/20 rounded-full blur-2xl animate-float" />
        <div className="absolute top-1/3 -left-4 w-16 h-16 bg-gradient-to-br from-cyan-500/25 to-blue-600/15 rounded-full blur-2xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/4 right-0 w-24 h-24 bg-gradient-to-br from-pink-500/20 to-rose-600/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-10 left-2 w-14 h-14 bg-gradient-to-br from-amber-500/25 to-orange-600/15 rounded-full blur-xl animate-float" style={{ animationDelay: '0.5s' }} />
        
        {/* Header */}
        <div className="relative p-4 border-b border-white/10">
          {!collapsed ? (
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                <div className="absolute -inset-2 bg-gradient-to-r from-violet-600 via-cyan-500 to-pink-500 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-500 animate-pulse" />
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/40 to-cyan-500/40 rounded-full blur-md" />
                <img 
                  src={navjeevanLogo} 
                  alt="Navjeevan Hospital Logo" 
                  className="w-20 h-20 object-contain relative z-10 drop-shadow-2xl transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold tracking-wider flex items-center gap-2 justify-center">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span className="bg-gradient-to-r from-white via-violet-200 to-cyan-200 bg-clip-text text-transparent">
                    NAVJEEVAN
                  </span>
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                </h2>
                <p className="text-sm font-medium tracking-wide bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                  Hospital Sirhind
                </p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full blur opacity-50 group-hover:opacity-75 transition-opacity" />
                <img 
                  src={navjeevanLogo} 
                  alt="NH Logo" 
                  className="w-8 h-8 object-contain relative z-10 transition-transform duration-200 group-hover:scale-110"
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Navigation */}
        <SidebarGroup className="relative z-10 px-2 pt-4">
          <SidebarGroupLabel className="text-slate-500 uppercase text-[10px] tracking-[0.2em] font-semibold mb-2 px-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={`relative overflow-hidden rounded-xl transition-all duration-300 group flex items-center ${
                        isActive(item.url) 
                          ? "bg-white/10 backdrop-blur-sm shadow-lg shadow-black/20" 
                          : "hover:bg-white/5"
                      }`}
                    >
                      {/* Active indicator gradient bar */}
                      {isActive(item.url) && (
                        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${item.color} rounded-full`} />
                      )}
                      
                      {/* Icon with gradient background when active */}
                      <div className={`relative flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-300 ${
                        isActive(item.url) 
                          ? `bg-gradient-to-br ${item.color} shadow-lg` 
                          : "group-hover:bg-white/10"
                      }`}>
                        <item.icon className={`h-5 w-5 transition-all duration-300 ${
                          isActive(item.url) 
                            ? 'text-white drop-shadow-sm' 
                            : 'text-slate-400 group-hover:text-white'
                        }`} />
                      </div>
                      
                      {!collapsed && (
                        <>
                          <span className={`ml-3 font-medium transition-colors duration-300 ${
                            isActive(item.url) 
                              ? 'text-white' 
                              : 'text-slate-400 group-hover:text-white'
                          }`}>
                            {item.title}
                          </span>
                          
                          {isActive(item.url) && (
                            <ChevronRight className="ml-auto h-4 w-4 text-white/70" />
                          )}
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick Actions */}
        <SidebarGroup className="relative z-10 mt-4 px-2">
          <SidebarGroupLabel className="text-slate-500 uppercase text-[10px] tracking-[0.2em] font-semibold mb-2 px-2">
            Quick Actions
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {quickActions.map((action) => (
                <SidebarMenuItem key={action.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={action.url} 
                      className={`rounded-xl border border-white/10 ${action.hoverBg} transition-all duration-300 group backdrop-blur-sm hover:border-white/20 hover:shadow-lg hover:shadow-black/10`}
                    >
                      <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br ${action.color} shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-90`}>
                        <Plus className="h-4 w-4 text-white" />
                      </div>
                      {!collapsed && (
                        <span className={`ml-3 font-medium bg-gradient-to-r ${action.color} bg-clip-text text-transparent`}>
                          {action.title}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Footer decoration */}
        <div className="mt-auto p-4 relative z-10">
          {!collapsed && (
            <div className="text-center">
              <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-3" />
              <p className="text-[10px] text-slate-600 tracking-wide">Powered by Lovable</p>
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
