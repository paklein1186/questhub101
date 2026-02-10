import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, Plus, Clock, BookOpen, Play, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  courses, getCoursesForUser, getEnrollmentsForUser,
  getLessonsForCourse, getCourseById, getUserById,
  guilds, guildMembers, companies, GuildMemberRole,
} from "@/data/mock";
import { filterActive } from "@/lib/softDelete";

export default function MyCourses({ bare }: { bare?: boolean }) {
  const currentUser = useCurrentUser();

  // Courses I teach (created by me or under my admin guilds/companies)
  const myCreatedCourses = getCoursesForUser(currentUser.id);
  const adminGuildIds = guildMembers
    .filter((gm) => gm.userId === currentUser.id && gm.role === GuildMemberRole.ADMIN)
    .map((gm) => gm.guildId);
  const adminCompanyIds = companies.filter((c) => c.contactUserId === currentUser.id).map((c) => c.id);
  const guildCourses = courses.filter((c) => c.providerGuildId && adminGuildIds.includes(c.providerGuildId) && c.creatorUserId !== currentUser.id);
  const companyCourses = courses.filter((c) => c.providerCompanyId && adminCompanyIds.includes(c.providerCompanyId) && c.creatorUserId !== currentUser.id);
  const teachCourses = [...myCreatedCourses, ...guildCourses, ...companyCourses];

  // Courses I learn
  const myEnrollments = getEnrollmentsForUser(currentUser.id);

  return (
    <PageShell bare={bare}>
      {!bare && (
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" /> My Courses
          </h1>
          <Button asChild><Link to="/courses/new"><Plus className="h-4 w-4 mr-1" /> Create course</Link></Button>
        </div>
      )}

      <Tabs defaultValue="teach">
        <TabsList className="mb-4">
          <TabsTrigger value="teach">I teach ({teachCourses.length})</TabsTrigger>
          <TabsTrigger value="learn">I learn ({myEnrollments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="teach">
          {bare && (
            <div className="flex justify-end mb-3">
              <Button size="sm" asChild><Link to="/courses/new"><Plus className="h-4 w-4 mr-1" /> Create course</Link></Button>
            </div>
          )}
          {teachCourses.length === 0 && (
            <div className="text-center py-12">
              <GraduationCap className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground mb-3">You haven't created any courses yet.</p>
              <Button size="sm" asChild><Link to="/courses/new"><Plus className="h-4 w-4 mr-1" /> Create your first course</Link></Button>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {teachCourses.map((course, i) => {
              const lessonCount = getLessonsForCourse(course.id).length;
              return (
                <motion.div key={course.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Link to={`/courses/${course.id}`} className="block rounded-xl border border-border bg-card overflow-hidden hover:shadow-md hover:border-primary/30 transition-all">
                    {course.coverImageUrl && <div className="h-28 overflow-hidden"><img src={course.coverImageUrl} alt="" className="w-full h-full object-cover" /></div>}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        {course.isPublished ? (
                          <Badge className="bg-green-500/10 text-green-600 border-0 text-[10px]">Published</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">Draft</Badge>
                        )}
                        {course.isFree ? <Badge variant="secondary" className="text-[10px]">Free</Badge> : <Badge className="bg-primary/10 text-primary border-0 text-[10px]">€{course.priceAmount}</Badge>}
                      </div>
                      <h3 className="font-display font-semibold">{course.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                        <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{lessonCount} lessons</span>
                        {course.estimatedDurationMinutes && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{Math.round(course.estimatedDurationMinutes / 60)}h</span>}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="learn">
          {myEnrollments.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground mb-3">You haven't enrolled in any courses yet.</p>
              <Button size="sm" variant="outline" asChild><Link to="/explore?tab=courses">Browse courses</Link></Button>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {myEnrollments.map((enrollment, i) => {
              const course = getCourseById(enrollment.courseId);
              if (!course) return null;
              const creator = getUserById(course.creatorUserId);
              const lessonsCount = getLessonsForCourse(course.id).length;
              const continueUrl = enrollment.lastLessonId
                ? `/courses/${course.id}/lessons/${enrollment.lastLessonId}`
                : lessonsCount > 0 ? `/courses/${course.id}/lessons/${getLessonsForCourse(course.id)[0]?.id}` : `/courses/${course.id}`;
              return (
                <motion.div key={enrollment.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    {course.coverImageUrl && <div className="h-24 overflow-hidden"><img src={course.coverImageUrl} alt="" className="w-full h-full object-cover" /></div>}
                    <div className="p-4">
                      <h3 className="font-display font-semibold mb-1">{course.title}</h3>
                      <p className="text-xs text-muted-foreground mb-2">by {creator?.name}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>Progress</span>
                        <span>{Math.round(enrollment.progressPercentage)}%</span>
                      </div>
                      <Progress value={enrollment.progressPercentage} className="h-2 mb-3" />
                      <Button size="sm" asChild className="w-full">
                        <Link to={continueUrl}>
                          {enrollment.completionDate ? <><CheckCircle className="h-4 w-4 mr-1" /> Review course</> : <><Play className="h-4 w-4 mr-1" /> Continue</>}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
