'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Cloud, CloudOff, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { useAppStore } from '@/store/app-store'
import { WritingGoal } from './writing-goal'

function SaveStatusIndicator() {
  const saveStatus = useAppStore((s) => s.saveStatus)

  if (saveStatus === 'saved') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Cloud className="w-3.5 h-3.5 text-green-500" />
        <span>Saved</span>
        <span className="text-green-500">✓</span>
      </div>
    )
  }

  if (saveStatus === 'saving') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-3.5 h-3.5 text-blue-500" />
        </motion.div>
        <motion.span
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          Saving...
        </motion.span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <CloudOff className="w-3.5 h-3.5 text-yellow-500" />
      <span>Unsaved</span>
      <motion.span
        className="text-yellow-500"
        animate={{ opacity: [1, 0.2, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        ●
      </motion.span>
    </div>
  )
}

function WordCountInfo() {
  const blocks = useAppStore((s) => s.blocks)

  const wordCount = blocks.reduce((acc, block) => {
    if (typeof block.content === 'string') {
      const words = block.content.trim().split(/\s+/).filter(Boolean).length
      return acc + words
    }
    return acc
  }, 0)

  const readingMinutes = Math.max(1, Math.ceil(wordCount / 200))

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>{wordCount.toLocaleString()} words</span>
      <span className="opacity-40">·</span>
      <span>{readingMinutes} min read</span>
    </div>
  )
}

function CurrentTime() {
  const [time, setTime] = useState(() => format(new Date(), 'HH:mm'))

  useEffect(() => {
    const update = () => setTime(format(new Date(), 'HH:mm'))
    const now = new Date()
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds()

    const timeout = setTimeout(() => {
      update()
      const interval = setInterval(update, 60_000)
      return () => clearInterval(interval)
    }, msUntilNextMinute)

    return () => clearTimeout(timeout)
  }, [])

  return <span className="text-xs text-muted-foreground tabular-nums">{time}</span>
}

export function StatusBar() {
  return (
    <div className="relative flex items-center justify-between px-4 py-1.5 bg-background border-t border-border h-8 shrink-0 select-none">
      {/* Gradient top border */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

      <div className="flex items-center gap-4">
        <SaveStatusIndicator />
        <div className="w-px h-3 bg-border" />
        <WordCountInfo />
      </div>

      <div className="flex items-center gap-4">
        <WritingGoal />
        <div className="w-px h-3 bg-border" />
        <CurrentTime />
      </div>
    </div>
  )
}
