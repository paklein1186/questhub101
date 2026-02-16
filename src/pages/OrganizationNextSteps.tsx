import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2, Target, Briefcase, Users, Handshake, ArrowRight,
  Rocket, PartyPopper, MapPin, Compass, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";
import { useCompanyById } from "@/hooks/useEntityQueries";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08 } }),
};

const ACTIONS = [
  {
    icon: Target,
    title: "Launch a Monetized Quest",
    desc: "Create a challenge or call for proposals. Allocate budget, set territory scope, and open it to aligned talent.",
    link: (id: string) => `/companies/${id}/quests/new`,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    icon: Briefcase,
    title: "Post a Job Position",
    desc: "Add contract positions with location, skills requirements, and XP level filters.",
    link: (_id: string) => "/jobs",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Users,
    title: "Request Matchmaking",
    desc: "Find guilds, users, or pods aligned with your topics and territories. AI-assisted matching.",
    link: (id: string) => `/companies/${id}?tab=ai-chat`,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: Handshake,
    title: "Offer Services",
    desc: "Provide consulting, research, funding, mentorship. Connect via appointments and payments.",
    link: (_id: string) => "/services/new",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
];

export default function OrganizationNextSteps() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: company } = useCompanyById(id);

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-4">
            <PartyPopper className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-2">
            {company?.name ? `${company.name} is live!` : "Organization created!"}
          </h1>
          <p className="text-muted-foreground">
            Your organization profile is now part of the ecosystem. Here's what you can do next.
          </p>
        </motion.div>

        <div className="space-y-4 mb-8">
          {ACTIONS.map((action, i) => (
            <motion.div key={action.title} custom={i} variants={fadeUp} initial="hidden" animate="show">
              <button
                onClick={() => navigate(action.link(id || ""))}
                className="w-full text-left rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-sm cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  <div className={`h-11 w-11 rounded-xl ${action.bgColor} flex items-center justify-center shrink-0`}>
                    <action.icon className={`h-5 w-5 ${action.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold text-base mb-1">{action.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{action.desc}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                </div>
              </button>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button variant="outline" asChild>
            <Link to={`/companies/${id}`}><Building2 className="h-4 w-4 mr-1" /> View Organization Profile</Link>
          </Button>
          <Button asChild>
            <Link to="/"><Rocket className="h-4 w-4 mr-1" /> Go to Dashboard</Link>
          </Button>
        </motion.div>
      </div>
    </PageShell>
  );
}
