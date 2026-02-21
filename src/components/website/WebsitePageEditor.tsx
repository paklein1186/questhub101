import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";
import { WebsiteSectionEditor } from "./WebsiteSectionEditor";

const PAGE_TYPES = [
  { value: "home", label: "Home" },
  { value: "about", label: "About" },
  { value: "services", label: "Services" },
  { value: "projects", label: "Projects" },
  { value: "community", label: "Community" },
  { value: "program", label: "Program" },
  { value: "custom", label: "Custom" },
];

interface Props {
  page: any;
  websiteId: string;
  ownerType: string;
  ownerId: string;
}

export function WebsitePageEditor({ page, websiteId, ownerType, ownerId }: Props) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [pageType, setPageType] = useState(page.page_type);

  const { data: sections } = useQuery({
    queryKey: ["website-sections", page.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("website_sections")
        .select("*")
        .eq("page_id", page.id)
        .order("sort_order");
      return data || [];
    },
  });

  const updatePage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("website_pages")
        .update({ title, slug, page_type: pageType })
        .eq("id", page.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-pages", websiteId] });
      toast.success("Page updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addSection = useMutation({
    mutationFn: async () => {
      const count = (sections || []).length;
      const { error } = await supabase.from("website_sections").insert({
        page_id: page.id,
        type: "text_block",
        source: "manual",
        sort_order: count,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-sections", page.id] });
      toast.success("Section added");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteSection = useMutation({
    mutationFn: async (sectionId: string) => {
      const { error } = await supabase.from("website_sections").delete().eq("id", sectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-sections", page.id] });
      toast.success("Section removed");
    },
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Page Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Slug</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Type</Label>
          <Select value={pageType} onValueChange={setPageType}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={() => updatePage.mutate()}>
        <Save className="h-3.5 w-3.5 mr-1" /> Save Page
      </Button>

      <div className="border-t border-border pt-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium">Sections</h4>
          <Button variant="outline" size="sm" onClick={() => addSection.mutate()}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Section
          </Button>
        </div>

        {(!sections || sections.length === 0) && (
          <p className="text-xs text-muted-foreground">No sections yet.</p>
        )}

        <div className="space-y-3">
          {(sections || []).map((s: any, i: number) => (
            <Card key={s.id} className="border-dashed">
              <CardContent className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Section #{i + 1}</span>
                  <Button variant="ghost" size="sm" className="h-6 text-destructive" onClick={() => deleteSection.mutate(s.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <WebsiteSectionEditor section={s} pageId={page.id} ownerType={ownerType} ownerId={ownerId} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
