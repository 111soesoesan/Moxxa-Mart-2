"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useParams } from "next/navigation";
import { getMyShops } from "@/actions/shops";
import {
  getShopAttributes,
  createAttribute,
  updateAttribute,
  deleteAttribute,
  createAttributeItem,
  updateAttributeItem,
  deleteAttributeItem,
  type Attribute,
  type AttributeItem,
  type AttributeType,
} from "@/actions/attributes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tag, ChevronRight, Check, X } from "lucide-react";

export default function AttributesPage() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const [shopId, setShopId] = useState<string>("");
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [attrDialogOpen, setAttrDialogOpen] = useState(false);
  const [editingAttr, setEditingAttr] = useState<Attribute | null>(null);
  const [attrForm, setAttrForm] = useState({ name: "", attribute_type: "select" as AttributeType });

  const [selectedAttr, setSelectedAttr] = useState<Attribute | null>(null);
  const [itemsSheetOpen, setItemsSheetOpen] = useState(false);

  const [newItemValue, setNewItemValue] = useState("");
  const [newItemColor, setNewItemColor] = useState("#000000");
  const [editingItem, setEditingItem] = useState<AttributeItem | null>(null);
  const [editItemValue, setEditItemValue] = useState("");
  const [editItemColor, setEditItemColor] = useState("#000000");

  const [deleteAttrId, setDeleteAttrId] = useState<string | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const shops = await getMyShops();
    const shop = shops.find((s) => s.slug === shopSlug);
    if (!shop) return;
    setShopId(shop.id);
    const data = await getShopAttributes(shop.id);
    setAttributes(data);
    if (selectedAttr) {
      const updated = data.find((a) => a.id === selectedAttr.id);
      if (updated) setSelectedAttr(updated);
    }
    setLoading(false);
  }, [shopSlug, selectedAttr]);

  useEffect(() => { load(); }, [shopSlug]);

  const openCreateAttr = () => {
    setEditingAttr(null);
    setAttrForm({ name: "", attribute_type: "select" });
    setAttrDialogOpen(true);
  };

  const openEditAttr = (attr: Attribute) => {
    setEditingAttr(attr);
    setAttrForm({ name: attr.name, attribute_type: attr.attribute_type });
    setAttrDialogOpen(true);
  };

  const handleAttrSubmit = () => {
    if (!attrForm.name.trim()) { toast.error("Name is required"); return; }
    startTransition(async () => {
      let res;
      if (editingAttr) {
        res = await updateAttribute(editingAttr.id, attrForm);
      } else {
        res = await createAttribute(shopId, attrForm);
      }
      if (res.error) toast.error(res.error);
      else { toast.success(editingAttr ? "Attribute updated" : "Attribute created"); setAttrDialogOpen(false); await load(); }
    });
  };

  const handleDeleteAttr = () => {
    if (!deleteAttrId) return;
    startTransition(async () => {
      const res = await deleteAttribute(deleteAttrId);
      if (res.error) toast.error(res.error);
      else { toast.success("Attribute deleted"); if (selectedAttr?.id === deleteAttrId) { setSelectedAttr(null); setItemsSheetOpen(false); } await load(); }
      setDeleteAttrId(null);
    });
  };

  const openItemsSheet = (attr: Attribute) => {
    setSelectedAttr(attr);
    setItemsSheetOpen(true);
    setNewItemValue("");
    setNewItemColor("#000000");
    setEditingItem(null);
  };

  const handleAddItem = () => {
    if (!newItemValue.trim() || !selectedAttr) return;
    startTransition(async () => {
      const res = await createAttributeItem(selectedAttr.id, {
        value: newItemValue.trim(),
        color_code: selectedAttr.attribute_type === "color" ? newItemColor : undefined,
      });
      if (res.error) toast.error(res.error);
      else { setNewItemValue(""); setNewItemColor("#000000"); await load(); }
    });
  };

  const handleSaveItem = (item: AttributeItem) => {
    startTransition(async () => {
      const res = await updateAttributeItem(item.id, {
        value: editItemValue,
        color_code: selectedAttr?.attribute_type === "color" ? editItemColor : null,
      });
      if (res.error) toast.error(res.error);
      else { setEditingItem(null); await load(); }
    });
  };

  const handleDeleteItem = () => {
    if (!deleteItemId) return;
    startTransition(async () => {
      const res = await deleteAttributeItem(deleteItemId);
      if (res.error) toast.error(res.error);
      else { toast.success("Item deleted"); await load(); }
      setDeleteItemId(null);
    });
  };

  if (loading) {
    return <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground text-sm">Loading…</div>;
  }

  const currentItems = selectedAttr?.items?.slice().sort((a, b) => a.sort_order - b.sort_order) ?? [];

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attributes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Define reusable attributes like Color, Size, Material</p>
        </div>
        <Button onClick={openCreateAttr}>
          <Plus className="mr-2 h-4 w-4" />New Attribute
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Values</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {attributes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Tag className="h-8 w-8 opacity-30" />
                    <p className="text-sm">No attributes yet. Create attributes to use in variable products.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              attributes.map((attr) => (
                <TableRow key={attr.id} className="cursor-pointer hover:bg-muted/30" onClick={() => openItemsSheet(attr)}>
                  <TableCell className="font-medium">{attr.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize text-xs">{attr.attribute_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(attr.items ?? []).slice(0, 6).map((item) => (
                        attr.attribute_type === "color" ? (
                          <span
                            key={item.id}
                            className="h-5 w-5 rounded-full border border-border/50"
                            style={{ backgroundColor: item.color_code ?? "#ccc" }}
                            title={item.value}
                          />
                        ) : (
                          <Badge key={item.id} variant="outline" className="text-xs py-0">{item.value}</Badge>
                        )
                      ))}
                      {(attr.items?.length ?? 0) > 6 && (
                        <span className="text-xs text-muted-foreground">+{(attr.items?.length ?? 0) - 6} more</span>
                      )}
                      {(attr.items?.length ?? 0) === 0 && (
                        <span className="text-xs text-muted-foreground italic">No values yet</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditAttr(attr)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteAttrId(attr.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Attribute create/edit dialog */}
      <Dialog open={attrDialogOpen} onOpenChange={setAttrDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingAttr ? "Edit Attribute" : "New Attribute"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={attrForm.name} onChange={(e) => setAttrForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Color, Size" />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={attrForm.attribute_type} onValueChange={(v) => setAttrForm((f) => ({ ...f, attribute_type: v as AttributeType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="select">Select (dropdown)</SelectItem>
                  <SelectItem value="color">Color (with picker)</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttrDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAttrSubmit} disabled={isPending}>{isPending ? "Saving…" : editingAttr ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Items sheet */}
      <Sheet open={itemsSheetOpen} onOpenChange={setItemsSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selectedAttr?.name} Values
              <span className="ml-2 text-xs font-normal text-muted-foreground capitalize">({selectedAttr?.attribute_type})</span>
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Add new item */}
            <div className="flex gap-2">
              {selectedAttr?.attribute_type === "color" && (
                <input
                  type="color"
                  value={newItemColor}
                  onChange={(e) => setNewItemColor(e.target.value)}
                  className="h-9 w-10 cursor-pointer rounded-md border p-0.5"
                />
              )}
              <Input
                value={newItemValue}
                onChange={(e) => setNewItemValue(e.target.value)}
                placeholder={selectedAttr?.attribute_type === "color" ? "Color name (e.g. Red)" : "Add value…"}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddItem(); } }}
                className="flex-1"
              />
              <Button onClick={handleAddItem} disabled={!newItemValue.trim() || isPending} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Items list */}
            <div className="rounded-md border divide-y">
              {currentItems.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No values yet. Add your first value above.
                </div>
              ) : (
                currentItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-3 py-2">
                    {selectedAttr?.attribute_type === "color" && (
                      <span
                        className="h-6 w-6 rounded-full border border-border/50 shrink-0"
                        style={{ backgroundColor: item.color_code ?? "#ccc" }}
                      />
                    )}
                    {editingItem?.id === item.id ? (
                      <div className="flex flex-1 gap-2">
                        {selectedAttr?.attribute_type === "color" && (
                          <input
                            type="color"
                            value={editItemColor}
                            onChange={(e) => setEditItemColor(e.target.value)}
                            className="h-9 w-10 cursor-pointer rounded-md border p-0.5"
                          />
                        )}
                        <Input
                          value={editItemValue}
                          onChange={(e) => setEditItemValue(e.target.value)}
                          className="flex-1 h-8"
                          onKeyDown={(e) => { if (e.key === "Enter") handleSaveItem(item); if (e.key === "Escape") setEditingItem(null); }}
                          autoFocus
                        />
                        <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => handleSaveItem(item)} disabled={isPending}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setEditingItem(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 text-sm">{item.value}</span>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingItem(item); setEditItemValue(item.value); setEditItemColor(item.color_code ?? "#000000"); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteItemId(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete attribute confirmation */}
      <AlertDialog open={!!deleteAttrId} onOpenChange={(o) => !o && setDeleteAttrId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete attribute?</AlertDialogTitle>
            <AlertDialogDescription>This will delete the attribute and all its values. Products using it will lose this attribute from their variations.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" disabled={isPending} onClick={handleDeleteAttr}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete item confirmation */}
      <AlertDialog open={!!deleteItemId} onOpenChange={(o) => !o && setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this value?</AlertDialogTitle>
            <AlertDialogDescription>This will remove this option from the attribute.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" disabled={isPending} onClick={handleDeleteItem}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
