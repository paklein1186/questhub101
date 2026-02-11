import { useState } from "react";
import { Search, Send, Shield, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCreatePartnership } from "@/hooks/usePartnerships";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromEntityType: "GUILD" | "COMPANY";
  fromEntityId: string;
}

export function ProposePartnershipDialog({ open, onOpenChange, fromEntityType, fromEntityId }: Props) {
  const [tab, setTab] = useState<"GUILD" | "COMPANY">("GUILD");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const createPartnership = useCreatePartnership();
  const { toast } = useToast();

  // Search guilds
  const { data: guilds } = useQuery({
    queryKey: ["search-guilds-partnership", search],
    queryFn: async () => {
      let q = supabase.from("guilds").select("id, name, logo_url").eq("is_deleted", false).limit(20);
      if (search.trim()) q = q.ilike("name", `%${search.trim()}%`);
      const { data } = await q;
      return (data ?? []).filter(g => !(fromEntityType === "GUILD" && g.id === fromEntityId));
    },
    enabled: open && tab === "GUILD",
  });

  // Search companies
  const { data: companies } = useQuery({
    queryKey: ["search-companies-partnership", search],
    queryFn: async () => {
      let q = supabase.from("companies").select("id, name, logo_url").eq("is_deleted", false).limit(20);
      if (search.trim()) q = q.ilike("name", `%${search.trim()}%`);
      const { data } = await q;
      return (data ?? []).filter(c => !(fromEntityType === "COMPANY" && c.id === fromEntityId));
    },
    enabled: open && tab === "COMPANY",
  });

  const entities = tab === "GUILD" ? guilds : companies;
  const selectedEntity = (entities ?? []).find(e => e.id === selectedId);

  const handleSubmit = async () => {
    if (!selectedId) return;
    try {
      await createPartnership.mutateAsync({
        fromEntityType,
        fromEntityId,
        toEntityType: tab,
        toEntityId: selectedId,
        notes: notes.trim() || undefined,
      });
      toast({ title: `Partnership request sent to ${selectedEntity?.name ?? "partner"}!` });
      onOpenChange(false);
      setSelectedId(null);
      setNotes("");
      setSearch("");
    } catch (err: any) {
      const isDuplicate = err?.message?.includes("duplicate") || err?.code === "23505";
      toast({
        title: isDuplicate
          ? "You already have a pending or active partnership with this entity."
          : "Failed to send request",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Propose a partnership</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={v => { setTab(v as any); setSelectedId(null); setSearch(""); }}>
          <TabsList className="w-full">
            <TabsTrigger value="GUILD" className="flex-1 gap-1"><Shield className="h-3.5 w-3.5" /> Guild</TabsTrigger>
            <TabsTrigger value="COMPANY" className="flex-1 gap-1"><Building2 className="h-3.5 w-3.5" /> Trad. Organization</TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={tab === "GUILD" ? "Search guilds…" : "Search organizations…"}
                className="pl-9"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-1">
              {(entities ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No results</p>
              )}
              {(entities ?? []).map(e => (
                <button
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  className={`w-full flex items-center gap-2 rounded-md p-2 text-left text-sm transition-colors ${
                    selectedId === e.id ? "bg-primary/10 border border-primary/30" : "hover:bg-muted"
                  }`}
                >
                  <Avatar className="h-7 w-7 rounded-md">
                    <AvatarImage src={e.logo_url ?? undefined} />
                    <AvatarFallback className="rounded-md text-xs">{e.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">{e.name}</span>
                </button>
              ))}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Message (optional)</label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Why do you want to partner?"
                maxLength={500}
                className="resize-none"
                rows={3}
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!selectedId || createPartnership.isPending}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-1" />
              {createPartnership.isPending ? "Sending…" : `Send request to ${selectedEntity?.name ?? "…"}`}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
