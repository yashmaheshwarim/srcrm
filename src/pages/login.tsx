import { useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Landmark, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password");
      return;
    }

    setLoading(true);

    const result = await login(username.trim(), password.trim());
    if (result.success) {
      router.push("/dashboard");
    } else {
      setError(result.error || "Invalid username or password");
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(35 12% 94%), hsl(35 20% 97%))" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-foreground/[0.03] mb-4">
            <Landmark className="h-6 w-6 text-foreground/60" />
          </div>
          <h1 className="font-heading text-3xl italic text-foreground tracking-tight">Loan DSA CRM</h1>
          <p className="text-sm text-muted-foreground/60 mt-1">Loan DSA Management</p>
        </div>

        <div className="glass-panel p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs font-medium text-muted-foreground/80 uppercase tracking-widest">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                className="bg-background/50 border-border/50 focus:bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground/80 uppercase tracking-widest">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="bg-background/50 border-border/50 focus:bg-background pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive/80 bg-destructive/5 p-2.5 rounded-md border border-destructive/10">{error}</p>
            )}

            <Button type="submit" className="w-full h-10 rounded-lg" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="text-center">
              <p className="text-xs text-muted-foreground/40">admin / admin123 &middot; jobber / jobber123</p>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground/30 mt-8">
          &copy; 2026 SR Finance
        </p>
      </div>
    </main>
  );
}