import Link from "next/link";

export function SearchRelatedPills({
  categories,
}: {
  categories: { slug: string; name: string }[];
}) {
  const picks = categories.slice(0, 8);
  if (picks.length === 0) return null;

  return (
    <section className="mt-14 border-t border-border/60 pt-10 pb-4">
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        People also searched for
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {picks.map((c) => (
          <Link
            key={c.slug}
            href={`/search?q=${encodeURIComponent(c.name)}`}
            className="rounded-full border border-border/80 bg-background px-4 py-2.5 text-sm text-muted-foreground shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/40 hover:text-foreground"
          >
            {c.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
