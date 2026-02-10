import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";

export default function PrivacyPage() {
  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
      </Button>
      <article className="prose prose-sm max-w-3xl mx-auto">
        <h1 className="font-display text-3xl font-bold mb-6">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-2">Last updated: February 10, 2026</p>

        <h2 className="font-display text-xl font-semibold mt-8 mb-3">1. Data We Collect</h2>
        <p className="text-muted-foreground leading-relaxed">We collect information you provide directly (name, email, profile data) and usage data (pages visited, actions taken, device information) to improve the Platform.</p>

        <h2 className="font-display text-xl font-semibold mt-8 mb-3">2. How We Use Your Data</h2>
        <p className="text-muted-foreground leading-relaxed">Your data is used to: provide and improve Platform features; personalise your experience; send notifications and digests; process payments; and ensure platform security.</p>

        <h2 className="font-display text-xl font-semibold mt-8 mb-3">3. Data Sharing</h2>
        <p className="text-muted-foreground leading-relaxed">We do not sell your data. We may share data with service providers (payment processing, hosting) who operate under strict data protection agreements.</p>

        <h2 className="font-display text-xl font-semibold mt-8 mb-3">4. Your Rights (GDPR)</h2>
        <p className="text-muted-foreground leading-relaxed">You have the right to access, rectify, delete, or export your personal data. You may also object to processing or request restriction. Contact us to exercise these rights.</p>

        <h2 className="font-display text-xl font-semibold mt-8 mb-3">5. Data Retention</h2>
        <p className="text-muted-foreground leading-relaxed">We retain your data for as long as your account is active. Soft-deleted content is permanently removed after 30 days. You may request full deletion at any time.</p>

        <h2 className="font-display text-xl font-semibold mt-8 mb-3">6. Security</h2>
        <p className="text-muted-foreground leading-relaxed">We implement industry-standard security measures including encryption, rate limiting, and role-based access controls to protect your data.</p>

        <h2 className="font-display text-xl font-semibold mt-8 mb-3">7. Contact</h2>
        <p className="text-muted-foreground leading-relaxed">For privacy inquiries, contact our Data Protection Officer at privacy@questhub.example.com.</p>
      </article>
    </PageShell>
  );
}
