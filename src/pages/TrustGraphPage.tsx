import { ContentPageShell, ContentSection, ContentList, ContentCTA } from "@/components/ContentPageShell";

export default function TrustGraphPage({ embedded }: { embedded?: boolean }) {
  return (
    <ContentPageShell
      title="Open Trust Graph"
      subtitle="A transparent, human-powered reputation layer for the ecosystem."
      embedded={embedded}
    >
      <ContentSection title="Why Trust Matters">
        <p>
          In a world of noise, credentials, and self-promotion, how do you know who to collaborate with?
          Traditional platforms rely on ratings, reviews, or opaque algorithms. changethegame takes a different approach:
          a <strong>polymorphic attestation system</strong> where real people vouch for real contributions.
        </p>
        <p>
          The Open Trust Graph replaces popularity metrics with meaningful, verifiable trust signals.
          It answers the question: <em>"Who has actually worked with this person, guild, or organisation — and what was the experience?"</em>
        </p>
      </ContentSection>

      <ContentSection title="How It Works">
        <p>
          Trust is expressed through <strong>TrustEdges</strong> — directed attestations from one node to another.
          Nodes can be Profiles, Guilds, Quests, Services, Companies, or Territories.
        </p>
        <ContentList items={[
          "Anyone can give a trust attestation to another entity they've interacted with",
          "Each edge carries a score (1–5), optional tags, a note, and an evidence URL",
          "Edges can be public, network-visible, or private",
          "A global weighted score is calculated: Base 1 + (score × 0.2)",
          "Freshness matters: edges older than 24 months receive a 0.8× decay multiplier",
          "Trust is renewable: after 12 months, you're prompted to confirm or retract your attestation",
        ]} />
      </ContentSection>

      <ContentSection title="Anti-Gaming Safeguards">
        <p>
          Trust must be earned, not gamed. The system enforces several constraints to maintain integrity:
        </p>
        <ContentList items={[
          "Maximum 3 public trust edges per user per week",
          "6-month cooldown between the same node pair",
          "Reciprocal trust given within 48h without evidence receives a 50% XP reduction",
          "Periodic renewal: unconfirmed edges are marked as outdated after 18 months",
        ]} />
      </ContentSection>

      <ContentSection title="Reputation & Rewards">
        <p>
          Trust attestations feed both the <strong>XP reputation system</strong> and the <strong>credit economy</strong>:
        </p>
        <ContentList items={[
          "Public edges award specialised XP (Stewardship, Maker, Community, Tech Commons, etc.)",
          "Monthly XP cap of 40 per category — overflow is stored and released gradually",
          "Credit bonuses for high-quality attestations (evidence-backed, marked 'Useful')",
          "Stewards receiving trust in their domain earn additional credits",
        ]} />
      </ContentSection>

      <ContentSection title="Openness & Interoperability">
        <p>
          The trust graph is designed to be <strong>open and portable</strong>. Public attestations are available
          via a public API endpoint compatible with JSON-LD and future Verifiable Credentials standards.
          This means trust data can be verified and consumed by external systems — no lock-in.
        </p>
        <ContentList items={[
          "Public API: GET /trust-graph-public?node_type=…&node_id=…",
          "JSON-LD context: https://w3id.org/trust/v1",
          "Pagination, filtering by tag, edge type, or territory",
          "Only public + active edges are ever exposed",
        ]} />
      </ContentSection>

      <ContentSection title="Trust Across the Platform">
        <p>
          Trust signals are woven into every part of the experience:
        </p>
        <ContentList items={[
          "Dedicated 'Trust' tab on every entity page (profile, guild, company, territory…)",
          "Trust badges and scores in search results and mini-cards",
          "'Top Trusted Members' ranking within guilds and territories",
          "A multi-step 'Give Trust' wizard with real-time limit validation",
          "Trust renewal dashboard in your Network settings",
        ]} />
      </ContentSection>

      <ContentCTA links={[
        { label: "Explore people", href: "/explore/users" },
        { label: "Credit economy", href: "/ecosystem?tab=credits" },
        { label: "Governance", href: "/ecosystem?tab=governance" },
      ]} />
    </ContentPageShell>
  );
}
