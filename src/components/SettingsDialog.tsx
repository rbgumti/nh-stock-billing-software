import { Settings, Zap, Minimize2, User, Sun, Moon, Monitor, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useAppSettings } from "@/hooks/usePerformanceMode";
import { useTheme } from "next-themes";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function SettingsDialog() {
  const { performanceMode, setPerformanceMode, ultraLowEndMode, setUltraLowEndMode, compactMode, setCompactMode, doctorName, setDoctorName } = useAppSettings();
  const { theme, setTheme } = useTheme();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your app experience
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Doctor Name */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <User className="w-5 h-5 text-green-500" />
            </div>
            <div className="space-y-2 flex-1">
              <Label htmlFor="doctor-name" className="text-sm font-medium">
                Doctor Name
              </Label>
              <p className="text-xs text-muted-foreground">
                Used in purchase orders and other documents
              </p>
              <Input
                id="doctor-name"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="Enter doctor name"
                className="mt-1"
              />
            </div>
          </div>

          <Separator />

          {/* Theme Selection */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10">
              <Sun className="w-5 h-5 text-violet-500" />
            </div>
            <div className="space-y-2 flex-1">
              <Label className="text-sm font-medium">
                Theme
              </Label>
              <p className="text-xs text-muted-foreground">
                Choose your preferred color scheme
              </p>
              <ToggleGroup
                type="single"
                value={theme}
                onValueChange={(value) => value && setTheme(value)}
                className="justify-start mt-2"
              >
                <ToggleGroupItem
                  value="light"
                  aria-label="Light theme"
                  className="flex items-center gap-2 data-[state=on]:bg-amber-500/20 data-[state=on]:text-amber-600 dark:data-[state=on]:text-amber-400"
                >
                  <Sun className="h-4 w-4" />
                  Light
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="dark"
                  aria-label="Dark theme"
                  className="flex items-center gap-2 data-[state=on]:bg-violet-500/20 data-[state=on]:text-violet-600 dark:data-[state=on]:text-violet-400"
                >
                  <Moon className="h-4 w-4" />
                  Dark
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="system"
                  aria-label="System theme"
                  className="flex items-center gap-2 data-[state=on]:bg-cyan-500/20 data-[state=on]:text-cyan-600 dark:data-[state=on]:text-cyan-400"
                >
                  <Monitor className="h-4 w-4" />
                  System
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          <Separator />

          {/* Performance Mode */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Zap className="w-5 h-5 text-amber-500" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="performance-mode" className="text-sm font-medium">
                  Performance Mode
                </Label>
                <p className="text-xs text-muted-foreground">
                  Disable animations and effects for better performance
                </p>
              </div>
            </div>
            <Switch
              id="performance-mode"
              checked={performanceMode}
              onCheckedChange={setPerformanceMode}
          />
          </div>

          <Separator />

          {/* Ultra Low-End Mode */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Smartphone className="w-5 h-5 text-red-500" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ultra-low-end-mode" className="text-sm font-medium">
                  Ultra Low-End Mode
                </Label>
                <p className="text-xs text-muted-foreground">
                  Maximum optimization for old/slow devices. Disables all effects.
                </p>
              </div>
            </div>
            <Switch
              id="ultra-low-end-mode"
              checked={ultraLowEndMode}
              onCheckedChange={setUltraLowEndMode}
            />
          </div>

          <Separator />

          {/* Compact Mode */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Minimize2 className="w-5 h-5 text-blue-500" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="compact-mode" className="text-sm font-medium">
                  Compact Mode
                </Label>
                <p className="text-xs text-muted-foreground">
                  Reduce spacing and padding for more content density
                </p>
              </div>
            </div>
            <Switch
              id="compact-mode"
              checked={compactMode}
              onCheckedChange={setCompactMode}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}