import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";

export default function TermsPage() {
  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
      </Button>
      <article className="prose prose-sm max-w-3xl mx-auto">
        <h1 className="font-display text-3xl font-bold mb-6">Terms of Service</h1>
        <p className="text-muted-foreground text-sm mb-2">Last updated: February 10, 2026</p>

        <h2 className="font-display text-xl font-semibold mt-8 mb-3">1. Acceptance of Terms</h2>
        <p className="text-muted-foreground leading-relaxed">By accessing and using ChangeTheGame ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform.</p>

        <h2 className="font-display text-xl font-semibold mt-8 mb-3">2. Description of Service</h2>
        <p className="text-muted-foreground leading-relaxed">ChangeTheGame is a learning network connecting gamechangers, ecosystem builders, and organisations around regenerative projects (Quests), collaborative groups (Guilds), and expertise sharing (Services).</p>

        <h2 className="font-display text-xl font-semibold mt-8 mb-3">3. User Accounts</h2>
        <p className="text-muted-foreground leading-relaxed">You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your credentials and for all activities under your account.</p>

        <h2 className="font-display text-xl font-semibold mt-8 mb-3">4. User Conduct</h2>
        <p className="text-muted-foreground leading-relaxed">You agree not to: post harmful, misleading, or illegal content; harass other users; attempt to manipulate XP or contribution metrics; or circumvent rate limits or platform restrictions.</p>

        <h2 className="font-display text-xl font-semibold mt-8 mb-3">5. Intellectual Property</h2>
        <p className="text-muted-foreground leading-relaxed">Content you create on the Platform remains yours. By posting, you grant ChangeTheGame a non-exclusive, royalty-free license to display and distribute your content within the Platform.</p>

        <h2 className="font-display text-xl font-semibold mt-8 mb-3">6. Payments & Subscriptions</h2>
        <p className="text-muted-foreground leading-relaxed">Paid plans and service bookings are processed through our payment provider. Refund policies apply as described at the time of purchase.</p>

        <h2 className="font-display text-xl font-semibold mt-8 mb-3">7. Limitation of Liability</h2>
        <p className="text-muted-foreground leading-relaxed">QuestHub is provided "as is" without warranties. We are not liable for indirect, incidental, or consequential damages arising from your use of the Platform.</p>

        <h2 className="font-display text-xl font-semibold mt-8 mb-3">8. Changes to Terms</h2>
        <p className="text-muted-foreground leading-relaxed">We may update these terms at any time. Continued use of the Platform after changes constitutes acceptance of the new terms.</p>

        <h2 className="font-display text-xl font-semibold mt-8 mb-3">9. Contact</h2>
        <p className="text-muted-foreground leading-relaxed">For questions about these Terms, please contact us at legal@questhub.example.com.</p>
      </article>
    </PageShell>
  );
}
