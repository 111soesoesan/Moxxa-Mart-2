'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Package, FileText, Info } from 'lucide-react';

interface ShopSecondaryNavProps {
  shopSlug: string;
}

export function ShopSecondaryNav({ shopSlug }: ShopSecondaryNavProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Home', href: `/shop/${shopSlug}`, icon: Home, exact: true },
    { label: 'Products', href: `/shop/${shopSlug}/products`, icon: Package },
    { label: 'Blog', href: `/shop/${shopSlug}/blogs`, icon: FileText },
    { label: 'About', href: `/shop/${shopSlug}/about`, icon: Info },
  ];

  return (
    <div className="border-b bg-background sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <nav className="flex items-center gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact 
              ? pathname === item.href 
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
