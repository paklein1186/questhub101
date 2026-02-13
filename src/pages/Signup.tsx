import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { UserPlus, Loader2, Gift } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { lovable } from "@/integrations/lovable/index";

export default function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const refCode = searchParams.get("ref") || "";
  const redirectTo = searchParams.get("redirect") || "";

  // Store redirect destination so RedirectIfAuthed picks it up after auth
  if (redirectTo) {
    sessionStorage.setItem("postAuthRedirect", redirectTo);
  }
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isEcosystemBuilder, setIsEcosystemBuilder] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return;
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    const role = isEcosystemBuilder ? "ECOSYSTEM_BUILDER" : "GAMECHANGER";
    const { error } = await signUp(email.trim(), password, name.trim(), role);
    setLoading(false);
    if (error) {
      toast({ title: "Signup failed", description: error, variant: "destructive" });
    } else {
      if (refCode) {
        sessionStorage.setItem("referralCode", refCode);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-display text-2xl font-bold">
            <img src={logoImg} alt="changethegame" className="h-7 w-7" /> changethegame
          </Link>
          <p className="text-muted-foreground mt-2">Create your account and start your journey.</p>
          {refCode && (
            <Badge variant="secondary" className="mt-2 gap-1"><Gift className="h-3 w-3" /> You were referred! Complete onboarding to earn bonus XP.</Badge>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 space-y-5">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={async () => {
              const { error } = await lovable.auth.signInWithOAuth("google", {
                redirect_uri: window.location.origin,
              });
              if (error) {
                toast({ title: "Google sign-up failed", description: String(error), variant: "destructive" });
              }
            }}
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </Button>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" required maxLength={80} autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" required minLength={6} autoComplete="new-password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input id="confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" required autoComplete="new-password" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={isEcosystemBuilder} onCheckedChange={(v) => setIsEcosystemBuilder(!!v)} />
              <span className="text-sm">I'm an ecosystem builder</span>
            </label>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Create account
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link to={`/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`} className="text-primary font-medium hover:underline">Log in</Link>
        </p>
      </motion.div>
    </div>
  );
}
