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
import { useState, useEffect, useRef, useCallback } from "react";
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
  const [scrollY, setScrollY] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Parallax scroll handler
  const handleScroll = useCallback(() => {
    if (contentRef.current) {
      setScrollY(contentRef.current.scrollTop);
    }
  }, []);

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
    <Sidebar className={`${collapsed ? "w-14" : "w-64"} border-r-0 transition-all duration-500 ease-out`} collapsible="icon">
      <SidebarContent 
        ref={contentRef}
        onScroll={handleScroll}
        className="relative overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20"
      >
        {/* Enhanced Glossy Glass Background */}
        <div className="absolute inset-0 sidebar-glass sidebar-rainbow-border" />
        
        {/* Glossy Overlay for Depth */}
        <div className="absolute inset-0 sidebar-glossy-overlay" />
        
        {/* Rich Gradient Mesh with more colors */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-fuchsia-600/5 to-cyan-600/8" />
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-pink-500/5 to-amber-500/5" />
        
        {/* Parallax Ambient Orbs - different speeds for depth effect */}
        <div 
          className="absolute top-20 right-2 w-36 h-36 rounded-full sidebar-orb-purple pointer-events-none"
          style={{ transform: `translateY(${scrollY * 0.15}px)` }}
        />
        <div 
          className="absolute top-1/3 left-0 w-32 h-32 rounded-full sidebar-orb-cyan pointer-events-none"
          style={{ transform: `translateY(${scrollY * 0.08}px) translateX(${scrollY * 0.03}px)` }}
        />
        <div 
          className="absolute bottom-1/4 right-0 w-28 h-28 rounded-full sidebar-orb-pink pointer-events-none"
          style={{ transform: `translateY(${scrollY * -0.12}px)` }}
        />
        <div 
          className="absolute bottom-20 left-2 w-24 h-24 rounded-full sidebar-orb-gold pointer-events-none"
          style={{ transform: `translateY(${scrollY * -0.06}px) translateX(${scrollY * -0.02}px)` }}
        />
        <div 
          className="absolute top-1/2 right-4 w-20 h-20 rounded-full sidebar-orb-purple opacity-50 pointer-events-none"
          style={{ transform: `translateY(${scrollY * 0.1}px) scale(${1 + scrollY * 0.0005})` }}
        />
        
        {/* Glossy Top Highlight */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />
        
        {/* Side Accent with gradient */}
        <div className="absolute top-0 left-0 w-[2px] h-full bg-gradient-to-b from-violet-500/40 via-pink-500/20 to-cyan-500/40" />
        
        {/* Enhanced Compact Header with Glossy Effect */}
        <div className="relative p-3 border-b border-white/[0.08]">
          {/* Glossy panel behind header */}
          <div className="absolute inset-2 rounded-2xl bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-violet-500/[0.05] border border-white/[0.12] shadow-lg shadow-violet-500/5" />
          
          {!collapsed ? (
            <div className="flex items-center gap-3 relative z-10 px-1">
              {/* Logo with glossy ring */}
              <div className="relative group flex-shrink-0">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-violet-500/30 via-pink-500/20 to-cyan-500/30 blur-md opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-slate-800/95 to-slate-900/95 border-2 border-white/20 group-hover:border-white/40 flex items-center justify-center overflow-hidden transition-all duration-500 shadow-lg shadow-violet-500/20 sidebar-icon-glossy">
                  <img 
                    src={navjeevanLogo} 
                    alt="Navjeevan Hospital Logo" 
                    className="w-11 h-11 object-contain relative z-10"
                  />
                </div>
              </div>
              
              {/* Hospital Name with enhanced gradient */}
              <div className="min-w-0 flex-1 pl-1">
                <h2 className="text-sm font-bold tracking-wide bg-gradient-to-r from-white via-violet-200 to-cyan-200 bg-clip-text text-transparent leading-tight drop-shadow-sm">
                  NAVJEEVAN
                </h2>
                <p className="text-[10px] font-semibold tracking-wider bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                  Hospital Sirhind
                </p>
              </div>

              {/* Enhanced Notification Bell */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <NavLink to="/reports" className="relative group">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.03] hover:from-white/[0.15] hover:to-white/[0.08] border border-white/[0.12] hover:border-white/25 flex items-center justify-center transition-all duration-300 shadow-lg shadow-violet-500/10 hover:shadow-violet-500/20">
                        <Bell className="h-4 w-4 text-slate-400 group-hover:text-violet-300 transition-colors duration-300" />
                        {pendingFollowUps > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-[10px] font-bold text-white flex items-center justify-center shadow-lg shadow-rose-500/40 animate-pulse">
                            {pendingFollowUps > 9 ? '9+' : pendingFollowUps}
                          </span>
                        )}
                      </div>
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-slate-800/95 border-white/10 backdrop-blur-xl">
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
        
        {/* Navigation - Enhanced Glossy Design */}
        <SidebarGroup className="relative z-10 px-2.5 pt-4">
          <SidebarGroupLabel className="text-slate-400/80 uppercase text-[10px] tracking-[0.25em] font-semibold mb-3 px-3 flex items-center gap-2">
            <div className="w-4 h-[1px] bg-gradient-to-r from-violet-500/60 to-transparent" />
            <span className="bg-gradient-to-r from-slate-400 to-violet-300/80 bg-clip-text text-transparent">Navigate</span>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1.5">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={`group relative rounded-xl transition-all duration-300 ease-out flex items-center sidebar-nav-item ${
                        isActive(item.url) 
                          ? "bg-gradient-to-r from-white/[0.12] to-white/[0.06] border border-white/[0.15] sidebar-active-glow" 
                          : "hover:bg-gradient-to-r hover:from-white/[0.08] hover:to-transparent border border-transparent hover:border-white/[0.08]"
                      }`}
                    >
                      {/* Enhanced Active indicator with glow */}
                      {isActive(item.url) && (
                        <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/5 bg-gradient-to-b ${item.color} rounded-full shadow-lg`} style={{boxShadow: `0 0 10px hsl(var(--purple) / 0.5)`}} />
                      )}
                      
                      {/* Icon container with glossy effect */}
                      <div className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 sidebar-icon-glossy ${
                        isActive(item.url) 
                          ? `bg-gradient-to-br ${item.color} shadow-lg` 
                          : "bg-gradient-to-br from-white/[0.08] to-white/[0.02] group-hover:from-white/[0.12] group-hover:to-white/[0.05]"
                      }`}>
                        <item.icon className={`h-5 w-5 transition-all duration-300 ${
                          isActive(item.url) ? 'text-white drop-shadow-md' : 'text-slate-400 group-hover:text-slate-200'
                        }`} />
                      </div>
                      
                      {!collapsed && (
                        <>
                          <span className={`ml-3 font-medium transition-all duration-300 ${
                            isActive(item.url) ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
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

        {/* Quick Actions with Enhanced Glossy Cards */}
        <SidebarGroup className="relative z-10 mt-5 px-2.5">
          <SidebarGroupLabel className="text-slate-400/80 uppercase text-[10px] tracking-[0.25em] font-semibold mb-3 px-3 flex items-center gap-2">
            <div className="w-4 h-[1px] bg-gradient-to-r from-amber-500/70 to-transparent" />
            <span className="bg-gradient-to-r from-amber-400/90 to-orange-400/80 bg-clip-text text-transparent">Quick Add</span>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {quickActions.map((action) => (
                <SidebarMenuItem key={action.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={action.url} 
                      className="group relative rounded-xl border border-white/[0.1] bg-gradient-to-r from-white/[0.06] via-white/[0.03] to-transparent hover:from-white/[0.12] hover:via-white/[0.06] hover:to-white/[0.02] hover:border-white/25 transition-all duration-500 overflow-hidden hover:shadow-xl hover:shadow-violet-500/10"
                    >
                      {/* Multi-color shimmer effect */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700 overflow-hidden rounded-xl">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-400/15 via-50% to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                      </div>
                      
                      {/* Icon with glossy effect and rotation */}
                      <div className={`relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br ${action.color} shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:rotate-90 group-hover:shadow-xl sidebar-icon-glossy`}>
                        <Plus className="h-4 w-4 text-white relative z-10 drop-shadow-sm" />
                      </div>
                      
                      {!collapsed && (
                        <span className={`ml-3 font-semibold bg-gradient-to-r ${action.color} bg-clip-text text-transparent group-hover:opacity-100 opacity-80 transition-all duration-500 group-hover:translate-x-1`}>
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
          <SidebarGroup className="relative z-10 mt-3">
            <SidebarGroupContent>
              <div className="px-2.5">
                <SettingsDialog />
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Toggle Button with Glossy Effect */}
        <div className="mt-auto relative z-10">
          <div className={`px-3 py-4 ${collapsed ? 'flex justify-center' : ''}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className={`group relative overflow-hidden rounded-xl border border-white/[0.12] bg-gradient-to-r from-white/[0.07] via-white/[0.04] to-transparent hover:from-white/[0.14] hover:via-white/[0.08] hover:to-white/[0.02] hover:border-white/25 transition-all duration-500 backdrop-blur-md hover:shadow-xl hover:shadow-violet-500/15 ${
                collapsed ? 'w-10 h-10 p-0' : 'w-full justify-between'
              }`}
            >
              {/* Rainbow shimmer effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700 overflow-hidden rounded-xl">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-500/15 via-30% via-pink-500/10 via-60% to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
              </div>
              
              {!collapsed && (
                <span className="text-slate-400 text-xs font-medium group-hover:text-slate-200 transition-all duration-500 relative z-10">
                  Collapse
                </span>
              )}
              
              <div className={`relative flex items-center justify-center transition-all duration-500 ${
                collapsed ? '' : 'bg-gradient-to-br from-violet-500/25 via-purple-500/20 to-cyan-500/25 rounded-lg p-1.5 border border-white/15'
              }`}>
                {collapsed ? (
                  <PanelLeft className="h-5 w-5 text-slate-400 group-hover:text-cyan-400 transition-all duration-500 group-hover:scale-110" />
                ) : (
                  <PanelLeftClose className="h-4 w-4 text-slate-400 group-hover:text-violet-300 transition-all duration-500 group-hover:scale-110" />
                )}
              </div>
            </Button>
          </div>

          {/* Footer with Glossy Separator */}
          {!collapsed && (
            <div className="text-center px-4 pb-4">
              <div className="h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent mb-3" />
              <p className="text-[10px] text-slate-500/90 tracking-wider font-medium">
                Powered by <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent font-bold animate-pulse">Lovable</span>
              </p>
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
