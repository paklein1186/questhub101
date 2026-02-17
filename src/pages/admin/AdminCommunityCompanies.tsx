import { Building2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { useAllCompanies } from "@/hooks/useEntityQueries";
import { useTableSort } from "@/hooks/useTableSort";

export default function AdminCommunityCompanies() {
  const { data: allCompanies = [], isLoading } = useAllCompanies();
  const { sorted, sort, toggle } = useTableSort(allCompanies);

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <Building2 className="h-6 w-6 text-primary" /> Traditional Organizations
      </h2>
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead sortKey="name" currentKey={sort.key} direction={sort.direction} onSort={toggle}>Name</SortableTableHead>
              <SortableTableHead sortKey="sector" currentKey={sort.key} direction={sort.direction} onSort={toggle}>Sector</SortableTableHead>
              <SortableTableHead sortKey="size" currentKey={sort.key} direction={sort.direction} onSort={toggle}>Size</SortableTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.sector ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.size ?? "—"}</TableCell>
              </TableRow>
            ))}
            {!isLoading && allCompanies.length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No traditional organizations.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
