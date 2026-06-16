import { cn } from "@/lib/utils";

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-white p-6", className)}>
      <div className="skeleton mb-4 h-4 w-1/3 rounded" />
      <div className="skeleton h-8 w-2/3 rounded" />
    </div>
  );
}

export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex gap-4 py-4">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className={cn("skeleton h-4 rounded", i === 0 ? "flex-1" : "w-24")} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-4 border-b pb-2">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className={cn("skeleton h-4 rounded", i === 0 ? "flex-1" : "w-24")} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </div>
  );
}
