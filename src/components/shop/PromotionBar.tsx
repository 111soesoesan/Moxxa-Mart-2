import Link from "next/link";
import { Megaphone } from "lucide-react";

type Props = {
  title?: string | null;
  body?: string | null;
  buttonText?: string | null;
  buttonLink?: string | null;
};

export function PromotionBar({ title, body, buttonText, buttonLink }: Props) {
  if (!title && !body) return null;

  return (
    <div className="bg-primary text-primary-foreground py-2.5 px-4">
      <div className="container mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Megaphone className="h-4 w-4 shrink-0" />
          <div className="min-w-0">
            {title && <span className="font-semibold text-sm mr-2">{title}</span>}
            {body && <span className="text-sm opacity-90">{body}</span>}
          </div>
        </div>
        {buttonText && buttonLink && (
          <Link
            href={buttonLink}
            className="shrink-0 bg-primary-foreground text-primary text-xs font-semibold px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            {buttonText}
          </Link>
        )}
      </div>
    </div>
  );
}
