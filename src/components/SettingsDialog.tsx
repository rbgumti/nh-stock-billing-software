import { Settings, Zap, Minimize2, User } from "lucide-react";
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

export function SettingsDialog() {
  const { performanceMode, setPerformanceMode, compactMode, setCompactMode, doctorName, setDoctorName } = useAppSettings();

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
