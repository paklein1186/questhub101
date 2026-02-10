import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, Clock, Users, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageShell } from "@/components/PageShell";
import { CourseLevel } from "@/types/enums";
import { courses, getTopicsForCourse, getEnrollmentsForCourse, getUserById } from "@/data/mock";
import { filterActive } from "@/lib/softDelete";

export default function CoursesExplore({ bare }: { bare?: boolean }) {
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [priceFilter, setPriceFilter] = useState<string>("all");

  const published = filterActive(courses).filter((c) => c.isPublished);

  const filtered = published.filter((c) => {
    if (levelFilter !== "all" && c.level !== levelFilter) return false;
    if (priceFilter === "free" && !c.isFree) return false;
    if (priceFilter === "paid" && c.isFree) return false;
    return true;
  });

  return (
    <PageShell bare={bare}>
      {!bare && (
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" /> Courses
          </h1>
          <p className="text-muted-foreground mt-1">Learn from the community's best educators.</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-40"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue placeholder="Level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value={CourseLevel.BEGINNER}>Beginner</SelectItem>
            <SelectItem value={CourseLevel.INTERMEDIATE}>Intermediate</SelectItem>
            <SelectItem value={CourseLevel.ADVANCED}>Advanced</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priceFilter} onValueChange={setPriceFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Price" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 && <p className="text-muted-foreground">No courses match your filters.</p>}

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((course, i) => {
          const creator = getUserById(course.creatorUserId);
          const cTopics = getTopicsForCourse(course.id);
          const enrollCount = getEnrollmentsForCourse(course.id).length;
          return (
            <motion.div key={course.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={`/courses/${course.id}`} className="group block rounded-xl border border-border bg-card overflow-hidden hover:shadow-md hover:border-primary/30 transition-all">
                {course.coverImageUrl && (
                  <div className="h-40 overflow-hidden">
                    <img src={course.coverImageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {course.isFree ? (
                      <Badge className="bg-green-500/10 text-green-600 border-0 text-xs">Free</Badge>
                    ) : (
                      <Badge className="bg-primary/10 text-primary border-0 text-xs">€{course.priceAmount}</Badge>
                    )}
                    {course.level && <Badge variant="outline" className="text-[10px] capitalize">{course.level.toLowerCase()}</Badge>}
                  </div>
                  <h3 className="font-display font-semibold line-clamp-2 mb-1">{course.title}</h3>
                  {course.subtitle && <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{course.subtitle}</p>}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>by {creator?.name ?? "Unknown"}</span>
                    <div className="flex items-center gap-3">
                      {course.estimatedDurationMinutes && (
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{Math.round(course.estimatedDurationMinutes / 60)}h</span>
                      )}
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{enrollCount}</span>
                    </div>
                  </div>
                  {cTopics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {cTopics.slice(0, 3).map((t) => <Badge key={t.id} variant="secondary" className="text-[10px]">{t.name}</Badge>)}
                    </div>
                  )}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </PageShell>
  );
}
