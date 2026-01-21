import { useState } from "react";
import { useSalaryAccess } from "@/hooks/useSalaryAccess";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface SalaryPasswordGateProps {
  children: React.ReactNode;
}

export function SalaryPasswordGate({ children }: SalaryPasswordGateProps) {
  const { isAuthenticated, verifyPassword } = useSalaryAccess();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  if (isAuthenticated) {
    return <>{children}</>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Small delay for UX
    setTimeout(() => {
      if (verifyPassword(password)) {
        toast.success("Access granted");
      } else {
        setAttempts((prev) => prev + 1);
        toast.error("Incorrect password");
        setPassword("");
      }
      setIsLoading(false);
    }, 300);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <Card className="w-full max-w-md border-border/50 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">Salary Management</CardTitle>
            <CardDescription className="mt-2">
              This section is password protected. Please enter the password to continue.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {attempts >= 3 && (
              <div className="flex items-center gap-2 text-sm text-amber-500 bg-amber-500/10 p-3 rounded-lg">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>Multiple failed attempts detected</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={!password || isLoading}
            >
              {isLoading ? "Verifying..." : "Unlock"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
