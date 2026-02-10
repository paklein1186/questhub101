import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, GraduationCap, Clock, Users, Hash, MapPin, Play, Lock,
  Eye, CheckCircle, Pencil, BookOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { useCourseById, useLessonsForCourse, useCourseEnrollment, useCourseEnrollmentCount, usePublicProfile } from "@/hooks/useEntityQueries";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { XpLevelBadge } from "@/components/XpLevelBadge";
import { computeLevelFromXp } from "@/lib/xpCreditsConfig";

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: course, isLoading } = useCourseById(id);
  const { data: lessons } = useLessonsForCourse(id);
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: enrollment } = useCourseEnrollment(id, currentUser.id || undefined);
  const { data: enrollCount } = useCourseEnrollmentCount(id);
  const { data: creator } = usePublicProfile(course?.owner_user_id ?? undefined);

  const courseTopics = (course as any)?.course_topics?.map((ct: any) => ct.topics).filter(Boolean) || [];
  const courseTerritories = (course as any)?.course_territories?.map((ct: any) => ct.territories).filter(Boolean) || [];

  if (isLoading) return <PageShell><p>Loading…</p></PageShell>;
  if (!course) return <PageShell><p>Course not found.</p></PageShell>;

  const lessonsList = lessons || [];
  const isCreator = course.owner_user_id === currentUser.id;
  const isEnrolled = !!enrollment;
  const canAccess = isEnrolled || isCreator || course.is_free;

  const handleEnroll = async () => {
    const { error } = await supabase.from("course_enrollments").insert({
      course_id: course.id, user_id: currentUser.id, progress_percent: 0,
    });
    if (error) { toast({ title: "Failed to enroll", variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["course-enrollment", id] });
    toast({ title: "Enrolled!" });
    if (lessonsList.length > 0) navigate(`/courses/${course.id}/lessons/${lessonsList[0].id}`);
  };

  const handleBuy = async () => {
    await supabase.from("course_purchases").insert({
      course_id: course.id, user_id: currentUser.id, amount: course.price_amount ?? 0, currency: course.price_currency, status: "PAID",
    });
    await supabase.from("course_enrollments").insert({
      course_id: course.id, user_id: currentUser.id, progress_percent: 0,
    });
    qc.invalidateQueries({ queryKey: ["course-enrollment", id] });
    toast({ title: "Purchase successful! You're now enrolled." });
    if (lessonsList.length > 0) navigate(`/courses/${course.id}/lessons/${lessonsList[0].id}`);
  };

  const continueLesson = lessonsList.length > 0 ? `/courses/${course.id}/lessons/${lessonsList[0].id}` : undefined;

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/explore?tab=courses"><ArrowLeft className="h-4 w-4 mr-1" /> Courses</Link>
      </Button>

      {course.cover_image_url && (
        <div className="w-full h-48 md:h-64 rounded-xl overflow-hidden mb-6">
          <img src={course.cover_image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex flex-col md:flex-row md:items-start gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {course.is_free ? (
                <Badge className="bg-green-500/10 text-green-600 border-0">Free</Badge>
              ) : (
                <Badge className="bg-primary/10 text-primary border-0">€{course.price_amount}</Badge>
              )}
              {course.level && <Badge variant="outline" className="capitalize">{course.level.toLowerCase()}</Badge>}
              {!course.is_published && <Badge variant="outline" className="text-amber-600 border-amber-500/30">Draft</Badge>}
            </div>
            <h1 className="font-display text-3xl font-bold mb-1">{course.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
              <span>by <Link to={`/users/${creator?.user_id}`} className="text-primary hover:underline">{creator?.name}</Link></span>
              {creator?.xp != null && <XpLevelBadge level={computeLevelFromXp(creator.xp)} compact />}
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{enrollCount ?? 0} learners</span>
              <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{lessonsList.length} lessons</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            {isCreator && (
              <Button size="sm" variant="outline" asChild>
                <Link to={`/courses/${course.id}/edit`}><Pencil className="h-4 w-4 mr-1" /> Edit course</Link>
              </Button>
            )}
            {!isCreator && !isEnrolled && course.is_free && (
              <Button onClick={handleEnroll}><GraduationCap className="h-4 w-4 mr-1" /> Enroll for free</Button>
            )}
            {!isCreator && !isEnrolled && !course.is_free && (
              <Button onClick={handleBuy}><GraduationCap className="h-4 w-4 mr-1" /> Buy course — €{course.price_amount}</Button>
            )}
            {isEnrolled && continueLesson && (
              <Button asChild><Link to={continueLesson}><Play className="h-4 w-4 mr-1" /> Continue learning</Link></Button>
            )}
            {isEnrolled && enrollment && (
              <div className="w-48">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Progress</span>
                  <span>{Math.round(Number(enrollment.progress_percent))}%</span>
                </div>
                <Progress value={Number(enrollment.progress_percent)} className="h-2" />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-2">
          {courseTopics.map((t: any) => <Badge key={t.id} variant="secondary" className="text-xs"><Hash className="h-3 w-3 mr-0.5" />{t.name}</Badge>)}
          {courseTerritories.map((t: any) => <Badge key={t.id} variant="outline" className="text-xs"><MapPin className="h-3 w-3 mr-0.5" />{t.name}</Badge>)}
        </div>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="font-display text-lg font-semibold mb-3">About this course</h2>
          <div className="prose prose-sm max-w-none text-foreground/80 whitespace-pre-line">{course.description}</div>
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold mb-3">Lessons ({lessonsList.length})</h2>
          <div className="space-y-2">
            {lessonsList.map((lesson, i) => {
              const canView = canAccess || lesson.is_preview;
              return (
                <div key={lesson.id} className={`rounded-lg border p-3 transition-all ${canView ? "border-border bg-card hover:border-primary/30" : "border-border/50 bg-muted/30"}`}>
                  {canView ? (
                    <Link to={`/courses/${course.id}/lessons/${lesson.id}`} className="block">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                        {lesson.is_preview ? <Eye className="h-4 w-4 text-muted-foreground shrink-0" /> : <Play className="h-4 w-4 text-primary shrink-0" />}
                        <span className="text-sm font-medium flex-1">{lesson.title}</span>
                        {lesson.is_preview && !isEnrolled && <Badge variant="outline" className="text-[10px]">Preview</Badge>}
                      </div>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2 opacity-60">
                      <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                      <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium flex-1">{lesson.title}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
