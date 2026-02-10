import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = "cookie_consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) setVisible(true);
  }, []);

  const accept = (level: "all" | "essential") => {
    localStorage.setItem(CONSENT_KEY, level);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 inset-x-0 z-50 p-4"
        >
          <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card shadow-lg p-5">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Cookie className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-sm mb-1">We use cookies</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We use cookies to improve your experience. Essential cookies are required for the platform to work.
                  Analytics cookies help us understand usage.{" "}
                  <Link to="/cookies" className="text-primary hover:underline">Learn more</Link>
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button size="sm" onClick={() => accept("all")}>Accept all</Button>
                  <Button size="sm" variant="outline" onClick={() => accept("essential")}>Essential only</Button>
                  <Button size="sm" variant="ghost" asChild>
                    <Link to="/cookies"><Settings className="h-3.5 w-3.5 mr-1" /> Settings</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
