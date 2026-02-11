import { ContentPageShell, ContentSection, ContentList } from "@/components/ContentPageShell";

export default function SecurityPage() {
  return (
    <ContentPageShell title="Security" subtitle="How we protect your data and the platform.">
      <ContentSection title="Our Commitment">
        <p>Security is foundational to changethegame. We implement industry-standard protections across all layers of the platform.</p>
      </ContentSection>

      <ContentSection title="Measures in Place">
        <ContentList items={[
          "Encryption in transit (TLS) and at rest",
          "Row-level security on all database tables",
          "Rate limiting on all sensitive endpoints",
          "Role-based access control for guilds, companies, and admin",
          "Secure authentication with email verification",
          "Session management with automatic expiry",
          "Soft-delete with permanent removal after 30 days",
        ]} />
      </ContentSection>

      <ContentSection title="Responsible Disclosure">
        <p>If you discover a vulnerability, please report it to <a href="mailto:security@changethegame.xyz" className="text-primary hover:underline">security@changethegame.xyz</a>. We take all reports seriously and respond promptly.</p>
      </ContentSection>
    </ContentPageShell>
  );
}
