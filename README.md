# TripSync — Plan Together. Travel Better. Split Fairly.

Group trip planner: destination voting, budget compatibility, shared itinerary, transport/stay comparison,
expense splitting and a settlement optimizer. React 18 + Vite + TypeScript + Tailwind, with a Supabase schema.

## Quick start (demo mode, no accounts needed)

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests for splits, balances and settlements
npm run build      # typecheck + production build
```

Open the app and click **Continue as Harsha (demo)**. A four-friend Bengaluru → Coorg trip is preloaded, including
one member with a much lower budget, unequal splits and a paise-rounding case. Join code: `COORG-4F7K`.

### What is real and what is not

| Area | Status |
|---|---|
| Trips, voting, itinerary, transport, stays, expenses, splits, settlements, budget, chat, decisions, summary, CSV, print | Fully working; **data is stored in your browser's localStorage** (demo mode) |
| Settlement math (equal / percentage / exact / excluded participants, paise rounding, greedy minimal transfers) | Implemented in `src/lib/split.ts` and `src/lib/settle.ts`, 13 unit tests |
| Supabase email/password auth, password reset | Wired in `src/auth.tsx`, active only when `.env.local` is configured |
| **Cloud sync of trip data** | **Not wired.** The SQL schema, RLS and seed are provided, but the UI reads/writes the local store. A data adapter (replacing `src/store.tsx` with Supabase queries + Realtime) is the next step |
| Email / push notifications, receipt uploads, maps, routing, booking, payments | **Not implemented.** Notifications are in-app only. "Booked" and "paid" are member-reported flags, never verified |
| Destination photos | Paste an image URL per destination; otherwise a gradient cover is shown |
| Drag-and-drop itinerary reordering | Not implemented; activities sort by day and time |

In demo mode, login does not check passwords and sign-up creates a local-only profile. Do not enter real secrets.

## Supabase setup (auth + database)

1. Create a project at supabase.com.
2. SQL editor: run `supabase/migrations/0001_schema.sql`, then `0002_rls.sql`, then optionally `supabase/seed.sql`.
3. Authentication → Providers: enable **Email**. Set Site URL to your dev/prod URL (needed for password-reset links).
4. Copy `.env.example` to `.env.local` and fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Project settings → API → anon key).
5. Realtime (for the future data adapter): Database → Replication → enable the tables you want to broadcast.
6. Restart `npm run dev`. The "Demo mode" banner disappears and login uses Supabase Auth.

**Never** put the `service_role` key in a `VITE_` variable or any frontend file.

### Security model (see `0002_rls.sql`)
- RLS is on for every table. `is_trip_member()` gates all trip-scoped data, so changing a URL/ID reveals nothing.
- Joining requires the `join_trip_by_code()` RPC, which validates the code server-side.
- Only the creator or organizer can edit/delete an expense; votes can only be cast as yourself; only the payer can record a settlement and only the receiver can confirm it.
- Storage buckets are private; object paths must start with a trip ID you belong to (avatars: your user ID).
- Split totals are enforced in the database by a deferred constraint trigger.

## Integrations needing external keys (none are enabled)
Maps/routing (e.g. Mapbox/Google), destination data API, transactional email (e.g. Resend), push notifications, payment provider (e.g. Razorpay/Stripe), flight/hotel booking APIs.

## Project layout
```
src/lib/        money, split engine, settlement optimizer (+ tests), supabase client, helpers
src/store.tsx   local persistent store (demo mode)      src/auth.tsx  demo/Supabase auth
src/demo.ts     seed dataset (all totals are derived from it)
src/pages/      Public, Core (dashboard/new trip/profile/notifications), Planning, Logistics, Money, Social
supabase/       migrations/0001_schema.sql, 0002_rls.sql, seed.sql
```

## Troubleshooting
- **Blank page / stale data**: clear localStorage key `tripsync.v1` or use "Reset demo data" in the sidebar.
- **Join link says invalid**: codes are case-insensitive but must match an existing trip in *this* browser's storage (demo mode).
- **Supabase login fails**: confirm the email provider is on, the email is confirmed, and the anon key is correct.
- **`npm run build` chunk-size warning**: harmless; split with dynamic imports if desired.
