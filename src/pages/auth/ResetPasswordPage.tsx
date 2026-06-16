import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

// ─── Shared input ─────────────────────────────────────────────────────────────

interface PasswordFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder = 'Enter password',
  autoComplete,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div>
      <label className="block text-xs font-semibold text-warm-600 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <Lock
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400 pointer-events-none"
        />
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full pl-10 pr-10 py-3.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 transition-shadow"
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600 p-0.5 transition-colors"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}

// ─── Password strength indicator ──────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'Contains a number', pass: /\d/.test(password) },
    { label: 'Contains a letter', pass: /[a-zA-Z]/.test(password) },
  ]

  const passed = checks.filter(c => c.pass).length
  const strength = passed === 0 ? 0 : passed === 1 ? 1 : passed === 2 ? 2 : 3

  const colors = ['bg-warm-200', 'bg-rose-400', 'bg-amber-400', 'bg-green-500']
  const labels = ['', 'Weak', 'Fair', 'Strong']

  if (!password) return null

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1.5">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className={`flex-1 h-1 rounded-full transition-colors duration-200 ${
              i <= strength ? colors[strength] : 'bg-warm-200'
            }`}
          />
        ))}
      </div>
      <div className="space-y-0.5">
        {checks.map(c => (
          <div key={c.label} className="flex items-center gap-1.5">
            <div
              className={`w-3 h-3 rounded-full flex-shrink-0 flex items-center justify-center ${
                c.pass ? 'bg-green-500' : 'bg-warm-200'
              }`}
            >
              {c.pass && (
                <svg width="6" height="5" viewBox="0 0 6 5" fill="none">
                  <path d="M1 2.5L2.5 4L5 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className={`text-[11px] ${c.pass ? 'text-green-600' : 'text-warm-400'}`}>
              {c.label}
            </span>
          </div>
        ))}
      </div>
      {strength > 0 && (
        <p className={`text-xs font-medium mt-1 ${
          strength === 3 ? 'text-green-600' : strength === 2 ? 'text-amber-500' : 'text-rose-500'
        }`}>
          {labels[strength]}
        </p>
      )}
    </div>
  )
}

// ─── ResetPasswordPage ────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const passwordsMatch = newPassword === confirmPassword
  const isStrong = newPassword.length >= 8
  const canSubmit = newPassword.length >= 8 && passwordsMatch && !loading

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    if (!newPassword) {
      setErrorMsg('Please enter a new password')
      return
    }
    if (newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setSuccess(true)
      toast.success('Password updated successfully!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update password'
      setErrorMsg(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FFFBF7] flex flex-col items-center justify-start px-5 pt-16 pb-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg mb-3">
            <span className="text-3xl leading-none" role="img" aria-label="DreamMatch">
              🔥
            </span>
          </div>
          <h1 className="text-2xl font-bold text-warm-900 tracking-tight">DreamMatch</h1>
        </div>

        {/* ── Success state ─────────────────────────────────────────────────── */}
        {success ? (
          <div className="text-center animate-bounce-in">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={40} className="text-green-500" strokeWidth={1.8} />
            </div>
            <h2 className="text-xl font-bold text-warm-900 mb-2">
              Password updated!
            </h2>
            <p className="text-sm text-warm-500 leading-relaxed mb-6">
              Your password has been changed successfully. You can now sign in with your new password.
            </p>
            <Link
              to="/auth"
              className="inline-flex items-center justify-center w-full py-3.5 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              Sign In
            </Link>
          </div>
        ) : (
          /* ── Reset form ─────────────────────────────────────────────────── */
          <div className="animate-fade-in">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-warm-900">Set new password</h2>
              <p className="text-sm text-warm-500 mt-1.5 leading-relaxed">
                Choose a strong password you haven't used before.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <PasswordField
                  label="New password"
                  value={newPassword}
                  onChange={v => { setNewPassword(v); setErrorMsg('') }}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                />
                <PasswordStrength password={newPassword} />
              </div>

              <div>
                <PasswordField
                  label="Confirm new password"
                  value={confirmPassword}
                  onChange={v => { setConfirmPassword(v); setErrorMsg('') }}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                />
                {confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-rose-500 mt-1.5">Passwords do not match</p>
                )}
                {confirmPassword && passwordsMatch && isStrong && (
                  <p className="text-xs text-green-600 mt-1.5 font-medium">✓ Passwords match</p>
                )}
              </div>

              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                  <p className="text-sm text-rose-600">{errorMsg}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? 'Updating…' : 'Update Password'}
              </button>
            </form>

            <div className="text-center mt-5">
              <Link
                to="/auth"
                className="text-sm text-warm-400 hover:text-warm-600 hover:underline transition-colors"
              >
                ← Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
