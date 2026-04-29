# Task 6: Undo/Redo History for Block Editor

## Status: Complete ✅

## Changes Made

### File: `src/components/editor/block-editor.tsx`

#### 1. Import `showToast`
- Added `showToast` to the import from `@/store/app-store` (alongside existing `useAppStore`)

#### 2. History Stack Infrastructure (lines ~890-944)
- **`blocksRef`**: `useRef<Block[]>` synced with current `blocks` state via `useEffect` — avoids stale closure issues
- **`historyRef`**: `useRef<{ past: Block[][]; future: Block[][] }>` — holds undo/redo snapshots
- **`pushHistory()`**: Deep-clones current blocks via `JSON.parse(JSON.stringify(blocksRef.current))`, pushes to `past`, caps at 50 entries, clears `future`
- **`undo()`**: Pops from `past`, pushes current to `future`, restores blocks, shows "Undone" toast (1500ms)
- **`redo()`**: Pops from `future`, pushes current to `past`, restores blocks, shows "Redone" toast (1500ms)
- All three use `useCallback` with no dependencies (read from refs)

#### 3. Keyboard Handler (lines ~925-944)
- Global `keydown` listener on `document`
- `Ctrl/Cmd + Z` → undo
- `Ctrl/Cmd + Shift + Z` → redo
- `Ctrl/Cmd + Y` → redo (Windows convention)
- Only fires when `(metaKey || ctrlKey)` is held to avoid conflicts
- `e.preventDefault()` called before executing undo/redo

#### 4. Integration Points — `pushHistory()` called before:
- `updateContent` — before changing block content
- `updateType` — before changing block type (including divider content clearing)
- `toggleChecked` — before toggling todo checkbox
- `deleteBlock` — before deleting a block
- `duplicateBlock` — before duplicating a block
- `handleDragEnd` — before DnD reorder

#### 5. History Reset on Fetch
- After `setBlocks(data)` in the initial fetch effect, history is reset: `historyRef.current = { past: [], future: [] }`

#### 6. Dependency Arrays Updated
- All callbacks that use `pushHistory` now include it in their `useCallback` deps

## Lint Results
- **0 errors, 0 warnings** — `bun run lint` passes cleanly

## Dev Server
- Compiles successfully, no issues
