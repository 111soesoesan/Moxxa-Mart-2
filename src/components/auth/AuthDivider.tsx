import { cn } from "@/lib/utils";

export function AuthDivider({
  label = "Or continue with",
  panelClassName = "bg-background",
}: {
  label?: string;
  /** Must match the form panel background (e.g. white in split card). */
  panelClassName?: string;
}) {
  return (
    <div className="relative my-8" role="separator" aria-label={label}>
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <span className="w-full border-t border-border/50 dark:border-border/40" />
      </div>
      <div className="relative flex justify-center text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        <span className={cn("px-4", panelClassName)}>{label}</span>
      </div>
    </div>
  );
}
