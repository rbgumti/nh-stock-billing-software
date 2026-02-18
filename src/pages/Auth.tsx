import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuthContext";

const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

export default function Auth() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // Redirect if already logged in - uses shared context (no duplicate getSession)
  useEffect(() => {
    if (!authLoading && user) {
      // Ensure profile in background (non-blocking)
      supabase
        .from('profiles')
        .upsert(
          { user_id: user.id, email: user.email ?? null },
          { onConflict: 'user_id' }
        )
        .then(() => {});
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate inputs
      const validationResult = loginSchema.safeParse({ identifier, password });
      if (!validationResult.success) {
        toast({
          title: "Validation Error",
          description: validationResult.error.errors[0].message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      let email = validationResult.data.identifier;
      
      // Check if identifier is not an email (doesn't contain @)
      if (!email.includes('@')) {
        // Look up email by username using the database function
        const { data: foundEmail, error: lookupError } = await supabase
          .rpc('get_email_by_username', { p_username: email });
        
        if (lookupError || !foundEmail) {
          toast({
            title: "Error",
            description: "Invalid username or password",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        email = foundEmail;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: validationResult.data.password,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Logged in successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-background dark:to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to NAVJEEVAN HIMS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Username or Email</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="Enter username or email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={loading}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Contact admin if you need an account
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
