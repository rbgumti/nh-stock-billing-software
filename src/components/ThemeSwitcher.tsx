import { Palette, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";

const colorThemes = [
  { id: "purple", name: "Purple (Default)", color: "hsl(262 83% 58%)" },
  { id: "blue", name: "Ocean Blue", color: "hsl(217 91% 60%)" },
  { id: "green", name: "Emerald", color: "hsl(160 84% 39%)" },
  { id: "orange", name: "Sunset Orange", color: "hsl(24 95% 53%)" },
  { id: "pink", name: "Rose Pink", color: "hsl(340 82% 52%)" },
  { id: "teal", name: "Teal", color: "hsl(172 66% 50%)" },
  { id: "indigo", name: "Indigo", color: "hsl(239 84% 67%)" },
  { id: "amber", name: "Amber Gold", color: "hsl(45 93% 47%)" },
];

export function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState("purple");

  useEffect(() => {
    const savedTheme = localStorage.getItem("color-theme") || "purple";
    setCurrentTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (themeId: string) => {
    const root = document.documentElement;
    
    // Remove all theme classes
    colorThemes.forEach((theme) => {
      root.classList.remove(`theme-${theme.id}`);
    });
    
    // Add selected theme class
    if (themeId !== "purple") {
      root.classList.add(`theme-${themeId}`);
    }
  };

  const handleThemeChange = (themeId: string) => {
    setCurrentTheme(themeId);
    localStorage.setItem("color-theme", themeId);
    applyTheme(themeId);
  };

  const currentThemeData = colorThemes.find((t) => t.id === currentTheme);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl bg-white/50 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/20 border border-border/50 transition-all duration-200"
        >
          <Palette className="h-4 w-4" style={{ color: currentThemeData?.color }} />
          <span className="sr-only">Change color theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-strong border-border/50 z-50 w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Color Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {colorThemes.map((theme) => (
          <DropdownMenuItem
            key={theme.id}
            onClick={() => handleThemeChange(theme.id)}
            className={`cursor-pointer flex items-center gap-2 ${
              currentTheme === theme.id ? "bg-primary/10" : ""
            }`}
          >
            <div
              className="w-4 h-4 rounded-full border border-border/50"
              style={{ backgroundColor: theme.color }}
            />
            <span className="flex-1">{theme.name}</span>
            {currentTheme === theme.id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
