'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PartyPopper, Target, Pencil, Check } from 'lucide-react'
import { useAppStore } from '@/store/app-store'

const STORAGE_KEY = 'nexusai-writing-goal'
const DEFAULT_GOAL = 500

export function WritingGoal() {
  const currentWorkspace = useAppStore((s) => s.currentWorkspace)
  const [goal, setGoal] = useState(DEFAULT_GOAL)
  const [todayWords, setTodayWords] = useState(0)
  const [editing, setEditing] = useState(false)
  const [inputValue, setInputValue] = useState(String(DEFAULT_GOAL))
  const [celebrating, setCelebrating] = useState(false)
  const [prevMet, setPrevMet] = useState(false)

  // Load goal from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = parseInt(stored, 10)
        if (!isNaN(parsed) && parsed > 0) {
          setGoal(parsed)
          setInputValue(String(parsed))
        }
      }
    } catch {
      // ignore
    }
  }, [])

  // Fetch word counts from API
  const fetchStats = useCallback(async () => {
    if (!currentWorkspace?.id) return
    try {
      const res = await fetch(`/api/pages/stats?workspaceId=${currentWorkspace.id}`)
      if (res.ok) {
        const data = await res.json()
        setTodayWords(data.todayWords ?? 0)
      }
    } catch {
      // ignore
    }
  }, [currentWorkspace?.id])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 60_000)
    return () => clearInterval(interval)
  }, [fetchStats])

  // Celebration logic
  useEffect(() => {
    const met = todayWords >= goal && goal > 0
    if (met && !prevMet) {
      setCelebrating(true)
      const timer = setTimeout(() => setCelebrating(false), 5000)
      setPrevMet(true)
      return () => clearTimeout(timer)
    }
    if (!met) {
      setPrevMet(false)
    }
  }, [todayWords, goal, prevMet])

  const handleSaveGoal = () => {
    const parsed = parseInt(inputValue, 10)
    if (!isNaN(parsed) && parsed > 0) {
      setGoal(parsed)
      try {
        localStorage.setItem(STORAGE_KEY, String(parsed))
      } catch {
        // ignore
      }
    }
    setEditing(false)
  }

  const progress = goal > 0 ? Math.min((todayWords / goal) * 100, 100) : 0
  const met = todayWords >= goal && goal > 0

  return (
    <div className="relative flex items-center gap-2">
      <AnimatePresence>
        {celebrating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 4 }}
            className="absolute bottom-full mb-2 right-0 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg px-3 py-2 shadow-lg whitespace-nowrap z-50"
          >
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200 text-xs font-medium">
              <PartyPopper className="w-3.5 h-3.5" />
              <span>Writing goal reached! 🎉</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Target className={`w-3.5 h-3.5 shrink-0 ${met ? 'text-green-500' : 'text-muted-foreground'}`} />

      {editing ? (
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">{todayWords}/</span>
          <input
            autoFocus
            type="number"
            min={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveGoal()
              if (e.key === 'Escape') setEditing(false)
            }}
            className="w-14 text-xs bg-background border border-border rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-ring"
          />
          <span className="text-xs text-muted-foreground">words</span>
          <button
            onClick={handleSaveGoal}
            className="text-green-500 hover:text-green-600 transition-colors"
            aria-label="Save goal"
          >
            <Check className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 group"
          title="Click to edit daily writing goal"
        >
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className={met ? 'text-green-500 font-medium' : ''}>{todayWords}</span>
            <span>/</span>
            <span>{goal}</span>
            <span>words</span>
          </div>
          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${met ? 'bg-green-500' : 'bg-blue-500'}`}
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <Pencil className="w-2.5 h-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      )}
    </div>
  )
}
