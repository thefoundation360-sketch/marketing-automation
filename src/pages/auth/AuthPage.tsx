import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

type AuthTab = 'signin' | 'signup'

interface InputProps {
  type: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  icon: typeof Mail
  autoComplete?: string
  rightElement?: React.ReactNode
}

function FormInput({
  type,
  value,
  onChange,
  placeholder,
  icon: Icon,
  autoComplete,
  rightElement,
}: InputProps) {
  return (
    <div className="relative">
      <Icon
        size={16}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400 pointer-events-none"
      />
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full pl-10 pr-10 py-3.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 transition-shadow"
      />
      {rightElement && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {rightElement}
        </div>
      )}
    </div>
  )
}

// ─── Password Input ───────────────────────────────────────────────────────────

function PasswordInput({
  value,
  onChange,
  placeholder = 'Password',
  autoComplete,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <FormInput
      type={visible ? 'text' : 'password'}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      icon={Lock}
      autoComplete={autoComplete}
      rightElement={
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="text-warm-400 hover:text-warm-600 p-0.5"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      }
    />
  )
}

// ─── Google Button ────────────────────────────────────────────────────────────

function GoogleButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 border border-warm-200 rounded-xl bg-white hover:bg-warm-50 active:bg-warm-100 text-sm font-medium text-warm-700 transition-colors shadow-sm disabled:opacity-60"
    >
      {/* Google G SVG inline */}
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path
          d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
          fill="#4285F4"
        />
        <path
          d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
          fill="#34A853"
        />
        <path
          d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
          fill="#FBBC05"
        />
        <path
          d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
          fill="#EA4335"
        />
      </svg>
      Continue with Google
    </button>
  )
}

// ─── Divider ─────────────────────────────────────────────────────────────────

function Divider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-warm-200" />
      <span className="text-xs text-warm-400 font-medium">or</span>
      <div className="flex-1 h-px bg-warm-200" />
    </div>
  )
}

// ─── AuthPage ─────────────────────────────────────────────────────────────────

export default function AuthPage() {
  const { signIn, signUp, signInWithGoogle, signInAsGuest, resetPassword } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState<AuthTab>('signin')
  const [forgotPassword, setForgotPassword] = useState(false)

  // Sign In fields
  const [siEmail, setSiEmail] = useState('')
  const [siPassword, setSiPassword] = useState('')

  // Sign Up fields
  const [suName, setSuName] = useState('')
  const [suEmail, setSuEmail] = useState('')
  const [suPassword, setSuPassword] = useState('')

  // Reset fields
  const [rpEmail, setRpEmail] = useState('')

  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleSignIn(e: FormEvent) {
    e.preventDefault()
    if (!siEmail || !siPassword) {
      toast.error('Please fill in all fields')
      return
    }
    setLoading(true)
    try {
      await signIn(siEmail, siPassword)
      navigate('/discover', { replace: true })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignUp(e: FormEvent) {
    e.preventDefault()
    if (!suName || !suEmail || !suPassword) {
      toast.error('Please fill in all fields')
      return
    }
    if (suPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      await signUp(suEmail, suPassword, suName)
      toast.success('Account created! Check your email to confirm.')
      navigate('/onboarding', { replace: true })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleAuth() {
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Google sign in failed')
      setLoading(false)
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault()
    if (!rpEmail) {
      toast.error('Please enter your email address')
      return
    }
    setLoading(true)
    try {
      await resetPassword(rpEmail)
      setResetSent(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  function handleGuestLogin() {
    signInAsGuest()
    navigate('/discover', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#FFFBF7] flex flex-col items-center justify-start px-5 pt-14 pb-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg mb-3">
            <span className="text-3xl leading-none" role="img" aria-label="DreamMatch">
              🔥
            </span>
          </div>
          <h1 className="text-2xl font-bold text-warm-900 tracking-tight">DreamMatch</h1>
          <p className="text-sm text-warm-500 mt-1">Find people who share your dreams</p>
        </div>

        {/* ── Forgot Password View ─────────────────────────────────────────── */}
        {forgotPassword ? (
          <div className="animate-fade-in">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-warm-900">Reset your password</h2>
              <p className="text-sm text-warm-500 mt-1">
                We'll send a link to your email address.
              </p>
            </div>

            {resetSent ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">📬</span>
                </div>
                <h3 className="text-base font-semibold text-warm-800 mb-1">Check your inbox</h3>
                <p className="text-sm text-warm-500 mb-5">
                  If an account exists for <strong>{rpEmail}</strong>, you'll receive a reset link shortly.
                </p>
                <button
                  onClick={() => {
                    setForgotPassword(false)
                    setResetSent(false)
                    setRpEmail('')
                  }}
                  className="text-primary-500 text-sm font-semibold hover:underline"
                >
                  ← Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <FormInput
                  type="email"
                  value={rpEmail}
                  onChange={setRpEmail}
                  placeholder="Email address"
                  icon={Mail}
                  autoComplete="email"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-60"
                >
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setForgotPassword(false)}
                    className="text-sm text-warm-500 hover:text-warm-700 hover:underline"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <>
            {/* ── Tabs ────────────────────────────────────────────────────── */}
            <div className="flex bg-warm-100 rounded-xl p-1 mb-6">
              {(['signin', 'signup'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    'flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-150',
                    tab === t
                      ? 'bg-white text-warm-900 shadow-sm'
                      : 'text-warm-500 hover:text-warm-700'
                  )}
                >
                  {t === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            {/* ── Sign In ─────────────────────────────────────────────────── */}
            {tab === 'signin' && (
              <div className="animate-fade-in space-y-4">
                <form onSubmit={handleSignIn} className="space-y-3">
                  <FormInput
                    type="email"
                    value={siEmail}
                    onChange={setSiEmail}
                    placeholder="Email address"
                    icon={Mail}
                    autoComplete="email"
                  />
                  <PasswordInput
                    value={siPassword}
                    onChange={setSiPassword}
                    autoComplete="current-password"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setForgotPassword(true)}
                      className="text-xs text-primary-500 font-medium hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-60"
                  >
                    {loading ? 'Signing in…' : 'Sign In'}
                  </button>
                </form>

                <Divider />

                <GoogleButton onClick={handleGoogleAuth} loading={loading} />

                <button
                  type="button"
                  onClick={handleGuestLogin}
                  className="w-full py-3 text-sm text-warm-500 font-medium hover:text-warm-700 transition-colors"
                >
                  Continue as Guest →
                </button>
              </div>
            )}

            {/* ── Sign Up ─────────────────────────────────────────────────── */}
            {tab === 'signup' && (
              <div className="animate-fade-in space-y-4">
                <form onSubmit={handleSignUp} className="space-y-3">
                  <FormInput
                    type="text"
                    value={suName}
                    onChange={setSuName}
                    placeholder="Full name"
                    icon={User}
                    autoComplete="name"
                  />
                  <FormInput
                    type="email"
                    value={suEmail}
                    onChange={setSuEmail}
                    placeholder="Email address"
                    icon={Mail}
                    autoComplete="email"
                  />
                  <PasswordInput
                    value={suPassword}
                    onChange={setSuPassword}
                    placeholder="Create a password"
                    autoComplete="new-password"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-60"
                  >
                    {loading ? 'Creating account…' : 'Create Account'}
                  </button>
                </form>

                <Divider />

                <GoogleButton onClick={handleGoogleAuth} loading={loading} />

                <p className="text-center text-[11px] text-warm-400 leading-relaxed px-2">
                  By signing up you agree to our{' '}
                  <a href="/terms" className="underline hover:text-warm-600">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" className="underline hover:text-warm-600">
                    Privacy Policy
                  </a>
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
