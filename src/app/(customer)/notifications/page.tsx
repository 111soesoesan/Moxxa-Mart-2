import Link from "next/link";
import { Bell } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NotificationsPage() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">Order and shop updates will appear here.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">You&apos;re all caught up</CardTitle>
          <CardDescription>
            We&apos;re not showing live notification feeds yet. Check your orders for shipment and payment status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/orders">View orders</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
