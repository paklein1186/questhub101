import { Link, useLocation } from "react-router-dom";
import { LogIn, UserPlus, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  /** Main message shown above the buttons */
  message?: string;
  /** Compact mode: inline, less padding */
  compact?: boolean;
  className?: string;
  /** Optional callback to open guest onboarding */
  onSignupClick?: () => void;
}

/**
 * Reusable CTA block shown in Public Explore Mode to prompt
 * non-logged users to sign up or log in.
 */
export function PublicExploreCTA({
  message = "To see live content and participate, please log in or create an account.",
  compact = false,
  className = "",
  onSignupClick,
}: Props) {
  const location = useLocation();
  const redirectParam = `?redirect=${encodeURIComponent(location.pathname + location.search)}`;

  if (compact) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{message}</span>
        <Button size="sm" variant="outline" asChild>
          <Link to={`/login${redirectParam}`}><LogIn className="h-3.5 w-3.5 mr-1" /> Log in</Link>
        </Button>
        <Button size="sm" onClick={onSignupClick}>
          <UserPlus className="h-3.5 w-3.5 mr-1" /> Sign up
        </Button>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-dashed border-primary/30 bg-primary/5 p-6 text-center ${className}`}>
      <Lock className="h-8 w-8 text-primary mx-auto mb-3 opacity-60" />
      <p className="text-sm text-foreground mb-4">{message}</p>
      <div className="flex justify-center gap-3">
        <Button variant="outline" asChild>
          <Link to={`/login${redirectParam}`}><LogIn className="h-4 w-4 mr-1" /> Log in</Link>
        </Button>
        <Button onClick={onSignupClick}>
          <UserPlus className="h-4 w-4 mr-1" /> Create an account
        </Button>
      </div>
    </div>
  );
}
