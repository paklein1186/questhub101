import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { WebsiteItemSelector } from "./WebsiteItemSelector";

const SECTION_TYPES = [
  { value: "hero", label: "Hero" },
  { value: "text_block", label: "Text Block" },
  { value: "services_list", label: "Services List" },
  { value: "quests_list", label: "Quests List" },
  { value: "guilds_list", label: "Guilds List" },
  { value: "projects_list", label: "Projects List" },
  { value: "cta", label: "Call to Action" },
];

const LIST_TYPES = ["services_list", "quests_list", "guilds_list", "projects_list"];

interface Props {
  section: any;
  pageId: string;
  ownerType: string;
  ownerId: string;
}

export function WebsiteSectionEditor({ section, pageId, ownerType, ownerId }: Props) {
  const queryClient = useQueryClient();
  const [type, setType] = useState(section.type);
  const [title, setTitle] = useState(section.title || "");
  const [subtitle, setSubtitle] = useState(section.subtitle || "");
  const [bodyMarkdown, setBodyMarkdown] = useState(section.body_markdown || "");
  const [source, setSource] = useState(section.source || "manual");
  const [layout, setLayout] = useState(section.layout || "grid");
  const [selectedIds, setSelectedIds] = useState<string[]>(section.selected_ids || []);
  const [filters, setFilters] = useState<any>(section.filters || {});

  const isList = LIST_TYPES.includes(type);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("website_sections")
        .update({
          type,
          title: title || null,
          subtitle: subtitle || null,
          body_markdown: bodyMarkdown || null,
          source,
          layout,
          selected_ids: selectedIds,
          filters,
        })
        .eq("id", section.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-sections", pageId] });
      toast.success("Section saved");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const itemType = type === "services_list" ? "service"
    : type === "guilds_list" ? "guild"
    : "quest";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Section Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SECTION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Subtitle</Label>
          <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="h-8 text-sm" />
        </div>
      </div>

      {(type === "text_block" || type === "hero" || type === "cta") && (
        <div className="space-y-1">
          <Label className="text-xs">Body (Markdown)</Label>
          <Textarea value={bodyMarkdown} onChange={(e) => setBodyMarkdown(e.target.value)} rows={4} className="text-sm" />
        </div>
      )}

      {isList && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Selection</SelectItem>
                  <SelectItem value="auto">Auto (Filters)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Layout</Label>
              <Select value={layout} onValueChange={setLayout}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid">Grid</SelectItem>
                  <SelectItem value="list">List</SelectItem>
                  <SelectItem value="carousel">Carousel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {source === "manual" && (
            <WebsiteItemSelector
              itemType={itemType}
              ownerType={ownerType}
              ownerId={ownerId}
              selectedIds={selectedIds}
              onChange={setSelectedIds}
            />
          )}

          {source === "auto" && (
            <div className="space-y-2 p-3 bg-muted/50 rounded-md">
              <Label className="text-xs font-medium">Auto Filters</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Web Tags (comma-separated)</Label>
                  <Input
                    value={(filters.webTags || []).join(", ")}
                    onChange={(e) => setFilters((f: any) => ({
                      ...f,
                      webTags: e.target.value.split(",").map((t: string) => t.trim()).filter(Boolean),
                    }))}
                    className="h-8 text-sm"
                    placeholder="portfolio, flagship"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Limit</Label>
                  <Input
                    type="number"
                    value={filters.limit || ""}
                    onChange={(e) => setFilters((f: any) => ({ ...f, limit: e.target.value ? parseInt(e.target.value) : undefined }))}
                    className="h-8 text-sm"
                    placeholder="10"
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <Button variant="outline" size="sm" onClick={() => save.mutate()}>
        <Save className="h-3.5 w-3.5 mr-1" /> Save Section
      </Button>
    </div>
  );
}
