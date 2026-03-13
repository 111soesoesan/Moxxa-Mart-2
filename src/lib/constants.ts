export const CATEGORIES = [
  { slug: "electronics", name: "Electronics", icon: "💻" },
  { slug: "fashion", name: "Fashion & Clothing", icon: "👗" },
  { slug: "home", name: "Home & Living", icon: "🏠" },
  { slug: "beauty", name: "Beauty & Health", icon: "💄" },
  { slug: "sports", name: "Sports & Outdoors", icon: "⚽" },
  { slug: "food", name: "Food & Beverages", icon: "🍔" },
  { slug: "books", name: "Books & Education", icon: "📚" },
  { slug: "toys", name: "Toys & Games", icon: "🎮" },
  { slug: "automotive", name: "Automotive", icon: "🚗" },
  { slug: "services", name: "Services", icon: "🛠️" },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "used_like_new", label: "Used – Like New" },
  { value: "used_good", label: "Used – Good" },
  { value: "used_fair", label: "Used – Fair" },
] as const;

export type Condition = (typeof CONDITIONS)[number]["value"];

export const ORDER_STATUSES = [
  { value: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  { value: "confirmed", label: "Confirmed", color: "bg-blue-100 text-blue-800" },
  { value: "processing", label: "Processing", color: "bg-indigo-100 text-indigo-800" },
  { value: "shipped", label: "Shipped", color: "bg-purple-100 text-purple-800" },
  { value: "delivered", label: "Delivered", color: "bg-green-100 text-green-800" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
  { value: "refunded", label: "Refunded", color: "bg-gray-100 text-gray-800" },
] as const;

export const PAYMENT_STATUSES = [
  { value: "unpaid", label: "Unpaid", color: "bg-red-100 text-red-800" },
  { value: "pending_verification", label: "Proof Submitted", color: "bg-yellow-100 text-yellow-800" },
  { value: "paid", label: "Paid", color: "bg-green-100 text-green-800" },
  { value: "refunded", label: "Refunded", color: "bg-gray-100 text-gray-800" },
] as const;

export const SHOP_STATUSES = [
  { value: "draft", label: "Draft", color: "bg-gray-100 text-gray-800" },
  { value: "pending", label: "Pending Review", color: "bg-yellow-100 text-yellow-800" },
  { value: "active", label: "Active", color: "bg-green-100 text-green-800" },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-800" },
  { value: "suspended", label: "Suspended", color: "bg-orange-100 text-orange-800" },
] as const;

export const BILLING_PROOF_STATUSES = [
  { value: "pending", label: "Pending Review", color: "bg-yellow-100 text-yellow-800" },
  { value: "verified", label: "Verified", color: "bg-green-100 text-green-800" },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-800" },
] as const;

export const MAX_PRODUCT_IMAGES = 10;
export const ITEMS_PER_PAGE = 20;

export const SUPABASE_STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public";
