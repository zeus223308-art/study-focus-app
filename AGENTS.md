# MemorySherpa — Agent handoff

> **Cursor:** `.cursor/rules/memorysherpa-context.mdc` is `alwaysApply: true` — agents should load this file automatically; use this doc for deeper detail.

**Repo:** `C:\Users\codib\study-focus-app` (Expo SDK ~56, React Native, `expo-router`)

Read Expo v56 docs: https://docs.expo.dev/versions/v56.0.0/

## Product

English-brand memorization app (**MemorySherpa**). Orange accent `#FF6B00` on beige `#F9F8F6`. Local-first storage; cloud/Firebase/OCR/ads are stubs.

## Navigation (current)

| Tab | Route | Label | Notes |
|-----|-------|-------|-------|
| Dashboard | `app/(tabs)/index.tsx` | Dashboard | Screen **title** stays **Today's review** |
| Files | `app/(tabs)/vault.tsx` | Files | |
| Camera | `app/(tabs)/capture.tsx` | Camera | Dedicated tab (no FAB) |
| Settings | `app/(tabs)/settings.tsx` | Settings | Review patterns, language, limits |

i18n: `tabs.dashboard` / `tabs.settings` / `dashboard.title` in `i18n/locales/en.json` & `ko.json`.

## Date ribbon (important UX)

**Files:** `components/dashboard/DateRibbon.tsx`, `lib/domain/dates.ts`, `lib/domain/ribbon.ts`, `hooks/useLocalCalendarDay.ts`

- **Swipe:** manual pan (native + web mouse); release snaps to **center** chip; soft ease-out ~400ms.
- **Tap:** selects date only — **does not** scroll ribbon (no left-align jump).
- **Range:** `firstLaunchDate` → **local today only** (no future days). Uses device timezone (`date-fns` `startOfDay`, not UTC `toISOString`).
- **Midnight:** `useLocalCalendarDay` schedules local midnight + `AppState` resume; new day chip appears; if user had “today” selected, selection advances to new today (`AppContext`).
- **Marks:** `buildDateRibbonMarks` in `lib/domain/ribbon.ts` — needs `startOfDay` import from `date-fns`.

**Context:** `AppContext` exposes `localToday`, `selectedDate`, `ribbonMarks`, `dueSelected`.

## Domain layout (v4)

| Layer | Path |
|-------|------|
| Types | `lib/domain/types.ts` — `AppSettings.firstLaunchDate`, bundles, trash |
| Dates | `lib/domain/dates.ts` — `todayKey()`, `buildRibbonDays()`, `normalizeAppSettings()` |
| Storage | `services/storage/local-provider.ts`, `migration.ts` |
| State | `context/AppContext.tsx` |
| Spacing | `lib/spacing/engine.ts` |

Legacy `lib/defaults.ts`, `lib/storage.ts` removed — use `lib/domain/` + `services/storage/`.

## Web preview

- `components/MobileWebFrame.tsx`, `app/+html.tsx` — phone-width frame on web.
- `lib/notifications.ts` — native only; guarded on web (fixes dashboard crash).

## Session history (May 2026)

Built/refined: full app shell, vault/capture/review, DateRibbon, first-launch date anchor, tab rename (Today's review → header only; Dashboard/Settings tabs), center snap, no future dates, local calendar rollover.

## Not done / known issues

- Firebase/GCS sync, real OCR, ads, drag-drop folders, EAS production builds.
- Occasional TS noise on `DateRibbon` web `cursor` styles / `.expo/types/router.d.ts`.

## Auto save, commit, push, deploy

| Step | What |
|------|------|
| **Editor** | `.vscode/settings.json` — `files.autoSave` after 1s |
| **Agent** | `.cursor/rules/auto-commit-deploy.mdc` + `memorysherpa-context.mdc` — after code changes in Cursor, commit + push `main` unless user says not to |
| **CI** | `.github/workflows/deploy-web.yml` on push to `main` |
| **Live URL** | https://zeus223308-art.github.io/study-focus-app/ |

Local web preview: `npx expo start --web --port 8082`

## Dev commands

```powershell
cd C:\Users\codib\study-focus-app
npx expo start --web --port 8082
npx tsc --noEmit
```

## Where to look first

1. User reports ribbon/date bug → `DateRibbon.tsx` + `dates.ts` + `useLocalCalendarDay.ts`
2. Tab/label copy → `i18n/locales/*.json` + `app/(tabs)/_layout.tsx`
3. Due items for selected day → `AppContext` `dueSelected` + `getDueBundlesForDate`
4. Persistence / migration → `services/storage/`

See also `ARCHITECTURE.md` for layer diagram.
