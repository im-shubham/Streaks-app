# Streaks

Minimalist, dark, hold-to-log habit tracker. Expo (TypeScript) · Zustand · Reanimated · expo-haptics · Firebase · AdMob.

## Run
```bash
cp .env.example .env   # optional: Firebase + AdMob ids
npm install
npx expo prebuild      # AdMob needs a dev build; Expo Go won't load it
npm run android        # or ios
npm test               # streak, merge and store/persistence tests
npm run typecheck
npm run lint
```

## What's in the PRD and where
| PRD | Code |
|---|---|
| Onboarding "What are we tracking?" | `src/screens/Onboarding.tsx` |
| Hold-to-log, reverses on early release, haptics | `src/components/HoldButton.tsx` |
| Streak counter + 7-day dots | `src/screens/Home.tsx`, `DotTracker.tsx` |
| Dashboard: ring, stat cards, heatmap, native ad | `src/screens/Dashboard.tsx` + components |
| `+` → paywall (free = 1 habit) | `App.tsx`, `store/useStore.ts` |
| ₹49 / ₹199 anchors, ₹399 lifetime | `src/lib/purchases.ts`, `screens/Paywall.tsx` |
| Pro: no ads, unlimited habits, neon themes | `useStore.isPro`, `theme.ts` |

## Sync model
Device storage (Zustand + AsyncStorage) is the source of truth and works fully offline. Firestore mirrors habits in the background: pushes use per-habit map fields with `arrayUnion`, remote data is union-merged into local, so neither side can erase the other's history. `isPro` is never synced. Deploy `firestore.rules` with your Firebase project (not yet tested against the emulator).

## Deliberate deviations / still open
- **Animation:** the fill-rising disc is pure Reanimated. No Lottie/Rive sandglass asset yet.
- **Payments are a stub** (`purchase()` only succeeds in `__DEV__`). `isPro` is stored locally and is spoofable until server-verified purchases exist.
- **Pro extras not built:** custom app icons and home-screen widgets.
- Ads use Google's test ids until real ids are set; no consent/ATT flow yet. Ads silently don't render in Expo Go (native module absent); use a dev build.
- Anonymous Firebase accounts are lost on reinstall (cloud copy orphaned) until real sign-in is added.
- No habit-switcher screen yet (Pro users can add habits but only the newest is shown).
- Never run on a device/emulator in CI-less sessions: verified by typecheck, lint, unit tests and an Android Metro/Hermes bundle only.
