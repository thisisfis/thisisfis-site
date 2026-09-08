# Wishlist /40 — maintenance workflow

This is an internal maintenance note for ChatGPT/Codex. It is not linked from the public page.

## Public behavior

- Public URL: `https://thisisfis.com/40/`
- Keep the page `noindex, nofollow, noarchive`.
- Reservation is anonymous: never ask for a name, email, phone, Telegram handle or other identifier.
- The browser generates a random secret token. Only its SHA-256 hash is sent to the reservation RPC; the original token stays in `localStorage` so the same browser can remove its own reservation.
- A Supabase publishable key may be present in client code; never expose a service-role key or another secret in the repository/client.

## Catalog source of truth

Public catalog data lives in `40/gifts.js` and is rendered by `40/index.html`.

Each gift uses roughly this shape:

```js
{
  code: 'unique-kebab-code',
  title: 'Product name',
  subtitle: 'Short factual description',
  price: 1990,
  shop: 'Store',
  category: 'tech', // tech | diy | design
  star: true,       // optional
  delivery: 'Short practical hint',
  why: 'Specific giver-facing reason this fits Sergey',
  buyUrl: 'https://product-or-useful-store-page',
  imageSrc: 'https://stable-image-url' // optional
}
```

If `imageSrc` is absent, the page uses the Supabase `birthday40-wishlist` image endpoint keyed by `code`. The image endpoint may scrape an `og:image`; if that fails, it deliberately returns a branded placeholder instead of breaking the card.

## Public description rule

The `why` field is public and written for friends, colleagues and other gift-givers. It should explain, in ordinary language, **why this item may suit Sergey** and what aspect of his tastes/work/interests makes it a plausible gift.

Never mention or imply the assistant's internal selection process. Public copy must not contain phrases or ideas such as:

- "из старого контекста", "по контексту", "из наших чатов";
- "память ChatGPT", "глобальный контекст", "профиль пользователя";
- "я выбрал это потому что знаю...";
- chronology of private conversations or how a fact was retrieved.

Do not expose private or sensitive personal facts in `why`. Use only a natural, socially appropriate level of detail that Sergey could comfortably show to a mixed group of friends, colleagues and acquaintances.

Keep `why` approximately the current card length: usually 2–3 compact sentences, specific enough to justify the choice but short enough to scan.

## Curation principle

The wishlist is a curated idea list, not a live inventory monitor. Do **not** spend time continuously refreshing old prices, stock or delivery labels. A product card may become stale; a giver can use the model/title as a search lead and find the same item or a sensible equivalent.

When adding new items, current Russian availability and a useful purchase page are desirable, but context-fit and variety matter more than maintaining perfect real-time commerce data.

## Context order

When the user asks for more gifts and specifically wants breadth, do not overfit to the most recent chats. Prefer this process:

1. Retrieve non-sensitive global ChatGPT context about Sergey.
2. Deliberately start from the oldest useful context and move forward through later interests/projects.
3. Build a varied idea pool before searching products.
4. Avoid using or exposing sensitive information such as health, sex/relationship details, finances, politics, authentication data, or private identifiers.
5. Check the existing catalog and reject duplicates and near-duplicates.

Useful long-running themes include, when actually supported by context: graphic/product/industrial design, print and physical production, ThisisFiS/merch, programming and physical controls, AI as a working tool, music/audio, photography and visual experiments, travel, retro technology and retrofuturism, books/visual culture, compact tools, tactile desk objects, electronics/prototyping, and clever objects with a strong concept.

Avoid generic anniversary souvenirs, motivational mugs, random low-quality novelty clutter, or fifteen variants of the same recent obsession.

## Command: add more gifts

When the user asks to add N more gifts:

1. Read `40/gifts.js` first.
2. Use the context-order rule above.
3. Find approximately the requested price band (default 300–5000 RUB unless the user changes it).
4. Prefer Russian shops/marketplaces or pages that give a giver a practical route to buying the item. A durable model/product page is acceptable even if a particular seller later disappears.
5. Add exactly N distinct ideas unless the user asks otherwise.
6. Write every `why` using the public description rule above.
7. Append them to `40/gifts.js` and preserve the existing card schema and filters.
8. Add every new `code` to the allowlist in `public.birthday40_reserve` via a Supabase migration.
9. Add every new item to the `birthday40-wishlist` Edge Function image catalog unless it has a stable `imageSrc` in `gifts.js`.
10. Let the normal GitHub → Vercel deployment run and check deployment status.

## Reservation security invariants

Do not weaken these without an explicit user request:

- no personal identifier is requested for reservations;
- no raw reservation token is sent to Supabase;
- direct table access remains protected by RLS/grants; public interaction goes through narrow RPC functions;
- do not expose service-role credentials;
- do not reveal who reserved a gift; there intentionally is no public identity attached to reservations.
