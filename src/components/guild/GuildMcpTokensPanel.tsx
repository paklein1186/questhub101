import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Plug, Trash2, KeyRound, Loader2 } from "lucide-react";

type TokenRecord = {
  id: string;
  name: string;
  token_prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

type Props = { guildId: string; guildName?: string };

export function GuildMcpTokensPanel({ guildId, guildName }: Props) {
  const { toast } = useToast();
  const [tokens, setTokens] = useState<TokenRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [revealed, setRevealed] = useState<{ name: string; token: string } | null>(null);

  const mcpUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp`;

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke(
      `guild-mcp-tokens?guild_id=${guildId}`,
      { method: "GET" },
    );
    if (error) toast({ title: "Failed to load tokens", description: error.message, variant: "destructive" });
    setTokens((data as any)?.tokens ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [guildId]);

  const createToken = async () => {
    if (!name.trim()) return;
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("guild-mcp-tokens", {
      method: "POST",
      body: { guild_id: guildId, name: name.trim() },
    });
    setCreating(false);
    if (error || (data as any)?.error) {
      toast({ title: "Failed to create token", description: error?.message ?? (data as any)?.error, variant: "destructive" });
      return;
    }
    setRevealed({ name: name.trim(), token: (data as any).token });
    setName("");
    load();
  };

  const revoke = async (id: string) => {
    if (!confirm("Revoke this token? Connected agents will lose access immediately.")) return;
    const { error } = await supabase.functions.invoke(`guild-mcp-tokens?id=${id}`, { method: "DELETE" });
    if (error) {
      toast({ title: "Failed to revoke", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Token revoked" });
    load();
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Plug className="h-5 w-5" /> MCP Agents
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Generate an API key so an external AI agent (Claude Desktop, ChatGPT, Cursor, n8n, …)
          can read and act on this guild via the Model Context Protocol.
        </p>
      </div>

      <Card className="p-4 space-y-3">
        <div className="text-sm font-medium flex items-center gap-2">
          <KeyRound className="h-4 w-4" /> Endpoint
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-muted px-2 py-1.5 rounded font-mono break-all">{mcpUrl}</code>
          <Button size="sm" variant="ghost" onClick={() => copy(mcpUrl)}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Authenticate with header <code>Authorization: Bearer ctg_…</code> (your token).
          Tools available: <code>list_quests</code>, <code>list_members</code>, <code>list_discussions</code>,
          <code> create_post</code>, <code>log_contribution</code>.
        </p>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="text-sm font-medium">Create a new token</div>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`e.g. "${guildName ?? "My guild"}" — Claude Desktop`}
          />
          <Button onClick={createToken} disabled={creating || !name.trim()}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
          </Button>
        </div>
        {revealed && (
          <div className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 space-y-2">
            <p className="text-sm font-medium">Copy this token now — it will not be shown again.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-background px-2 py-1.5 rounded font-mono break-all">
                {revealed.token}
              </code>
              <Button size="sm" variant="outline" onClick={() => copy(revealed.token)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setRevealed(null)}>I've saved it</Button>
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <div className="text-sm font-medium">Active tokens</div>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tokens yet.</p>
        ) : (
          <ul className="divide-y">
            {tokens.map((t) => (
              <li key={t.id} className="py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{t.name}</div>
                  <div className="text-xs text-muted-foreground">
                    <code>{t.token_prefix}…</code> · created {new Date(t.created_at).toLocaleDateString()}
                    {t.last_used_at && ` · last used ${new Date(t.last_used_at).toLocaleDateString()}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {t.revoked_at ? (
                    <Badge variant="outline">Revoked</Badge>
                  ) : (
                    <>
                      {t.scopes.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                      <Button size="sm" variant="ghost" onClick={() => revoke(t.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
