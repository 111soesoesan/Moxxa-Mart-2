# Moxxa Mart — Design System

## 1. North star: minimal, friendly marketplace UI

The product should feel **clean and approachable**, similar in spirit to large consumer delivery marketplaces: **lots of white space**, **simple shapes**, **soft elevation**, and **one warm accent** for actions—not a stark “editorial gallery” or overly futuristic chrome.

- **Friendly** beats **clever**: plain language, obvious primary actions, predictable layouts.
- **White-first**: pages read as light surfaces; color is for meaning (CTA, links, key prices), not decoration.
- **Components, not bespoke CSS**: build screens from **shadcn/ui** primitives and **Tailwind** utilities that map to theme tokens.

---

## 2. Theme tokens (shadcn / CSS variables)

All color, radius, and shadow decisions should flow through **semantic variables** defined in `src/app/globals.css` and consumed as Tailwind classes (`bg-primary`, `text-muted-foreground`, `border-border`, `shadow-md`, etc.).

### Color roles

| Token | Role |
|--------|------|
| `background` | Page canvas (white / near-white). |
| `foreground` | Default body text (soft black, not pure `#000`). |
| `primary` / `primary-foreground` | **Only brand accent** — primary buttons, key highlights, active affordances. |
| `muted` / `muted-foreground` | Secondary surfaces and helper text. |
| `card` / `card-foreground` | Raised panels (product cards, sheets, dialogs). |
| `border`, `input`, `ring` | Edges and focus; `ring` should feel related to `primary` for focus visibility. |
| `destructive` | Errors and irreversible actions only. |
| `accent` / `accent-foreground` | Subtle hover/selected backgrounds (keep neutral; do not introduce a second brand hue). |
| `sidebar-*` | Vendor/admin shell; align key accents with `primary` where it helps recognition. |

**Do not** add extra brand colors in components—use `primary` for “this is the main action or emphasis.”

### Radius

Use **`--radius`** via Tailwind: `rounded-md`, `rounded-lg`, `rounded-xl` as documented for shadcn components. Keep radii **moderate and consistent** (friendly, not pill-everything).

### Shadows

Depth comes from **tokenized shadows** (`shadow-xs` … `shadow-xl`), not heavy borders everywhere.

- **Cards, dropdowns, popovers, sheets**: prefer `shadow-sm` / `shadow-md` on a white `card` over thick border rings.
- **Flat lists** on `background` can stay borderless or use a single light `border-border` when separation is needed.

Charts and data viz may use `chart-1` … `chart-5` where multiple series need distinction; they are not part of the brand accent story.

---

## 3. Typography

- **Default UI type**: the app uses the **root layout font** (Geist Sans via Next.js) with **normal weights** and **no display-only treatments** unless a specific marketing page calls for it.
- **Hierarchy** via size and weight from Tailwind (`text-sm`, `text-base`, `font-medium`, `font-semibold`)—not via decorative families or tight “magazine” display locking.
- **Mono** is for code, IDs, and technical strings only (`font-mono` / Geist Mono).

Avoid secondary serif stacks for general UI; keep reading surfaces simple and familiar.

---

## 4. Components (shadcn)

Prefer these building blocks from `src/components/ui/`:

- **Layout & structure**: `Card`, `Separator` (sparingly), `Sheet`, `Dialog`, `ScrollArea`.
- **Actions**: `Button` (`default` = primary accent, `outline` / `secondary` / `ghost` for everything else), `DropdownMenu`.
- **Forms**: `Input`, `Textarea`, `Label`, `Select`, `Checkbox`, `Switch` — flat fields on white/neutral with clear focus rings.
- **Feedback**: `Alert`, `Sonner` toasts, `Skeleton` for loading.
- **Navigation**: `Tabs`, `NavigationMenu` / simple links with `text-primary` where appropriate.

**Buttons:** one strong **primary** per viewport section when possible; secondary actions use `variant="outline"` or `ghost`.

**Cards:** white (`card`) + light shadow; images use the same radius language as the card.

**Badges / status:** use shadcn `Badge` and existing patterns; keep chroma low except when mirroring `primary` for emphasis.

---

## 5. Foodpanda-like patterns (behavioral, not a clone)

- **Clear hierarchy**: big product/shop name, price in `primary` or bold `foreground`, supporting text in `muted-foreground`.
- **Trust through clarity**: delivery/payment info in scannable blocks, not dense legal walls.
- **Mobile-first density**: comfortable tap targets (`min-h` on buttons), stacked sections, drawers for cart and filters.

---

## 6. Do / Don’t

### Do

- Use **`bg-background`**, **`bg-card`**, and **`shadow-*`** to separate layers before adding borders.
- Use **`primary`** for “Add to cart”, “Checkout”, “Submit”, and other **main conversion** actions.
- Reuse **shadcn patterns** so vendor, admin, and customer areas feel like one product.

### Don’t

- Don’t introduce **extra accent colors** for ordinary UI (no rainbow status colors except semantic success/warn/destructive where already established).
- Don’t use **pure black** for body copy; stick to `foreground`.
- Don’t rely on **decorative icons**; use **lucide** (or your icon set) at consistent stroke/size, monochromatic unless the icon is the primary CTA.
- Don’t default every card to **heavy border + heavy shadow**; pick one primary cue (usually shadow on white).

---

## 7. Files to touch

| File | Purpose |
|------|---------|
| `src/app/globals.css` | Canonical `:root` / `.dark` tokens, shadows, radius, fonts. |
| `src/app/layout.tsx` | Font loading (Geist); body classes. |
| `src/components/ui/*` | shadcn primitives—prefer token-based classes over hard-coded hex. |

When adding new surfaces, extend the theme in **globals.css** first, then expose via Tailwind if needed—avoid one-off colors in feature code.
