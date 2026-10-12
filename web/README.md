# Streaks Web

Next.js 15 (App Router) + TypeScript + Tailwind + Motion + Zustand + Firebase (Auth, Firestore).
Separate from the Expo mobile app (which lives on its own branch/PR); this folder is self-contained.

## Run
```
cd web && cp .env.example .env.local   # fill public Firebase config (optional: runs as guest-only without it)
npm install && npm run dev
npm run typecheck && npm run lint && npm test && npm run build && npm run e2e
```

## Architecture
- `src/lib/streak.ts`, `habits.ts`: pure logic (ported from the mobile app, plus future-date guards).
- `src/store`: Zustand store persisted to **IndexedDB** (source of truth for the UI; works offline, guest mode).
- `src/lib/sync.ts`: local-first Firestore replica. Union-merge only; one doc per completed day
  (`users/{uid}/habits/{id}/logs/{YYYY-MM-DD}`) so duplicates are impossible and pushes only add history.
- `firestore.rules`: owner-only; log doc id must be a valid day not in the future; logs are append-only;
  `users/{uid}/private/entitlement` is client read-only (Pro can only be granted by trusted server code).
- Pro: UI paywall + gating only. **Payments are not implemented.** The free one-habit limit is client-enforced
  until the payments phase adds a server-side check.

## Deploy (Vercel)
Import the repo, set Root Directory to `web`, add the four `NEXT_PUBLIC_FIREBASE_*` env vars, deploy rules with
`firebase deploy --only firestore:rules`, and add the Vercel domain to Firebase Auth → Authorized domains.
