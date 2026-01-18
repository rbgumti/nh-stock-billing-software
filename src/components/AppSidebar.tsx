import { NavLink, useLocation } from "react-router-dom";
import { Users, Package, Receipt, LayoutDashboard, Plus, BarChart3, Activity, Calendar, FileText, ChevronRight, PanelLeftClose, PanelLeft, Menu, Bell } from "lucide-react";
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
  { title: "Dashboard", url: "/", icon: LayoutDashboard, color: "from-pink to-cyan", glow: "shadow-pink/40" },
  { title: "Patients", url: "/patients", icon: Users, color: "from-cyan to-pink", glow: "shadow-cyan/40" },
  { title: "Appointments", url: "/appointments", icon: Calendar, color: "from-pink to-purple", glow: "shadow-pink/40" },
  { title: "Prescriptions", url: "/prescriptions", icon: FileText, color: "from-cyan to-purple", glow: "shadow-cyan/40" },
  { title: "Patient Analytics", url: "/analytics/patients", icon: Activity, color: "from-pink to-cyan", glow: "shadow-pink/40" },
  { title: "Stock", url: "/stock", icon: Package, color: "from-cyan to-pink", glow: "shadow-cyan/40" },
  { title: "Invoices", url: "/invoices", icon: Receipt, color: "from-pink to-purple", glow: "shadow-pink/40" },
  { title: "Reports", url: "/reports", icon: BarChart3, color: "from-cyan to-pink", glow: "shadow-cyan/40" },
];

const quickActions = [
  { title: "Add Patient", url: "/patients/new", color: "from-pink to-cyan", iconColor: "text-cyan" },
  { title: "New Prescription", url: "/prescriptions/new", color: "from-cyan to-pink", iconColor: "text-pink" },
  { title: "New Invoice", url: "/invoices/new", color: "from-pink to-purple", iconColor: "text-pink" },
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
      <SidebarContent className="relative overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-pink/20 scrollbar-track-transparent hover:scrollbar-thumb-pink/40">
        {/* Dark glass background with neon accent */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/98 to-background backdrop-blur-xl" />
        
        {/* Neon gradient mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-pink/5 via-transparent to-cyan/5" />
        
        {/* Neon ambient blobs */}
        <div className="absolute top-16 right-0 w-32 h-32 bg-gradient-radial from-pink/20 to-transparent rounded-full blur-3xl animate-pulse-neon" />
        <div className="absolute bottom-1/4 right-0 w-28 h-28 bg-gradient-radial from-cyan/15 to-transparent rounded-full blur-3xl animate-pulse-neon" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-16 left-0 w-24 h-24 bg-gradient-radial from-purple/20 to-transparent rounded-full blur-2xl animate-pulse-neon" style={{ animationDelay: '2s' }} />
        
        {/* Top neon accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-pink via-cyan to-pink opacity-60" />
        
        {/* Side neon accent */}
        <div className="absolute top-0 left-0 w-[2px] h-full bg-gradient-to-b from-pink via-cyan to-pink opacity-40" />
        
        {/* Compact Header */}
        <div className="relative p-2 border-b border-pink/20">
          {/* Glass panel behind header with neon glow */}
          <div className="absolute inset-1 rounded-xl glass-card border border-pink/20" />
          
          {!collapsed ? (
            <div className="flex items-center gap-2 relative z-10 px-0.5">
              {/* Logo with neon glow */}
              <div className="relative group flex-shrink-0">
                <div className="absolute inset-0 w-14 h-14 rounded-full bg-gradient-to-r from-pink to-cyan opacity-0 group-hover:opacity-40 blur-lg transition-all duration-500" />
                <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-card to-background border-2 border-pink/30 group-hover:border-cyan/50 flex items-center justify-center overflow-hidden transition-all duration-300 shadow-lg shadow-pink/20">
                  <img 
                    src={navjeevanLogo} 
                    alt="Navjeevan Hospital Logo" 
                    className="w-12 h-12 object-contain"
                  />
                </div>
              </div>
              
              {/* Hospital Name with neon gradient */}
              <div className="min-w-0 flex-1 pl-1">
                <h2 className="text-sm font-bold tracking-wide bg-gradient-to-r from-pink via-cyan to-pink bg-clip-text text-transparent leading-tight animate-shimmer bg-[length:200%_100%]">
                  NAVJEEVAN
                </h2>
                <p className="text-[10px] font-medium tracking-wide text-cyan">
                  Hospital Sirhind
                </p>
              </div>

              {/* Notification Bell with neon glow */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <NavLink to="/reports" className="relative group">
                      <div className="w-9 h-9 rounded-xl glass-card hover:bg-pink/10 border border-pink/20 hover:border-cyan/40 flex items-center justify-center transition-all duration-300 hover:shadow-lg hover:shadow-pink/20">
                        <Bell className="h-4 w-4 text-muted-foreground group-hover:text-cyan transition-colors" />
                        {pendingFollowUps > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-r from-pink to-rose-500 text-[10px] font-bold text-white flex items-center justify-center shadow-lg shadow-pink/40 animate-pulse-neon">
                            {pendingFollowUps > 9 ? '9+' : pendingFollowUps}
                          </span>
                        )}
                      </div>
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="glass-card border-pink/20">
                    <p className="text-xs">{pendingFollowUps} pending follow-ups</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 relative z-10">
              <div className="relative group">
                <div className="absolute inset-0 w-11 h-11 rounded-full bg-gradient-to-r from-pink to-cyan opacity-0 group-hover:opacity-50 blur-md transition-all duration-300" />
                <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-card to-background border-2 border-pink/30 flex items-center justify-center overflow-hidden shadow-lg shadow-pink/20">
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
                    className="w-9 h-9 p-0 rounded-xl glass-card hover:bg-pink/10 border border-pink/20 hover:border-cyan/40 transition-all duration-300 hover:shadow-lg hover:shadow-pink/20"
                  >
                    <Menu className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 bg-background/98 border-pink/20 p-0 backdrop-blur-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-pink/5 to-cyan/5" />
                  <SheetHeader className="relative p-4 border-b border-pink/20">
                    <div className="flex items-center gap-3">
                      <img src={navjeevanLogo} alt="Logo" className="w-10 h-10 object-contain" />
                      <div>
                        <SheetTitle className="bg-gradient-to-r from-pink to-cyan bg-clip-text text-transparent text-base">NAVJEEVAN</SheetTitle>
                        <p className="text-xs text-cyan">Hospital Sirhind</p>
                      </div>
                    </div>
                  </SheetHeader>
                  
                  <div className="relative p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-100px)]">
                    {/* Navigation */}
                    <div>
                      <p className="text-[10px] text-pink uppercase tracking-widest mb-2 px-2">Navigate</p>
                      <div className="space-y-1">
                        {navigationItems.map((item) => (
                          <NavLink
                            key={item.title}
                            to={item.url}
                            onClick={() => setSheetOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${
                              isActive(item.url)
                                ? "glass-card border border-pink/30 shadow-lg shadow-pink/20"
                                : "hover:bg-pink/5 hover:border-pink/20"
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-lg ${
                              isActive(item.url) ? `bg-gradient-to-br ${item.color} ${item.glow}` : "glass-card"
                            }`}>
                              <item.icon className={`h-4 w-4 ${isActive(item.url) ? "text-white" : "text-muted-foreground"}`} />
                            </div>
                            <span className={isActive(item.url) ? "text-foreground font-medium" : "text-muted-foreground"}>
                              {item.title}
                            </span>
                          </NavLink>
                        ))}
                      </div>
                    </div>
                    
                    {/* Quick Actions */}
                    <div>
                      <p className="text-[10px] text-cyan uppercase tracking-widest mb-2 px-2">Quick Add</p>
                      <div className="space-y-1">
                        {quickActions.map((action) => (
                          <NavLink
                            key={action.title}
                            to={action.url}
                            onClick={() => setSheetOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-pink/5 transition-all duration-300 group"
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${action.color} shadow-lg group-hover:shadow-pink/30`}>
                              <Plus className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-muted-foreground group-hover:text-foreground transition-colors">{action.title}</span>
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
        
        {/* Navigation with neon active states */}
        <SidebarGroup className="relative z-10 px-2 pt-4">
          <SidebarGroupLabel className="text-pink uppercase text-[10px] tracking-[0.2em] font-semibold mb-3 px-3">
            Navigate
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={`group relative rounded-xl transition-all duration-300 flex items-center ${
                        isActive(item.url) 
                          ? "glass-card border border-pink/40 shadow-lg shadow-pink/20" 
                          : "hover:bg-pink/5 hover:border-pink/20"
                      }`}
                    >
                      {/* Neon active indicator */}
                      {isActive(item.url) && (
                        <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/5 bg-gradient-to-b ${item.color} rounded-full shadow-lg ${item.glow}`} />
                      )}
                      
                      {/* Icon container with neon glow */}
                      <div className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 ${
                        isActive(item.url) 
                          ? `bg-gradient-to-br ${item.color} shadow-lg ${item.glow}` 
                          : "glass-card group-hover:bg-pink/10"
                      }`}>
                        <item.icon className={`h-5 w-5 transition-colors ${
                          isActive(item.url) ? 'text-white' : 'text-muted-foreground group-hover:text-cyan'
                        }`} />
                      </div>
                      
                      {!collapsed && (
                        <>
                          <span className={`ml-3 font-medium transition-colors ${
                            isActive(item.url) ? 'bg-gradient-to-r from-pink to-cyan bg-clip-text text-transparent' : 'text-muted-foreground group-hover:text-foreground'
                          }`}>
                            {item.title}
                          </span>
                          
                          {isActive(item.url) && (
                            <ChevronRight className="ml-auto h-4 w-4 text-cyan" />
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

        {/* Quick Actions with neon glass cards */}
        <SidebarGroup className="relative z-10 mt-4 px-2">
          <SidebarGroupLabel className="uppercase text-[10px] tracking-[0.25em] font-semibold mb-3 px-3 flex items-center gap-2">
            <div className="w-6 h-[1px] bg-gradient-to-r from-cyan to-transparent" />
            <span className="text-cyan">Quick Add</span>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-pink/30 to-transparent" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1.5">
              {quickActions.map((action) => (
                <SidebarMenuItem key={action.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={action.url} 
                      className="relative rounded-xl glass-card border border-pink/20 hover:border-cyan/40 transition-all duration-500 group overflow-hidden hover:shadow-lg hover:shadow-pink/20"
                    >
                      {/* Neon shimmer effect */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700 overflow-hidden rounded-xl">
                        <div className="absolute inset-0 bg-gradient-to-r from-pink/20 via-cyan/20 to-pink/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                      </div>
                      
                      {/* Icon with neon glow and rotation */}
                      <div className={`relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br ${action.color} shadow-lg shadow-pink/30 transition-all duration-500 group-hover:scale-110 group-hover:rotate-90 group-hover:shadow-xl group-hover:shadow-cyan/40`}>
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

        {/* Toggle Button with neon glass effect */}
        <div className="mt-auto relative z-10">
          <div className={`px-3 py-3 ${collapsed ? 'flex justify-center' : ''}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className={`group relative overflow-hidden rounded-xl glass-card border border-pink/20 hover:border-cyan/40 transition-all duration-500 backdrop-blur-md hover:shadow-lg hover:shadow-pink/20 ${
                collapsed ? 'w-10 h-10 p-0' : 'w-full justify-between'
              }`}
            >
              {/* Neon shimmer effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700 overflow-hidden rounded-xl">
                <div className="absolute inset-0 bg-gradient-to-r from-pink/20 via-cyan/20 to-pink/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
              </div>
              
              {!collapsed && (
                <span className="text-muted-foreground text-xs font-medium group-hover:text-cyan transition-all duration-500 relative z-10">
                  Collapse
                </span>
              )}
              
              <div className={`relative flex items-center justify-center transition-all duration-500 ${
                collapsed ? '' : 'bg-gradient-to-br from-pink/20 to-cyan/20 rounded-lg p-1.5 border border-pink/20'
              }`}>
                {collapsed ? (
                  <PanelLeft className="h-5 w-5 text-muted-foreground group-hover:text-cyan transition-all duration-500 group-hover:scale-110" />
                ) : (
                  <PanelLeftClose className="h-4 w-4 text-muted-foreground group-hover:text-pink transition-all duration-500 group-hover:scale-110" />
                )}
              </div>
            </Button>
          </div>

          {/* Footer with neon separator */}
          {!collapsed && (
            <div className="text-center px-4 pb-4">
              <div className="h-px bg-gradient-to-r from-transparent via-pink/40 to-transparent mb-3" />
              <p className="text-[10px] text-muted-foreground tracking-wider font-medium">
                Powered by <span className="bg-gradient-to-r from-pink via-cyan to-pink bg-clip-text text-transparent font-semibold animate-shimmer bg-[length:200%_100%]">Lovable</span>
              </p>
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
