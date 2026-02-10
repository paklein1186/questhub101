import { useParams, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
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
import { CoursePurchaseStatus } from "@/types/enums";
import {
  getCourseById, getLessonsForCourse, getUserById, getGuildById, getCompanyById,
  getTopicsForCourse, getTerritoriesForCourse, getEnrollmentsForCourse,
  getUserEnrollment, getUserPurchase, courseEnrollments, coursePurchases,
} from "@/data/mock";

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const course = getCourseById(id!);
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [, forceUpdate] = useState(0);
  const rerender = () => forceUpdate((n) => n + 1);

  if (!course) return <PageShell><p>Course not found.</p></PageShell>;

  const lessons = getLessonsForCourse(course.id);
  const creator = getUserById(course.creatorUserId);
  const guild = course.providerGuildId ? getGuildById(course.providerGuildId) : null;
  const company = course.providerCompanyId ? getCompanyById(course.providerCompanyId) : null;
  const topics = getTopicsForCourse(course.id);
  const territories = getTerritoriesForCourse(course.id);
  const enrollCount = getEnrollmentsForCourse(course.id).length;

  const enrollment = getUserEnrollment(course.id, currentUser.id);
  const purchase = getUserPurchase(course.id, currentUser.id);
  const isCreator = course.creatorUserId === currentUser.id;
  const isEnrolled = !!enrollment;
  const canAccess = isEnrolled || isCreator || course.isFree;

  const handleEnroll = () => {
    if (getUserEnrollment(course.id, currentUser.id)) return;
    courseEnrollments.push({
      id: `ce-${Date.now()}`,
      courseId: course.id,
      learnerUserId: currentUser.id,
      enrolledAt: new Date().toISOString(),
      progressPercentage: 0,
      completedLessonIds: [],
    });
    rerender();
    toast({ title: "Enrolled!" });
    if (lessons.length > 0) navigate(`/courses/${course.id}/lessons/${lessons[0].id}`);
  };

  const handleBuy = () => {
    // Mock purchase flow
    coursePurchases.push({
      id: `cp-${Date.now()}`,
      courseId: course.id,
      buyerUserId: currentUser.id,
      priceAmount: course.priceAmount ?? 0,
      priceCurrency: course.priceCurrency,
      status: CoursePurchaseStatus.PAID,
      purchasedAt: new Date().toISOString(),
    });
    courseEnrollments.push({
      id: `ce-${Date.now()}`,
      courseId: course.id,
      learnerUserId: currentUser.id,
      enrolledAt: new Date().toISOString(),
      progressPercentage: 0,
      completedLessonIds: [],
    });
    rerender();
    toast({ title: "Purchase successful! You're now enrolled." });
    if (lessons.length > 0) navigate(`/courses/${course.id}/lessons/${lessons[0].id}`);
  };

  const continueLesson = enrollment?.lastLessonId
    ? `/courses/${course.id}/lessons/${enrollment.lastLessonId}`
    : lessons.length > 0 ? `/courses/${course.id}/lessons/${lessons[0].id}` : undefined;

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/explore?tab=courses"><ArrowLeft className="h-4 w-4 mr-1" /> Courses</Link>
      </Button>

      {/* Hero */}
      {course.coverImageUrl && (
        <div className="w-full h-48 md:h-64 rounded-xl overflow-hidden mb-6">
          <img src={course.coverImageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex flex-col md:flex-row md:items-start gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {course.isFree ? (
                <Badge className="bg-green-500/10 text-green-600 border-0">Free</Badge>
              ) : (
                <Badge className="bg-primary/10 text-primary border-0">€{course.priceAmount}</Badge>
              )}
              {course.level && <Badge variant="outline" className="capitalize">{course.level.toLowerCase()}</Badge>}
              {!course.isPublished && <Badge variant="outline" className="text-amber-600 border-amber-500/30">Draft</Badge>}
            </div>
            <h1 className="font-display text-3xl font-bold mb-1">{course.title}</h1>
            {course.subtitle && <p className="text-lg text-muted-foreground">{course.subtitle}</p>}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
              <span>by <Link to={`/users/${creator?.id}`} className="text-primary hover:underline">{creator?.name}</Link></span>
              {guild && <span>via <Link to={`/guilds/${guild.id}`} className="text-primary hover:underline">{guild.name}</Link></span>}
              {company && <span>via <Link to={`/companies/${company.id}`} className="text-primary hover:underline">{company.name}</Link></span>}
              {course.estimatedDurationMinutes && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{Math.round(course.estimatedDurationMinutes / 60)}h</span>}
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{enrollCount} learners</span>
              <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{lessons.length} lessons</span>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col gap-2 shrink-0">
            {isCreator && (
              <Button size="sm" variant="outline" asChild>
                <Link to={`/courses/${course.id}/edit`}><Pencil className="h-4 w-4 mr-1" /> Edit course</Link>
              </Button>
            )}
            {!isCreator && !isEnrolled && course.isFree && (
              <Button onClick={handleEnroll}><GraduationCap className="h-4 w-4 mr-1" /> Enroll for free</Button>
            )}
            {!isCreator && !isEnrolled && !course.isFree && !purchase && (
              <Button onClick={handleBuy}><GraduationCap className="h-4 w-4 mr-1" /> Buy course — €{course.priceAmount}</Button>
            )}
            {isEnrolled && continueLesson && (
              <Button asChild><Link to={continueLesson}><Play className="h-4 w-4 mr-1" /> Continue learning</Link></Button>
            )}
            {isEnrolled && enrollment && (
              <div className="w-48">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Progress</span>
                  <span>{Math.round(enrollment.progressPercentage)}%</span>
                </div>
                <Progress value={enrollment.progressPercentage} className="h-2" />
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {topics.map((t) => <Badge key={t.id} variant="secondary" className="text-xs"><Hash className="h-3 w-3 mr-0.5" />{t.name}</Badge>)}
          {territories.map((t) => <Badge key={t.id} variant="outline" className="text-xs"><MapPin className="h-3 w-3 mr-0.5" />{t.name}</Badge>)}
        </div>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Description */}
        <div className="lg:col-span-2">
          <h2 className="font-display text-lg font-semibold mb-3">About this course</h2>
          <div className="prose prose-sm max-w-none text-foreground/80 whitespace-pre-line">{course.description}</div>
        </div>

        {/* Lessons sidebar */}
        <div>
          <h2 className="font-display text-lg font-semibold mb-3">Lessons ({lessons.length})</h2>
          <div className="space-y-2">
            {lessons.map((lesson, i) => {
              const isCompleted = enrollment?.completedLessonIds?.includes(lesson.id);
              const canView = canAccess || lesson.isPreview;
              return (
                <div key={lesson.id} className={`rounded-lg border p-3 transition-all ${canView ? "border-border bg-card hover:border-primary/30" : "border-border/50 bg-muted/30"}`}>
                  {canView ? (
                    <Link to={`/courses/${course.id}/lessons/${lesson.id}`} className="block">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                        {isCompleted ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" /> : lesson.isPreview ? <Eye className="h-4 w-4 text-muted-foreground shrink-0" /> : <Play className="h-4 w-4 text-primary shrink-0" />}
                        <span className="text-sm font-medium flex-1">{lesson.title}</span>
                        {lesson.isPreview && !isEnrolled && <Badge variant="outline" className="text-[10px]">Preview</Badge>}
                      </div>
                      {lesson.summary && <p className="text-xs text-muted-foreground mt-1 ml-7">{lesson.summary}</p>}
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
