import { ContentPageShell, ContentSection } from "@/components/ContentPageShell";

export default function PrivacyPage() {
  return (
    <ContentPageShell title="Privacy Policy" subtitle="Your data, protected and respected.">
      <p className="text-muted-foreground leading-relaxed mb-6">We collect only the data necessary to provide the platform and its collaborative features. We never sell your data. AI agents operate with strict boundaries and unit-specific context.</p>

      <ContentSection title="1. Information We Collect">
        <p>We collect information you provide directly (name, email, profile data) and usage data (pages visited, actions taken, device information) to improve the Platform.</p>
      </ContentSection>

      <ContentSection title="2. How We Use Your Data">
        <p>Your data is used to: provide and improve Platform features; personalise your experience; send notifications and digests; process payments; and ensure platform security.</p>
      </ContentSection>

      <ContentSection title="3. AI Agent Usage and Context Limits">
        <p>AI agents only access data within their assigned unit (guild, quest, company, territory). They do not have global access to your data or activity across the platform.</p>
      </ContentSection>

      <ContentSection title="4. Territory, Guild & Quest Data Isolation">
        <p>Data within guilds, companies, and quests is isolated to authorized members. Public content is visible to all users; private content is restricted by role-based access.</p>
      </ContentSection>

      <ContentSection title="5. Cookies and Analytics">
        <p>We use essential, analytics, and preference cookies. See our <a href="/cookies" className="text-primary hover:underline">Cookie Policy</a> for details.</p>
      </ContentSection>

      <ContentSection title="6. Third-Party Services">
        <p>We use service providers for payment processing, hosting, and analytics. All operate under strict data protection agreements.</p>
      </ContentSection>

      <ContentSection title="7. Data Retention">
        <p>We retain your data for as long as your account is active. Soft-deleted content is permanently removed after 30 days. You may request full deletion at any time.</p>
      </ContentSection>

      <ContentSection title="8. User Rights (GDPR)">
        <p>You have the right to access, rectify, delete, or export your personal data. You may also object to processing or request restriction.</p>
      </ContentSection>

      <ContentSection title="9. Contact">
        <p>For privacy inquiries, contact our Data Protection Officer at <a href="mailto:privacy@changethegame.xyz" className="text-primary hover:underline">privacy@changethegame.xyz</a>.</p>
      </ContentSection>
    </ContentPageShell>
  );
}
