import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { UserEntities } from "@/hooks/useUserEntities";

type ActionType = "navigate" | "prompt";

interface ActionItem {
  label: string;
  type: ActionType;
  route?: string;
  prompt?: string;
  chips: string[];
}

interface ActionPath {
  id: string;
  icon: string;
  label: string;
  colorClass: string;
  actions: ActionItem[];
}

const ACTION_PATHS: ActionPath[] = [
  {
    id: "quests",
    icon: "🎯",
    label: "Tasks & Quests",
    colorClass: "text-emerald-600",
    actions: [
      { label: "Start a new territorial quest", type: "navigate", route: "/quests/new", chips: ["Territory", "Budget", "Co-hosts"] },
      { label: "Get my quest funded", type: "prompt", prompt: "I want to open my quest to collective funding — credits or fiat. Help me configure the budget and funding settings.", chips: ["Credits", "Fiat", "Proposals"] },
      { label: "Manage my active tasks", type: "navigate", route: "/work", chips: ["In progress", "Milestones"] },
      { label: "Post a quest update", type: "prompt", prompt: "I want to post an update on one of my active quests — a milestone, a call for help, or a reflection. Which quest should I update?", chips: ["Milestone", "Call for help"] },
      { label: "Close or complete a quest", type: "prompt", prompt: "I want to mark one of my quests as completed and unlock XP for the team. Which quest should I close?", chips: ["XP unlock", "Completion"] },
      { label: "View my ideas & drafts", type: "navigate", route: "/work?tab=ideas", chips: ["Drafts", "Ideas"] },
      { label: "Boost a quest's visibility", type: "prompt", prompt: "I want to boost the visibility of one of my quests using credits. Which quest should I feature?", chips: ["15 credits", "Featured"] },
      { label: "Open my calendar", type: "navigate", route: "/calendar", chips: ["Events", "Schedule"] },
    ],
  },
  {
    id: "missions",
    icon: "🚀",
    label: "Missions & Opportunities",
    colorClass: "text-indigo-600",
    actions: [
      { label: "Submit a proposal", type: "navigate", route: "/explore?tab=quests", chips: ["Proposals", "Skills"] },
      { label: "Find where I can help right now", type: "prompt", prompt: "I want to be useful right now. Use my profile, skills and territory to match me with quests that need contributors immediately.", chips: ["AI Match", "Immediate"] },
      { label: "Browse job offers", type: "navigate", route: "/jobs", chips: ["Jobs", "CDI/Freelance"] },
      { label: "Track my applications", type: "navigate", route: "/work", chips: ["Status", "Pending"] },
      { label: "Become a quest co-host", type: "prompt", prompt: "I want to join an existing quest as a co-host and share facilitation responsibilities. Which quests are looking for co-hosts?", chips: ["Co-host", "Shared rights"] },
    ],
  },
  {
    id: "explore",
    icon: "🌍",
    label: "Explore & Discover",
    colorClass: "text-amber-600",
    actions: [
      { label: "Explore my territory", type: "navigate", route: "/territories", chips: ["Map", "Local actors"] },
      { label: "Discover guilds", type: "navigate", route: "/explore?tab=entities", chips: ["Topics", "Join"] },
      { label: "Meet other humans", type: "navigate", route: "/explore/users", chips: ["Profiles", "Skills"] },
      { label: "Browse topics & houses", type: "navigate", route: "/explore/houses", chips: ["Topics", "Houses"] },
      { label: "Search everything", type: "navigate", route: "/search", chips: ["Global", "Unified"] },
      { label: "Discover AI Agents", type: "navigate", route: "/agents", chips: ["AI", "Specialized"] },
      { label: "My saved territory excerpts", type: "navigate", route: "/me/starred-excerpts", chips: ["Memory", "Saved"] },
    ],
  },
  {
    id: "learn",
    icon: "📚",
    label: "Learn & Grow",
    colorClass: "text-pink-600",
    actions: [
      { label: "Take a course", type: "navigate", route: "/courses/explore", chips: ["Levels", "XP"] },
      { label: "Book a mentoring session", type: "navigate", route: "/services/marketplace", chips: ["1:1", "Expert"] },
      { label: "Join a Study Pod", type: "navigate", route: "/pods", chips: ["Group", "Topic"] },
      { label: "Attend a ritual or gathering", type: "navigate", route: "/explore?tab=events", chips: ["Events", "Rituals"] },
      { label: "Create and sell a course", type: "navigate", route: "/courses/new", chips: ["Teach", "Monetize"] },
      { label: "Platform guides", type: "navigate", route: "/guides", chips: ["Help", "How-to"] },
    ],
  },
  {
    id: "network",
    icon: "🕸️",
    label: "My Network",
    colorClass: "text-teal-600",
    actions: [
      { label: "Manage my guilds", type: "navigate", route: "/me/guilds", chips: ["Affiliations", "Roles"] },
      { label: "Send a direct message", type: "navigate", route: "/inbox", chips: ["DM", "Attachments"] },
      { label: "Give trust to a collaborator", type: "navigate", route: "/trust-graph", chips: ["Trust", "5 dimensions"] },
      { label: "Join a Pod", type: "navigate", route: "/pods", chips: ["Quest Pod", "Study Pod"] },
      { label: "Manage my follows", type: "navigate", route: "/me/following", chips: ["Following", "Activity"] },
      { label: "Propose a partnership", type: "prompt", prompt: "I want to propose a collaboration or partnership between two guilds or entities on the platform. Which entities should be connected?", chips: ["Inter-guild", "Level 9+"] },
      { label: "Send a broadcast to my community", type: "prompt", prompt: "I want to send a broadcast message to my guild's members or followers. Which guild do you want to communicate for?", chips: ["Broadcast", "Targeting"] },
    ],
  },
  {
    id: "create",
    icon: "💼",
    label: "Create & Offer",
    colorClass: "text-orange-600",
    actions: [
      { label: "Publish a service", type: "navigate", route: "/services/new", chips: ["Pricing", "Booking"] },
      { label: "Organize an event", type: "prompt", prompt: "I want to create an event — public or private, online or in-person. Which guild should host it?", chips: ["Event", "IRL/Online"] },
      { label: "Manage my bookings", type: "navigate", route: "/me/bookings", chips: ["Requests", "Payments"] },
      { label: "Manage my availability", type: "navigate", route: "/me/availability", chips: ["Slots", "Calendar"] },
      { label: "Create a Guild or Collective", type: "navigate", route: "/explore?tab=entities&create=guild", chips: ["Guild", "Governance"] },
      { label: "Create a traditional organization", type: "navigate", route: "/onboarding/organization", chips: ["Org", "Company"] },
      { label: "Check my Wallet", type: "navigate", route: "/settings/wallet", chips: ["Revenue", "Credits"] },
      { label: "Publish my entity's public website", type: "prompt", prompt: "I want to create or update the public website for one of my entities. Which guild or organization should I publish for?", chips: ["Mini-site", "Public"] },
    ],
  },
  {
    id: "profile",
    icon: "🪪",
    label: "My Profile & Identity",
    colorClass: "text-violet-600",
    actions: [
      { label: "Enrich my profile with AI", type: "navigate", route: "/profile/enrich", chips: ["AI", "Bio", "Topics"] },
      { label: "Complete my onboarding", type: "navigate", route: "/me/onboarding", chips: ["Checklist", "%"] },
      { label: "View my XP & specializations", type: "navigate", route: "/me/xp", chips: ["Levels", "XP"] },
      { label: "My milestones to unlock", type: "navigate", route: "/me/milestones", chips: ["Achievements", "Rewards"] },
      { label: "Become a co-owner (cooperative)", type: "navigate", route: "/shares", chips: ["Shares", "Governance"] },
    ],
  },
  {
    id: "impact",
    icon: "🌱",
    label: "Impact & Territory",
    colorClass: "text-green-700",
    actions: [
      { label: "Track my territory indicators", type: "prompt", prompt: "I want to view and update the natural system indicators for my territory. Which living system should I open?", chips: ["Natural Systems", "KPIs"] },
      { label: "Contribute to territorial memory", type: "navigate", route: "/territories", chips: ["Memory", "Excerpts"] },
      { label: "Broadcast to my community", type: "prompt", prompt: "I want to send a targeted broadcast to my guild's members, followers or topic subscribers. Which entity should I send from?", chips: ["Broadcast", "Targeted"] },
      { label: "Post on my entity's wall", type: "prompt", prompt: "I want to publish a post on one of my entities' walls. Which guild or organization should I post for?", chips: ["Wall", "Feed"] },
      { label: "Publish my entity's public site", type: "navigate", route: "/site", chips: ["Mini-site", "Visibility"] },
    ],
  },
];

interface PiActionPathsProps {
  onPromptSelect: (prompt: string) => void;
  onClose?: () => void;
  userEntities?: UserEntities | null;
}

export function PiActionPaths({ onPromptSelect, onClose, userEntities }: PiActionPathsProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleToggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  const handleAction = (action: ActionItem) => {
    if (action.type === "navigate" && action.route) {
      navigate(action.route);
      onClose?.();
    } else if (action.type === "prompt" && action.prompt) {
      // Enrich prompt with user's entities for context
      let enrichedPrompt = action.prompt;
      if (userEntities) {
        const parts: string[] = [];
        if (userEntities.quests?.length) {
          parts.push(
            `My active quests: ${userEntities.quests.map((q) => `"${q.title}" (id: ${q.id})`).join(", ")}`
          );
        }
        if (userEntities.guilds?.length) {
          parts.push(
            `My guilds: ${userEntities.guilds.map((g) => `"${g.name}" (id: ${g.id})`).join(", ")}`
          );
        }
        if (parts.length) {
          enrichedPrompt += "\n\n" + parts.join("\n");
        }
      }
      onPromptSelect(enrichedPrompt);
    }
  };

  return (
    <ScrollArea className="max-h-[calc(100vh-180px)]">
      <div className="flex flex-col gap-1 p-2">
        {ACTION_PATHS.map((path) => {
          const isOpen = openId === path.id;

          return (
            <div key={path.id}>
              {/* Path header */}
              <button
                onClick={() => handleToggle(path.id)}
                className={cn(
                  "flex items-center gap-2 w-full p-3 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer text-left",
                  isOpen && "bg-muted/40"
                )}
              >
                <span className="text-base leading-none">{path.icon}</span>
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                <span className={cn("text-sm font-medium", path.colorClass)}>
                  {path.label}
                </span>
              </button>

              {/* Actions */}
              {isOpen && (
                <div className="flex flex-col gap-0.5 pl-3 pr-1 pb-1">
                  {path.actions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAction(action)}
                      className="flex items-start gap-2 px-3 py-2 rounded-md hover:bg-accent/50 transition-colors cursor-pointer text-left w-full"
                    >
                      <span className="text-xs text-foreground leading-snug flex-1">
                        {action.label}
                      </span>
                      <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        {action.chips.slice(0, 3).map((chip) => (
                          <span
                            key={chip}
                            className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground rounded font-mono leading-relaxed"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
