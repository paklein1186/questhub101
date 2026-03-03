import { usePiConversations } from "@/hooks/usePiConversations";
import { usePiPanel } from "@/hooks/usePiPanel";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { MessageSquare, Loader2 } from "lucide-react";

const MODEL_LABELS: Record<string, string> = {
  "gemini-flash": "Gemini Flash",
  "gemini-pro": "Gemini Pro",
  "gpt-5-mini": "GPT-5 Mini",
  "gpt-5": "GPT-5",
};

export function PiRecentConversations() {
  const { data: conversations, isLoading } = usePiConversations(5);
  const { setActiveConversation, setSelectedModel } = usePiPanel();
  const { t, i18n } = useTranslation();
  const dateFnsLocale = i18n.language === "fr" ? fr : enUS;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!conversations?.length) {
    return (
      <p className="text-xs text-muted-foreground italic px-3 py-3">
        {t("pi.noConversations")}
      </p>
    );
  }

  return (
    <div className="space-y-1 px-1">
      {conversations.map((c) => {
        const title = c.title || (c.messages?.[0] as any)?.text?.slice(0, 40) || "Conversation";
        return (
          <button
            key={c.id}
            onClick={() => {
              setActiveConversation(c.id);
              if (c.model_id) setSelectedModel(c.model_id);
            }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground line-clamp-1 flex-1">{title}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 ml-5.5">
              <span className="text-[11px] text-muted-foreground">
                {formatDistanceToNow(new Date(c.updated_at), { addSuffix: true, locale: dateFnsLocale })}
              </span>
              {c.model_id && (
                <span className="text-[10px] text-muted-foreground/70">
                  · {MODEL_LABELS[c.model_id] || c.model_id}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
