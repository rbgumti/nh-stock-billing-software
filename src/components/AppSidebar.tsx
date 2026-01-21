import { NavLink, useLocation } from "react-router-dom";
import { Users, Package, Receipt, LayoutDashboard, Plus, BarChart3, Activity, Calendar, FileText, ChevronRight, PanelLeftClose, PanelLeft, Menu, Bell, Wallet } from "lucide-react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import navjeevanLogo from "@/assets/NH_LOGO.png";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatLocalISODate } from "@/lib/dateUtils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SettingsDialog } from "@/components/SettingsDialog";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, color: "from-violet-500 to-purple-600", glow: "group-hover:shadow-violet-500/30" },
  { title: "Patients", url: "/patients", icon: Users, color: "from-blue-500 to-cyan-500", glow: "group-hover:shadow-blue-500/30" },
  { title: "Appointments", url: "/appointments", icon: Calendar, color: "from-emerald-500 to-teal-500", glow: "group-hover:shadow-emerald-500/30" },
  { title: "Prescriptions", url: "/prescriptions", icon: FileText, color: "from-amber-500 to-orange-500", glow: "group-hover:shadow-amber-500/30" },
  { title: "Patient Analytics", url: "/analytics/patients", icon: Activity, color: "from-pink-500 to-rose-500", glow: "group-hover:shadow-pink-500/30" },
  { title: "Stock", url: "/stock", icon: Package, color: "from-indigo-500 to-blue-500", glow: "group-hover:shadow-indigo-500/30" },
  { title: "Invoices", url: "/invoices", icon: Receipt, color: "from-green-500 to-emerald-500", glow: "group-hover:shadow-green-500/30" },
  { title: "Reports", url: "/reports", icon: BarChart3, color: "from-purple-500 to-violet-500", glow: "group-hover:shadow-purple-500/30" },
  { title: "Salary", url: "/salary", icon: Wallet, color: "from-teal-500 to-cyan-500", glow: "group-hover:shadow-teal-500/30" },
];

const quickActions = [
  { title: "Add Patient", url: "/patients/new", color: "from-blue-500 to-cyan-500", iconColor: "text-cyan-400" },
  { title: "New Prescription", url: "/prescriptions/new", color: "from-amber-500 to-orange-500", iconColor: "text-amber-400" },
  { title: "New Invoice", url: "/invoices/new", color: "from-green-500 to-emerald-500", iconColor: "text-emerald-400" },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingFollowUps, setPendingFollowUps] = useState(0);

  // Fetch pending follow-ups count
  useEffect(() => {
    const fetchPendingFollowUps = async () => {
      const today = formatLocalISODate();
      const { count, error } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .lte('follow_up_date', today)
        .not('follow_up_date', 'is', null);
      
      if (!error && count !== null) {
        setPendingFollowUps(count);
      }
    };

    fetchPendingFollowUps();

    // Subscribe to invoice changes
    const channel = supabase
      .channel('sidebar-followups')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        fetchPendingFollowUps();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  return (
    <Sidebar className={`${collapsed ? "w-14" : "w-64"} border-r-0 transition-all duration-300`} collapsible="icon">
      <SidebarContent className="relative overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20">
        {/* Optimized Glass Background */}
        <div className="absolute inset-0 sidebar-glass" />
        
        {/* Simplified Gradient Mesh - uses theme primary color */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-secondary/6" />
        
        {/* Reduced Ambient Blobs - uses theme colors */}
        <div className="absolute top-16 right-0 w-32 h-32 bg-gradient-radial from-primary/20 to-transparent rounded-full blur-2xl" />
        <div className="absolute bottom-1/4 right-0 w-28 h-28 bg-gradient-radial from-accent/15 to-transparent rounded-full blur-2xl" />
        <div className="absolute bottom-16 left-0 w-24 h-24 bg-gradient-radial from-sidebar-primary/20 to-transparent rounded-full blur-xl" />
        
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        {/* Side Accent - uses theme primary */}
        <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-primary/30 via-transparent to-secondary/30" />
        
        {/* Compact Header */}
        <div className="relative p-2 border-b border-white/5">
          {/* Glass panel behind header */}
          <div className="absolute inset-1 rounded-xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/10" />
          
          {!collapsed ? (
            <div className="flex items-center gap-2 relative z-10 px-0.5">
              {/* Logo */}
              <div className="relative group flex-shrink-0">
                <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-white/15 group-hover:border-white/30 flex items-center justify-center overflow-hidden transition-colors duration-200">
                  <img 
                    src={navjeevanLogo} 
                    alt="Navjeevan Hospital Logo" 
                    className="w-12 h-12 object-contain"
                  />
                </div>
              </div>
              
              {/* Hospital Name */}
              <div className="min-w-0 flex-1 pl-1">
                <h2 className="text-sm font-bold tracking-wide bg-gradient-to-r from-white to-violet-200 bg-clip-text text-transparent leading-tight">
                  NAVJEEVAN
                </h2>
                <p className="text-[10px] font-medium tracking-wide text-amber-400">
                  Hospital Sirhind
                </p>
              </div>

              {/* Notification Bell */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <NavLink to="/reports" className="relative">
                      <div className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors duration-200">
                        <Bell className="h-4 w-4 text-slate-400 hover:text-white" />
                        {pendingFollowUps > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">
                            {pendingFollowUps > 9 ? '9+' : pendingFollowUps}
                          </span>
                        )}
                      </div>
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-slate-800/95 border-white/10">
                    <p className="text-xs">{pendingFollowUps} pending follow-ups</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 relative z-10">
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-white/15 flex items-center justify-center overflow-hidden">
                  <img 
                    src={navjeevanLogo}
                    alt="NH Logo" 
                    className="w-9 h-9 object-contain"
                  />
                </div>
              </div>
              
              {/* Slide Panel Trigger */}
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-9 h-9 p-0 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors duration-200"
                  >
                    <Menu className="h-4 w-4 text-slate-400" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 bg-slate-900/98 border-white/10 p-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-600/3 to-cyan-600/3" />
                  <SheetHeader className="relative p-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <img src={navjeevanLogo} alt="Logo" className="w-10 h-10 object-contain" />
                      <div>
                        <SheetTitle className="text-white text-base">NAVJEEVAN</SheetTitle>
                        <p className="text-xs text-amber-400">Hospital Sirhind</p>
                      </div>
                    </div>
                  </SheetHeader>
                  
                  <div className="relative p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-100px)]">
                    {/* Navigation */}
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 px-2">Navigate</p>
                      <div className="space-y-1">
                        {navigationItems.map((item) => (
                          <NavLink
                            key={item.title}
                            to={item.url}
                            onClick={() => setSheetOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-150 ${
                              isActive(item.url)
                                ? "bg-white/10 border border-white/10"
                                : "hover:bg-white/5"
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              isActive(item.url) ? `bg-gradient-to-br ${item.color}` : "bg-white/5"
                            }`}>
                              <item.icon className={`h-4 w-4 ${isActive(item.url) ? "text-white" : "text-slate-400"}`} />
                            </div>
                            <span className={isActive(item.url) ? "text-white font-medium" : "text-slate-300"}>
                              {item.title}
                            </span>
                          </NavLink>
                        ))}
                      </div>
                    </div>
                    
                    {/* Quick Actions */}
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 px-2">Quick Add</p>
                      <div className="space-y-1">
                        {quickActions.map((action) => (
                          <NavLink
                            key={action.title}
                            to={action.url}
                            onClick={() => setSheetOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors duration-150"
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${action.color}`}>
                              <Plus className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-slate-300">{action.title}</span>
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}
        </div>
        
        {/* Navigation - Optimized for performance */}
        <SidebarGroup className="relative z-10 px-2 pt-4">
          <SidebarGroupLabel className="text-slate-500/90 uppercase text-[10px] tracking-[0.2em] font-semibold mb-3 px-3">
            Navigate
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={`relative rounded-xl transition-colors duration-150 flex items-center ${
                        isActive(item.url) 
                          ? "bg-white/10 border border-white/15" 
                          : "hover:bg-white/5"
                      }`}
                    >
                      {/* Active indicator */}
                      {isActive(item.url) && (
                        <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/5 bg-gradient-to-b ${item.color} rounded-full`} />
                      )}
                      
                      {/* Icon container */}
                      <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${
                        isActive(item.url) 
                          ? `bg-gradient-to-br ${item.color}` 
                          : "bg-white/5"
                      }`}>
                        <item.icon className={`h-5 w-5 ${
                          isActive(item.url) ? 'text-white' : 'text-slate-400'
                        }`} />
                      </div>
                      
                      {!collapsed && (
                        <>
                          <span className={`ml-3 font-medium ${
                            isActive(item.url) ? 'text-white' : 'text-slate-400'
                          }`}>
                            {item.title}
                          </span>
                          
                          {isActive(item.url) && (
                            <ChevronRight className="ml-auto h-4 w-4 text-white/60" />
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

        {/* Quick Actions with Enhanced Glass Cards */}
        <SidebarGroup className="relative z-10 mt-4 px-2">
          <SidebarGroupLabel className="text-slate-500/90 uppercase text-[10px] tracking-[0.25em] font-semibold mb-3 px-3 flex items-center gap-2">
            <div className="w-6 h-[1px] bg-gradient-to-r from-amber-500/60 to-transparent" />
            <span className="bg-gradient-to-r from-slate-400 to-slate-500 bg-clip-text text-transparent">Quick Add</span>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1.5">
              {quickActions.map((action) => (
                <SidebarMenuItem key={action.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={action.url} 
                      className="relative rounded-xl border border-white/[0.1] bg-gradient-to-r from-white/[0.04] to-transparent backdrop-blur-sm hover:from-white/[0.1] hover:to-white/[0.02] hover:border-white/20 transition-all duration-500 group overflow-hidden hover:shadow-lg"
                    >
                      {/* Enhanced shimmer effect */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700 overflow-hidden rounded-xl">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/12 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                      </div>
                      
                      {/* Icon with enhanced glass container and rotation */}
                      <div className={`relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br ${action.color} shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:rotate-90 group-hover:shadow-xl group-hover:shadow-current/30`}>
                        <Plus className="h-4 w-4 text-white relative z-10" />
                      </div>
                      
                      {!collapsed && (
                        <span className={`ml-3 font-medium bg-gradient-to-r ${action.color} bg-clip-text text-transparent group-hover:opacity-100 opacity-75 transition-all duration-500 group-hover:translate-x-0.5`}>
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

        {/* Settings Section */}
        {!collapsed && (
          <SidebarGroup className="relative z-10 mt-2">
            <SidebarGroupContent>
              <div className="px-2">
                <SettingsDialog />
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Toggle Button with Enhanced Glass Effect */}
        <div className="mt-auto relative z-10">
          <div className={`px-3 py-3 ${collapsed ? 'flex justify-center' : ''}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className={`group relative overflow-hidden rounded-xl border border-white/[0.1] bg-gradient-to-r from-white/[0.05] to-transparent hover:from-white/[0.12] hover:to-white/[0.04] hover:border-white/20 transition-all duration-500 backdrop-blur-md hover:shadow-lg hover:shadow-primary/10 ${
                collapsed ? 'w-10 h-10 p-0' : 'w-full justify-between'
              }`}
            >
              {/* Enhanced glass shimmer effect - uses theme colors */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700 overflow-hidden rounded-xl">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/15 via-secondary/15 to-primary/15 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
              </div>
              
              {!collapsed && (
                <span className="text-slate-500 text-xs font-medium group-hover:text-slate-300 transition-all duration-500 relative z-10">
                  Collapse
                </span>
              )}
              
              <div className={`relative flex items-center justify-center transition-all duration-500 ${
                collapsed ? '' : 'bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg p-1.5 border border-white/10'
              }`}>
                {collapsed ? (
                  <PanelLeft className="h-5 w-5 text-slate-400 group-hover:text-primary transition-all duration-500 group-hover:scale-110" />
                ) : (
                  <PanelLeftClose className="h-4 w-4 text-slate-400 group-hover:text-primary transition-all duration-500 group-hover:scale-110" />
                )}
              </div>
            </Button>
          </div>

          {/* Footer with Enhanced Glass Separator */}
          {!collapsed && (
            <div className="text-center px-4 pb-4">
              <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-3" />
              <p className="text-[10px] text-slate-600/80 tracking-wider font-medium">
                Powered by <span className="bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent font-semibold">Lovable</span>
              </p>
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
