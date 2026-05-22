import { useEffect } from "react";
import { Bot, Sparkles, Users, ListChecks, MessageCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePiPanel } from "@/hooks/usePiPanel";

interface PiQuestChatLauncherProps {
  questId: string;
  questName: string;
}

const PROMPTS: { icon: any; label: string; prompt: (n: string) => string }[] = [
  { icon: Sparkles, label: "Résumer cette quête", prompt: (n) => `Résume la quête "${n}" : objectif, état, prochaines étapes.` },
  { icon: Users, label: "Qui contribue ?", prompt: (n) => `Qui sont les membres et hôtes actifs de la quête "${n}" ? Donne leurs rôles.` },
  { icon: ListChecks, label: "Tâches restantes", prompt: (n) => `Liste les sous-tâches restantes de la quête "${n}" et propose la prochaine action.` },
  { icon: MessageCircle, label: "Discussions récentes", prompt: (n) => `Résume les discussions récentes sur la quête "${n}".` },
  { icon: FileText, label: "Fichiers partagés", prompt: (n) => `Liste les fichiers et liens partagés dans la quête "${n}".` },
];

export function PiQuestChatLauncher({ questId, questName }: PiQuestChatLauncherProps) {
  const { openPiPanel, setContext, setPrefillPrompt, isOpen } = usePiPanel();

  // Keep Pi context in sync with this quest while the tab is mounted
  useEffect(() => {
    setContext("quest", questId);
  }, [questId, setContext]);

  const launch = (promptText?: string) => {
    setContext("quest", questId);
    if (promptText) setPrefillPrompt(promptText);
    if (!isOpen) openPiPanel("quest", questId);
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 bg-gradient-to-br from-primary/10 via-card to-card border-primary/30">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg">Discuter avec Pi sur cette quête</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Pi a accès aux membres, sous-tâches, discussions et fichiers de
              <span className="font-medium text-foreground"> « {questName} »</span>.
              Pose-lui une question ou choisis une action ci-dessous.
            </p>
            <Button className="mt-3" onClick={() => launch()}>
              <Sparkles className="h-4 w-4 mr-2" /> Ouvrir Pi
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {PROMPTS.map(({ icon: Icon, label, prompt }) => (
          <button
            key={label}
            onClick={() => launch(prompt(questName))}
            className="text-left p-4 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">{label}</span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {prompt(questName)}
            </p>
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        L'ancien chat de quête est remplacé par Pi pour un historique unifié et des réponses contextuelles plus riches.
      </p>
    </div>
  );
}
