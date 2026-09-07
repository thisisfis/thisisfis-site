# Wishlist /40 — maintenance workflow

This file is an internal maintenance note for ChatGPT/Codex. It is not linked from the public page.

## Public behavior

- Public URL: `https://thisisfis.com/40/`
- The page is `noindex, nofollow, noarchive`.
- Reservation is anonymous: do not ask for a name, email, phone number, Telegram handle or other identifier.
- The browser generates a random secret token. Only its SHA-256 hash is sent to the reservation RPC; the original token stays in `localStorage` so the same browser can remove its own reservation.
- The Supabase publishable key may be present in client code; never put a service-role key or other secret in the repository/client.

## Catalog source of truth

Public catalog data lives in:

`40/gifts.js`

The public page `40/index.html` renders `window.WISHLIST_GIFTS`.

Each gift uses:

```js
{
  code: 'unique-kebab-code',
  title: 'Product name',
  subtitle: 'Short factual description',
  price: 1990,
  shop: 'Store',
  category: 'tech', // tech | diy | design; extend UI filters only if genuinely useful
  star: true,       // optional
  delivery: 'Москва: 1–2 дня',
  why: 'Short, specific reason this fits Sergey',
  buyUrl: 'https://direct-product-page',
  imageSrc: 'https://stable-image-url' // optional
}
```

If `imageSrc` is absent, the page uses the existing Supabase image endpoint keyed by `code`. For newly added gifts, prefer a stable direct image URL from the manufacturer/store when available; this avoids needing to edit the image proxy.

Update `window.WISHLIST_META.verifiedAt` every time the catalog is materially rechecked.

## Command: add 15 more gifts

When the user asks to add 15 more gifts (or equivalent wording), execute the full workflow autonomously:

1. Retrieve current non-sensitive global ChatGPT context about Sergey that can materially improve gift selection. Do not use or expose health, sex/relationship, financial, political, authentication or other sensitive information.
2. Read the current `40/gifts.js` first and avoid duplicates both by exact product and by near-identical idea.
3. Search live Russian marketplaces and shops. Requirements inherited from the original wishlist:
   - exactly 15 new items unless the user asks otherwise;
   - price 300–5000 RUB;
   - actually in stock at the time of verification;
   - delivery to Moscow within 3 days;
   - direct product URL, not a search-results URL;
   - usable product image;
   - varied price points and categories.
4. Selection quality matters more than filling categories. Favor things supported by global context: compact well-designed hardware, industrial/product/graphic design, AI/creative tooling, electronics and physical prototyping, retrofuturism/engineering aesthetics, tactile desk objects, visual culture, photography/media experimentation, strong books and genuinely useful oddities. Avoid generic anniversary souvenirs, low-quality novelty clutter and repetitive variants of items already present.
5. For each candidate verify current price, availability and delivery immediately before adding it. If any constraint cannot be verified, reject the candidate and find another.
6. Append the 15 items to `40/gifts.js`, update `verifiedAt`, and preserve the existing visual/card schema.
7. Reservation RPC currently validates gift codes with a server-side allowlist. Add every new `code` to the allowlist in `public.birthday40_reserve` via a Supabase migration before considering the update complete.
8. If a new item has no `imageSrc`, also add it to the `birthday40-wishlist` Edge Function image catalog, or replace it with a stable `imageSrc` in `gifts.js`.
9. Deploy via the normal GitHub → Vercel flow and verify `/40/` loads, all new images render, filters count correctly, buy links open, and reservation/status calls still work.

## Reservation security invariants

Do not weaken these without an explicit user request:

- no personal identifier is requested for reservations;
- no raw reservation token is sent to Supabase;
- direct table access stays protected by RLS/grants; public interaction goes through the narrow RPC functions;
- do not expose service-role credentials;
- do not reveal who reserved a gift (there is intentionally no such public identity now).
