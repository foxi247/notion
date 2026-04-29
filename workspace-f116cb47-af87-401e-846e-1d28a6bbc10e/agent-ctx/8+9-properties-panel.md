# Task 8+9: Page Properties Panel & Markdown Export

## Summary
Added a page properties/cover panel as a slide-out Sheet from the right side, plus Markdown export functionality.

## Changes Made

### 1. Database Schema (`prisma/schema.prisma`)
- Added `cover String?` field to the `Page` model for storing gradient cover class names
- Ran `bun run db:push` to sync schema

### 2. API Routes
- **`src/app/api/pages/route.ts`** (PATCH): Added `cover` to destructured body and spread into update data
- **`src/app/api/pages/[id]/route.ts`** (PUT): Added `cover` to destructured body and spread into update data

### 3. Store (`src/store/app-store.ts`)
- Added `cover: string | null` to the `PageItem` interface

### 4. New Component: `src/components/shared/page-properties-panel.tsx`
- Sheet-based slide-out panel (320px/360px) from the right
- **Cover Image section**: 6 preset gradient swatches + "None" button. Clicking a gradient saves it to the DB; clicking the active gradient removes the cover
- **Icon picker**: 17 emoji grid, persists selection via API
- **Title editor**: Input + Save button, persists via PATCH
- **Page Type**: Read-only badge (Note / Task List / Kanban Board / Calendar)
- **Created/Updated dates**: Formatted with `toLocaleDateString`
- **Export as Markdown**: Fetches blocks via `/api/pages/{id}/blocks`, converts to .md with proper heading/todo/list/quote/code/divider formatting, triggers browser download
- **Delete Page**: Destructive action, removes from store, navigates away, shows toast
- State syncs with page changes via `useEffect`

### 5. Integration in `src/app/page.tsx`
- Imported `PagePropertiesPanel` and `Info` icon
- Added `cn` utility import
- Added `cover: string | null` and `onOpenProperties?: () => void` to `PageHeaderViewProps`
- Added cover gradient display in `PageHeaderView` (absolute positioned at top, with conditional padding)
- Added "Properties" button with Info icon next to breadcrumb (hidden text on mobile)
- Added `propertiesOpen` state in `WorkspaceView`
- Passed `cover` and `onOpenProperties` to all 3 `PageHeaderView` usages (note, task, calendar)
- Rendered `PagePropertiesPanel` in `WorkspaceView` when `activePage` exists

## Lint Result
**0 errors, 0 warnings** — `bun run lint` passes cleanly.
