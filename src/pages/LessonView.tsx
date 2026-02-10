import { useParams, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle, Lock, Play, BookOpen, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import {
  getCourseById, getLessonById, getLessonsForCourse,
  getUserEnrollment, courseEnrollments,
} from "@/data/mock";

export default function LessonView() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const course = getCourseById(courseId!);
  const lesson = getLessonById(lessonId!);
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [, forceUpdate] = useState(0);
  const rerender = () => forceUpdate((n) => n + 1);

  if (!course || !lesson) return <PageShell><p>Lesson not found.</p></PageShell>;

  const lessons = getLessonsForCourse(course.id);
  const enrollment = getUserEnrollment(course.id, currentUser.id);
  const isCreator = course.creatorUserId === currentUser.id;
  const canAccess = !!enrollment || isCreator || (course.isFree && !!enrollment) || lesson.isPreview;

  if (!canAccess) {
    return (
      <PageShell>
        <div className="text-center py-20">
          <Lock className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h2 className="font-display text-xl font-semibold mb-2">This lesson is locked</h2>
          <p className="text-muted-foreground mb-4">
            {course.isFree ? "Enroll in this free course to access all lessons." : `Purchase this course (€${course.priceAmount}) to unlock all lessons.`}
          </p>
          <Button asChild><Link to={`/courses/${course.id}`}>Go to course</Link></Button>
        </div>
      </PageShell>
    );
  }

  const currentIndex = lessons.findIndex((l) => l.id === lesson.id);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const isCompleted = enrollment?.completedLessonIds?.includes(lesson.id);

  const markComplete = () => {
    if (!enrollment || isCompleted) return;
    enrollment.completedLessonIds = [...(enrollment.completedLessonIds || []), lesson.id];
    enrollment.lastLessonId = lesson.id;
    enrollment.progressPercentage = (enrollment.completedLessonIds.length / lessons.length) * 100;
    if (enrollment.progressPercentage >= 100) {
      enrollment.completionDate = new Date().toISOString();
      toast({ title: "🎉 Course completed!", description: "Congratulations on finishing the course!" });
    } else {
      toast({ title: "Lesson completed!" });
    }
    rerender();
  };

  // Extract YouTube embed URL
  const getEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return null;
  };

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/courses/${course.id}`}><ArrowLeft className="h-4 w-4 mr-1" /> {course.title}</Link>
        </Button>
        <span className="text-sm text-muted-foreground">Lesson {currentIndex + 1} of {lessons.length}</span>
      </div>

      {enrollment && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Course progress</span>
            <span>{Math.round(enrollment.progressPercentage)}%</span>
          </div>
          <Progress value={enrollment.progressPercentage} className="h-2" />
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-2xl font-bold mb-2">{lesson.title}</h1>
        {lesson.summary && <p className="text-muted-foreground mb-4">{lesson.summary}</p>}

        {/* Video embed */}
        {lesson.videoUrl && (
          <div className="mb-6">
            {(() => {
              const embedUrl = getEmbedUrl(lesson.videoUrl);
              if (embedUrl) {
                return (
                  <div className="aspect-video rounded-xl overflow-hidden border border-border">
                    <iframe src={embedUrl} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                  </div>
                );
              }
              return (
                <a href={lesson.videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                  <Video className="h-4 w-4" /> Watch video
                </a>
              );
            })()}
          </div>
        )}

        {/* Content */}
        <article className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown>{lesson.content}</ReactMarkdown>
        </article>

        {/* Actions */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <div>
            {prevLesson && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/courses/${course.id}/lessons/${prevLesson.id}`}><ArrowLeft className="h-4 w-4 mr-1" /> {prevLesson.title}</Link>
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {enrollment && !isCompleted && (
              <Button variant="outline" size="sm" onClick={markComplete}>
                <CheckCircle className="h-4 w-4 mr-1" /> Mark as completed
              </Button>
            )}
            {isCompleted && (
              <Badge className="bg-green-500/10 text-green-600 border-0"><CheckCircle className="h-3.5 w-3.5 mr-1" /> Completed</Badge>
            )}
            {nextLesson && (
              <Button size="sm" asChild>
                <Link to={`/courses/${course.id}/lessons/${nextLesson.id}`}>Next lesson <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
