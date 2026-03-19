"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createProduct, updateProduct } from "@/actions/products";
import { getShopCategories, setProductCategories, getProductCategories, type Category } from "@/actions/categories";
import { getShopAttributes, type Attribute } from "@/actions/attributes";
import { getProductVariations, upsertVariations, deleteVariationsByProduct, type Variation } from "@/actions/variations";
import { getShopProducts } from "@/actions/products";
import { getShopPaymentMethods } from "@/actions/paymentMethods";
import { uploadProductImage } from "@/lib/supabase/storage";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { CONDITIONS } from "@/lib/constants";
import { toast } from "sonner";
import {
  Package, Trash2, Plus, Wand2, Settings2, Image as ImageIcon, ArrowLeft,
} from "lucide-react";

type PaymentMethod = { id: string; name: string; type: string; is_active: boolean };

type LocalVariation = {
  _key: string;
  id?: string;
  attribute_combination: Record<string, string>;
  sku: string;
  price: string;
  sale_price: string;
  stock_quantity: number;
  image_url: string | null;
  is_active: boolean;
};

type SelectedAttribute = {
  attributeId: string;
  selectedItemIds: string[];
};

function cartesian(arrays: string[][]): string[][] {
  if (arrays.length === 0) return [[]];
  const [first, ...rest] = arrays;
  const restC = cartesian(rest);
  return first.flatMap((item) => restC.map((combo) => [item, ...combo]));
}

function makeVariationLabel(combo: Record<string, string>) {
  return Object.values(combo).join(" / ") || "Default";
}

type Props = {
  mode: "create" | "edit";
  productId?: string;
  shopId: string;
  shopSlug: string;
};

export function ProductForm({ mode, productId, shopId, shopSlug }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(mode === "edit");
  const [tab, setTab] = useState("general");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);

  // ── Core fields ──
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [description, setDescription] = useState("");
  const [productType, setProductType] = useState<"simple" | "variable">("simple");
  const [status, setStatus] = useState<"draft" | "active" | "archived">("active");
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  // ── Pricing ──
  const [price, setPrice] = useState("0");
  const [salePrice, setSalePrice] = useState("");
  const [saleStart, setSaleStart] = useState("");
  const [saleEnd, setSaleEnd] = useState("");

  // ── Inventory ──
  const [sku, setSku] = useState("");
  const [trackInventory, setTrackInventory] = useState(true);
  const [stock, setStock] = useState(0);

  // ── Other ──
  const [condition, setCondition] = useState("new");
  const [listOnMarketplace, setListOnMarketplace] = useState(true);
  const [paymentMethodIds, setPaymentMethodIds] = useState<string[]>([]);

  // ── Data ──
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  // ── Variable product ──
  const [selectedAttributes, setSelectedAttributes] = useState<SelectedAttribute[]>([]);
  const [variations, setVariations] = useState<LocalVariation[]>([]);

  // ── Bulk edit ──
  const [bulkFilter, setBulkFilter] = useState<Record<string, string>>({});
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkSalePrice, setBulkSalePrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");
  const [bulkSku, setBulkSku] = useState("");
  const [bulkActive, setBulkActive] = useState<"" | "true" | "false">("");

  // ── Temp product id for new uploads ──
  const [tempId] = useState(() => productId ?? crypto.randomUUID());

  const loadData = useCallback(async () => {
    const [cats, attrs, pms] = await Promise.all([
      getShopCategories(shopId),
      getShopAttributes(shopId),
      getShopPaymentMethods(shopId),
    ]);
    setCategories(cats);
    setAttributes(attrs);
    if (pms.data) {
      setPaymentMethods(pms.data);
      if (mode === "create") {
        setPaymentMethodIds(pms.data.filter((m) => m.is_active).map((m) => m.id));
      }
    }

    if (mode === "edit" && productId) {
      const [products, catIds, vars] = await Promise.all([
        getShopProducts(shopId),
        getProductCategories(productId),
        getProductVariations(productId),
      ]);
      const product = products.find((p) => p.id === productId);
      if (product) {
        setName(product.name);
        setSlug(product.slug);
        setSlugManual(true);
        setDescription(product.description ?? "");
        setProductType((product as Record<string, unknown>).product_type as "simple" | "variable" ?? "simple");
        setStatus((product as Record<string, unknown>).status as "draft" | "active" | "archived" ?? "active");
        setMainImage((product as Record<string, unknown>).main_image as string | null ?? product.image_urls?.[0] ?? null);
        setGalleryImages((product as Record<string, unknown>).gallery_images as string[] ?? product.image_urls ?? []);
        setPrice(String(product.price ?? 0));
        setSalePrice(String((product as Record<string, unknown>).sale_price ?? ""));
        setSaleStart(String((product as Record<string, unknown>).sale_start ?? "").replace("Z", "").slice(0, 16));
        setSaleEnd(String((product as Record<string, unknown>).sale_end ?? "").replace("Z", "").slice(0, 16));
        setSku(String((product as Record<string, unknown>).sku ?? ""));
        setTrackInventory(product.track_inventory ?? true);
        setStock(product.stock ?? 0);
        setCondition(product.condition ?? "new");
        setListOnMarketplace(product.list_on_marketplace ?? true);
        setPaymentMethodIds((product.payment_method_ids as string[]) ?? []);
        setSelectedCategoryIds(catIds);
      }
      if (vars.length > 0) {
        setVariations(vars.map((v) => ({
          _key: v.id,
          id: v.id,
          attribute_combination: v.attribute_combination,
          sku: v.sku ?? "",
          price: v.price != null ? String(v.price) : "",
          sale_price: v.sale_price != null ? String(v.sale_price) : "",
          stock_quantity: v.stock_quantity,
          image_url: v.image_url,
          is_active: v.is_active,
        })));
      }
    }
    setLoading(false);
  }, [shopId, productId, mode]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slugManual) setSlug(slugify(v));
  };

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleAttributeSelection = (attrId: string) => {
    setSelectedAttributes((prev) => {
      const exists = prev.find((a) => a.attributeId === attrId);
      if (exists) return prev.filter((a) => a.attributeId !== attrId);
      return [...prev, { attributeId: attrId, selectedItemIds: [] }];
    });
  };

  const toggleItemSelection = (attrId: string, itemId: string) => {
    setSelectedAttributes((prev) =>
      prev.map((a) =>
        a.attributeId !== attrId ? a : {
          ...a,
          selectedItemIds: a.selectedItemIds.includes(itemId)
            ? a.selectedItemIds.filter((i) => i !== itemId)
            : [...a.selectedItemIds, itemId],
        }
      )
    );
  };

  const generateVariations = () => {
    const ready = selectedAttributes.filter((a) => a.selectedItemIds.length > 0);
    if (ready.length === 0) { toast.error("Select at least one attribute with values"); return; }

    const attrDefs = ready.map((sa) => {
      const attr = attributes.find((a) => a.id === sa.attributeId);
      const items = (attr?.items ?? []).filter((i) => sa.selectedItemIds.includes(i.id));
      return { name: attr?.name ?? sa.attributeId, items };
    });

    const valueSets = attrDefs.map((a) => a.items.map((i) => i.value));
    const combos = cartesian(valueSets);

    const newVariations: LocalVariation[] = combos.map((combo) => {
      const combination: Record<string, string> = {};
      attrDefs.forEach((attr, idx) => { combination[attr.name] = combo[idx]; });

      const existing = variations.find(
        (v) => JSON.stringify(v.attribute_combination) === JSON.stringify(combination)
      );
      return existing ?? {
        _key: Math.random().toString(36).slice(2),
        attribute_combination: combination,
        sku: "",
        price: price,
        sale_price: "",
        stock_quantity: 0,
        image_url: null,
        is_active: true,
      };
    });

    setVariations(newVariations);
    toast.success(`Generated ${newVariations.length} variation(s)`);
  };

  const updateVariation = (key: string, field: string, value: unknown) => {
    setVariations((prev) =>
      prev.map((v) => v._key === key ? { ...v, [field]: value } : v)
    );
  };

  const removeVariation = (key: string) => {
    setVariations((prev) => prev.filter((v) => v._key !== key));
  };

  const applyBulkEdit = () => {
    setVariations((prev) =>
      prev.map((v) => {
        const matches = Object.entries(bulkFilter).every(([attrName, val]) => {
          if (!val) return true;
          return v.attribute_combination[attrName] === val;
        });
        if (!matches) return v;
        return {
          ...v,
          ...(bulkPrice ? { price: bulkPrice } : {}),
          ...(bulkSalePrice ? { sale_price: bulkSalePrice } : {}),
          ...(bulkStock ? { stock_quantity: Number(bulkStock) } : {}),
          ...(bulkSku ? { sku: bulkSku } : {}),
          ...(bulkActive ? { is_active: bulkActive === "true" } : {}),
        };
      })
    );
    setBulkEditOpen(false);
    setBulkPrice(""); setBulkSalePrice(""); setBulkStock(""); setBulkSku(""); setBulkActive(""); setBulkFilter({});
    toast.success("Bulk edit applied");
  };

  const filteredCount = variations.filter((v) =>
    Object.entries(bulkFilter).every(([k, val]) => !val || v.attribute_combination[k] === val)
  ).length;

  const handleImageUpload = async (file: File, index: number) => {
    return uploadProductImage(file, shopId, tempId, index);
  };

  const handleVariationImageUpload = async (file: File, varKey: string) => {
    const url = await uploadProductImage(file, shopId, `${tempId}/var-${varKey}`, 0);
    updateVariation(varKey, "image_url", url);
    return url;
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Product name is required"); setTab("general"); return; }
    if (!slug.trim()) { toast.error("Slug is required"); setTab("general"); return; }
    if (productType === "simple" && (!price || Number(price) < 0)) { toast.error("Price is required"); setTab("pricing"); return; }
    if (paymentMethodIds.length === 0) { toast.error("Select at least one payment method"); return; }

    startTransition(async () => {
      const productData = {
        name,
        slug: slug || slugify(name) + "-" + Date.now(),
        description: description || null,
        product_type: productType,
        status,
        is_active: status === "active",
        main_image: mainImage,
        gallery_images: galleryImages,
        image_urls: galleryImages,
        price: productType === "simple" ? Number(price) : 0,
        sale_price: salePrice ? Number(salePrice) : null,
        sale_start: saleStart ? new Date(saleStart).toISOString() : null,
        sale_end: saleEnd ? new Date(saleEnd).toISOString() : null,
        sku: sku || null,
        track_inventory: trackInventory,
        stock: productType === "simple" ? stock : 0,
        condition,
        list_on_marketplace: listOnMarketplace,
        payment_method_ids: paymentMethodIds,
      };

      let pid = productId;

      if (mode === "create") {
        const res = await createProduct(shopId, productData as never);
        if (res.error) { toast.error(res.error); return; }
        pid = res.data?.id;
      } else if (productId) {
        const res = await updateProduct(productId, productData as never);
        if (res.error) { toast.error(res.error); return; }
      }

      if (!pid) { toast.error("Failed to save product"); return; }

      await setProductCategories(pid, selectedCategoryIds);

      if (productType === "variable" && variations.length > 0) {
        const savedIds = variations.filter((v) => v.id).map((v) => v.id!);
        await deleteVariationsByProduct(pid, savedIds);
        await upsertVariations(
          pid,
          variations.map((v) => ({
            ...(v.id ? { id: v.id } : {}),
            attribute_combination: v.attribute_combination,
            sku: v.sku || null,
            price: v.price ? Number(v.price) : null,
            sale_price: v.sale_price ? Number(v.sale_price) : null,
            stock_quantity: v.stock_quantity,
            image_url: v.image_url,
            is_active: v.is_active,
          }))
        );
      } else if (productType === "simple" && productId) {
        await deleteVariationsByProduct(pid, []);
      }

      toast.success(mode === "create" ? "Product created!" : "Product saved!");
      router.push(`/vendor/${shopSlug}/products`);
    });
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  const attrNames = [...new Set(variations.flatMap((v) => Object.keys(v.attribute_combination)))];

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "create" ? "Add New Product" : "Edit Product"}
          </h1>
          {name && <p className="text-sm text-muted-foreground mt-0.5">{name}</p>}
        </div>
        <div className="flex gap-2">
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving…" : mode === "create" ? "Create Product" : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Main content */}
        <div className="space-y-6">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full justify-start">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              {productType === "variable" && <TabsTrigger value="attributes">Attributes</TabsTrigger>}
              {productType === "variable" && <TabsTrigger value="variations">Variations {variations.length > 0 && `(${variations.length})`}</TabsTrigger>}
            </TabsList>

            {/* ── GENERAL ── */}
            <TabsContent value="general" className="space-y-6 mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Product Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Product Name <span className="text-destructive">*</span></Label>
                    <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Classic Cotton T-Shirt" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Slug</Label>
                    <Input
                      value={slug}
                      onChange={(e) => { setSlugManual(true); setSlug(e.target.value); }}
                      placeholder="classic-cotton-t-shirt"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your product…" rows={4} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Product Type</Label>
                    <Select value={productType} onValueChange={(v) => setProductType(v as "simple" | "variable")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Simple — single price, single stock</SelectItem>
                        <SelectItem value="variable">Variable — multiple variants (color, size…)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Condition</Label>
                    <Select value={condition} onValueChange={setCondition}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONDITIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Main Image</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex gap-4 items-start">
                    <div className="relative h-32 w-32 shrink-0 rounded-lg overflow-hidden border bg-muted">
                      {mainImage ? (
                        <Image src={mainImage} alt="Main" fill className="object-cover" sizes="128px" />
                      ) : (
                        <div className="flex h-full items-center justify-center"><Package className="h-8 w-8 text-muted-foreground/30" /></div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-sm text-muted-foreground">This is the primary image shown in listings and cards.</p>
                      <ImageUpload
                        value={mainImage ? [mainImage] : []}
                        onChange={(urls) => setMainImage(urls[0] ?? null)}
                        onUpload={(file) => handleImageUpload(file, 0)}
                        maxFiles={1}
                        label="Upload main image"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Product Gallery</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">Additional images shown in the product detail page. Shared across all variants.</p>
                  <ImageUpload
                    value={galleryImages}
                    onChange={setGalleryImages}
                    onUpload={(file, i) => handleImageUpload(file, i + 1)}
                    maxFiles={10}
                    label="Add to gallery"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── PRICING ── */}
            <TabsContent value="pricing" className="space-y-6 mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Pricing</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {productType === "variable" ? (
                    <p className="text-sm text-muted-foreground">For variable products, set prices per variation in the Variations tab.</p>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <Label>Regular Price <span className="text-destructive">*</span></Label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">₱</span>
                          <Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="pl-7" placeholder="0.00" />
                        </div>
                      </div>
                      <Separator />
                      <p className="text-sm font-medium">Sale Price <span className="text-xs text-muted-foreground font-normal">(optional)</span></p>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Sale Price</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">₱</span>
                          <Input type="number" min="0" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} className="pl-7" placeholder="Leave blank for no sale" />
                        </div>
                      </div>
                      {salePrice && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Sale Start</Label>
                            <Input type="datetime-local" value={saleStart} onChange={(e) => setSaleStart(e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Sale End</Label>
                            <Input type="datetime-local" value={saleEnd} onChange={(e) => setSaleEnd(e.target.value)} />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── INVENTORY ── */}
            <TabsContent value="inventory" className="space-y-6 mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Inventory</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {productType === "variable" ? (
                    <p className="text-sm text-muted-foreground">For variable products, manage stock per variation in the Variations tab.</p>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <Label>SKU <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                        <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. TSHIRT-RED-XL" className="font-mono" />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Track Inventory</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Count stock automatically. Turn off for unlimited/digital items.</p>
                        </div>
                        <Switch checked={trackInventory} onCheckedChange={setTrackInventory} />
                      </div>
                      {trackInventory && (
                        <div className="space-y-1.5">
                          <Label>Stock Quantity</Label>
                          <Input type="number" min="0" value={stock} onChange={(e) => setStock(Number(e.target.value))} />
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── ATTRIBUTES ── */}
            {productType === "variable" && (
              <TabsContent value="attributes" className="space-y-6 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Product Attributes</CardTitle>
                    <p className="text-sm text-muted-foreground">Select which attributes apply and which values to include in variations.</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {attributes.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">No attributes found. <a href={`/vendor/${shopSlug}/products/attributes`} className="underline">Create attributes</a> first.</p>
                      </div>
                    ) : (
                      attributes.map((attr) => {
                        const sel = selectedAttributes.find((a) => a.attributeId === attr.id);
                        const isSelected = !!sel;
                        const items = (attr.items ?? []).sort((a, b) => a.sort_order - b.sort_order);
                        return (
                          <div key={attr.id} className="space-y-3">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleAttributeSelection(attr.id)}
                                id={`attr-${attr.id}`}
                              />
                              <label htmlFor={`attr-${attr.id}`} className="font-medium text-sm cursor-pointer">
                                {attr.name}
                                <Badge variant="secondary" className="ml-2 text-xs capitalize">{attr.attribute_type}</Badge>
                              </label>
                            </div>
                            {isSelected && items.length > 0 && (
                              <div className="ml-6 flex flex-wrap gap-2">
                                {items.map((item) => {
                                  const itemSel = sel?.selectedItemIds.includes(item.id);
                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => toggleItemSelection(attr.id, item.id)}
                                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition-colors ${
                                        itemSel
                                          ? "bg-primary text-primary-foreground border-primary"
                                          : "bg-background text-foreground border-border hover:border-primary"
                                      }`}
                                    >
                                      {attr.attribute_type === "color" && (
                                        <span className="h-3.5 w-3.5 rounded-full border border-white/30 shrink-0" style={{ backgroundColor: item.color_code ?? "#ccc" }} />
                                      )}
                                      {item.value}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                            {isSelected && items.length === 0 && (
                              <p className="ml-6 text-xs text-muted-foreground">No values — add values to this attribute first.</p>
                            )}
                            <Separator />
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* ── VARIATIONS ── */}
            {productType === "variable" && (
              <TabsContent value="variations" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {variations.length > 0 ? `${variations.length} variation(s)` : "No variations yet"}
                  </p>
                  <div className="flex gap-2">
                    {variations.length > 0 && (
                      <Button variant="outline" size="sm" onClick={() => setBulkEditOpen(true)}>
                        <Settings2 className="mr-2 h-4 w-4" />Bulk Edit
                      </Button>
                    )}
                    <Button size="sm" onClick={generateVariations} disabled={selectedAttributes.filter((a) => a.selectedItemIds.length > 0).length === 0}>
                      <Wand2 className="mr-2 h-4 w-4" />Generate Variations
                    </Button>
                  </div>
                </div>

                {variations.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <Wand2 className="h-8 w-8 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Set up attributes in the Attributes tab, then click Generate Variations.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="rounded-md border bg-card overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left p-3 font-medium text-muted-foreground">Variation</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">SKU</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Price (₱)</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Stock</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Image</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Active</th>
                          <th className="w-10 p-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {variations.map((v) => (
                          <tr key={v._key} className="hover:bg-muted/20">
                            <td className="p-3 font-medium min-w-[120px]">
                              {makeVariationLabel(v.attribute_combination)}
                            </td>
                            <td className="p-2 min-w-[110px]">
                              <Input
                                value={v.sku}
                                onChange={(e) => updateVariation(v._key, "sku", e.target.value)}
                                className="h-8 text-xs font-mono"
                                placeholder="SKU"
                              />
                            </td>
                            <td className="p-2 min-w-[100px]">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={v.price}
                                onChange={(e) => updateVariation(v._key, "price", e.target.value)}
                                className="h-8 text-xs"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="p-2 min-w-[80px]">
                              <Input
                                type="number"
                                min="0"
                                value={v.stock_quantity}
                                onChange={(e) => updateVariation(v._key, "stock_quantity", Number(e.target.value))}
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                {v.image_url ? (
                                  <div className="relative h-8 w-8 rounded overflow-hidden border shrink-0">
                                    <Image src={v.image_url} alt="var" fill className="object-cover" sizes="32px" />
                                  </div>
                                ) : null}
                                <label className="cursor-pointer">
                                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border rounded px-2 py-1">
                                    <ImageIcon className="h-3 w-3" />
                                    {v.image_url ? "Change" : "Add"}
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) await handleVariationImageUpload(file, v._key);
                                    }}
                                  />
                                </label>
                              </div>
                            </td>
                            <td className="p-2">
                              <Switch
                                checked={v.is_active}
                                onCheckedChange={(c) => updateVariation(v._key, "is_active", c)}
                              />
                            </td>
                            <td className="p-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => removeVariation(v._key)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Add manual variation */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVariations((prev) => [...prev, {
                    _key: Math.random().toString(36).slice(2),
                    attribute_combination: {},
                    sku: "", price: "", sale_price: "", stock_quantity: 0, image_url: null, is_active: true,
                  }])}
                >
                  <Plus className="mr-2 h-4 w-4" />Add Variation Manually
                </Button>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Categories */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Categories</CardTitle></CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No categories yet. <a href={`/vendor/${shopSlug}/products/categories`} className="underline">Create categories</a>.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`cat-${cat.id}`}
                        checked={selectedCategoryIds.includes(cat.id)}
                        onCheckedChange={() => toggleCategory(cat.id)}
                      />
                      <label htmlFor={`cat-${cat.id}`} className="text-sm cursor-pointer flex-1">
                        {cat.parent ? <span className="text-muted-foreground">{cat.parent.name} › </span> : null}
                        {cat.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Visibility */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Visibility</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">List on Marketplace</p>
                  <p className="text-xs text-muted-foreground">Show in browse and search</p>
                </div>
                <Switch checked={listOnMarketplace} onCheckedChange={setListOnMarketplace} />
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Payment Methods</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {paymentMethods.filter((m) => m.is_active).map((pm) => (
                  <div key={pm.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`pm-${pm.id}`}
                      checked={paymentMethodIds.includes(pm.id)}
                      onCheckedChange={(c) =>
                        setPaymentMethodIds((prev) =>
                          c ? [...prev, pm.id] : prev.filter((id) => id !== pm.id)
                        )
                      }
                    />
                    <label htmlFor={`pm-${pm.id}`} className="text-sm cursor-pointer">{pm.name}</label>
                  </div>
                ))}
                {paymentMethods.filter((m) => m.is_active).length === 0 && (
                  <p className="text-xs text-muted-foreground">No active payment methods.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Edit Variations</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">FILTER BY ATTRIBUTE</p>
              <div className="space-y-2">
                {attrNames.map((attrName) => {
                  const values = [...new Set(variations.map((v) => v.attribute_combination[attrName]).filter(Boolean))];
                  return (
                    <div key={attrName} className="flex items-center gap-2">
                      <Label className="w-24 text-xs shrink-0">{attrName}</Label>
                      <Select
                        value={bulkFilter[attrName] ?? ""}
                        onValueChange={(v) => setBulkFilter((f) => ({ ...f, [attrName]: v === "_all" ? "" : v }))}
                      >
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_all">Any</SelectItem>
                          {values.map((val) => <SelectItem key={val} value={val}>{val}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">{filteredCount} variation(s) will be affected</p>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">SET VALUES (leave blank to keep existing)</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="w-24 text-xs shrink-0">Price</Label>
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-2 text-xs text-muted-foreground">₱</span>
                    <Input type="number" min="0" step="0.01" value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} className="h-8 pl-6 text-xs" placeholder="unchanged" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-24 text-xs shrink-0">Sale Price</Label>
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-2 text-xs text-muted-foreground">₱</span>
                    <Input type="number" min="0" step="0.01" value={bulkSalePrice} onChange={(e) => setBulkSalePrice(e.target.value)} className="h-8 pl-6 text-xs" placeholder="unchanged" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-24 text-xs shrink-0">Stock</Label>
                  <Input type="number" min="0" value={bulkStock} onChange={(e) => setBulkStock(e.target.value)} className="h-8 text-xs flex-1" placeholder="unchanged" />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-24 text-xs shrink-0">SKU</Label>
                  <Input value={bulkSku} onChange={(e) => setBulkSku(e.target.value)} className="h-8 text-xs flex-1 font-mono" placeholder="unchanged" />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-24 text-xs shrink-0">Status</Label>
                  <Select value={bulkActive} onValueChange={(v) => setBulkActive(v as "" | "true" | "false")}>
                    <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="unchanged" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">unchanged</SelectItem>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkEditOpen(false)}>Cancel</Button>
            <Button onClick={applyBulkEdit} disabled={filteredCount === 0}>Apply to {filteredCount} variation(s)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
