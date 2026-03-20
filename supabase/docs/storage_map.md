# Moxxa Mart — Storage Map

Supabase Storage is used for all user-uploaded media. Files are stored as objects in named buckets. The storage schema lives in Supabase's internal `storage` schema.

---

## Buckets

| Bucket ID | Public | Purpose |
|---|---|---|
| `product-images` | ✅ Yes | Product photos uploaded by vendors |
| `shop-assets` | ✅ Yes | Shop logos, cover images, banners |
| `blog-images` | ✅ Yes | Blog post images (created via Dashboard) |
| `payment-proofs` | ❌ No | Customer payment proof uploads (bank transfer receipts) |
| `billing-proofs` | ❌ No | Vendor billing proof uploads (subscription payments) |

---

## Access Model Per Bucket

### product-images (Public)
- **Read**: Anyone — CDN-accessible URLs for all product images
- **Upload**: Authenticated users only — vendors upload via dashboard
- **Delete**: Authenticated users only

### shop-assets (Public)
- **Read**: Anyone — CDN-accessible URLs for logos and banners
- **Upload**: Authenticated users only

### blog-images (Public)
- **Read**: Anyone (inherits from public bucket setting)
- **Upload/Delete**: ⚠️ No explicit storage policies defined in migrations
- **TODO**: Add storage policies if blog image upload is implemented in the app

### payment-proofs (Private)
- **Read**: Authenticated users only — vendors and admins access via service role
- **Upload**: Anyone (including guests) — supports guest checkout proof upload
- **Note**: This is intentionally permissive for upload so guests can submit payment evidence. Access control relies on application-layer logic to ensure vendors only see their own order proofs.

### billing-proofs (Private)
- **Read**: Authenticated users only
- **Upload**: Authenticated users only — vendors upload their subscription payment screenshots

---

## File Path Conventions

File paths within each bucket follow these conventions in the application code:

```
product-images/  <shop_slug>/<product_id>/<filename>
shop-assets/     <shop_slug>/logo.<ext>
shop-assets/     <shop_slug>/cover.<ext>
shop-assets/     <shop_slug>/banner.<ext>
payment-proofs/  <order_id>/<filename>
billing-proofs/  <shop_id>/<filename>
```

Public URLs are constructed as:
```
https://vktnmqvrpusnfewxevlb.supabase.co/storage/v1/object/public/<bucket>/<path>
```

---

## Security Notes

1. **Public buckets expose all objects** — any file in `product-images` or `shop-assets` is publicly accessible if someone guesses the URL. Sensitive files must never be placed in public buckets.

2. **Payment proof upload is open** — `payment-proofs` accepts uploads from anyone (`WITH CHECK (TRUE)`). The application generates a unique path per order to prevent collisions. Storage policies do not prevent overwrites if the same path is used.

3. **No UPDATE or DELETE policies on storage objects** — object management (deletion) should be done server-side via the service role when a product or shop is deleted. Storage objects are not automatically cleaned up by FK CASCADE.

4. **blog-images bucket** — this bucket exists (created via dashboard) but has no corresponding storage policies in the migration files. It currently relies on the public bucket default. Explicit policies should be added for upload/delete to prevent anonymous overwrites.
