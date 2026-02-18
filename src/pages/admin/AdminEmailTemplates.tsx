import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Mail, Save, Eye, EyeOff, Palette, Link2, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────
interface EmailTemplate {
  id: string;
  key: string;
  label: string;
  description: string | null;
  subject: string;
  body_html: string;
  cta_label: string | null;
  cta_url: string | null;
  updated_at: string;
}

// ─── Design tokens — mirrors the actual platform email style ──
// These match the values used in send-notification-email edge function
// and the platform's HSL design system (--primary: 262 83% 58%)
const DEFAULT_DESIGN = {
  primaryColor: "hsl(262, 83%, 58%)",
  primaryDark: "hsl(262, 83%, 48%)",
  accentColor: "hsl(330, 70%, 56%)",
  backgroundColor: "#ffffff",
  wrapperBackground: "hsl(250, 30%, 98%)",
  textColor: "hsl(250, 30%, 8%)",
  mutedColor: "hsl(250, 12%, 46%)",
  borderColor: "hsl(250, 18%, 90%)",
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  brandName: "changethegame",
  preferencesUrl: "https://questhub101.lovable.app/settings?tab=notifications",
  footerText: "You're receiving this because email notifications are enabled.",
};

function buildPreviewHtml(template: EmailTemplate, design: typeof DEFAULT_DESIGN) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${design.wrapperBackground};font-family:${design.fontFamily};">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">

    <!-- Header bar -->
    <div style="background:${design.primaryColor};border-radius:12px 12px 0 0;padding:20px 28px;display:flex;align-items:center;gap:12px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.85);">${design.brandName}</div>
    </div>

    <!-- Card body -->
    <div style="background:${design.backgroundColor};border:1px solid ${design.borderColor};border-top:none;border-radius:0 0 12px 12px;padding:32px 28px;">
      ${template.body_html}

      ${template.cta_label && template.cta_url ? `
      <div style="margin-top:28px;">
        <a href="${template.cta_url}"
           style="display:inline-block;background:${design.primaryColor};color:#ffffff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;letter-spacing:0.2px;">
          ${template.cta_label}
        </a>
      </div>` : ""}

      <!-- Divider -->
      <hr style="border:none;border-top:1px solid ${design.borderColor};margin:32px 0 20px;" />

      <!-- Footer -->
      <p style="font-size:12px;color:${design.mutedColor};line-height:1.6;margin:0;">
        ${design.footerText}
        <a href="${design.preferencesUrl}" style="color:${design.primaryColor};text-decoration:underline;">Manage preferences</a>
      </p>
    </div>

    <!-- Bottom space -->
    <p style="text-align:center;font-size:11px;color:${design.mutedColor};margin-top:16px;">
      © 2025 changethegame · <a href="https://questhub101.lovable.app" style="color:${design.mutedColor};">changethegame.xyz</a>
    </p>
  </div>
</body>
</html>`;
}

// ─── Design Sidebar ───────────────────────────────────────────
function DesignPanel({ design, onChange }: { design: typeof DEFAULT_DESIGN; onChange: (d: typeof DEFAULT_DESIGN) => void }) {
  const field = (label: string, key: keyof typeof DEFAULT_DESIGN) => (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input
        value={design[key]}
        onChange={(e) => onChange({ ...design, [key]: e.target.value })}
        className="h-8 text-xs font-mono"
      />
    </div>
  );

  return (
    <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        <Palette className="h-3.5 w-3.5" /> Design Tokens
      </p>
      {field("Primary Color (header + CTA)", "primaryColor")}
      {field("Accent Color", "accentColor")}
      {field("Card Background", "backgroundColor")}
      {field("Page Background", "wrapperBackground")}
      {field("Text Color", "textColor")}
      {field("Muted Color", "mutedColor")}
      {field("Border Color", "borderColor")}
      {field("Font Family", "fontFamily")}
      {field("Brand Name", "brandName")}
      {field("Preferences URL", "preferencesUrl")}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Footer Text</label>
        <Textarea
          value={design.footerText}
          onChange={(e) => onChange({ ...design, footerText: e.target.value })}
          className="text-xs font-mono min-h-[60px] resize-none"
        />
      </div>
    </div>
  );
}

// ─── Template Editor ─────────────────────────────────────────
function TemplateEditor({
  template,
  design,
  onSaved,
}: {
  template: EmailTemplate;
  design: typeof DEFAULT_DESIGN;
  onSaved: () => void;
}) {
  const currentUser = useCurrentUser();
  const qc = useQueryClient();
  const [subject, setSubject] = useState(template.subject);
  const [bodyHtml, setBodyHtml] = useState(template.body_html);
  const [ctaLabel, setCtaLabel] = useState(template.cta_label ?? "");
  const [ctaUrl, setCtaUrl] = useState(template.cta_url ?? "");
  const [showPreview, setShowPreview] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("email_templates" as any)
        .update({
          subject,
          body_html: bodyHtml,
          cta_label: ctaLabel || null,
          cta_url: ctaUrl || null,
          updated_at: new Date().toISOString(),
          updated_by_user_id: currentUser.id,
        })
        .eq("id", template.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template saved!");
      qc.invalidateQueries({ queryKey: ["admin-email-templates"] });
      onSaved();
    },
    onError: () => toast.error("Failed to save template"),
  });

  const previewTemplate: EmailTemplate = {
    ...template,
    subject,
    body_html: bodyHtml,
    cta_label: ctaLabel || null,
    cta_url: ctaUrl || null,
  };

  const variables = (template.body_html + template.subject).match(/\{\{[^}]+\}\}/g);
  const uniqueVars = [...new Set(variables ?? [])];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base">{template.label}</h3>
          {template.description && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Info className="h-3 w-3" /> {template.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
            {showPreview ? "Edit" : "Preview"}
          </Button>
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Save
          </Button>
        </div>
      </div>

      {/* Variables hint */}
      {uniqueVars.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-muted-foreground">Variables:</span>
          {uniqueVars.map((v) => (
            <Badge key={v} variant="secondary" className="text-xs font-mono">{v}</Badge>
          ))}
        </div>
      )}

      {showPreview ? (
        /* Live HTML preview — rendered as full email */
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground border-b border-border flex items-center gap-2">
            <span className="font-medium text-foreground">Subject:</span> {subject}
          </div>
          <div className="bg-muted/20">
            <iframe
              srcDoc={buildPreviewHtml(previewTemplate, design)}
              className="w-full border-0"
              style={{ height: "520px" }}
              title="Email preview"
              sandbox="allow-same-origin"
            />
          </div>
        </div>

      ) : (
        /* Edit fields */
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Subject line</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject…" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Body HTML</label>
            <p className="text-xs text-muted-foreground">
              Write HTML directly. Use <code className="bg-muted px-1 rounded text-[10px]">{"{{variable}}"}</code> for dynamic values.
            </p>
            <Textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              className="font-mono text-xs min-h-[240px] resize-y"
              placeholder="<p>Your email body...</p>"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1">
                <Link2 className="h-3 w-3" /> CTA Button Label
              </label>
              <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="e.g. Get started" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">CTA Button URL</label>
              <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://changethegame.xyz/…" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function AdminEmailTemplates() {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [design, setDesign] = useState(DEFAULT_DESIGN);
  const [showDesign, setShowDesign] = useState(false);

  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["admin-email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates" as any)
        .select("*")
        .order("label");
      if (error) throw error;
      return (data as unknown as EmailTemplate[]) ?? [];
    },
  });

  const selected = templates.find((t) => t.key === selectedKey) ?? templates[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" /> Email Templates
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Edit the content, CTA links, and design of all platform emails.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowDesign(!showDesign)}>
          <Palette className="h-3.5 w-3.5 mr-1" />
          {showDesign ? "Hide" : "Design"} Settings
        </Button>
      </div>

      {/* Design tokens panel (collapsible) */}
      {showDesign && (
        <DesignPanel design={design} onChange={setDesign} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        {/* Template list sidebar */}
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold px-2 mb-2">
            Templates
          </p>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            templates.map((t) => (
              <button
                key={t.key}
                onClick={() => setSelectedKey(t.key)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                  (selectedKey ?? templates[0]?.key) === t.key
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="block font-medium truncate">{t.label}</span>
                <span className="block text-[10px] opacity-70 truncate mt-0.5">{t.key}</span>
              </button>
            ))
          )}
        </div>

        {/* Editor area */}
        <div className="rounded-xl border border-border bg-card p-5">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : selected ? (
            <TemplateEditor
              key={selected.id}
              template={selected}
              design={design}
              onSaved={() => {}}
            />
          ) : (
            <p className="text-muted-foreground text-sm py-8 text-center">Select a template to edit.</p>
          )}
        </div>
      </div>
    </div>
  );
}
