import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";

export default function CookiesPage() {
  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
      </Button>
      <article className="prose prose-sm max-w-3xl mx-auto">
        <h1 className="font-display text-3xl font-bold mb-6">Cookie Policy</h1>
        <p className="text-muted-foreground text-sm mb-2">Last updated: February 10, 2026</p>

        <h2 className="font-display text-xl font-semibold mt-8 mb-3">1. What Are Cookies</h2>
        <p className="text-muted-foreground leading-relaxed">Cookies are small text files stored on your device when you visit a website. They help us remember your preferences and improve your experience.</p>

        <h2 className="font-display text-xl font-semibold mt-8 mb-3">2. Essential Cookies</h2>
        <p className="text-muted-foreground leading-relaxed">These cookies are necessary for the Platform to function. They handle authentication, security tokens, and session management. They cannot be disabled.</p>

        <h2 className="font-display text-xl font-semibold mt-8 mb-3">3. Analytics Cookies</h2>
        <p className="text-muted-foreground leading-relaxed">We use analytics cookies to understand how users interact with the Platform, which pages are visited most, and where users encounter issues. This data is anonymised.</p>

        <h2 className="font-display text-xl font-semibold mt-8 mb-3">4. Preference Cookies</h2>
        <p className="text-muted-foreground leading-relaxed">These cookies remember your settings such as language, theme (light/dark mode), and notification preferences.</p>

        <h2 className="font-display text-xl font-semibold mt-8 mb-3">5. Managing Cookies</h2>
        <p className="text-muted-foreground leading-relaxed">You can manage your cookie preferences through the cookie consent banner or your browser settings. Note that disabling certain cookies may affect Platform functionality.</p>

        <h2 className="font-display text-xl font-semibold mt-8 mb-3">6. Contact</h2>
        <p className="text-muted-foreground leading-relaxed">For questions about our cookie practices, contact us at privacy@changethegame.xyz.</p>
      </article>
    </PageShell>
  );
}
