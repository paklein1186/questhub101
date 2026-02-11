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
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const refCode = searchParams.get("ref") || "";
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

        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-8 space-y-5">
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

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">Log in</Link>
        </p>
      </motion.div>
    </div>
  );
}
