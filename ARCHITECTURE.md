# MemorySherpa — Architecture

## Layers

| Layer | Path | Responsibility |
|-------|------|----------------|
| **Domain** | `lib/domain/` | `NoteBundle`, `NotePage`, `NoteLayer`, `TrashLifecycle`, schedules, ribbon marks |
| **Spacing brain** | `lib/spacing/` | Interval math (every N days, custom 1-3-5-7-14), due checks, advance/reset cycle |
| **Trash lifecycle** | `lib/trash/` | 24h UI expiry, 3-day cloud backup window |
| **Storage API** | `services/storage/` | Local persistence, thumbnails (`expo-image-manipulator`), cloud stub (GCS/Firebase JIT) |
| **Review UX** | `lib/review/` | Blackout countdown, OCR score placeholder |
| **UI** | `app/`, `components/` | Tabs, capture, bundle viewer, annotation canvas, review session, paywall |

## Data flow

1. **Capture** → `appendCaptureToData` groups pages by subject + date into `NoteBundle`.
2. **Thumbnail** → local mini file; master queued for `syncAllPending`.
3. **Dashboard (Today's review header)** → `DateRibbon` from `firstLaunchDate` through **local today** (`hooks/useLocalCalendarDay.ts`); due items via `lib/spacing/engine` + `ribbon.ts` marks; JIT `fetchMasterAsset` on review open.
4. **Trash** → `TrashLifecycle` with snapshot restore within 3 days.

## Freemium

- Free: 300 images (pages), 100 memos (bundles with text/ink).
- `PaywallSheet` on limit breach.

## Cloud (stub)

Set `EXPO_PUBLIC_FIREBASE_ENABLED=true` and wire credentials in `services/storage/cloud-provider.ts` for production sync.
