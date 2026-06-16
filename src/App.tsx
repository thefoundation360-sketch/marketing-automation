import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { Suspense, lazy } from 'react'
import { FullPageSkeleton } from '@/components/shared/LoadingSkeleton'
import Layout from '@/components/shared/Layout'

// Lazy-load pages for better performance
const LandingPage = lazy(() => import('@/pages/LandingPage'))
const AuthPage = lazy(() => import('@/pages/auth/AuthPage'))
const OnboardingPage = lazy(() => import('@/pages/auth/OnboardingPage'))
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'))

const DiscoverPage = lazy(() => import('@/pages/app/DiscoverPage'))
const MatchesPage = lazy(() => import('@/pages/app/MatchesPage'))
const MessagesPage = lazy(() => import('@/pages/app/MessagesPage'))
const ConversationPage = lazy(() => import('@/pages/app/ConversationPage'))
const FeedPage = lazy(() => import('@/pages/app/FeedPage'))
const ProfilePage = lazy(() => import('@/pages/app/ProfilePage'))
const EditProfilePage = lazy(() => import('@/pages/app/EditProfilePage'))
const BucketListPage = lazy(() => import('@/pages/app/BucketListPage'))
const GoalDetailPage = lazy(() => import('@/pages/app/GoalDetailPage'))
const NotificationsPage = lazy(() => import('@/pages/app/NotificationsPage'))
const GroupsPage = lazy(() => import('@/pages/app/GroupsPage'))
const GroupDetailPage = lazy(() => import('@/pages/app/GroupDetailPage'))
const SettingsPage = lazy(() => import('@/pages/app/SettingsPage'))

const PricingPage = lazy(() => import('@/pages/PricingPage'))
const TermsPage = lazy(() => import('@/pages/TermsPage'))
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'))
const ContactPage = lazy(() => import('@/pages/ContactPage'))

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, isGuest } = useAuth()
  if (loading) return <FullPageSkeleton />
  if (!user && !isGuest) return <Navigate to="/auth" replace />
  if (!isGuest && profile && !profile.onboarding_complete) {
    return <Navigate to="/onboarding" replace />
  }
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <FullPageSkeleton />
  if (!profile?.is_admin) return <Navigate to="/app/discover" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isGuest } = useAuth()
  if (loading) return <FullPageSkeleton />
  if (user || isGuest) return <Navigate to="/app/discover" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Suspense fallback={<FullPageSkeleton />}>
      <Routes>
        {/* Public marketing pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/contact" element={<ContactPage />} />

        {/* Auth pages */}
        <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* Protected app pages */}
        <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/app/discover" replace />} />
          <Route path="discover" element={<DiscoverPage />} />
          <Route path="matches" element={<MatchesPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="messages/:conversationId" element={<ConversationPage />} />
          <Route path="feed" element={<FeedPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="profile/:userId" element={<ProfilePage />} />
          <Route path="edit-profile" element={<EditProfilePage />} />
          <Route path="bucket-list" element={<BucketListPage />} />
          <Route path="goals/:goalId" element={<GoalDetailPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="groups" element={<GroupsPage />} />
          <Route path="groups/:groupId" element={<GroupDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Public user profiles */}
        <Route path="/u/:username" element={<Suspense fallback={<FullPageSkeleton />}><ProfilePage /></Suspense>} />

        {/* Admin */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Suspense fallback={<FullPageSkeleton />}>
                  <AdminDashboard />
                </Suspense>
              </AdminRoute>
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

function AuthCallbackPage() {
  const { user, loading } = useAuth()
  if (loading) return <FullPageSkeleton />
  return <Navigate to={user ? '/app/discover' : '/auth'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
