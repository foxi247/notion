'use client'

import {
  useState, useEffect, useRef, useCallback, KeyboardEvent, useId,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GripVertical, Plus, Trash2, ChevronDown, Copy, Check,
  Bold, Italic, Underline, Strikethrough, Code, Link,
  Sparkles, ImageIcon, Hash, Quote, List, ListOrdered,
  AlignLeft, Minus, Megaphone, Type,
} from 'lucide-react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable,
  sortableKeyboardCoordinates, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAppStore, type Block } from '@/store/app-store'

// ─── Types ────────────────────────────────────────────────────────────────────
type BlockType =
  | 'text' | 'h1' | 'h2' | 'h3'
  | 'todo' | 'bulleted' | 'numbered'
  | 'quote' | 'code' | 'callout' | 'divider' | 'image'

interface SlashItem {
  type: BlockType
  label: string
  description: string
  icon: React.ReactNode
  shortcut?: string
}

const SLASH_ITEMS: SlashItem[] = [
  { type: 'text',     label: 'Text',          description: 'Plain paragraph',       icon: <Type className="w-4 h-4" /> },
  { type: 'h1',       label: 'Heading 1',     description: 'Large section header',  icon: <Hash className="w-4 h-4" />, shortcut: 'h1' },
  { type: 'h2',       label: 'Heading 2',     description: 'Medium section header', icon: <Hash className="w-3.5 h-3.5" />, shortcut: 'h2' },
  { type: 'h3',       label: 'Heading 3',     description: 'Small section header',  icon: <Hash className="w-3 h-3" />, shortcut: 'h3' },
  { type: 'todo',     label: 'To-do',         description: 'Checkbox task item',    icon: <Check className="w-4 h-4" /> },
  { type: 'bulleted', label: 'Bulleted list',  description: 'Simple bullet list',    icon: <List className="w-4 h-4" /> },
  { type: 'numbered', label: 'Numbered list',  description: 'Ordered list',          icon: <ListOrdered className="w-4 h-4" /> },
  { type: 'quote',    label: 'Quote',         description: 'Blockquote',            icon: <Quote className="w-4 h-4" /> },
  { type: 'code',     label: 'Code',          description: 'Code block',            icon: <Code className="w-4 h-4" /> },
  { type: 'callout',  label: 'Callout',       description: 'Highlighted note',      icon: <Megaphone className="w-4 h-4" /> },
  { type: 'divider',  label: 'Divider',       description: 'Horizontal rule',       icon: <Minus className="w-4 h-4" /> },
  { type: 'image',    label: 'Image',         description: 'Image via URL',         icon: <ImageIcon className="w-4 h-4" /> },
]

// ─── Block content classes ─────────────────────────────────────────────────────
function blockClass(type: BlockType): string {
  switch (type) {
    case 'h1': return 'text-3xl font-bold tracking-tight'
    case 'h2': return 'text-2xl font-bold'
    case 'h3': return 'text-xl font-semibold'
    case 'quote': return 'border-l-4 border-primary/40 pl-4 italic text-muted-foreground'
    case 'callout': return 'bg-primary/5 border border-primary/20 rounded-lg px-4 py-3'
    case 'code': return 'font-mono text-sm bg-muted rounded-lg p-4 whitespace-pre-wrap'
    default: return 'text-foreground leading-relaxed'
  }
}

// ─── Slash Command Menu ───────────────────────────────────────────────────────
function SlashMenu({
  query,
  onSelect,
  onClose,
}: {
  query: string
  onSelect: (type: BlockType) => void
  onClose: () => void
}) {
  const [activeIdx, setActiveIdx] = useState(0)
  const filtered = SLASH_ITEMS.filter(
    (item) =>
      !query ||
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.type.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => setActiveIdx(0), [query])

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)) }
      if (e.key === 'Enter')     { e.preventDefault(); if (filtered[activeIdx]) onSelect(filtered[activeIdx].type) }
      if (e.key === 'Escape')    { onClose() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [filtered, activeIdx, onSelect, onClose])

  if (filtered.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.97 }}
      transition={{ duration: 0.1 }}
      className="absolute z-50 left-0 top-full mt-1 w-72 bg-popover border border-border rounded-xl shadow-xl overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-border/60">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Block type</p>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {filtered.map((item, i) => (
          <button
            key={item.type}
            onClick={() => onSelect(item.type)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
              i === activeIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'
            }`}
          >
            <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md bg-muted text-muted-foreground">
              {item.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">{item.label}</p>
              <p className="text-xs text-muted-foreground leading-tight">{item.description}</p>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  )
}

// ─── Formatting Toolbar ───────────────────────────────────────────────────────
function FormattingToolbar({ onFormat }: { onFormat: (cmd: string, value?: string) => void }) {
  const tools = [
    { icon: <Bold className="w-3.5 h-3.5" />, cmd: 'bold', title: 'Bold (Ctrl+B)' },
    { icon: <Italic className="w-3.5 h-3.5" />, cmd: 'italic', title: 'Italic (Ctrl+I)' },
    { icon: <Underline className="w-3.5 h-3.5" />, cmd: 'underline', title: 'Underline (Ctrl+U)' },
    { icon: <Strikethrough className="w-3.5 h-3.5" />, cmd: 'strikeThrough', title: 'Strikethrough' },
    { icon: <Code className="w-3.5 h-3.5" />, cmd: 'insertText', title: 'Code' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: -4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ duration: 0.1 }}
      className="absolute z-50 bottom-full left-0 mb-1 flex items-center bg-popover border border-border rounded-lg shadow-xl overflow-hidden"
    >
      {tools.map((t) => (
        <button
          key={t.cmd}
          onMouseDown={(e) => { e.preventDefault(); onFormat(t.cmd) }}
          className="px-2.5 py-2 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          title={t.title}
        >
          {t.icon}
        </button>
      ))}
    </motion.div>
  )
}

// ─── Single Sortable Block ─────────────────────────────────────────────────────
function SortableBlock({
  block,
  index,
  totalBlocks,
  onContentChange,
  onKeyDown,
  onTypeChange,
  onCheckedChange,
  onDelete,
  focusedId,
  setFocusedId,
  pageId,
}: {
  block: Block
  index: number
  totalBlocks: number
  onContentChange: (id: string, content: string) => void
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>, id: string, index: number) => void
  onTypeChange: (id: string, type: BlockType) => void
  onCheckedChange: (id: string, checked: boolean) => void
  onDelete: (id: string) => void
  focusedId: string | null
  setFocusedId: (id: string | null) => void
  pageId: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const contentRef = useRef<HTMLDivElement>(null)
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashQuery, setSlashQuery] = useState('')
  const [showToolbar, setShowToolbar] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const isTyped = block.type as BlockType

  // Focus management
  useEffect(() => {
    if (focusedId === block.id && contentRef.current) {
      contentRef.current.focus()
      const range = document.createRange()
      const sel = window.getSelection()
      if (contentRef.current.childNodes.length > 0) {
        range.selectNodeContents(contentRef.current)
        range.collapse(false)
        sel?.removeAllRanges()
        sel?.addRange(range)
      }
    }
  }, [focusedId, block.id])

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const text = (e.target as HTMLDivElement).innerText
    // Detect slash command
    if (text === '/') {
      setSlashOpen(true)
      setSlashQuery('')
    } else if (text.startsWith('/') && slashOpen) {
      setSlashQuery(text.slice(1))
    } else {
      setSlashOpen(false)
      onContentChange(block.id, text)
    }
  }

  const handleSlashSelect = (type: BlockType) => {
    if (contentRef.current) {
      contentRef.current.innerText = ''
    }
    onTypeChange(block.id, type)
    onContentChange(block.id, '')
    setSlashOpen(false)
    setSlashQuery('')
    setTimeout(() => contentRef.current?.focus(), 50)
  }

  const handleFormat = (cmd: string) => {
    document.execCommand(cmd, false)
    if (contentRef.current) {
      onContentChange(block.id, contentRef.current.innerHTML)
    }
  }

  const handleSelectionChange = () => {
    const sel = window.getSelection()
    setShowToolbar(!!sel && sel.toString().length > 0 && contentRef.current?.contains(sel.anchorNode) === true)
  }

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [])

  const copyCode = async () => {
    await navigator.clipboard.writeText(block.content)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  // Placeholder
  const isEmpty = !block.content || block.content === '\n'
  const placeholder =
    isTyped === 'h1' ? 'Heading 1'
    : isTyped === 'h2' ? 'Heading 2'
    : isTyped === 'h3' ? 'Heading 3'
    : isTyped === 'callout' ? '💡 Note…'
    : isTyped === 'quote' ? 'Quote…'
    : `Type '/' for commands`

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-block-id={block.id}
      className="group relative flex items-start gap-1.5 py-0.5"
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="shrink-0 mt-1 w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-40 hover:!opacity-100 cursor-grab active:cursor-grabbing transition-opacity text-muted-foreground hover:bg-accent"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Block content area */}
      <div className="flex-1 min-w-0 relative">
        {/* Formatting toolbar */}
        <AnimatePresence>
          {showToolbar && isTyped !== 'code' && isTyped !== 'divider' && (
            <FormattingToolbar onFormat={handleFormat} />
          )}
        </AnimatePresence>

        {/* Divider */}
        {isTyped === 'divider' ? (
          <hr className="border-border my-2" />
        ) : isTyped === 'todo' ? (
          <div className="flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={block.checked}
              onChange={(e) => onCheckedChange(block.id, e.target.checked)}
              className="mt-1 shrink-0 w-4 h-4 rounded accent-primary cursor-pointer"
            />
            <div
              ref={contentRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleInput}
              onKeyDown={(e) => onKeyDown(e, block.id, index)}
              onFocus={() => setFocusedId(block.id)}
              onBlur={() => setFocusedId(null)}
              className={`flex-1 outline-none ${block.checked ? 'line-through text-muted-foreground' : ''} ${isEmpty && !block.checked ? 'empty-content' : ''}`}
              data-placeholder="To-do item"
              dangerouslySetInnerHTML={{ __html: block.content }}
            />
          </div>
        ) : isTyped === 'bulleted' ? (
          <div className="flex items-start gap-2.5">
            <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-current opacity-60" />
            <div
              ref={contentRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleInput}
              onKeyDown={(e) => onKeyDown(e, block.id, index)}
              onFocus={() => setFocusedId(block.id)}
              onBlur={() => setFocusedId(null)}
              className="flex-1 outline-none"
              data-placeholder="List item"
              dangerouslySetInnerHTML={{ __html: block.content }}
            />
          </div>
        ) : isTyped === 'numbered' ? (
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0 text-sm font-medium text-muted-foreground min-w-[20px]">{index + 1}.</span>
            <div
              ref={contentRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleInput}
              onKeyDown={(e) => onKeyDown(e, block.id, index)}
              onFocus={() => setFocusedId(block.id)}
              onBlur={() => setFocusedId(null)}
              className="flex-1 outline-none"
              data-placeholder="List item"
              dangerouslySetInnerHTML={{ __html: block.content }}
            />
          </div>
        ) : isTyped === 'code' ? (
          <div className="relative group/code">
            <pre className={blockClass('code')}>
              <div
                ref={contentRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                onKeyDown={(e) => onKeyDown(e, block.id, index)}
                onFocus={() => setFocusedId(block.id)}
                onBlur={() => setFocusedId(null)}
                className="outline-none"
                data-placeholder="// code…"
                dangerouslySetInnerHTML={{ __html: block.content }}
              />
            </pre>
            <button
              onClick={copyCode}
              className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity px-2 py-1 rounded text-xs bg-background border border-border hover:bg-accent"
            >
              {codeCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        ) : isTyped === 'image' ? (
          <div className="space-y-2">
            <div
              ref={contentRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleInput}
              onKeyDown={(e) => onKeyDown(e, block.id, index)}
              onFocus={() => setFocusedId(block.id)}
              onBlur={() => setFocusedId(null)}
              className="outline-none text-muted-foreground text-sm"
              data-placeholder="Paste image URL…"
              dangerouslySetInnerHTML={{ __html: block.content }}
            />
            {block.content && (
              <img
                src={block.content}
                alt=""
                className="max-h-[400px] rounded-lg object-contain bg-muted"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
          </div>
        ) : (
          <div
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={(e) => onKeyDown(e, block.id, index)}
            onFocus={() => setFocusedId(block.id)}
            onBlur={() => setFocusedId(null)}
            className={`outline-none ${blockClass(isTyped)} ${isEmpty ? 'empty-content' : ''}`}
            data-placeholder={placeholder}
            dangerouslySetInnerHTML={{ __html: block.content }}
          />
        )}

        {/* Slash command menu */}
        <AnimatePresence>
          {slashOpen && (
            <SlashMenu
              query={slashQuery}
              onSelect={handleSlashSelect}
              onClose={() => setSlashOpen(false)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Delete button */}
      <button
        onClick={() => onDelete(block.id)}
        className="shrink-0 mt-1 w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-40 hover:!opacity-100 hover:bg-destructive/10 hover:text-destructive transition-opacity text-muted-foreground"
        title="Delete block"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Block Editor ─────────────────────────────────────────────────────────────
export default function BlockEditor({ pageId }: { pageId: string }) {
  const {
    blocks, setBlocks, updateBlock, addBlock, removeBlock,
    currentPage, updatePage,
    user,
    setSaveStatus,
    addToast,
  } = useAppStore()

  const [loading, setLoading] = useState(true)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [titleSaving, setTitleSaving] = useState(false)
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const historyRef = useRef<Block[][]>([])
  const historyIndexRef = useRef(-1)

  const pageBlocks = blocks
    .filter((b) => b.pageId === pageId)
    .sort((a, b) => a.order - b.order)

  // ── Load blocks ──────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    fetch(`/api/blocks?pageId=${pageId}`)
      .then((r) => r.json())
      .then(({ blocks: fetched }) => {
        const others = blocks.filter((b) => b.pageId !== pageId)
        setBlocks([...others, ...(fetched ?? [])])
      })
      .catch(() => addToast({ title: 'Failed to load blocks', variant: 'error' }))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId])

  // ── Sync title from currentPage ──────────────────────────────────────────────
  useEffect(() => {
    if (currentPage?.id === pageId) setTitle(currentPage.title ?? '')
  }, [currentPage, pageId])

  // ── Push history snapshot ─────────────────────────────────────────────────
  const pushHistory = useCallback((newBlocks: Block[]) => {
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
    historyRef.current.push(newBlocks.map((b) => ({ ...b })))
    if (historyRef.current.length > 50) historyRef.current.shift()
    historyIndexRef.current = historyRef.current.length - 1
  }, [])

  // ── Auto-save block ───────────────────────────────────────────────────────
  const scheduleBlockSave = useCallback(
    (block: Block) => {
      setSaveStatus('unsaved')
      const existing = saveTimers.current.get(block.id)
      if (existing) clearTimeout(existing)
      const t = setTimeout(async () => {
        setSaveStatus('saving')
        try {
          await fetch(`/api/blocks/${block.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: block.content,
              type: block.type,
              checked: block.checked,
              metadata: block.metadata ?? null,
            }),
          })
          setSaveStatus('saved')
        } catch {
          setSaveStatus('unsaved')
        }
        saveTimers.current.delete(block.id)
      }, 1500)
      saveTimers.current.set(block.id, t)
    },
    [setSaveStatus]
  )

  // ── Content change ────────────────────────────────────────────────────────
  const handleContentChange = useCallback(
    (id: string, content: string) => {
      updateBlock(id, { content })
      const block = blocks.find((b) => b.id === id)
      if (block) scheduleBlockSave({ ...block, content })
    },
    [blocks, updateBlock, scheduleBlockSave]
  )

  // ── Type change ───────────────────────────────────────────────────────────
  const handleTypeChange = useCallback(
    async (id: string, type: BlockType) => {
      updateBlock(id, { type })
      const block = blocks.find((b) => b.id === id)
      if (block) {
        setSaveStatus('saving')
        await fetch(`/api/blocks/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type }),
        })
        setSaveStatus('saved')
      }
    },
    [blocks, updateBlock, setSaveStatus]
  )

  // ── Checked change ────────────────────────────────────────────────────────
  const handleCheckedChange = useCallback(
    async (id: string, checked: boolean) => {
      updateBlock(id, { checked })
      await fetch(`/api/blocks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checked }),
      })
    },
    [updateBlock]
  )

  // ── Create block after index ──────────────────────────────────────────────
  const createBlock = useCallback(
    async (afterIndex: number, type: BlockType = 'text') => {
      const newOrder = afterIndex + 1
      const res = await fetch('/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, type, content: '', order: newOrder }),
      })
      if (!res.ok) return
      const { block } = await res.json()
      addBlock(block)
      setTimeout(() => setFocusedId(block.id), 50)
    },
    [pageId, addBlock]
  )

  // ── Delete block ──────────────────────────────────────────────────────────
  const handleDeleteBlock = useCallback(
    async (id: string) => {
      const idx = pageBlocks.findIndex((b) => b.id === id)
      removeBlock(id)
      if (idx > 0) setFocusedId(pageBlocks[idx - 1].id)
      await fetch(`/api/blocks/${id}`, { method: 'DELETE' })
    },
    [pageBlocks, removeBlock]
  )

  // ── Keyboard handler ──────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>, id: string, index: number) => {
      const el = e.currentTarget
      const text = el.innerText

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        createBlock(index)
        return
      }

      if (e.key === 'Backspace' && (text === '' || text === '\n')) {
        e.preventDefault()
        if (pageBlocks.length > 1) handleDeleteBlock(id)
        return
      }

      // Undo / redo
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (historyIndexRef.current > 0) {
          historyIndexRef.current--
          const snapshot = historyRef.current[historyIndexRef.current]
          const others = blocks.filter((b) => b.pageId !== pageId)
          setBlocks([...others, ...snapshot])
        }
        return
      }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        if (historyIndexRef.current < historyRef.current.length - 1) {
          historyIndexRef.current++
          const snapshot = historyRef.current[historyIndexRef.current]
          const others = blocks.filter((b) => b.pageId !== pageId)
          setBlocks([...others, ...snapshot])
        }
        return
      }

      // Bold / italic / underline shortcuts
      if (mod && e.key === 'b') { e.preventDefault(); document.execCommand('bold', false); return }
      if (mod && e.key === 'i') { e.preventDefault(); document.execCommand('italic', false); return }
      if (mod && e.key === 'u') { e.preventDefault(); document.execCommand('underline', false); return }
    },
    [pageBlocks, blocks, pageId, createBlock, handleDeleteBlock, setBlocks]
  )

  // ── DnD reorder ───────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIdx = pageBlocks.findIndex((b) => b.id === active.id)
      const newIdx = pageBlocks.findIndex((b) => b.id === over.id)
      const reordered = arrayMove(pageBlocks, oldIdx, newIdx).map((b, i) => ({ ...b, order: i }))
      const others = blocks.filter((b) => b.pageId !== pageId)
      setBlocks([...others, ...reordered])
      // Persist
      await Promise.all(
        reordered.map((b) =>
          fetch(`/api/blocks/${b.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: b.order }),
          })
        )
      )
    },
    [pageBlocks, blocks, pageId, setBlocks]
  )

  // ── Title save ────────────────────────────────────────────────────────────
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleTitleChange = (e: React.FormEvent<HTMLDivElement>) => {
    const newTitle = (e.target as HTMLDivElement).innerText
    setTitle(newTitle)
    updatePage(pageId, { title: newTitle })
    setSaveStatus('unsaved')
    if (titleTimerRef.current) clearTimeout(titleTimerRef.current)
    titleTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      await fetch(`/api/pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      })
      setSaveStatus('saved')
    }, 1500)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-8 py-12">
        {/* Page icon */}
        {currentPage?.icon && (
          <div className="text-5xl mb-4 select-none">{currentPage.icon}</div>
        )}

        {/* Page title */}
        <div
          contentEditable
          suppressContentEditableWarning
          onInput={handleTitleChange}
          className="text-4xl font-bold tracking-tight outline-none mb-8 empty-content"
          data-placeholder="Untitled"
          dangerouslySetInnerHTML={{ __html: title }}
        />

        {/* Style for empty-content placeholder */}
        <style>{`
          [contenteditable].empty-content:empty::before,
          [data-placeholder]:empty::before {
            content: attr(data-placeholder);
            color: var(--muted-foreground);
            opacity: 0.5;
            pointer-events: none;
          }
        `}</style>

        {/* Blocks */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={pageBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-0.5">
              {pageBlocks.map((block, i) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  index={i}
                  totalBlocks={pageBlocks.length}
                  onContentChange={handleContentChange}
                  onKeyDown={handleKeyDown}
                  onTypeChange={handleTypeChange}
                  onCheckedChange={handleCheckedChange}
                  onDelete={handleDeleteBlock}
                  focusedId={focusedId}
                  setFocusedId={setFocusedId}
                  pageId={pageId}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Add block button */}
        <button
          onClick={() => createBlock(pageBlocks.length - 1)}
          className="mt-4 flex items-center gap-2 text-sm text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add a block
        </button>
      </div>
    </div>
  )
}
