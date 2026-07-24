export function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <p className="text-lg font-medium">No listings match your search</p>
      <p className="text-sm text-muted-foreground">
        Try a different destination to see more results.
      </p>
    </div>
  );
}
