import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePiPanel } from "@/hooks/usePiPanel";

const AI_MODELS = [
  { id: "gemini-flash", label: "Gemini Flash", provider: "Google", icon: "🔵" },
  { id: "gemini-pro", label: "Gemini Pro", provider: "Google", icon: "🔵" },
  { id: "gpt-5-mini", label: "GPT-5 Mini", provider: "OpenAI", icon: "🟢" },
  { id: "gpt-5", label: "GPT-5", provider: "OpenAI", icon: "🟢" },
];

// Map display IDs to actual Lovable AI model identifiers
export const MODEL_MAP: Record<string, string> = {
  "gemini-flash": "google/gemini-3-flash-preview",
  "gemini-pro": "google/gemini-2.5-pro",
  "gpt-5-mini": "openai/gpt-5-mini",
  "gpt-5": "openai/gpt-5",
};

export function PiModelSelector() {
  const { selectedModel, setSelectedModel } = usePiPanel();

  return (
    <Select value={selectedModel} onValueChange={setSelectedModel}>
      <SelectTrigger className="h-7 w-[140px] text-xs border-border/50 bg-transparent">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {AI_MODELS.map((m) => (
          <SelectItem key={m.id} value={m.id} className="text-xs">
            <span className="mr-1">{m.icon}</span> {m.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
