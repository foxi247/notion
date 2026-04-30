'use client'

import { useState, useCallback, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/app-store'
import { createTranslator } from '@/lib/i18n'

// ─── Password strength ────────────────────────────────────────────────────────
type StrengthLevel = 'weak' | 'fair' | 'strong' | 'very-strong'

function getPasswordStrength(password: string): StrengthLevel {
  if (password.length === 0) return 'weak'

  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return 'weak'
  if (score === 2) return 'fair'
  if (score === 3) return 'strong'
  return 'very-strong'
}

const strengthMeta: Record<StrengthLevel, { label: string; color: string; bars: number }> = {
  weak:        { label: 'Weak',        color: 'bg-red-500',    bars: 1 },
  fair:        { label: 'Fair',        color: 'bg-yellow-400', bars: 2 },
  strong:      { label: 'Strong',      color: 'bg-blue-400',   bars: 3 },
  'very-strong': { label: 'Very strong', color: 'bg-emerald-400', bars: 4 },
}

function PasswordStrengthMeter({ password }: { password: string }) {
  const level = getPasswordStrength(password)
  const meta = strengthMeta[level]

  if (!password) return null

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((bar) => (
          <motion.div
            key={bar}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              bar <= meta.bars ? meta.color : 'bg-muted'
            }`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: bar * 0.04 }}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Password strength:{' '}
        <span
          className={
            level === 'weak'
              ? 'text-red-400'
              : level === 'fair'
              ? 'text-yellow-400'
              : level === 'strong'
              ? 'text-blue-400'
              : 'text-emerald-400'
          }
        >
          {meta.label}
        </span>
      </p>
    </div>
  )
}

// ─── Form Field ───────────────────────────────────────────────────────────────
function Field({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
}: {
  id: string
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
  required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-foreground/90">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
      />
    </div>
  )
}

// ─── Animated gradient logo ───────────────────────────────────────────────────
function Logo() {
  return (
    <div className="flex flex-col items-center gap-3 mb-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="relative w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden"
      >
        {/* Animated gradient background */}
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
              'linear-gradient(135deg, #ec4899 0%, #6366f1 100%)',
              'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            ],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        />
        <span className="relative z-10 text-white text-2xl font-bold select-none">N</span>
      </motion.div>

      <motion.div
        initial={{ y: 6, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="text-center"
      >
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            NexusAI
          </span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Your AI-powered workspace</p>
      </motion.div>
    </div>
  )
}

// ─── Login Form ───────────────────────────────────────────────────────────────
function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const uid = useId()
  const { setUser, setWorkspaces, setCurrentWorkspace, addToast, language } = useAppStore()
  const t = createTranslator(language)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')
      setLoading(true)

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, rememberMe }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error ?? data.message ?? 'Login failed')
          addToast({ title: data.error ?? 'Login failed', variant: 'error' })
          return
        }

        const { user, workspace } = data
        setUser(user)
        if (workspace) {
          setWorkspaces([workspace])
          setCurrentWorkspace(workspace)
        }
        addToast({ title: `Welcome back, ${user.name}!`, variant: 'success' })
      } catch {
        const msg = 'Network error. Please try again.'
        setError(msg)
        addToast({ title: msg, variant: 'error' })
      } finally {
        setLoading(false)
      }
    },
    [email, password, rememberMe, setUser, setWorkspaces, setCurrentWorkspace, addToast]
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">{t('auth.welcomeBack')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('auth.tagline')}</p>
      </div>

      <Field
        id={`${uid}-email`}
        label={t('auth.email')}
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        autoComplete="email"
        required
      />

      <Field
        id={`${uid}-password`}
        label={t('auth.password')}
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="••••••••"
        autoComplete="current-password"
        required
      />

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded border-border accent-primary"
          />
          <span className="text-muted-foreground">{t('auth.rememberMe')}</span>
        </label>
        <button
          type="button"
          className="text-primary hover:underline"
          tabIndex={-1}
        >
          {t('auth.forgotPassword')}
        </button>
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-400 text-center"
        >
          {error}
        </motion.p>
      )}

      <button
        type="submit"
        disabled={loading || !email || !password}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
      >
        {loading && (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
            className="w-4 h-4 rounded-full border-2 border-white border-t-transparent inline-block"
          />
        )}
        {loading ? 'Signing in…' : t('auth.loginButton')}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        {t('auth.noAccount')}{' '}
        <button
          type="button"
          onClick={onSwitch}
          className="text-primary font-medium hover:underline"
        >
          {t('auth.register')}
        </button>
      </p>
    </form>
  )
}

// ─── Register Form ────────────────────────────────────────────────────────────
function RegisterForm({ onSwitch }: { onSwitch: () => void }) {
  const uid = useId()
  const { setUser, setWorkspaces, setCurrentWorkspace, addToast, language } = useAppStore()
  const t = createTranslator(language)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const passwordStrength = getPasswordStrength(password)
  const passwordsMatch = password && confirmPassword ? password === confirmPassword : true

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')

      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }
      if (passwordStrength === 'weak') {
        setError('Please choose a stronger password.')
        return
      }

      setLoading(true)

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error ?? data.message ?? 'Registration failed')
          addToast({ title: data.error ?? 'Registration failed', variant: 'error' })
          return
        }

        const { user, workspace } = data
        setUser(user)
        if (workspace) {
          setWorkspaces([workspace])
          setCurrentWorkspace(workspace)
        }
        addToast({ title: `Welcome to NexusAI, ${user.name}!`, variant: 'success' })
      } catch {
        const msg = 'Network error. Please try again.'
        setError(msg)
        addToast({ title: msg, variant: 'error' })
      } finally {
        setLoading(false)
      }
    },
    [
      name,
      email,
      password,
      confirmPassword,
      passwordStrength,
      setUser,
      setWorkspaces,
      setCurrentWorkspace,
      addToast,
    ]
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">{t('auth.createAccount')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('auth.tagline')}</p>
      </div>

      <Field
        id={`${uid}-name`}
        label={t('auth.name')}
        type="text"
        value={name}
        onChange={setName}
        placeholder="Jane Smith"
        autoComplete="name"
        required
      />

      <Field
        id={`${uid}-email`}
        label={t('auth.email')}
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        autoComplete="email"
        required
      />

      <div className="space-y-1.5">
        <label htmlFor={`${uid}-password`} className="block text-sm font-medium text-foreground/90">
          {t('auth.password')}
        </label>
        <input
          id={`${uid}-password`}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          required
          className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
        />
        <PasswordStrengthMeter password={password} />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor={`${uid}-confirm`}
          className="block text-sm font-medium text-foreground/90"
        >
          {t('auth.confirmPassword')}
        </label>
        <input
          id={`${uid}-confirm`}
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          required
          className={`w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40 transition ${
            confirmPassword && !passwordsMatch
              ? 'border-red-500/60 focus:ring-red-400/30'
              : 'border-border focus:border-primary'
          }`}
        />
        {confirmPassword && !passwordsMatch && (
          <p className="text-xs text-red-400">Passwords do not match.</p>
        )}
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-400 text-center"
        >
          {error}
        </motion.p>
      )}

      <button
        type="submit"
        disabled={loading || !name || !email || !password || !confirmPassword || !passwordsMatch}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
      >
        {loading && (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
            className="w-4 h-4 rounded-full border-2 border-white border-t-transparent inline-block"
          />
        )}
        {loading ? 'Creating account…' : t('auth.registerButton')}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        {t('auth.hasAccount')}{' '}
        <button
          type="button"
          onClick={onSwitch}
          className="text-primary font-medium hover:underline"
        >
          {t('auth.login')}
        </button>
      </p>
    </form>
  )
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────
export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Ambient background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-pink-500/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-3xl" />
      </div>

      {/* Card with animated gradient border */}
      <div className="relative z-10 w-full max-w-md">
        {/* Gradient border effect */}
        <motion.div
          className="absolute -inset-[1px] rounded-2xl opacity-70"
          animate={{
            background: [
              'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)',
              'linear-gradient(225deg, #8b5cf6, #ec4899, #6366f1)',
              'linear-gradient(315deg, #ec4899, #6366f1, #8b5cf6)',
              'linear-gradient(45deg, #6366f1, #8b5cf6, #ec4899)',
            ],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />

        {/* Card body */}
        <div className="relative bg-card rounded-2xl shadow-2xl p-8">
          <Logo />

          <AnimatePresence mode="wait">
            {mode === 'login' ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.2 }}
              >
                <LoginForm onSwitch={() => setMode('register')} />
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
              >
                <RegisterForm onSwitch={() => setMode('login')} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground/50 mt-6">
            NexusAI v0.2 · Powered by AI
          </p>
        </div>
      </div>
    </div>
  )
}
