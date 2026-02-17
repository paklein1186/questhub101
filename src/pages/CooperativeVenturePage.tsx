import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const CLASS_A_MAILTO =
  "mailto:pa@changethegame.xyz?subject=Class%20A%20Membership%20Application";

export default function CooperativeVenturePage() {
  const { t } = useTranslation();
  return (
    <PageShell>
      <div className="max-w-2xl mx-auto py-12 sm:py-20 px-4">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2">
          {t("pages.cooperative.title")}
        </h1>
        <p className="text-muted-foreground text-lg mb-12">
          {t("pages.cooperative.subtitle")}
        </p>

        <div className="space-y-4 text-base sm:text-lg leading-relaxed text-foreground/90">
          <p>changethegame is not just a platform.</p>
          <p>It is a coop-like project owned, shaped and governed by its members.</p>

          <p className="pt-4">We offer two share classes:</p>

          {/* Class A */}
          <div className="pt-6 space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              Class A — Guardians
            </h2>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Participate in strategic decisions</li>
              <li>Vote on governance and future directions</li>
              <li>Contribute to long-term stewardship</li>
            </ul>
            <div className="rounded-lg bg-muted/50 border border-border p-3 text-sm space-y-1 mt-2">
              <p><strong>Minimum ticket:</strong> €25,000</p>
              <p><strong>Target range:</strong> €25k – €100k</p>
              <p><strong>Cap:</strong> 30–40 Class A holders maximum</p>
            </div>
            <p className="text-muted-foreground text-sm pt-1">
              To access: send us an email if you feel called to take responsibility.
            </p>
            <a href={CLASS_A_MAILTO} className="inline-block mt-2">
              <Button variant="outline" size="sm">
                Become an A Member
              </Button>
            </a>
          </div>

          {/* Class B */}
          <div className="pt-8 space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              Class B — Stewards
            </h2>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Support the project financially</li>
              <li>Receive invitations to assemblies, gatherings and sprints</li>
              <li>Influence the roadmap</li>
              <li>Start at €10/share</li>
            </ul>
            <Button variant="default" size="sm" className="mt-2" asChild>
              <a href="/shares">Join the Coop (Class B)</a>
            </Button>
          </div>

          {/* Why */}
          <div className="pt-10 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              Why a coop-like structure?
            </h2>
            <p>
              Because the tools we use to collaborate should belong to the people
              who collaborate.
            </p>
          </div>

          {/* Where money goes */}
          <div className="pt-8 space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              Where your contribution goes
            </h2>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Infrastructure &amp; hosting</li>
              <li>AI development reinforcing collective thinking</li>
              <li>Territorial intelligence tools</li>
              <li>Community support &amp; gatherings</li>
              <li>New features based on members' needs</li>
            </ul>
          </div>

          <p className="pt-8">
            We're building this with you, for you, and ultimately owned by you.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
