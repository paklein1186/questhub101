import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, Users, Loader2 } from "lucide-react";
import { UnitCoverImage } from "@/components/UnitCoverImage";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/PageShell";
import { useCourses } from "@/hooks/useSupabaseData";
import { ExploreFilters, ExploreFilterValues, defaultFilters } from "@/components/ExploreFilters";
import { useHouseFilter } from "@/hooks/useHouseFilter";

export default function CoursesExplore({ bare }: { bare?: boolean }) {
  const [filters, setFilters] = useState<ExploreFilterValues>(defaultFilters);

  const { data: coursesData, isLoading } = useCourses();
  const hf = useHouseFilter();
  const allCourses = coursesData ?? [];

  const preFiltered = hf.applyHouseFilter(allCourses, (c) =>
    ((c as any).course_topics ?? []).map((ct: any) => ct.topic_id)
  );

  const filtered = preFiltered.filter((c) => {
    if (filters.level !== "all" && c.level !== filters.level) return false;
    if (filters.price === "free" && !c.is_free) return false;
    if (filters.price === "paid" && c.is_free) return false;
    if (filters.topicIds.length > 0 && !(c as any).course_topics?.some((ct: any) => filters.topicIds.includes(ct.topic_id))) return false;
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

      <div className="mb-6">
        <ExploreFilters
          filters={filters}
          onChange={setFilters}
          config={{ showTopics: true, showLevel: true, showPrice: true }}
          houseFilter={{
            active: hf.houseFilterActive,
            onToggle: hf.setHouseFilterActive,
            hasHouses: hf.hasHouses,
            topicNames: hf.topicNames,
            myTopicIds: hf.myTopicIds,
          }}
          universeMode={hf.universeMode}
          onUniverseModeChange={hf.setUniverseMode}
        />
      </div>

      {isLoading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

      {!isLoading && filtered.length === 0 && <p className="text-muted-foreground">No courses match your filters.</p>}

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((course, i) => {
          const cTopics = ((course as any).course_topics ?? []).map((ct: any) => ct.topics).filter(Boolean);
          const enrollCount = (course as any).course_enrollments?.length ?? 0;
          return (
            <motion.div key={course.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={`/courses/${course.id}`} className="group block rounded-xl border border-border bg-card overflow-hidden hover:shadow-md hover:border-primary/30 transition-all">
                <UnitCoverImage type="COURSE" imageUrl={course.cover_image_url} name={course.title} height="h-40" />
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {course.is_free ? (
                      <Badge className="bg-primary/10 text-primary border-0 text-xs">Free</Badge>
                    ) : (
                      <Badge className="bg-primary/10 text-primary border-0 text-xs">€{course.price_amount}</Badge>
                    )}
                    {course.level && <Badge variant="outline" className="text-[10px] capitalize">{course.level.toLowerCase()}</Badge>}
                  </div>
                  <h3 className="font-display font-semibold line-clamp-2 mb-1">{course.title}</h3>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span></span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{enrollCount}</span>
                    </div>
                  </div>
                  {cTopics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {cTopics.slice(0, 3).map((t: any) => <Badge key={t.id} variant="secondary" className="text-[10px]">{t.name}</Badge>)}
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
