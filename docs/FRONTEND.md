# Frontend

Next.js 16 static export, React 19, Tailwind v4, TanStack Query, `genlayer-js`.

| Route | Purpose |
|---|---|
| `/` | Landing page with live stats and the 3D escrow scene |
| `/dashboard` | Protocol stats, status donut, payout histogram, top providers |
| `/orders` | Order book with server-side pagination and status filter |
| `/orders/new` | Create an order and lock escrow |
| `/orders/detail?id=` | Order page: verdict gauge, criteria checklist, timeline, role-aware actions |
| `/providers/detail?address=` | Provider reputation and orders |
| `/leaderboard` | On-chain ranked providers |
| `/lifecycle` | Interactive state machine with replayable scenarios |
| `/docs` | Full in-app documentation |

## Visual effects and performance

- The WebGL scene loads Three.js lazily, only when scrolled into view, and
  only if WebGL works. Otherwise a static fallback is shown.
- Tilt and reveal effects are CSS/IntersectionObserver based and switch off
  under `prefers-reduced-motion`.
- Lists read one page at a time (`get_orders_page`); counters come from
  `get_stats` instead of scanning every order.
- No page-level infinite animation.

## Commands

```bash
cd frontend
npm run dev     # dev server
npm run lint    # tsc --noEmit
npm test        # vitest (43 tests)
npm run build   # static export to frontend/out
```

Set `NEXT_PUBLIC_CONTRACT_ADDRESS` to the **v2** deployment address.
