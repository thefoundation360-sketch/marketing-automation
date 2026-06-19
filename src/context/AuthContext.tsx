import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/types'
import { isDemoMode, DEMO_USER } from '@/lib/demoData'

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  isGuest: boolean
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInAsGuest: () => void
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)

  // Demo mode: activate automatically when Supabase isn't configured
  const demoMode = isDemoMode()

  useEffect(() => {
    if (demoMode) {
      const stored = localStorage.getItem('demo_profile')
      if (stored) {
        setProfile(JSON.parse(stored))
      } else {
        setProfile(DEMO_USER)
        localStorage.setItem('demo_profile', JSON.stringify(DEMO_USER))
      }
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
        setIsGuest(false)
      } else if (!isGuest) {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      setProfile(data)
    } catch (err) {
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }

  async function signUp(email: string, password: string, fullName: string) {
    if (demoMode) {
      const p = { ...DEMO_USER, full_name: fullName, username: fullName.toLowerCase().replace(/\s/g, '_') + Math.floor(Math.random() * 999), onboarding_complete: false }
      setProfile(p)
      localStorage.setItem('demo_profile', JSON.stringify(p))
      return
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }

  async function signIn(email: string, password: string) {
    if (demoMode) {
      setProfile(DEMO_USER)
      localStorage.setItem('demo_profile', JSON.stringify(DEMO_USER))
      return
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signInWithGoogle() {
    if (demoMode) {
      setProfile(DEMO_USER)
      localStorage.setItem('demo_profile', JSON.stringify(DEMO_USER))
      return
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }

  function signInAsGuest() {
    setIsGuest(true)
    setProfile({
      id: 'guest',
      username: 'guest',
      full_name: 'Guest User',
      avatar_url: null,
      bio: null,
      age: null,
      location: null,
      latitude: null,
      longitude: null,
      interests: [],
      preference: 'both',
      subscription_tier: 'free',
      is_verified: false,
      is_admin: false,
      is_guest: true,
      swipes_today: 0,
      last_swipe_date: null,
      onboarding_complete: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    setLoading(false)
  }

  async function signOut() {
    if (demoMode || isGuest) {
      setIsGuest(false)
      setProfile(null)
      localStorage.removeItem('demo_profile')
      return
    }
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setProfile(null)
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) throw error
  }

  async function updateProfile(updates: Partial<Profile>) {
    if (demoMode) {
      const updated = { ...(profile ?? DEMO_USER), ...updates, updated_at: new Date().toISOString() }
      setProfile(updated)
      localStorage.setItem('demo_profile', JSON.stringify(updated))
      return
    }
    if (!user) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single()
    if (error) throw error
    setProfile(data)
  }

  async function refreshProfile() {
    if (demoMode) return
    if (user) await fetchProfile(user.id)
  }

  return (
    <AuthContext.Provider value={{
      session, user, profile, loading, isGuest,
      signUp, signIn, signInWithGoogle, signInAsGuest,
      signOut, resetPassword, updateProfile, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
