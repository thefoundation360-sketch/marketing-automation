import { Link } from 'react-router-dom'
import { Flame } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FFFBF7]">
      <nav className="sticky top-0 bg-[#FFFBF7]/95 backdrop-blur-md border-b border-warm-200 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-warm-900">DreamMatch</span>
          </Link>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-warm-900 mb-2">Privacy Policy</h1>
        <p className="text-warm-400 text-sm mb-8">Last updated: June 16, 2026</p>

        <div className="space-y-8 text-warm-600">
          <section>
            <h2 className="text-xl font-bold text-warm-900 mb-3">1. Information We Collect</h2>
            <p className="leading-relaxed mb-3">We collect information you provide directly:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Account info: name, email, password (hashed)</li>
              <li>Profile info: age, location, bio, interests, profile photo</li>
              <li>Bucket list goals you add to the platform</li>
              <li>Messages sent through the Service</li>
              <li>Payment info (processed by Stripe — we don't store card numbers)</li>
            </ul>
            <p className="leading-relaxed mt-3">We also automatically collect:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Device type, operating system, browser</li>
              <li>IP address and approximate location</li>
              <li>Usage patterns and interactions within the app</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-warm-900 mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Provide, operate, and improve the Service</li>
              <li>Match you with other users based on shared goals</li>
              <li>Send notifications about matches, messages, and activity</li>
              <li>Process payments and manage subscriptions</li>
              <li>Detect and prevent fraud or abuse</li>
              <li>Send you product updates and promotions (you can opt out)</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-warm-900 mb-3">3. Information Sharing</h2>
            <p className="leading-relaxed mb-2">We do not sell your personal information. We may share it with:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>Other users:</strong> Public profile info as you configure it</li>
              <li><strong>Service providers:</strong> Supabase (database), Stripe (payments), OneSignal (notifications)</li>
              <li><strong>Legal authorities:</strong> When required by law or to protect safety</li>
              <li><strong>Business transfers:</strong> In the event of a merger or acquisition</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-warm-900 mb-3">4. Data Security</h2>
            <p className="leading-relaxed">We use industry-standard security measures including encryption at rest and in transit, secure authentication, and regular security audits. However, no method of transmission over the internet is 100% secure.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-warm-900 mb-3">5. Your Rights</h2>
            <p className="leading-relaxed mb-2">You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Access and download your personal data (Settings → Export my data)</li>
              <li>Correct inaccurate information (via profile settings)</li>
              <li>Delete your account and associated data</li>
              <li>Opt out of marketing communications</li>
              <li>Request data portability</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-warm-900 mb-3">6. Cookies</h2>
            <p className="leading-relaxed">We use essential cookies for authentication and session management. We use analytics cookies (with your consent) to understand how the Service is used. You can control cookies through your browser settings.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-warm-900 mb-3">7. Children's Privacy</h2>
            <p className="leading-relaxed">DreamMatch is not intended for users under 18. We do not knowingly collect data from minors. If you believe we have collected data from a minor, please contact us immediately.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-warm-900 mb-3">8. Data Retention</h2>
            <p className="leading-relaxed">We retain your data as long as your account is active. After account deletion, we remove your personal data within 30 days, except where retention is required by law.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-warm-900 mb-3">9. Contact Us</h2>
            <p className="leading-relaxed">
              For privacy inquiries, contact our Privacy Team at{' '}
              <a href="mailto:privacy@dreammatch.app" className="text-orange-500 hover:underline">privacy@dreammatch.app</a>
              {' '}or visit our <Link to="/contact" className="text-orange-500 hover:underline">contact page</Link>.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-warm-200 flex items-center justify-between text-sm text-warm-400">
          <Link to="/" className="hover:text-warm-600 transition-colors">← Back to home</Link>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-warm-600 transition-colors">Terms of Service</Link>
            <Link to="/contact" className="hover:text-warm-600 transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
