export function AppShellSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando aplicación"
      className="flex min-h-svh w-full"
    >
      <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar md:block">
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex flex-col gap-2 p-4">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="h-10 animate-pulse rounded bg-muted"
            />
          ))}
        </div>
      </aside>
      <div className="flex min-h-svh flex-1 flex-col">
        <header className="flex h-14 items-center border-b border-border bg-background px-4 md:hidden">
          <div className="h-11 w-11 animate-pulse rounded bg-muted" />
          <div className="ml-3 h-4 w-24 animate-pulse rounded bg-muted" />
        </header>
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </main>
      </div>
    </div>
  );
}
