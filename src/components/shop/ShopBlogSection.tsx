"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  publishedAt: string;
}

interface ShopBlogSectionProps {
  posts?: BlogPost[];
  isEditable?: boolean;
}

export function ShopBlogSection({ posts, isEditable = false }: ShopBlogSectionProps) {
  const mockPosts: BlogPost[] = [
    {
      id: "1",
      title: "New Collection Launch",
      excerpt: "Discover our latest arrivals and exclusive deals this season.",
      publishedAt: "2 days ago",
    },
    {
      id: "2",
      title: "How to Care for Your Purchase",
      excerpt: "Tips and tricks to keep your items in perfect condition.",
      publishedAt: "1 week ago",
    },
    {
      id: "3",
      title: "Behind the Scenes",
      excerpt: "Meet the team and learn about our mission.",
      publishedAt: "2 weeks ago",
    },
  ];

  const displayPosts = posts?.length ? posts : mockPosts;

  return (
    <div className="space-y-4 mt-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Latest from Shop</h3>
          <p className="text-sm text-muted-foreground mt-1">Shop news and updates</p>
        </div>
        {isEditable && (
          <Button variant="outline" size="sm">
            Manage Blog
          </Button>
        )}
      </div>

      {displayPosts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              📰 Shop blog coming soon!
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Vendors will be able to share updates and news with customers.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {displayPosts.slice(0, 3).map((post) => (
            <Card
              key={post.id}
              className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div className="h-40 bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
                <span className="text-4xl">📝</span>
              </div>
              <CardContent className="p-4 space-y-3">
                <h4 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h4>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    {post.publishedAt}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
        <p className="text-sm text-blue-900">
          💡 <strong>Feature Coming Soon:</strong> Vendors will be able to create and manage shop blogs to share updates with customers.
        </p>
      </div>
    </div>
  );
}
