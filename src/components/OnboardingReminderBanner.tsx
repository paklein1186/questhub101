import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sparkles, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const DISMISS_KEY = "onboardingBannerDismissedUntil";
// How long to hide the banner after a manual dismiss (ms)
const SNOOZE_MS = 1000 * 60 * 60 * 24; // 24h

/**
 * Top-of-page banner shown to logged-in users who chose the "quick signup"
 * path and skipped the long personalization wizard. Reminds them to come
 * back and complete their profile.
 *
 * Hides itself on the onboarding page and on auth pages.
 * Dismissable: snoozes for 24h, then re-appears until onboarding is done.
 */
export function OnboardingReminderBanner() {
  const { user, session } = useAuth();
  const location = useLocation();
  const [snoozedUntil, setSnoozedUntil] = useState<number>(() => {
    const raw = localStorage.getItem(DISMISS_KEY);
    return raw ? Number(raw) || 0 : 0;
  });

  // Re-check snooze on route change (so the banner reappears next session)
  useEffect(() => {
    const raw = localStorage.getItem(DISMISS_KEY);
    setSnoozedUntil(raw ? Number(raw) || 0 : 0);
  }, [location.pathname]);

  if (!session || !user) return null;
  if (!user.onboardingSkipped) return null;

  // Don't show on the onboarding flow itself or auth pages
  const hidePaths = ["/onboarding", "/login", "/signup", "/forgot-password", "/reset-password", "/welcome"];
  if (hidePaths.some((p) => location.pathname.startsWith(p))) return null;

  if (Date.now() < snoozedUntil) return null;

  const dismiss = () => {
    const until = Date.now() + SNOOZE_MS;
    localStorage.setItem(DISMISS_KEY, String(until));
    setSnoozedUntil(until);
  };

  return (
    <div className="w-full bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-b border-primary/20">
      <div className="container px-3 sm:px-4 py-2 flex items-center gap-3">
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <p className="text-xs sm:text-sm text-foreground flex-1 min-w-0">
          <span className="font-medium">Finish setting up your profile</span>
          <span className="hidden sm:inline text-muted-foreground"> — pick your topics, languages and territory to get tailored matches and rewards.</span>
        </p>
        <Button asChild size="sm" variant="default" className="h-7 text-xs shrink-0">
          <Link to="/onboarding">
            Continue <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
