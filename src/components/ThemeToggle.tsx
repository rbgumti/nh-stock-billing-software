import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 rounded-xl glass-card hover:bg-pink/10 border border-pink/20 hover:border-cyan/40 transition-all duration-300 hover:shadow-lg hover:shadow-pink/20"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-pink" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-cyan" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="glass-strong border-pink/20 z-50"
      >
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className={`cursor-pointer transition-all ${theme === 'light' ? 'bg-pink/20 text-pink' : 'hover:bg-pink/10'}`}
        >
          <Sun className="mr-2 h-4 w-4 text-pink" />
          <span className="bg-gradient-to-r from-pink to-orange bg-clip-text text-transparent font-medium">Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className={`cursor-pointer transition-all ${theme === 'dark' ? 'bg-cyan/20 text-cyan' : 'hover:bg-cyan/10'}`}
        >
          <Moon className="mr-2 h-4 w-4 text-cyan" />
          <span className="bg-gradient-to-r from-cyan to-purple bg-clip-text text-transparent font-medium">Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")}
          className={`cursor-pointer transition-all ${theme === 'system' ? 'bg-purple/20 text-purple' : 'hover:bg-purple/10'}`}
        >
          <Monitor className="mr-2 h-4 w-4 text-purple" />
          <span className="bg-gradient-to-r from-purple to-pink bg-clip-text text-transparent font-medium">System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}