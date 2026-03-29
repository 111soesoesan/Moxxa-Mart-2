"use client";

import { useState, useTransition } from "react";
import {
  createBrowseCategory,
  updateBrowseCategory,
  deleteBrowseCategory,
} from "@/actions/browseCategories";
import type { Tables } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { slugify } from "@/lib/utils";

type Row = Tables<"browse_categories">;

export function BrowseCategoriesManager({ initialRows }: { initialRows: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setSlug("");
    setSlugManual(false);
    setDescription("");
    setSortOrder(String(Math.max(0, ...rows.map((r) => r.sort_order)) + 10));
    setIsActive(true);
    setDialogOpen(true);
  };

  const openEdit = (row: Row) => {
    setEditing(row);
    setName(row.name);
    setSlug(row.slug);
    setSlugManual(true);
    setDescription(row.description ?? "");
    setSortOrder(String(row.sort_order));
    setIsActive(row.is_active);
    setDialogOpen(true);
  };

  const handleName = (v: string) => {
    setName(v);
    if (!slugManual) setSlug(slugify(v));
  };

  const save = () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    startTransition(async () => {
      if (editing) {
        const res = await updateBrowseCategory(editing.id, {
          name: name.trim(),
          slug: slug.trim().toLowerCase() || slugify(name),
          description: description.trim() || null,
          sort_order: parseInt(sortOrder, 10) || 0,
          is_active: isActive,
        });
        if (res.error) {
          toast.error(res.error);
          return;
        }
        if (res.data) {
          setRows((prev) => prev.map((r) => (r.id === res.data!.id ? res.data! : r)).sort((a, b) => a.sort_order - b.sort_order));
        }
        toast.success("Category updated");
      } else {
        const res = await createBrowseCategory({
          name: name.trim(),
          slug: slug.trim().toLowerCase() || undefined,
          description: description.trim() || null,
          sort_order: parseInt(sortOrder, 10) || 0,
          is_active: isActive,
        });
        if (res.error) {
          toast.error(res.error);
          return;
        }
        if (res.data) {
          setRows((prev) => [...prev, res.data!].sort((a, b) => a.sort_order - b.sort_order));
        }
        toast.success("Category created");
      }
      setDialogOpen(false);
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const res = await deleteBrowseCategory(deleteTarget.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast.success("Category deleted");
      setDeleteTarget(null);
    });
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button type="button" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add browse category
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All categories</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Slug</TableHead>
                <TableHead className="w-24">Order</TableHead>
                <TableHead className="w-24">Active</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    No browse categories yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="hidden sm:table-cell font-mono text-xs text-muted-foreground">
                      {row.slug}
                    </TableCell>
                    <TableCell>{row.sort_order}</TableCell>
                    <TableCell>{row.is_active ? "Yes" : "No"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        onClick={() => setDeleteTarget(row)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit browse category" : "New browse category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => handleName(e.target.value)} placeholder="e.g. Electronics" />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input
                value={slug}
                onChange={(e) => {
                  setSlugManual(true);
                  setSlug(e.target.value);
                }}
                placeholder="electronics"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Sort order</Label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-32"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">Hidden from marketplace when off</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={isPending}>
              {isPending ? "Saving…" : editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleteTarget?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              Shops and products using this category will have their assignment cleared. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
