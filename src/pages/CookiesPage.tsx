import { ContentPageShell, ContentSection } from "@/components/ContentPageShell";

export default function CookiesPage() {
  return (
    <ContentPageShell title="Cookies Policy" subtitle="Last updated: February 10, 2026">
      <ContentSection title="1. What Are Cookies">
        <p>Cookies are small text files stored on your device when you visit a website. They help us remember your preferences and improve your experience.</p>
      </ContentSection>

      <ContentSection title="2. Types of Cookies Used">
        <p><strong>Essential:</strong> Necessary for the Platform to function — authentication, security tokens, and session management. Cannot be disabled.</p>
        <p><strong>Analytics:</strong> Help us understand how users interact with the Platform. Data is anonymised.</p>
        <p><strong>Preferences:</strong> Remember your settings such as language, theme, and notification preferences.</p>
      </ContentSection>

      <ContentSection title="3. How We Use Cookies">
        <p>Cookies enable authentication, personalization, analytics, and platform optimization. We do not use cookies for advertising or tracking across other websites.</p>
      </ContentSection>

      <ContentSection title="4. How to Manage Cookies">
        <p>You can manage your cookie preferences through the cookie consent banner or your browser settings.</p>
      </ContentSection>

      <ContentSection title="5. Impact of Disabling Cookies">
        <p>Disabling essential cookies may prevent you from logging in or using core platform features. Disabling analytics or preference cookies will not affect core functionality.</p>
      </ContentSection>

      <ContentSection title="6. Contact">
        <p>For questions about our cookie practices, contact us at <a href="mailto:privacy@changethegame.xyz" className="text-primary hover:underline">privacy@changethegame.xyz</a>.</p>
      </ContentSection>
    </ContentPageShell>
  );
}
