import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole, ROLE_LABELS, AppRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { LogOut, User, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserProfileSectionProps {
  collapsed?: boolean;
}

export function UserProfileSection({ collapsed = false }: UserProfileSectionProps) {
  const { user, role, loading } = useUserRole();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Logged out successfully");
      navigate("/auth");
    } catch (error: any) {
      toast.error(error.message || "Failed to log out");
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="px-3 py-2">
        <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!user) return null;

  const displayEmail = user.email || "User";
  const displayRole = role ? ROLE_LABELS[role as AppRole] : "No Role";
  const initials = displayEmail.charAt(0).toUpperCase();

  // Role color mapping
  const roleColors: Record<AppRole, string> = {
    admin: "from-red-500 to-rose-600",
    manager: "from-violet-500 to-purple-600",
    billing: "from-green-500 to-emerald-500",
    reception: "from-blue-500 to-cyan-500",
  };

  const roleColor = role ? roleColors[role as AppRole] : "from-slate-500 to-slate-600";

  if (collapsed) {
    return (
      <div className="px-2 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-10 h-10 p-0 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
            >
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${roleColor} flex items-center justify-center`}>
                <span className="text-white text-sm font-bold">{initials}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-slate-900/95 border-white/10">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium text-white truncate">{displayEmail}</p>
                <p className={`text-xs font-medium bg-gradient-to-r ${roleColor} bg-clip-text text-transparent`}>
                  {displayRole}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-rose-400 focus:text-rose-300 focus:bg-rose-500/10 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="px-3 py-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full h-auto p-3 rounded-xl bg-gradient-to-r from-white/[0.04] to-transparent border border-white/[0.1] hover:from-white/[0.08] hover:to-white/[0.02] hover:border-white/20 transition-all duration-300 justify-between"
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Avatar */}
              <div className={`flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br ${roleColor} flex items-center justify-center shadow-lg`}>
                <span className="text-white text-sm font-bold">{initials}</span>
              </div>
              
              {/* User info */}
              <div className="flex flex-col items-start min-w-0">
                <span className="text-sm font-medium text-white/90 truncate max-w-[120px]">
                  {displayEmail.split('@')[0]}
                </span>
                <span className={`text-xs font-medium bg-gradient-to-r ${roleColor} bg-clip-text text-transparent`}>
                  {displayRole}
                </span>
              </div>
            </div>
            
            <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-slate-900/95 border-white/10 backdrop-blur-xl">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium text-white">{displayEmail}</p>
              <p className={`text-xs font-medium bg-gradient-to-r ${roleColor} bg-clip-text text-transparent`}>
                Role: {displayRole}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-rose-400 focus:text-rose-300 focus:bg-rose-500/10 cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
