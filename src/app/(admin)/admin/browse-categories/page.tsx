import { getAllBrowseCategoriesAdmin } from "@/actions/browseCategories";
import { BrowseCategoriesManager } from "@/components/admin/BrowseCategoriesManager";

export default async function AdminBrowseCategoriesPage() {
  const { data, error } = await getAllBrowseCategoriesAdmin();

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <p className="text-destructive text-sm">{error ?? "Could not load categories."}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Browse categories</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Platform-wide categories for shop and product discovery. Vendors assign these on onboarding and in product settings.
        </p>
      </div>
      <BrowseCategoriesManager initialRows={data} />
    </div>
  );
}
