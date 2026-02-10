import { ContentPageShell, ContentSection } from "@/components/ContentPageShell";

export default function TermsPage() {
  return (
    <ContentPageShell title="Terms of Service" subtitle="Last updated: February 10, 2026">
      <ContentSection title="1. Agreement">
        <p>By accessing and using ChangeTheGame ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform.</p>
      </ContentSection>

      <ContentSection title="2. Accounts & Security">
        <p>You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your credentials and for all activities under your account.</p>
      </ContentSection>

      <ContentSection title="3. User Responsibilities">
        <p>You agree not to: post harmful, misleading, or illegal content; harass other users; attempt to manipulate XP or contribution metrics; or circumvent rate limits or platform restrictions.</p>
      </ContentSection>

      <ContentSection title="4. Content Ownership">
        <p>Content you create on the Platform remains yours. By posting, you grant ChangeTheGame a non-exclusive, royalty-free license to display and distribute your content within the Platform.</p>
      </ContentSection>

      <ContentSection title="5. AI-Generated Content Usage">
        <p>AI agents may generate summaries, suggestions, and drafts. AI-generated content is provided as-is. You are responsible for reviewing and approving any AI output before publishing or acting on it.</p>
      </ContentSection>

      <ContentSection title="6. Payments, Credits & Transactions">
        <p>Paid plans, service bookings, and credit purchases are processed through our payment provider. Refund policies apply as described at the time of purchase.</p>
      </ContentSection>

      <ContentSection title="7. Listing Services and Bookings">
        <p>Service providers are responsible for the accuracy of their listings, availability, and fulfillment. ChangeTheGame facilitates but does not guarantee service delivery.</p>
      </ContentSection>

      <ContentSection title="8. Collaborations and Quests">
        <p>Quest participation is voluntary. ChangeTheGame is not liable for the outcome of collaborations between users.</p>
      </ContentSection>

      <ContentSection title="9. Guild, Company and Pod Governance">
        <p>Guilds, companies, and pods are self-governed by their members. ChangeTheGame provides tools but does not enforce internal governance decisions.</p>
      </ContentSection>

      <ContentSection title="10. Limitations of Liability">
        <p>ChangeTheGame is provided "as is" without warranties. We are not liable for indirect, incidental, or consequential damages arising from your use of the Platform.</p>
      </ContentSection>

      <ContentSection title="11. Suspension & Termination">
        <p>We reserve the right to suspend or terminate accounts that violate these terms. Users may delete their accounts at any time through settings.</p>
      </ContentSection>

      <ContentSection title="12. Dispute Resolution">
        <p>Disputes will be resolved through good-faith communication. For unresolved issues, contact us at <a href="mailto:legal@changethegame.xyz" className="text-primary hover:underline">legal@changethegame.xyz</a>.</p>
      </ContentSection>
    </ContentPageShell>
  );
}
