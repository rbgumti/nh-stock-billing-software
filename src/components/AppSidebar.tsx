import { NavLink, useLocation } from "react-router-dom";
import { Users, Package, Receipt, LayoutDashboard, Plus, BarChart3, Activity, Calendar, FileText, ChevronRight, PanelLeftClose, PanelLeft, Menu, Sun, Moon, Sparkles } from "lucide-react";
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
import { useState } from "react";
import { useTheme } from "next-themes";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, color: "from-teal to-cyan", glow: "teal" },
  { title: "Patients", url: "/patients", icon: Users, color: "from-cyan to-teal", glow: "cyan" },
  { title: "Appointments", url: "/appointments", icon: Calendar, color: "from-emerald to-teal", glow: "emerald" },
  { title: "Prescriptions", url: "/prescriptions", icon: FileText, color: "from-lime to-emerald", glow: "lime" },
  { title: "Patient Analytics", url: "/analytics/patients", icon: Activity, color: "from-teal to-cyan", glow: "teal" },
  { title: "Stock", url: "/stock", icon: Package, color: "from-cyan to-teal", glow: "cyan" },
  { title: "Invoices", url: "/invoices", icon: Receipt, color: "from-emerald to-teal", glow: "emerald" },
  { title: "Reports", url: "/reports", icon: BarChart3, color: "from-teal to-emerald", glow: "teal" },
];

const quickActions = [
  { title: "Add Patient", url: "/patients/new", color: "from-cyan to-teal", iconColor: "text-cyan" },
  { title: "New Prescription", url: "/prescriptions/new", color: "from-lime to-emerald", iconColor: "text-lime" },
  { title: "New Invoice", url: "/invoices/new", color: "from-emerald to-teal", iconColor: "text-emerald" },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";
  const [sheetOpen, setSheetOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  return (
    <Sidebar className={`${collapsed ? "w-14" : "w-64"} border-r-0`} collapsible="icon">
      <SidebarContent className="relative overflow-hidden">
        {/* Liquid Glass Base Layer */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/98 via-slate-950 to-slate-950" />
        
        {/* Glass Refraction Layer */}
        <div className="absolute inset-0 backdrop-blur-3xl backdrop-saturate-200" />
        
        {/* Liquid Glass Morphing Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--teal)/0.15),transparent_50%),radial-gradient(ellipse_at_bottom,hsl(var(--cyan)/0.1),transparent_50%)]" />
        
        {/* Animated Liquid Blobs */}
        <div className="absolute top-10 -right-10 w-40 h-40 bg-gradient-to-br from-teal/30 via-cyan/20 to-transparent rounded-full blur-3xl animate-liquid-float opacity-60" />
        <div className="absolute top-1/3 -left-16 w-32 h-32 bg-gradient-to-br from-cyan/25 via-teal/15 to-transparent rounded-full blur-3xl animate-liquid-float opacity-50" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/4 -right-8 w-36 h-36 bg-gradient-to-br from-lime/20 via-emerald/15 to-transparent rounded-full blur-3xl animate-liquid-float opacity-40" style={{ animationDelay: '4s' }} />
        <div className="absolute bottom-10 -left-10 w-28 h-28 bg-gradient-to-br from-emerald/25 via-teal/15 to-transparent rounded-full blur-3xl animate-liquid-float opacity-50" style={{ animationDelay: '1s' }} />
        
        {/* Liquid Glass Highlight Line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
        
        {/* Glass Shimmer Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full animate-shimmer" />
        </div>
        
        {/* Compact Header with Enhanced Glass Effect */}
        <div className="relative p-2 border-b border-white/5">
          {/* Glass panel behind header */}
          <div className="absolute inset-1 rounded-2xl glass-strong" />
          
          {!collapsed ? (
            <div className="flex items-center gap-2.5 relative z-10 px-1">
              {/* Compact Logo with Liquid Glow */}
              <div className="relative group flex-shrink-0">
                <div className="absolute -inset-2 bg-gradient-to-r from-teal/40 via-cyan/30 to-lime/40 rounded-full blur-xl opacity-50 group-hover:opacity-80 transition-opacity duration-500 animate-pulse-teal" />
                <div className="absolute -inset-1 bg-gradient-to-r from-teal/30 to-lime/30 rounded-full blur-md opacity-60 group-hover:opacity-100 transition-opacity" />
                <div className="relative p-0.5 rounded-full bg-gradient-to-br from-white/15 to-white/5 border border-white/20 shadow-glass">
                  <img 
                    src={navjeevanLogo} 
                    alt="Navjeevan Hospital Logo" 
                    className="w-10 h-10 object-contain relative z-10 drop-shadow-lg transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              </div>
              
              {/* Compact Hospital Name with Liquid Text */}
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold tracking-wide bg-gradient-to-r from-white via-teal-200 to-cyan-200 bg-clip-text text-transparent leading-tight drop-shadow-sm">
                  NAVJEEVAN
                </h2>
                <div className="flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-lime/60" />
                  <p className="text-[10px] font-medium tracking-wide bg-gradient-to-r from-lime to-emerald bg-clip-text text-transparent">
                    Hospital Sirhind
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 relative z-10">
              <div className="relative group">
                <div className="absolute -inset-2 bg-gradient-to-r from-teal/50 to-lime/50 rounded-full blur-xl opacity-60 group-hover:opacity-100 transition-opacity animate-pulse-teal" />
                <div className="relative p-0.5 rounded-full bg-gradient-to-br from-white/15 to-white/5 border border-white/20 shadow-glass">
                  <img 
                    src={navjeevanLogo} 
                    alt="NH Logo" 
                    className="w-8 h-8 object-contain relative z-10 transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
              </div>
              
              {/* Slide Panel Trigger when collapsed */}
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 p-0 rounded-xl glass hover:glass-strong transition-all duration-300"
                  >
                    <Menu className="h-4 w-4 text-slate-400 hover:text-white transition-colors" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 bg-slate-950/95 backdrop-blur-2xl backdrop-saturate-200 border-white/10 p-0">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--teal)/0.1),transparent_60%)]" />
                  <SheetHeader className="relative p-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-teal/40 to-lime/40 rounded-full blur-md opacity-60" />
                        <img src={navjeevanLogo} alt="Logo" className="w-10 h-10 object-contain relative" />
                      </div>
                      <div>
                        <SheetTitle className="text-white text-base bg-gradient-to-r from-white to-teal-200 bg-clip-text text-transparent">NAVJEEVAN</SheetTitle>
                        <p className="text-xs bg-gradient-to-r from-lime to-emerald bg-clip-text text-transparent">Hospital Sirhind</p>
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
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${
                              isActive(item.url)
                                ? "glass-strong border border-white/15"
                                : "hover:glass"
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                              isActive(item.url) ? `bg-gradient-to-br ${item.color} shadow-liquid` : "glass"
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
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:glass transition-all duration-300 group"
                          >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br ${action.color} shadow-liquid group-hover:scale-110 transition-transform duration-300`}>
                              <Plus className="h-4 w-4 text-white" />
                            </div>
                            <span className={`text-slate-300 bg-gradient-to-r ${action.color} bg-clip-text group-hover:text-transparent transition-all`}>{action.title}</span>
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
        <SidebarGroup className="relative z-10 px-2 pt-4">
          <SidebarGroupLabel className="text-slate-500/80 uppercase text-[10px] tracking-[0.25em] font-semibold mb-3 px-3 flex items-center gap-2">
            <div className="w-8 h-[1px] bg-gradient-to-r from-teal/50 to-transparent" />
            <span>Navigate</span>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1.5">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={`relative overflow-hidden rounded-xl transition-all duration-500 group flex items-center ${
                        isActive(item.url) 
                          ? "glass-strong shadow-liquid border border-white/15" 
                          : "hover:glass hover:shadow-glass"
                      }`}
                    >
                      {/* Liquid shine effect on hover */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 overflow-hidden rounded-xl pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                      </div>
                      
                      {/* Active indicator - liquid gradient bar */}
                      {isActive(item.url) && (
                        <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b ${item.color} rounded-full shadow-glow`} />
                      )}
                      
                      {/* Icon container with liquid glass effect */}
                      <div className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-500 ${
                        isActive(item.url) 
                          ? `bg-gradient-to-br ${item.color} shadow-liquid` 
                          : "glass group-hover:glass-strong"
                      }`}>
                        {/* Icon glow effect */}
                        {isActive(item.url) && (
                          <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${item.color} blur-lg opacity-50 animate-pulse-teal`} />
                        )}
                        <item.icon className={`h-5 w-5 transition-all duration-500 relative z-10 ${
                          isActive(item.url) 
                            ? 'text-white drop-shadow-lg' 
                            : 'text-slate-400 group-hover:text-white'
                        }`} />
                      </div>
                      
                      {!collapsed && (
                        <>
                          <span className={`ml-3 font-medium transition-all duration-500 ${
                            isActive(item.url) 
                              ? 'text-white' 
                              : 'text-slate-400 group-hover:text-white'
                          }`}>
                            {item.title}
                          </span>
                          
                          {isActive(item.url) && (
                            <div className="ml-auto flex items-center gap-1">
                              <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${item.color} animate-pulse`} />
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

        {/* Quick Actions with Liquid Glass Cards */}
        <SidebarGroup className="relative z-10 mt-4 px-2">
          <SidebarGroupLabel className="text-slate-500/80 uppercase text-[10px] tracking-[0.25em] font-semibold mb-3 px-3 flex items-center gap-2">
            <div className="w-6 h-[1px] bg-gradient-to-r from-lime/50 to-transparent" />
            <span>Quick Add</span>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1.5">
              {quickActions.map((action) => (
                <SidebarMenuItem key={action.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={action.url} 
                      className="relative rounded-xl glass hover:glass-strong transition-all duration-500 group overflow-hidden"
                    >
                      {/* Liquid shimmer effect */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 overflow-hidden rounded-xl pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                      </div>
                      
                      {/* Icon with liquid container */}
                      <div className={`relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br ${action.color} shadow-liquid transition-all duration-500 group-hover:scale-110 group-hover:rotate-90`}>
                        <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${action.color} blur-md opacity-0 group-hover:opacity-60 transition-opacity duration-500`} />
                        <Plus className="h-4 w-4 text-white relative z-10" />
                      </div>
                      
                      {!collapsed && (
                        <span className={`ml-3 font-medium bg-gradient-to-r ${action.color} bg-clip-text text-transparent group-hover:opacity-100 opacity-70 transition-all duration-500`}>
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

        {/* Theme Toggle & Collapse Button */}
        <div className="mt-auto relative z-10 space-y-2">
          {/* Theme Toggle */}
          <div className={`px-3 ${collapsed ? 'flex justify-center' : ''}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className={`group relative overflow-hidden rounded-xl glass hover:glass-strong transition-all duration-500 ${
                collapsed ? 'w-10 h-10 p-0' : 'w-full justify-between'
              }`}
            >
              {/* Liquid shimmer */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 overflow-hidden rounded-xl pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-orange/10 via-amber/10 to-orange/10 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
              </div>
              
              {!collapsed && (
                <span className="text-slate-500 text-xs font-medium group-hover:text-slate-300 transition-colors duration-500 relative z-10">
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </span>
              )}
              
              <div className={`relative flex items-center justify-center transition-all duration-500 ${
                collapsed ? '' : 'glass rounded-lg p-1.5'
              }`}>
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 text-orange group-hover:text-amber-300 transition-all duration-500 group-hover:scale-110 group-hover:rotate-180" />
                ) : (
                  <Moon className="h-4 w-4 text-slate-400 group-hover:text-purple transition-all duration-500 group-hover:scale-110" />
                )}
              </div>
            </Button>
          </div>

          {/* Collapse Button */}
          <div className={`px-3 pb-2 ${collapsed ? 'flex justify-center' : ''}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className={`group relative overflow-hidden rounded-xl glass hover:glass-strong transition-all duration-500 ${
                collapsed ? 'w-10 h-10 p-0' : 'w-full justify-between'
              }`}
            >
              {/* Liquid shimmer effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 overflow-hidden rounded-xl pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-teal/10 via-lime/10 to-teal/10 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
              </div>
              
              {!collapsed && (
                <span className="text-slate-500 text-xs font-medium group-hover:text-slate-300 transition-colors duration-500 relative z-10">
                  Collapse
                </span>
              )}
              
              <div className={`relative flex items-center justify-center transition-all duration-500 ${
                collapsed ? '' : 'glass rounded-lg p-1.5'
              }`}>
                {collapsed ? (
                  <PanelLeft className="h-5 w-5 text-slate-400 group-hover:text-lime transition-all duration-500 group-hover:scale-110" />
                ) : (
                  <PanelLeftClose className="h-4 w-4 text-slate-400 group-hover:text-teal transition-all duration-500 group-hover:scale-110" />
                )}
              </div>
            </Button>
          </div>

          {/* Footer with Liquid Glass Separator */}
          {!collapsed && (
            <div className="text-center px-4 pb-4">
              <div className="h-px bg-gradient-to-r from-transparent via-teal/30 to-transparent mb-3" />
              <p className="text-[10px] text-slate-600/80 tracking-wider font-medium flex items-center justify-center gap-1">
                <span>Powered by</span>
                <span className="bg-gradient-to-r from-teal to-lime bg-clip-text text-transparent font-semibold">Lovable</span>
                <Sparkles className="w-2.5 h-2.5 text-lime/50" />
              </p>
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
