"use client";

import { useState, useTransition, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { searchPOSCustomers, quickAddPOSCustomer } from "@/actions/pos";
import { formatCurrency } from "@/lib/utils";
import { UserSearch, UserPlus, User, Phone, Mail, Loader2 } from "lucide-react";
import type { POSCustomer } from "./usePOSCart";

type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  total_orders: number;
  total_spent: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  shopId: string;
  onSelect: (customer: POSCustomer | null) => void;
};

export function POSCustomerSearch({ open, onClose, shopId, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerRow[]>([]);
  const [isPending, startTransition] = useTransition();

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isAdding, startAdding] = useTransition();
  const [addError, setAddError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const data = await searchPOSCustomers(shopId, val.trim());
        setResults(data as CustomerRow[]);
      });
    }, 300);
  };

  const handleSelectCustomer = (c: CustomerRow) => {
    onSelect({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      mode: "customer",
    });
    onClose();
  };

  const handleGuestCheckout = () => {
    onSelect({ name: "Guest", mode: "guest" });
    onClose();
  };

  const handleQuickAdd = () => {
    if (!newName.trim()) { setAddError("Name is required"); return; }
    setAddError(null);
    startAdding(async () => {
      const result = await quickAddPOSCustomer(shopId, {
        name: newName.trim(),
        phone: newPhone.trim() || undefined,
        email: newEmail.trim() || undefined,
      });
      if (result.error) { setAddError(result.error); return; }
      if (result.data) {
        onSelect({
          id: result.data.id,
          name: result.data.name,
          phone: result.data.phone,
          email: result.data.email,
          mode: "customer",
        });
        onClose();
      }
    });
  };

  const handleClose = () => {
    setQuery("");
    setResults([]);
    setNewName("");
    setNewPhone("");
    setNewEmail("");
    setAddError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Customer Lookup</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="search">
          <TabsList className="w-full">
            <TabsTrigger value="search" className="flex-1">
              <UserSearch className="h-3.5 w-3.5 mr-1.5" />Search
            </TabsTrigger>
            <TabsTrigger value="new" className="flex-1">
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />Quick Add
            </TabsTrigger>
          </TabsList>

          {/* Search Tab */}
          <TabsContent value="search" className="mt-3 space-y-3">
            <div className="relative">
              <UserSearch className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Name, phone, or email…"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                autoFocus
              />
              {isPending && (
                <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {results.length > 0 && (
              <ScrollArea className="max-h-60">
                <div className="space-y-1">
                  {results.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleSelectCustomer(c)}
                      className="w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-accent transition-colors"
                    >
                      <div className="mt-0.5 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{c.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {c.phone && (
                            <span className="flex items-center gap-0.5">
                              <Phone className="h-3 w-3" />{c.phone}
                            </span>
                          )}
                          {c.email && (
                            <span className="flex items-center gap-0.5 truncate">
                              <Mail className="h-3 w-3" />{c.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant="secondary" className="text-xs">{c.total_orders} orders</Badge>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(c.total_spent)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}

            {query.length >= 2 && results.length === 0 && !isPending && (
              <p className="text-sm text-center text-muted-foreground py-4">
                No customers found for &ldquo;{query}&rdquo;
              </p>
            )}

            <Button variant="outline" className="w-full" onClick={handleGuestCheckout}>
              <User className="h-4 w-4 mr-2" />Continue as Guest
            </Button>
          </TabsContent>

          {/* Quick Add Tab */}
          <TabsContent value="new" className="mt-3 space-y-3">
            {addError && (
              <p className="text-sm text-destructive">{addError}</p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="new-name">Name *</Label>
              <Input
                id="new-name"
                placeholder="Walk-in customer"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-phone">Phone</Label>
              <Input
                id="new-phone"
                type="tel"
                placeholder="09XX XXX XXXX"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                placeholder="optional"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleQuickAdd}
              disabled={isAdding}
            >
              {isAdding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Add Customer
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
