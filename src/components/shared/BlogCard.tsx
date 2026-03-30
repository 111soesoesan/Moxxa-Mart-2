import type { BlogWithEngagement } from "@/actions/blogs";
import {
  MarketplaceBlogCard,
  type MarketplaceBlogCardPost,
} from "@/components/marketplace/MarketplaceBlogCard";

export type { MarketplaceBlogCardPost };

type Props = {
  blog: BlogWithEngagement;
  shopSlug: string;
  className?: string;
  compact?: boolean;
};

export function BlogCard({ blog, shopSlug, className, compact }: Props) {
  return (
    <MarketplaceBlogCard post={blog} shopSlug={shopSlug} className={className} compact={compact} />
  );
}
