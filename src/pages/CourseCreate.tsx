import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Save, Plus, Trash2, GripVertical, GraduationCap,
  Eye, EyeOff, Video, BookOpen, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageShell } from "@/components/PageShell";
import { ImageUpload } from "@/components/ImageUpload";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { CourseLevel } from "@/types/enums";
import type { Course, Lesson } from "@/types";
import { GuildMemberRole } from "@/types/enums";
import {
  getCourseById, courses, lessons, topics, territories,
  courseTopics, courseTerritories, getLessonsForCourse,
  guilds, guildMembers, companies,
} from "@/data/mock";

export default function CourseCreate() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const existingCourse = id ? getCourseById(id) : null;
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Course fields
  const [title, setTitle] = useState(existingCourse?.title ?? "");
  const [subtitle, setSubtitle] = useState(existingCourse?.subtitle ?? "");
  const [description, setDescription] = useState(existingCourse?.description ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(existingCourse?.coverImageUrl);
  const [isFree, setIsFree] = useState(existingCourse?.isFree ?? true);
  const [priceAmount, setPriceAmount] = useState(String(existingCourse?.priceAmount ?? ""));
  const [priceCurrency] = useState(existingCourse?.priceCurrency ?? "EUR");
  const [level, setLevel] = useState<string>(existingCourse?.level ?? "");
  const [duration, setDuration] = useState(String(existingCourse?.estimatedDurationMinutes ?? ""));
  const [providerType, setProviderType] = useState<"self" | "guild" | "company">(
    existingCourse?.providerGuildId ? "guild" : existingCourse?.providerCompanyId ? "company" : "self"
  );
  const [providerGuildId, setProviderGuildId] = useState(existingCourse?.providerGuildId ?? "");
  const [providerCompanyId, setProviderCompanyId] = useState(existingCourse?.providerCompanyId ?? "");

  const existingTopicIds = isEdit ? courseTopics.filter((ct) => ct.courseId === id).map((ct) => ct.topicId) : [];
  const existingTerritoryIds = isEdit ? courseTerritories.filter((ct) => ct.courseId === id).map((ct) => ct.territoryId) : [];
  const [selectedTopics, setSelectedTopics] = useState<string[]>(existingTopicIds);
  const [selectedTerritories, setSelectedTerritories] = useState<string[]>(existingTerritoryIds);

  // Lessons state (edit mode)
  const [courseLessons, setCourseLessons] = useState<Lesson[]>(() =>
    isEdit ? getLessonsForCourse(id!) : []
  );
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lesTitle, setLesTitle] = useState("");
  const [lesSummary, setLesSummary] = useState("");
  const [lesContent, setLesContent] = useState("");
  const [lesVideoUrl, setLesVideoUrl] = useState("");
  const [lesIsPreview, setLesIsPreview] = useState(false);

  // Admin guilds/companies for provider selection
  const adminGuilds = guilds.filter((g) =>
    guildMembers.some((gm) => gm.guildId === g.id && gm.userId === currentUser.id && gm.role === GuildMemberRole.ADMIN)
  );
  const adminCompanies = companies.filter((c) => c.contactUserId === currentUser.id);

  const toggleTopic = (id: string) => setSelectedTopics((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const toggleTerritory = (id: string) => setSelectedTerritories((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const handleSave = () => {
    if (!title.trim()) return;
    const now = new Date().toISOString();

    if (isEdit && existingCourse) {
      // Update in-place
      const target = courses.find((c) => c.id === existingCourse.id);
      if (target) {
        target.title = title.trim();
        target.subtitle = subtitle.trim() || undefined;
        target.description = description.trim() || undefined;
        target.coverImageUrl = coverImageUrl;
        target.isFree = isFree;
        target.priceAmount = isFree ? undefined : (Number(priceAmount) || undefined);
        target.priceCurrency = priceCurrency;
        target.level = level ? (level as CourseLevel) : undefined;
        target.estimatedDurationMinutes = Number(duration) || undefined;
        target.providerGuildId = providerType === "guild" ? providerGuildId || undefined : undefined;
        target.providerCompanyId = providerType === "company" ? providerCompanyId || undefined : undefined;
        target.updatedAt = now;
      }
    } else {
      const newCourse: Course = {
        id: `crs-${Date.now()}`,
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        description: description.trim() || undefined,
        coverImageUrl,
        creatorUserId: currentUser.id,
        providerGuildId: providerType === "guild" ? providerGuildId || undefined : undefined,
        providerCompanyId: providerType === "company" ? providerCompanyId || undefined : undefined,
        isPublished: false,
        isFree,
        priceAmount: isFree ? undefined : (Number(priceAmount) || undefined),
        priceCurrency,
        estimatedDurationMinutes: Number(duration) || undefined,
        level: level ? (level as CourseLevel) : undefined,
        createdAt: now,
        updatedAt: now,
      };
      courses.push(newCourse);
      // Update topics/territories
      selectedTopics.forEach((topicId, i) => courseTopics.push({ id: `crst-${Date.now()}-${i}`, courseId: newCourse.id, topicId }));
      selectedTerritories.forEach((territoryId, i) => courseTerritories.push({ id: `crtr-${Date.now()}-${i}`, courseId: newCourse.id, territoryId }));
      toast({ title: "Course created!" });
      navigate(`/courses/${newCourse.id}/edit`);
      return;
    }

    // Update topic/territory relations for edit
    const courseId = existingCourse!.id;
    const existingCT = courseTopics.filter((ct) => ct.courseId === courseId);
    existingCT.forEach((ct) => { const i = courseTopics.indexOf(ct); if (i !== -1) courseTopics.splice(i, 1); });
    selectedTopics.forEach((topicId, i) => courseTopics.push({ id: `crst-${Date.now()}-${i}`, courseId, topicId }));
    const existingCTR = courseTerritories.filter((ct) => ct.courseId === courseId);
    existingCTR.forEach((ct) => { const i = courseTerritories.indexOf(ct); if (i !== -1) courseTerritories.splice(i, 1); });
    selectedTerritories.forEach((territoryId, i) => courseTerritories.push({ id: `crtr-${Date.now()}-${i}`, courseId, territoryId }));

    toast({ title: "Course updated!" });
  };

  const handlePublish = () => {
    if (!existingCourse) return;
    if (courseLessons.length === 0) { toast({ title: "Add at least one lesson before publishing", variant: "destructive" }); return; }
    if (!title.trim() || !description.trim()) { toast({ title: "Title and description are required", variant: "destructive" }); return; }
    const target = courses.find((c) => c.id === existingCourse.id);
    if (target) {
      target.isPublished = !target.isPublished;
      toast({ title: target.isPublished ? "Course published!" : "Course unpublished" });
    }
  };

  const openLessonDialog = (lesson?: Lesson) => {
    if (lesson) {
      setEditingLesson(lesson);
      setLesTitle(lesson.title);
      setLesSummary(lesson.summary ?? "");
      setLesContent(lesson.content);
      setLesVideoUrl(lesson.videoUrl ?? "");
      setLesIsPreview(lesson.isPreview);
    } else {
      setEditingLesson(null);
      setLesTitle(""); setLesSummary(""); setLesContent(""); setLesVideoUrl(""); setLesIsPreview(false);
    }
    setLessonDialogOpen(true);
  };

  const saveLesson = () => {
    if (!lesTitle.trim() || !existingCourse) return;
    const now = new Date().toISOString();
    if (editingLesson) {
      const target = lessons.find((l) => l.id === editingLesson.id);
      if (target) {
        target.title = lesTitle.trim();
        target.summary = lesSummary.trim() || undefined;
        target.content = lesContent;
        target.videoUrl = lesVideoUrl.trim() || undefined;
        target.isPreview = lesIsPreview;
        target.updatedAt = now;
      }
      setCourseLessons(getLessonsForCourse(existingCourse.id));
    } else {
      const newLesson: Lesson = {
        id: `les-${Date.now()}`,
        courseId: existingCourse.id,
        title: lesTitle.trim(),
        summary: lesSummary.trim() || undefined,
        content: lesContent,
        orderIndex: courseLessons.length,
        videoUrl: lesVideoUrl.trim() || undefined,
        isPreview: lesIsPreview,
        createdAt: now,
        updatedAt: now,
      };
      lessons.push(newLesson);
      setCourseLessons((prev) => [...prev, newLesson]);
    }
    setLessonDialogOpen(false);
    toast({ title: editingLesson ? "Lesson updated!" : "Lesson added!" });
  };

  const deleteLesson = (lessonId: string) => {
    const idx = lessons.findIndex((l) => l.id === lessonId);
    if (idx !== -1) lessons.splice(idx, 1);
    setCourseLessons((prev) => prev.filter((l) => l.id !== lessonId));
    toast({ title: "Lesson removed" });
  };

  const moveLesson = (index: number, direction: "up" | "down") => {
    const newLessons = [...courseLessons];
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newLessons.length) return;
    [newLessons[index], newLessons[swapIdx]] = [newLessons[swapIdx], newLessons[index]];
    newLessons.forEach((l, i) => {
      l.orderIndex = i;
      const target = lessons.find((ml) => ml.id === l.id);
      if (target) target.orderIndex = i;
    });
    setCourseLessons(newLessons);
  };

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to={isEdit ? `/courses/${id}` : "/work"}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
      </Button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" /> {isEdit ? "Edit Course" : "Create Course"}
          </h1>
          {isEdit && existingCourse && (
            <Button variant={existingCourse.isPublished ? "outline" : "default"} onClick={handlePublish}>
              {existingCourse.isPublished ? "Unpublish" : "Publish course"}
            </Button>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left: Course details */}
          <div className="space-y-5">
            <div><label className="text-sm font-medium mb-1 block">Title *</label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Course title" maxLength={120} /></div>
            <div><label className="text-sm font-medium mb-1 block">Subtitle</label><Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Short subtitle" maxLength={200} /></div>
            <ImageUpload label="Cover Image" currentImageUrl={coverImageUrl} onChange={setCoverImageUrl} aspectRatio="16/9" description="Wide cover, recommended 1200×600" />
            <div><label className="text-sm font-medium mb-1 block">Description *</label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Course description (supports markdown)" className="resize-none min-h-[150px]" /></div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Free course</label>
              <Switch checked={isFree} onCheckedChange={setIsFree} />
            </div>
            {!isFree && (
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium mb-1 block">Price (€)</label><Input type="number" value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)} min={0} step={0.01} /></div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium mb-1 block">Level</label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CourseLevel.BEGINNER}>Beginner</SelectItem>
                    <SelectItem value={CourseLevel.INTERMEDIATE}>Intermediate</SelectItem>
                    <SelectItem value={CourseLevel.ADVANCED}>Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><label className="text-sm font-medium mb-1 block">Duration (min)</label><Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min={0} /></div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Provider</label>
              <Select value={providerType} onValueChange={(v) => setProviderType(v as "self" | "guild" | "company")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">As myself</SelectItem>
                  {adminGuilds.length > 0 && <SelectItem value="guild">Under a Guild</SelectItem>}
                  {adminCompanies.length > 0 && <SelectItem value="company">Under a Company</SelectItem>}
                </SelectContent>
              </Select>
              {providerType === "guild" && (
                <Select value={providerGuildId} onValueChange={setProviderGuildId}>
                  <SelectTrigger className="mt-2"><SelectValue placeholder="Select guild" /></SelectTrigger>
                  <SelectContent>{adminGuilds.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
              {providerType === "company" && (
                <Select value={providerCompanyId} onValueChange={setProviderCompanyId}>
                  <SelectTrigger className="mt-2"><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>{adminCompanies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>

            <Separator />

            <div>
              <label className="text-sm font-medium mb-2 block">Topics</label>
              <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border bg-card max-h-40 overflow-y-auto">
                {topics.map((t) => (
                  <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={selectedTopics.includes(t.id)} onCheckedChange={() => toggleTopic(t.id)} />
                    <span className="text-sm">{t.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Territories</label>
              <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border bg-card">
                {territories.map((t) => (
                  <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={selectedTerritories.includes(t.id)} onCheckedChange={() => toggleTerritory(t.id)} />
                    <span className="text-sm">{t.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button onClick={handleSave} disabled={!title.trim()} className="w-full"><Save className="h-4 w-4 mr-2" /> Save course</Button>
          </div>

          {/* Right: Lessons management (edit mode only) */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2"><BookOpen className="h-5 w-5" /> Lessons ({courseLessons.length})</h2>
              {isEdit && (
                <Button size="sm" onClick={() => openLessonDialog()}><Plus className="h-4 w-4 mr-1" /> Add lesson</Button>
              )}
            </div>
            {!isEdit && <p className="text-sm text-muted-foreground">Save the course first, then add lessons.</p>}
            {isEdit && courseLessons.length === 0 && <p className="text-sm text-muted-foreground">No lessons yet. Click "Add lesson" to get started.</p>}
            <div className="space-y-2">
              {courseLessons.map((lesson, i) => (
                <div key={lesson.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveLesson(i, "up")} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" /></button>
                    <button onClick={() => moveLesson(i, "down")} disabled={i === courseLessons.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" /></button>
                  </div>
                  <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{lesson.title}</p>
                    <div className="flex gap-1.5 mt-0.5">
                      {lesson.isPreview && <Badge variant="outline" className="text-[10px]"><Eye className="h-2.5 w-2.5 mr-0.5" />Preview</Badge>}
                      {lesson.videoUrl && <Badge variant="secondary" className="text-[10px]"><Video className="h-2.5 w-2.5 mr-0.5" />Video</Badge>}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => openLessonDialog(lesson)} className="h-7 text-xs">Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteLesson(lesson.id)} className="h-7 text-xs text-destructive"><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Lesson dialog */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
          <DialogHeader><DialogTitle>{editingLesson ? "Edit Lesson" : "Add Lesson"}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><label className="text-sm font-medium mb-1 block">Title *</label><Input value={lesTitle} onChange={(e) => setLesTitle(e.target.value)} maxLength={120} /></div>
            <div><label className="text-sm font-medium mb-1 block">Summary</label><Input value={lesSummary} onChange={(e) => setLesSummary(e.target.value)} maxLength={200} /></div>
            <div><label className="text-sm font-medium mb-1 block">Content (Markdown)</label><Textarea value={lesContent} onChange={(e) => setLesContent(e.target.value)} className="resize-none min-h-[200px] font-mono text-sm" placeholder="# Lesson content&#10;&#10;Write in markdown..." /></div>
            <div><label className="text-sm font-medium mb-1 block">Video URL (optional)</label><Input value={lesVideoUrl} onChange={(e) => setLesVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." /></div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Allow preview (non-enrolled users can see this lesson)</label>
              <Switch checked={lesIsPreview} onCheckedChange={setLesIsPreview} />
            </div>
            <Button onClick={saveLesson} disabled={!lesTitle.trim()} className="w-full">{editingLesson ? "Update Lesson" : "Add Lesson"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
