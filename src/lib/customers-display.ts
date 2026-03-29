import type { Customer } from "@/actions/customers";

/** Prefer linked account profile for CRM display when `user_id` is set. */
export function resolvedCustomerName(c: Customer): string {
  return c.profiles?.full_name?.trim() || c.name;
}

export function resolvedCustomerAvatarUrl(c: Customer): string | null {
  const u = c.profiles?.avatar_url?.trim();
  return u || null;
}
