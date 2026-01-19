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
  { title: "Dashboard", url: "/", icon: LayoutDashboard, color: "from-primary to-secondary", glow: "shadow-primary/30" },
  { title: "Patients", url: "/patients", icon: Users, color: "from-cyan to-teal", glow: "shadow-cyan/30" },
  { title: "Appointments", url: "/appointments", icon: Calendar, color: "from-primary to-cyan", glow: "shadow-primary/30" },
  { title: "Prescriptions", url: "/prescriptions", icon: FileText, color: "from-secondary to-cyan", glow: "shadow-secondary/30" },
  { title: "Patient Analytics", url: "/analytics/patients", icon: Activity, color: "from-teal to-emerald", glow: "shadow-teal/30" },
  { title: "Stock", url: "/stock", icon: Package, color: "from-cyan to-primary", glow: "shadow-cyan/30" },
  { title: "Invoices", url: "/invoices", icon: Receipt, color: "from-primary to-purple", glow: "shadow-primary/30" },
  { title: "Reports", url: "/reports", icon: BarChart3, color: "from-secondary to-primary", glow: "shadow-secondary/30" },
];

const quickActions = [
  { title: "Add Patient", url: "/patients/new", color: "from-primary to-cyan", iconColor: "text-primary" },
  { title: "New Prescription", url: "/prescriptions/new", color: "from-cyan to-teal", iconColor: "text-cyan" },
  { title: "New Invoice", url: "/invoices/new", color: "from-secondary to-primary", iconColor: "text-secondary" },
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
      <SidebarContent className="relative overflow-y-auto overflow-x-hidden scrollbar-thin">
        {/* Glass background */}
        <div className="absolute inset-0 sidebar-glass" />
        
        {/* Subtle mint gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-teal-500/5" />
        
        {/* Ambient mint orbs */}
        <div className="absolute top-16 right-0 w-32 h-32 bg-gradient-radial from-emerald-500/15 to-transparent rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-1/4 right-0 w-28 h-28 bg-gradient-radial from-teal-500/10 to-transparent rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }} />
        
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-emerald-500/50 via-teal-500/30 to-emerald-500/50" />
        
        {/* Compact Header */}
        <div className="relative p-2 border-b border-border/50">
          {/* Glass panel behind header */}
          <div className="absolute inset-1 rounded-xl glass-card" />
          
          {!collapsed ? (
            <div className="flex items-center gap-2 relative z-10 px-0.5">
              {/* Logo */}
              <div className="relative group flex-shrink-0">
                <div className="absolute inset-0 w-14 h-14 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-30 blur-lg transition-all duration-500" />
                <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 border-2 border-emerald-500/30 group-hover:border-emerald-500/50 flex items-center justify-center overflow-hidden transition-all duration-300 shadow-lg shadow-emerald-500/20">
                  <img 
                    src={navjeevanLogo} 
                    alt="Navjeevan Hospital Logo" 
                    className="w-12 h-12 object-contain"
                  />
                </div>
              </div>
              
              {/* Hospital Name with mint gradient */}
              <div className="min-w-0 flex-1 pl-1">
                <h2 className="text-sm font-bold tracking-wide bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent leading-tight">
                  NAVJEEVAN
                </h2>
                <p className="text-[10px] font-medium tracking-wide text-emerald-600/70 dark:text-emerald-400/70">
                  Hospital Sirhind
                </p>
              </div>

              {/* Notification Bell */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <NavLink to="/reports" className="relative group">
                      <div className="w-9 h-9 rounded-xl glass-card hover:bg-emerald-500/10 flex items-center justify-center transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/20">
                        <Bell className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                        {pendingFollowUps > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-[10px] font-bold text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                            {pendingFollowUps > 9 ? '9+' : pendingFollowUps}
                          </span>
                        )}
                      </div>
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="glass-card">
                    <p className="text-xs">{pendingFollowUps} pending follow-ups</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 relative z-10">
              <div className="relative group">
                <div className="absolute inset-0 w-11 h-11 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-40 blur-md transition-all duration-300" />
                <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 border-2 border-emerald-500/30 flex items-center justify-center overflow-hidden shadow-lg shadow-emerald-500/20">
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
                    className="w-9 h-9 p-0 rounded-xl glass-card hover:bg-emerald-500/10 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10"
                  >
                    <Menu className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 glass-strong border-border/50 p-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5" />
                  <SheetHeader className="relative p-4 border-b border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 border-2 border-emerald-500/30 flex items-center justify-center overflow-hidden">
                        <img src={navjeevanLogo} alt="Logo" className="w-8 h-8 object-contain" />
                      </div>
                      <div>
                        <SheetTitle className="bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent text-base">NAVJEEVAN</SheetTitle>
                        <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Hospital Sirhind</p>
                      </div>
                    </div>
                  </SheetHeader>
                  
                  <div className="relative p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-100px)]">
                    {/* Navigation */}
                    <div>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2 px-2">Navigate</p>
                      <div className="space-y-1">
                        {navigationItems.map((item) => (
                          <NavLink
                            key={item.title}
                            to={item.url}
                            onClick={() => setSheetOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${
                              isActive(item.url)
                                ? "glass-card border border-primary/30 shadow-lg shadow-primary/10"
                                : "hover:bg-primary/5"
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-lg ${
                              isActive(item.url) ? `bg-gradient-to-br ${item.color} ${item.glow}` : "glass-subtle"
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
                      <p className="text-[10px] text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-2 px-2">Quick Add</p>
                      <div className="space-y-1">
                        {quickActions.map((action) => (
                          <NavLink
                            key={action.title}
                            to={action.url}
                            onClick={() => setSheetOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/5 transition-all duration-300 group"
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${action.color} shadow-lg group-hover:shadow-primary/20`}>
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
        
        {/* Navigation */}
        <SidebarGroup className="relative z-10 px-2 pt-4">
          <SidebarGroupLabel className="text-emerald-600 dark:text-emerald-400 uppercase text-[10px] tracking-[0.2em] font-semibold mb-3 px-3">
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
                          ? "glass-card border border-primary/30 shadow-lg shadow-primary/10" 
                          : "hover:bg-primary/5"
                      }`}
                    >
                      {/* Active indicator */}
                      {isActive(item.url) && (
                        <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/5 bg-gradient-to-b ${item.color} rounded-full shadow-lg ${item.glow}`} />
                      )}
                      
                      {/* Icon container */}
                      <div className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 ${
                        isActive(item.url) 
                          ? `bg-gradient-to-br ${item.color} shadow-lg ${item.glow}` 
                          : "glass-subtle group-hover:bg-primary/10"
                      }`}>
                        <item.icon className={`h-5 w-5 transition-colors ${
                          isActive(item.url) ? 'text-white' : 'text-muted-foreground group-hover:text-primary'
                        }`} />
                      </div>
                      
                      {!collapsed && (
                        <>
                          <span className={`ml-3 font-medium transition-colors ${
                            isActive(item.url) ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                          }`}>
                            {item.title}
                          </span>
                          
                          {isActive(item.url) && (
                            <ChevronRight className="ml-auto h-4 w-4 text-primary" />
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
          <SidebarGroupLabel className="uppercase text-[10px] tracking-[0.25em] font-semibold mb-3 px-3 flex items-center gap-2">
            <div className="w-6 h-[1px] bg-gradient-to-r from-teal-500 to-transparent" />
            <span className="text-teal-600 dark:text-teal-400">Quick Add</span>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1.5">
              {quickActions.map((action) => (
                <SidebarMenuItem key={action.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={action.url} 
                      className="relative rounded-xl glass-card hover:border-primary/30 transition-all duration-300 group overflow-hidden hover:shadow-lg hover:shadow-primary/10"
                    >
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700 overflow-hidden rounded-xl">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                      </div>
                      
                      {/* Icon */}
                      <div className={`relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br ${action.color} shadow-lg transition-all duration-300 group-hover:scale-110`}>
                        <Plus className="h-4 w-4 text-white relative z-10" />
                      </div>
                      
                      {!collapsed && (
                        <span className={`ml-3 font-medium text-muted-foreground group-hover:text-foreground transition-all duration-300`}>
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

        {/* Toggle Button */}
        <div className="mt-auto relative z-10">
          <div className={`px-3 py-3 ${collapsed ? 'flex justify-center' : ''}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className={`group relative overflow-hidden rounded-xl glass-card hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 ${
                collapsed ? 'w-10 h-10 p-0' : 'w-full justify-between'
              }`}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700 overflow-hidden rounded-xl">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
              </div>
              
              {!collapsed && (
                <span className="text-muted-foreground text-xs font-medium group-hover:text-foreground transition-all duration-300 relative z-10">
                  Collapse
                </span>
              )}
              
              <div className={`relative flex items-center justify-center transition-all duration-300 ${
                collapsed ? '' : 'bg-primary/10 rounded-lg p-1.5'
              }`}>
                {collapsed ? (
                  <PanelLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-all duration-300" />
                ) : (
                  <PanelLeftClose className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all duration-300" />
                )}
              </div>
            </Button>
          </div>

          {/* Footer */}
          {!collapsed && (
            <div className="text-center px-4 pb-4">
              <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent mb-3" />
              <p className="text-[10px] text-muted-foreground tracking-wider font-medium">
                Powered by <span className="text-gradient-blue font-semibold">Lovable</span>
              </p>
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
