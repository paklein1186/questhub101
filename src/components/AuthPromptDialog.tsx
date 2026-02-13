import { Link, useLocation } from "react-router-dom";
import { LogIn, UserPlus, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Action the user attempted, e.g. "join this guild" */
  actionLabel?: string;
  /** Optional callback to open guest onboarding instead of signup form */
  onSignupClick?: () => void;
}

/**
 * Modal prompt shown to unauthenticated users when they attempt
 * an interactive action (join, follow, comment, etc.).
 */
export function AuthPromptDialog({
  open,
  onOpenChange,
  actionLabel = "perform this action",
  onSignupClick,
}: Props) {
  const location = useLocation();
  const redirectParam = `?redirect=${encodeURIComponent(location.pathname + location.search)}`;

  const handleSignup = () => {
    onOpenChange(false);
    onSignupClick?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2">
            <Lock className="h-10 w-10 text-primary opacity-70" />
          </div>
          <DialogTitle className="text-center">Sign in to continue</DialogTitle>
          <DialogDescription className="text-center">
            You need an account to {actionLabel}. Sign up for free or log in to get started.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-2">
          <Button size="lg" onClick={handleSignup}>
            <UserPlus className="h-4 w-4 mr-2" /> Create a free account
          </Button>
          <Button variant="outline" asChild size="lg">
            <Link to={`/login${redirectParam}`}>
              <LogIn className="h-4 w-4 mr-2" /> Log in
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
