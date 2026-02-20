import { ContentPageShell, ContentSection } from "@/components/ContentPageShell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  User, Building2, Users, Coins, ListChecks, MapPin, CalendarDays, ArrowRightLeft, Sparkles, Vote,
} from "lucide-react";

const USE_CASES = [
  {
    icon: User,
    title: "The Freelancer Who Wants to Shine",
    audience: "Freelancers",
    description:
      "A freelance designer or strategist builds a living profile enhanced by AI, presents services, past quests, causes & territories, receives reviews & XP, appears in talent searches, and gets paid in fiat or earns credits through contributions.",
    features: ["AI-enhanced profile", "Services & portfolio", "XP reputation", "Skill-based search", "Fiat + credit payments"],
  },
  {
    icon: Building2,
    title: "The Public Actor Looking for the Right Talent",
    audience: "Organizations",
    description:
      "A city, region, NGO, or company publishes open quests, searches talent by domain, cause and territory, creates temporary task forces mixing freelancers and guild members, and tracks progress & funding centrally.",
    features: ["Open quests", "Talent search", "Task forces", "Central tracking"],
  },
  {
    icon: Users,
    title: "A Collective Organizing Its Actions",
    audience: "Collectives",
    description:
      "A community, choir, DAO, or citizen group creates a guild to access rituals & online gatherings, internal and public quests, shared task management, a co-financing pool (fiat + credits), and partnerships with other guilds.",
    features: ["Rituals & gatherings", "Internal quests", "Shared tasks", "Co-financing", "Partnerships"],
  },
  {
    icon: Coins,
    title: "Crowdfunded Quests for Collective Action",
    audience: "Communities",
    description:
      "A guild launches a regeneration project — mapping abandoned buildings, training volunteers, designing composting systems. Contributions flow in fiat or credits, volunteers earn XP, admins define milestones & roles, and AI assists in writing the project.",
    features: ["Fiat + credit funding", "Volunteer XP", "Milestones", "AI writing assist"],
  },
  {
    icon: ListChecks,
    title: "Personal Task Management Inside Every Quest",
    audience: "Everyone",
    description:
      "Every user creates their own task list, links tasks to quests, guilds, services or territories, gets AI suggestions to refine tasks, and drags tasks into quest timelines. A personal productivity system embedded inside a cooperative action ecosystem.",
    features: ["Personal tasks", "Quest-linked", "AI task suggestions", "Timeline integration"],
  },
  {
    icon: MapPin,
    title: "Territorial Diagnosis for Decision Makers",
    audience: "Territories",
    description:
      "A local authority or changemaker uses the Territory Analyst AI to surface vulnerabilities, emerging opportunities, active actors & guilds, possible quests to launch, and recommended partners. This helps territories design evidence-based strategies.",
    features: ["AI territory analysis", "Vulnerability mapping", "Actor discovery", "Strategy design"],
  },
  {
    icon: CalendarDays,
    title: "Real-World Community Activation",
    audience: "Citizens",
    description:
      "Users with shared motivations meet physically, organize walk-throughs, workshops, hackathons and rituals, sync events with guild calendars, and create local micro-communities inside larger guilds. A bridge between digital commons and real territory life.",
    features: ["Physical meetups", "Events & rituals", "Calendar sync", "Local micro-communities"],
  },
  {
    icon: ArrowRightLeft,
    title: "Multi-Currency Value Exchange",
    audience: "Ecosystem builders",
    description:
      "Participants interact using fiat for formal services, credits for contributions and symbolic exchanges, XP to grow reputation and unlock governance rights, and A/B shares to join long-term cooperative ownership. A regenerative economy powering a cooperative platform.",
    features: ["Fiat", "Credits", "XP reputation", "Cooperative shares"],
  },
  {
    icon: Sparkles,
    title: "AI Co-Pilots Supporting Each Persona",
    audience: "Everyone",
    description:
      "Specialized assistants serve every need: Territory Analyst for deep-dives, Community Strategist for engagement, Grant Writer for funding proposals, Content Creator for bios and pages, Coach for goal setting. Each generates XP and uses credits, reinforcing engagement loops.",
    features: ["Territory Analyst", "Community Strategist", "Grant Writer", "Content Creator", "Coach"],
  },
  {
    icon: Vote,
    title: "Collective Governance of a Digital Commons",
    audience: "Co-owners",
    description:
      "Users who accumulate XP vote on platform improvements, participate in micro-governance inside their guild, join circles steering territories or program tracks, propose new rules or shared resources, and eventually hold cooperative shares for deeper involvement.",
    features: ["Democratic voting", "Guild governance", "Territory circles", "Cooperative shares"],
  },
];

const AUDIENCE_COLORS: Record<string, string> = {
  Freelancers: "bg-primary/10 text-primary",
  Organizations: "bg-accent/50 text-accent-foreground",
  Collectives: "bg-secondary text-secondary-foreground",
  Communities: "bg-primary/15 text-primary",
  Everyone: "bg-muted text-muted-foreground",
  Territories: "bg-accent/30 text-accent-foreground",
  Citizens: "bg-secondary/80 text-secondary-foreground",
  "Ecosystem builders": "bg-primary/20 text-primary",
  "Co-owners": "bg-accent/40 text-accent-foreground",
};

export default function UseCasesPage() {
  return (
    <ContentPageShell
      title="10 Use Cases"
      subtitle="How changethegame supports freelancers, organizations, collectives, territories, ecosystem builders, citizens & communities."
    >
      <div className="grid gap-6 sm:grid-cols-2">
        {USE_CASES.map((uc, i) => {
          const Icon = uc.icon;
          return (
            <Card key={i} className="p-5 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-bold text-sm leading-tight">{uc.title}</h3>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${AUDIENCE_COLORS[uc.audience] || ""}`}>
                      {uc.audience}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{uc.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 pl-11">
                {uc.features.map((f) => (
                  <Badge key={f} variant="secondary" className="text-[10px] font-normal">
                    {f}
                  </Badge>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <ContentSection title="Who is changethegame for?">
        <div className="flex flex-wrap gap-2">
          {["Freelancers", "Organizations", "Collectives", "Territories", "Ecosystem Builders", "Citizens", "Communities"].map((who) => (
            <Badge key={who} className="text-xs px-3 py-1">
              {who}
            </Badge>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Across skills, missions, governance, funding, territorial analysis and real-world activation — changethegame is where human collaboration meets AI-augmented impact.
        </p>
      </ContentSection>
    </ContentPageShell>
  );
}
