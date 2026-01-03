import { Settings, Zap } from "lucide-react";
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
import { usePerformanceMode } from "@/hooks/usePerformanceMode";

export function SettingsDialog() {
  const { performanceMode, setPerformanceMode } = usePerformanceMode();

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
        <div className="space-y-6 py-4">
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
                  Disable animations and effects for better performance on low-end devices
                </p>
              </div>
            </div>
            <Switch
              id="performance-mode"
              checked={performanceMode}
              onCheckedChange={setPerformanceMode}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
