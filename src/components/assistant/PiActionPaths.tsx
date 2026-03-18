import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
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
}

interface ActionPath {
  id: string;
  icon: string;
  label: string;
  actions: ActionItem[];
}

const ACTION_PATHS: ActionPath[] = [
  {
    id: "contribute",
    icon: "🎯",
    label: "Contribute",
    actions: [
      { label: "Browse open quests", type: "navigate", route: "/explore?tab=quests" },
      { label: "AI Matchmaker", type: "prompt", prompt: "I want to be useful right now. Use my profile, skills and territory to match me with quests that need contributors immediately." },
      { label: "My active tasks", type: "navigate", route: "/work" },
      { label: "Submit a proposal", type: "prompt", prompt: "I want to respond to an open quest need or submit a proposal. Which opportunities match my skills?" },
      { label: "Browse jobs", type: "navigate", route: "/jobs" },
      { label: "Post an update", type: "prompt", prompt: "I want to post an update on one of my active quests — a milestone, a call for help, or a reflection. Which quest should I update?" },
    ],
  },
  {
    id: "explore",
    icon: "🌍",
    label: "Explore",
    actions: [
      { label: "Discover guilds", type: "navigate", route: "/explore?tab=entities" },
      { label: "My territory", type: "navigate", route: "/territories" },
      { label: "Meet people", type: "navigate", route: "/explore/users" },
      { label: "Events & rituals", type: "navigate", route: "/explore?tab=events" },
      { label: "Courses & learning", type: "navigate", route: "/courses/explore" },
      { label: "Global search", type: "navigate", route: "/search" },
    ],
  },
  {
    id: "network",
    icon: "🤝",
    label: "Network",
    actions: [
      { label: "My guilds", type: "navigate", route: "/me/guilds" },
      { label: "Direct message", type: "navigate", route: "/inbox" },
      { label: "Trust Graph", type: "navigate", route: "/trust-graph" },
      { label: "My follows", type: "navigate", route: "/me/following" },
      { label: "Propose partnership", type: "prompt", prompt: "I want to propose a collaboration or partnership between two guilds or entities on the platform. Which entities should be connected?" },
    ],
  },
  {
    id: "create",
    icon: "🛠",
    label: "Create",
    actions: [
      { label: "Launch a quest", type: "navigate", route: "/quests/new" },
      { label: "Publish a service", type: "navigate", route: "/services/new" },
      { label: "Organize event", type: "prompt", prompt: "I want to create an event — public or private, online or in-person. Which guild should host it?" },
      { label: "Create a Guild", type: "navigate", route: "/explore?tab=entities&create=guild" },
      { label: "Get my quest funded", type: "prompt", prompt: "I want to open my quest to collective funding — credits or fiat. Help me configure the budget and funding settings." },
      { label: "My Wallet", type: "navigate", route: "/settings/wallet" },
    ],
  },
  {
    id: "impact",
    icon: "📊",
    label: "Impact",
    actions: [
      { label: "My contributions", type: "navigate", route: "/me?tab=contributions" },
      { label: "Value Pie & rewards", type: "navigate", route: "/work?tab=pie" },
      { label: "Territory indicators", type: "prompt", prompt: "I want to view and update the natural system indicators for my territory. Which living system should I open?" },
      { label: "XP & level", type: "navigate", route: "/me/xp" },
      { label: "Milestones", type: "navigate", route: "/me/milestones" },
    ],
  },
];

interface PiActionPathsProps {
  onPromptSelect: (prompt: string, displayPrompt?: string) => void;
  onClose?: () => void;
  userEntities?: UserEntities | null;
}

export function PiActionPaths({ onPromptSelect, onClose, userEntities }: PiActionPathsProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!openId) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openId]);

  const handleAction = (action: ActionItem) => {
    setOpenId(null);
    if (action.type === "navigate" && action.route) {
      navigate(action.route);
      onClose?.();
    } else if (action.type === "prompt" && action.prompt) {
      const displayPrompt = action.prompt;
      let enrichedPrompt = action.prompt;
      if (userEntities) {
        const parts: string[] = [];
        if (userEntities.quests?.length) {
          parts.push(`My active quests: ${userEntities.quests.map((q) => `"${q.title}" (id: ${q.id})`).join(", ")}`);
        }
        if (userEntities.guilds?.length) {
          parts.push(`My guilds: ${userEntities.guilds.map((g) => `"${g.name}" (id: ${g.id})`).join(", ")}`);
        }
        if (parts.length) enrichedPrompt += "\n\n" + parts.join("\n");
      }
      onPromptSelect(enrichedPrompt, displayPrompt);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Horizontal chip row */}
      <div className="flex flex-wrap gap-1.5 px-1">
        {ACTION_PATHS.map((path) => {
          const isActive = openId === path.id;
          return (
            <button
              key={path.id}
              onClick={() => setOpenId(isActive ? null : path.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all cursor-pointer",
                "hover:border-primary/40 hover:bg-primary/5",
                isActive
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground"
              )}
            >
              <span className="text-sm leading-none">{path.icon}</span>
              <span>{path.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dropdown menu */}
      {openId && (
        <div className="absolute bottom-full left-0 right-0 mb-2 z-50">
          <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-[300px]">
            <ScrollArea className="max-h-[300px]">
              <div className="py-1.5">
                {ACTION_PATHS.find((p) => p.id === openId)?.actions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAction(action)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-accent/50 transition-colors cursor-pointer text-left"
                  >
                    <span className="text-muted-foreground text-[10px] font-mono w-5 shrink-0">
                      {ACTION_PATHS.findIndex((p) => p.id === openId) + 1}.{idx + 1}
                    </span>
                    <span className="flex-1">{action.label}</span>
                    {action.type === "prompt" && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Pi</span>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}

export { ACTION_PATHS };
