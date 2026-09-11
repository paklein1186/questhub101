import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
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

function getActionPaths(t: TFunction): ActionPath[] {
  return [
    {
      id: "contribute",
      icon: "🎯",
      label: t("piActions.contribute.label"),
      actions: [
        { label: t("piActions.contribute.browseQuests"), type: "navigate", route: "/explore?tab=quests" },
        { label: t("piActions.contribute.aiMatchmaker"), type: "prompt", prompt: t("piActions.contribute.aiMatchmakerPrompt") },
        { label: t("piActions.contribute.myActiveTasks"), type: "navigate", route: "/work" },
        { label: t("piActions.contribute.submitProposal"), type: "prompt", prompt: t("piActions.contribute.submitProposalPrompt") },
        { label: t("piActions.contribute.browseJobs"), type: "navigate", route: "/jobs" },
        { label: t("piActions.contribute.postUpdate"), type: "prompt", prompt: t("piActions.contribute.postUpdatePrompt") },
      ],
    },
    {
      id: "explore",
      icon: "🌍",
      label: t("piActions.explore.label"),
      actions: [
        { label: t("piActions.explore.discoverGuilds"), type: "navigate", route: "/explore?tab=entities" },
        { label: t("piActions.explore.myTerritory"), type: "navigate", route: "/territories" },
        { label: t("piActions.explore.meetPeople"), type: "navigate", route: "/explore/users" },
        { label: t("piActions.explore.eventsRituals"), type: "prompt", prompt: t("piActions.explore.eventsRitualsPrompt") },
        { label: t("piActions.explore.coursesLearning"), type: "navigate", route: "/explore?tab=courses" },
        { label: t("piActions.explore.globalSearch"), type: "navigate", route: "/search" },
      ],
    },
    {
      id: "network",
      icon: "🤝",
      label: t("piActions.network.label"),
      actions: [
        { label: t("piActions.network.myGuilds"), type: "navigate", route: "/me/guilds" },
        { label: t("piActions.network.directMessage"), type: "navigate", route: "/inbox" },
        { label: t("piActions.network.trustGraph"), type: "navigate", route: "/network" },
        { label: t("piActions.network.myFollows"), type: "navigate", route: "/me/following" },
        { label: t("piActions.network.proposePartnership"), type: "prompt", prompt: t("piActions.network.proposePartnershipPrompt") },
      ],
    },
    {
      id: "create",
      icon: "🛠",
      label: t("piActions.create.label"),
      actions: [
        { label: t("piActions.create.launchQuest"), type: "navigate", route: "/quests/new" },
        { label: t("piActions.create.publishService"), type: "navigate", route: "/services/new" },
        { label: t("piActions.create.organizeEvent"), type: "prompt", prompt: t("piActions.create.organizeEventPrompt") },
        { label: t("piActions.create.createGuild"), type: "navigate", route: "/explore?tab=entities&create=guild" },
        { label: t("piActions.create.getQuestFunded"), type: "prompt", prompt: t("piActions.create.getQuestFundedPrompt") },
        { label: t("piActions.create.myWallet"), type: "navigate", route: "/settings/wallet" },
      ],
    },
    {
      id: "impact",
      icon: "📊",
      label: t("piActions.impact.label"),
      actions: [
        { label: t("piActions.impact.myContributions"), type: "navigate", route: "/me?tab=contributions" },
        { label: t("piActions.impact.valuePieRewards"), type: "navigate", route: "/work?tab=quests" },
        { label: t("piActions.impact.territoryIndicators"), type: "prompt", prompt: t("piActions.impact.territoryIndicatorsPrompt") },
        { label: t("piActions.impact.xpLevel"), type: "navigate", route: "/me/xp" },
        { label: t("piActions.impact.milestones"), type: "navigate", route: "/me/milestones" },
      ],
    },
  ];
}

interface PiActionPathsProps {
  onPromptSelect: (prompt: string, displayPrompt?: string) => void;
  onClose?: () => void;
  userEntities?: UserEntities | null;
}

export function PiActionPaths({ onPromptSelect, onClose, userEntities }: PiActionPathsProps) {
  const { t } = useTranslation();
  const ACTION_PATHS = getActionPaths(t);
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

export { getActionPaths };
