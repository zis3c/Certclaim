import BrandLogo from "@/components/BrandLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      {/* Subtle background decorative elements */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px] animate-pulse-glow" />
      </div>

      <div className="relative z-10 w-full max-w-[380px] space-y-8 animate-fade-in">
        {/* Minimal Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
            <BrandLogo className="h-6 w-6 text-primary-foreground" />
          </div>
          
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-3 w-3 text-primary/40" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/80">
                Admin Portal
              </span>
              <Sparkles className="h-3 w-3 text-primary/40" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome <span className="text-gradient">Back</span>
            </h1>
          </div>
        </div>

        {/* Focused Login Form */}
        <Card className="border-border/40 bg-card/40 shadow-2xl backdrop-blur-md">
          <CardContent className="p-6">
            <form action="/api/admin/login" method="post" className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" title="password" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Access Key
                  </Label>
                  <ShieldCheck className="h-3.5 w-3.5 text-primary/60" />
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  className="h-11 border-border/40 bg-background/50 focus:ring-primary/20"
                  placeholder="••••••••"
                  required
                  autoFocus
                />
              </div>

              {params.error ? (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs font-medium text-destructive animate-shake">
                  <LockKeyhole className="h-3.5 w-3.5" />
                  Authentication failed. Please try again.
                </div>
              ) : null}

              <Button
                type="submit"
                className="h-11 w-full"
                variant="default"
              >
                <LockKeyhole className="h-4 w-4" />
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Minimal Footer */}
        <div className="flex items-center justify-center gap-4 text-[10px] font-medium text-muted-foreground/40">
          <span>&copy; 2026 CertClaim</span>
          <div className="h-1 w-1 rounded-full bg-border/40" />
          <span>Secure Authentication</span>
        </div>
      </div>
    </main>
  );
}
