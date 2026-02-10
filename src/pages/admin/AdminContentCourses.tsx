import { ScrollText } from "lucide-react";

export default function AdminContentCourses() {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <ScrollText className="h-6 w-6 text-primary" /> Courses
      </h2>
      <p className="text-muted-foreground">Course management coming soon.</p>
    </div>
  );
}
