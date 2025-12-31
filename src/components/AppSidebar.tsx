import { NavLink, useLocation } from "react-router-dom";
import { Users, Package, Receipt, LayoutDashboard, Plus, BarChart3, Activity, Calendar, FileText, ChevronRight, PanelLeftClose, PanelLeft, Menu, ChevronDown, ChevronUp } from "lucide-react";
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
import { useState, useRef } from "react";

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
  const quickAddRef = useRef<HTMLDivElement>(null);
  const navigateRef = useRef<HTMLDivElement>(null);

  const scrollToQuickAdd = () => {
    quickAddRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToNavigate = () => {
    navigateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  return (
    <Sidebar className={`${collapsed ? "w-14" : "w-64"} border-r-0`} collapsible="icon">
      <SidebarContent className="relative overflow-hidden">
        {/* Liquid Glass Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/95 via-slate-900/98 to-slate-950 backdrop-blur-xl" />
        
        {/* Frosted Glass Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/8 via-transparent to-cyan-600/8" />
        
        {/* Animated Mesh Gradient */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-violet-500/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-cyan-500/10 to-transparent" />
        </div>
        
        {/* Floating Glass Orbs with Liquid Effect */}
        <div className="absolute top-20 right-0 w-32 h-32 bg-gradient-radial from-violet-500/25 via-purple-600/15 to-transparent rounded-full blur-3xl animate-float" />
        <div className="absolute top-1/3 -left-8 w-24 h-24 bg-gradient-radial from-cyan-400/20 via-blue-500/10 to-transparent rounded-full blur-2xl animate-float" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-1/3 right-0 w-28 h-28 bg-gradient-radial from-pink-500/20 via-rose-500/10 to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute bottom-20 left-0 w-20 h-20 bg-gradient-radial from-amber-400/25 via-orange-500/15 to-transparent rounded-full blur-2xl animate-float" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/2 right-4 w-16 h-16 bg-gradient-radial from-teal-400/20 to-transparent rounded-full blur-xl animate-float" style={{ animationDelay: '2s' }} />
        
        {/* Shimmer Effect Line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        {/* Compact Header with Glass Effect */}
        <div className="relative p-2 border-b border-white/5">
          {/* Glass panel behind header */}
          <div className="absolute inset-1 rounded-xl bg-white/[0.03] backdrop-blur-sm border border-white/5" />
          
          {!collapsed ? (
            <div className="flex items-center gap-4 relative z-10 px-1">
              {/* Compact Logo - Clean transparent background */}
              <div className="relative group flex-shrink-0">
                <div className="absolute -inset-3 bg-gradient-to-r from-violet-500/40 to-cyan-500/40 rounded-full blur-xl opacity-60 group-hover:opacity-90 transition-opacity animate-[pulse_3s_ease-in-out_infinite]" />
                <img 
                  src={navjeevanLogo} 
                  alt="Navjeevan Hospital Logo" 
                  className="w-12 h-12 object-contain relative z-10 brightness-110 contrast-105 transition-transform duration-300 group-hover:scale-110"
                  style={{ filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.4))' }}
                />
              </div>
              
              {/* Compact Hospital Name - Shifted more right */}
              <div className="min-w-0 flex-1 pl-2">
                <h2 className="text-sm font-bold tracking-wide bg-gradient-to-r from-white via-violet-200 to-cyan-200 bg-clip-text text-transparent leading-tight">
                  NAVJEEVAN
                </h2>
                <p className="text-[10px] font-medium tracking-wide bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
                  Hospital Sirhind
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 relative z-10">
              <div className="relative group">
                <div className="absolute -inset-3 bg-gradient-to-r from-violet-500/40 to-cyan-500/40 rounded-full blur-xl opacity-60 group-hover:opacity-90 transition-opacity animate-[pulse_3s_ease-in-out_infinite]" />
                <img 
                  src={navjeevanLogo}
                  alt="NH Logo" 
                  className="w-10 h-10 object-contain relative z-10 brightness-110 contrast-105 transition-transform duration-200 group-hover:scale-110"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.4))' }}
                />
              </div>
              
              {/* Slide Panel Trigger when collapsed */}
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 p-0 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all"
                  >
                    <Menu className="h-4 w-4 text-slate-400 hover:text-white" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 bg-slate-900/98 backdrop-blur-xl border-white/10 p-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 via-transparent to-cyan-600/5" />
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
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
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
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all"
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
        
        {/* Navigation with Liquid Glass Items */}
        <SidebarGroup ref={navigateRef} className="relative z-10 px-2 pt-4 scroll-mt-4">
          <SidebarGroupLabel className="text-slate-500/80 uppercase text-[10px] tracking-[0.25em] font-semibold mb-3 px-3 flex items-center gap-2">
            <div className="w-8 h-[1px] bg-gradient-to-r from-violet-500/50 to-transparent" />
            <span>Navigate</span>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            {!collapsed && (
              <button
                onClick={scrollToQuickAdd}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/30 transition-all group"
                title="Jump to Quick Add"
              >
                <span className="text-[9px] text-amber-400 font-medium">Quick Add</span>
                <ChevronDown className="h-3 w-3 text-amber-400 group-hover:translate-y-0.5 transition-transform" />
              </button>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1.5">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={`relative overflow-hidden rounded-xl transition-all duration-300 group flex items-center ${
                        isActive(item.url) 
                          ? "bg-white/[0.08] backdrop-blur-md shadow-lg shadow-black/20 border border-white/10" 
                          : `hover:bg-white/[0.04] hover:backdrop-blur-sm ${item.glow} hover:shadow-lg`
                      }`}
                    >
                      {/* Liquid shine effect on hover */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden rounded-xl">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      </div>
                      
                      {/* Active indicator - liquid gradient bar */}
                      {isActive(item.url) && (
                        <div className={`absolute left-0 top-1 bottom-1 w-1 bg-gradient-to-b ${item.color} rounded-full shadow-lg shadow-current/50`} />
                      )}
                      
                      {/* Icon container with glass effect */}
                      <div className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 ${
                        isActive(item.url) 
                          ? `bg-gradient-to-br ${item.color} shadow-lg shadow-current/30` 
                          : "bg-white/[0.05] group-hover:bg-white/10 border border-transparent group-hover:border-white/10"
                      }`}>
                        {/* Icon glow */}
                        {isActive(item.url) && (
                          <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${item.color} blur-md opacity-50`} />
                        )}
                        <item.icon className={`h-5 w-5 transition-all duration-300 relative z-10 ${
                          isActive(item.url) 
                            ? 'text-white drop-shadow-md' 
                            : 'text-slate-400 group-hover:text-white'
                        }`} />
                      </div>
                      
                      {!collapsed && (
                        <>
                          <span className={`ml-3 font-medium transition-all duration-300 ${
                            isActive(item.url) 
                              ? 'text-white' 
                              : 'text-slate-400 group-hover:text-white'
                          }`}>
                            {item.title}
                          </span>
                          
                          {isActive(item.url) && (
                            <div className="ml-auto flex items-center">
                              <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${item.color} mr-2 animate-pulse`} />
                              <ChevronRight className="h-4 w-4 text-white/50" />
                            </div>
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

        {/* Quick Actions with Glass Cards */}
        <SidebarGroup ref={quickAddRef} className="relative z-10 mt-4 px-2 scroll-mt-4">
          <SidebarGroupLabel className="text-slate-500/80 uppercase text-[10px] tracking-[0.25em] font-semibold mb-3 px-3 flex items-center gap-2">
            <div className="w-6 h-[1px] bg-gradient-to-r from-amber-500/50 to-transparent" />
            <span>Quick Add</span>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            {!collapsed && (
              <button
                onClick={scrollToNavigate}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 hover:border-violet-500/30 transition-all group"
                title="Back to Navigate"
              >
                <span className="text-[9px] text-violet-400 font-medium">Navigate</span>
                <ChevronUp className="h-3 w-3 text-violet-400 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1.5">
              {quickActions.map((action) => (
                <SidebarMenuItem key={action.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={action.url} 
                      className="relative rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.06] hover:border-white/15 transition-all duration-300 group overflow-hidden"
                    >
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 overflow-hidden rounded-xl">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      </div>
                      
                      {/* Icon with glass container */}
                      <div className={`relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br ${action.color} shadow-md transition-all duration-300 group-hover:scale-110 group-hover:rotate-90 group-hover:shadow-lg`}>
                        <Plus className="h-4 w-4 text-white relative z-10" />
                      </div>
                      
                      {!collapsed && (
                        <span className={`ml-3 font-medium bg-gradient-to-r ${action.color} bg-clip-text text-transparent group-hover:opacity-100 opacity-80 transition-opacity`}>
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

        {/* Toggle Button with Enhanced Glass Effect */}
        <div className="mt-auto relative z-10">
          <div className={`px-3 py-3 ${collapsed ? 'flex justify-center' : ''}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className={`group relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/15 transition-all duration-300 backdrop-blur-sm ${
                collapsed ? 'w-10 h-10 p-0' : 'w-full justify-between'
              }`}
            >
              {/* Glass shimmer effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden rounded-xl">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-cyan-500/10 to-violet-500/10 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </div>
              
              {!collapsed && (
                <span className="text-slate-500 text-xs font-medium group-hover:text-slate-300 transition-colors duration-300 relative z-10">
                  Collapse
                </span>
              )}
              
              <div className={`relative flex items-center justify-center transition-all duration-500 ${
                collapsed ? '' : 'bg-gradient-to-br from-violet-500/15 to-cyan-500/15 rounded-lg p-1.5 border border-white/5'
              }`}>
                {collapsed ? (
                  <PanelLeft className="h-5 w-5 text-slate-400 group-hover:text-cyan-400 transition-all duration-300 group-hover:scale-110" />
                ) : (
                  <PanelLeftClose className="h-4 w-4 text-slate-400 group-hover:text-violet-400 transition-all duration-300 group-hover:scale-110" />
                )}
              </div>
            </Button>
          </div>

          {/* Footer with Glass Separator */}
          {!collapsed && (
            <div className="text-center px-4 pb-4">
              <div className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent mb-3" />
              <p className="text-[10px] text-slate-600/80 tracking-wider font-medium">
                Powered by <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Lovable</span>
              </p>
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
