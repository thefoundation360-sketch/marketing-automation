'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Zap, Loader2 } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-bold text-zinc-100">Vyral</span>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h1 className="text-xl font-bold text-zinc-100 mb-1">Create your account</h1>
          <p className="text-sm text-zinc-400 mb-6">Start selling your content in minutes</p>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-300 block mb-1.5">Full Name</label>
              <Input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your Name"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-300 block mb-1.5">Email</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-300 block mb-1.5">Password</label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                required
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create account
            </Button>
          </form>

          <p className="text-center text-xs text-zinc-600 mt-4">
            By signing up you agree to our terms. You keep 80% of every sale.
          </p>

          <p className="text-center text-sm text-zinc-500 mt-3">
            Already have an account?{' '}
            <Link href="/login" className="text-violet-400 hover:text-violet-300">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
